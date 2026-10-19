-- Online TRUECOLOURS backend. Financial and inventory commands are atomic.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon;
create sequence public.customer_number_seq;
create sequence public.invoice_number_seq;
create sequence public.receipt_number_seq;
create table public.branches (id text primary key, name text not null, active boolean not null default true);
insert into public.branches(id,name) values ('main-store','Main store');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 legacy_uid text unique, customer_number text not null unique default ('TC'||lpad(nextval('public.customer_number_seq')::text,6,'0')),
 data jsonb not null default '{}' check(jsonb_typeof(data)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null, role text not null check(role in ('owner','administrator','manager','cashier','salesperson','stock_controller','accountant','customer')),
 branch_ids text[] not null default array['main-store'], active boolean not null default true,
 session_version integer not null default 1, updated_at timestamptz not null default now()
);
create table private.role_permissions(role text not null, permission text not null, primary key(role,permission));
create function private.can(p_permission text, p_branch text default null) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from auth.sessions live_session where live_session.id=nullif(auth.jwt()->>'session_id','')::uuid and live_session.user_id=(select auth.uid())) and exists(select 1 from public.staff s join private.role_permissions p on p.role=s.role
 where s.user_id=(select auth.uid()) and s.active and p.permission=p_permission
 and (p_branch is null or p_branch=any(s.branch_ids)));
$$;
revoke all on function private.can(text,text) from public;
grant execute on function private.can(text,text) to authenticated;
create table public.products (
 id text primary key, name text not null, code text not null, category text not null default '', brand text not null default '', supplier text not null default '',
 barcodes text[] not null default '{}', selling_price_cents bigint check(selling_price_cents>=0), cost_price_cents bigint check(cost_price_cents>=0),
 tax_rate numeric(5,2) not null default 15 check(tax_rate between 0 and 100), visible boolean not null default true, featured boolean not null default false,
 data jsonb not null default '{}', updated_at timestamptz not null default now()
);
create index products_code_idx on public.products(code);
create index products_name_id_idx on public.products(name,id);
create index products_category_idx on public.products(category);
create index products_barcodes_idx on public.products using gin(barcodes);
-- Commercial prices/costs are staff-only. The public catalogue uses a safe RPC.
create table public.inventory (
 branch_id text not null references public.branches(id), product_id text not null references public.products(id),
 on_hand numeric(15,3) not null default 0, reserved numeric(15,3) not null default 0, damaged numeric(15,3) not null default 0,
 incoming numeric(15,3) not null default 0, returned numeric(15,3) not null default 0, quarantined numeric(15,3) not null default 0,
 minimum_stock numeric(15,3) not null default 5, version bigint not null default 0, updated_at timestamptz not null default now(),
 primary key(branch_id,product_id), check(on_hand>=reserved+damaged+quarantined), check(reserved>=0 and damaged>=0 and quarantined>=0 and incoming>=0 and returned>=0 and minimum_stock>=0)
);
create table public.stock_movements (
 id uuid primary key default gen_random_uuid(), branch_id text not null references public.branches(id), product_id text not null references public.products(id),
 actor_id uuid not null references auth.users(id), previous_quantity numeric(15,3) not null, new_quantity numeric(15,3) not null,
 reason text not null, note text not null default '', created_at timestamptz not null default now()
);
create index stock_movements_branch_created_idx on public.stock_movements(branch_id,created_at desc,id);
create table public.customer_records (
 id text not null default gen_random_uuid()::text, user_id uuid not null references public.profiles(id) on delete cascade, kind text not null,
 data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(user_id,kind,id)
);
create index customer_records_kind_user_updated_idx on public.customer_records(kind,user_id,updated_at desc);
create table public.business_records (
 id text primary key default gen_random_uuid()::text, user_id uuid references public.profiles(id), branch_id text not null default 'main-store' references public.branches(id),
 kind text not null check(kind in ('orders','quotes','messages','invoices')), data jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index business_records_kind_branch_created_idx on public.business_records(kind,branch_id,created_at desc,id);
create index business_records_user_kind_created_idx on public.business_records(user_id,kind,created_at desc);
create unique index invoice_number_unique on public.business_records((data->>'invoiceNumber')) where kind='invoices';
create unique index invoice_token_unique on public.business_records((data->>'shareToken')) where kind='invoices';
create table public.business_settings (id text primary key default 'business', data jsonb not null default '{}');
insert into public.business_settings(id) values('business');
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), branch_id text references public.branches(id),
 action text not null, target_id text, details text not null default '', created_at timestamptz not null default now()
);
create index audit_logs_branch_created_idx on public.audit_logs(branch_id,created_at desc,id);
create table private.command_receipts (
 actor_id uuid not null references auth.users(id), request_key text not null, action text not null, payload jsonb not null, result jsonb not null,
 created_at timestamptz not null default now(), primary key(actor_id,request_key)
);
create table public.cashier_shifts (
 id uuid primary key default gen_random_uuid(), branch_id text not null references public.branches(id), cashier_id uuid not null references auth.users(id),
 opening_float_cents bigint not null check(opening_float_cents>=0), opened_at timestamptz not null default now(), closed_at timestamptz,
 counted_cash_cents bigint check(counted_cash_cents>=0), expected_cash_cents bigint, discrepancy_cents bigint
);
create unique index cashier_one_open_shift on public.cashier_shifts(cashier_id) where closed_at is null;
create index cashier_shifts_branch_opened_idx on public.cashier_shifts(branch_id,opened_at desc);
create table public.sales (
 id uuid primary key default gen_random_uuid(), receipt_number text not null unique default ('TC-'||lpad(nextval('public.receipt_number_seq')::text,8,'0')),
 branch_id text not null references public.branches(id), cashier_id uuid not null references auth.users(id), shift_id uuid not null references public.cashier_shifts(id),
 total_cents bigint not null check(total_cents>0), vat_cents bigint not null check(vat_cents>=0), payment_method text not null check(payment_method in ('cash','card','eft')),
 tendered_cents bigint not null, change_cents bigint not null check(change_cents>=0), payment_reference text not null default '', created_at timestamptz not null default now()
);
create index sales_branch_created_idx on public.sales(branch_id,created_at desc,id);
create index sales_shift_idx on public.sales(shift_id);
create table public.sale_items (
 id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.sales(id), product_id text not null references public.products(id),
 name text not null, code text not null, quantity numeric(15,3) not null check(quantity>0), unit_price_cents bigint not null check(unit_price_cents>=0),
 total_cents bigint not null, vat_cents bigint not null
);
create index sale_items_sale_idx on public.sale_items(sale_id);
create table public.invoice_payments (
 id uuid primary key default gen_random_uuid(), invoice_id text not null references public.business_records(id), actor_id uuid not null references auth.users(id),
 amount_cents bigint not null check(amount_cents>0), method text not null check(method in ('Cash','Card','EFT','Bank transfer','Bank deposit','Other')),
 reference text not null default '', note text not null default '', paid_at date not null default current_date, created_at timestamptz not null default now()
);
create index invoice_payments_invoice_idx on public.invoice_payments(invoice_id);
-- All public tables are default-deny. Commands write through guarded functions.
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.staff enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.stock_movements enable row level security;
alter table public.customer_records enable row level security;
alter table public.business_records enable row level security;
alter table public.business_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.cashier_shifts enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.invoice_payments enable row level security;
alter table private.role_permissions enable row level security;
alter table private.command_receipts enable row level security;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.branches, public.profiles, public.staff, public.inventory, public.stock_movements, public.customer_records, public.business_records, public.business_settings, public.audit_logs, public.cashier_shifts, public.sales, public.sale_items, public.invoice_payments to authenticated;
-- Costs require separate permission and are never selected by the standard API.
grant select(id,name,code,category,brand,supplier,barcodes,selling_price_cents,tax_rate,visible,featured,data,updated_at) on public.products to authenticated;
create policy branches_read on public.branches for select to authenticated using(private.can('dashboard.read',id));
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or private.can('customers.read'));
create policy staff_read on public.staff for select to authenticated using(user_id=(select auth.uid()) or private.can('staff.read'));
create policy products_read on public.products for select to authenticated using(private.can('products.read'));
create policy inventory_read on public.inventory for select to authenticated using(private.can('inventory.read',branch_id));
create policy movements_read on public.stock_movements for select to authenticated using(private.can('inventory.read',branch_id));
create policy personal_read on public.customer_records for select to authenticated using(user_id=(select auth.uid()) or private.can('customers.read'));
create policy records_read on public.business_records for select to authenticated using(
 (user_id=(select auth.uid()) and kind in ('orders','quotes','messages')) or
 (kind in ('orders','quotes') and private.can('sales.read',branch_id)) or
 (kind='messages' and private.can('customers.read',branch_id)) or
 (kind='invoices' and private.can('documents.read',branch_id)));
