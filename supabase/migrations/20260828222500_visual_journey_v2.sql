-- Versioned release metadata for the full Visual Journey renderer redesign.
insert into public.template_versions(
  template_id,version,status,theme_defaults,layout_blueprint,seo_defaults,module_defaults,
  changelog_fa,changelog_en,published_at
)
select id,2,'published',
  '{"colors":{"background":"#4568BA","surface":"#FFFFFF","text":"#101A38","primary":"#3158BD","accent":"#A9C5FF"},"typography":{"heading":"display-rounded","body":"locale-managed"},"radius":30,"spacing":"spacious","motion":"standard-accessible"}'::jsonb,
  '{"renderer":"journey","design_system":"rava-visual-journey-v2","variance":8,"motion":6,"density":2,"header":"floating-conversion","hero":"immersive-illustrated-split","sections":["narrative-route","story","trust-principles","cms-content","cinematic-cta"],"responsive_breakpoints":[375,768,1024,1440],"reduced_motion":true,"footer":"night-minimal"}'::jsonb,
  '{"schema":["Organization","ProfessionalService"],"indexable":true,"content_policy":"verified-facts-only","performance":{"hero_asset":"webp","dimensions_reserved":true}}'::jsonb,
  array['cms','media','seo_core','analytics_core','security','help']::text[],
  'بازطراحی کامل روایت تصویری با مسیر همکاری، اعتمادسازی، واکنش‌گرایی، دسترس‌پذیری و دعوت به اقدام سینمایی.',
  'Full Visual Journey redesign with a guided narrative, trust system, responsive accessibility and a cinematic call to action.',
  now()
from public.template_catalog where key='rava-service-journey'
on conflict(template_id,version) do nothing;

insert into public.starter_pack_template_compatibility(
  starter_pack_version_id,template_version_id,recommended_modules,is_default,active
)
select spv.id,tv.id,array['cms','media','seo_core','analytics_core','security','help']::text[],false,true
from public.starter_content_pack_versions spv
join public.starter_content_packs sp on sp.id=spv.starter_pack_id and sp.key='services.digital-agency.rava-team'
join public.template_catalog tc on tc.key='rava-service-journey'
join public.template_versions tv on tv.template_id=tc.id and tv.version=2 and tv.status='published'
where spv.version=1 and spv.status='published'
on conflict(starter_pack_version_id,template_version_id) do update
set active=true,recommended_modules=excluded.recommended_modules;

update public.help_translations
set body_markdown=body_markdown||E'\n\nنسخه دوم «روایت تصویری راوا» یک بازطراحی کامل و واکنش‌گراست. ابتدا آن را روی پیش‌نویس اعمال کنید، صفحه‌های فارسی و انگلیسی را در موبایل و دسکتاپ ببینید و فقط پس از تأیید نسخه منتشر کنید.',version=version+1
where locale='fa' and topic_id=(select id from public.help_topics where key='platform.design.manage');

update public.help_translations
set body_markdown=body_markdown||E'\n\nVersion 2 of “RAVA Visual Journey” is a complete responsive redesign. Apply it to a draft, review both English and Persian pages on mobile and desktop, and publish only after approval.',version=version+1
where locale='en' and topic_id=(select id from public.help_topics where key='platform.design.manage');
