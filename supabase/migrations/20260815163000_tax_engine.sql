-- RAVA Tax Engine V1. Optional per tenant, disabled by default.
create table if not exists public.tax_settings(
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 enabled boolean not null default false,
 mode text not null default 'exclusive' check(mode in('exclusive','inclusive')),
 rate numeric(8,4) not null default 0 check(rate>=0 and rate<=100),
 apply_to_shipping boolean not null default false,
 label_fa text not null default 'مالیات',
 label_en text not null default 'Tax',
 country_code text,
 region_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.tax_settings enable row level security;
create policy tax_settings_admin on public.tax_settings for all to authenticated using(public.can_access_tenant(tenant_id,null)) with check(public.can_access_tenant(tenant_id,null));
insert into public.tax_settings(tenant_id) select id from public.tenants on conflict(tenant_id) do nothing;
