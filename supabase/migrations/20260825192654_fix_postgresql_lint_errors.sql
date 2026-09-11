-- Fix PostgreSQL 17 lint errors without changing function scope or privileges.

CREATE OR REPLACE FUNCTION private.consume_metered_feature_internal(p_site_id uuid, p_module_key text, p_meter_key text, p_quantity numeric, p_idempotency_key text, p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(allowed boolean, reason text, event_id bigint, warning boolean, used_before numeric, used_after numeric, soft_limit numeric, hard_limit numeric, period_start timestamp with time zone, period_end timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_org uuid;
  v_policy private.module_usage_policies%rowtype;
  v_ent record;
  v_contract_id uuid;
  v_contract_count integer;
  v_meter public.usage_meters%rowtype;
  v_price public.contract_meter_prices%rowtype;
  v_limit_period public.usage_limit_period:='billing_cycle'::public.usage_limit_period;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_used numeric:=0;
  v_projected numeric:=0;
  v_existing public.usage_events%rowtype;
  v_event_id bigint;
  v_warning boolean:=false;
  v_reason text:='allowed';
begin
  if v_user is null then
    return query select false,'authentication_required',null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  end if;
  if p_quantity is null or p_quantity<=0 then
    return query select false,'invalid_quantity',null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  end if;
  if p_idempotency_key is null or length(p_idempotency_key)<8 or length(p_idempotency_key)>200 then
    return query select false,'invalid_idempotency_key',null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  end if;
  if jsonb_typeof(coalesce(p_context,'{}'::jsonb))<>'object' or octet_length(coalesce(p_context,'{}'::jsonb)::text)>16384 then
    return query select false,'invalid_context',null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  end if;

  select organization_id into v_org from public.sites where id=p_site_id;
  if v_org is null or not private.user_has_site_scope(p_site_id) then
    return query select false,'scope_denied',null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  end if;

  select * into v_policy from private.module_usage_policies
  where module_key=p_module_key and meter_key=p_meter_key and active;
  if not found then
    return query select false,'meter_policy_missing',null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  end if;
  if not public.has_permission(v_policy.required_permission,v_org,p_site_id) then
    return query select false,'permission_denied',null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  end if;

  select * into v_ent from private.resolve_site_entitlement(p_site_id,p_module_key,now()) limit 1;
  if v_ent.allowed is distinct from true then
    insert into public.entitlement_enforcement_events(organization_id,site_id,actor_id,module_key,meter_key,decision,reason,context)
    values(v_org,p_site_id,v_user,p_module_key,p_meter_key,'blocked',coalesce(v_ent.reason,'not_entitled'),p_context);
    return query select false,coalesce(v_ent.reason,'not_entitled'),null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  end if;

  select * into v_existing from public.usage_events where meter_key=p_meter_key and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.site_id is distinct from p_site_id or v_existing.module_key is distinct from p_module_key then
      return query select false,'idempotency_conflict',null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    end if;
    return query select true,'duplicate',v_existing.id,false,v_existing.quantity,v_existing.quantity,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  end if;

  select count(*),(array_agg(c.id order by c.id))[1] into v_contract_count,v_contract_id
  from public.customer_contracts c
  join public.contract_sites cs on cs.contract_id=c.id and cs.site_id=p_site_id
  where c.organization_id=v_org and c.status='active'
    and (c.starts_at is null or c.starts_at<=now())
    and (c.ends_at is null or c.ends_at>now() or (c.grace_until is not null and c.grace_until>now()));

  if v_contract_count>1 then
    return query select false,'multiple_active_contracts',null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  elsif v_contract_count=0 and v_policy.requires_contract then
    return query select false,'no_active_contract',null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  end if;

  select * into v_meter from public.usage_meters where key=p_meter_key and active;
  if not found then
    return query select false,'meter_disabled',null::bigint,false,0::numeric,0::numeric,null::numeric,null::numeric,null::timestamptz,null::timestamptz;
    return;
  end if;

  if v_contract_id is not null then
    select * into v_price from public.contract_meter_prices where contract_id=v_contract_id and meter_key=p_meter_key;
    if found then v_limit_period:=v_price.limit_period; end if;
    select p.period_start,p.period_end into v_period_start,v_period_end
      from private.current_usage_period(v_contract_id,v_limit_period,now()) p;
  else
    v_period_start:=date_trunc('month',now());
    v_period_end:=v_period_start+interval '1 month';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_site_id::text||':'||p_meter_key||':'||v_period_start::text,0));

  if v_meter.aggregation='max' then
    select coalesce(max(quantity),0) into v_used from public.usage_events
      where site_id=p_site_id and meter_key=p_meter_key and occurred_at>=v_period_start and occurred_at<v_period_end;
    v_projected:=greatest(v_used,p_quantity);
  elsif v_meter.aggregation='last' then
    select coalesce((select quantity from public.usage_events where site_id=p_site_id and meter_key=p_meter_key and occurred_at>=v_period_start and occurred_at<v_period_end order by occurred_at desc,id desc limit 1),0) into v_used;
    v_projected:=p_quantity;
  else
    select coalesce(sum(quantity),0) into v_used from public.usage_events
      where site_id=p_site_id and meter_key=p_meter_key and occurred_at>=v_period_start and occurred_at<v_period_end;
    v_projected:=v_used+p_quantity;
  end if;

  if v_contract_id is not null and v_price.hard_limit is not null and v_projected>v_price.hard_limit then
    insert into public.entitlement_enforcement_events(organization_id,site_id,actor_id,module_key,meter_key,decision,reason,used_quantity,projected_quantity,soft_limit,hard_limit,period_start,period_end,context)
    values(v_org,p_site_id,v_user,p_module_key,p_meter_key,'blocked','hard_limit_exceeded',v_used,v_projected,v_price.soft_limit,v_price.hard_limit,v_period_start,v_period_end,p_context);
    return query select false,'hard_limit_exceeded',null::bigint,false,v_used,v_projected,v_price.soft_limit,v_price.hard_limit,v_period_start,v_period_end;
    return;
  end if;

  v_warning:=v_contract_id is not null and v_price.soft_limit is not null and v_projected>v_price.soft_limit;
  if v_warning then v_reason:='soft_limit_exceeded'; end if;

  insert into public.usage_events(organization_id,site_id,contract_id,module_key,meter_key,quantity,idempotency_key,context)
  values(v_org,p_site_id,v_contract_id,p_module_key,p_meter_key,p_quantity,p_idempotency_key,p_context)
  returning id into v_event_id;

  if v_warning then
    insert into public.entitlement_enforcement_events(organization_id,site_id,actor_id,module_key,meter_key,decision,reason,used_quantity,projected_quantity,soft_limit,hard_limit,period_start,period_end,context)
    values(v_org,p_site_id,v_user,p_module_key,p_meter_key,'warning',v_reason,v_used,v_projected,v_price.soft_limit,v_price.hard_limit,v_period_start,v_period_end,p_context);
  end if;

  return query select true,v_reason,v_event_id,v_warning,v_used,v_projected,
    case when v_contract_id is null then null else v_price.soft_limit end,
    case when v_contract_id is null then null else v_price.hard_limit end,
    v_period_start,v_period_end;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.adjust_inventory(p_site_id uuid, p_variant_id uuid, p_location_id uuid, p_quantity_delta integer, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(on_hand integer, reserved integer, available integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_level public.inventory_levels%rowtype; v_org uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select organization_id into v_org from public.sites where id=p_site_id;
  if not private.commerce_allowed(p_site_id,'commerce.inventory.manage') then raise exception 'commerce inventory access denied'; end if;
  if p_quantity_delta=0 then raise exception 'quantity delta cannot be zero'; end if;
  if not exists(select 1 from public.commerce_variants v where v.id=p_variant_id and v.site_id=p_site_id) then raise exception 'variant scope mismatch'; end if;
  if not exists(select 1 from public.inventory_locations l where l.id=p_location_id and l.site_id=p_site_id) then raise exception 'location scope mismatch'; end if;

  insert into public.inventory_levels(variant_id,location_id,on_hand,reserved) values(p_variant_id,p_location_id,0,0)
  on conflict(variant_id,location_id) do nothing;
  select * into v_level from public.inventory_levels where variant_id=p_variant_id and location_id=p_location_id for update;
  if v_level.on_hand+p_quantity_delta<0 or v_level.on_hand+p_quantity_delta<v_level.reserved then raise exception 'insufficient inventory'; end if;
  update public.inventory_levels as il set on_hand=il.on_hand+p_quantity_delta,updated_at=now()
    where il.variant_id=p_variant_id and il.location_id=p_location_id returning il.* into v_level;
  insert into public.inventory_movements(site_id,variant_id,location_id,movement_type,quantity_delta,reason,actor_id)
    values(p_site_id,p_variant_id,p_location_id,'adjustment',p_quantity_delta,nullif(trim(coalesce(p_reason,'')),''),auth.uid());
  perform public.record_audit_event('commerce.inventory.adjusted','commerce_variant',p_variant_id::text,v_org,p_site_id,null,
    jsonb_build_object('location_id',p_location_id,'delta',p_quantity_delta,'on_hand',v_level.on_hand,'reserved',v_level.reserved),'{}'::jsonb,null,null,'warning');
  return query select v_level.on_hand,v_level.reserved,v_level.on_hand-v_level.reserved;
end; $function$
;

revoke all on function private.consume_metered_feature_internal(uuid,text,text,numeric,text,jsonb) from public, anon;
grant execute on function private.consume_metered_feature_internal(uuid,text,text,numeric,text,jsonb) to authenticated;

revoke all on function public.adjust_inventory(uuid,uuid,uuid,integer,text) from public, anon;
grant execute on function public.adjust_inventory(uuid,uuid,uuid,integer,text) to authenticated, service_role;
