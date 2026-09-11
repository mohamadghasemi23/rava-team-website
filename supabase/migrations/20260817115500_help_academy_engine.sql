-- RAVA Help / Academy Engine
-- Context-aware bilingual guidance, course curriculum and user learning progress.

create type public.help_audience as enum ('all','owner','admin','editor','staff','customer');
create type public.help_media_kind as enum ('image','gif','video','link');
create type public.academy_status as enum ('draft','published','archived');

alter table public.help_topics
  add column if not exists category text not null default 'general',
  add column if not exists audience public.help_audience not null default 'all',
  add column if not exists is_featured boolean not null default false,
  add column if not exists estimated_minutes integer not null default 3;

alter table public.help_topics
  add constraint help_topics_category_format check (category ~ '^[a-z0-9_.:-]{2,80}$'),
  add constraint help_topics_estimated_minutes_check check (estimated_minutes between 1 and 240);

alter table public.help_translations
  add column if not exists example_markdown text not null default '',
  add column if not exists search_keywords text[] not null default '{}'::text[];

create table public.help_context_bindings (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.help_topics(id) on delete cascade,
  route_pattern text not null,
  context_key text,
  priority integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(topic_id, route_pattern, context_key),
  constraint help_context_route_length check (length(route_pattern) between 1 and 300),
  constraint help_context_key_format check (context_key is null or context_key ~ '^[a-z0-9_.:-]{2,120}$')
);

create table public.help_media (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.help_topics(id) on delete cascade,
  kind public.help_media_kind not null,
  url text not null,
  caption_fa text not null default '',
  caption_en text not null default '',
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint help_media_url_length check (length(url) between 1 and 2000)
);

create table public.academy_courses (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  module_key text references public.module_catalog(key) on delete set null,
  status public.academy_status not null default 'draft',
  audience public.help_audience not null default 'all',
  sort_order integer not null default 0,
  estimated_minutes integer not null default 15,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academy_courses_key_format check (key ~ '^[a-z0-9_.:-]{2,100}$'),
  constraint academy_courses_minutes_check check (estimated_minutes between 1 and 10080)
);

create table public.academy_course_translations (
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  locale text not null,
  title text not null,
  summary text not null default '',
  intro_markdown text not null default '',
  version integer not null default 1,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(course_id, locale),
  constraint academy_course_locale_format check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint academy_course_version_positive check (version > 0)
);

create table public.academy_course_topics (
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  topic_id uuid not null references public.help_topics(id) on delete restrict,
  position integer not null default 0,
  required boolean not null default true,
  primary key(course_id, topic_id)
);

create table public.academy_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  topic_id uuid not null references public.help_topics(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  last_opened_at timestamptz not null default now(),
  primary key(user_id, course_id, topic_id)
);

create index help_topics_category_status_idx on public.help_topics(category,status,sort_order);
create index help_context_route_priority_idx on public.help_context_bindings(route_pattern,priority);
create index help_context_topic_idx on public.help_context_bindings(topic_id);
create index help_media_topic_sort_idx on public.help_media(topic_id,sort_order);
create index academy_courses_status_sort_idx on public.academy_courses(status,sort_order);
create index academy_course_topics_order_idx on public.academy_course_topics(course_id,position);
create index academy_progress_user_course_idx on public.academy_progress(user_id,course_id,completed);

alter table public.help_context_bindings enable row level security;
alter table public.help_media enable row level security;
alter table public.academy_courses enable row level security;
alter table public.academy_course_translations enable row level security;
alter table public.academy_course_topics enable row level security;
alter table public.academy_progress enable row level security;

-- Published educational content is available to authenticated users.
create policy help_context_read on public.help_context_bindings for select to authenticated
using (exists(select 1 from public.help_topics h where h.id=topic_id and h.status='published'));
create policy help_context_manage on public.help_context_bindings for all to authenticated
using (public.has_permission('platform.help.manage',null,null))
with check (public.has_permission('platform.help.manage',null,null));

create policy help_media_read on public.help_media for select to authenticated
using (exists(select 1 from public.help_topics h where h.id=topic_id and h.status='published'));
create policy help_media_manage on public.help_media for all to authenticated
using (public.has_permission('platform.help.manage',null,null))
with check (public.has_permission('platform.help.manage',null,null));

