-- RAVA Theme Engine: content and presentation remain separate.
create table if not exists public.theme_definitions(
  theme_key text primary key check(theme_key~'^[a-z0-9][a-z0-9._-]{1,80}$'),
  name_fa text not null,
  name_en text not null,
  version text not null default '1.0.0',
  status text not null default 'active' check(status in('active','deprecated','archived')),
  description_fa text not null default '',
  description_en text not null default '',
  default_tokens jsonb not null default '{}'::jsonb,
  component_variants jsonb not null default '{}'::jsonb,
  compatibility jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_theme_settings(
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  theme_key text not null references public.theme_definitions(theme_key),
  draft_tokens jsonb not null default '{}'::jsonb,
  published_tokens jsonb not null default '{}'::jsonb,
  draft_variants jsonb not null default '{}'::jsonb,
  published_variants jsonb not null default '{}'::jsonb,
  admin_skin_sync boolean not null default true,
  updated_by uuid references public.profiles(id),
  published_by uuid references public.profiles(id),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.theme_revisions(
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  theme_key text not null,
  snapshot jsonb not null,
  action text not null check(action in('draft_save','publish','restore','theme_switch')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists theme_revisions_tenant_created_idx on public.theme_revisions(tenant_id,created_at desc);

alter table public.theme_definitions enable row level security;
alter table public.tenant_theme_settings enable row level security;
alter table public.theme_revisions enable row level security;

create policy theme_definitions_public_read on public.theme_definitions for select to anon using(status='active');
create policy theme_definitions_authenticated_read on public.theme_definitions for select to authenticated using(true);
create policy theme_definitions_platform_manage on public.theme_definitions for all to authenticated using(public.is_platform_staff(array['platform_owner','platform_admin'])) with check(public.is_platform_staff(array['platform_owner','platform_admin']));
create policy tenant_theme_public_read on public.tenant_theme_settings for select to anon using(exists(select 1 from public.tenants t where t.id=tenant_id and t.status in('active','grace_period','read_only','maintenance')));
create policy tenant_theme_read on public.tenant_theme_settings for select to authenticated using(public.can_access_tenant(tenant_id,null));
create policy tenant_theme_manage on public.tenant_theme_settings for all to authenticated using(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[])) with check(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]));
create policy theme_revisions_read on public.theme_revisions for select to authenticated using(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]));
create policy theme_revisions_insert on public.theme_revisions for insert to authenticated with check(public.can_access_tenant(tenant_id,array['super_admin','admin']::public.role_key[]));

insert into public.theme_definitions(theme_key,name_fa,name_en,version,description_fa,description_en,default_tokens,component_variants)
values
('rava-editorial-dark','ادیتوریال دارک','Editorial Dark','1.0.0','فضای خلاق، تیره و تصویرمحور برای استودیوها و پورتفولیوهای حرفه‌ای.','A dark, image-led editorial system for creative studios and premium portfolios.',
'{"color":{"background":"#0b0f17","surface":"#111722","text":"#f5f7fb","muted":"#9aa5b5","accent":"#5f7cff","border":"rgba(255,255,255,.10)"},"radius":{"sm":10,"md":18,"lg":30},"layout":{"container":1240,"sectionGap":96},"motion":{"intensity":1},"typography":{"fa":"system","en":"system"}}'::jsonb,
'{"header":"studio-01","hero":"editorial-01","portfolio":"asymmetric-01","footer":"minimal-01","button":"pill-01"}'::jsonb),
('rava-minimal-light','مینیمال روشن','Minimal Light','1.0.0','قالب روشن، تمیز و آرام برای برندهای خدماتی، معماری و شرکتی.','A clean, calm light system for services, architecture and corporate brands.',
'{"color":{"background":"#f7f7f4","surface":"#ffffff","text":"#111318","muted":"#6d7480","accent":"#183d7a","border":"rgba(17,19,24,.12)"},"radius":{"sm":8,"md":16,"lg":24},"layout":{"container":1180,"sectionGap":88},"motion":{"intensity":0.7},"typography":{"fa":"system","en":"system"}}'::jsonb,
'{"header":"minimal-01","hero":"split-01","portfolio":"grid-01","footer":"minimal-01","button":"soft-01"}'::jsonb)
on conflict(theme_key) do nothing;

insert into public.tenant_theme_settings(tenant_id,theme_key,draft_tokens,published_tokens,draft_variants,published_variants)
select t.id,'rava-editorial-dark',d.default_tokens,d.default_tokens,d.component_variants,d.component_variants
from public.tenants t cross join public.theme_definitions d where d.theme_key='rava-editorial-dark'
on conflict(tenant_id) do nothing;
