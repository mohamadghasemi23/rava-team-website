create table if not exists public.tenant_modules (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_key text not null check (module_key ~ '^[a-z0-9._-]{2,80}$'),
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id,module_key)
);

create table if not exists public.service_entitlements (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_key text not null check (service_key ~ '^[a-z0-9._-]{2,80}$'),
  status text not null default 'inactive' check(status in ('inactive','trial','active','grace_period','suspended','cancelled')),
  managed_by_platform boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(tenant_id,service_key)
);

create table if not exists public.payment_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider_key text not null check(provider_key ~ '^[a-z0-9._-]{2,80}$'),
  mode text not null default 'test' check(mode in ('test','live')),
  status text not null default 'disconnected' check(status in ('disconnected','pending','connected','error','disabled')),
  provider_account_ref text,
  secret_reference text,
  public_config jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,provider_key,mode)
);

alter table public.tenant_modules enable row level security;
alter table public.service_entitlements enable row level security;
alter table public.payment_connections enable row level security;

create policy "tenant modules read" on public.tenant_modules for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy "platform or tenant admins manage modules" on public.tenant_modules for all to authenticated using(public.is_platform_staff(array['platform_owner','platform_admin']) or public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[])) with check(public.is_platform_staff(array['platform_owner','platform_admin']) or public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]));

create policy "tenant service entitlements read" on public.service_entitlements for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy "platform manages service entitlements" on public.service_entitlements for all to authenticated using(public.is_platform_staff(array['platform_owner','platform_admin'])) with check(public.is_platform_staff(array['platform_owner','platform_admin']));

create policy "tenant payment connection read" on public.payment_connections for select to authenticated using(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]) or public.is_platform_staff(array['platform_owner','platform_admin','support_manager']));
create policy "platform or tenant superadmin manage payment connection" on public.payment_connections for all to authenticated using(public.is_platform_staff(array['platform_owner','platform_admin']) or public.can_access_tenant(tenant_id,array['super_admin']::public.role_key[])) with check(public.is_platform_staff(array['platform_owner','platform_admin']) or public.can_access_tenant(tenant_id,array['super_admin']::public.role_key[]));

-- Original RAVA tenant starts as a portfolio/services-ready site. Commerce stays disabled until intentionally enabled.
insert into public.tenant_modules(tenant_id,module_key,enabled) values
('00000000-0000-4000-8000-000000000001','portfolio',true),
('00000000-0000-4000-8000-000000000001','services',true),
('00000000-0000-4000-8000-000000000001','blog',false),
('00000000-0000-4000-8000-000000000001','catalog',false),
('00000000-0000-4000-8000-000000000001','cart',false),
('00000000-0000-4000-8000-000000000001','checkout',false),
('00000000-0000-4000-8000-000000000001','orders',false),
('00000000-0000-4000-8000-000000000001','payments',false),
('00000000-0000-4000-8000-000000000001','booking',false)
on conflict(tenant_id,module_key) do nothing;

-- Managed services are commercial entitlements, separate from site modules.
insert into public.service_entitlements(tenant_id,service_key,status,managed_by_platform) values
('00000000-0000-4000-8000-000000000001','managed_seo','active',true),
('00000000-0000-4000-8000-000000000001','advanced_analytics','active',true)
on conflict(tenant_id,service_key) do nothing;
