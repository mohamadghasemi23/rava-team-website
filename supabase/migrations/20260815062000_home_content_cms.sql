-- Versioned homepage content per tenant: draft, publish and restore-friendly snapshots.
create table if not exists public.home_content_settings(
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 draft jsonb not null default '{}'::jsonb,
 published jsonb not null default '{}'::jsonb,
 updated_by uuid references public.profiles(id) on delete set null,
 published_by uuid references public.profiles(id) on delete set null,
 updated_at timestamptz not null default now(),
 published_at timestamptz
);
create table if not exists public.home_content_revisions(
 id bigint generated always as identity primary key,
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 action text not null check(action in('draft_save','publish','restore')),
 snapshot jsonb not null,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists home_content_revisions_tenant_idx on public.home_content_revisions(tenant_id,created_at desc);
alter table public.home_content_settings enable row level security;
alter table public.home_content_revisions enable row level security;
create policy home_content_public_read on public.home_content_settings for select to anon using(exists(select 1 from public.tenants t where t.id=tenant_id and t.status in('active','grace_period','read_only','maintenance')));
create policy home_content_authenticated_read on public.home_content_settings for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy home_content_manage on public.home_content_settings for all to authenticated using(public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[])) with check(public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]));
create policy home_content_revisions_read on public.home_content_revisions for select to authenticated using(public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]));
create policy home_content_revisions_insert on public.home_content_revisions for insert to authenticated with check(public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]));
