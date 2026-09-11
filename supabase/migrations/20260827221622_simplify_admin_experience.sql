begin;

update public.help_topics set estimated_minutes=5,updated_at=now()
where key='admin.guided_experience';

update public.help_translations t set
  title='راه‌اندازی ساده سایت با راوا',
  summary='پنج قدم روشن، فقط با اطلاعات ضروری و بدون درگیری با تنظیمات فنی.',
  body_markdown='از صفحه /admin همیشه قدم بعدی مشخص است. راوا شناسه‌ها، محیط‌ها، تنظیمات فنی و کنترل‌های امنیتی را پشت صحنه مدیریت می‌کند. هیچ محتوایی بدون پیش‌نمایش و تأیید جداگانه منتشر نمی‌شود.',
  steps='["نام مشتری و سایت را وارد کنید.","محتوای آماده متناسب با حوزه کسب‌وکار را انتخاب کنید.","اطلاعات واقعی، صفحه‌ها، تصویرها و ویدیوها را بازبینی کنید.","قالب، رنگ و قلم را در پیش‌نمایش انتخاب کنید.","نسخه نهایی را ببینید و انتشار را جداگانه تأیید کنید."]'::jsonb,
  warnings='["اطلاعات نمونه را پیش از انتشار با اطلاعات واقعی جایگزین کنید.","ساخت پیش‌نویس به معنی انتشار عمومی نیست.","تغییر نسخه اصلی نیازمند تأیید صریح و جداگانه است."]'::jsonb,
  search_keywords=array['راه‌اندازی ساده','قدم بعدی','ساخت سایت','پیش‌نمایش','تأیید انتشار'],
  version=t.version+1,updated_at=now()
from public.help_topics h where h.id=t.topic_id and h.key='admin.guided_experience' and t.locale='fa';

update public.help_translations t set
  title='Set up a site simply with RAVA',
  summary='Five clear steps with essential information and no technical configuration burden.',
  body_markdown='The next action is always clear on /admin. RAVA manages identifiers, environments, technical settings, and security controls behind the scenes. Nothing is published without preview and separate approval.',
  steps='["Enter the customer and site names.","Choose ready-made content for the business field.","Review real information, pages, images, and videos.","Choose the template, colors, and typeface in preview.","Review the final version and approve release separately."]'::jsonb,
  warnings='["Replace sample information with verified business facts before release.","Creating drafts does not publish the website.","Production changes require separate explicit approval."]'::jsonb,
  search_keywords=array['simple setup','next step','create site','preview','release approval'],
  version=t.version+1,updated_at=now()
from public.help_topics h where h.id=t.topic_id and h.key='admin.guided_experience' and t.locale='en';

update public.help_translations t set
  title='ساخت ساده مشتری و سایت',
  summary='فقط نام مشتری، نام سایت و زبان اصلی را وارد کنید؛ تنظیمات فنی خودکار است.',
  body_markdown='در صفحه /admin/platform/sites/new اطلاعات ضروری را وارد می‌کنید. راوا شناسه‌های داخلی، محیط‌ها، واحد پول و منطقه زمانی را امن و خودکار می‌سازد و سپس شما را مستقیم به انتخاب محتوای مناسب کسب‌وکار می‌برد.',
  steps='["نام مشتری یا کسب‌وکار را وارد کنید.","در صورت نیاز نام جداگانه‌ای برای سایت بنویسید.","زبان اصلی را انتخاب کنید.","پیش‌نمایش عملیات را بخوانید و ساخت سایت را تأیید کنید."]'::jsonb,
  warnings='["هیچ چیزی در این مرحله عمومی نمی‌شود.","شناسه‌ها و تنظیمات زیرساختی را راوا خودکار مدیریت می‌کند."]'::jsonb,
  search_keywords=array['ساخت سایت','مشتری جدید','راه‌اندازی ساده','زبان سایت'],
  version=t.version+1,updated_at=now()
from public.help_topics h where h.id=t.topic_id and h.key='platform.owner.provision_site' and t.locale='fa';

update public.help_translations t set
  title='Create a customer site simply',
  summary='Enter only the customer name, site name, and primary language; technical settings are automatic.',
  body_markdown='On /admin/platform/sites/new, enter essential information. RAVA securely creates internal identifiers, environments, currency, and time zone, then takes you directly to suitable business content.',
  steps='["Enter the customer or business name.","Add a separate site name only if needed.","Choose the primary language.","Read the operation preview and confirm site creation."]'::jsonb,
  warnings='["Nothing is made public at this stage.","RAVA manages identifiers and infrastructure settings automatically."]'::jsonb,
  search_keywords=array['create site','new customer','simple setup','site language'],
  version=t.version+1,updated_at=now()
from public.help_topics h where h.id=t.topic_id and h.key='platform.owner.provision_site' and t.locale='en';

commit;
