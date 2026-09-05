-- Register the owner-approved RAVA TEAM flagship as a versioned, selectable service Template.
insert into public.template_catalog(
  key,name_fa,name_en,description_fa,description_en,industry_key,status,commercial_tier,is_public,metadata
) values (
  'rava-service-living-system','سیستم زنده راوا','RAVA Living System',
  'قالب ممتاز خدماتی راوا با صفحه‌ساز یکپارچه، پیش‌نمایش واکنش‌گرا، مسیر روشن محتوا تا انتشار و طراحی شیشه‌ای مدرن.',
  'RAVA’s flagship service template with an integrated site builder, responsive previews, a clear content-to-release journey and modern optical-glass design.',
  'services','active','premium',true,
  '{"family":"services","renderer":"living-system","art_direction":"rava-digital-atelier","customer_zero_flagship":true,"starter":false}'::jsonb
)
on conflict(key) do update set
  name_fa=excluded.name_fa,name_en=excluded.name_en,
  description_fa=excluded.description_fa,description_en=excluded.description_en,
  industry_key=excluded.industry_key,status=excluded.status,commercial_tier=excluded.commercial_tier,
  is_public=excluded.is_public,metadata=excluded.metadata,updated_at=now();

insert into public.template_versions(
  template_id,version,status,theme_defaults,layout_blueprint,seo_defaults,module_defaults,
  changelog_fa,changelog_en,published_at
)
select id,1,'published',
  '{"colors":{"background":"#F3EFEC","surface":"#FFFFFF","text":"#071A33","primary":"#1557FF","verified":"#159B66"},"typography":{"heading":"estedad","body":"vazirmatn"},"radius":20,"spacing":"editorial","motion":"restrained"}'::jsonb,
  '{"renderer":"living-system","renderer_version":1,"art_direction":"rava-digital-atelier","navigation":"floating-optical-glass","hero":"integrated-rava-builder","journey":["content","design","preview","publish"],"responsive_breakpoints":[390,820,1200,1536],"default_menu_state":"closed"}'::jsonb,
  '{"schema":["Organization","ProfessionalService"],"indexable":true,"content_policy":"verified-facts-only","multilingual":true}'::jsonb,
  array['cms','media','seo_core','analytics_core','security','help']::text[],
  'انتشار نخست قالب ممتاز سیستم زنده راوا بر اساس طرح‌های تأییدشده دسکتاپ، موبایل و منوی باز',
  'Initial RAVA Living System flagship release based on the approved desktop, mobile and open-menu visuals',now()
from public.template_catalog where key='rava-service-living-system'
on conflict(template_id,version) do update set
  status=excluded.status,theme_defaults=excluded.theme_defaults,layout_blueprint=excluded.layout_blueprint,
  seo_defaults=excluded.seo_defaults,module_defaults=excluded.module_defaults,
  changelog_fa=excluded.changelog_fa,changelog_en=excluded.changelog_en,
  published_at=coalesce(public.template_versions.published_at,excluded.published_at);

insert into public.starter_pack_template_compatibility(
  starter_pack_version_id,template_version_id,recommended_modules,is_default,active
)
select spv.id,tv.id,array['cms','media','seo_core','analytics_core','security','help']::text[],false,true
from public.starter_content_pack_versions spv
join public.starter_content_packs sp on sp.id=spv.starter_pack_id and sp.key='services.digital-agency.rava-team'
join public.template_catalog tc on tc.key='rava-service-living-system'
join public.template_versions tv on tv.template_id=tc.id and tv.version=1 and tv.status='published'
where spv.version=1 and spv.status='published'
on conflict(starter_pack_version_id,template_version_id) do update set
  active=true,recommended_modules=excluded.recommended_modules;

update public.help_translations
set body_markdown=body_markdown||E'\n\nقالب «سیستم زنده راوا» قالب ممتاز خدماتی و انتخاب اصلی راوا تیم است. انتخاب آن فقط یک پیش‌نویس قابل بازبینی می‌سازد؛ تا زمانی که انتشار را جداگانه تأیید نکنید، سایت عمومی تغییر نمی‌کند.',
    version=version+1
where locale='fa'
  and topic_id=(select id from public.help_topics where key='platform.design.manage')
  and body_markdown not like '%قالب «سیستم زنده راوا»%';

update public.help_translations
set body_markdown=body_markdown||E'\n\n“RAVA Living System” is the flagship service Template and RAVA TEAM’s primary choice. Selecting it creates a reviewable draft only; the public website remains unchanged until publishing is approved separately.',
    version=version+1
where locale='en'
  and topic_id=(select id from public.help_topics where key='platform.design.manage')
  and body_markdown not like '%“RAVA Living System”%';