create policy settings_read on public.business_settings for select to authenticated using(private.can('settings.manage') or private.can('documents.read'));
create policy audit_read on public.audit_logs for select to authenticated using(private.can('audit.read',branch_id));
create policy shifts_read on public.cashier_shifts for select to authenticated using(private.can('pos.use',branch_id) and cashier_id=(select auth.uid()) or private.can('reports.read',branch_id));
create policy sales_read on public.sales for select to authenticated using(private.can('sales.read',branch_id));
create policy items_read on public.sale_items for select to authenticated using(exists(select 1 from public.sales s where s.id=sale_id and private.can('sales.read',s.branch_id)));
create policy payments_read on public.invoice_payments for select to authenticated using(exists(select 1 from public.business_records r where r.id=invoice_id and private.can('documents.read',r.branch_id)));
-- User signup cannot assign roles. Identity data is separate from staff authority.
create function private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,data) values(new.id,jsonb_build_object('email',new.email,'displayName',coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',''),'photoURL',coalesce(new.raw_user_meta_data->>'avatar_url',''),'role','customer','onboardingComplete',false)) on conflict(id) do nothing;
 return new;
end $$;
revoke all on function private.new_profile() from public, anon, authenticated;
create trigger auth_user_profile after insert on auth.users for each row execute function private.new_profile();
create function private.save_profile(p_patch jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if jsonb_typeof(p_patch)<>'object' then raise exception 'Invalid profile'; end if;
 update public.profiles set data=data||(p_patch-array['id','role','customerId','email','legacy_uid','createdAt']),updated_at=now() where id=auth.uid();
end $$;
create function public.save_profile(p_patch jsonb) returns void language sql security invoker set search_path='' as $$ select private.save_profile(p_patch) $$;
create function private.customer_record_write(p_kind text,p_id text,p_patch jsonb,p_delete boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_kind not in ('addresses','cart','downloads','favourites','savedColours','vehicles','recentlyViewed','notifications','onboarding','activities') or length(p_id)>500 or jsonb_typeof(p_patch)<>'object' then raise exception 'Invalid customer record'; end if;
 if p_kind='notifications' then
  if p_delete then delete from public.customer_records where user_id=auth.uid() and kind=p_kind and id=p_id;
  else update public.customer_records set data=data||jsonb_build_object('read',coalesce((p_patch->>'read')::boolean,true)),updated_at=now() where user_id=auth.uid() and kind=p_kind and id=p_id; end if;
 elsif p_delete then delete from public.customer_records where user_id=auth.uid() and kind=p_kind and id=p_id;
 else
  if p_kind='cart' and (coalesce((p_patch->>'quantity')::numeric,1)<=0 or coalesce((p_patch->>'quantity')::numeric,1)>1000000) then raise exception 'Invalid quantity'; end if;
  insert into public.customer_records(user_id,kind,id,data) values(auth.uid(),p_kind,p_id,p_patch-array['userId','id','role'])
  on conflict(user_id,kind,id) do update set data=public.customer_records.data||excluded.data,updated_at=now();
 end if;
end $$;
create function public.customer_record_write(p_kind text,p_id text,p_patch jsonb,p_delete boolean default false) returns void language sql security invoker set search_path='' as $$ select private.customer_record_write(p_kind,p_id,p_patch,p_delete) $$;
create function private.add_cart_item(p_product_id text,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into public.customer_records(user_id,kind,id,data) values(auth.uid(),'cart',p_product_id,(p_data-array['userId','id','quantity'])||jsonb_build_object('quantity',1))
 on conflict(user_id,kind,id) do update set data=public.customer_records.data||jsonb_build_object('quantity',least(1000000,coalesce((public.customer_records.data->>'quantity')::numeric,0)+1)),updated_at=now();
end $$;
create function public.add_cart_item(p_product_id text,p_data jsonb) returns void language sql security invoker set search_path='' as $$select private.add_cart_item(p_product_id,p_data)$$;
create function private.customer_request(p_kind text,p_data jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_id text; v_branch text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_kind not in ('orders','quotes','messages') or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid request'; end if;
 v_branch:=coalesce(nullif(p_data->>'branchId',''),'main-store');
 if not exists(select 1 from public.branches where id=v_branch and active) then raise exception 'Unknown branch'; end if;
 insert into public.business_records(user_id,branch_id,kind,data) values(auth.uid(),v_branch,p_kind,(p_data-array['id','userId','status','payments','amountPaid','total','subtotal','vatAmount','orderNumber'])||jsonb_build_object('userId',auth.uid(),'status',case when p_kind='quotes' then 'requested' else 'pending' end,'direction','customer','orderNumber','ENQ-'||substr(gen_random_uuid()::text,1,8),'pricingStatus','awaiting_confirmation')) returning id into v_id;
 insert into public.customer_records(user_id,kind,data) values(auth.uid(),'notifications',jsonb_build_object('kind',p_kind,'title','Request received','body','TRUECOLOURS will confirm your request.','read',false));
 return v_id;
end $$;
create function public.customer_request(p_kind text,p_data jsonb) returns text language sql security invoker set search_path='' as $$select private.customer_request(p_kind,p_data)$$;
-- Public catalogue contains display data only; no cost or authorised till prices.
create function private.catalogue_products() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'code',code,'category',category,'brand',brand,'supplier',supplier,'visible',visible,'featured',featured,'data',data) order by name,id),'[]') from public.products where visible;
$$;
create function public.catalogue_products() returns jsonb language sql stable security invoker set search_path='' as $$select private.catalogue_products()$$;
create function private.customer_invoices() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'userId',user_id,'createdAt',created_at,'updatedAt',updated_at)||(data-array['privateNotes','activity','revisions','emailHistory','documents','payments'])),'[]') from public.business_records where user_id=(select auth.uid()) and kind='invoices' and data->>'status' not in ('deleted','cancelled');
$$;
create function public.customer_invoices() returns jsonb language sql stable security invoker set search_path='' as $$select private.customer_invoices()$$;
create function private.admin_command(p_action text,p_payload jsonb,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid(); v_branch text; v_other text; v_permission text; v_role text; v_old private.command_receipts%rowtype;
 v_inventory public.inventory%rowtype; v_product public.products%rowtype; v_record public.business_records%rowtype; v_shift public.cashier_shifts%rowtype;
 v_sale public.sales%rowtype; v_id text; v_quantity numeric; v_min numeric; v_total bigint:=0; v_vat bigint:=0; v_line_total bigint; v_line_vat bigint;
 v_tender bigint; v_paid bigint; v_amount bigint; v_expected bigint; v_line jsonb; v_lines jsonb:='[]'; v_data jsonb; v_result jsonb; v_status text;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_key is null or length(p_key)<8 or length(p_key)>200 or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid command'; end if;
 select s.role,coalesce(nullif(p_payload->>'locationId',''),s.branch_ids[1]) into v_role,v_branch from public.staff s where user_id=v_uid and active;
 if v_role is null then raise exception 'Active staff identity required' using errcode='42501'; end if;
 v_permission:=case
 when p_action='update-stock' then 'inventory.adjust'
 when p_action in ('reserve-stock','release-reservation') then 'sales.manage'
 when p_action='transfer-stock' then 'inventory.transfer'
 when p_action='update-product' then 'products.manage'
 when p_action='create-branch' then 'settings.manage'
 when p_action in ('open-shift','close-shift','checkout') then 'pos.use'
 when p_action='update-role' then 'staff.roles.manage'
 when p_action in ('update-order','update-quote') then 'sales.manage'
 when p_action='record-payment' then 'payments.record'
 when p_action='update-settings' then 'settings.manage'
 when p_action='send-message' then 'customers.manage'
 when p_action in ('create-invoice','save-invoice','duplicate-invoice','update-invoice','send-invoice','record-email') then 'documents.manage'
 else null end;
 if v_permission is null or not private.can(v_permission,v_branch) then raise exception 'Permission denied' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text||':'||p_key,0));
 select * into v_old from private.command_receipts where actor_id=v_uid and request_key=p_key;
 if found then
  if v_old.action<>p_action or v_old.payload<>p_payload then raise exception 'Request key already used with different input' using errcode='23505'; end if;
  return v_old.result||'{"replayed":true}'::jsonb;
 end if;
 if p_action='create-branch' then
  v_id:=p_payload->>'id';
  if v_id !~ '^[a-z0-9-]{2,80}$' or length(trim(p_payload->>'name'))<1 then raise exception 'Invalid branch'; end if;
  insert into public.branches(id,name) values(v_id,p_payload->>'name');
  update public.staff set branch_ids=array_append(branch_ids,v_id),updated_at=now() where user_id=v_uid;
  v_result:=jsonb_build_object('branchId',v_id);
 elsif p_action='update-product' then
  v_id:=p_payload->>'productId';
  v_amount:=(p_payload->>'sellingPriceCents')::bigint;
  if v_amount is null or v_amount<0 or v_amount>100000000000 then raise exception 'Invalid authorised price'; end if;
  update public.products set selling_price_cents=v_amount,barcodes=case when p_payload ? 'barcodes' then array(select jsonb_array_elements_text(p_payload->'barcodes')) else barcodes end,updated_at=now() where id=v_id;
  if not found then raise exception 'Unknown product'; end if;
  v_result:=jsonb_build_object('productId',v_id);
 elsif p_action='update-stock' then
  v_id:=p_payload->>'productId'; v_quantity:=(p_payload->>'stockQuantity')::numeric; v_min:=coalesce((p_payload->>'minStock')::numeric,5);
  if v_quantity is null or v_quantity<0 or v_quantity>1000000000 or v_quantity<>round(v_quantity,3) or v_min<0 or v_min>1000000000 then raise exception 'Invalid stock quantity'; end if;
  perform 1 from public.products where id=v_id for update;
  insert into public.inventory(branch_id,product_id) values(v_branch,v_id) on conflict do nothing;
  select * into strict v_inventory from public.inventory where branch_id=v_branch and product_id=v_id for update;
  if p_payload ? 'expectedVersion' and (p_payload->>'expectedVersion')::bigint<>v_inventory.version then raise exception 'Stock changed. Refresh before saving.' using errcode='40001'; end if;
  if v_quantity<v_inventory.reserved+v_inventory.damaged+v_inventory.quarantined then raise exception 'Stock cannot be lower than reserved or non-sellable stock'; end if;
  update public.inventory set on_hand=v_quantity,minimum_stock=v_min,version=version+1,updated_at=now() where branch_id=v_branch and product_id=v_id;
  if p_payload ? 'visible' and private.can('products.manage') then update public.products set visible=(p_payload->>'visible')::boolean where id=v_id; end if;
  insert into public.stock_movements(branch_id,product_id,actor_id,previous_quantity,new_quantity,reason,note) values(v_branch,v_id,v_uid,v_inventory.on_hand,v_quantity,coalesce(p_payload->>'reason','Stocktake'),coalesce(p_payload->>'note',''));
  v_quantity:=v_quantity-v_inventory.reserved-v_inventory.damaged-v_inventory.quarantined;
  v_status:=case when v_quantity<=0 then 'Out of Stock' when v_quantity<=v_min then 'Limited Stock' else 'In Stock' end;
  v_result:=jsonb_build_object('inventoryVersion',v_inventory.version+1,'stockStatus',v_status,'balance',jsonb_build_object('onHand',v_quantity),'productId',v_id);
 elsif p_action='reserve-stock' then
  v_id:=p_payload->>'productId';v_quantity:=(p_payload->>'quantity')::numeric;
  if v_quantity is null or v_quantity<=0 or v_quantity>1000000000 or v_quantity<>round(v_quantity,3) or length(coalesce(p_payload->>'sourceId',''))=0 then raise exception 'Invalid reservation';end if;
  select * into strict v_inventory from public.inventory where branch_id=v_branch and product_id=v_id for update;
  if p_payload ? 'expectedVersion' and (p_payload->>'expectedVersion')::bigint<>v_inventory.version then raise exception 'Stock changed. Refresh before reserving.' using errcode='40001';end if;
  if v_inventory.on_hand-v_inventory.reserved-v_inventory.damaged-v_inventory.quarantined<v_quantity then raise exception 'Insufficient available stock';end if;
  insert into public.inventory_reservations(branch_id,product_id,quantity,source_type,source_id,expires_at) values(v_branch,v_id,v_quantity,coalesce(p_payload->>'sourceType','order'),p_payload->>'sourceId',now()+make_interval(mins=>least(1440,greatest(1,coalesce((p_payload->>'expiresInMinutes')::integer,30))))) returning id::text into v_id;
  update public.inventory set reserved=reserved+v_quantity,version=version+1,updated_at=now() where branch_id=v_branch and product_id=p_payload->>'productId';
  v_result:=jsonb_build_object('reservationId',v_id,'reservationStatus','active');
 elsif p_action='release-reservation' then
  select to_jsonb(r) into strict v_data from public.inventory_reservations r where id=(p_payload->>'reservationId')::uuid for update;
  v_branch:=v_data->>'branch_id';
  if not private.can('sales.manage',v_branch) then raise exception 'Branch access denied' using errcode='42501';end if;
  if v_data->>'status'='active' then
   update public.inventory set reserved=reserved-(v_data->>'quantity')::numeric,version=version+1,updated_at=now() where branch_id=v_branch and product_id=v_data->>'product_id';
   update public.inventory_reservations set status=case when expires_at<=now() then 'expired' else 'released' end,released_at=now() where id=(p_payload->>'reservationId')::uuid;
  end if;
  v_result:=jsonb_build_object('reservationId',p_payload->>'reservationId','reservationStatus','released');
 elsif p_action='transfer-stock' then
  v_other:=p_payload->>'toBranchId'; v_id:=p_payload->>'productId'; v_quantity:=(p_payload->>'quantity')::numeric;
  if not private.can('inventory.transfer',v_other) or v_other=v_branch then raise exception 'Invalid destination branch' using errcode='42501'; end if;
  if v_quantity is null or v_quantity<=0 or v_quantity<>round(v_quantity,3) then raise exception 'Invalid transfer quantity'; end if;
  insert into public.inventory(branch_id,product_id) values(v_branch,v_id),(v_other,v_id) on conflict do nothing;
  perform 1 from public.inventory where branch_id in(v_branch,v_other) and product_id=v_id order by branch_id for update;
  select * into strict v_inventory from public.inventory where branch_id=v_branch and product_id=v_id;
  if v_inventory.on_hand-v_inventory.reserved-v_inventory.damaged-v_inventory.quarantined<v_quantity then raise exception 'Not enough available stock'; end if;
  update public.inventory set on_hand=on_hand-v_quantity,version=version+1,updated_at=now() where branch_id=v_branch and product_id=v_id;
  update public.inventory set on_hand=on_hand+v_quantity,version=version+1,updated_at=now() where branch_id=v_other and product_id=v_id;
  insert into public.stock_movements(branch_id,product_id,actor_id,previous_quantity,new_quantity,reason,note) select branch_id,product_id,v_uid,on_hand+case when branch_id=v_branch then v_quantity else -v_quantity end,on_hand,'Branch transfer',v_branch||' → '||v_other from public.inventory where branch_id in(v_branch,v_other) and product_id=v_id;
  v_result:=jsonb_build_object('productId',v_id);
 elsif p_action='open-shift' then
  v_amount:=(p_payload->>'openingFloatCents')::bigint;
  if v_amount is null or v_amount<0 then raise exception 'Invalid opening float'; end if;
  insert into public.cashier_shifts(branch_id,cashier_id,opening_float_cents) values(v_branch,v_uid,v_amount) returning * into v_shift;
  v_result:=jsonb_build_object('shift',to_jsonb(v_shift));
 elsif p_action='close-shift' then
  select * into strict v_shift from public.cashier_shifts where id=(p_payload->>'shiftId')::uuid and cashier_id=v_uid and branch_id=v_branch for update;
  if v_shift.closed_at is not null then raise exception 'Shift already closed'; end if;
  v_amount:=(p_payload->>'countedCashCents')::bigint;
  if v_amount is null or v_amount<0 then raise exception 'Invalid counted cash'; end if;
  select v_shift.opening_float_cents+coalesce(sum(total_cents) filter(where payment_method='cash'),0),coalesce(sum(total_cents),0) into v_expected,v_total from public.sales where shift_id=v_shift.id;
  update public.cashier_shifts set closed_at=now(),counted_cash_cents=v_amount,expected_cash_cents=v_expected,discrepancy_cents=v_amount-v_expected where id=v_shift.id returning * into v_shift;
  v_result:=jsonb_build_object('shift',to_jsonb(v_shift),'totalCents',v_total);
 elsif p_action='checkout' then
  select * into strict v_shift from public.cashier_shifts where id=(p_payload->>'shiftId')::uuid and cashier_id=v_uid and branch_id=v_branch for update;
  if v_shift.closed_at is not null then raise exception 'Open a shift before checkout'; end if;
  if jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items') not between 1 and 200 then raise exception 'Add between 1 and 200 items'; end if;
  if coalesce(p_payload->>'paymentMethod','') not in ('cash','card','eft') then raise exception 'Unsupported payment method'; end if;
  if p_payload->>'paymentMethod' in ('card','eft') and length(trim(coalesce(p_payload->>'reference','')))=0 then raise exception 'Enter the external payment reference'; end if;
  if exists(select 1 from jsonb_array_elements(p_payload->'items') x where not (x ? 'productId' and x ? 'quantity') or (x->>'quantity')::numeric<=0 or (x->>'quantity')::numeric<>round((x->>'quantity')::numeric,3)) then raise exception 'Invalid sale item'; end if;
  for v_line in select jsonb_build_object('productId',x->>'productId','quantity',sum((x->>'quantity')::numeric)) from jsonb_array_elements(p_payload->'items') x group by x->>'productId' order by x->>'productId' loop
   v_id:=v_line->>'productId';v_quantity:=(v_line->>'quantity')::numeric;
   select * into strict v_product from public.products where id=v_id and visible for share;
   if v_product.selling_price_cents is null then raise exception 'Product % has no authorised selling price',v_product.name; end if;
   select * into strict v_inventory from public.inventory where branch_id=v_branch and product_id=v_id for update;
   if v_inventory.on_hand-v_inventory.reserved-v_inventory.damaged-v_inventory.quarantined<v_quantity then raise exception 'Insufficient available stock for %',v_product.name; end if;
   v_line_total:=round(v_product.selling_price_cents*v_quantity); v_line_vat:=round(v_line_total*v_product.tax_rate/(100+v_product.tax_rate));
   v_total:=v_total+v_line_total;v_vat:=v_vat+v_line_vat;
   v_lines:=v_lines||jsonb_build_object('productId',v_id,'name',v_product.name,'code',v_product.code,'quantity',v_quantity,'unitPriceCents',v_product.selling_price_cents,'totalCents',v_line_total,'vatCents',v_line_vat);
   update public.inventory set on_hand=on_hand-v_quantity,version=version+1,updated_at=now() where branch_id=v_branch and product_id=v_id;
   insert into public.stock_movements(branch_id,product_id,actor_id,previous_quantity,new_quantity,reason) values(v_branch,v_id,v_uid,v_inventory.on_hand,v_inventory.on_hand-v_quantity,'POS sale');
  end loop;
  if v_total<=0 then raise exception 'Sale total must be positive'; end if;
  v_tender:=coalesce((p_payload->>'tenderedCents')::bigint,v_total);
  if p_payload->>'paymentMethod'<>'cash' then v_tender:=v_total; end if;
  if v_tender<v_total then raise exception 'Cash received is below the sale total'; end if;
  insert into public.sales(branch_id,cashier_id,shift_id,total_cents,vat_cents,payment_method,tendered_cents,change_cents,payment_reference) values(v_branch,v_uid,v_shift.id,v_total,v_vat,p_payload->>'paymentMethod',v_tender,v_tender-v_total,coalesce(p_payload->>'reference','')) returning * into v_sale;
  insert into public.sale_items(sale_id,product_id,name,code,quantity,unit_price_cents,total_cents,vat_cents) select v_sale.id,x->>'productId',x->>'name',x->>'code',(x->>'quantity')::numeric,(x->>'unitPriceCents')::bigint,(x->>'totalCents')::bigint,(x->>'vatCents')::bigint from jsonb_array_elements(v_lines) x;
  v_result:=jsonb_build_object('sale',to_jsonb(v_sale),'items',v_lines);
 elsif p_action='update-role' then
  if p_payload->>'role' not in ('owner','administrator','manager','cashier','salesperson','stock_controller','accountant','customer') then raise exception 'Unknown role'; end if;
  if p_payload->>'role' in ('owner','administrator') and v_role<>'owner' then raise exception 'Only owners can assign this role' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('truecolours-owner-roles',0));
  if exists(select 1 from public.staff where user_id=(p_payload->>'userId')::uuid and role='owner') and v_role<>'owner' then raise exception 'Only owners can change owner accounts' using errcode='42501'; end if;
  if exists(select 1 from public.staff where user_id=(p_payload->>'userId')::uuid and role='owner' and active) and p_payload->>'role'<>'owner' and (select count(*) from public.staff where role='owner' and active)<=1 then raise exception 'The last active owner cannot be removed'; end if;
  if exists(select 1 from jsonb_array_elements_text(coalesce(p_payload->'branchIds',to_jsonb(array[v_branch]))) x where not private.can('staff.roles.manage',x)) then raise exception 'Branch assignment denied' using errcode='42501'; end if;
  insert into public.staff(user_id,name,role,branch_ids,active) select id,coalesce(data->>'displayName','Staff'),p_payload->>'role',array(select jsonb_array_elements_text(coalesce(p_payload->'branchIds',to_jsonb(array[v_branch])))),p_payload->>'role'<>'customer' from public.profiles where id=(p_payload->>'userId')::uuid
  on conflict(user_id) do update set role=excluded.role,branch_ids=excluded.branch_ids,active=excluded.active,session_version=public.staff.session_version+1,updated_at=now();
  v_result:=jsonb_build_object('role',p_payload->>'role');
 elsif p_action='update-settings' then
  update public.business_settings set data=data||(p_payload-'action') where id='business';v_result:='{}';
 elsif p_action='send-message' then
  insert into public.business_records(user_id,branch_id,kind,data) values((p_payload->>'userId')::uuid,v_branch,'messages',jsonb_build_object('subject',p_payload->>'subject','body',p_payload->>'body','direction','admin','read',false)) returning id into v_id;
  insert into public.customer_records(user_id,kind,data) values((p_payload->>'userId')::uuid,'notifications',jsonb_build_object('kind','message','title',p_payload->>'subject','body',p_payload->>'body','read',false));
  v_result:=jsonb_build_object('messageId',v_id);
 elsif p_action in ('update-order','update-quote') then
  v_id:=coalesce(p_payload->>'orderId',p_payload->>'quoteId');
  select * into strict v_record from public.business_records where id=v_id and kind=case when p_action='update-order' then 'orders' else 'quotes' end for update;
  if not private.can('sales.manage',v_record.branch_id) then raise exception 'Branch access denied' using errcode='42501'; end if;
  v_status:=p_payload->>'status';
  if v_status not in ('pending','confirmed','processing','ready_for_collection','out_for_delivery','delivered','completed','cancelled','refunded','approved','packed','shipped','requested','quoted','accepted','rejected') then raise exception 'Invalid status'; end if;
  update public.business_records set data=data||jsonb_build_object('status',v_status,'statusHistory',coalesce(data->'statusHistory','[]')||jsonb_build_object('status',v_status,'timestamp',now(),'note',coalesce(p_payload->>'note',''))),updated_at=now() where id=v_id;
  v_result:=jsonb_build_object('status',v_status);
 elsif p_action in ('create-invoice','save-invoice','duplicate-invoice','update-invoice','send-invoice','record-email','record-payment') then
  v_id:=nullif(p_payload->>'invoiceId','');
  if v_id is not null then
   select * into strict v_record from public.business_records where id=v_id and kind='invoices' for update;
   if not private.can(v_permission,v_record.branch_id) then raise exception 'Branch access denied' using errcode='42501'; end if;
  end if;
  if p_action in ('create-invoice','save-invoice','duplicate-invoice') then
   if p_action='duplicate-invoice' then v_data:=v_record.data-array['invoiceNumber','shareToken','payments','activity','revisions','emailHistory','viewedAt','sentAt','paidAt','deletedAt','orderId']; v_id:=null;
   else v_data:=(coalesce(v_record.data,'{}')||p_payload)-array['action','invoiceId','payments','amountPaid','balanceDue','shareToken'];end if;
   v_data:=v_data||private.calculate_invoice(v_data);
   if jsonb_array_length(coalesce(v_data->'items','[]'))=0 then raise exception 'Add invoice items'; end if;
   v_total:=round((v_data->>'total')::numeric*100);
   v_paid:=case when v_id is null then 0 else coalesce(round((v_record.data->>'amountPaid')::numeric*100),0) end;
   if v_total is null or v_total<0 or v_total<v_paid then raise exception 'Invoice total cannot be below payments received'; end if;
   v_data:=v_data||jsonb_build_object('amountPaid',v_paid/100.0,'balanceDue',(v_total-v_paid)/100.0,'status',case when v_paid>0 then case when v_paid=v_total then 'paid' else 'partially_paid' end else 'draft' end);
   if v_id is null then
    v_id:=gen_random_uuid()::text;
    v_data:=v_data||jsonb_build_object('invoiceNumber','INV-'||extract(year from now())::text||'-'||lpad(nextval('public.invoice_number_seq')::text,6,'0'),'shareToken',gen_random_uuid()::text,'payments','[]'::jsonb);
    insert into public.business_records(id,user_id,branch_id,kind,data) values(v_id,nullif(v_data->>'userId','')::uuid,v_branch,'invoices',v_data);
   else
    v_data:=v_data||jsonb_build_object('shareToken',v_record.data->>'shareToken','payments',coalesce(v_record.data->'payments','[]'));
    update public.business_records set data=v_data,user_id=nullif(v_data->>'userId','')::uuid,updated_at=now() where id=v_id;
   end if;
   v_result:=jsonb_build_object('invoiceId',v_id,'invoiceNumber',v_data->>'invoiceNumber');
  elsif p_action='record-payment' then
   if v_record.data->>'status' in ('draft','cancelled','deleted') then raise exception 'Issue this invoice before recording payment'; end if;
   v_amount:=round((p_payload->>'amount')::numeric*100);v_paid:=coalesce(round((v_record.data->>'amountPaid')::numeric*100),0);v_total:=round((v_record.data->>'total')::numeric*100);
   if v_amount is null or v_amount<=0 or v_amount+v_paid>v_total or (p_payload->>'amount')::numeric*100<>v_amount then raise exception 'Invalid payment or overpayment'; end if;
   insert into public.invoice_payments(invoice_id,actor_id,amount_cents,method,reference,note,paid_at) values(v_id,v_uid,v_amount,p_payload->>'method',coalesce(p_payload->>'reference',''),coalesce(p_payload->>'note',''),coalesce(nullif(p_payload->>'paidAt','')::date,current_date));
   v_data:=jsonb_build_object('id',gen_random_uuid(),'amount',v_amount/100.0,'method',p_payload->>'method','reference',coalesce(p_payload->>'reference',''),'note',coalesce(p_payload->>'note',''),'paidAt',coalesce(p_payload->>'paidAt',current_date::text),'createdAt',now());
   v_status:=case when v_paid+v_amount=v_total then 'paid' else 'partially_paid' end;
   update public.business_records set data=data||jsonb_build_object('payments',coalesce(data->'payments','[]')||v_data,'amountPaid',(v_paid+v_amount)/100.0,'balanceDue',(v_total-v_paid-v_amount)/100.0,'status',v_status),updated_at=now() where id=v_id;
   v_result:=jsonb_build_object('invoiceId',v_id,'status',v_status);
  elsif p_action='record-email' then
   update public.business_records set data=data||jsonb_build_object('emailHistory',coalesce(data->'emailHistory','[]')||p_payload->'email'),updated_at=now() where id=v_id; v_result:='{}';
  else
   v_status:=case when p_action='send-invoice' then 'sent' else p_payload->>'status' end;
   if v_status not in ('draft','sent','cancelled','deleted') then raise exception 'Invalid invoice status'; end if;
   if coalesce((v_record.data->>'amountPaid')::numeric,0)>0 and v_status in ('draft','cancelled','deleted') then raise exception 'Reconcile existing payments before changing this invoice'; end if;
   update public.business_records set data=data||jsonb_build_object('status',v_status)||case when v_status='deleted' then jsonb_build_object('deletedAt',now()) when v_status='sent' then jsonb_build_object('sentAt',now()) else '{}' end,updated_at=now() where id=v_id;
   v_result:=jsonb_build_object('invoiceId',v_id,'status',v_status);
  end if;
 else raise exception 'Unsupported operation'; end if;
 v_result:=coalesce(v_result,'{}')||'{"ok":true}'::jsonb;
 insert into public.audit_logs(actor_id,branch_id,action,target_id) values(v_uid,v_branch,p_action,coalesce(v_id,p_payload->>'userId',p_payload->>'shiftId'));
 insert into private.command_receipts(actor_id,request_key,action,payload,result) values(v_uid,p_key,p_action,p_payload,v_result);
 return v_result;
