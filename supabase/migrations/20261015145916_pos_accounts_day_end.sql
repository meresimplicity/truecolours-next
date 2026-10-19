-- Till returns and cash movements are append-only and share the checkout lock.
create sequence public.return_number_seq;
alter table public.cashier_shifts add column accounting_snapshot jsonb;
create table public.sale_returns (
 id uuid primary key default gen_random_uuid(),
 return_number text not null unique default ('TC-R-'||lpad(nextval('public.return_number_seq')::text,8,'0')),
 sale_id uuid not null references public.sales(id), branch_id text not null references public.branches(id),
 shift_id uuid not null references public.cashier_shifts(id), actor_id uuid not null references auth.users(id),
 total_cents bigint not null check(total_cents>0), vat_cents bigint not null check(vat_cents>=0),
 payment_method text not null check(payment_method in ('cash','card','eft')),
 reference text not null default '', reason text not null check(length(trim(reason)) between 3 and 500), created_at timestamptz not null default now()
);
create table public.sale_return_items (
 id uuid primary key default gen_random_uuid(), return_id uuid not null references public.sale_returns(id),
 sale_item_id uuid not null references public.sale_items(id), quantity numeric(15,3) not null check(quantity>0),
 total_cents bigint not null check(total_cents>=0), vat_cents bigint not null check(vat_cents>=0),
 disposition text not null check(disposition in ('sellable','quarantine'))
);
create table public.till_cash_movements (
 id uuid primary key default gen_random_uuid(), branch_id text not null references public.branches(id),
 shift_id uuid not null references public.cashier_shifts(id), actor_id uuid not null references auth.users(id),
 direction text not null check(direction in ('in','out')), amount_cents bigint not null check(amount_cents>0),
 category text not null check(category in ('float','expense','banking','other')),
 reason text not null check(length(trim(reason)) between 3 and 500), created_at timestamptz not null default now()
);
create index sale_returns_sale_idx on public.sale_returns(sale_id);
create index sale_returns_shift_idx on public.sale_returns(shift_id);
create index sale_returns_actor_idx on public.sale_returns(actor_id);
create index sale_returns_branch_date_idx on public.sale_returns(branch_id,created_at,id);
create index return_items_return_idx on public.sale_return_items(return_id);
create index return_items_sale_item_idx on public.sale_return_items(sale_item_id);
create index till_movements_shift_idx on public.till_cash_movements(shift_id);
create index till_movements_actor_idx on public.till_cash_movements(actor_id);
create index till_movements_branch_date_idx on public.till_cash_movements(branch_id,created_at,id);
create unique index sales_external_reference_unique on public.sales(branch_id,payment_method,lower(trim(payment_reference))) where payment_method in ('card','eft') and trim(payment_reference)<>'';
alter table public.sale_returns enable row level security;
alter table public.sale_return_items enable row level security;
alter table public.till_cash_movements enable row level security;
revoke all on public.sale_returns,public.sale_return_items,public.till_cash_movements from public,anon,authenticated;
grant select on public.sale_returns,public.sale_return_items,public.till_cash_movements to authenticated;
grant all on public.sale_returns,public.sale_return_items,public.till_cash_movements to service_role;
grant all on sequence public.return_number_seq to service_role;
create policy returns_read on public.sale_returns for select to authenticated using(private.can('sales.read',branch_id) or private.can('reports.read',branch_id));
create policy return_items_read on public.sale_return_items for select to authenticated using(exists(select 1 from public.sale_returns r where r.id=return_id));
create policy till_movements_read on public.till_cash_movements for select to authenticated using(private.can('reports.read',branch_id) or (private.can('pos.use',branch_id) and actor_id=(select auth.uid())));

