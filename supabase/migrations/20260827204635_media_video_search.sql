-- Searchable tenant media catalog with resumable image and video storage.
begin;
alter table public.media_assets
  add column media_kind text generated always as (
    case when mime_type like 'video/%' then 'video' else 'image' end
  ) stored,
  add column duration_seconds numeric(12,3),
  add column search_vector tsvector generated always as (
    to_tsvector('simple'::regconfig,coalesce(file_name,'')||' '||coalesce(alt_text,''))
  ) stored;

alter table public.media_assets
  add constraint media_assets_supported_mime check (
    mime_type in ('image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm')
  ),
  add constraint media_assets_duration_valid check (
    duration_seconds is null or (duration_seconds>=0 and duration_seconds<=86400)
  );

create index media_assets_search_idx on public.media_assets using gin(search_vector)
where deleted_at is null;

create index media_assets_site_kind_created_idx on public.media_assets(site_id,media_kind,created_at desc)
where deleted_at is null;

update storage.buckets set
  file_size_limit=104857600,
  allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
where id='rava-media';

update public.help_translations t set
  title='مدیریت کتابخانه رسانه',
  summary='تصویر و ویدیو را در کتابخانه اختصاصی همین سایت بارگذاری، پیدا و مدیریت کنید.',
  body_markdown='در صفحه /admin/media فایل‌ها بر اساس نام و متن جایگزین جست‌وجو و به‌صورت صفحه‌بندی‌شده نمایش داده می‌شوند. تصویر تا ۱۰ مگابایت و ویدیوی ام‌پی‌فور یا وب‌ام تا ۱۰۰ مگابایت پذیرفته می‌شود. بارگذاری ویدیو از روش ادامه‌پذیر استفاده می‌کند تا قطع کوتاه اینترنت باعث شروع دوباره نشود.',
  steps=to_jsonb(array['سایت فعال را بررسی کنید.','تصویر یا ویدیو را انتخاب و پیش‌نمایش آن را ببینید.','برای دسترس‌پذیری، متن جایگزین دقیق بنویسید.','پیش‌نمایش نهایی را بررسی و بارگذاری را تأیید کنید.','با جست‌وجو، نوع رسانه و شماره صفحه فایل موردنظر را پیدا کنید.']),
  warnings=to_jsonb(array['فایل محرمانه را در کتابخانه عمومی بارگذاری نکنید.','برای ویدیو فقط ام‌پی‌فور یا وب‌ام و حداکثر ۱۰۰ مگابایت مجاز است.','حذف رسانه ممکن است نمایش آن را در صفحه‌های سایت مختل کند.']),
  search_keywords=array['رسانه','تصویر','ویدیو','بارگذاری','جست‌وجو','صفحه‌بندی']
from public.help_topics h where t.topic_id=h.id and h.key='media.library.manage' and t.locale='fa';

update public.help_translations t set
  title='Manage the media library',
  summary='Upload, find, and manage images and videos in this site’s isolated media library.',
  body_markdown='On /admin/media, files can be searched by name and alternative text and are displayed with pagination. Images up to 10 MB and MP4 or WebM videos up to 100 MB are accepted. Video upload is resumable, so a brief connection interruption does not force the upload to restart.',
  steps=to_jsonb(array['Confirm the active site.','Choose an image or video and inspect its preview.','Write accurate alternative text for accessibility.','Review the final preview and confirm the upload.','Use search, media type, and page navigation to locate a file.']),
  warnings=to_jsonb(array['Do not upload confidential files to the public library.','Videos must be MP4 or WebM and no larger than 100 MB.','Deleting media can break its use on site pages.']),
  search_keywords=array['media','image','video','upload','search','pagination']
from public.help_topics h where t.topic_id=h.id and h.key='media.library.manage' and t.locale='en';

commit;
