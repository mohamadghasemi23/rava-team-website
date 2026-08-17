-- RAVA billing management operations and default commercial entitlements.
-- Depends on 20260817084000_contract_billing_core.sql.

insert into public.plan_entitlements(plan_id,module_key,enabled,tier,limits,config)
select p.id,m.key,true,'core','{}'::jsonb,'{}'::jsonb
from public.plan_catalog p
join public.module_catalog m on m.core=true
where p.key='rava.core'
on conflict(plan_id,module_key) do nothing;

insert into public.plan_entitlements(plan_id,module_key,enabled,tier,limits,config)
select p.id,m.key,true,case when m.core then 'core' else 'premium' end,'{}'::jsonb,'{}'::jsonb
from public.plan_catalog p
join public.module_catalog m on m.key in ('cms','media','seo_core','analytics_core','security','help','crm','automation','seo_ai','analytics_pro','support')
where p.key='rava.growth'
on conflict(plan_id,module_key) do nothing;

insert into public.plan_entitlements(plan_id,module_key,enabled,tier,limits,config)
select p.id,m.key,true,case when m.core then 'core' else 'enterprise' end,'{}'::jsonb,'{}'::jsonb
from public.plan_catalog p
cross join public.module_catalog m
where p.key='rava.enterprise' and m.status<>'deprecated'
on conflict(plan_id,module_key) do nothing;