create policy academy_courses_read on public.academy_courses for select to authenticated
using (status='published' or public.has_permission('platform.help.manage',null,null));
create policy academy_courses_manage on public.academy_courses for all to authenticated
using (public.has_permission('platform.help.manage',null,null))
with check (public.has_permission('platform.help.manage',null,null));

create policy academy_course_translations_read on public.academy_course_translations for select to authenticated
using (exists(select 1 from public.academy_courses c where c.id=course_id and (c.status='published' or public.has_permission('platform.help.manage',null,null))));
create policy academy_course_translations_manage on public.academy_course_translations for all to authenticated
using (public.has_permission('platform.help.manage',null,null))
with check (public.has_permission('platform.help.manage',null,null));

create policy academy_course_topics_read on public.academy_course_topics for select to authenticated
using (exists(select 1 from public.academy_courses c where c.id=course_id and (c.status='published' or public.has_permission('platform.help.manage',null,null))));
create policy academy_course_topics_manage on public.academy_course_topics for all to authenticated
using (public.has_permission('platform.help.manage',null,null))
with check (public.has_permission('platform.help.manage',null,null));

create policy academy_progress_own on public.academy_progress for all to authenticated
using (user_id=auth.uid())
with check (user_id=auth.uid());
create policy academy_progress_owner_view on public.academy_progress for select to authenticated
using (public.has_permission('platform.help.manage',null,null));

grant select on public.help_context_bindings, public.help_media, public.academy_courses, public.academy_course_translations, public.academy_course_topics to authenticated;
grant select,insert,update,delete on public.academy_progress to authenticated;
grant insert,update,delete on public.help_context_bindings, public.help_media, public.academy_courses, public.academy_course_translations, public.academy_course_topics to authenticated;

create or replace function public.upsert_help_topic(
  p_topic_id uuid,
  p_key text,
  p_module_key text,
  p_feature_key text,
  p_minimum_permission text,
  p_status public.help_status,
  p_category text,
  p_audience public.help_audience,
  p_featured boolean,
  p_estimated_minutes integer,
  p_sort_order integer
) returns uuid
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_id uuid; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not public.has_permission('platform.help.manage',null,null) then raise exception 'permission denied'; end if;
  if p_key !~ '^[a-z0-9_.:-]{2,120}$' then raise exception 'invalid help key'; end if;
  if p_category !~ '^[a-z0-9_.:-]{2,80}$' then raise exception 'invalid category'; end if;
  if p_estimated_minutes < 1 or p_estimated_minutes > 240 then raise exception 'invalid duration'; end if;
  if p_module_key is not null and not exists(select 1 from public.module_catalog where key=p_module_key) then raise exception 'unknown module'; end if;
  if p_minimum_permission is not null and not exists(select 1 from public.permissions where key=p_minimum_permission) then raise exception 'unknown permission'; end if;

  if p_topic_id is null then
    insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order,created_by,updated_by)
    values(p_key,p_module_key,nullif(p_feature_key,''),p_minimum_permission,p_status,p_category,p_audience,p_featured,p_estimated_minutes,p_sort_order,v_actor,v_actor)
    returning id into v_id;
    perform public.record_audit_event('help.topic.created','help_topic',v_id::text,null,null,null,jsonb_build_object('key',p_key,'status',p_status,'category',p_category),'{}'::jsonb,null,null,'notice');
  else
    update public.help_topics set key=p_key,module_key=p_module_key,feature_key=nullif(p_feature_key,''),minimum_permission=p_minimum_permission,status=p_status,category=p_category,audience=p_audience,is_featured=p_featured,estimated_minutes=p_estimated_minutes,sort_order=p_sort_order,updated_by=v_actor,updated_at=now()
    where id=p_topic_id returning id into v_id;
    if v_id is null then raise exception 'topic not found'; end if;
    perform public.record_audit_event('help.topic.updated','help_topic',v_id::text,null,null,null,jsonb_build_object('key',p_key,'status',p_status,'category',p_category),'{}'::jsonb,null,null,'notice');
  end if;
  return v_id;
