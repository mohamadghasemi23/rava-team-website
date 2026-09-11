-- RAVA Platform Core Foundation
-- Multi-tenant organizations/sites, scoped authorization, module entitlements,
-- environments/domains, and bilingual help foundations.

create schema if not exists private;

create type public.organization_status as enum ('active','suspended','archived');
create type public.site_status as enum ('draft','active','suspended','archived');
create type public.scope_kind as enum ('platform','organization','site');
create type public.membership_status as enum ('invited','active','suspended','revoked');
create type public.permission_effect as enum ('allow','deny');
create type public.module_status as enum ('active','beta','deprecated','disabled');
create type public.entitlement_status as enum ('active','trial','grace','suspended','expired');
create type public.environment_kind as enum ('preview','staging','production');
create type public.help_status as enum ('draft','published','archived');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.organization_status not null default 'active',
  default_locale text not null default 'fa',
  billing_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  constraint organizations_locale_format check (default_locale ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  status public.site_status not null default 'draft',
  primary_locale text not null default 'fa',
  default_currency text not null default 'IRR',
  timezone text not null default 'Asia/Tehran',
  theme_config jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  constraint sites_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  constraint sites_locale_format check (primary_locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint sites_currency_format check (default_currency ~ '^[A-Z]{3}$')
);

create table public.site_environments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  kind public.environment_kind not null,
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, kind)
);

create table public.site_domains (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  environment_id uuid references public.site_environments(id) on delete cascade,
  hostname text not null,
  is_primary boolean not null default false,
  redirect_to_primary boolean not null default true,
  verified_at timestamptz,
  ssl_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (hostname),
  constraint site_domains_hostname_format check (hostname = lower(hostname) and hostname !~ '[/:?#]')
);

create unique index site_domains_one_primary_per_environment
  on public.site_domains (site_id, environment_id)
  where is_primary = true;

create table public.module_catalog (
  key text primary key,
  name_fa text not null,
  name_en text not null,
  description_fa text not null default '',
  description_en text not null default '',
  category text not null,
  status public.module_status not null default 'active',
  core boolean not null default false,
  commercial_tier text not null default 'core',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  key text primary key,
  module_key text references public.module_catalog(key) on delete set null,
  name_fa text not null,
  name_en text not null,
  description_fa text not null default '',
  description_en text not null default '',
  risk_level text not null default 'normal',
  created_at timestamptz not null default now(),
  constraint permissions_key_format check (key ~ '^[a-z0-9_.:-]+$'),
  constraint permissions_risk_level check (risk_level in ('low','normal','high','critical'))
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  scope_type public.scope_kind not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  key text not null,
  name_fa text not null,
  name_en text not null,
  description_fa text not null default '',
  description_en text not null default '',
  is_system boolean not null default false,
  immutable boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_scope_shape check (
    (scope_type = 'platform' and organization_id is null and site_id is null) or
    (scope_type = 'organization' and organization_id is not null and site_id is null) or
    (scope_type = 'site' and organization_id is not null and site_id is not null)
  ),
  constraint roles_key_format check (key ~ '^[a-z0-9_.:-]+$')
);

create unique index roles_platform_key_unique
  on public.roles (key) where scope_type = 'platform';
create unique index roles_organization_key_unique
  on public.roles (organization_id, key) where scope_type = 'organization';
create unique index roles_site_key_unique
  on public.roles (site_id, key) where scope_type = 'site';

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope_type public.scope_kind not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  status public.membership_status not null default 'invited',
  is_owner boolean not null default false,
  invited_by uuid references public.profiles(id),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_scope_shape check (
    (scope_type = 'platform' and organization_id is null and site_id is null) or
    (scope_type = 'organization' and organization_id is not null and site_id is null) or
    (scope_type = 'site' and organization_id is not null and site_id is not null)
  )
);

create unique index memberships_platform_user_unique
  on public.memberships (user_id) where scope_type = 'platform';
create unique index memberships_organization_user_unique
  on public.memberships (organization_id, user_id) where scope_type = 'organization';
create unique index memberships_site_user_unique
  on public.memberships (site_id, user_id) where scope_type = 'site';

