-- RAVA Template / Theme / Release Engine
-- Versioned template packs, immutable design revisions, publish releases and safe rollback.

create type public.template_status as enum ('draft','active','deprecated','archived');
create type public.template_version_status as enum ('draft','published','retired');
create type public.design_revision_source as enum ('template','editor','rollback','migration');
create type public.release_status as enum ('published','superseded','rolled_back');

create table public.template_catalog (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_fa text not null,
  name_en text not null,
  description_fa text not null default '',
  description_en text not null default '',
  industry_key text not null default 'general',
  status public.template_status not null default 'draft',
  commercial_tier text not null default 'core',
  is_public boolean not null default false,
  preview_image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_catalog_key_format check (key ~ '^[a-z0-9][a-z0-9_.:-]{1,79}$'),
  constraint template_catalog_tier_check check (commercial_tier in ('core','premium','enterprise','exclusive')),
  constraint template_catalog_industry_format check (industry_key ~ '^[a-z0-9][a-z0-9_.:-]{1,79}$')
);

create table public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.template_catalog(id) on delete cascade,
  version integer not null,
  schema_version integer not null default 1,
  status public.template_version_status not null default 'draft',
  theme_defaults jsonb not null default '{}'::jsonb,
  layout_blueprint jsonb not null default '{}'::jsonb,
  seo_defaults jsonb not null default '{}'::jsonb,
  module_defaults text[] not null default '{}'::text[],
  changelog_fa text not null default '',
  changelog_en text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(template_id, version),
  constraint template_versions_version_positive check (version > 0),
  constraint template_versions_schema_positive check (schema_version > 0),
  constraint template_versions_theme_object check (jsonb_typeof(theme_defaults) = 'object'),
  constraint template_versions_layout_object check (jsonb_typeof(layout_blueprint) = 'object'),
  constraint template_versions_seo_object check (jsonb_typeof(seo_defaults) = 'object')
);

create table public.site_design_revisions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  revision integer not null,
  source public.design_revision_source not null,
  template_id uuid references public.template_catalog(id) on delete set null,
  template_version_id uuid references public.template_versions(id) on delete set null,
  theme_config jsonb not null default '{}'::jsonb,
  layout_config jsonb not null default '{}'::jsonb,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(site_id, revision),
  constraint site_design_revision_positive check (revision > 0),
  constraint site_design_theme_object check (jsonb_typeof(theme_config) = 'object'),
  constraint site_design_layout_object check (jsonb_typeof(layout_config) = 'object'),
  constraint site_design_note_length check (note is null or length(note) <= 500)
);