end;$$;

create or replace function public.set_help_translation(
  p_topic_id uuid,
  p_locale text,
  p_title text,
  p_summary text,
  p_body_markdown text,
  p_example_markdown text,
  p_steps jsonb,
  p_warnings jsonb,
  p_search_keywords text[]
) returns void
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_actor uuid:=auth.uid(); v_version integer;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not public.has_permission('platform.help.manage',null,null) then raise exception 'permission denied'; end if;
  if p_locale !~ '^[a-z]{2}(-[A-Z]{2})?$' then raise exception 'invalid locale'; end if;
  if length(trim(p_title)) < 2 then raise exception 'invalid title'; end if;
  if not exists(select 1 from public.help_topics where id=p_topic_id) then raise exception 'topic not found'; end if;
  select coalesce(version,0)+1 into v_version from public.help_translations where topic_id=p_topic_id and locale=p_locale;
  if v_version is null then v_version:=1; end if;
  insert into public.help_translations(topic_id,locale,title,summary,body_markdown,example_markdown,steps,warnings,search_keywords,version,updated_by,updated_at)
  values(p_topic_id,p_locale,trim(p_title),coalesce(p_summary,''),coalesce(p_body_markdown,''),coalesce(p_example_markdown,''),coalesce(p_steps,'[]'::jsonb),coalesce(p_warnings,'[]'::jsonb),coalesce(p_search_keywords,'{}'::text[]),v_version,v_actor,now())
  on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,example_markdown=excluded.example_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=excluded.version,updated_by=v_actor,updated_at=now();
  perform public.record_audit_event('help.translation.updated','help_topic',p_topic_id::text,null,null,null,jsonb_build_object('locale',p_locale,'version',v_version),'{}'::jsonb,null,null,'notice');
end;$$;

create or replace function public.set_help_context_binding(
  p_topic_id uuid,
  p_route_pattern text,
  p_context_key text default null,
  p_priority integer default 100
) returns uuid
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_id uuid; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not public.has_permission('platform.help.manage',null,null) then raise exception 'permission denied'; end if;
  if length(p_route_pattern)<1 or length(p_route_pattern)>300 then raise exception 'invalid route'; end if;
  insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority,created_by)
  values(p_topic_id,p_route_pattern,nullif(p_context_key,''),p_priority,v_actor)
  on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority,updated_at=now()
  returning id into v_id;
  perform public.record_audit_event('help.context_binding.saved','help_context_binding',v_id::text,null,null,null,jsonb_build_object('topic_id',p_topic_id,'route',p_route_pattern,'context_key',p_context_key),'{}'::jsonb,null,null,'notice');
  return v_id;
end;$$;

create or replace function public.upsert_academy_course(
  p_course_id uuid,
  p_key text,
  p_module_key text,
  p_status public.academy_status,
  p_audience public.help_audience,
  p_sort_order integer,
  p_estimated_minutes integer
) returns uuid
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_id uuid; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not public.has_permission('platform.help.manage',null,null) then raise exception 'permission denied'; end if;
  if p_key !~ '^[a-z0-9_.:-]{2,100}$' then raise exception 'invalid course key'; end if;
  if p_estimated_minutes < 1 or p_estimated_minutes > 10080 then raise exception 'invalid duration'; end if;
  if p_course_id is null then
    insert into public.academy_courses(key,module_key,status,audience,sort_order,estimated_minutes,created_by,updated_by)
    values(p_key,p_module_key,p_status,p_audience,p_sort_order,p_estimated_minutes,v_actor,v_actor) returning id into v_id;
  else
    update public.academy_courses set key=p_key,module_key=p_module_key,status=p_status,audience=p_audience,sort_order=p_sort_order,estimated_minutes=p_estimated_minutes,updated_by=v_actor,updated_at=now() where id=p_course_id returning id into v_id;
    if v_id is null then raise exception 'course not found'; end if;
  end if;
  perform public.record_audit_event('academy.course.saved','academy_course',v_id::text,null,null,null,jsonb_build_object('key',p_key,'status',p_status),'{}'::jsonb,null,null,'notice');
  return v_id;
