-- Public website imagery. Private customer documents must use a separate private bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('rava-media','rava-media',true,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists rava_media_site_select on storage.objects;
drop policy if exists rava_media_site_insert on storage.objects;
drop policy if exists rava_media_site_delete on storage.objects;

create policy rava_media_site_select on storage.objects for select to authenticated
using (
  bucket_id='rava-media' and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then private.can_manage_site_resource(((storage.foldername(name))[1])::uuid,'media.manage')
    else false
  end
);

create policy rava_media_site_insert on storage.objects for insert to authenticated
with check (
  bucket_id='rava-media' and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then private.can_manage_site_resource(((storage.foldername(name))[1])::uuid,'media.manage')
    else false
  end
);

create policy rava_media_site_delete on storage.objects for delete to authenticated
using (
  bucket_id='rava-media' and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then private.can_manage_site_resource(((storage.foldername(name))[1])::uuid,'media.manage')
    else false
  end
);

with topic as (
  insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('media.library.manage','media','media.library','media.manage','published','content','admin',true,5,36)
  on conflict(key) do update set module_key=excluded.module_key,feature_key=excluded.feature_key,minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,audience=excluded.audience returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','کتابخانه رسانه هر سایت','تصاویر عمومی وب‌سایت را فقط در محدوده سایت فعال مدیریت کن.','فایل در Backend اعتبارسنجی می‌شود و فقط JPEG، PNG، WebP و GIF تا سقف ۱۰ مگابایت پذیرفته می‌شوند. مسیر Storage با Site آغاز می‌شود و عملیات مهم Audit می‌شوند.',
'["سایت را انتخاب کن.","تصویر و Alt Text دقیق را وارد کن.","پیش‌نمایش را کنترل و آپلود را تأیید کن.","برای حذف، وابستگی تصویر در صفحات را بررسی کن."]'::jsonb,
'["SVG به دلیل امکان محتوای فعال پذیرفته نمی‌شود.","این کتابخانه برای تصاویر عمومی وب‌سایت است؛ اسناد خصوصی باید در Storage خصوصی جداگانه باشند."]'::jsonb,
array['رسانه','تصویر','آپلود','alt','storage','سایت'] from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Site media library','Manage public website images only inside the active site scope.','Files are validated in the backend. Only JPEG, PNG, WebP and GIF files up to 10 MB are accepted. Storage paths begin with the Site identifier and important mutations are audited.',
'["Select the site.","Choose an image and write accurate alt text.","Review the preview and confirm upload.","Check page usage before deleting an image."]'::jsonb,
'["SVG is rejected because it can contain active content.","This library is for public website imagery; private documents require separate private storage."]'::jsonb,
array['media','image','upload','alt','storage','site'] from public.help_topics where key='media.library.manage'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/media*','media-library',10 from public.help_topics where key='media.library.manage'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority;