end $$;
create function public.admin_command(p_action text,p_payload jsonb,p_key text) returns jsonb language sql security invoker set search_path='' as $$select private.admin_command(p_action,p_payload,p_key)$$;
-- An unguessable share token exposes a deliberately limited invoice projection.
create function private.shared_invoice(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('invoice',(r.data-array['privateNotes','activity','revisions','emailHistory','documents','shareToken','payments'])||jsonb_build_object('id',r.id,'userId','','createdAt',r.created_at),
 'settings',(select s.data from public.business_settings s where id='business')) from public.business_records r where r.kind='invoices' and r.data->>'shareToken'=p_token and r.data->>'status' in ('sent','viewed','partially_paid','paid','overdue') limit 1;
$$;
create function public.shared_invoice(p_token text) returns jsonb language sql stable security invoker set search_path='' as $$select private.shared_invoice(p_token)$$;
revoke all on all functions in schema public from public,anon,authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.can(text,text) to authenticated;
grant execute on function public.save_profile(jsonb),private.save_profile(jsonb),public.customer_record_write(text,text,jsonb,boolean),private.customer_record_write(text,text,jsonb,boolean),public.add_cart_item(text,jsonb),private.add_cart_item(text,jsonb),public.customer_request(text,jsonb),private.customer_request(text,jsonb),public.customer_invoices(),private.customer_invoices(),public.admin_command(text,jsonb,text),private.admin_command(text,jsonb,text) to authenticated;
grant execute on function public.catalogue_products(),private.catalogue_products(),public.shared_invoice(text),private.shared_invoice(text) to anon,authenticated;
-- Files are private and scoped to the authenticated user's UUID.
insert into storage.buckets(id,name,public,file_size_limit) values('customer-uploads','customer-uploads',false,10485760) on conflict(id) do nothing;
create policy customer_files_read on storage.objects for select to authenticated using(bucket_id='customer-uploads' and ((storage.foldername(name))[1]=(select auth.uid())::text or private.can('customers.read')));
create policy customer_files_insert on storage.objects for insert to authenticated with check(bucket_id='customer-uploads' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy customer_files_update on storage.objects for update to authenticated using(bucket_id='customer-uploads' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='customer-uploads' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy customer_files_delete on storage.objects for delete to authenticated using(bucket_id='customer-uploads' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Realtime obeys SELECT policies. Replica identity never exposes private schema rows.
alter publication supabase_realtime add table public.profiles,public.customer_records,public.business_records,public.products,public.inventory,public.sales;
insert into private.role_permissions(role,permission) values
('owner','dashboard.read'),
('owner','pos.use'),
('owner','sales.read'),
('owner','sales.create'),
('owner','sales.manage'),
('owner','sales.cancel'),
('owner','sales.discount'),
('owner','returns.manage'),
('owner','payments.record'),
('owner','inventory.read'),
('owner','inventory.adjust'),
('owner','inventory.count'),
('owner','inventory.transfer'),
('owner','products.read'),
('owner','products.manage'),
('owner','products.cost.read'),
('owner','purchasing.read'),
('owner','purchasing.manage'),
('owner','customers.read'),
('owner','customers.manage'),
('owner','customers.credit.manage'),
('owner','documents.read'),
('owner','documents.manage'),
('owner','reports.read'),
('owner','reports.export'),
('owner','staff.read'),
('owner','staff.roles.manage'),
('owner','devices.read'),
('owner','devices.manage'),
('owner','cash_drawer.open'),
('owner','settings.manage'),
('owner','audit.read'),
('administrator','dashboard.read'),
('administrator','pos.use'),
('administrator','sales.read'),
('administrator','sales.create'),
('administrator','sales.manage'),
('administrator','sales.cancel'),
('administrator','sales.discount'),
('administrator','returns.manage'),
('administrator','payments.record'),
('administrator','inventory.read'),
('administrator','inventory.adjust'),
('administrator','inventory.count'),
('administrator','inventory.transfer'),
('administrator','products.read'),
('administrator','products.manage'),
('administrator','products.cost.read'),
('administrator','purchasing.read'),
('administrator','purchasing.manage'),
('administrator','customers.read'),
('administrator','customers.manage'),
('administrator','customers.credit.manage'),
('administrator','documents.read'),
('administrator','documents.manage'),
('administrator','reports.read'),
('administrator','reports.export'),
('administrator','staff.read'),
('administrator','staff.roles.manage'),
('administrator','devices.read'),
('administrator','devices.manage'),
('administrator','cash_drawer.open'),
('administrator','settings.manage'),
('administrator','audit.read'),
('manager','dashboard.read'),
('manager','pos.use'),
('manager','sales.read'),
('manager','sales.create'),
('manager','sales.manage'),
('manager','sales.cancel'),
('manager','sales.discount'),
('manager','returns.manage'),
('manager','payments.record'),
('manager','inventory.read'),
('manager','inventory.adjust'),
('manager','inventory.count'),
('manager','inventory.transfer'),
('manager','products.read'),
('manager','products.manage'),
('manager','products.cost.read'),
('manager','purchasing.read'),
('manager','purchasing.manage'),
('manager','customers.read'),
('manager','customers.manage'),
('manager','documents.read'),
('manager','documents.manage'),
('manager','reports.read'),
('manager','reports.export'),
('manager','staff.read'),
('manager','devices.read'),
('manager','cash_drawer.open'),
('manager','audit.read'),
('cashier','dashboard.read'),
('cashier','pos.use'),
('cashier','sales.read'),
('cashier','sales.create'),
('cashier','sales.manage'),
('cashier','payments.record'),
('cashier','inventory.read'),
('cashier','products.read'),
('cashier','customers.read'),
('cashier','customers.manage'),
('cashier','documents.read'),
('salesperson','dashboard.read'),
('salesperson','pos.use'),
('salesperson','sales.read'),
('salesperson','sales.create'),
('salesperson','sales.discount'),
('salesperson','payments.record'),
('salesperson','inventory.read'),
('salesperson','products.read'),
('salesperson','customers.read'),
('salesperson','customers.manage'),
('salesperson','documents.read'),
('salesperson','documents.manage'),
('salesperson','reports.read'),
('stock_controller','dashboard.read'),
('stock_controller','inventory.read'),
('stock_controller','inventory.adjust'),
('stock_controller','inventory.count'),
('stock_controller','inventory.transfer'),
('stock_controller','products.read'),
('stock_controller','products.manage'),
('stock_controller','products.cost.read'),
('stock_controller','purchasing.read'),
('stock_controller','purchasing.manage'),
('stock_controller','reports.read'),
('stock_controller','reports.export'),
('stock_controller','devices.read'),
('stock_controller','audit.read'),
('accountant','dashboard.read'),
('accountant','sales.read'),
('accountant','returns.manage'),
('accountant','payments.record'),
('accountant','inventory.read'),
('accountant','products.read'),
('accountant','products.cost.read'),
('accountant','purchasing.read'),
('accountant','customers.read'),
('accountant','customers.credit.manage'),
('accountant','documents.read'),
('accountant','documents.manage'),
('accountant','reports.read'),
('accountant','reports.export'),
('accountant','audit.read');
create function public.dashboard_summary(p_branch text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'products',(select count(*) from public.products),
 'customers',(select count(*) from public.profiles),
 'orders',(select count(*) from public.business_records where kind='orders' and branch_id=p_branch),
 'quotes',(select count(*) from public.business_records where kind='quotes' and branch_id=p_branch),
 'invoices',(select count(*) from public.business_records where kind='invoices' and branch_id=p_branch),
 'cartItems',(select coalesce(sum((data->>'quantity')::numeric),0) from public.customer_records where kind='cart'),
 'lowStock',(select count(*) from public.inventory where branch_id=p_branch and on_hand-reserved-damaged-quarantined>0 and on_hand-reserved-damaged-quarantined<=minimum_stock),
 'outOfStock',(select count(*) from public.inventory where branch_id=p_branch and on_hand-reserved-damaged-quarantined=0),
 'awaitingOrders',(select count(*) from public.business_records where kind='orders' and branch_id=p_branch and data->>'status' in ('pending','confirmed','processing')),
 'todaySales',case when private.can('reports.read',p_branch) then (select coalesce(sum(total_cents),0)/100.0 from public.sales where branch_id=p_branch and created_at>=((now() at time zone 'Africa/Johannesburg')::date::timestamp at time zone 'Africa/Johannesburg')) else null end,
 'todayTransactions',case when private.can('reports.read',p_branch) then (select count(*) from public.sales where branch_id=p_branch and created_at>=((now() at time zone 'Africa/Johannesburg')::date::timestamp at time zone 'Africa/Johannesburg')) else null end,
 'paidRevenue',case when private.can('reports.read',p_branch) then (select coalesce(sum(total_cents),0)/100.0 from public.sales where branch_id=p_branch) else null end,
 'outstanding',case when private.can('documents.read',p_branch) then (select coalesce(sum((data->>'balanceDue')::numeric),0) from public.business_records where kind='invoices' and branch_id=p_branch and data->>'status' not in ('draft','cancelled','deleted')) else null end,
 'unpaidInvoices',case when private.can('documents.read',p_branch) then (select count(*) from public.business_records where kind='invoices' and branch_id=p_branch and (data->>'balanceDue')::numeric>0 and data->>'status' not in ('draft','cancelled','deleted')) else null end
 ) where private.can('dashboard.read',p_branch);
$$;
create function public.branch_reports(p_branch text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('monthly',coalesce((select jsonb_agg(to_jsonb(m) order by m.month) from (
 select to_char(created_at at time zone 'Africa/Johannesburg','YYYY-MM') as "month", sum(total_cents)/100.0 sales,sum(vat_cents)/100.0 vat,count(*) transactions,
 coalesce(sum(total_cents) filter(where payment_method='cash'),0)/100.0 cash,coalesce(sum(total_cents) filter(where payment_method='card'),0)/100.0 card,
 coalesce(sum(total_cents) filter(where payment_method='eft'),0)/100.0 eft from public.sales where branch_id=p_branch and created_at>=now()-interval '12 months' group by 1
 ) m),'[]'),'summary',public.dashboard_summary(p_branch)) where private.can('reports.read',p_branch);
$$;
create function private.complete_onboarding(p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare v_profile public.profiles%rowtype; v_item jsonb; v_index bigint;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into strict v_profile from public.profiles where id=auth.uid() for update;
 if v_profile.data->>'onboardingComplete'='true' then return;end if;
 perform private.save_profile((p_data-array['vehicles','colours'])||jsonb_build_object('displayName',trim(concat(p_data->>'firstName',' ',p_data->>'surname')),'onboardingComplete',true));
 perform private.customer_record_write('onboarding','status',jsonb_build_object('completed',true,'currentStep','complete','completedAt',now(),'draftData',p_data),false);
 for v_item,v_index in select value,ordinality from jsonb_array_elements(coalesce(p_data->'vehicles','[]')) with ordinality loop
  perform private.customer_record_write('vehicles','onboarding-'||v_index::text,v_item,false);
 end loop;
 for v_item,v_index in select value,ordinality from jsonb_array_elements(coalesce(p_data->'colours','[]')) with ordinality loop
  perform private.customer_record_write('savedColours','onboarding-'||v_index::text,v_item,false);
 end loop;
end $$;
create function public.complete_onboarding(p_data jsonb) returns void language sql security invoker set search_path='' as $$select private.complete_onboarding(p_data)$$;
revoke all on function public.dashboard_summary(text),public.branch_reports(text),public.complete_onboarding(jsonb),private.complete_onboarding(jsonb) from public,anon;
grant execute on function public.dashboard_summary(text),public.branch_reports(text),public.complete_onboarding(jsonb),private.complete_onboarding(jsonb) to authenticated;
-- The migration archive is deliberately inaccessible to application identities.
create table public.legacy_documents(source_project text not null,path text not null,data jsonb not null,imported_at timestamptz not null default now(),primary key(source_project,path));
alter table public.legacy_documents enable row level security;
revoke all on public.legacy_documents from public,anon,authenticated;
alter table public.stock_movements alter column actor_id drop not null;
alter table public.stock_movements add column legacy_actor_id text;
alter table public.audit_logs add column legacy_actor_id text;
create function private.finalize_migration() returns void language plpgsql security definer set search_path='' as $$
begin
 perform setval('public.customer_number_seq',greatest(1,coalesce((select max(substring(customer_number from '^TC([0-9]+)$')::bigint)+1 from public.profiles where customer_number~'^TC[0-9]+$'),1)),false);
 perform setval('public.invoice_number_seq',greatest(1,coalesce((select max(substring(data->>'invoiceNumber' from '([0-9]+)$')::bigint)+1 from public.business_records where kind='invoices' and data->>'invoiceNumber'~'[0-9]+$'),1)),false);
end $$;
create function public.finalize_migration() returns void language sql security invoker set search_path='' as $$select private.finalize_migration()$$;
revoke all on function public.finalize_migration(),private.finalize_migration() from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function public.finalize_migration(),private.finalize_migration() to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
create function public.shift_summary(p_shift uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('salesCents',coalesce(sum(total_cents),0),'cashCents',coalesce(sum(total_cents) filter(where payment_method='cash'),0),'transactions',count(*)) from public.sales where shift_id=p_shift;
$$;
revoke all on function public.shift_summary(uuid) from public,anon;
grant execute on function public.shift_summary(uuid) to authenticated;
-- Recalculate invoices in integer cents even when RPC callers bypass the UI.
create function private.calculate_invoice(p_data jsonb) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare
 v_item jsonb;v_rows jsonb:='[]';v_result jsonb:='[]';v_qty numeric;v_unit bigint;v_base bigint;v_discount bigint;v_net bigint;v_tax bigint;
 v_sum bigint:=0;v_line_discount bigint:=0;v_net_sum bigint:=0;v_global_discount bigint;v_remaining bigint;v_allocated bigint;v_vat bigint:=0;
 v_extra bigint;v_delivery bigint;v_index integer:=0;v_length integer;v_rate numeric;v_value numeric;
begin
 if jsonb_typeof(p_data->'items')<>'array' or jsonb_array_length(p_data->'items') not between 1 and 200 then raise exception 'Add valid invoice items';end if;
 for v_item in select value from jsonb_array_elements(p_data->'items') loop
  v_qty:=(v_item->>'quantity')::numeric;v_value:=(v_item->>'unitPrice')::numeric;
  if v_qty is null or v_qty<=0 or v_qty>1000000000 or v_qty<>round(v_qty,3) or v_value is null or v_value<0 or v_value>1000000000 or v_value<>round(v_value,2) then raise exception 'Invalid invoice quantity or price';end if;
  if length(trim(coalesce(v_item->>'name',v_item->>'description','')))=0 then raise exception 'Invoice item name required';end if;
  v_rate:=coalesce((v_item->>'taxRate')::numeric,(p_data->>'vatRate')::numeric,15);
  if v_rate<0 or v_rate>100 then raise exception 'Invalid invoice tax rate';end if;
  v_unit:=round(v_value*100);v_base:=round(v_unit*v_qty);v_value:=coalesce((v_item->>'discountValue')::numeric,0);
  if v_value<0 or v_value>1000000000 then raise exception 'Invalid line discount';end if;
  v_discount:=least(v_base,case v_item->>'discountType' when 'fixed' then round(v_value*100) when 'percent' then round(v_base*v_value/100) else 0 end);
  v_net:=v_base-v_discount;v_sum:=v_sum+v_base;v_line_discount:=v_line_discount+v_discount;v_net_sum:=v_net_sum+v_net;
  v_rows:=v_rows||jsonb_build_object('raw',v_item,'base',v_base,'lineDiscount',v_discount,'net',v_net,'taxRate',v_rate);
 end loop;
 v_value:=coalesce((p_data->>'discountValue')::numeric,0);
 if v_value<0 or v_value>1000000000 then raise exception 'Invalid invoice discount';end if;
 v_global_discount:=least(v_net_sum,case p_data->>'discountType' when 'fixed' then round(v_value*100) when 'percent' then round(v_net_sum*v_value/100) else 0 end);
 v_remaining:=v_global_discount;v_length:=jsonb_array_length(v_rows);
 for v_item in select value from jsonb_array_elements(v_rows) loop
  v_index:=v_index+1;v_net:=(v_item->>'net')::bigint;v_rate:=(v_item->>'taxRate')::numeric;
  v_allocated:=case when v_index=v_length then v_remaining when v_net_sum>0 then least(v_remaining,round(v_global_discount*v_net::numeric/v_net_sum)) else 0 end;
  v_remaining:=v_remaining-v_allocated;v_net:=v_net-v_allocated;v_tax:=round(v_net*v_rate/100);v_vat:=v_vat+v_tax;
  v_result:=v_result||((v_item->'raw')||jsonb_build_object('taxRate',v_rate,'baseAmount',(v_item->>'base')::numeric/100,'discountAmount',(v_item->>'lineDiscount')::numeric/100,'taxableAmount',v_net/100.0,'taxAmount',v_tax/100.0,'lineTotal',(v_net+v_tax)/100.0));
 end loop;
 v_extra:=round(coalesce((p_data->>'extraCharges')::numeric,0)*100);v_delivery:=round(coalesce((p_data->>'deliveryFee')::numeric,0)*100);
 if v_extra<0 or v_delivery<0 then raise exception 'Charges cannot be negative';end if;
 return jsonb_build_object('items',v_result,'subtotal',v_sum/100.0,'lineDiscountTotal',v_line_discount/100.0,'discountAmount',v_global_discount/100.0,'vatAmount',v_vat/100.0,'extraCharges',v_extra/100.0,'deliveryFee',v_delivery/100.0,'total',(v_sum-v_line_discount-v_global_discount+v_vat+v_extra+v_delivery)/100.0);
end $$;
revoke all on function private.calculate_invoice(jsonb) from public,anon,authenticated;
create table public.inventory_reservations (
 id uuid primary key default gen_random_uuid(),branch_id text not null references public.branches(id),product_id text not null references public.products(id),
 quantity numeric(15,3) not null check(quantity>0),source_type text not null,source_id text not null,status text not null default 'active' check(status in ('active','released','expired')),
 expires_at timestamptz not null,created_at timestamptz not null default now(),released_at timestamptz
);
create unique index reservations_active_source_idx on public.inventory_reservations(branch_id,product_id,source_type,source_id) where status='active';
create index reservations_product_idx on public.inventory_reservations(product_id);
alter table public.inventory_reservations enable row level security;
revoke all on public.inventory_reservations from public,anon,authenticated;
grant select on public.inventory_reservations to authenticated;
grant all on public.inventory_reservations to service_role;
create policy reservations_read on public.inventory_reservations for select to authenticated using(private.can('inventory.read',branch_id));
create index inventory_product_idx on public.inventory(product_id);
create index movements_product_idx on public.stock_movements(product_id);
create index movements_actor_idx on public.stock_movements(actor_id);
create index audit_actor_idx on public.audit_logs(actor_id);
create index shifts_cashier_idx on public.cashier_shifts(cashier_id);
create index sales_cashier_idx on public.sales(cashier_id);
create index sale_items_product_idx on public.sale_items(product_id);
create index invoice_payments_actor_idx on public.invoice_payments(actor_id);
create function public.staff_identity() returns jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(s) from public.staff s where s.user_id=(select auth.uid()) and s.active and private.can('dashboard.read');
$$;
revoke all on function public.staff_identity() from public,anon;
grant execute on function public.staff_identity() to authenticated;
