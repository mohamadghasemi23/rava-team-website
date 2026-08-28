begin;

update public.help_topics
set estimated_minutes=4,
    status='published',
    updated_at=now()
where key='platform.design.manage';

update public.help_translations ht
set title='انتخاب ظاهر و تأیید انتشار',
    summary='قالب را انتخاب کنید، خلاصه نسخه آماده را ببینید و انتشار را در یک اقدام جداگانه تأیید کنید.',
    body_markdown='در استفاده معمول فقط بخش‌های انتخاب ظاهر و تأیید انتشار لازم‌اند. انتخاب قالب یک پیش‌نویس امن می‌سازد و تا زمانی که انتشار را جداگانه تأیید نکنید، نسخه جدید فعال نمی‌شود. تنظیمات تخصصی و تاریخچه نسخه‌ها برای طراح یا زمان بازگردانی در بخش پیشرفته قرار دارند.',
    steps='["در بخش انتخاب ظاهر، قالب مناسب کسب‌وکار را انتخاب کنید.","در بخش بازبینی، نام قالب و شماره نسخه آماده را کنترل کنید.","اگر نتیجه مورد تأیید است، دکمه تأیید و انتشار نسخه را بزنید.","برای بررسی نسخه‌های قدیمی یا بازگردانی، بخش پیشرفته تاریخچه را باز کنید."]'::jsonb,
    warnings='["انتشار از انتخاب قالب جداست و نیازمند تأیید روشن شماست.","بازگردانی تاریخچه را پاک نمی‌کند و یک نسخه جدید و قابل پیگیری می‌سازد."]'::jsonb,
    search_keywords=array['انتخاب قالب','ظاهر سایت','پیش‌نمایش','تأیید انتشار','بازگردانی'],
    version=ht.version+1,
    updated_at=now()
from public.help_topics topic
where ht.topic_id=topic.id and topic.key='platform.design.manage' and ht.locale='fa';

update public.help_translations ht
set title='Choose appearance and approve publishing',
    summary='Choose a template, review the ready-version summary, and approve publishing as a separate action.',
    body_markdown='For normal setup, you only need the appearance selection and publishing approval areas. Choosing a template creates a safe draft, and the new version does not become active until you approve publishing separately. Advanced settings and version history remain available to a designer or for rollback.',
    steps='["Choose the template that fits the business in the appearance section.","Review the template name and ready-version number in the approval section.","If the result is approved, select Approve and publish version.","Open advanced history only when reviewing an older version or rolling back."]'::jsonb,
    warnings='["Publishing is separate from choosing a template and requires your explicit approval.","Rollback preserves history and creates a new traceable version."]'::jsonb,
    search_keywords=array['choose template','site appearance','preview','approve publishing','rollback'],
    version=ht.version+1,
    updated_at=now()
from public.help_topics topic
where ht.topic_id=topic.id and topic.key='platform.design.manage' and ht.locale='en';

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/platform/sites/:siteId/design','design-engine',10
from public.help_topics where key='platform.design.manage'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority;

commit;
