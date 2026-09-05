-- RAVA runtime entitlement and usage enforcement.
-- Code-only migration. Not applied to production by this PR.
-- Commercial gates are enforced independently from authorization; security/core access is never sold as a downgrade.

create type public.usage_limit_period as enum ('billing_cycle','day','month','lifetime');

alter table public.contract_meter_prices
  add column if not exists limit_period public.usage_limit_period not null default 'billing_cycle';

alter table public.usage_events
  add column if not exists module_key text references public.module_catalog(key) on delete set null;

create index if not exists usage_events_module_scope_time_idx
  on public.usage_events(site_id,module_key,meter_key,occurred_at desc);

-- Design is part of the platform core, but it still travels through the same runtime gate
-- so future paid modules use exactly the same enforcement path.
insert into public.module_catalog(key,name_fa,name_en,category,core,commercial_tier,status)
values ('design','طراحی و قالب','Design & Theme','content',true,'core','active')
on conflict(key) do update set core=true, commercial_tier='core', status='active';

insert into public.site_entitlements(site_id,module_key,status,tier,enabled,limits,config,starts_at)
select s.id,'design','active','core',true,'{}'::jsonb,'{}'::jsonb,now()
from public.sites s
on conflict(site_id,module_key) do nothing;

-- Meter-to-module policies live outside the exposed public schema. A metered operation
-- must have a server-owned policy that names the exact permission required to consume it.
create table private.module_usage_policies (
  module_key text not null references public.module_catalog(key) on delete cascade,
  meter_key text not null references public.usage_meters(key) on delete cascade,
  required_permission text not null references public.permissions(key) on delete restrict,
  requires_contract boolean not null default true,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(module_key,meter_key)
);

create table public.entitlement_enforcement_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  module_key text not null references public.module_catalog(key) on delete restrict,
  meter_key text references public.usage_meters(key) on delete set null,
  decision text not null,
  reason text not null,
  used_quantity numeric(20,4),
  projected_quantity numeric(20,4),
  soft_limit numeric(20,4),
  hard_limit numeric(20,4),
  period_start timestamptz,
  period_end timestamptz,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint entitlement_enforcement_decision_check check (decision in ('allowed','warning','blocked')),
  constraint entitlement_enforcement_reason_format check (reason ~ '^[a-z0-9_.:-]{2,100}$')
);

create index entitlement_enforcement_site_time_idx
  on public.entitlement_enforcement_events(site_id,created_at desc);
create index entitlement_enforcement_decision_time_idx
  on public.entitlement_enforcement_events(decision,reason,created_at desc);

alter table public.entitlement_enforcement_events enable row level security;

create policy entitlement_enforcement_read on public.entitlement_enforcement_events
for select to authenticated
using (
  public.has_permission('platform.billing.manage',null,null)
  or public.has_permission('usage.view',organization_id,site_id)
  or public.has_permission('billing.view',organization_id,site_id)
);

revoke insert,update,delete on public.entitlement_enforcement_events from authenticated;
grant select on public.entitlement_enforcement_events to authenticated;

create or replace function private.user_has_site_scope(p_site_id uuid)
returns boolean
language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_org uuid;
begin
  if v_user is null then return false; end if;
  select organization_id into v_org from public.sites where id=p_site_id;
  if v_org is null then return false; end if;

  if exists(select 1 from public.profiles p where p.id=v_user and p.active and p.role='super_admin') then
    return true;
  end if;

  return exists(
    select 1 from public.memberships m
    where m.user_id=v_user and m.status='active'
      and (
        m.scope_type='platform'
        or (m.scope_type='organization' and m.organization_id=v_org)
        or (m.scope_type='site' and m.site_id=p_site_id)
      )
  );
end;
$$;

create or replace function private.resolve_site_entitlement(
  p_site_id uuid,
  p_module_key text,
  p_at timestamptz default now()
) returns table(
  allowed boolean,
  reason text,
  entitlement_status public.entitlement_status,
  tier text,
  limits jsonb,
  config jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  grace_until timestamptz
)
language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
declare
  v_ent public.site_entitlements%rowtype;
