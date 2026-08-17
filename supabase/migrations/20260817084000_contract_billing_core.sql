-- RAVA contract, entitlement, metering and billing core
-- Code-only migration. Not applied to production by this PR.

create type public.contract_status as enum ('draft','active','suspended','expired','cancelled');
create type public.billing_interval as enum ('monthly','quarterly','yearly','custom');
create type public.invoice_status as enum ('draft','issued','partially_paid','paid','void','overdue');
create type public.payment_status as enum ('pending','succeeded','failed','refunded','cancelled');
create type public.usage_aggregation as enum ('sum','max','last');

create table public.plan_catalog (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_fa text not null,
  name_en text not null,
  description_fa text not null default '',
  description_en text not null default '',
  commercial_tier text not null default 'core',
  billing_interval public.billing_interval not null default 'monthly',
  base_price_minor bigint not null default 0 check (base_price_minor >= 0),
  currency text not null default 'IRR' check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_catalog_key_format check (key ~ '^[a-z0-9_.:-]{2,80}$')
);

create table public.plan_entitlements (
  plan_id uuid not null references public.plan_catalog(id) on delete cascade,
  module_key text not null references public.module_catalog(key) on delete cascade,
  enabled boolean not null default true,
  tier text not null default 'core',
  limits jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  primary key (plan_id,module_key)
);

create table public.customer_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plan_id uuid references public.plan_catalog(id) on delete set null,
  status public.contract_status not null default 'draft',
  billing_interval public.billing_interval not null default 'monthly',
  currency text not null default 'IRR' check (currency ~ '^[A-Z]{3}$'),
  base_amount_minor bigint not null default 0 check (base_amount_minor >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  tax_percent numeric(5,2) not null default 0 check (tax_percent >= 0 and tax_percent <= 100),
  starts_at timestamptz,
  ends_at timestamptz,
  grace_until timestamptz,
  auto_renew boolean not null default false,
  terms jsonb not null default '{}'::jsonb,
  internal_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_contracts_number_format check (contract_number ~ '^[A-Z0-9_-]{3,64}$'),
  constraint customer_contracts_dates check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.contract_sites (
  contract_id uuid not null references public.customer_contracts(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  primary key (contract_id,site_id)
);

create table public.contract_entitlements (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.customer_contracts(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  module_key text not null references public.module_catalog(key) on delete cascade,
  enabled boolean not null default true,
  tier text not null default 'core',
  limits jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  source text not null default 'contract',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_entitlements_source_check check (source in ('plan','contract','addon'))
);

create unique index contract_entitlements_unique_scope
  on public.contract_entitlements(contract_id,coalesce(site_id,'00000000-0000-0000-0000-000000000000'::uuid),module_key,source);

create table public.usage_meters (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_fa text not null,
  name_en text not null,
  unit text not null,
  aggregation public.usage_aggregation not null default 'sum',
  billable boolean not null default false,
  default_unit_price_minor bigint not null default 0 check (default_unit_price_minor >= 0),
  currency text not null default 'IRR' check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  constraint usage_meters_key_format check (key ~ '^[a-z0-9_.:-]{2,100}$')
);

create table public.contract_meter_prices (
  contract_id uuid not null references public.customer_contracts(id) on delete cascade,
  meter_key text not null references public.usage_meters(key) on delete cascade,
  included_quantity numeric(20,4) not null default 0 check (included_quantity >= 0),
  unit_price_minor bigint not null default 0 check (unit_price_minor >= 0),
  hard_limit numeric(20,4),
  soft_limit numeric(20,4),
  config jsonb not null default '{}'::jsonb,
  primary key(contract_id,meter_key),
  constraint contract_meter_limits_check check (
    (soft_limit is null or soft_limit >= 0) and
    (hard_limit is null or hard_limit >= 0) and
    (hard_limit is null or soft_limit is null or hard_limit >= soft_limit)
  )
);

create table public.usage_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  contract_id uuid references public.customer_contracts(id) on delete set null,
  meter_key text not null references public.usage_meters(key) on delete restrict,
  quantity numeric(20,4) not null check (quantity >= 0),
  idempotency_key text not null,
  occurred_at timestamptz not null default now(),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(meter_key,idempotency_key)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid references public.customer_contracts(id) on delete set null,
  status public.invoice_status not null default 'draft',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0),
  paid_minor bigint not null default 0 check (paid_minor >= 0),
  period_start timestamptz,
  period_end timestamptz,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_total_check check (total_minor = greatest(0,subtotal_minor-discount_minor+tax_minor)),
  constraint invoice_paid_check check (paid_minor <= total_minor),
  constraint invoice_period_check check (period_end is null or period_start is null or period_end > period_start)
);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  line_type text not null,
  reference_key text,
  description text not null,
  quantity numeric(20,4) not null default 1 check (quantity >= 0),
  unit_price_minor bigint not null default 0 check (unit_price_minor >= 0),
  amount_minor bigint not null default 0 check (amount_minor >= 0),
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  constraint invoice_lines_type_check check (line_type in ('base','module','usage','discount','tax','credit','manual'))
);

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete set null,
  provider text not null,
  provider_reference text,
  status public.payment_status not null default 'pending',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor >= 0),
  received_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contracts_org_status_idx on public.customer_contracts(organization_id,status,starts_at desc);
