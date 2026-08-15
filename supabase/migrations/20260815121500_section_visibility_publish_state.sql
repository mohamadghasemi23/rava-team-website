alter table public.page_blocks add column if not exists draft_visible boolean not null default true;
alter table public.page_blocks add column if not exists published_visible boolean not null default true;
alter table public.page_blocks add column if not exists draft_deleted boolean not null default false;
alter table public.page_blocks add column if not exists published_deleted boolean not null default false;
update public.page_blocks set draft_visible=coalesce(visible,true),published_visible=coalesce(visible,true) where true;
