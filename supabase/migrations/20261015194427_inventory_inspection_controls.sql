create function private.inventory_disposition(p_payload jsonb,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_branch text;v_uid uuid:=auth.uid();v_stock public.inventory%rowtype;v_old private.command_receipts%rowtype;v_qty numeric;v_mode text:=p_payload->>'mode';v_bucket text:=p_payload->>'bucket';v_result jsonb;
begin
 select coalesce(nullif(p_payload->>'locationId',''),branch_ids[1]) into v_branch from public.staff where user_id=v_uid and active;
 if not private.can('inventory.adjust',v_branch) then raise exception 'Permission denied' using errcode='42501';end if;
 if p_key is null or length(p_key) not between 8 and 200 then raise exception 'Invalid request key';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text||':'||p_key,0));
 select * into v_old from private.command_receipts where actor_id=v_uid and request_key=p_key;
 if found then
  if v_old.action<>'inventory-disposition' or v_old.payload<>p_payload then raise exception 'Request key already used with different input' using errcode='23505';end if;
  return v_old.result||'{"replayed":true}'::jsonb;
 end if;
 v_qty:=(p_payload->>'quantity')::numeric;
 if v_qty is null or v_qty<=0 or v_qty>1000000000 or v_qty<>round(v_qty,3) or coalesce(v_mode,'') not in ('hold','release','writeoff') or coalesce(v_bucket,'') not in ('quarantined','damaged') or length(trim(coalesce(p_payload->>'reason',''))) not between 3 and 500 then raise exception 'Enter a valid inspection quantity and reason';end if;
 select * into strict v_stock from public.inventory where branch_id=v_branch and product_id=p_payload->>'productId' for update;
 if not(p_payload ? 'expectedVersion') or (p_payload->>'expectedVersion')::bigint is distinct from v_stock.version then raise exception 'Stock changed. Refresh before inspecting' using errcode='40001';end if;
 if v_mode='hold' then
  if v_stock.on_hand-v_stock.reserved-v_stock.damaged-v_stock.quarantined<v_qty then raise exception 'Insufficient available stock';end if;
 else
  if (case when v_bucket='quarantined' then v_stock.quarantined else v_stock.damaged end)<v_qty then raise exception 'Inspection quantity exceeds held stock';end if;
 end if;
 update public.inventory set
  on_hand=on_hand-case when v_mode='writeoff' then v_qty else 0 end,
  quarantined=quarantined+case when v_bucket='quarantined' then case when v_mode='hold' then v_qty else -v_qty end else 0 end,
  damaged=damaged+case when v_bucket='damaged' then case when v_mode='hold' then v_qty else -v_qty end else 0 end,
  version=version+1,updated_at=now() where branch_id=v_branch and product_id=v_stock.product_id;
 insert into public.stock_movements(branch_id,product_id,actor_id,previous_quantity,new_quantity,reason,note) values(v_branch,v_stock.product_id,v_uid,v_stock.on_hand,v_stock.on_hand-case when v_mode='writeoff' then v_qty else 0 end,'Inspection: '||v_mode,v_qty::text||' '||v_bucket||' / '||trim(p_payload->>'reason'));
 insert into public.audit_logs(actor_id,branch_id,action,target_id,details) values(v_uid,v_branch,'inventory-disposition',v_stock.product_id,trim(p_payload->>'reason'));
 v_result:=jsonb_build_object('ok',true,'inventoryVersion',v_stock.version+1);
 insert into private.command_receipts(actor_id,request_key,action,payload,result) values(v_uid,p_key,'inventory-disposition',p_payload,v_result);
 return v_result;
end $$;
create function public.inventory_disposition(p_payload jsonb,p_key text) returns jsonb language sql security invoker set search_path='' as $$select private.inventory_disposition(p_payload,p_key)$$;
revoke all on function public.inventory_disposition(jsonb,text),private.inventory_disposition(jsonb,text) from public,anon;
grant execute on function public.inventory_disposition(jsonb,text),private.inventory_disposition(jsonb,text) to authenticated;
-- One bounded database call opens/searches the register, avoiding several
-- network round trips for product, stock, branch and shift lookups.
create function public.pos_register(p_branch text default null,p_query text default '',p_ids text[] default '{}',p_search boolean default false) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_branch text;v_shift public.cashier_shifts%rowtype;v_products jsonb;v_branches jsonb;v_query text;
begin
 select coalesce(nullif(p_branch,''),branch_ids[1]) into v_branch from public.staff where user_id=(select auth.uid()) and active;
 if not private.can('pos.use',v_branch) then raise exception 'Branch access denied' using errcode='42501';end if;
 v_query:=left(trim(coalesce(p_query,'')),100);
 if cardinality(p_ids)>200 then raise exception 'Too many product IDs';end if;
 if not p_search then
  select * into v_shift from public.cashier_shifts where cashier_id=(select auth.uid()) and closed_at is null;
  if v_shift.id is not null and v_shift.branch_id<>v_branch then return jsonb_build_object('redirectBranch',v_shift.branch_id);end if;
 end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into v_products from (
  select p.id,p.name,p.code,p.barcodes,p.selling_price_cents as "sellingPriceCents",p.tax_rate as "taxRate",
  coalesce(i.on_hand-i.reserved-i.damaged-i.quarantined,0) as available
  from public.products p left join public.inventory i on i.product_id=p.id and i.branch_id=v_branch
  where p.visible and (case when cardinality(p_ids)>0 then p.id=any(p_ids) else v_query='' or p.name ilike '%'||v_query||'%' or p.code ilike '%'||v_query||'%' or p.barcodes @> array[v_query] end)
  order by (p.code=v_query or p.barcodes @> array[v_query]) desc,p.name,p.id limit case when cardinality(p_ids)>0 then 200 else 25 end
 ) x;
 if p_search then return jsonb_build_object('locationId',v_branch,'products',v_products);end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.name),'[]') into v_branches from public.branches b where b.active and private.can('pos.use',b.id);
 return jsonb_build_object('locationId',v_branch,'products',v_products,'branches',v_branches,'shift',case when v_shift.id is null then null else to_jsonb(v_shift)-'accounting_snapshot' end,'shiftTotals',case when v_shift.id is null then null else public.shift_summary(v_shift.id) end);
end $$;
revoke all on function public.pos_register(text,text,text[],boolean) from public,anon;
grant execute on function public.pos_register(text,text,text[],boolean) to authenticated;
notify pgrst,'reload schema';
