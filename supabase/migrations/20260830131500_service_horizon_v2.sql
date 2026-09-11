-- Versioned RAVA Horizon v2 art direction. Version 1 remains immutable and rollback-safe.
insert into public.template_versions(
  template_id,version,status,theme_defaults,layout_blueprint,seo_defaults,module_defaults,
  changelog_fa,changelog_en,published_at
)
select
  id,2,'published',
  '{"colors":{"background":"#050811","surface":"#F5F7FB","text":"#0B1020","primary":"#5C7CFF","accent":"#D7FF5F"},"typography":{"heading":"editorial-display","body":"humanist-sans"},"radius":5,"spacing":"cinematic","motion":"controlled"}'::jsonb,
  '{"renderer":"journey","renderer_version":2,"art_direction":"horizon-editorial","hero":"dynamic-horizon","effect":{"key":"threeui-emerald-horizon","version":"1.1.0","fallback":"static-gradient","reduced_motion":"static"},"sections":["hero-journey-map","editorial-process","cinematic-story","services-rail","mosaic-gallery","cinematic-cta"],"responsive_breakpoints":[360,720,980,1440]}'::jsonb,
  '{"schema":["Organization","ProfessionalService"],"indexable":true,"content_policy":"verified-facts-only"}'::jsonb,
  array['cms','media','seo_core','analytics_core','security','help']::text[],
  'بازطراحی کامل افق پویا با هویت تحریریه‌ای، قهرمان سینمایی، مسیر پروژه، کارت‌ها، گالری و دعوت به اقدام مستقل؛ همراه با حفظ نسخه پیشین برای بازگشت.',
  'Complete Dynamic Horizon redesign with an editorial identity, cinematic hero, project journey, independent cards, gallery and CTA while preserving the previous rollback version.',
  now()
from public.template_catalog
where key='rava-service-horizon'
on conflict(template_id,version) do nothing;

insert into public.starter_pack_template_compatibility(
  starter_pack_version_id,template_version_id,recommended_modules,is_default,active
)
select
  spv.id,tv.id,array['cms','media','seo_core','analytics_core','security','help']::text[],false,true
from public.starter_content_pack_versions spv
join public.starter_content_packs sp on sp.id=spv.starter_pack_id and sp.key='services.digital-agency.rava-team'
join public.template_catalog tc on tc.key='rava-service-horizon'
join public.template_versions tv on tv.template_id=tc.id and tv.version=2 and tv.status='published'
where spv.version=1 and spv.status='published'
on conflict(starter_pack_version_id,template_version_id)
do update set active=true,recommended_modules=excluded.recommended_modules;

create or replace function public.get_published_page(p_hostname text,p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
declare
  v_hostname text:=lower(trim(trailing '.' from btrim(coalesce(p_hostname,''))));
  v_slug text:=lower(trim(both '/' from btrim(coalesce(p_slug,''))));
  v_result jsonb;
begin
  if length(v_hostname)<1 or length(v_hostname)>253 or v_hostname ~ '[/:?#[:space:]]' then return null; end if;
  if length(v_slug)<1 or length(v_slug)>180 or v_slug ~ '[/\\?#[:space:]]' then return null; end if;

  select jsonb_build_object(
    'site',jsonb_build_object(
      'id',s.id,'name',s.name,'locale',s.primary_locale,'theme',s.theme_config,
      'templateKey',coalesce(tc.key,'rava-service-minimal'),
      'templateVersion',coalesce(tv.version,1),
      'layout',coalesce(sr.layout_snapshot,s.settings->'layout_config','{}'::jsonb)
    ),
    'page',jsonb_build_object(
      'id',p.id,'title',p.title,'slug',p.slug,'seo',p.seo,'published_at',p.published_at
    ),
    'blocks',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',b.id,'type',b.block_type,'position',b.position,'data',b.data
      ) order by b.position,b.id)
      from public.page_blocks b where b.page_id=p.id and b.visible=true
    ),'[]'::jsonb)
  ) into v_result
  from public.site_domains d
  join public.site_environments e on e.id=d.environment_id and e.site_id=d.site_id and e.active=true
  join public.sites s on s.id=d.site_id and s.status='active'
  join public.organizations o on o.id=s.organization_id and o.status='active'
  join public.pages p on p.site_id=s.id and p.slug=v_slug and p.status='published'
  left join public.site_design_state ds on ds.site_id=s.id
  left join public.site_releases sr on sr.id=ds.published_release_id and sr.site_id=s.id
  left join public.template_catalog tc on tc.id=sr.template_id and tc.status='active'
  left join public.template_versions tv on tv.id=sr.template_version_id and tv.template_id=tc.id and tv.status='published'
  where d.hostname=v_hostname and d.verified_at is not null
  limit 1;
  return v_result;
end;
$$;

revoke all on function public.get_published_page(text,text) from public;
grant execute on function public.get_published_page(text,text) to anon,authenticated;

update public.help_translations
set body_markdown=body_markdown||E'\n\nنسخه ۲ قالب «افق پویا راوا» یک طراحی کاملاً مستقل با قهرمان سینمایی، مسیر روشن پروژه و چیدمان تحریریه‌ای است. اعمال آن فقط پیش‌نویس می‌سازد؛ نسخه ۱ برای بازگشت امن حفظ می‌شود و انتشار همچنان تأیید جداگانه می‌خواهد.',
    version=version+1
where locale='fa' and topic_id=(select id from public.help_topics where key='platform.design.manage');

update public.help_translations
set body_markdown=body_markdown||E'\n\nVersion 2 of “RAVA Dynamic Horizon” is a fully independent direction with a cinematic hero, clear project journey and editorial composition. Applying it creates a draft only; version 1 remains available for safe rollback and publishing still requires separate approval.',
    version=version+1
where locale='en' and topic_id=(select id from public.help_topics where key='platform.design.manage');