create function private.pos_shift_totals(p_shift uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 with s as (select * from public.cashier_shifts where id=p_shift),
 sales as (select coalesce(sum(total_cents),0) total,coalesce(sum(vat_cents),0) vat,count(*) count,
 coalesce(sum(total_cents) filter(where payment_method='cash'),0) cash,coalesce(sum(total_cents) filter(where payment_method='card'),0) card,coalesce(sum(total_cents) filter(where payment_method='eft'),0) eft from public.sales where shift_id=p_shift),
 returns as (select coalesce(sum(total_cents),0) total,coalesce(sum(vat_cents),0) vat,count(*) count,
 coalesce(sum(total_cents) filter(where payment_method='cash'),0) cash,coalesce(sum(total_cents) filter(where payment_method='card'),0) card,coalesce(sum(total_cents) filter(where payment_method='eft'),0) eft from public.sale_returns where shift_id=p_shift),
 cash as (select coalesce(sum(amount_cents) filter(where direction='in'),0) paid_in,coalesce(sum(amount_cents) filter(where direction='out'),0) paid_out from public.till_cash_movements where shift_id=p_shift)
 select jsonb_build_object('salesCents',sales.total,'vatCents',sales.vat,'transactions',sales.count,'refundsCents',returns.total,'refundVatCents',returns.vat,'refundCount',returns.count,
 'netSalesCents',sales.total-returns.total,'netVatCents',sales.vat-returns.vat,'netExVatCents',sales.total-returns.total-sales.vat+returns.vat,
 'cashSalesCents',sales.cash,'cashRefundsCents',returns.cash,'cashCents',sales.cash-returns.cash,'cardCents',sales.card-returns.card,'eftCents',sales.eft-returns.eft,
 'cashInCents',cash.paid_in,'cashOutCents',cash.paid_out,'openingFloatCents',s.opening_float_cents,
 'expectedCashCents',s.opening_float_cents+sales.cash-returns.cash+cash.paid_in-cash.paid_out)
 from s cross join sales cross join returns cross join cash;
$$;
revoke all on function private.pos_shift_totals(uuid) from public,anon;
grant execute on function private.pos_shift_totals(uuid) to authenticated;
create or replace function public.shift_summary(p_shift uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(s.accounting_snapshot,private.pos_shift_totals(s.id)) from public.cashier_shifts s where s.id=p_shift and
 (private.can('reports.read',s.branch_id) or (private.can('pos.use',s.branch_id) and s.cashier_id=(select auth.uid())));
$$;

alter function private.admin_command(text,jsonb,text) rename to admin_command_retail_base;
revoke all on function private.admin_command_retail_base(text,jsonb,text) from public,anon,authenticated;
create function private.admin_command(p_action text,p_payload jsonb,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid();v_branch text;v_old private.command_receipts%rowtype;v_shift public.cashier_shifts%rowtype;
 v_sale public.sales%rowtype;v_item public.sale_items%rowtype;v_return public.sale_returns%rowtype;v_stock public.inventory%rowtype;
 v_line jsonb;v_lines jsonb:='[]';v_result jsonb;v_totals jsonb;v_qty numeric;v_returned numeric;v_prev_total bigint;v_prev_vat bigint;
 v_amount bigint;v_vat bigint;v_total bigint:=0;v_total_vat bigint:=0;v_expected bigint;
begin
 if p_action not in ('refund-sale','cash-movement','close-shift') then
  v_result:=private.admin_command_retail_base(p_action,p_payload,p_key);
  if p_action='checkout' and p_payload ? 'expectedTotalCents' and (p_payload->>'expectedTotalCents')::bigint<>(v_result->'sale'->>'total_cents')::bigint then raise exception 'Prices changed. Refresh the cart and confirm the new total before checkout' using errcode='40001';end if;
  return v_result;
 end if;
 select coalesce(nullif(p_payload->>'locationId',''),branch_ids[1]) into v_branch from public.staff where user_id=v_uid and active;
 if not private.can('pos.use',v_branch) or (p_action='refund-sale' and not private.can('returns.manage',v_branch)) then raise exception 'Permission denied' using errcode='42501';end if;
 if p_key is null or length(p_key) not between 8 and 200 or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid command';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text||':'||p_key,0));
 select * into v_old from private.command_receipts where actor_id=v_uid and request_key=p_key;
 if found then
  if v_old.action<>p_action or v_old.payload<>p_payload then raise exception 'Request key already used with different input' using errcode='23505';end if;
  return v_old.result||'{"replayed":true}'::jsonb;
 end if;
 select * into strict v_shift from public.cashier_shifts where id=(p_payload->>'shiftId')::uuid and branch_id=v_branch and cashier_id=v_uid for update;
 if v_shift.closed_at is not null then raise exception 'Open a shift before changing the till';end if;
 if p_action='cash-movement' then
  v_amount:=(p_payload->>'amountCents')::numeric;
  if v_amount is null or v_amount<=0 or v_amount>100000000000 or (p_payload->>'amountCents')::numeric<>v_amount or coalesce(p_payload->>'direction','') not in ('in','out') or coalesce(p_payload->>'category','') not in ('float','expense','banking','other') or length(trim(coalesce(p_payload->>'reason',''))) not between 3 and 500 then raise exception 'Enter a valid cash amount, category and reason';end if;
  v_totals:=private.pos_shift_totals(v_shift.id);
  if p_payload->>'direction'='out' and v_amount>(v_totals->>'expectedCashCents')::bigint then raise exception 'Cash paid out exceeds expected till cash';end if;
  insert into public.till_cash_movements(branch_id,shift_id,actor_id,direction,amount_cents,category,reason) values(v_branch,v_shift.id,v_uid,p_payload->>'direction',v_amount,p_payload->>'category',trim(p_payload->>'reason')) returning jsonb_build_object('movement',to_jsonb(till_cash_movements.*)) into v_result;
 elsif p_action='refund-sale' then
  select * into strict v_sale from public.sales where id=(p_payload->>'saleId')::uuid and branch_id=v_branch for update;
  if coalesce(p_payload->>'paymentMethod','')<>v_sale.payment_method then raise exception 'Refund to the original payment method';end if;
  if v_sale.payment_method<>'cash' and length(trim(coalesce(p_payload->>'reference','')))=0 then raise exception 'Enter the external refund reference';end if;
  if length(trim(coalesce(p_payload->>'reason',''))) not between 3 and 500 then raise exception 'Enter a return reason';end if;
  if jsonb_typeof(p_payload->'items') is distinct from 'array' then raise exception 'Choose the returned items';end if;
  if jsonb_array_length(p_payload->'items') not between 1 and 200 then raise exception 'Choose between 1 and 200 returned items';end if;
  if exists(select 1 from jsonb_array_elements(p_payload->'items') x group by x->>'saleItemId' having count(*)>1) then raise exception 'Duplicate return item';end if;
  for v_line in select x from jsonb_array_elements(p_payload->'items') x order by x->>'saleItemId' loop
   select * into strict v_item from public.sale_items where id=(v_line->>'saleItemId')::uuid and sale_id=v_sale.id for update;
   v_qty:=(v_line->>'quantity')::numeric;
   if v_qty is null or v_qty<=0 or v_qty<>round(v_qty,3) or coalesce(v_line->>'disposition','') not in ('sellable','quarantine') then raise exception 'Invalid return quantity or condition';end if;
   select coalesce(sum(quantity),0),coalesce(sum(total_cents),0),coalesce(sum(vat_cents),0) into v_returned,v_prev_total,v_prev_vat from public.sale_return_items where sale_item_id=v_item.id;
   if v_returned+v_qty>v_item.quantity then raise exception 'Return exceeds the quantity sold';end if;
   -- Cumulative allocation ensures repeated fractional returns add to the exact original cents and VAT.
   v_amount:=round(v_item.total_cents*(v_returned+v_qty)/v_item.quantity)-v_prev_total;
   v_vat:=round(v_item.vat_cents*(v_returned+v_qty)/v_item.quantity)-v_prev_vat;
   v_total:=v_total+v_amount;v_total_vat:=v_total_vat+v_vat;
   v_lines:=v_lines||jsonb_build_object('saleItemId',v_item.id,'productId',v_item.product_id,'quantity',v_qty,'totalCents',v_amount,'vatCents',v_vat,'disposition',v_line->>'disposition');
  end loop;
  if v_total<=0 then raise exception 'Refund must be at least one cent';end if;
  if v_sale.payment_method='cash' and v_total>(private.pos_shift_totals(v_shift.id)->>'expectedCashCents')::bigint then raise exception 'Not enough till cash for this refund. Record a cash float first';end if;
  insert into public.sale_returns(sale_id,branch_id,shift_id,actor_id,total_cents,vat_cents,payment_method,reference,reason) values(v_sale.id,v_branch,v_shift.id,v_uid,v_total,v_total_vat,v_sale.payment_method,coalesce(p_payload->>'reference',''),trim(p_payload->>'reason')) returning * into v_return;
  for v_line in select x from jsonb_array_elements(v_lines) x order by x->>'productId' loop
   v_qty:=(v_line->>'quantity')::numeric;
   select * into strict v_stock from public.inventory where branch_id=v_branch and product_id=v_line->>'productId' for update;
   update public.inventory set on_hand=on_hand+v_qty,quarantined=quarantined+case when v_line->>'disposition'='quarantine' then v_qty else 0 end,returned=returned+v_qty,version=version+1,updated_at=now() where branch_id=v_branch and product_id=v_line->>'productId';
   insert into public.sale_return_items(return_id,sale_item_id,quantity,total_cents,vat_cents,disposition) values(v_return.id,(v_line->>'saleItemId')::uuid,v_qty,(v_line->>'totalCents')::bigint,(v_line->>'vatCents')::bigint,v_line->>'disposition');
   insert into public.stock_movements(branch_id,product_id,actor_id,previous_quantity,new_quantity,reason,note) values(v_branch,v_line->>'productId',v_uid,v_stock.on_hand,v_stock.on_hand+v_qty,'POS return',v_return.return_number||' / '||(v_line->>'disposition'));
  end loop;
  v_result:=jsonb_build_object('return',to_jsonb(v_return),'items',v_lines);
 else
  v_amount:=(p_payload->>'countedCashCents')::bigint;
  if v_amount is null or v_amount<0 or v_amount>100000000000 or (p_payload->>'countedCashCents')::numeric<>v_amount then raise exception 'Invalid counted cash';end if;
  v_totals:=private.pos_shift_totals(v_shift.id);v_expected:=(v_totals->>'expectedCashCents')::bigint;
  update public.cashier_shifts set closed_at=now(),counted_cash_cents=v_amount,expected_cash_cents=v_expected,discrepancy_cents=v_amount-v_expected,accounting_snapshot=v_totals where id=v_shift.id returning * into v_shift;
  v_result:=jsonb_build_object('shift',to_jsonb(v_shift),'totalCents',(v_totals->>'salesCents')::bigint,'totals',v_totals);
 end if;
 insert into public.audit_logs(actor_id,branch_id,action,target_id,details) values(v_uid,v_branch,p_action,v_shift.id::text,coalesce(p_payload->>'reason','Till closed'));
 insert into private.command_receipts(actor_id,request_key,action,payload,result) values(v_uid,p_key,p_action,p_payload,v_result);
 return v_result;
end $$;
revoke all on function private.admin_command(text,jsonb,text) from public,anon;
grant execute on function private.admin_command(text,jsonb,text) to authenticated;

create function public.pos_shift_document(p_shift uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('shift',to_jsonb(s)-'accounting_snapshot','totals',public.shift_summary(s.id),'branch',(select name from public.branches where id=s.branch_id),
 'sales',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.sales x where x.shift_id=s.id),'[]'),
 'returns',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.sale_returns x where x.shift_id=s.id),'[]'),
 'cashMovements',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.till_cash_movements x where x.shift_id=s.id),'[]'))
 from public.cashier_shifts s where id=p_shift and (private.can('reports.read',s.branch_id) or (private.can('pos.use',s.branch_id) and s.cashier_id=(select auth.uid())));