create table public.membership_roles (
  membership_id uuid not null references public.memberships(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (membership_id, role_id)
);

create table public.permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope_type public.scope_kind not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  effect public.permission_effect not null,
  reason text,
  granted_by uuid references public.profiles(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint permission_overrides_scope_shape check (
    (scope_type = 'platform' and organization_id is null and site_id is null) or
    (scope_type = 'organization' and organization_id is not null and site_id is null) or
    (scope_type = 'site' and organization_id is not null and site_id is not null)
  )
);

create unique index permission_overrides_unique_scope
  on public.permission_overrides (
    user_id,
    scope_type,
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid),
    permission_key
  );

create table public.site_entitlements (
  site_id uuid not null references public.sites(id) on delete cascade,
  module_key text not null references public.module_catalog(key) on delete restrict,
  status public.entitlement_status not null default 'active',
  tier text not null default 'core',
  enabled boolean not null default true,
  limits jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  grace_until timestamptz,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (site_id, module_key)
);

create table public.help_topics (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  module_key text references public.module_catalog(key) on delete set null,
  feature_key text,
  minimum_permission text references public.permissions(key) on delete set null,
  status public.help_status not null default 'draft',
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_topics_key_format check (key ~ '^[a-z0-9_.:-]+$')
);

create table public.help_translations (
  topic_id uuid not null references public.help_topics(id) on delete cascade,
  locale text not null,
  title text not null,
  summary text not null default '',
  body_markdown text not null default '',
  steps jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (topic_id, locale),
  constraint help_translations_locale_format check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint help_translations_version_positive check (version > 0)
);

-- Existing audit_log becomes tenant-aware and correlation-ready.
alter table public.audit_log
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists site_id uuid references public.sites(id) on delete set null,
  add column if not exists request_id uuid,
  add column if not exists correlation_id uuid,
  add column if not exists severity text not null default 'info',
  add column if not exists context jsonb not null default '{}'::jsonb;

alter table public.audit_log
  drop constraint if exists audit_log_severity_check;
alter table public.audit_log
  add constraint audit_log_severity_check check (severity in ('debug','info','notice','warning','error','critical'));

create index organizations_status_idx on public.organizations(status);
create index sites_organization_status_idx on public.sites(organization_id, status);
create index site_environments_site_kind_idx on public.site_environments(site_id, kind);
create index site_domains_site_idx on public.site_domains(site_id);
create index roles_scope_idx on public.roles(scope_type, organization_id, site_id);
create index role_permissions_permission_idx on public.role_permissions(permission_key);
create index memberships_user_scope_idx on public.memberships(user_id, scope_type, organization_id, site_id) where status = 'active';
create index membership_roles_role_idx on public.membership_roles(role_id);
create index permission_overrides_user_scope_idx on public.permission_overrides(user_id, scope_type, organization_id, site_id);
create index site_entitlements_status_idx on public.site_entitlements(site_id, enabled, status);
create index help_topics_module_status_idx on public.help_topics(module_key, status, sort_order);
create index audit_log_org_created_idx on public.audit_log(organization_id, created_at desc);
create index audit_log_site_created_idx on public.audit_log(site_id, created_at desc);
create index audit_log_correlation_idx on public.audit_log(correlation_id) where correlation_id is not null;

-- Catalog seeds. Core security/help capabilities are never disabled as a substitute for a paid plan.
insert into public.module_catalog (key,name_fa,name_en,category,core,commercial_tier) values
  ('cms','مدیریت محتوا','CMS','content',true,'core'),
  ('media','رسانه','Media','content',true,'core'),
  ('seo_core','سئوی پایه','SEO Core','growth',true,'core'),
  ('analytics_core','آمار پایه','Analytics Core','analytics',true,'core'),
  ('security','امنیت','Security','platform',true,'core'),
  ('help','راهنما و آموزش','Help & Academy','platform',true,'core'),
  ('commerce','فروشگاه','Commerce','commerce',false,'premium'),
  ('crm','مدیریت مشتری','CRM','sales',false,'premium'),
  ('automation','اتوماسیون','Automation','growth',false,'premium'),
  ('seo_ai','سئوی هوشمند','AI SEO','ai',false,'premium'),
  ('analytics_pro','آمار پیشرفته','Advanced Analytics','analytics',false,'premium'),
  ('booking','رزرو','Booking','operations',false,'premium'),
  ('membership','عضویت و اشتراک','Membership','commerce',false,'premium'),
  ('loyalty','باشگاه مشتریان','Loyalty','growth',false,'premium'),
  ('support','تیکت و پشتیبانی','Support','operations',false,'premium')
