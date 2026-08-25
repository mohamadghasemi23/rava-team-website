-- Tenant-scope the legacy CMS without deleting or guessing ownership for legacy rows.
-- Existing rows remain site_id NULL and are visible only to platform site managers in
-- authenticated administration paths until an explicit, audited backfill is approved.

alter table public.pages
  add column site_id uuid references public.sites(id) on delete cascade;
alter table public.media_assets
  add column site_id uuid references public.sites(id) on delete cascade;
alter table public.projects
  add column site_id uuid references public.sites(id) on delete cascade;
alter table public.leads
  add column site_id uuid references public.sites(id) on delete cascade;
alter table public.site_settings
  add column id uuid not null default gen_random_uuid(),
  add column site_id uuid references public.sites(id) on delete cascade;
alter table public.revisions
  add column site_id uuid references public.sites(id) on delete cascade;

alter table public.pages drop constraint if exists pages_slug_key;
alter table public.projects drop constraint if exists projects_slug_key;
alter table public.site_settings drop constraint if exists site_settings_pkey;
alter table public.site_settings add constraint site_settings_pkey primary key (id);

create unique index pages_legacy_slug_unique on public.pages(slug) where site_id is null;
create unique index pages_site_slug_unique on public.pages(site_id,slug) where site_id is not null;
create unique index projects_legacy_slug_unique on public.projects(slug) where site_id is null;
create unique index projects_site_slug_unique on public.projects(site_id,slug) where site_id is not null;
create unique index site_settings_legacy_key_unique on public.site_settings(key) where site_id is null;
create unique index site_settings_site_key_unique on public.site_settings(site_id,key) where site_id is not null;

create index pages_site_status_updated_idx on public.pages(site_id,status,updated_at desc);
create index media_assets_site_created_idx on public.media_assets(site_id,created_at desc) where deleted_at is null;
create index projects_site_status_updated_idx on public.projects(site_id,status,updated_at desc);
create index leads_site_status_created_idx on public.leads(site_id,status,created_at desc);
create index revisions_site_entity_created_idx on public.revisions(site_id,entity_type,entity_id,created_at desc);
create index page_blocks_page_position_idx on public.page_blocks(page_id,position);

-- A project cover must belong to the same site. MATCH SIMPLE preserves nullable
-- legacy records until their ownership can be explicitly backfilled.
create unique index media_assets_id_site_unique on public.media_assets(id,site_id);
alter table public.projects drop constraint if exists projects_cover_media_id_fkey;
alter table public.projects
  add constraint projects_cover_media_site_fkey
  foreign key (cover_media_id,site_id)
  references public.media_assets(id,site_id)
  on delete set null (cover_media_id);

insert into public.permissions(key,module_key,name_fa,name_en,risk_level) values
  ('cms.view','cms','مشاهده محتوای سایت','View site content','low'),
  ('cms.publish','cms','انتشار محتوای سایت','Publish site content','high'),
  ('leads.view','cms','مشاهده سرنخ‌های سایت','View site leads','high'),
  ('leads.manage','cms','مدیریت سرنخ‌های سایت','Manage site leads','high'),
  ('settings.manage','cms','مدیریت تنظیمات سایت','Manage site settings','high')
on conflict(key) do nothing;

