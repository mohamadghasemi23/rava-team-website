-- Contextual bilingual guidance for the tenant-scoped customer message inbox.
with topic as (
  insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('customer.messages.manage','cms','customer.messages','leads.view','published','content','customer',true,4,38)
  on conflict(key) do update set module_key=excluded.module_key,feature_key=excluded.feature_key,minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,audience=excluded.audience
  returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','پیگیری پیام‌های سایت','درخواست‌های واقعی ارسال‌شده از فرم‌های همین سایت را ببینید و پیگیری کنید.','پیام خوانده‌نشده تا زمان رسیدگی در فهرست کارها باقی می‌ماند. بایگانی، پیام را حذف نمی‌کند و سابقه آن برای پیگیری محفوظ می‌ماند.',
'["پیام موردنظر را از فهرست انتخاب کنید.","اطلاعات تماس و متن درخواست را بررسی کنید.","پس از پیگیری واقعی، وضعیت را به رسیدگی‌شده تغییر دهید.","پیام‌های پایان‌یافته را در صورت نیاز بایگانی کنید."]'::jsonb,
'["اطلاعات تماس مشتری را خارج از نیاز کاری منتشر نکنید.","رسیدگی‌شده را فقط پس از پیگیری واقعی انتخاب کنید."]'::jsonb,
array['پیام','فرم','درخواست','تماس','رسیدگی','بایگانی'] from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Track site messages','Review and follow up on real requests submitted through this Site’s forms.','Unread messages remain in the task list until resolved. Archiving does not delete a message and preserves its history for follow-up.',
'["Select a message from the list.","Review the contact details and request.","After genuine follow-up, mark the message as resolved.","Archive completed messages when appropriate."]'::jsonb,
'["Do not disclose customer contact data outside its business purpose.","Mark a message resolved only after genuine follow-up."]'::jsonb,
array['message','form','request','contact','resolved','archive'] from public.help_topics where key='customer.messages.manage'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/messages*','customer-messages',10 from public.help_topics where key='customer.messages.manage'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority;