end;$$;

create or replace function public.set_academy_course_translation(
  p_course_id uuid,p_locale text,p_title text,p_summary text,p_intro_markdown text
) returns void
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_actor uuid:=auth.uid(); v_version integer;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not public.has_permission('platform.help.manage',null,null) then raise exception 'permission denied'; end if;
  select coalesce(version,0)+1 into v_version from public.academy_course_translations where course_id=p_course_id and locale=p_locale;
  if v_version is null then v_version:=1; end if;
  insert into public.academy_course_translations(course_id,locale,title,summary,intro_markdown,version,updated_by)
  values(p_course_id,p_locale,trim(p_title),coalesce(p_summary,''),coalesce(p_intro_markdown,''),v_version,v_actor)
  on conflict(course_id,locale) do update set title=excluded.title,summary=excluded.summary,intro_markdown=excluded.intro_markdown,version=excluded.version,updated_by=v_actor,updated_at=now();
  perform public.record_audit_event('academy.translation.updated','academy_course',p_course_id::text,null,null,null,jsonb_build_object('locale',p_locale,'version',v_version),'{}'::jsonb,null,null,'notice');
end;$$;

create or replace function public.set_academy_course_topics(p_course_id uuid,p_topic_ids uuid[]) returns void
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not public.has_permission('platform.help.manage',null,null) then raise exception 'permission denied'; end if;
  if not exists(select 1 from public.academy_courses where id=p_course_id) then raise exception 'course not found'; end if;
  if (select count(*) from public.help_topics where id=any(coalesce(p_topic_ids,'{}'::uuid[]))) <> cardinality(coalesce(p_topic_ids,'{}'::uuid[])) then raise exception 'unknown topic'; end if;
  delete from public.academy_course_topics where course_id=p_course_id;
  insert into public.academy_course_topics(course_id,topic_id,position)
    select p_course_id,id,ordinality-1 from unnest(coalesce(p_topic_ids,'{}'::uuid[])) with ordinality as x(id,ordinality);
  perform public.record_audit_event('academy.course.curriculum_changed','academy_course',p_course_id::text,null,null,null,jsonb_build_object('topics',coalesce(p_topic_ids,'{}'::uuid[])),'{}'::jsonb,null,null,'notice');
end;$$;

create or replace function public.mark_academy_topic_complete(p_course_id uuid,p_topic_id uuid,p_completed boolean default true) returns void
language plpgsql security invoker
set search_path=public,pg_temp
as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from public.academy_course_topics ct join public.academy_courses c on c.id=ct.course_id where ct.course_id=p_course_id and ct.topic_id=p_topic_id and c.status='published') then raise exception 'lesson not available'; end if;
  insert into public.academy_progress(user_id,course_id,topic_id,completed,completed_at,last_opened_at)
  values(v_user,p_course_id,p_topic_id,p_completed,case when p_completed then now() else null end,now())
  on conflict(user_id,course_id,topic_id) do update set completed=excluded.completed,completed_at=excluded.completed_at,last_opened_at=now();
end;$$;

revoke all on function public.upsert_help_topic(uuid,text,text,text,text,public.help_status,text,public.help_audience,boolean,integer,integer) from public,anon;
revoke all on function public.set_help_translation(uuid,text,text,text,text,text,jsonb,jsonb,text[]) from public,anon;
revoke all on function public.set_help_context_binding(uuid,text,text,integer) from public,anon;
revoke all on function public.upsert_academy_course(uuid,text,text,public.academy_status,public.help_audience,integer,integer) from public,anon;
revoke all on function public.set_academy_course_translation(uuid,text,text,text,text) from public,anon;
revoke all on function public.set_academy_course_topics(uuid,uuid[]) from public,anon;
revoke all on function public.mark_academy_topic_complete(uuid,uuid,boolean) from public,anon;
grant execute on function public.upsert_help_topic(uuid,text,text,text,text,public.help_status,text,public.help_audience,boolean,integer,integer) to authenticated;
grant execute on function public.set_help_translation(uuid,text,text,text,text,text,jsonb,jsonb,text[]) to authenticated;
grant execute on function public.set_help_context_binding(uuid,text,text,integer) to authenticated;
grant execute on function public.upsert_academy_course(uuid,text,text,public.academy_status,public.help_audience,integer,integer) to authenticated;
grant execute on function public.set_academy_course_translation(uuid,text,text,text,text) to authenticated;
grant execute on function public.set_academy_course_topics(uuid,uuid[]) to authenticated;
grant execute on function public.mark_academy_topic_complete(uuid,uuid,boolean) to authenticated;

