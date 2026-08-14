alter table public.media_assets
  add column if not exists folder text not null default 'general';

create index if not exists media_assets_folder_created_at_idx
  on public.media_assets (folder, created_at desc)
  where deleted_at is null;

comment on column public.media_assets.folder is
  'Virtual CMS folder for media organization, e.g. general, hero, projects, branding.';
