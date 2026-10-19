-- Correct an incorrectly posted slip without destroying the original audit trail.
alter table public.inventory_documents drop constraint inventory_documents_status_check;
alter table public.inventory_documents add constraint inventory_documents_status_check check(status in ('draft','posted','verified','archived','void'));
alter table public.inventory_documents add column voided_at timestamptz;
alter table public.inventory_documents add column voided_by uuid references auth.users(id);
alter table public.inventory_documents add column void_reason text;
create index document_void_actor_idx on public.inventory_documents(voided_by);

alter table public.inventory_product_aliases add column active boolean not null default true;
create function private.activate_inventory_alias() returns trigger language plpgsql set search_path='' as $$
begin new.active:=true;return new;end $$;
create trigger inventory_alias_reconfirmed before insert or update of product_id,confirmed_by on public.inventory_product_aliases for each row execute function private.activate_inventory_alias();
revoke all on function private.activate_inventory_alias() from public,anon,authenticated;

alter function private.inventory_document_command(text,jsonb,text) rename to inventory_document_command_before_corrections;
create function private.inventory_document_command(p_action text,p_payload jsonb,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_doc public.inventory_documents%rowtype;v_old private.command_receipts%rowtype;v_id uuid;
 v_paid bigint;v_reason text;v_line record;v_alias record;v_previous record;v_stock public.inventory%rowtype;v_delta numeric;v_result jsonb;
begin
 if p_action is distinct from 'void' then return private.inventory_document_command_before_corrections(p_action,p_payload,p_key);end if;
 if v_uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_key is null or length(p_key) not between 8 and 200 then raise exception 'Invalid document command';end if;
 v_id:=(p_payload->>'id')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('inventory-document:'||v_id::text,0));
 select * into strict v_doc from public.inventory_documents where id=v_id for update;
 if not(case when v_doc.kind='purchase' then private.can('purchasing.manage',v_doc.branch_id) else private.can('sales.manage',v_doc.branch_id) and private.can('inventory.adjust',v_doc.branch_id) end) then raise exception 'A manager must cancel this document' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text||':'||p_key,0));
 select * into v_old from private.command_receipts where actor_id=v_uid and request_key=p_key;
 if found then
  if v_old.action<>'document-void' or v_old.payload<>p_payload then raise exception 'Request key already used with different input' using errcode='23505';end if;
  return v_old.result||'{"replayed":true}'::jsonb;
 end if;
 if v_doc.status='void' then return jsonb_build_object('id',v_id,'status','void','version',v_doc.version,'replayed',true);end if;
 if v_doc.status not in ('posted','verified') then raise exception 'Discard an unposted draft instead';end if;
 v_reason:=trim(p_payload->>'reason');
 if length(coalesce(v_reason,'')) not between 3 and 500 or (p_payload->>'confirmed')::boolean is distinct from true then raise exception 'Confirm the cancellation and enter a reason';end if;
 select coalesce(sum(amount_cents),0) into v_paid from public.inventory_document_payments where document_id=v_id;
 if (p_payload->>'expectedVersion')::bigint is distinct from v_doc.version or (p_payload->>'expectedPaidCents')::numeric is distinct from v_paid::numeric then raise exception 'This record or its payments changed. Reload before cancelling' using errcode='40001';end if;
 if v_paid>0 and not private.can('payments.record',v_doc.branch_id) then raise exception 'A payment manager must cancel this paid record' using errcode='42501';end if;
 if v_doc.stock_effect='apply' then
  if not private.can('inventory.adjust',v_doc.branch_id) then raise exception 'Stock adjustment permission required' using errcode='42501';end if;
  perform 1 from public.products where id in(select product_id from public.inventory_document_items where document_id=v_id) order by id for share;
  for v_line in select product_id,sum(quantity) quantity from public.inventory_document_items where document_id=v_id group by product_id order by product_id loop
   select * into strict v_stock from public.inventory where branch_id=v_doc.branch_id and product_id=v_line.product_id for update;
   v_delta:=case when v_doc.kind='purchase' then -v_line.quantity else v_line.quantity end;
   if v_stock.on_hand+v_delta-v_stock.reserved-v_stock.damaged-v_stock.quarantined<0 then raise exception 'Cannot cancel: some received stock is sold, reserved or held. Reconcile the stock before cancelling';end if;
   update public.inventory set on_hand=on_hand+v_delta,version=version+1,updated_at=now() where branch_id=v_doc.branch_id and product_id=v_line.product_id;
   -- Correct the original business period, retaining today's creation time and actor.
   insert into public.stock_movements(branch_id,product_id,actor_id,previous_quantity,new_quantity,reason,note,occurred_on,source_document_id) values(v_doc.branch_id,v_line.product_id,v_uid,v_stock.on_hand,v_stock.on_hand+v_delta,'Slip correction',v_doc.reference||': '||v_reason,v_doc.document_date,v_id);
  end loop;
 end if;
 update public.inventory_documents set status='void',voided_at=now(),voided_by=v_uid,void_reason=v_reason,version=version+1,updated_at=now() where id=v_id returning * into v_doc;
 -- Revoke learned matches from a mistaken record; recover the last valid confirmation.
 for v_alias in select distinct lower(trim(description)) description from public.inventory_document_items where document_id=v_id loop
  select i.product_id,d.created_by into v_previous from public.inventory_document_items i join public.inventory_documents d on d.id=i.document_id where d.branch_id=v_doc.branch_id and lower(d.counterparty)=lower(v_doc.counterparty) and lower(trim(i.description))=v_alias.description and d.status in ('posted','verified') order by d.posted_at desc,d.id desc limit 1;
  if found then
   update public.inventory_product_aliases set product_id=v_previous.product_id,confirmed_by=v_previous.created_by,updated_at=now() where branch_id=v_doc.branch_id and counterparty=lower(v_doc.counterparty) and description=v_alias.description;
  else
   update public.inventory_product_aliases set active=false,updated_at=now() where branch_id=v_doc.branch_id and counterparty=lower(v_doc.counterparty) and description=v_alias.description;
  end if;
 end loop;
 v_result:=jsonb_build_object('id',v_id,'status','void','version',v_doc.version,'stockReversed',v_doc.stock_effect='apply','excludedPaymentsCents',v_paid);
 insert into public.audit_logs(actor_id,branch_id,action,target_id,details) values(v_uid,v_doc.branch_id,'slip-void',v_id::text,jsonb_build_object('reference',v_doc.reference,'reason',v_reason,'excludedPaymentsCents',v_paid)::text);
 insert into private.command_receipts(actor_id,request_key,action,payload,result) values(v_uid,p_key,'document-void',p_payload,v_result);
 return v_result;
