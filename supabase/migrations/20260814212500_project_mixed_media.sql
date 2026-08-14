alter table public.projects
  add column if not exists gallery_items jsonb not null default '[]'::jsonb;

comment on column public.projects.gallery_items is 'Ordered mixed-media gallery items. Each item references a media asset and may include poster/caption metadata.';

create or replace function public.validate_project_gallery_items()
returns trigger language plpgsql as $$
declare item jsonb; n integer := 0;
begin
  if new.gallery_items is null then new.gallery_items='[]'::jsonb; end if;
  if jsonb_typeof(new.gallery_items) <> 'array' then raise exception 'invalid_project_gallery_items'; end if;
  n := jsonb_array_length(new.gallery_items);
  if n > 60 then raise exception 'project_gallery_too_large'; end if;
  for item in select * from jsonb_array_elements(new.gallery_items)
  loop
    if coalesce(item->>'media_id','') !~* '^[0-9a-f-]{36}$' then raise exception 'invalid_gallery_media_id'; end if;
    if coalesce(item->>'kind','') not in ('image','video') then raise exception 'invalid_gallery_kind'; end if;
    if length(coalesce(item->>'caption','')) > 1200 then raise exception 'gallery_caption_too_long'; end if;
    if item ? 'poster_media_id' and coalesce(item->>'poster_media_id','') <> '' and coalesce(item->>'poster_media_id','') !~* '^[0-9a-f-]{36}$' then raise exception 'invalid_gallery_poster_id'; end if;
  end loop;
  return new;
end $$;

drop trigger if exists projects_validate_gallery_items on public.projects;
create trigger projects_validate_gallery_items before insert or update on public.projects for each row execute function public.validate_project_gallery_items();
