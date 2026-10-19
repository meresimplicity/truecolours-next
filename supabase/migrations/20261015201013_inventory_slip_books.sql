-- Receipt/stock-ledger workflow: drafts never affect stock or money. Posting is atomic.
alter table public.stock_movements add column occurred_on date;
update public.stock_movements set occurred_on=(created_at at time zone 'Africa/Johannesburg')::date;
alter table public.stock_movements alter column occurred_on set default ((now() at time zone 'Africa/Johannesburg')::date);
alter table public.stock_movements alter column occurred_on set not null;
alter table public.stock_movements add column source_document_id uuid;
create index stock_movements_business_date_idx on public.stock_movements(branch_id,occurred_on,product_id);

create table public.inventory_documents (
 id uuid primary key,branch_id text not null references public.branches(id),kind text not null check(kind in ('purchase','physical_sale')),
 status text not null default 'draft' check(status in ('draft','posted','verified','archived')),
 data jsonb not null default '{}',version bigint not null default 1,last_save_key text,last_save_hash text,created_by uuid not null references auth.users(id),
 document_date date,counterparty text,reference text,source_sha256 text,stock_effect text check(stock_effect in ('apply','already_counted','verify_pos')),
 total_cents bigint,vat_cents bigint,linked_sale_id uuid references public.sales(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),posted_at timestamptz
);
create table public.inventory_document_items (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.inventory_documents(id),
 product_id text not null references public.products(id),description text not null,quantity numeric(15,3) not null check(quantity>0),
 unit_price_cents bigint not null check(unit_price_cents>=0),discount_cents bigint not null check(discount_cents>=0),total_cents bigint not null check(total_cents>=0)
);
create table public.inventory_document_payments (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.inventory_documents(id),
 amount_cents bigint not null check(amount_cents>0),method text not null check(method in ('cash','card','eft')),
 reference text not null default '',paid_on date not null,actor_id uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create table public.inventory_product_aliases (
 branch_id text not null references public.branches(id),counterparty text not null,description text not null,
 product_id text not null references public.products(id),confirmed_by uuid not null references auth.users(id),updated_at timestamptz not null default now(),
 primary key(branch_id,counterparty,description)
);
create table public.inventory_budgets (
 branch_id text not null references public.branches(id),month date not null check(extract(day from month)=1),amount_cents bigint not null check(amount_cents>=0),
 updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now(),primary key(branch_id,month)
);
alter table public.stock_movements add constraint stock_movement_source_document_fk foreign key(source_document_id) references public.inventory_documents(id);
create index stock_movement_document_idx on public.stock_movements(source_document_id);
create index document_branch_date_idx on public.inventory_documents(branch_id,document_date,status);
create index document_branch_updated_idx on public.inventory_documents(branch_id,updated_at desc,id);
create index document_creator_idx on public.inventory_documents(created_by);
create index document_sale_idx on public.inventory_documents(linked_sale_id);
create index document_items_document_idx on public.inventory_document_items(document_id);
create index document_items_product_idx on public.inventory_document_items(product_id);
create index document_payments_document_idx on public.inventory_document_payments(document_id);
create index document_payments_actor_idx on public.inventory_document_payments(actor_id);
create index aliases_product_idx on public.inventory_product_aliases(product_id);
create index aliases_actor_idx on public.inventory_product_aliases(confirmed_by);
create index budgets_actor_idx on public.inventory_budgets(updated_by);
create unique index document_source_unique on public.inventory_documents(branch_id,source_sha256) where source_sha256 is not null and status in ('posted','verified');
create unique index document_reference_unique on public.inventory_documents(branch_id,kind,document_date,lower(trim(counterparty)),lower(regexp_replace(reference,'[^a-zA-Z0-9]','','g'))) where status in ('posted','verified');
create unique index verified_sale_unique on public.inventory_documents(linked_sale_id) where status='verified';

alter table public.inventory_documents enable row level security;
alter table public.inventory_document_items enable row level security;
alter table public.inventory_document_payments enable row level security;
alter table public.inventory_product_aliases enable row level security;
alter table public.inventory_budgets enable row level security;
revoke all on public.inventory_documents,public.inventory_document_items,public.inventory_document_payments,public.inventory_product_aliases,public.inventory_budgets from public,anon,authenticated;
grant select on public.inventory_documents,public.inventory_document_items,public.inventory_document_payments,public.inventory_product_aliases,public.inventory_budgets to authenticated;
grant all on public.inventory_documents,public.inventory_document_items,public.inventory_document_payments,public.inventory_product_aliases,public.inventory_budgets to service_role;
create policy documents_read on public.inventory_documents for select to authenticated using(case when kind='purchase' then private.can('purchasing.read',branch_id) else private.can('sales.read',branch_id) end);
create policy document_lines_read on public.inventory_document_items for select to authenticated using(exists(select 1 from public.inventory_documents d where d.id=document_id));
create policy document_payments_read on public.inventory_document_payments for select to authenticated using(exists(select 1 from public.inventory_documents d where d.id=document_id));
create policy aliases_read on public.inventory_product_aliases for select to authenticated using(private.can('inventory.read',branch_id));
create policy budgets_read on public.inventory_budgets for select to authenticated using(private.can('purchasing.read',branch_id));

create function private.inventory_document_command(p_action text,p_payload jsonb,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_branch text;v_kind text;v_doc public.inventory_documents%rowtype;v_old private.command_receipts%rowtype;
 v_id uuid;v_data jsonb;v_item jsonb;v_stock public.inventory%rowtype;v_sale public.sales%rowtype;v_date date;v_mode text;v_ref text;v_party text;v_hash text;
 v_total bigint:=0;v_base bigint;v_unit bigint;v_discount bigint;v_amount bigint;v_vat bigint;v_paid bigint;v_qty numeric;v_version bigint;v_result jsonb;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_action not in ('save','post','payment','budget','archive','restore') or p_key is null or length(p_key) not between 8 and 200 then raise exception 'Invalid document command';end if;
 if p_action='budget' then
  v_branch:=p_payload->>'locationId';
  if not private.can('purchasing.manage',v_branch) then raise exception 'Permission denied' using errcode='42501';end if;
 else
  v_id:=(p_payload->>'id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('inventory-document:'||v_id::text,0));
  select * into v_doc from public.inventory_documents where id=v_id for update;
  if v_doc.id is null then
   if p_action<>'save' then raise exception 'Document not found' using errcode='P0002';end if;
   v_branch:=p_payload->>'locationId';v_kind:=p_payload->>'kind';
  else v_branch:=v_doc.branch_id;v_kind:=v_doc.kind;end if;
  if v_kind not in ('purchase','physical_sale') or not(case when v_kind='purchase' then private.can('purchasing.manage',v_branch) else private.can('sales.manage',v_branch) and private.can('inventory.adjust',v_branch) end) then raise exception 'A manager must review and post this document' using errcode='42501';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text||':'||p_key,0));
 if p_action='save' and v_doc.last_save_key=p_key then
  if v_doc.last_save_hash<>encode(sha256(convert_to(p_payload::text,'UTF8')),'hex') then raise exception 'Request key already used with different input' using errcode='23505';end if;
  return jsonb_build_object('id',v_id,'version',v_doc.version,'status',v_doc.status,'replayed',true);
 end if;
 select * into v_old from private.command_receipts where actor_id=v_uid and request_key=p_key;
 if found then
  if v_old.action<>'document-'||p_action or v_old.payload<>p_payload then raise exception 'Request key already used with different input' using errcode='23505';end if;
  return v_old.result||'{"replayed":true}'::jsonb;
 end if;
 if p_action='budget' then
  v_date:=(p_payload->>'month')::date;v_amount:=(p_payload->>'amountCents')::bigint;
  if v_date is null or extract(day from v_date)<>1 or v_amount is null or v_amount<0 or v_amount>100000000000 or v_amount<>(p_payload->>'amountCents')::numeric then raise exception 'Invalid monthly budget';end if;
  insert into public.inventory_budgets(branch_id,month,amount_cents,updated_by) values(v_branch,v_date,v_amount,v_uid) on conflict(branch_id,month) do update set amount_cents=excluded.amount_cents,updated_by=v_uid,updated_at=now();
  v_result:=jsonb_build_object('ok',true);
 elsif p_action='save' then
  if v_doc.id is not null and v_doc.status<>'draft' then raise exception 'Only drafts can be edited';end if;
  if coalesce((p_payload->>'expectedVersion')::bigint,0)<>coalesce(v_doc.version,0) then raise exception 'This draft changed in another window. Reload it before editing' using errcode='40001';end if;
  v_data:=p_payload->'data';
  if jsonb_typeof(v_data) is distinct from 'object' or length(v_data::text)>100000 or jsonb_typeof(v_data->'items') is distinct from 'array' then raise exception 'Invalid draft data';end if;
  if jsonb_array_length(v_data->'items')>200 then raise exception 'A slip can contain up to 200 lines';end if;
  insert into public.inventory_documents(id,branch_id,kind,data,created_by,counterparty,reference) values(v_id,v_branch,v_kind,v_data,v_uid,left(v_data->>'counterparty',200),left(v_data->>'reference',100))
  on conflict(id) do update set data=v_data,counterparty=left(v_data->>'counterparty',200),reference=left(v_data->>'reference',100),version=inventory_documents.version+1,updated_at=now() returning * into v_doc;
  update public.inventory_documents set last_save_key=p_key,last_save_hash=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex') where id=v_id;
  v_result:=jsonb_build_object('id',v_id,'version',v_doc.version,'status',v_doc.status);
 elsif p_action in ('archive','restore') then
  if v_doc.status<>(case when p_action='archive' then 'draft' else 'archived' end) then raise exception 'Posted records cannot be removed';end if;
  update public.inventory_documents set status=case when p_action='archive' then 'archived' else 'draft' end,version=version+1,updated_at=now() where id=v_id returning * into v_doc;
  v_result:=jsonb_build_object('id',v_id,'version',v_doc.version,'status',v_doc.status);
 elsif p_action='payment' then
  if v_doc.status<>'posted' or not private.can('payments.record',v_branch) then raise exception 'This document cannot accept a payment' using errcode='42501';end if;
  v_amount:=(p_payload->>'amountCents')::bigint;v_date:=(p_payload->>'paidOn')::date;
  select coalesce(sum(amount_cents),0) into v_paid from public.inventory_document_payments where document_id=v_id;
  if v_amount is null or v_amount<=0 or v_amount<>(p_payload->>'amountCents')::numeric or v_amount+v_paid>v_doc.total_cents or v_date is null or v_date<v_doc.document_date or v_date>(now() at time zone 'Africa/Johannesburg')::date or coalesce(p_payload->>'method','') not in ('cash','card','eft') then raise exception 'Invalid payment or overpayment';end if;
  if p_payload->>'method'<>'cash' and length(trim(coalesce(p_payload->>'reference','')))<1 then raise exception 'Enter the bank or terminal reference';end if;
  if p_payload->>'method'<>'cash' and exists(select 1 from public.inventory_document_payments where document_id=v_id and method=p_payload->>'method' and lower(trim(reference))=lower(trim(p_payload->>'reference'))) then raise exception 'This payment reference is already recorded' using errcode='23505';end if;
  insert into public.inventory_document_payments(document_id,amount_cents,method,reference,paid_on,actor_id) values(v_id,v_amount,p_payload->>'method',coalesce(p_payload->>'reference',''),v_date,v_uid);
  v_result:=jsonb_build_object('id',v_id,'balanceCents',v_doc.total_cents-v_paid-v_amount);
 else
  if v_doc.status in ('posted','verified') then return jsonb_build_object('id',v_id,'status',v_doc.status,'replayed',true);end if;
  if v_doc.status<>'draft' or (p_payload->>'expectedVersion')::bigint is distinct from v_doc.version then raise exception 'Reload the latest saved draft before posting' using errcode='40001';end if;
  if (p_payload->>'reviewed')::boolean is distinct from true then raise exception 'Confirm the extracted details and product matches first';end if;
  v_data:=v_doc.data;v_date:=(v_data->>'documentDate')::date;v_mode:=v_data->>'stockEffect';v_ref:=trim(v_data->>'reference');v_party:=trim(v_data->>'counterparty');v_hash:=nullif(v_data->>'sourceSha256','');
  if v_date is null or v_date>(now() at time zone 'Africa/Johannesburg')::date or v_date<'2000-01-01' or length(coalesce(v_ref,'')) not between 1 and 100 or length(coalesce(v_party,'')) not between 1 and 200 or coalesce(v_mode,'') not in ('apply','already_counted','verify_pos') or coalesce(v_data->>'currency','')<>'ZAR' then raise exception 'Check the date, reference, counterparty, stock effect and ZAR currency';end if;
  if v_hash is not null and v_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid source fingerprint';end if;
  if jsonb_array_length(v_data->'items') not between 1 and 200 then raise exception 'Add and match the slip lines';end if;
  if exists(select 1 from public.inventory_documents d where d.id<>v_id and d.branch_id=v_branch and d.status in ('posted','verified') and ((v_hash is not null and d.source_sha256=v_hash) or (d.kind=v_kind and d.document_date=v_date and lower(trim(d.counterparty))=lower(v_party) and lower(regexp_replace(d.reference,'[^a-zA-Z0-9]','','g'))=lower(regexp_replace(v_ref,'[^a-zA-Z0-9]','','g'))))) then raise exception 'This slip is already recorded. Open its existing record' using errcode='23505';end if;
  for v_item in select x from jsonb_array_elements(v_data->'items') x loop
   v_qty:=(v_item->>'quantity')::numeric;v_unit:=(v_item->>'unitPriceCents')::bigint;v_discount:=(v_item->>'discountCents')::bigint;
   if v_qty is null or v_qty<=0 or v_qty>1000000000 or v_qty<>round(v_qty,3) or v_unit is null or v_unit<0 or v_unit>100000000000 or v_unit<>(v_item->>'unitPriceCents')::numeric or v_discount is null or v_discount<0 or v_discount<>(v_item->>'discountCents')::numeric or not exists(select 1 from public.products where id=v_item->>'productId') then raise exception 'Check every matched product, quantity, price and discount';end if;
   v_base:=round(v_qty*v_unit)-v_discount;if v_base<0 then raise exception 'A line discount exceeds its value';end if;v_total:=v_total+v_base;
  end loop;
  foreach v_ref in array array['chargesCents','discountCents','roundingCents','vatCents','declaredTotalCents','paidCents'] loop
   if v_data->>v_ref is null or (v_data->>v_ref)::numeric<>trunc((v_data->>v_ref)::numeric) or abs((v_data->>v_ref)::numeric)>100000000000 then raise exception 'Enter amounts in whole cents';end if;
  end loop;
  v_ref:=trim(v_data->>'reference');
  if (v_data->>'chargesCents')::bigint<0 or (v_data->>'discountCents')::bigint<0 or abs((v_data->>'roundingCents')::bigint)>100 then raise exception 'Invalid charges, discount or rounding';end if;
  v_total:=v_total+(v_data->>'chargesCents')::bigint-(v_data->>'discountCents')::bigint+(v_data->>'roundingCents')::bigint;v_vat:=(v_data->>'vatCents')::bigint;v_paid:=(v_data->>'paidCents')::bigint;
  if v_total<=0 or v_total<>(v_data->>'declaredTotalCents')::bigint or v_vat<0 or v_vat>v_total or v_paid<0 or v_paid>v_total then raise exception 'The calculated lines must match the slip total, VAT and paid amount';end if;
  if v_paid>0 and coalesce(v_data->>'paymentMethod','') not in ('cash','card','eft') then raise exception 'Choose the payment method';end if;
  if v_paid>0 and v_mode<>'verify_pos' and not private.can('payments.record',v_branch) then raise exception 'Your role can receive stock but cannot record a payment. Save the purchase as unpaid' using errcode='42501';end if;
  if v_paid>0 and v_data->>'paymentMethod'<>'cash' and length(trim(coalesce(v_data->>'paymentReference','')))=0 then raise exception 'Enter the payment reference';end if;
  if v_mode='verify_pos' then
   if v_kind<>'physical_sale' then raise exception 'Only a physical sales slip can verify a POS receipt';end if;
   select * into strict v_sale from public.sales where id=(v_data->>'linkedSaleId')::uuid and branch_id=v_branch;
   if v_sale.total_cents<>v_total or v_sale.vat_cents<>v_vat or (v_sale.created_at at time zone 'Africa/Johannesburg')::date<>v_date then raise exception 'The POS receipt date, total or VAT does not match';end if;
   if exists(with a as(select x->>'productId' p,sum((x->>'quantity')::numeric) q from jsonb_array_elements(v_data->'items') x group by 1),b as(select product_id p,sum(quantity) q from public.sale_items where sale_id=v_sale.id group by 1) select 1 from a full join b using(p) where a.q is distinct from b.q) then raise exception 'The POS receipt products or quantities do not match';end if;
  elsif v_kind='physical_sale' and exists(select 1 from public.sales where branch_id=v_branch and (lower(receipt_number)=lower(v_ref) or (payment_reference<>'' and lower(payment_reference)=lower(v_ref)))) then raise exception 'This receipt is already in POS. Choose verify existing POS receipt to avoid counting it twice' using errcode='23505';end if;
  perform 1 from public.products where id in(select x->>'productId' from jsonb_array_elements(v_data->'items') x) order by id for share;
  for v_item in select jsonb_build_object('productId',x->>'productId','quantity',sum((x->>'quantity')::numeric),'version',min((x->>'stockVersion')::bigint)) from jsonb_array_elements(v_data->'items') x group by x->>'productId' order by x->>'productId' loop
   v_qty:=(v_item->>'quantity')::numeric;
   if v_mode='apply' then
    insert into public.inventory(branch_id,product_id) values(v_branch,v_item->>'productId') on conflict do nothing;
    select * into strict v_stock from public.inventory where branch_id=v_branch and product_id=v_item->>'productId' for update;
    if (v_item->>'version')::bigint is distinct from v_stock.version then raise exception 'Stock changed while reviewing this slip. Refresh stock and review again' using errcode='40001';end if;
    if v_kind='physical_sale' and v_stock.on_hand-v_stock.reserved-v_stock.damaged-v_stock.quarantined<v_qty then raise exception 'Insufficient available stock for this physical sale';end if;
    update public.inventory set on_hand=on_hand+case when v_kind='purchase' then v_qty else -v_qty end,version=version+1,updated_at=now() where branch_id=v_branch and product_id=v_stock.product_id;
    insert into public.stock_movements(branch_id,product_id,actor_id,previous_quantity,new_quantity,reason,note,occurred_on,source_document_id) values(v_branch,v_stock.product_id,v_uid,v_stock.on_hand,v_stock.on_hand+case when v_kind='purchase' then v_qty else -v_qty end,case when v_kind='purchase' then 'Supplier receipt' else 'Physical slip sale' end,v_ref,v_date,v_id);
   end if;
  end loop;
  insert into public.inventory_document_items(document_id,product_id,description,quantity,unit_price_cents,discount_cents,total_cents) select v_id,x->>'productId',left(coalesce(x->>'description',''),500),(x->>'quantity')::numeric,(x->>'unitPriceCents')::bigint,(x->>'discountCents')::bigint,round((x->>'quantity')::numeric*(x->>'unitPriceCents')::bigint)-(x->>'discountCents')::bigint from jsonb_array_elements(v_data->'items') x;
  update public.inventory_documents set status=case when v_mode='verify_pos' then 'verified' else 'posted' end,version=version+1,document_date=v_date,counterparty=v_party,reference=v_ref,source_sha256=v_hash,stock_effect=v_mode,total_cents=v_total,vat_cents=v_vat,linked_sale_id=case when v_mode='verify_pos' then v_sale.id else null end,posted_at=now(),updated_at=now() where id=v_id returning * into v_doc;
  if v_mode<>'verify_pos' and v_paid>0 then insert into public.inventory_document_payments(document_id,amount_cents,method,reference,paid_on,actor_id) values(v_id,v_paid,v_data->>'paymentMethod',coalesce(v_data->>'paymentReference',''),v_date,v_uid);end if;
  for v_item in select x from jsonb_array_elements(v_data->'items') x loop
   if length(trim(coalesce(v_item->>'description','')))>2 then
    insert into public.inventory_product_aliases(branch_id,counterparty,description,product_id,confirmed_by) values(v_branch,lower(v_party),lower(trim(v_item->>'description')),v_item->>'productId',v_uid) on conflict(branch_id,counterparty,description) do update set product_id=excluded.product_id,confirmed_by=v_uid,updated_at=now();
   end if;
  end loop;
  v_result:=jsonb_build_object('id',v_id,'status',v_doc.status,'version',v_doc.version,'totalCents',v_total,'stockApplied',v_mode='apply');
 end if;
 if p_action<>'save' then insert into public.audit_logs(actor_id,branch_id,action,target_id,details) values(v_uid,v_branch,'slip-'||p_action,v_id::text,coalesce(v_ref,''));end if;
 if p_action<>'save' then insert into private.command_receipts(actor_id,request_key,action,payload,result) values(v_uid,p_key,'document-'||p_action,p_payload,v_result);end if;
 return v_result;
end $$;
create function public.inventory_document_command(p_action text,p_payload jsonb,p_key text) returns jsonb language sql security invoker set search_path='' as $$select private.inventory_document_command(p_action,p_payload,p_key)$$;
revoke all on function public.inventory_document_command(text,jsonb,text),private.inventory_document_command(text,jsonb,text) from public,anon;
grant execute on function public.inventory_document_command(text,jsonb,text),private.inventory_document_command(text,jsonb,text) to authenticated;

create function public.inventory_month(p_branch text,p_month date) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_end date;v_rows jsonb;v_finance boolean;
begin
 if not private.can('inventory.read',p_branch) then raise exception 'Branch access denied' using errcode='42501';end if;
 if p_month is null or extract(day from p_month)<>1 then raise exception 'Choose the first day of a month';end if;
 v_end:=(p_month+interval '1 month')::date;v_finance:=private.can('purchasing.read',p_branch);
 with movements as(select product_id,sum(new_quantity-previous_quantity) filter(where occurred_on>=p_month) after_start,
 sum(new_quantity-previous_quantity) filter(where occurred_on>=v_end) after_end,
 sum(new_quantity-previous_quantity) filter(where occurred_on>=p_month and occurred_on<v_end and reason in ('Supplier receipt','Stock received')) received,
 -sum(new_quantity-previous_quantity) filter(where occurred_on>=p_month and occurred_on<v_end and reason='POS sale') pos_sold,
 -sum(new_quantity-previous_quantity) filter(where occurred_on>=p_month and occurred_on<v_end and reason='Physical slip sale') slip_applied_sold,
 sum(new_quantity-previous_quantity) filter(where occurred_on>=p_month and occurred_on<v_end and reason='POS return') returned,
 sum(new_quantity-previous_quantity) filter(where occurred_on>=p_month and occurred_on<v_end and reason not in ('Supplier receipt','Stock received','POS sale','Physical slip sale','POS return')) other
 from public.stock_movements where branch_id=p_branch group by product_id),
 slip_units as(select i.product_id,sum(i.quantity) qty from public.inventory_document_items i join public.inventory_documents d on d.id=i.document_id where d.branch_id=p_branch and d.kind='physical_sale' and d.status='posted' and d.document_date>=p_month and d.document_date<v_end group by i.product_id),
 velocity as(select product_id,-sum(new_quantity-previous_quantity) qty from public.stock_movements where branch_id=p_branch and reason in ('POS sale','Physical slip sale') and occurred_on>=(now() at time zone 'Africa/Johannesburg')::date-30 group by product_id)
 select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]') into v_rows from (
 select p.id,p.name,p.code,coalesce(i.version,0) version,coalesce(i.on_hand,0) on_hand,coalesce(i.on_hand-i.reserved-i.damaged-i.quarantined,0) available,
 coalesce(i.incoming,0) incoming,coalesce(i.minimum_stock,5) minimum,
 coalesce(i.on_hand,0)-coalesce(m.after_start,0) opening,coalesce(i.on_hand,0)-coalesce(m.after_end,0) closing,
 coalesce(m.received,0) received,coalesce(m.pos_sold,0) pos_sold,coalesce(m.slip_applied_sold,0) slip_applied_sold,coalesce(s.qty,0) documented_slip_sold,
 coalesce(m.returned,0) returned,coalesce(m.other,0) other,
 greatest(0,ceil(greatest(coalesce(i.minimum_stock,5),coalesce(v.qty,0)*14/30)-coalesce(i.on_hand-i.reserved-i.damaged-i.quarantined,0)-coalesce(i.incoming,0))) suggested_order,
 case when v_finance then (select round(sum(di.total_cents)/nullif(sum(di.quantity),0)) from public.inventory_document_items di join public.inventory_documents d on d.id=di.document_id where di.product_id=p.id and d.branch_id=p_branch and d.kind='purchase' and d.status='posted' and d.document_date=(select max(d2.document_date) from public.inventory_documents d2 join public.inventory_document_items i2 on i2.document_id=d2.id where d2.branch_id=p_branch and d2.kind='purchase' and d2.status='posted' and i2.product_id=p.id)) else null end last_purchase_unit_cents
 from public.products p left join public.inventory i on i.product_id=p.id and i.branch_id=p_branch left join movements m on m.product_id=p.id left join slip_units s on s.product_id=p.id left join velocity v on v.product_id=p.id
 ) x;
 return jsonb_build_object('month',p_month,'locationId',p_branch,'products',v_rows,'financeVisible',v_finance,
 'purchasesCents',case when v_finance then(select coalesce(sum(total_cents),0) from public.inventory_documents where branch_id=p_branch and kind='purchase' and status='posted' and document_date>=p_month and document_date<v_end) else null end,
 'spentCents',case when v_finance then(select coalesce(sum(p.amount_cents),0) from public.inventory_document_payments p join public.inventory_documents d on d.id=p.document_id where d.branch_id=p_branch and d.kind='purchase' and d.status='posted' and p.paid_on>=p_month and p.paid_on<v_end) else null end,
 'supplierBalanceCents',case when v_finance then(select coalesce(sum(d.total_cents-coalesce((select sum(amount_cents) from public.inventory_document_payments where document_id=d.id),0)),0) from public.inventory_documents d where d.branch_id=p_branch and d.kind='purchase' and d.status='posted') else null end,
 'physicalSalesCents',(select coalesce(sum(total_cents),0) from public.inventory_documents where branch_id=p_branch and kind='physical_sale' and status='posted' and document_date>=p_month and document_date<v_end),
 'posSalesCents',(select coalesce(sum(total_cents),0) from public.sales where branch_id=p_branch and created_at>=p_month::timestamp at time zone 'Africa/Johannesburg' and created_at<v_end::timestamp at time zone 'Africa/Johannesburg'),
 'budgetCents',case when v_finance then(select amount_cents from public.inventory_budgets where branch_id=p_branch and month=p_month) else null end);