on conflict (key) do nothing;

insert into public.permissions (key,module_key,name_fa,name_en,risk_level) values
  ('platform.organizations.manage','security','مدیریت سازمان‌ها','Manage organizations','critical'),
  ('platform.sites.manage','security','مدیریت سایت‌های پلتفرم','Manage platform sites','critical'),
  ('platform.modules.manage','security','مدیریت ماژول‌ها','Manage modules','critical'),
  ('platform.roles.manage','security','مدیریت نقش‌های پلتفرم','Manage platform roles','critical'),
  ('platform.audit.view','security','مشاهده ممیزی پلتفرم','View platform audit','high'),
  ('platform.help.manage','help','مدیریت راهنمای سراسری','Manage global help','high'),
  ('platform.support.impersonate','support','ورود پشتیبانی به فضای مشتری','Support impersonation','critical'),
  ('organizations.view','security','مشاهده سازمان','View organization','low'),
  ('organizations.manage','security','مدیریت سازمان','Manage organization','high'),
  ('sites.view','security','مشاهده سایت','View site','low'),
  ('sites.manage','security','مدیریت سایت','Manage site','high'),
  ('users.manage','security','مدیریت کاربران','Manage users','critical'),
  ('roles.manage','security','مدیریت نقش‌ها و دسترسی‌ها','Manage roles and permissions','critical'),
  ('modules.manage','security','مدیریت امکانات قرارداد','Manage entitlements','critical'),
  ('cms.manage','cms','مدیریت محتوا','Manage content','normal'),
  ('media.manage','media','مدیریت رسانه','Manage media','normal'),
  ('seo.manage','seo_core','مدیریت سئو','Manage SEO','normal'),
  ('analytics.view','analytics_core','مشاهده آمار','View analytics','low'),
  ('commerce.manage','commerce','مدیریت فروشگاه','Manage commerce','high'),
  ('logs.view','security','مشاهده لاگ‌ها','View logs','high'),
  ('help.view','help','مشاهده راهنما','View help','low'),
  ('help.manage','help','مدیریت راهنما','Manage help','high')
on conflict (key) do nothing;

-- Permission evaluation is centralized and uses the authenticated identity only.
create or replace function private.user_has_permission(
  required_permission text,
  organization_scope uuid default null,
  site_scope uuid default null
) returns boolean
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_super boolean := false;
  v_denied boolean := false;
  v_allowed boolean := false;
begin
  if v_user is null then return false; end if;

  select exists(
    select 1 from public.profiles p
    where p.id = v_user and p.active = true and p.role = 'super_admin'
  ) into v_super;
  if v_super then return true; end if;

  select exists(
    select 1
    from public.permission_overrides po
    where po.user_id = v_user
      and po.permission_key = required_permission
      and po.effect = 'deny'
      and (po.expires_at is null or po.expires_at > now())
      and (
        po.scope_type = 'platform' or
        (po.scope_type = 'organization' and po.organization_id = organization_scope) or
        (po.scope_type = 'site' and po.site_id = site_scope)
      )
  ) into v_denied;
  if v_denied then return false; end if;

  select exists(
    select 1
    from public.permission_overrides po
    where po.user_id = v_user
      and po.permission_key = required_permission
      and po.effect = 'allow'
      and (po.expires_at is null or po.expires_at > now())
      and (
        po.scope_type = 'platform' or
        (po.scope_type = 'organization' and po.organization_id = organization_scope) or
        (po.scope_type = 'site' and po.site_id = site_scope)
      )
  ) into v_allowed;
  if v_allowed then return true; end if;

  return exists(
    select 1
    from public.memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    where m.user_id = v_user
      and m.status = 'active'
      and rp.permission_key = required_permission
      and (
        m.scope_type = 'platform' or
        (m.scope_type = 'organization' and m.organization_id = organization_scope) or
        (m.scope_type = 'site' and m.site_id = site_scope)
      )
  );
end;
$$;