$$;
revoke all on function public.pos_shift_document(uuid) from public,anon;
grant execute on function public.pos_shift_document(uuid) to authenticated;

create function public.accounting_book(p_branch text,p_from date,p_to date) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_start timestamptz;v_end timestamptz;v_result jsonb;
begin
 if not private.can('reports.read',p_branch) or not private.can('sales.read',p_branch) then raise exception 'Branch access denied' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>30 then raise exception 'Choose a period of up to 31 days';end if;
 v_start:=p_from::timestamp at time zone 'Africa/Johannesburg';v_end:=(p_to+1)::timestamp at time zone 'Africa/Johannesburg';
 if (select count(*) from public.sales where branch_id=p_branch and created_at>=v_start and created_at<v_end)>2000 or (select count(*) from public.stock_movements where branch_id=p_branch and created_at>=v_start and created_at<v_end)>2000 then raise exception 'This book is large. Choose a shorter date range';end if;
 with s as (select * from public.sales where branch_id=p_branch and created_at>=v_start and created_at<v_end),
 r as (select * from public.sale_returns where branch_id=p_branch and created_at>=v_start and created_at<v_end),
 c as (select * from public.till_cash_movements where branch_id=p_branch and created_at>=v_start and created_at<v_end),
 events as (select total_cents amount,vat_cents vat,payment_method from s union all select -total_cents,-vat_cents,payment_method from r)
 select jsonb_build_object('branch',(select name from public.branches where id=p_branch),'locationId',p_branch,'from',p_from,'to',p_to,'generatedAt',now(),
 'totals',jsonb_build_object('salesCents',(select coalesce(sum(total_cents),0) from s),'vatCents',(select coalesce(sum(vat_cents),0) from s),'transactions',(select count(*) from s),
 'refundsCents',(select coalesce(sum(total_cents),0) from r),'refundVatCents',(select coalesce(sum(vat_cents),0) from r),'refundCount',(select count(*) from r),
 'netSalesCents',(select coalesce(sum(amount),0) from events),'netVatCents',(select coalesce(sum(vat),0) from events),'netExVatCents',(select coalesce(sum(amount-vat),0) from events),
 'cashCents',(select coalesce(sum(amount),0) from events where payment_method='cash'),'cardCents',(select coalesce(sum(amount),0) from events where payment_method='card'),'eftCents',(select coalesce(sum(amount),0) from events where payment_method='eft'),
 'cashInCents',(select coalesce(sum(amount_cents),0) from c where direction='in'),'cashOutCents',(select coalesce(sum(amount_cents),0) from c where direction='out')),
 'sales',coalesce((select jsonb_agg(to_jsonb(s) order by created_at) from s),'[]'),'returns',coalesce((select jsonb_agg(to_jsonb(r) order by created_at) from r),'[]'),
 'cashMovements',coalesce((select jsonb_agg(to_jsonb(c) order by created_at) from c),'[]'),
 'shifts',coalesce((select jsonb_agg((to_jsonb(sh)-'accounting_snapshot')||jsonb_build_object('totals',public.shift_summary(sh.id)) order by sh.opened_at) from public.cashier_shifts sh where sh.branch_id=p_branch and sh.opened_at<v_end and coalesce(sh.closed_at,now())>=v_start),'[]'),
 'stockMovements',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at) from public.stock_movements m where m.branch_id=p_branch and m.created_at>=v_start and m.created_at<v_end),'[]'),
 'invoiceCollections',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('invoiceNumber',b.data->>'invoiceNumber') order by p.created_at) from public.invoice_payments p join public.business_records b on b.id=p.invoice_id where b.branch_id=p_branch and p.paid_at>=p_from and p.paid_at<=p_to),'[]'),
 'outstandingCents',(select coalesce(sum(round((b.data->>'balanceDue')::numeric*100)),0) from public.business_records b where b.branch_id=p_branch and b.kind='invoices' and b.data->>'status' not in ('draft','cancelled','deleted'))
 ) into v_result;
 return v_result;