create or replace function private.can_view_site_content(p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private,pg_temp
as $$
  select p_site_id is not null and (
    public.has_permission('platform.sites.manage',null,null)
    or public.has_permission('sites.view',private.site_org(p_site_id),p_site_id)
    or public.has_permission('cms.view',private.site_org(p_site_id),p_site_id)
    or public.has_permission('cms.manage',private.site_org(p_site_id),p_site_id)
  )
$$;
revoke all on function private.can_view_site_content(uuid) from public,anon,authenticated;
grant execute on function private.can_view_site_content(uuid) to authenticated;

create or replace function private.can_manage_site_resource(p_site_id uuid,p_permission text)
returns boolean
language sql
stable
security definer
set search_path=public,private,pg_temp
as $$
  select p_site_id is not null and (
    public.has_permission('platform.sites.manage',null,null)
    or public.has_permission(p_permission,private.site_org(p_site_id),p_site_id)
  )
$$;
revoke all on function private.can_manage_site_resource(uuid,text) from public,anon,authenticated;
grant execute on function private.can_manage_site_resource(uuid,text) to authenticated;

-- Remove legacy global-role policies. Legacy NULL-scoped administration is kept
-- only for platform site managers; tenant users can access only their site scope.
drop policy if exists "staff read pages" on public.pages;
drop policy if exists "content staff manage pages" on public.pages;
drop policy if exists "staff read blocks" on public.page_blocks;
drop policy if exists "content staff manage blocks" on public.page_blocks;
drop policy if exists "staff read media" on public.media_assets;
drop policy if exists "content staff manage media" on public.media_assets;
drop policy if exists "staff read projects" on public.projects;
drop policy if exists "content staff manage projects" on public.projects;
drop policy if exists "crm staff read leads" on public.leads;
drop policy if exists "crm staff manage leads" on public.leads;
drop policy if exists "staff read settings" on public.site_settings;
drop policy if exists "admins manage settings" on public.site_settings;
drop policy if exists "staff read revisions" on public.revisions;
drop policy if exists "content staff create revisions" on public.revisions;

create policy pages_tenant_read on public.pages for select to authenticated
using (
  private.can_view_site_content(site_id)
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);
create policy pages_tenant_manage on public.pages for all to authenticated
using (
  private.can_manage_site_resource(site_id,'cms.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
)
with check (
  private.can_manage_site_resource(site_id,'cms.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);

create policy page_blocks_tenant_read on public.page_blocks for select to authenticated
using (exists(
  select 1 from public.pages p
  where p.id=page_id and (
    private.can_view_site_content(p.site_id)
    or (p.site_id is null and public.has_permission('platform.sites.manage',null,null))
  )
));
create policy page_blocks_tenant_manage on public.page_blocks for all to authenticated
using (exists(
  select 1 from public.pages p
  where p.id=page_id and (
    private.can_manage_site_resource(p.site_id,'cms.manage')
    or (p.site_id is null and public.has_permission('platform.sites.manage',null,null))
  )
))
with check (exists(
  select 1 from public.pages p
  where p.id=page_id and (
    private.can_manage_site_resource(p.site_id,'cms.manage')
    or (p.site_id is null and public.has_permission('platform.sites.manage',null,null))
  )
));

create policy media_assets_tenant_read on public.media_assets for select to authenticated
using (
  private.can_view_site_content(site_id)
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);
create policy media_assets_tenant_manage on public.media_assets for all to authenticated
using (
  private.can_manage_site_resource(site_id,'media.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
)
with check (
  private.can_manage_site_resource(site_id,'media.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);

create policy projects_tenant_read on public.projects for select to authenticated
using (
  private.can_view_site_content(site_id)
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);
create policy projects_tenant_manage on public.projects for all to authenticated
using (
  private.can_manage_site_resource(site_id,'cms.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
)
with check (
  private.can_manage_site_resource(site_id,'cms.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);

create policy leads_tenant_read on public.leads for select to authenticated
using (
  private.can_manage_site_resource(site_id,'leads.view')
  or private.can_manage_site_resource(site_id,'leads.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);
create policy leads_tenant_manage on public.leads for all to authenticated
using (
  private.can_manage_site_resource(site_id,'leads.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
)
with check (
  private.can_manage_site_resource(site_id,'leads.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);

create policy site_settings_tenant_read on public.site_settings for select to authenticated
using (
  private.can_view_site_content(site_id)
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);
create policy site_settings_tenant_manage on public.site_settings for all to authenticated
using (
  private.can_manage_site_resource(site_id,'settings.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
)
with check (
  private.can_manage_site_resource(site_id,'settings.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);

create policy revisions_tenant_read on public.revisions for select to authenticated
using (
  private.can_view_site_content(site_id)
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);
create policy revisions_tenant_create on public.revisions for insert to authenticated
with check (
  private.can_manage_site_resource(site_id,'cms.manage')
  or (site_id is null and public.has_permission('platform.sites.manage',null,null))
);

-- Keep public content behavior compatible for now. Public routing must always add
-- a site filter; host-to-site resolution will be hardened before Production.
drop policy if exists "public read published pages" on public.pages;
drop policy if exists "public read published projects" on public.projects;
drop policy if exists "public read blocks of published pages" on public.page_blocks;
create policy pages_public_published on public.pages for select to anon
using (status='published');
create policy projects_public_published on public.projects for select to anon
using (status='published');
create policy page_blocks_public_published on public.page_blocks for select to anon
using (visible and exists(select 1 from public.pages p where p.id=page_id and p.status='published'));
