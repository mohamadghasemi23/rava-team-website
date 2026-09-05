-- P3: site-scoped starter setup catalog plus contextual bilingual learning.
create or replace function public.get_site_starter_options(p_site_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,pg_catalog,pg_temp
as $$
declare
  v_actor uuid:=auth.uid();
  v_result jsonb;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_site_id is null or not exists(select 1 from public.sites where id=p_site_id) then
    raise exception 'site_not_found' using errcode='P0002';
  end if;
  if not private.can_install_starter_pack(p_site_id) then
    raise exception 'permission_denied' using errcode='42501';
  end if;
  if not exists(select 1 from private.resolve_site_entitlement(p_site_id,'cms',now()) e where e.allowed) then
    raise exception 'feature_not_entitled' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'site_type',jsonb_build_object('key',st.key,'name_fa',st.name_fa,'name_en',st.name_en),
    'industry',jsonb_build_object('key',ip.key,'name_fa',ip.name_fa,'name_en',ip.name_en),
    'pack',jsonb_build_object(
      'key',sp.key,'name_fa',sp.name_fa,'name_en',sp.name_en,
      'description_fa',sp.description_fa,'description_en',sp.description_en,
      'commercial_tier',sp.commercial_tier,'version_id',spv.id,'version',spv.version,
      'content_hash',spv.content_hash,'manifest',spv.manifest
    ),
    'template',jsonb_build_object(
      'key',tc.key,'name_fa',tc.name_fa,'name_en',tc.name_en,
      'description_fa',tc.description_fa,'description_en',tc.description_en,
      'commercial_tier',tc.commercial_tier,'preview_image_url',tc.preview_image_url,
      'version_id',tv.id,'version',tv.version,'theme',tv.theme_defaults,'layout',tv.layout_blueprint
    ),
    'recommended_modules',compat.recommended_modules,'is_default',compat.is_default
  ) order by compat.is_default desc,sp.name_fa,tc.name_fa),'[]'::jsonb)
  into v_result
  from public.starter_pack_template_compatibility compat
  join public.starter_content_pack_versions spv on spv.id=compat.starter_pack_version_id and spv.status='published'
  join public.starter_content_packs sp on sp.id=spv.starter_pack_id and sp.status='active'
  join public.site_types st on st.id=sp.site_type_id and st.status='active'
  join public.industry_packs ip on ip.id=sp.industry_pack_id and ip.status='active'
  join public.template_versions tv on tv.id=compat.template_version_id and tv.status='published'
  join public.template_catalog tc on tc.id=tv.template_id and tc.status='active'
  where compat.active;
  return v_result;
end $$;

revoke all on function public.get_site_starter_options(uuid) from public,anon;
grant execute on function public.get_site_starter_options(uuid) to authenticated;

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/platform/sites/:siteId/starter*','starter-installation-wizard',10
from public.help_topics where key='starter.pack.installation'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority,updated_at=now();

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/platform/sites/:siteId/starter*','starter-catalog-preview',20
from public.help_topics where key='starter.pack.catalog'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority,updated_at=now();

insert into public.academy_courses(key,module_key,status,audience,sort_order,estimated_minutes)
values('services.site.setup','cms','published','owner',35,15)
on conflict(key) do update set module_key=excluded.module_key,status=excluded.status,audience=excluded.audience,
  sort_order=excluded.sort_order,estimated_minutes=excluded.estimated_minutes,updated_at=now();

insert into public.academy_course_translations(course_id,locale,title,summary,intro_markdown,version)
select id,'fa','راه‌اندازی امن سایت خدماتی','انتخاب محتوای پیش‌فرض و قالب، بازبینی Draft و آماده‌سازی برای تأیید انسانی.',
  'در این دوره یاد می‌گیری بدون ساخت ادعای جعلی، یک سایت خدماتی دوزبانه را از بسته نسخه‌دار بسازی. نصب هیچ محتوایی را روی Production منتشر نمی‌کند.',1
from public.academy_courses where key='services.site.setup'
on conflict(course_id,locale) do update set title=excluded.title,summary=excluded.summary,intro_markdown=excluded.intro_markdown,
  version=public.academy_course_translations.version+1,updated_at=now();

insert into public.academy_course_translations(course_id,locale,title,summary,intro_markdown,version)
select id,'en','Safe service-site setup','Choose default content and a template, review the draft, and prepare it for human approval.',
  'Learn to create a bilingual service website from a versioned pack without fabricating business claims. Installation never publishes content to Production.',1
from public.academy_courses where key='services.site.setup'
on conflict(course_id,locale) do update set title=excluded.title,summary=excluded.summary,intro_markdown=excluded.intro_markdown,
  version=public.academy_course_translations.version+1,updated_at=now();

insert into public.academy_course_topics(course_id,topic_id,position,required)
select c.id,t.id,x.position,true
from public.academy_courses c
cross join (values('starter.pack.catalog',1),('starter.pack.installation',2)) x(topic_key,position)
join public.help_topics t on t.key=x.topic_key
where c.key='services.site.setup'
on conflict(course_id,topic_id) do update set position=excluded.position,required=excluded.required;