end $$;
revoke all on function public.accounting_book(text,date,date) from public,anon;
grant execute on function public.accounting_book(text,date,date) to authenticated;

-- Keep existing dashboard consumers consistent with net sales after returns.
alter function public.dashboard_summary(text) rename to dashboard_summary_before_returns;
revoke all on function public.dashboard_summary_before_returns(text) from public,anon;
create function public.dashboard_summary(p_branch text) returns jsonb language sql stable security invoker set search_path='' as $$
 select public.dashboard_summary_before_returns(p_branch)||jsonb_build_object(
 'todaySales',(select coalesce(sum(total_cents),0)/100.0 from public.sales where branch_id=p_branch and created_at>=((now() at time zone 'Africa/Johannesburg')::date::timestamp at time zone 'Africa/Johannesburg'))-(select coalesce(sum(total_cents),0)/100.0 from public.sale_returns where branch_id=p_branch and created_at>=((now() at time zone 'Africa/Johannesburg')::date::timestamp at time zone 'Africa/Johannesburg')),
 'paidRevenue',(select coalesce(sum(total_cents),0)/100.0 from public.sales where branch_id=p_branch)-(select coalesce(sum(total_cents),0)/100.0 from public.sale_returns where branch_id=p_branch)) where private.can('reports.read',p_branch)
 union all select public.dashboard_summary_before_returns(p_branch) where private.can('dashboard.read',p_branch) and not private.can('reports.read',p_branch);
