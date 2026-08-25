-- Contextual, bilingual guidance for site-scoped page management.
with topic as (
  insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('cms.pages.manage','cms','cms.pages','cms.view','published','content','admin',true,6,35)
  on conflict(key) do update set module_key=excluded.module_key,feature_key=excluded.feature_key,minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,audience=excluded.audience returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','مدیریت صفحات هر سایت','صفحات را فقط در محدوده سایت فعال بساز، ویرایش و منتشر کن.','در راوا هر صفحه به یک Site مشخص تعلق دارد. مشاهده، ویرایش و انتشار با Permissionهای مستقل کنترل می‌شوند و انتشار در Audit ثبت می‌شود.',
'["سایت موردنظر را انتخاب کن.","صفحه را با عنوان و Slug مناسب بساز.","Blockها و SEO را ویرایش کن.","قبل از انتشار محتوا و سایت فعال را بازبینی کن.","با دسترسی Publish صفحه را منتشر کن."]'::jsonb,
'["شناسه Site را از فرم یا URL به‌عنوان مجوز اعتماد نکن.","محتوای مشتری‌های مختلف را در یک صفحه یا کتابخانه رسانه مخلوط نکن."]'::jsonb,
array['صفحه','محتوا','سایت','cms','publish','block'] from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Manage site pages','Create, edit and publish pages only inside the active site scope.','Every RAVA page belongs to one Site. Viewing, editing and publishing use independent permissions, and publishing is recorded in the audit trail.',
'["Select the target site.","Create a page with a suitable title and slug.","Edit blocks and SEO metadata.","Review the content and active site before publishing.","Publish with the dedicated Publish permission."]'::jsonb,
'["Never trust a Site identifier from a form or URL as authorization.","Do not mix content or media belonging to different customers."]'::jsonb,
array['page','content','site','cms','publish','block'] from public.help_topics where key='cms.pages.manage'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/pages*','cms-pages',10 from public.help_topics where key='cms.pages.manage'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority;
