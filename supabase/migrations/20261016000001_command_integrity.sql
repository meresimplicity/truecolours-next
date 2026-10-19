-- Validate at the database boundary, including callers that bypass the UI.
alter function private.admin_command(text,jsonb,text) rename to admin_command_before_integrity;
revoke all on function private.admin_command_before_integrity(text,jsonb,text) from public,anon,authenticated;
create function private.admin_command(p_action text,p_payload jsonb,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_key text;v_value numeric;v_item jsonb;
begin
 if p_action is null or length(p_action) not between 1 and 100 or jsonb_typeof(p_payload) is distinct from 'object' or length(p_payload::text)>120000 or p_key is null or length(p_key) not between 8 and 200 then raise exception 'Invalid command';end if;
 foreach v_key in array array['sellingPriceCents','openingFloatCents','tenderedCents','countedCashCents','amountCents','expectedTotalCents'] loop
  if p_payload ? v_key then
   v_value:=(p_payload->>v_key)::numeric;
   if v_value is null or v_value<0 or v_value>100000000000 or v_value<>trunc(v_value) then raise exception 'Enter a valid whole-cent amount for %',v_key;end if;
  end if;
 end loop;
 foreach v_key in array array['stockQuantity','minStock','quantity'] loop
  if p_payload ? v_key then
   v_value:=(p_payload->>v_key)::numeric;
   if v_value is null or v_value<0 or v_value>1000000000 or v_value<>round(v_value,3) then raise exception 'Enter a valid stock quantity with at most three decimal places';end if;
  end if;
 end loop;
 if p_action='update-stock' or p_payload ? 'expectedVersion' then
  v_value:=(p_payload->>'expectedVersion')::numeric;
  if v_value is null or v_value<0 or v_value>9007199254740991 or v_value<>trunc(v_value) then raise exception 'Refresh stock to obtain its current version' using errcode='40001';end if;
 end if;
 if p_action in ('checkout','refund-sale') and jsonb_typeof(p_payload->'items')='array' then
  for v_item in select x from jsonb_array_elements(p_payload->'items') x loop
   v_value:=(v_item->>'quantity')::numeric;
   if v_value is null or v_value<=0 or v_value>1000000000 or v_value<>round(v_value,3) then raise exception 'Invalid sale item quantity';end if;
  end loop;
 end if;
 return private.admin_command_before_integrity(p_action,p_payload,p_key);
end $$;
revoke all on function private.admin_command(text,jsonb,text) from public,anon;
grant execute on function private.admin_command(text,jsonb,text) to authenticated;

alter function private.inventory_document_command(text,jsonb,text) rename to inventory_document_command_before_integrity;
revoke all on function private.inventory_document_command_before_integrity(text,jsonb,text),private.inventory_document_command_before_corrections(text,jsonb,text) from public,anon,authenticated;
create function private.inventory_document_command(p_action text,p_payload jsonb,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_action is null or p_action not in ('save','post','payment','budget','archive','restore','void') or jsonb_typeof(p_payload) is distinct from 'object' or length(p_payload::text)>120000 or p_key is null or length(p_key) not between 8 and 200 then raise exception 'Invalid document command';end if;
 return private.inventory_document_command_before_integrity(p_action,p_payload,p_key);
end $$;
revoke all on function private.inventory_document_command(text,jsonb,text) from public,anon;
grant execute on function private.inventory_document_command(text,jsonb,text) to authenticated;
notify pgrst,'reload schema';