begin
  if auth.uid() is null then
    return query select false,'authentication_required',null::public.entitlement_status,null::text,'{}'::jsonb,'{}'::jsonb,null::timestamptz,null::timestamptz,null::timestamptz;
    return;
  end if;
  if not private.user_has_site_scope(p_site_id) then
    return query select false,'scope_denied',null::public.entitlement_status,null::text,'{}'::jsonb,'{}'::jsonb,null::timestamptz,null::timestamptz,null::timestamptz;
    return;
  end if;
  if not exists(select 1 from public.module_catalog m where m.key=p_module_key and m.status<>'disabled') then
    return query select false,'unknown_module',null::public.entitlement_status,null::text,'{}'::jsonb,'{}'::jsonb,null::timestamptz,null::timestamptz,null::timestamptz;
    return;
  end if;

  select * into v_ent from public.site_entitlements where site_id=p_site_id and module_key=p_module_key;
  if not found then
    return query select false,'not_entitled',null::public.entitlement_status,null::text,'{}'::jsonb,'{}'::jsonb,null::timestamptz,null::timestamptz,null::timestamptz;
    return;
  end if;
  if not v_ent.enabled then
    return query select false,'disabled',v_ent.status,v_ent.tier,v_ent.limits,v_ent.config,v_ent.starts_at,v_ent.ends_at,v_ent.grace_until;
    return;
  end if;
  if v_ent.starts_at is not null and p_at<v_ent.starts_at then
    return query select false,'not_started',v_ent.status,v_ent.tier,v_ent.limits,v_ent.config,v_ent.starts_at,v_ent.ends_at,v_ent.grace_until;
    return;
  end if;
  if v_ent.status in ('suspended','expired') then
    return query select false,v_ent.status::text,v_ent.status,v_ent.tier,v_ent.limits,v_ent.config,v_ent.starts_at,v_ent.ends_at,v_ent.grace_until;
    return;
  end if;
  if v_ent.ends_at is not null and p_at>=v_ent.ends_at then
    if v_ent.grace_until is not null and p_at<v_ent.grace_until then
      return query select true,'grace',v_ent.status,v_ent.tier,v_ent.limits,v_ent.config,v_ent.starts_at,v_ent.ends_at,v_ent.grace_until;
    else
      return query select false,'expired',v_ent.status,v_ent.tier,v_ent.limits,v_ent.config,v_ent.starts_at,v_ent.ends_at,v_ent.grace_until;
    end if;
    return;
  end if;

  if v_ent.status in ('active','trial','grace') then
    return query select true,case when v_ent.status='trial' then 'trial' when v_ent.status='grace' then 'grace' else 'active' end,v_ent.status,v_ent.tier,v_ent.limits,v_ent.config,v_ent.starts_at,v_ent.ends_at,v_ent.grace_until;
  else
    return query select false,'inactive',v_ent.status,v_ent.tier,v_ent.limits,v_ent.config,v_ent.starts_at,v_ent.ends_at,v_ent.grace_until;
  end if;
end;
$$;

create or replace function public.check_site_entitlement_access(
  p_site_id uuid,
  p_module_key text,
  p_at timestamptz default now()
) returns table(
  allowed boolean,
  reason text,
  entitlement_status public.entitlement_status,
  tier text,
  limits jsonb,
  config jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  grace_until timestamptz
)
language sql stable security invoker
set search_path=public,private,pg_temp
as $$
  select * from private.resolve_site_entitlement(p_site_id,p_module_key,p_at);
$$;

create or replace function private.current_usage_period(
  p_contract_id uuid,
  p_limit_period public.usage_limit_period,
  p_at timestamptz default now()
) returns table(period_start timestamptz,period_end timestamptz)
language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
declare
  v_contract public.customer_contracts%rowtype;
  v_anchor timestamptz;
  v_step integer;
  v_raw_months integer;
  v_cycle integer;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into v_contract from public.customer_contracts where id=p_contract_id;
  if not found then raise exception 'contract not found'; end if;
  v_anchor:=coalesce(v_contract.starts_at,date_trunc('month',p_at));

  if p_limit_period='day' then
    return query select date_trunc('day',p_at),date_trunc('day',p_at)+interval '1 day';
    return;
  elsif p_limit_period='month' then
    return query select date_trunc('month',p_at),date_trunc('month',p_at)+interval '1 month';
    return;
  elsif p_limit_period='lifetime' or v_contract.billing_interval='custom' then
    return query select v_anchor,coalesce(v_contract.ends_at,'infinity'::timestamptz);
    return;
  end if;

  v_step:=case v_contract.billing_interval when 'quarterly' then 3 when 'yearly' then 12 else 1 end;
  v_raw_months:=((extract(year from p_at)::integer-extract(year from v_anchor)::integer)*12)
    +(extract(month from p_at)::integer-extract(month from v_anchor)::integer);
  v_cycle:=floor(v_raw_months::numeric/v_step)::integer;
  v_start:=v_anchor+make_interval(months=>v_cycle*v_step);
  if v_start>p_at then
    v_cycle:=v_cycle-1;
    v_start:=v_anchor+make_interval(months=>v_cycle*v_step);
  end if;
  v_end:=v_anchor+make_interval(months=>(v_cycle+1)*v_step);
  return query select v_start,v_end;