-- Starter bilingual lessons for the currently implemented platform areas.
with topic as (
  insert into public.help_topics(key,module_key,feature_key,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('platform.owner.provision_site','help','platform.site.provision','published','owner-control','owner',true,5,10)
  on conflict(key) do update set status='published' returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','ساخت مشتری و سایت جدید','راهنمای ساخت Organization و اولین Site از پنل مالک.','در این بخش مشتری، برند و سایت اولیه را می‌سازی. ساخت سایت به‌صورت تراکنشی انجام می‌شود و ماژول‌های Core فعال می‌شوند.',
'["نام و شناسه مشتری را وارد کن.","نام و شناسه سایت را مشخص کن.","زبان، ارز و منطقه زمانی را انتخاب کن.","اطلاعات را بازبینی و ساخت سایت را تأیید کن."]'::jsonb,
'["شناسه‌ها بعداً در URL و تنظیمات سیستمی استفاده می‌شوند؛ کوتاه و پایدار انتخابشان کن."]'::jsonb,
array['ساخت سایت','مشتری جدید','provision','organization'] from topic
on conflict(topic_id,locale) do nothing;

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Provision a new customer site','Create an Organization and its first Site from Owner Control.','This workflow creates the customer, initial site, environments and Core entitlements transactionally.',
'["Enter the organization name and stable slug.","Define the site name and slug.","Choose locale, currency and timezone.","Review and confirm provisioning."]'::jsonb,
'["Use short, stable slugs because they are used by platform routing and configuration."]'::jsonb,
array['provision site','new customer','organization'] from public.help_topics where key='platform.owner.provision_site'
on conflict(topic_id,locale) do nothing;

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/platform/sites/new','provision-site',10 from public.help_topics where key='platform.owner.provision_site'
on conflict(topic_id,route_pattern,context_key) do nothing;

with topic as (
  insert into public.help_topics(key,module_key,feature_key,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('platform.access.manage','help','access.control','published','security','owner',true,8,20)
  on conflict(key) do update set status='published' returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','مدیریت کاربران و دسترسی‌ها','Role، Permission، Membership و Allow/Deny را در Scope درست مدیریت کن.','RAVA دسترسی‌ها را در سطح پلتفرم، سازمان و سایت تفکیک می‌کند. Deny صریح بر Allow اولویت دارد و تغییرات حساس Audit می‌شوند.',
'["Scope را مشخص کن.","Role مناسب بساز یا Role موجود را انتخاب کن.","Permissionها را فقط به اندازه نیاز بده.","برای استثناها از Allow/Deny موقت و تاریخ انقضا استفاده کن."]'::jsonb,
'["Owner را از مسیر عادی لغو نکن.","Permissionهای Critical را فقط به افراد مورد اعتماد بده."]'::jsonb,
array['دسترسی','ادمین','permission','role','membership'] from topic
on conflict(topic_id,locale) do nothing;

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Manage users and access','Manage roles, permissions, memberships and explicit overrides in the correct scope.','RAVA separates access at platform, organization and site scope. Explicit deny wins over allow and sensitive changes are audited.',
'["Choose the correct scope.","Create or select a role.","Grant only the permissions required.","Use expiring overrides for exceptional access."]'::jsonb,
'["Do not remove an Owner through ordinary access workflows.","Grant Critical permissions only to trusted operators."]'::jsonb,
array['access','admin','permission','role','membership'] from public.help_topics where key='platform.access.manage'
on conflict(topic_id,locale) do nothing;

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/system/access','access-control',10 from public.help_topics where key='platform.access.manage'
on conflict(topic_id,route_pattern,context_key) do nothing;
