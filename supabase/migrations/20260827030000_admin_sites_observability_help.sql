-- Complete bilingual contextual guidance for the remaining core admin routes.
with topics(key,module_key,feature_key,minimum_permission,category,audience,estimated_minutes,sort_order) as (
  values
    ('platform.sites.manage','help','platform.sites.console','platform.sites.manage','platform','owner',6,12),
    ('platform.observability.review','help','platform.observability.console','logs.view','operations','admin',7,82)
)
insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
select key,module_key,feature_key,minimum_permission,'published',category,audience::public.help_audience,true,estimated_minutes,sort_order from topics
on conflict(key) do update set module_key=excluded.module_key,feature_key=excluded.feature_key,
  minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,
  audience=excluded.audience,estimated_minutes=excluded.estimated_minutes,sort_order=excluded.sort_order,updated_at=now();

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','مدیریت سایت‌ها و محیط‌ها','از ساخت سایت تا ورود به محتوا، طراحی و محیط آزمایشی را در یک مسیر مشخص انجام دهید.',
  'هر سایت متعلق به یک مشتری است و محیط آزمایشی، محیط اصلی، دامنه‌ها و امکانات آن مستقل مدیریت می‌شوند. لینک همین صفحه را برای بازگشت مستقیم نگه دارید: /admin/platform/sites',
  '["از فهرست سایت‌ها، سایت موردنظر را انتخاب کنید.","وضعیت محیط‌ها، دامنه‌ها و امکانات فعال را بررسی کنید.","محتوای آغازین را فقط به‌شکل پیش‌نویس نصب کنید.","صفحه‌ها و رسانه‌ها را تکمیل کنید.","طراحی را در محیط آزمایشی بازبینی کنید.","انتشار اصلی را فقط پس از عبور کنترل‌ها تأیید کنید."]'::jsonb,
  '["ساخت سایت به معنی اتصال دامنه یا انتشار اصلی نیست.","دامنه و محیط اصلی بدون تأیید صریح تغییر نمی‌کنند."]'::jsonb,
  array['سایت','محیط آزمایشی','دامنه','امکانات','راه‌اندازی']
from public.help_topics where key='platform.sites.manage'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,
  steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1,updated_at=now();

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Manage sites and environments','Use one clear journey from site creation to content, design, and staging review.',
  'Each site belongs to a customer. Its staging and production environments, domains, and entitlements are managed independently. Keep this direct route for returning to the catalog: /admin/platform/sites',
  '["Select the target site from the site catalog.","Review environments, domains, and active entitlements.","Install starter content as drafts only.","Complete pages and media.","Review design in staging.","Approve production publishing only after every gate passes."]'::jsonb,
  '["Creating a site does not connect a domain or publish to production.","Domains and production remain unchanged without explicit approval."]'::jsonb,
  array['site','staging','domain','entitlement','setup']
from public.help_topics where key='platform.sites.manage'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,
  steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1,updated_at=now();

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','بررسی رخدادها و خطاها','گزارش فعالیت و خطاها را بدون نمایش اطلاعات محرمانه بررسی و پیگیری کنید.',
  'گزارش فعالیت در /admin/system/logs و مرکز خطا در /admin/system/errors در دسترس است. شناسه خطا را برای پیگیری نگه دارید و جزئیات فنی پاک‌سازی‌شده را فقط با افراد مجاز به اشتراک بگذارید.',
  '["بازه زمانی و نوع رخداد را محدود کنید.","محدوده مشتری یا سایت را کنترل کنید.","شناسه رخداد یا خطا را ثبت کنید.","علت قابل‌فهم و مراحل پیشنهادی را بررسی کنید.","پس از رفع علت، وضعیت پیگیری را به‌روزرسانی کنید."]'::jsonb,
  '["گذرواژه، کلید، نشست یا اطلاعات پرداخت را در گزارش وارد نکنید.","جزئیات فنی خام نباید به کاربر نهایی نمایش داده شود."]'::jsonb,
  array['گزارش فعالیت','خطا','شناسه خطا','پیگیری','امنیت']
from public.help_topics where key='platform.observability.review'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,
  steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1,updated_at=now();

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Review events and errors','Investigate activity and errors without exposing confidential information.',
  'Activity logs are available at /admin/system/logs and the error center at /admin/system/errors. Keep the error ID for follow-up and share sanitized technical detail only with authorized people.',
  '["Narrow the time range and event type.","Confirm the customer or site scope.","Record the event or error ID.","Review the plain-language cause and suggested steps.","Update follow-up status after resolving the cause."]'::jsonb,
  '["Never enter passwords, keys, sessions, or payment data in logs.","Raw technical errors must not be exposed to end users."]'::jsonb,
  array['activity log','error','error ID','follow-up','security']
from public.help_topics where key='platform.observability.review'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,
  steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1,updated_at=now();

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/platform/sites*','site-management',10 from public.help_topics where key='platform.sites.manage'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority,updated_at=now();
insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/system/logs*','activity-log-review',10 from public.help_topics where key='platform.observability.review'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority,updated_at=now();
insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/system/errors*','error-review',10 from public.help_topics where key='platform.observability.review'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority,updated_at=now();