$$;
revoke all on function public.dashboard_summary(text) from public,anon;
grant execute on function public.dashboard_summary(text) to authenticated;
create or replace function public.branch_reports(p_branch text) returns jsonb language sql stable security invoker set search_path='' as $$
 with events as (select created_at,total_cents,vat_cents,payment_method,1 sale from public.sales where branch_id=p_branch and created_at>=now()-interval '12 months'
 union all select created_at,-total_cents,-vat_cents,payment_method,0 from public.sale_returns where branch_id=p_branch and created_at>=now()-interval '12 months')
 select jsonb_build_object('monthly',coalesce((select jsonb_agg(to_jsonb(m) order by m.month) from (select to_char(created_at at time zone 'Africa/Johannesburg','YYYY-MM') as "month",sum(total_cents)/100.0 sales,sum(vat_cents)/100.0 vat,sum(sale) transactions,
 coalesce(sum(total_cents) filter(where payment_method='cash'),0)/100.0 cash,coalesce(sum(total_cents) filter(where payment_method='card'),0)/100.0 card,coalesce(sum(total_cents) filter(where payment_method='eft'),0)/100.0 eft from events group by 1) m),'[]'),'summary',public.dashboard_summary(p_branch)) where private.can('reports.read',p_branch);
$$;
notify pgrst,'reload schema';
