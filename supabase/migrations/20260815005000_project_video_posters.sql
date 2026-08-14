drop policy if exists "public read published project media" on public.media_assets;
create policy "public read published project media" on public.media_assets
for select to anon using (
  deleted_at is null and exists (
    select 1 from public.projects p
    where p.status='published' and (
      p.cover_media_id = media_assets.id
      or media_assets.id = any(p.gallery_media_ids)
      or exists (
        select 1 from jsonb_array_elements(coalesce(p.gallery_items,'[]'::jsonb)) item
        where item->>'media_id'=media_assets.id::text
           or item->>'poster_media_id'=media_assets.id::text
      )
    )
  )
);

insert into public.admin_help_items(help_key,title_fa,body_fa,title_en,body_en,warning_fa,warning_en)
values('projects.video_poster','پوستر ویدیو','برای هر ویدیو می‌توانید یک تصویر پوستر دستی انتخاب کنید. اگر انتخاب نکنید، سیستم هنگام آپلود از حدود ثانیه ۱ ویدیو Thumbnail خودکار می‌سازد.','Video poster','You can choose a manual poster for each video. If you do not, the uploader attempts to generate a thumbnail from about the first second of the video.',null,null)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,title_en=excluded.title_en,body_en=excluded.body_en,updated_at=now();