end $$;
revoke all on function public.inventory_month(text,date) from public,anon;
grant execute on function public.inventory_month(text,date) to authenticated;
-- Consolidate physical slips into the accounting book without counting POS verifications twice.
alter function public.accounting_book(text,date,date) rename to accounting_book_before_slips;
create function public.accounting_book(p_branch text,p_from date,p_to date) returns jsonb language sql stable security invoker set search_path='' as $$
 with base as(select public.accounting_book_before_slips(p_branch,p_from,p_to) book),docs as(select * from public.inventory_documents where branch_id=p_branch and status='posted' and document_date between p_from and p_to)
 select book||jsonb_build_object('slipBook',jsonb_build_object(
 'salesCents',(select coalesce(sum(total_cents),0) from docs where kind='physical_sale'),'salesVatCents',(select coalesce(sum(vat_cents),0) from docs where kind='physical_sale'),'saleCount',(select count(*) from docs where kind='physical_sale'),
 'purchasesCents',(select coalesce(sum(total_cents),0) from docs where kind='purchase'),
 'supplierPaymentsCents',(select coalesce(sum(p.amount_cents),0) from public.inventory_document_payments p join public.inventory_documents d on d.id=p.document_id where d.branch_id=p_branch and d.status='posted' and d.kind='purchase' and p.paid_on between p_from and p_to),
 'externalReceiptsCents',(select coalesce(sum(p.amount_cents),0) from public.inventory_document_payments p join public.inventory_documents d on d.id=p.document_id where d.branch_id=p_branch and d.status='posted' and d.kind='physical_sale' and p.paid_on between p_from and p_to),
 'documents',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'document_date',document_date,'counterparty',counterparty,'reference',reference,'total_cents',total_cents,'vat_cents',vat_cents,'stock_effect',stock_effect) order by document_date,created_at) from docs),'[]'),
 'payments',coalesce((select jsonb_agg(jsonb_build_object('kind',d.kind,'counterparty',d.counterparty,'reference',d.reference,'paid_on',p.paid_on,'method',p.method,'amount_cents',p.amount_cents,'payment_reference',p.reference) order by p.paid_on,p.created_at) from public.inventory_document_payments p join public.inventory_documents d on d.id=p.document_id where d.branch_id=p_branch and d.status='posted' and p.paid_on between p_from and p_to),'[]'))) from base;