create index contract_sites_site_idx on public.contract_sites(site_id,contract_id);
create index contract_entitlements_scope_idx on public.contract_entitlements(contract_id,site_id,module_key);
create index usage_events_scope_time_idx on public.usage_events(organization_id,site_id,meter_key,occurred_at desc);
create index invoices_org_status_idx on public.invoices(organization_id,status,due_at desc);
create index invoices_contract_period_idx on public.invoices(contract_id,period_start,period_end);
create index payment_records_invoice_idx on public.payment_records(invoice_id,status,created_at desc);

alter table public.plan_catalog enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.customer_contracts enable row level security;
alter table public.contract_sites enable row level security;
alter table public.contract_entitlements enable row level security;
alter table public.usage_meters enable row level security;
alter table public.contract_meter_prices enable row level security;
alter table public.usage_events enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payment_records enable row level security;

insert into public.permissions(key,module_key,name_fa,name_en,risk_level) values
  ('platform.billing.manage','security','مدیریت مالی پلتفرم','Manage platform billing','critical'),
  ('billing.view','security','مشاهده قرارداد و صورتحساب','View billing','high'),
  ('billing.manage','security','مدیریت قرارداد و صورتحساب','Manage billing','critical'),
  ('billing.issue','security','صدور صورتحساب','Issue invoices','critical'),
  ('billing.payments.manage','security','مدیریت پرداخت‌ها','Manage payments','critical'),
  ('usage.view','analytics_core','مشاهده مصرف','View usage','normal')
on conflict (key) do nothing;

create policy plan_catalog_read on public.plan_catalog for select to authenticated using (true);
create policy plan_catalog_manage on public.plan_catalog for all to authenticated
using (public.has_permission('platform.billing.manage',null,null))
with check (public.has_permission('platform.billing.manage',null,null));

create policy plan_entitlements_read on public.plan_entitlements for select to authenticated using (true);
create policy plan_entitlements_manage on public.plan_entitlements for all to authenticated
using (public.has_permission('platform.billing.manage',null,null))
with check (public.has_permission('platform.billing.manage',null,null));