revoke all on function private.user_has_permission(text,uuid,uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.user_has_permission(text,uuid,uuid) to authenticated;

create or replace function public.has_permission(
  required_permission text,
  organization_scope uuid default null,
  site_scope uuid default null
) returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.user_has_permission(required_permission, organization_scope, site_scope);
$$;

revoke all on function public.has_permission(text,uuid,uuid) from public;
grant execute on function public.has_permission(text,uuid,uuid) to authenticated;

-- RLS is enabled on every exposed table. Default state is deny unless a policy below grants access.
alter table public.organizations enable row level security;
alter table public.sites enable row level security;
alter table public.site_environments enable row level security;
alter table public.site_domains enable row level security;
alter table public.module_catalog enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships enable row level security;
alter table public.membership_roles enable row level security;
alter table public.permission_overrides enable row level security;
alter table public.site_entitlements enable row level security;
alter table public.help_topics enable row level security;
alter table public.help_translations enable row level security;

create policy organizations_select on public.organizations for select to authenticated
using (private.user_has_permission('organizations.view', id, null) or private.user_has_permission('organizations.manage', id, null) or private.user_has_permission('platform.organizations.manage', null, null));
create policy organizations_manage on public.organizations for all to authenticated
using (private.user_has_permission('organizations.manage', id, null) or private.user_has_permission('platform.organizations.manage', null, null))
with check (private.user_has_permission('platform.organizations.manage', null, null));

create policy sites_select on public.sites for select to authenticated
using (private.user_has_permission('sites.view', organization_id, id) or private.user_has_permission('sites.manage', organization_id, id) or private.user_has_permission('platform.sites.manage', null, null));
create policy sites_manage on public.sites for all to authenticated
using (private.user_has_permission('sites.manage', organization_id, id) or private.user_has_permission('platform.sites.manage', null, null))
with check (private.user_has_permission('organizations.manage', organization_id, null) or private.user_has_permission('platform.sites.manage', null, null));

create policy site_environments_access on public.site_environments for all to authenticated
using (exists(select 1 from public.sites s where s.id = site_id and (private.user_has_permission('sites.view', s.organization_id, s.id) or private.user_has_permission('sites.manage', s.organization_id, s.id) or private.user_has_permission('platform.sites.manage', null, null))))
with check (exists(select 1 from public.sites s where s.id = site_id and (private.user_has_permission('sites.manage', s.organization_id, s.id) or private.user_has_permission('platform.sites.manage', null, null))));

create policy site_domains_access on public.site_domains for all to authenticated
using (exists(select 1 from public.sites s where s.id = site_id and (private.user_has_permission('sites.view', s.organization_id, s.id) or private.user_has_permission('sites.manage', s.organization_id, s.id) or private.user_has_permission('platform.sites.manage', null, null))))
with check (exists(select 1 from public.sites s where s.id = site_id and (private.user_has_permission('sites.manage', s.organization_id, s.id) or private.user_has_permission('platform.sites.manage', null, null))));

create policy module_catalog_read on public.module_catalog for select to authenticated using (true);
create policy module_catalog_manage on public.module_catalog for all to authenticated
using (private.user_has_permission('platform.modules.manage', null, null))
with check (private.user_has_permission('platform.modules.manage', null, null));

create policy permissions_read on public.permissions for select to authenticated using (true);
create policy permissions_manage on public.permissions for all to authenticated
using (private.user_has_permission('platform.roles.manage', null, null))
with check (private.user_has_permission('platform.roles.manage', null, null));

create policy roles_select on public.roles for select to authenticated
using (
  private.user_has_permission('platform.roles.manage', null, null) or
  (scope_type = 'organization' and private.user_has_permission('roles.manage', organization_id, null)) or
  (scope_type = 'site' and private.user_has_permission('roles.manage', organization_id, site_id))
);
create policy roles_manage on public.roles for all to authenticated
using (
  private.user_has_permission('platform.roles.manage', null, null) or
  (scope_type = 'organization' and private.user_has_permission('roles.manage', organization_id, null)) or
  (scope_type = 'site' and private.user_has_permission('roles.manage', organization_id, site_id))
)
with check (
  private.user_has_permission('platform.roles.manage', null, null) or
  (scope_type = 'organization' and private.user_has_permission('roles.manage', organization_id, null)) or
  (scope_type = 'site' and private.user_has_permission('roles.manage', organization_id, site_id))
);

create policy role_permissions_access on public.role_permissions for all to authenticated
using (exists(select 1 from public.roles r where r.id = role_id and (private.user_has_permission('platform.roles.manage', null, null) or private.user_has_permission('roles.manage', r.organization_id, r.site_id))))
with check (exists(select 1 from public.roles r where r.id = role_id and (private.user_has_permission('platform.roles.manage', null, null) or private.user_has_permission('roles.manage', r.organization_id, r.site_id))));

create policy memberships_select on public.memberships for select to authenticated
using (
  user_id = auth.uid() or
  private.user_has_permission('platform.roles.manage', null, null) or
  (scope_type = 'organization' and private.user_has_permission('users.manage', organization_id, null)) or
  (scope_type = 'site' and private.user_has_permission('users.manage', organization_id, site_id))
);
create policy memberships_manage on public.memberships for all to authenticated
using (
  private.user_has_permission('platform.roles.manage', null, null) or
  (scope_type = 'organization' and private.user_has_permission('users.manage', organization_id, null)) or
  (scope_type = 'site' and private.user_has_permission('users.manage', organization_id, site_id))
)
with check (
  private.user_has_permission('platform.roles.manage', null, null) or
  (scope_type = 'organization' and private.user_has_permission('users.manage', organization_id, null)) or
  (scope_type = 'site' and private.user_has_permission('users.manage', organization_id, site_id))
);

create policy membership_roles_access on public.membership_roles for all to authenticated
using (exists(select 1 from public.memberships m where m.id = membership_id and (m.user_id = auth.uid() or private.user_has_permission('platform.roles.manage', null, null) or private.user_has_permission('roles.manage', m.organization_id, m.site_id))))
with check (exists(select 1 from public.memberships m where m.id = membership_id and (private.user_has_permission('platform.roles.manage', null, null) or private.user_has_permission('roles.manage', m.organization_id, m.site_id))));

create policy permission_overrides_select on public.permission_overrides for select to authenticated
using (user_id = auth.uid() or private.user_has_permission('platform.roles.manage', null, null) or private.user_has_permission('roles.manage', organization_id, site_id));
create policy permission_overrides_manage on public.permission_overrides for all to authenticated
using (private.user_has_permission('platform.roles.manage', null, null) or private.user_has_permission('roles.manage', organization_id, site_id))
with check (private.user_has_permission('platform.roles.manage', null, null) or private.user_has_permission('roles.manage', organization_id, site_id));

create policy entitlements_select on public.site_entitlements for select to authenticated
using (exists(select 1 from public.sites s where s.id = site_id and (private.user_has_permission('sites.view', s.organization_id, s.id) or private.user_has_permission('modules.manage', s.organization_id, s.id) or private.user_has_permission('platform.modules.manage', null, null))));
create policy entitlements_manage on public.site_entitlements for all to authenticated
using (exists(select 1 from public.sites s where s.id = site_id and (private.user_has_permission('modules.manage', s.organization_id, s.id) or private.user_has_permission('platform.modules.manage', null, null))))
with check (exists(select 1 from public.sites s where s.id = site_id and (private.user_has_permission('modules.manage', s.organization_id, s.id) or private.user_has_permission('platform.modules.manage', null, null))));

create policy help_topics_read on public.help_topics for select to authenticated using (status = 'published' or private.user_has_permission('platform.help.manage', null, null) or private.user_has_permission('help.manage', null, null));
create policy help_topics_manage on public.help_topics for all to authenticated
using (private.user_has_permission('platform.help.manage', null, null))
with check (private.user_has_permission('platform.help.manage', null, null));
create policy help_translations_read on public.help_translations for select to authenticated
using (exists(select 1 from public.help_topics h where h.id = topic_id and (h.status = 'published' or private.user_has_permission('platform.help.manage', null, null))));
create policy help_translations_manage on public.help_translations for all to authenticated
using (private.user_has_permission('platform.help.manage', null, null))
with check (private.user_has_permission('platform.help.manage', null, null));

-- Tighten the legacy audit table: clients may read only with permission; writes are reserved for trusted server paths.
drop policy if exists "admins read audit log" on public.audit_log;
drop policy if exists "authenticated staff create audit events" on public.audit_log;
revoke insert, update, delete on public.audit_log from authenticated;
create policy audit_log_select on public.audit_log for select to authenticated
using (
  private.user_has_permission('platform.audit.view', null, null) or
  private.user_has_permission('logs.view', organization_id, site_id)
);

grant select on public.module_catalog, public.permissions to authenticated;
grant select, insert, update, delete on public.organizations, public.sites, public.site_environments, public.site_domains, public.roles, public.role_permissions, public.memberships, public.membership_roles, public.permission_overrides, public.site_entitlements, public.help_topics, public.help_translations to authenticated;
grant select on public.audit_log to authenticated;