$$;
revoke all on function public.accounting_book(text,date,date) from public,anon;
grant execute on function public.accounting_book(text,date,date) to authenticated;

alter function public.dashboard_summary(text) rename to dashboard_summary_before_slips;
create function public.dashboard_summary(p_branch text) returns jsonb language sql stable security invoker set search_path='' as $$
 select public.dashboard_summary_before_slips(p_branch)||jsonb_build_object(
 'todaySales',(public.dashboard_summary_before_slips(p_branch)->>'todaySales')::numeric+(select coalesce(sum(total_cents),0)/100.0 from public.inventory_documents where branch_id=p_branch and kind='physical_sale' and status='posted' and document_date=(now() at time zone 'Africa/Johannesburg')::date),
 'todayTransactions',(public.dashboard_summary_before_slips(p_branch)->>'todayTransactions')::bigint+(select count(*) from public.inventory_documents where branch_id=p_branch and kind='physical_sale' and status='posted' and document_date=(now() at time zone 'Africa/Johannesburg')::date),
 'paidRevenue',(public.dashboard_summary_before_slips(p_branch)->>'paidRevenue')::numeric+(select coalesce(sum(total_cents),0)/100.0 from public.inventory_documents where branch_id=p_branch and kind='physical_sale' and status='posted')) where private.can('reports.read',p_branch)
 union all select public.dashboard_summary_before_slips(p_branch) where private.can('dashboard.read',p_branch) and not private.can('reports.read',p_branch);
$$;
revoke all on function public.dashboard_summary(text) from public,anon;
grant execute on function public.dashboard_summary(text) to authenticated;
notify pgrst,'reload schema';
