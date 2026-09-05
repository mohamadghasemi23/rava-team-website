-- Contextual guidance for the Help / Academy engine itself.

with topic as (
  insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('platform.help.manage','help','help.academy.manage','platform.help.manage','published','help','owner',true,7,25)
  on conflict(key) do update set module_key=excluded.module_key,feature_key=excluded.feature_key,minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,audience=excluded.audience returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','مدیریت Help و RAVA Academy','راهنمای Contextual فارسی و انگلیسی، دوره‌ها و Progress را از یک موتور مرکزی مدیریت کن.','برای هر Feature یک Help Key پایدار تعریف کن، ترجمه فارسی و انگلیسی را نگه دار و Route مناسب را Context Binding کن. Academy همین Topicها را به شکل Course/Lesson سازمان‌دهی می‌کند.',
'["Help Topic را با key پایدار و Permission مناسب بساز.","محتوای فارسی و انگلیسی را کامل کن.","برای صفحه مرتبط Context Binding تعریف کن.","Audience و هشدارهای امنیتی را بررسی کن.","در صورت نیاز Topic را به دوره Academy اضافه کن."]'::jsonb,
'["Help نباید شامل رمز، Token، Credential یا داده خصوصی Tenant باشد.","راهنمای عملیات حساس باید minimum_permission داشته باشد."]'::jsonb,
array['راهنما','آکادمی','help','academy','context','translation'] from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Manage Help and RAVA Academy','Manage contextual Persian/English guidance, courses and learner progress through one central engine.','Give every feature a stable Help Key, maintain Persian and English translations, and bind the topic to the relevant route. Academy organizes the same topics into courses and lessons.',
'["Create the Help Topic with a stable key and appropriate permission.","Complete both Persian and English content.","Add a contextual route binding.","Review audience and security warnings.","Add the topic to an Academy course when appropriate."]'::jsonb,
'["Never place passwords, tokens, credentials or private tenant data in help content.","Sensitive operational guidance must define minimum_permission."]'::jsonb,
array['help','academy','context','translation'] from public.help_topics where key='platform.help.manage'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/help*','help-management',10 from public.help_topics where key='platform.help.manage'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority;
insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/academy*','academy',10 from public.help_topics where key='platform.help.manage'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority;
