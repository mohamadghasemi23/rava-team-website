alter table public.media_assets
  add column if not exists folder text not null default 'general',
  add column if not exists title text not null default '',
  add column if not exists description text not null default '',
  add column if not exists caption text not null default '',
  add column if not exists credit text not null default '';

create index if not exists media_assets_folder_created_at_idx
  on public.media_assets (folder, created_at desc)
  where deleted_at is null;

create index if not exists media_assets_active_created_at_idx
  on public.media_assets (created_at desc)
  where deleted_at is null;

comment on column public.media_assets.folder is
  'Virtual CMS folder for media organization, e.g. general, hero, projects, branding.';
comment on column public.media_assets.title is 'Human readable media title.';
comment on column public.media_assets.description is 'Internal/editorial media description.';
comment on column public.media_assets.caption is 'Optional public-facing caption.';
comment on column public.media_assets.credit is 'Optional creator/source credit.';
