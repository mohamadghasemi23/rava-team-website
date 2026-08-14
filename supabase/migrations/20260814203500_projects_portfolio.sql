alter table public.projects
 add column if not exists category text not null default 'general',
 add column if not exists client_name text,
 add column if not exists project_date date,
 add column if not exists services text[] not null default '{}'::text[],
 add column if not exists gallery_media_ids uuid[] not null default '{}'::uuid[],
 add column if not exists featured boolean not null default false,
 add column if not exists scheduled_at timestamptz,
 add column if not exists created_by uuid references public.profiles(id),
 add column if not exists updated_by uuid references public.profiles(id);

create index if not exists projects_status_date_idx on public.projects(status, published_at desc);
create index if not exists projects_category_idx on public.projects(category);
create index if not exists projects_featured_idx on public.projects(featured) where featured=true;

create or replace function public.validate_project_payload() returns trigger language plpgsql as $$
begin
 new.title=trim(new.title); new.slug=lower(trim(new.slug)); new.category=lower(trim(new.category));
 if length(new.title)<2 or length(new.title)>180 then raise exception 'invalid_project_title'; end if;
 if new.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(new.slug)>160 then raise exception 'invalid_project_slug'; end if;
 if length(new.category)<2 or length(new.category)>80 then raise exception 'invalid_project_category'; end if;
 if new.summary is not null and length(new.summary)>1200 then raise exception 'project_summary_too_long'; end if;
 if new.client_name is not null and length(new.client_name)>180 then raise exception 'project_client_too_long'; end if;
 if cardinality(new.services)>30 or cardinality(new.gallery_media_ids)>60 then raise exception 'project_collection_too_large'; end if;
 if new.status='published' and new.published_at is null then new.published_at=now(); end if;
 if new.status<>'scheduled' then new.scheduled_at=null; end if;
 return new;
end $$;
drop trigger if exists projects_validate on public.projects;
create trigger projects_validate before insert or update on public.projects for each row execute function public.validate_project_payload();