create policy contracts_read on public.customer_contracts for select to authenticated
using (
  public.has_permission('platform.billing.manage',null,null)
  or public.has_permission('billing.view',organization_id,null)
  or public.has_permission('billing.manage',organization_id,null)
);
create policy contracts_manage on public.customer_contracts for all to authenticated
using (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',organization_id,null))
with check (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',organization_id,null));

create policy contract_sites_access on public.contract_sites for select to authenticated
using (exists(select 1 from public.customer_contracts c where c.id=contract_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.view',c.organization_id,null) or public.has_permission('billing.manage',c.organization_id,null))));
create policy contract_sites_manage on public.contract_sites for all to authenticated
using (exists(select 1 from public.customer_contracts c where c.id=contract_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',c.organization_id,null))))
with check (exists(select 1 from public.customer_contracts c where c.id=contract_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',c.organization_id,null))));

create policy contract_entitlements_read on public.contract_entitlements for select to authenticated
using (exists(select 1 from public.customer_contracts c where c.id=contract_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.view',c.organization_id,null) or public.has_permission('billing.manage',c.organization_id,null))));
create policy contract_entitlements_manage on public.contract_entitlements for all to authenticated
using (exists(select 1 from public.customer_contracts c where c.id=contract_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',c.organization_id,null))))
with check (exists(select 1 from public.customer_contracts c where c.id=contract_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',c.organization_id,null))));

create policy usage_meters_read on public.usage_meters for select to authenticated using (true);
create policy usage_meters_manage on public.usage_meters for all to authenticated
using (public.has_permission('platform.billing.manage',null,null))
with check (public.has_permission('platform.billing.manage',null,null));

create policy contract_meter_prices_read on public.contract_meter_prices for select to authenticated
using (exists(select 1 from public.customer_contracts c where c.id=contract_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.view',c.organization_id,null) or public.has_permission('billing.manage',c.organization_id,null))));
create policy contract_meter_prices_manage on public.contract_meter_prices for all to authenticated
using (exists(select 1 from public.customer_contracts c where c.id=contract_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',c.organization_id,null))))
with check (exists(select 1 from public.customer_contracts c where c.id=contract_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',c.organization_id,null))));

create policy usage_events_read on public.usage_events for select to authenticated
using (public.has_permission('platform.billing.manage',null,null) or public.has_permission('usage.view',organization_id,site_id) or public.has_permission('billing.view',organization_id,site_id));

create policy invoices_read on public.invoices for select to authenticated
using (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.view',organization_id,null) or public.has_permission('billing.manage',organization_id,null));
create policy invoices_manage on public.invoices for all to authenticated
using (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',organization_id,null))
with check (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',organization_id,null));

create policy invoice_lines_access on public.invoice_lines for select to authenticated
using (exists(select 1 from public.invoices i where i.id=invoice_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.view',i.organization_id,null) or public.has_permission('billing.manage',i.organization_id,null))));
create policy invoice_lines_manage on public.invoice_lines for all to authenticated
using (exists(select 1 from public.invoices i where i.id=invoice_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',i.organization_id,null))))
with check (exists(select 1 from public.invoices i where i.id=invoice_id and (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',i.organization_id,null))));

create policy payments_read on public.payment_records for select to authenticated
using (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.view',organization_id,null) or public.has_permission('billing.manage',organization_id,null));
create policy payments_manage on public.payment_records for all to authenticated
using (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.payments.manage',organization_id,null))
with check (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.payments.manage',organization_id,null));

-- Direct usage writes are intentionally not granted to clients; trusted server paths use record_usage_event.

create or replace function public.sync_contract_entitlements(p_contract_id uuid) returns void
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_contract public.customer_contracts%rowtype;
  v_site uuid;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  select * into v_contract from public.customer_contracts where id=p_contract_id;
  if not found then raise exception 'contract not found'; end if;
  if not (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',v_contract.organization_id,null)) then raise exception 'permission denied'; end if;

  delete from public.contract_entitlements where contract_id=p_contract_id and source='plan';
  if v_contract.plan_id is not null then
    insert into public.contract_entitlements(contract_id,site_id,module_key,enabled,tier,limits,config,starts_at,ends_at,source)
    select p_contract_id,cs.site_id,pe.module_key,pe.enabled,pe.tier,pe.limits,pe.config,v_contract.starts_at,v_contract.ends_at,'plan'
    from public.contract_sites cs
    join public.plan_entitlements pe on pe.plan_id=v_contract.plan_id
    where cs.contract_id=p_contract_id;
  end if;

  for v_site in select site_id from public.contract_sites where contract_id=p_contract_id loop
    insert into public.site_entitlements(site_id,module_key,status,tier,enabled,limits,config,starts_at,ends_at,grace_until,updated_by,updated_at)
    select v_site,ce.module_key,
      case when v_contract.status='active' then 'active'::public.entitlement_status else 'suspended'::public.entitlement_status end,
      ce.tier,ce.enabled,ce.limits,ce.config,
      coalesce(ce.starts_at,v_contract.starts_at,now()),coalesce(ce.ends_at,v_contract.ends_at),v_contract.grace_until,v_actor,now()
    from public.contract_entitlements ce
    where ce.contract_id=p_contract_id and (ce.site_id is null or ce.site_id=v_site)
      and (ce.starts_at is null or ce.starts_at<=now())
      and (ce.ends_at is null or ce.ends_at>now())
    on conflict(site_id,module_key) do update set
      status=excluded.status,tier=excluded.tier,enabled=excluded.enabled,limits=excluded.limits,config=excluded.config,
      starts_at=excluded.starts_at,ends_at=excluded.ends_at,grace_until=excluded.grace_until,updated_by=excluded.updated_by,updated_at=now();
  end loop;

  perform public.record_audit_event('billing.contract.entitlements_synced','contract',p_contract_id::text,v_contract.organization_id,null,null,null,'{}'::jsonb,null,null,'notice');
end;
$$;

create or replace function public.create_customer_contract(
  p_organization_id uuid,
  p_contract_number text,
  p_plan_id uuid default null,
  p_site_ids uuid[] default '{}'::uuid[],
  p_currency text default 'IRR',
  p_base_amount_minor bigint default 0,
  p_billing_interval public.billing_interval default 'monthly',
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_auto_renew boolean default false
) returns uuid
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare v_actor uuid:=auth.uid(); v_contract_id uuid; v_site uuid;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',p_organization_id,null)) then raise exception 'permission denied'; end if;
  if p_contract_number !~ '^[A-Z0-9_-]{3,64}$' then raise exception 'invalid contract number'; end if;
  if p_currency !~ '^[A-Z]{3}$' or p_base_amount_minor<0 then raise exception 'invalid billing input'; end if;
  if p_ends_at is not null and p_starts_at is not null and p_ends_at<=p_starts_at then raise exception 'invalid contract dates'; end if;

  insert into public.customer_contracts(contract_number,organization_id,plan_id,billing_interval,currency,base_amount_minor,starts_at,ends_at,auto_renew,created_by,updated_by)
  values(p_contract_number,p_organization_id,p_plan_id,p_billing_interval,p_currency,p_base_amount_minor,p_starts_at,p_ends_at,p_auto_renew,v_actor,v_actor)
  returning id into v_contract_id;

  foreach v_site in array coalesce(p_site_ids,'{}'::uuid[]) loop
    if not exists(select 1 from public.sites where id=v_site and organization_id=p_organization_id) then raise exception 'site scope mismatch'; end if;
    insert into public.contract_sites(contract_id,site_id) values(v_contract_id,v_site) on conflict do nothing;
  end loop;

  perform public.sync_contract_entitlements(v_contract_id);
  perform public.record_audit_event('billing.contract.created','contract',v_contract_id::text,p_organization_id,null,null,jsonb_build_object('contract_number',p_contract_number,'plan_id',p_plan_id,'sites',p_site_ids),'{}'::jsonb,null,null,'notice');
  return v_contract_id;
end;
$$;

create or replace function public.activate_contract(p_contract_id uuid) returns void
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare v_contract public.customer_contracts%rowtype;
begin
  select * into v_contract from public.customer_contracts where id=p_contract_id;
  if not found then raise exception 'contract not found'; end if;
  if not (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.manage',v_contract.organization_id,null)) then raise exception 'permission denied'; end if;
  update public.customer_contracts set status='active',starts_at=coalesce(starts_at,now()),updated_by=auth.uid(),updated_at=now() where id=p_contract_id;
  perform public.sync_contract_entitlements(p_contract_id);
  perform public.record_audit_event('billing.contract.activated','contract',p_contract_id::text,v_contract.organization_id,null,jsonb_build_object('status',v_contract.status),jsonb_build_object('status','active'),'{}'::jsonb,null,null,'warning');
end;
$$;

create or replace function public.record_usage_event(
  p_organization_id uuid,
  p_site_id uuid,
  p_meter_key text,
  p_quantity numeric,
  p_idempotency_key text,
  p_context jsonb default '{}'::jsonb
) returns bigint
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare v_id bigint; v_contract_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_quantity<0 or length(trim(p_idempotency_key))<8 then raise exception 'invalid usage event'; end if;
  if not exists(select 1 from public.usage_meters where key=p_meter_key and active) then raise exception 'unknown meter'; end if;
  if p_site_id is not null and not exists(select 1 from public.sites where id=p_site_id and organization_id=p_organization_id) then raise exception 'site scope mismatch'; end if;
  if not (public.has_permission('platform.billing.manage',null,null) or public.has_permission('modules.manage',p_organization_id,p_site_id) or public.has_permission('sites.manage',p_organization_id,p_site_id)) then raise exception 'permission denied'; end if;

  select c.id into v_contract_id
  from public.customer_contracts c
  left join public.contract_sites cs on cs.contract_id=c.id
  where c.organization_id=p_organization_id and c.status='active'
    and (p_site_id is null or cs.site_id=p_site_id)
    and (c.starts_at is null or c.starts_at<=now())
    and (c.ends_at is null or c.ends_at>now())
  order by c.starts_at desc nulls last
  limit 1;

  insert into public.usage_events(organization_id,site_id,contract_id,meter_key,quantity,idempotency_key,context)
  values(p_organization_id,p_site_id,v_contract_id,p_meter_key,p_quantity,trim(p_idempotency_key),coalesce(p_context,'{}'::jsonb))
  on conflict(meter_key,idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.issue_contract_invoice(
  p_contract_id uuid,
  p_invoice_number text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_due_at timestamptz
) returns uuid
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare
  v_contract public.customer_contracts%rowtype;
  v_invoice_id uuid;
  v_subtotal bigint:=0;
  v_discount bigint:=0;
  v_tax bigint:=0;
  v_usage record;
begin
  select * into v_contract from public.customer_contracts where id=p_contract_id;
  if not found then raise exception 'contract not found'; end if;
  if not (public.has_permission('platform.billing.manage',null,null) or public.has_permission('billing.issue',v_contract.organization_id,null)) then raise exception 'permission denied'; end if;
  if p_period_end<=p_period_start then raise exception 'invalid invoice period'; end if;

  insert into public.invoices(invoice_number,organization_id,contract_id,status,currency,period_start,period_end,issued_at,due_at,created_by)
  values(p_invoice_number,v_contract.organization_id,p_contract_id,'issued',v_contract.currency,p_period_start,p_period_end,now(),p_due_at,auth.uid())
  returning id into v_invoice_id;

  if v_contract.base_amount_minor>0 then
    insert into public.invoice_lines(invoice_id,line_type,reference_key,description,quantity,unit_price_minor,amount_minor)
    values(v_invoice_id,'base','contract.base','هزینه پایه قرارداد',1,v_contract.base_amount_minor,v_contract.base_amount_minor);
    v_subtotal:=v_subtotal+v_contract.base_amount_minor;
  end if;

  for v_usage in
    select ue.meter_key,sum(ue.quantity) as qty,coalesce(cmp.included_quantity,0) as included_qty,
      coalesce(cmp.unit_price_minor,um.default_unit_price_minor) as unit_price,
      um.name_fa
    from public.usage_events ue
    join public.usage_meters um on um.key=ue.meter_key and um.billable
    left join public.contract_meter_prices cmp on cmp.contract_id=p_contract_id and cmp.meter_key=ue.meter_key
    where ue.contract_id=p_contract_id and ue.occurred_at>=p_period_start and ue.occurred_at<p_period_end
    group by ue.meter_key,cmp.included_quantity,cmp.unit_price_minor,um.default_unit_price_minor,um.name_fa
  loop
    if greatest(v_usage.qty-v_usage.included_qty,0)>0 and v_usage.unit_price>0 then
      insert into public.invoice_lines(invoice_id,line_type,reference_key,description,quantity,unit_price_minor,amount_minor)
      values(v_invoice_id,'usage',v_usage.meter_key,v_usage.name_fa,greatest(v_usage.qty-v_usage.included_qty,0),v_usage.unit_price,
        ceil(greatest(v_usage.qty-v_usage.included_qty,0)*v_usage.unit_price)::bigint);
      v_subtotal:=v_subtotal+ceil(greatest(v_usage.qty-v_usage.included_qty,0)*v_usage.unit_price)::bigint;
    end if;
  end loop;

  v_discount:=round(v_subtotal*(v_contract.discount_percent/100.0))::bigint;
  v_tax:=round(greatest(v_subtotal-v_discount,0)*(v_contract.tax_percent/100.0))::bigint;
  update public.invoices set subtotal_minor=v_subtotal,discount_minor=v_discount,tax_minor=v_tax,total_minor=greatest(0,v_subtotal-v_discount+v_tax),updated_at=now() where id=v_invoice_id;

  perform public.record_audit_event('billing.invoice.issued','invoice',v_invoice_id::text,v_contract.organization_id,null,null,jsonb_build_object('contract_id',p_contract_id,'period_start',p_period_start,'period_end',p_period_end,'total_minor',greatest(0,v_subtotal-v_discount+v_tax)),'{}'::jsonb,null,null,'warning');
  return v_invoice_id;
end;
$$;

revoke all on function public.sync_contract_entitlements(uuid) from public,anon;
revoke all on function public.create_customer_contract(uuid,text,uuid,uuid[],text,bigint,public.billing_interval,timestamptz,timestamptz,boolean) from public,anon;
revoke all on function public.activate_contract(uuid) from public,anon;
revoke all on function public.record_usage_event(uuid,uuid,text,numeric,text,jsonb) from public,anon;
revoke all on function public.issue_contract_invoice(uuid,text,timestamptz,timestamptz,timestamptz) from public,anon;
grant execute on function public.sync_contract_entitlements(uuid) to authenticated;
grant execute on function public.create_customer_contract(uuid,text,uuid,uuid[],text,bigint,public.billing_interval,timestamptz,timestamptz,boolean) to authenticated;
grant execute on function public.activate_contract(uuid) to authenticated;
grant execute on function public.record_usage_event(uuid,uuid,text,numeric,text,jsonb) to authenticated;
grant execute on function public.issue_contract_invoice(uuid,text,timestamptz,timestamptz,timestamptz) to authenticated;

grant select on public.plan_catalog,public.plan_entitlements,public.usage_meters to authenticated;
grant select,insert,update,delete on public.customer_contracts,public.contract_sites,public.contract_entitlements,public.contract_meter_prices,public.invoices,public.invoice_lines,public.payment_records to authenticated;
grant select on public.usage_events to authenticated;

insert into public.plan_catalog(key,name_fa,name_en,description_fa,description_en,commercial_tier,billing_interval,base_price_minor,currency,sort_order)
values
('rava.core','راوا Core','RAVA Core','پایه امن برای سایت‌های خدماتی و شرکتی','Secure core for service and corporate sites','core','monthly',0,'IRR',10),
('rava.growth','راوا Growth','RAVA Growth','برای کسب‌وکارهای در حال رشد با ماژول‌های پیشرفته','For growing businesses with advanced modules','premium','monthly',0,'IRR',20),
('rava.enterprise','راوا Enterprise','RAVA Enterprise','قرارداد سفارشی با کنترل و ایزولیشن بیشتر','Custom contract with stronger controls and isolation','enterprise','custom',0,'IRR',30)
on conflict(key) do nothing;

insert into public.usage_meters(key,name_fa,name_en,unit,aggregation,billable,default_unit_price_minor,currency)
values
('ai.tokens','مصرف هوش مصنوعی','AI usage','token','sum',true,0,'IRR'),
('email.sent','ایمیل ارسالی','Emails sent','message','sum',true,0,'IRR'),
('sms.sent','پیامک ارسالی','SMS sent','message','sum',true,0,'IRR'),
('storage.bytes','فضای ذخیره‌سازی','Storage','byte','max',true,0,'IRR'),
('bandwidth.bytes','پهنای باند','Bandwidth','byte','sum',true,0,'IRR'),
('api.requests','درخواست API','API requests','request','sum',true,0,'IRR')
on conflict(key) do nothing;