end $$;
revoke all on function private.inventory_document_command(text,jsonb,text) from public,anon;
grant execute on function private.inventory_document_command(text,jsonb,text) to authenticated;

-- Reorder velocity ignores both sides of a cancelled slip. Its original and
-- correcting movements remain visible in the quantity ledger and sum to zero.
create or replace function public.inventory_month(p_branch text,p_month date) returns jsonb language plpgsql stable security invoker set search_path='' as $$
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
 from public.stock_movements where branch_id=p_branch and occurred_on>=p_month group by product_id),
 slip_units as(select i.product_id,sum(i.quantity) qty from public.inventory_document_items i join public.inventory_documents d on d.id=i.document_id where d.branch_id=p_branch and d.kind='physical_sale' and d.status='posted' and d.document_date>=p_month and d.document_date<v_end group by i.product_id),
 velocity as(select m.product_id,-sum(m.new_quantity-m.previous_quantity) qty from public.stock_movements m left join public.inventory_documents d on d.id=m.source_document_id where m.branch_id=p_branch and m.reason in ('POS sale','Physical slip sale') and m.occurred_on>=(now() at time zone 'Africa/Johannesburg')::date-30 and (m.source_document_id is null or d.status='posted') group by m.product_id)
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
notify pgrst,'reload schema';
