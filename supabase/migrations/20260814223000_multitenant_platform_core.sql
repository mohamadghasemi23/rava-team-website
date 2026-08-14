-- RAVA Platform multi-tenant foundation.
-- Existing RAVA content is migrated into one default tenant; future tenants stay isolated by RLS.

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active','grace_period','read_only','maintenance','suspended','archived')),
  site_archetype text not null default 'portfolio' check (site_archetype in ('portfolio','services','commerce','hybrid','custom')),
  default_locale text not null default 'fa-IR',
  timezone text not null default 'Asia/Tehran',
  currency text not null default 'IRR',
  owner_user_id uuid references public.profiles(id) on delete set null,
  suspension_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_staff (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  platform_role text not null check (platform_role in ('platform_owner','platform_admin','seo_manager','support_manager','content_ops','viewer')),
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  tenant_scope uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.role_key not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists tenant_memberships_user_idx on public.tenant_memberships(user_id, tenant_id) where active=true;

create or replace function public.is_platform_staff(allowed_roles text[] default null)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.platform_staff ps
    where ps.user_id=auth.uid() and ps.active=true
      and (allowed_roles is null or ps.platform_role=any(allowed_roles))
  );
$$;

create or replace function public.can_access_tenant(p_tenant_id uuid, allowed_roles public.role_key[] default null)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_platform_staff(array['platform_owner','platform_admin','seo_manager','support_manager','content_ops'])
  or exists(
    select 1 from public.tenant_memberships tm
    join public.profiles p on p.id=tm.user_id
    where tm.tenant_id=p_tenant_id and tm.user_id=auth.uid() and tm.active=true and p.active=true
      and (allowed_roles is null or tm.role=any(allowed_roles))
  );
$$;

grant execute on function public.is_platform_staff(text[]) to authenticated;
grant execute on function public.can_access_tenant(uuid,public.role_key[]) to authenticated;

-- Stable id makes local/dev/prod migration behavior deterministic for the original RAVA tenant.
insert into public.tenants(id,name,slug,status,site_archetype,default_locale,timezone,currency)
values('00000000-0000-4000-8000-000000000001','RAVA TEAM','rava-team','active','portfolio','fa-IR','Asia/Tehran','IRR')
on conflict(id) do nothing;

-- Existing users become members of the original tenant using their legacy role.
insert into public.tenant_memberships(tenant_id,user_id,role,active)
select '00000000-0000-4000-8000-000000000001'::uuid,p.id,p.role,p.active from public.profiles p
on conflict(tenant_id,user_id) do nothing;

-- Existing super admin becomes platform owner. This can later be reassigned explicitly.
insert into public.platform_staff(user_id,platform_role,active)
select p.id,'platform_owner',true from public.profiles p where p.role='super_admin' and p.active=true
on conflict(user_id) do nothing;

-- Tenant-scope existing content. page_blocks inherit the page tenant directly for fast RLS checks.
alter table if exists public.pages add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.page_blocks add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.media_assets add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.projects add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.leads add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.site_settings add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.revisions add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.audit_log add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.system_events add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.analytics_events add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.site_analytics_events add column if not exists tenant_id uuid references public.tenants(id);

update public.pages set tenant_id='00000000-0000-4000-8000-000000000001' where tenant_id is null;
update public.page_blocks b set tenant_id=p.tenant_id from public.pages p where b.page_id=p.id and b.tenant_id is null;
update public.media_assets set tenant_id='00000000-0000-4000-8000-000000000001' where tenant_id is null;
update public.projects set tenant_id='00000000-0000-4000-8000-000000000001' where tenant_id is null;
update public.leads set tenant_id='00000000-0000-4000-8000-000000000001' where tenant_id is null;
update public.site_settings set tenant_id='00000000-0000-4000-8000-000000000001' where tenant_id is null;
update public.revisions set tenant_id='00000000-0000-4000-8000-000000000001' where tenant_id is null;
update public.audit_log set tenant_id='00000000-0000-4000-8000-000000000001' where tenant_id is null;
update public.system_events set tenant_id='00000000-0000-4000-8000-000000000001' where tenant_id is null;

alter table public.pages alter column tenant_id set not null;
alter table public.page_blocks alter column tenant_id set not null;
alter table public.media_assets alter column tenant_id set not null;
alter table public.projects alter column tenant_id set not null;
alter table public.leads alter column tenant_id set not null;
alter table public.site_settings alter column tenant_id set not null;
alter table public.revisions alter column tenant_id set not null;