create table public.site_design_state (
  site_id uuid primary key references public.sites(id) on delete cascade,
  current_revision_id uuid not null references public.site_design_revisions(id) on delete restrict,
  current_template_id uuid references public.template_catalog(id) on delete set null,
  current_template_version_id uuid references public.template_versions(id) on delete set null,
  published_release_id uuid,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.site_releases (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  release_number integer not null,
  status public.release_status not null default 'published',
  source_revision_id uuid references public.site_design_revisions(id) on delete set null,
  template_id uuid references public.template_catalog(id) on delete set null,
  template_version_id uuid references public.template_versions(id) on delete set null,
  theme_snapshot jsonb not null default '{}'::jsonb,
  layout_snapshot jsonb not null default '{}'::jsonb,
  settings_snapshot jsonb not null default '{}'::jsonb,
  parent_release_id uuid references public.site_releases(id) on delete set null,
  release_note text,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  unique(site_id, release_number),
  constraint site_release_number_positive check (release_number > 0),
  constraint site_release_theme_object check (jsonb_typeof(theme_snapshot) = 'object'),
  constraint site_release_layout_object check (jsonb_typeof(layout_snapshot) = 'object'),
  constraint site_release_settings_object check (jsonb_typeof(settings_snapshot) = 'object'),
  constraint site_release_note_length check (release_note is null or length(release_note) <= 1000)
);

alter table public.site_design_state
  add constraint site_design_state_published_release_fk
  foreign key (published_release_id) references public.site_releases(id) on delete set null;

create index template_catalog_industry_status_idx on public.template_catalog(industry_key,status,is_public);
create index template_versions_template_status_idx on public.template_versions(template_id,status,version desc);
create index site_design_revisions_site_time_idx on public.site_design_revisions(site_id,revision desc);
create index site_releases_site_time_idx on public.site_releases(site_id,release_number desc);

alter table public.template_catalog enable row level security;
alter table public.template_versions enable row level security;
alter table public.site_design_revisions enable row level security;
alter table public.site_design_state enable row level security;
alter table public.site_releases enable row level security;

insert into public.permissions(key,module_key,name_fa,name_en,risk_level) values
  ('templates.view','cms','مشاهده قالب‌ها','View templates','low'),
  ('templates.manage','cms','مدیریت قالب‌ها','Manage templates','high'),
  ('design.manage','cms','مدیریت طراحی سایت','Manage site design','high'),
  ('design.publish','cms','انتشار طراحی سایت','Publish site design','critical'),
  ('design.rollback','cms','بازگردانی نسخه طراحی','Rollback site design','critical')
on conflict(key) do nothing;

create policy template_catalog_read on public.template_catalog for select to authenticated
using (status='active' and is_public=true or public.has_permission('templates.manage',null,null) or public.has_permission('platform.sites.manage',null,null));
create policy template_catalog_manage on public.template_catalog for all to authenticated
using (public.has_permission('templates.manage',null,null) or public.has_permission('platform.sites.manage',null,null))
with check (public.has_permission('templates.manage',null,null) or public.has_permission('platform.sites.manage',null,null));

create policy template_versions_read on public.template_versions for select to authenticated
using (
  (status='published' and exists(select 1 from public.template_catalog t where t.id=template_id and t.status='active' and t.is_public=true))
  or public.has_permission('templates.manage',null,null)
  or public.has_permission('platform.sites.manage',null,null)
);
create policy template_versions_manage on public.template_versions for all to authenticated
using (public.has_permission('templates.manage',null,null) or public.has_permission('platform.sites.manage',null,null))
with check (public.has_permission('templates.manage',null,null) or public.has_permission('platform.sites.manage',null,null));

create policy site_design_revisions_read on public.site_design_revisions for select to authenticated
using (public.has_permission('sites.view',null,site_id) or public.has_permission('design.manage',null,site_id) or public.has_permission('platform.sites.manage',null,null));
create policy site_design_state_read on public.site_design_state for select to authenticated
using (public.has_permission('sites.view',null,site_id) or public.has_permission('design.manage',null,site_id) or public.has_permission('platform.sites.manage',null,null));
create policy site_releases_read on public.site_releases for select to authenticated
using (public.has_permission('sites.view',null,site_id) or public.has_permission('design.manage',null,site_id) or public.has_permission('platform.sites.manage',null,null));

-- Writes are performed only through hardened RPCs below.
revoke insert,update,delete on public.site_design_revisions,public.site_design_state,public.site_releases from authenticated;
grant select on public.template_catalog,public.template_versions,public.site_design_revisions,public.site_design_state,public.site_releases to authenticated;

create or replace function private.site_org(p_site_id uuid) returns uuid
language sql stable security definer set search_path=public,pg_temp
as $$ select organization_id from public.sites where id=p_site_id $$;
revoke all on function private.site_org(uuid) from public,anon,authenticated;

create or replace function private.can_manage_design(p_site_id uuid,p_permission text default 'design.manage') returns boolean
language plpgsql stable security definer set search_path=public,private,pg_temp
as $$
declare v_org uuid;
begin
  select private.site_org(p_site_id) into v_org;
  if v_org is null then return false; end if;
  return public.has_permission('platform.sites.manage',null,null)
    or public.has_permission(p_permission,v_org,p_site_id)
    or (p_permission='design.manage' and public.has_permission('sites.manage',v_org,p_site_id));
end;
$$;
revoke all on function private.can_manage_design(uuid,text) from public,anon,authenticated;

create or replace function public.apply_template_to_site(
  p_site_id uuid,
  p_template_version_id uuid,
  p_theme_overrides jsonb default '{}'::jsonb,
  p_note text default null
) returns table(revision_id uuid, revision integer)
language plpgsql security definer set search_path=public,private,pg_temp
as $$
declare
  v_actor uuid:=auth.uid(); v_tv public.template_versions%rowtype; v_t public.template_catalog%rowtype;
  v_revision integer; v_id uuid; v_theme jsonb;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not private.can_manage_design(p_site_id,'design.manage') then raise exception 'permission denied'; end if;
  if jsonb_typeof(coalesce(p_theme_overrides,'{}'::jsonb)) <> 'object' then raise exception 'invalid theme overrides'; end if;
  select * into v_tv from public.template_versions where id=p_template_version_id and status='published';
  if not found then raise exception 'template version unavailable'; end if;
  select * into v_t from public.template_catalog where id=v_tv.template_id and status='active';
  if not found then raise exception 'template unavailable'; end if;
  if not v_t.is_public and not public.has_permission('platform.sites.manage',null,null) and not public.has_permission('templates.manage',null,null) then raise exception 'template not available for tenant'; end if;
  select coalesce(max(r.revision),0)+1 into v_revision from public.site_design_revisions r where r.site_id=p_site_id;
  v_theme := coalesce(v_tv.theme_defaults,'{}'::jsonb) || coalesce(p_theme_overrides,'{}'::jsonb);
  insert into public.site_design_revisions(site_id,revision,source,template_id,template_version_id,theme_config,layout_config,note,created_by)
  values(p_site_id,v_revision,'template',v_t.id,v_tv.id,v_theme,v_tv.layout_blueprint,left(p_note,500),v_actor)
  returning id into v_id;
  insert into public.site_design_state(site_id,current_revision_id,current_template_id,current_template_version_id,updated_by,updated_at)
  values(p_site_id,v_id,v_t.id,v_tv.id,v_actor,now())
  on conflict(site_id) do update set current_revision_id=excluded.current_revision_id,current_template_id=excluded.current_template_id,current_template_version_id=excluded.current_template_version_id,updated_by=excluded.updated_by,updated_at=now();
  perform public.record_audit_event('design.template.applied','site',p_site_id::text,private.site_org(p_site_id),p_site_id,null,
    jsonb_build_object('template_key',v_t.key,'template_version',v_tv.version,'revision',v_revision),
    jsonb_build_object('note',left(p_note,500)),null,null,'notice');
  return query select v_id,v_revision;
end;
$$;

create or replace function public.save_site_design_draft(
  p_site_id uuid,
  p_theme_config jsonb,
  p_layout_config jsonb,
  p_note text default null
) returns table(revision_id uuid, revision integer)
language plpgsql security definer set search_path=public,private,pg_temp
as $$
declare
  v_actor uuid:=auth.uid(); v_state public.site_design_state%rowtype; v_revision integer; v_id uuid;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not private.can_manage_design(p_site_id,'design.manage') then raise exception 'permission denied'; end if;
  if jsonb_typeof(p_theme_config)<>'object' or jsonb_typeof(p_layout_config)<>'object' then raise exception 'invalid design config'; end if;
  select * into v_state from public.site_design_state where site_id=p_site_id;
  select coalesce(max(r.revision),0)+1 into v_revision from public.site_design_revisions r where r.site_id=p_site_id;
  insert into public.site_design_revisions(site_id,revision,source,template_id,template_version_id,theme_config,layout_config,note,created_by)
  values(p_site_id,v_revision,'editor',v_state.current_template_id,v_state.current_template_version_id,p_theme_config,p_layout_config,left(p_note,500),v_actor)
  returning id into v_id;
  insert into public.site_design_state(site_id,current_revision_id,current_template_id,current_template_version_id,published_release_id,updated_by,updated_at)
  values(p_site_id,v_id,v_state.current_template_id,v_state.current_template_version_id,v_state.published_release_id,v_actor,now())
  on conflict(site_id) do update set current_revision_id=excluded.current_revision_id,updated_by=excluded.updated_by,updated_at=now();
  perform public.record_audit_event('design.draft.saved','site',p_site_id::text,private.site_org(p_site_id),p_site_id,null,jsonb_build_object('revision',v_revision),'{}'::jsonb,null,null,'info');
  return query select v_id,v_revision;
end;
$$;

create or replace function public.publish_site_design(
  p_site_id uuid,
  p_release_note text default null
) returns table(release_id uuid, release_number integer)
language plpgsql security definer set search_path=public,private,pg_temp
as $$
declare
  v_actor uuid:=auth.uid(); v_state public.site_design_state%rowtype; v_revision public.site_design_revisions%rowtype;
  v_number integer; v_id uuid; v_previous uuid; v_settings jsonb;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not private.can_manage_design(p_site_id,'design.publish') then raise exception 'permission denied'; end if;
  select * into v_state from public.site_design_state where site_id=p_site_id for update;
  if not found then raise exception 'no design draft'; end if;
  select * into v_revision from public.site_design_revisions where id=v_state.current_revision_id;
  select settings into v_settings from public.sites where id=p_site_id for update;
  select coalesce(max(r.release_number),0)+1 into v_number from public.site_releases r where r.site_id=p_site_id;
  v_previous:=v_state.published_release_id;
  if v_previous is not null then update public.site_releases set status='superseded' where id=v_previous and status='published'; end if;
  insert into public.site_releases(site_id,release_number,status,source_revision_id,template_id,template_version_id,theme_snapshot,layout_snapshot,settings_snapshot,parent_release_id,release_note,published_by)
  values(p_site_id,v_number,'published',v_revision.id,v_revision.template_id,v_revision.template_version_id,v_revision.theme_config,v_revision.layout_config,coalesce(v_settings,'{}'::jsonb),v_previous,left(p_release_note,1000),v_actor)
  returning id into v_id;
  update public.site_design_state set published_release_id=v_id,updated_by=v_actor,updated_at=now() where site_id=p_site_id;
  update public.sites set theme_config=v_revision.theme_config,settings=coalesce(settings,'{}'::jsonb)||jsonb_build_object('design_release_id',v_id,'design_release_number',v_number,'layout_config',v_revision.layout_config),updated_at=now() where id=p_site_id;
  perform public.record_audit_event('design.release.published','site',p_site_id::text,private.site_org(p_site_id),p_site_id,
    jsonb_build_object('previous_release_id',v_previous),jsonb_build_object('release_id',v_id,'release_number',v_number,'revision',v_revision.revision),
    jsonb_build_object('release_note',left(p_release_note,1000)),null,null,'notice');
  return query select v_id,v_number;
end;
$$;

create or replace function public.rollback_site_design(
  p_site_id uuid,
  p_target_release_id uuid,
  p_release_note text default null
) returns table(release_id uuid, release_number integer, revision integer)
language plpgsql security definer set search_path=public,private,pg_temp
as $$
declare
  v_actor uuid:=auth.uid(); v_target public.site_releases%rowtype; v_revision_no integer; v_revision_id uuid;
  v_release_no integer; v_release_id uuid; v_previous uuid;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not private.can_manage_design(p_site_id,'design.rollback') then raise exception 'permission denied'; end if;
  select * into v_target from public.site_releases where id=p_target_release_id and site_id=p_site_id;
  if not found then raise exception 'target release not found'; end if;
  select coalesce(max(r.revision),0)+1 into v_revision_no from public.site_design_revisions r where r.site_id=p_site_id;
  insert into public.site_design_revisions(site_id,revision,source,template_id,template_version_id,theme_config,layout_config,note,created_by)
  values(p_site_id,v_revision_no,'rollback',v_target.template_id,v_target.template_version_id,v_target.theme_snapshot,v_target.layout_snapshot,left(coalesce(p_release_note,'Rollback'),500),v_actor)
  returning id into v_revision_id;
  select published_release_id into v_previous from public.site_design_state where site_id=p_site_id for update;
  select coalesce(max(r.release_number),0)+1 into v_release_no from public.site_releases r where r.site_id=p_site_id;
  if v_previous is not null then update public.site_releases set status='superseded' where id=v_previous and status='published'; end if;
  insert into public.site_releases(site_id,release_number,status,source_revision_id,template_id,template_version_id,theme_snapshot,layout_snapshot,settings_snapshot,parent_release_id,release_note,published_by)
  values(p_site_id,v_release_no,'published',v_revision_id,v_target.template_id,v_target.template_version_id,v_target.theme_snapshot,v_target.layout_snapshot,v_target.settings_snapshot,p_target_release_id,left(coalesce(p_release_note,'Rollback'),1000),v_actor)
  returning id into v_release_id;
  update public.site_design_state set current_revision_id=v_revision_id,current_template_id=v_target.template_id,current_template_version_id=v_target.template_version_id,published_release_id=v_release_id,updated_by=v_actor,updated_at=now() where site_id=p_site_id;
  update public.sites set theme_config=v_target.theme_snapshot,settings=coalesce(settings,'{}'::jsonb)||jsonb_build_object('design_release_id',v_release_id,'design_release_number',v_release_no,'layout_config',v_target.layout_snapshot),updated_at=now() where id=p_site_id;
  update public.site_releases set status='rolled_back' where id=p_target_release_id and status<>'published';
  perform public.record_audit_event('design.release.rolled_back','site',p_site_id::text,private.site_org(p_site_id),p_site_id,
    jsonb_build_object('from_release_id',v_previous),jsonb_build_object('target_release_id',p_target_release_id,'new_release_id',v_release_id,'new_release_number',v_release_no),
    jsonb_build_object('release_note',left(p_release_note,1000)),null,null,'warning');
  return query select v_release_id,v_release_no,v_revision_no;
end;
$$;

revoke all on function public.apply_template_to_site(uuid,uuid,jsonb,text) from public,anon;
revoke all on function public.save_site_design_draft(uuid,jsonb,jsonb,text) from public,anon;
revoke all on function public.publish_site_design(uuid,text) from public,anon;
revoke all on function public.rollback_site_design(uuid,uuid,text) from public,anon;
grant execute on function public.apply_template_to_site(uuid,uuid,jsonb,text) to authenticated;
grant execute on function public.save_site_design_draft(uuid,jsonb,jsonb,text) to authenticated;
grant execute on function public.publish_site_design(uuid,text) to authenticated;
grant execute on function public.rollback_site_design(uuid,uuid,text) to authenticated;

-- Starter packs prove the engine without hard-wiring customer-specific designs.
insert into public.template_catalog(key,name_fa,name_en,description_fa,description_en,industry_key,status,commercial_tier,is_public,metadata)
values
 ('rava-service-minimal','سرویس مینیمال راوا','RAVA Service Minimal','قالب پایه خدماتی با ساختار تمیز و قابل شخصی‌سازی.','A clean, customizable service-site starter.','services','active','core',true,jsonb_build_object('starter',true)),
 ('rava-commerce-modern','فروشگاه مدرن راوا','RAVA Commerce Modern','قالب پایه فروشگاهی برای توسعه Commerce.','A commerce-ready starter for the future Commerce module.','commerce','active','premium',true,jsonb_build_object('starter',true))
on conflict(key) do nothing;

insert into public.template_versions(template_id,version,status,theme_defaults,layout_blueprint,seo_defaults,module_defaults,changelog_fa,changelog_en,published_at)
select t.id,1,'published',
  jsonb_build_object('colors',jsonb_build_object('primary','#173B57','surface','#071421','text','#F3F8FC'),'typography',jsonb_build_object('heading','system','body','system'),'radius',16,'spacing','comfortable'),
  jsonb_build_object('sections',jsonb_build_array('hero','services','projects','contact'),'header','standard','footer','business'),
  jsonb_build_object('schema','Organization','indexable',true),array['cms','media','seo_core','analytics_core','security','help']::text[],
  'نسخه پایه قالب خدماتی','Initial service template version',now()
from public.template_catalog t where t.key='rava-service-minimal'
on conflict(template_id,version) do nothing;

insert into public.template_versions(template_id,version,status,theme_defaults,layout_blueprint,seo_defaults,module_defaults,changelog_fa,changelog_en,published_at)
select t.id,1,'published',
  jsonb_build_object('colors',jsonb_build_object('primary','#173B57','surface','#071421','text','#F3F8FC'),'typography',jsonb_build_object('heading','system','body','system'),'radius',14,'spacing','compact'),
  jsonb_build_object('sections',jsonb_build_array('hero','categories','featured_products','benefits','newsletter'),'header','commerce','footer','business'),
  jsonb_build_object('schema','OnlineStore','indexable',true),array['cms','media','seo_core','analytics_core','security','help','commerce']::text[],
  'نسخه پایه قالب فروشگاهی','Initial commerce template version',now()
from public.template_catalog t where t.key='rava-commerce-modern'
on conflict(template_id,version) do nothing;
