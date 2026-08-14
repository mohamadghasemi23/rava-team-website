drop policy if exists "public read published project media" on public.media_assets;
create policy "public read published project media" on public.media_assets
for select to anon using (
  deleted_at is null and exists (
    select 1 from public.projects p
    where p.status='published'
      and (
        p.cover_media_id = media_assets.id
        or media_assets.id = any(p.gallery_media_ids)
        or exists (
          select 1 from jsonb_array_elements(coalesce(p.gallery_items,'[]'::jsonb)) item
          where (item->>'media_id')::uuid = media_assets.id
             or (nullif(item->>'poster_media_id',''))::uuid = media_assets.id
        )
      )
  )
);