create or replace function public.upsert_contract_entitlement(
  p_contract_id uuid,
  p_site_id uuid,
  p_module_key text,
  p_enabled boolean default true,
  p_tier text default 'premium',
  p_limits jsonb default '{}'::jsonb,
  p_config jsonb default '{}'::jsonb,
  p_ends_at timestamptz default null
) returns uuid
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare v_contract public.customer_contracts%rowtype; v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_contract from public.customer_contracts where id=p_contract_id;
  if not found then raise exception 'contract not found'; end if;
  if not (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',v_contract.organization_id,null)) then raise exception 'permission denied'; end if;
  if not exists(select 1 from public.module_catalog where key=p_module_key) then raise exception 'unknown module'; end if;
  if p_site_id is not null and not exists(select 1 from public.contract_sites cs where cs.contract_id=p_contract_id and cs.site_id=p_site_id) then raise exception 'site not attached to contract'; end if;

  insert into public.contract_entitlements(contract_id,site_id,module_key,enabled,tier,limits,config,ends_at,source)
  values(p_contract_id,p_site_id,p_module_key,p_enabled,p_tier,coalesce(p_limits,'{}'::jsonb),coalesce(p_config,'{}'::jsonb),p_ends_at,'addon')
  on conflict(contract_id,coalesce(site_id,'00000000-0000-0000-0000-000000000000'::uuid),module_key,source)
  do update set enabled=excluded.enabled,tier=excluded.tier,limits=excluded.limits,config=excluded.config,ends_at=excluded.ends_at,updated_at=now()
  returning id into v_id;

  perform public.sync_contract_entitlements(p_contract_id);
  perform public.record_audit_event('billing.entitlement.upserted','contract_entitlement',v_id::text,v_contract.organization_id,p_site_id,null,
    jsonb_build_object('module_key',p_module_key,'enabled',p_enabled,'tier',p_tier,'limits',p_limits,'ends_at',p_ends_at),
    jsonb_build_object('contract_id',p_contract_id),null,null,'warning');
  return v_id;
end;
$$;

create or replace function public.set_contract_meter_price(
  p_contract_id uuid,
  p_meter_key text,
  p_included_quantity numeric default 0,
  p_unit_price_minor bigint default 0,
  p_soft_limit numeric default null,
  p_hard_limit numeric default null
) returns void
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare v_contract public.customer_contracts%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_contract from public.customer_contracts where id=p_contract_id;
  if not found then raise exception 'contract not found'; end if;
  if not (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',v_contract.organization_id,null)) then raise exception 'permission denied'; end if;
  if not exists(select 1 from public.usage_meters where key=p_meter_key and active) then raise exception 'unknown meter'; end if;
  if p_included_quantity<0 or p_unit_price_minor<0 or (p_soft_limit is not null and p_soft_limit<0) or (p_hard_limit is not null and p_hard_limit<0) then raise exception 'invalid meter configuration'; end if;
  if p_hard_limit is not null and p_soft_limit is not null and p_hard_limit<p_soft_limit then raise exception 'hard limit must be >= soft limit'; end if;

  insert into public.contract_meter_prices(contract_id,meter_key,included_quantity,unit_price_minor,soft_limit,hard_limit)
  values(p_contract_id,p_meter_key,p_included_quantity,p_unit_price_minor,p_soft_limit,p_hard_limit)
  on conflict(contract_id,meter_key) do update set included_quantity=excluded.included_quantity,unit_price_minor=excluded.unit_price_minor,soft_limit=excluded.soft_limit,hard_limit=excluded.hard_limit;

  perform public.record_audit_event('billing.meter_price.changed','contract',p_contract_id::text,v_contract.organization_id,null,null,
    jsonb_build_object('meter_key',p_meter_key,'included_quantity',p_included_quantity,'unit_price_minor',p_unit_price_minor,'soft_limit',p_soft_limit,'hard_limit',p_hard_limit),
    '{}'::jsonb,null,null,'notice');
end;
$$;

create or replace function public.record_invoice_payment(
  p_invoice_id uuid,
  p_provider text,
  p_amount_minor bigint,
  p_provider_reference text default null,
  p_received_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare v_invoice public.invoices%rowtype; v_payment_id uuid; v_new_paid bigint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_invoice from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'invoice not found'; end if;
  if not (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.payments.manage',v_invoice.organization_id,null)) then raise exception 'permission denied'; end if;
  if v_invoice.status in ('void','paid') then raise exception 'invoice not payable'; end if;
  if p_amount_minor<=0 or v_invoice.paid_minor+p_amount_minor>v_invoice.total_minor then raise exception 'invalid payment amount'; end if;
  if length(trim(p_provider))<2 then raise exception 'invalid provider'; end if;

  insert into public.payment_records(organization_id,invoice_id,provider,provider_reference,status,currency,amount_minor,received_at,metadata)
  values(v_invoice.organization_id,p_invoice_id,trim(p_provider),nullif(trim(p_provider_reference),''),'succeeded',v_invoice.currency,p_amount_minor,coalesce(p_received_at,now()),coalesce(p_metadata,'{}'::jsonb))
  returning id into v_payment_id;

  v_new_paid:=v_invoice.paid_minor+p_amount_minor;
  update public.invoices set paid_minor=v_new_paid,
    status=case when v_new_paid=total_minor then 'paid'::public.invoice_status else 'partially_paid'::public.invoice_status end,
    paid_at=case when v_new_paid=total_minor then coalesce(p_received_at,now()) else paid_at end,
    updated_at=now()
  where id=p_invoice_id;

  perform public.record_audit_event('billing.payment.recorded','payment',v_payment_id::text,v_invoice.organization_id,null,null,
    jsonb_build_object('invoice_id',p_invoice_id,'provider',p_provider,'amount_minor',p_amount_minor),
    '{}'::jsonb,null,null,'warning');
  return v_payment_id;
end;
$$;

create or replace function public.contract_usage_summary(
  p_contract_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz
) returns table(
  meter_key text,
  name_fa text,
  unit text,
  used_quantity numeric,
  included_quantity numeric,
  soft_limit numeric,
  hard_limit numeric,
  overage_quantity numeric,
  estimated_overage_minor numeric
)
language plpgsql security definer stable
set search_path=public,pg_temp
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.customer_contracts where id=p_contract_id;
  if v_org is null then raise exception 'contract not found'; end if;
  if not (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.view',v_org,null) or public.has_permission('usage.view',v_org,null)) then raise exception 'permission denied'; end if;
  return query
  select um.key,um.name_fa,um.unit,
    coalesce(sum(ue.quantity),0)::numeric,
    coalesce(cmp.included_quantity,0)::numeric,
    cmp.soft_limit,cmp.hard_limit,
    greatest(coalesce(sum(ue.quantity),0)-coalesce(cmp.included_quantity,0),0)::numeric,
    (greatest(coalesce(sum(ue.quantity),0)-coalesce(cmp.included_quantity,0),0)*coalesce(cmp.unit_price_minor,um.default_unit_price_minor))::numeric
  from public.usage_meters um
  left join public.contract_meter_prices cmp on cmp.contract_id=p_contract_id and cmp.meter_key=um.key
  left join public.usage_events ue on ue.contract_id=p_contract_id and ue.meter_key=um.key and ue.occurred_at>=p_period_start and ue.occurred_at<p_period_end
  where um.active
  group by um.key,um.name_fa,um.unit,cmp.included_quantity,cmp.soft_limit,cmp.hard_limit,cmp.unit_price_minor,um.default_unit_price_minor
  order by um.key;
end;
$$;

revoke all on function public.upsert_contract_entitlement(uuid,uuid,text,boolean,text,jsonb,jsonb,timestamptz) from public,anon;
revoke all on function public.set_contract_meter_price(uuid,text,numeric,bigint,numeric,numeric) from public,anon;
revoke all on function public.record_invoice_payment(uuid,text,bigint,text,timestamptz,jsonb) from public,anon;
revoke all on function public.contract_usage_summary(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.upsert_contract_entitlement(uuid,uuid,text,boolean,text,jsonb,jsonb,timestamptz) to authenticated;
grant execute on function public.set_contract_meter_price(uuid,text,numeric,bigint,numeric,numeric) to authenticated;
grant execute on function public.record_invoice_payment(uuid,text,bigint,text,timestamptz,jsonb) to authenticated;
grant execute on function public.contract_usage_summary(uuid,timestamptz,timestamptz) to authenticated;
