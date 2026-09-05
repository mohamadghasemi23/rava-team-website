-- P0: bilingual, contextual onboarding for the RAVA administration experience.
with topic as (
  insert into public.help_topics(
    key,module_key,feature_key,minimum_permission,status,category,audience,
    is_featured,estimated_minutes,sort_order
  ) values(
    'admin.guided_experience','help','admin.guided_experience','platform.sites.manage',
    'published','getting-started','owner',true,8,1
  )
  on conflict(key) do update set
    minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,
    audience=excluded.audience,is_featured=excluded.is_featured,
    estimated_minutes=excluded.estimated_minutes,sort_order=excluded.sort_order,updated_at=now()
  returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','از کجای پنل راوا شروع کنم؟','مسیر هشت‌مرحله‌ای راه‌اندازی، کار بعدی را به‌ترتیب و بدون انتشار ناخواسته نشان می‌دهد.',
  'راوا اطلاعات فنی را به یک مسیر قابل‌فهم تبدیل می‌کند. هر مرحله وضعیت مشخص دارد، اطلاعات میان مراحل حفظ می‌شود و عملیات مهم پیش از اجرا باید پیش‌نمایش و تأیید داشته باشند.',
  '["حساب مالک و تنظیمات امنیتی را بررسی کنید.","سایت و محیط آزمایشی را بسازید.","بسته محتوای متناسب با کسب‌وکار را فقط به‌شکل پیش‌نویس نصب کنید.","اطلاعات واقعی و تأییدشده برند را کامل کنید.","صفحه‌ها و منوی بازدیدکنندگان را مرتب کنید.","قالب، رنگ و فونت را در پیش‌نمایش مقایسه کنید.","نسخه کامل را در محیط آزمایشی بازبینی کنید.","پس از عبور همه کنترل‌ها، انتشار را جداگانه تأیید کنید."]'::jsonb,
  '["نصب محتوای شروع به معنی انتشار سایت نیست.","اطلاعات نمونه را قبل از انتشار با واقعیت کسب‌وکار جایگزین کنید.","تغییر Production نیازمند تأیید صریح و جداگانه است."]'::jsonb,
  array['شروع کار','قدم بعدی','راه‌اندازی سایت','پیش‌نمایش','آموزش پنل']
from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,
  body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,
  search_keywords=excluded.search_keywords,version=public.help_translations.version+1,updated_at=now();

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Where should I start in RAVA?','An eight-step setup journey keeps the next action clear and prevents accidental publishing.',
  'RAVA turns platform configuration into a guided journey. Every step has a visible state, progress is preserved, and important actions require a preview and explicit approval before execution.',
  '["Review the owner account and security settings.","Create the site and its staging environment.","Install business-relevant starter content as drafts only.","Complete verified brand facts and contact details.","Arrange visitor navigation and pages.","Compare the template, color and typography in preview.","Review the complete experience in staging.","Approve publishing separately after every release gate passes."]'::jsonb,
  '["Installing starter content does not publish a website.","Replace samples with verified business facts before release.","Production changes require separate, explicit approval."]'::jsonb,
  array['getting started','next step','site setup','preview','admin training']
from public.help_topics where key='admin.guided_experience'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,
  body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,
  search_keywords=excluded.search_keywords,version=public.help_translations.version+1,updated_at=now();

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin','getting-started-journey',1 from public.help_topics where key='admin.guided_experience'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority,updated_at=now();