end;
$$;

create or replace function private.consume_metered_feature_internal(
  p_site_id uuid,
  p_module_key text,
  p_meter_key text,
  p_quantity numeric,
  p_idempotency_key text,
  p_context jsonb default '{}'::jsonb
) returns table(
  allowed boolean,
  reason text,
  event_id bigint,
  warning boolean,
  used_before numeric,
  used_after numeric,
  soft_limit numeric,
  hard_limit numeric,
  period_start timestamptz,
  period_end timestamptz
)
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_org uuid;
  v_policy private.module_usage_policies%rowtype;
  v_ent record;
  v_contract_id uuid;
  v_contract_count integer;
  v_meter public.usage_meters%rowtype;
  v_price public.contract_meter_prices%rowtype;
  v_limit_period public.usage_limit_period:='billing_cycle';
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

  select count(*),min(c.id) into v_contract_count,v_contract_id
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
$$;

create or replace function public.consume_metered_feature(
  p_site_id uuid,
  p_module_key text,
  p_meter_key text,
  p_quantity numeric,
  p_idempotency_key text,
  p_context jsonb default '{}'::jsonb
) returns table(
  allowed boolean,
  reason text,
  event_id bigint,
  warning boolean,
  used_before numeric,
  used_after numeric,
  soft_limit numeric,
  hard_limit numeric,
  period_start timestamptz,
  period_end timestamptz
)
language sql security invoker
set search_path=public,private,pg_temp
as $$
  select * from private.consume_metered_feature_internal(p_site_id,p_module_key,p_meter_key,p_quantity,p_idempotency_key,p_context);
$$;

-- Seed policies only when the referenced meters exist. This keeps the migration compatible
-- with installations where optional meters were intentionally removed.
insert into private.module_usage_policies(module_key,meter_key,required_permission,requires_contract)
select 'seo_ai',m.key,'seo.manage',true from public.usage_meters m where m.key='ai.tokens'
on conflict(module_key,meter_key) do nothing;
insert into private.module_usage_policies(module_key,meter_key,required_permission,requires_contract)
select 'automation',m.key,'sites.manage',true from public.usage_meters m where m.key='email.messages'
on conflict(module_key,meter_key) do nothing;
insert into private.module_usage_policies(module_key,meter_key,required_permission,requires_contract)
select 'automation',m.key,'sites.manage',true from public.usage_meters m where m.key='sms.messages'
on conflict(module_key,meter_key) do nothing;

revoke all on function private.user_has_site_scope(uuid) from public,anon;
revoke all on function private.resolve_site_entitlement(uuid,text,timestamptz) from public,anon;
revoke all on function private.current_usage_period(uuid,public.usage_limit_period,timestamptz) from public,anon,authenticated;
revoke all on function private.consume_metered_feature_internal(uuid,text,text,numeric,text,jsonb) from public,anon;
revoke all on function public.check_site_entitlement_access(uuid,text,timestamptz) from public,anon;
revoke all on function public.consume_metered_feature(uuid,text,text,numeric,text,jsonb) from public,anon;

grant execute on function private.user_has_site_scope(uuid) to authenticated;
grant execute on function private.resolve_site_entitlement(uuid,text,timestamptz) to authenticated;
grant execute on function private.consume_metered_feature_internal(uuid,text,text,numeric,text,jsonb) to authenticated;
grant execute on function public.check_site_entitlement_access(uuid,text,timestamptz) to authenticated;
grant execute on function public.consume_metered_feature(uuid,text,text,numeric,text,jsonb) to authenticated;