-- Slugs/settings must be unique within a tenant, not across the whole platform.
alter table public.pages drop constraint if exists pages_slug_key;
alter table public.projects drop constraint if exists projects_slug_key;
alter table public.site_settings drop constraint if exists site_settings_pkey;
create unique index if not exists pages_tenant_slug_uidx on public.pages(tenant_id,slug);
create unique index if not exists projects_tenant_slug_uidx on public.projects(tenant_id,slug);
alter table public.site_settings add constraint site_settings_pkey primary key(tenant_id,key);

create index if not exists pages_tenant_status_idx on public.pages(tenant_id,status,published_at desc);
create index if not exists projects_tenant_status_idx on public.projects(tenant_id,status,published_at desc);
create index if not exists media_tenant_created_idx on public.media_assets(tenant_id,created_at desc);
create index if not exists leads_tenant_created_idx on public.leads(tenant_id,created_at desc);

-- Replace legacy global staff policies with tenant-aware policies.
drop policy if exists "staff read pages" on public.pages;
drop policy if exists "content staff manage pages" on public.pages;
create policy "tenant staff read pages" on public.pages for select to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager','viewer']::public.role_key[]));
create policy "tenant content staff manage pages" on public.pages for all to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[])) with check (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]));

drop policy if exists "staff read blocks" on public.page_blocks;
drop policy if exists "content staff manage blocks" on public.page_blocks;
create policy "tenant staff read blocks" on public.page_blocks for select to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager','viewer']::public.role_key[]));
create policy "tenant content staff manage blocks" on public.page_blocks for all to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[])) with check (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]));

drop policy if exists "staff read media" on public.media_assets;
drop policy if exists "content staff manage media" on public.media_assets;
create policy "tenant staff read media" on public.media_assets for select to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager','viewer']::public.role_key[]));
create policy "tenant content staff manage media" on public.media_assets for all to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[])) with check (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]));

drop policy if exists "staff read projects" on public.projects;
drop policy if exists "content staff manage projects" on public.projects;
create policy "tenant staff read projects" on public.projects for select to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager','viewer']::public.role_key[]));
create policy "tenant content staff manage projects" on public.projects for all to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[])) with check (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]));

drop policy if exists "crm staff read leads" on public.leads;
drop policy if exists "crm staff manage leads" on public.leads;
create policy "tenant crm read leads" on public.leads for select to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','crm']::public.role_key[]));
create policy "tenant crm manage leads" on public.leads for all to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','crm']::public.role_key[])) with check (public.can_access_tenant(tenant_id,array['super_admin','admin','crm']::public.role_key[]));

drop policy if exists "staff read settings" on public.site_settings;
drop policy if exists "admins manage settings" on public.site_settings;
create policy "tenant staff read settings" on public.site_settings for select to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager','viewer']::public.role_key[]));
create policy "tenant admins manage settings" on public.site_settings for all to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[])) with check (public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]));

drop policy if exists "staff read revisions" on public.revisions;
drop policy if exists "content staff create revisions" on public.revisions;
create policy "tenant staff read revisions" on public.revisions for select to authenticated using (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]));
create policy "tenant content staff create revisions" on public.revisions for insert to authenticated with check (public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]));

alter table public.tenants enable row level security;
alter table public.platform_staff enable row level security;
alter table public.tenant_memberships enable row level security;
create policy "platform staff read tenants" on public.tenants for select to authenticated using (public.is_platform_staff(null) or public.can_access_tenant(id,null));
create policy "platform owners manage tenants" on public.tenants for all to authenticated using (public.is_platform_staff(array['platform_owner','platform_admin'])) with check (public.is_platform_staff(array['platform_owner','platform_admin']));
create policy "platform staff read own record" on public.platform_staff for select to authenticated using (user_id=auth.uid() or public.is_platform_staff(array['platform_owner','platform_admin']));
create policy "platform owners manage staff" on public.platform_staff for all to authenticated using (public.is_platform_staff(array['platform_owner'])) with check (public.is_platform_staff(array['platform_owner']));
create policy "members read tenant membership" on public.tenant_memberships for select to authenticated using (user_id=auth.uid() or public.is_platform_staff(null) or public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]));
create policy "platform or tenant superadmin manage membership" on public.tenant_memberships for all to authenticated using (public.is_platform_staff(array['platform_owner','platform_admin']) or public.can_access_tenant(tenant_id,array['super_admin']::public.role_key[])) with check (public.is_platform_staff(array['platform_owner','platform_admin']) or public.can_access_tenant(tenant_id,array['super_admin']::public.role_key[]));
