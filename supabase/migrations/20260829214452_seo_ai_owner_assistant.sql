-- Owner-preview AI SEO assistant: permission vocabulary and bilingual contextual help.
insert into public.permissions(key,module_key,name_fa,name_en,risk_level)
values('seo.ai.generate','seo_ai','ساخت پیشنهاد سئوی هوشمند','Generate AI SEO suggestions','normal')
on conflict(key) do update set module_key=excluded.module_key,name_fa=excluded.name_fa,name_en=excluded.name_en,risk_level=excluded.risk_level;

with topic as (
 insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
 values('seo.ai.owner_assistant','seo_ai','seo.ai_assistant','platform.sites.manage','published','seo','owner',true,5,38)
 on conflict(key) do update set module_key=excluded.module_key,feature_key=excluded.feature_key,minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,audience=excluded.audience returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','پیشنهاد هوشمند برای نمایش صفحه در گوگل','هوش مصنوعی عنوان و توضیح پیشنهادی می‌سازد؛ شما نتیجه را مقایسه و تأیید می‌کنید.','عنوان صفحه در گوگل نام نتیجه و توضیح صفحه خلاصه‌ای از ارزش آن است. پیشنهاد هوشمند، محتوای همین صفحه را بررسی می‌کند اما چیزی را خودکار ذخیره یا منتشر نمی‌کند. گوگل نیز ممکن است متن دیگری را برای نتیجه انتخاب کند.',
'["محتوای واقعی صفحه را کامل کنید.","دکمه پیشنهاد هوشمند را بزنید.","عنوان، توضیح، عبارت اصلی و دلیل پیشنهاد را بخوانید.","در صورت مناسب‌بودن، پیشنهاد را در فیلدها قرار دهید.","پیش‌نمایش را بررسی و سپس پیش‌نویس را ذخیره کنید."]'::jsonb,
'["هیچ پیشنهاد هوشمندی تضمین رتبه در گوگل نیست.","ادعاها، قیمت‌ها، مجوزها و اطلاعات کسب‌وکار را خودتان تأیید کنید.","قرار دادن پیشنهاد در فیلدها به معنی انتشار عمومی نیست."]'::jsonb,
array['سئو','گوگل','عنوان صفحه','توضیح صفحه','هوش مصنوعی','پیش نمایش'] from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','AI search appearance suggestions','AI suggests a page title and description; you compare and approve the result.','The Google page title names the result and the description summarizes its value. The assistant reviews this page content but never saves or publishes automatically. Google may still choose different result text.',
'["Complete the factual page content.","Select AI suggestion.","Review the title, description, focus phrase, and reasoning.","Apply the suggestion to the fields only when appropriate.","Review the preview and then save the draft."]'::jsonb,
'["No AI suggestion guarantees search rankings.","Verify business claims, prices, licences, and factual details yourself.","Applying a suggestion to fields does not publish it."]'::jsonb,
array['seo','google','page title','page description','ai','preview'] from public.help_topics where key='seo.ai.owner_assistant'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/pages/:id','seo-ai-assistant',20 from public.help_topics where key='seo.ai.owner_assistant'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority;
