create table if not exists public.content_revisions(
 id bigserial primary key,
 entity_type text not null check(entity_type in ('page','project')),
 entity_id uuid not null,
 revision_no integer not null,
 snapshot jsonb not null,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 reason text not null default 'manual_save',
 unique(entity_type,entity_id,revision_no)
);
create index if not exists content_revisions_entity_idx on public.content_revisions(entity_type,entity_id,revision_no desc);
alter table public.content_revisions enable row level security;
create policy content_revisions_staff_read on public.content_revisions for select to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.active=true and p.role in ('super_admin','admin','content_manager')));

create table if not exists public.content_autosaves(
 entity_type text not null check(entity_type in ('page','project')),
 entity_id uuid not null,
 user_id uuid not null references public.profiles(id) on delete cascade,
 payload jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 primary key(entity_type,entity_id,user_id)
);
alter table public.content_autosaves enable row level security;
create policy content_autosaves_own on public.content_autosaves for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create table if not exists public.preview_tokens(
 token_hash text primary key,
 entity_type text not null check(entity_type in ('page','project')),
 entity_id uuid not null,
 created_by uuid not null references public.profiles(id) on delete cascade,
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 revoked_at timestamptz
);
create index if not exists preview_tokens_entity_idx on public.preview_tokens(entity_type,entity_id,expires_at desc);
alter table public.preview_tokens enable row level security;
create policy preview_tokens_owner_read on public.preview_tokens for select to authenticated using(created_by=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin' and p.active=true));

create or replace function public.next_revision_no(p_type text,p_id uuid) returns integer language sql security definer set search_path=public as $$select coalesce(max(revision_no),0)+1 from public.content_revisions where entity_type=p_type and entity_id=p_id$$;
revoke all on function public.next_revision_no(text,uuid) from public;grant execute on function public.next_revision_no(text,uuid) to authenticated;

create or replace function public.capture_page_revision(p_page_id uuid,p_reason text default 'manual_save') returns bigint language plpgsql security definer set search_path=public as $$declare rid bigint; snap jsonb;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and active=true and role in ('super_admin','admin','content_manager')) then raise exception 'staff_required'; end if;
 select jsonb_build_object('page',to_jsonb(p),'blocks',coalesce((select jsonb_agg(to_jsonb(b) order by b.position) from public.page_blocks b where b.page_id=p.id),'[]'::jsonb)) into snap from public.pages p where p.id=p_page_id;
 if snap is null then raise exception 'page_not_found'; end if;
 insert into public.content_revisions(entity_type,entity_id,revision_no,snapshot,created_by,reason) values('page',p_page_id,public.next_revision_no('page',p_page_id),snap,auth.uid(),left(coalesce(p_reason,'manual_save'),80)) returning id into rid;return rid;end$$;
revoke all on function public.capture_page_revision(uuid,text) from public;grant execute on function public.capture_page_revision(uuid,text) to authenticated;

create or replace function public.capture_project_revision(p_project_id uuid,p_reason text default 'manual_save') returns bigint language plpgsql security definer set search_path=public as $$declare rid bigint;snap jsonb;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and active=true and role in ('super_admin','admin','content_manager')) then raise exception 'staff_required'; end if;
 select to_jsonb(p) into snap from public.projects p where p.id=p_project_id;if snap is null then raise exception 'project_not_found';end if;
 insert into public.content_revisions(entity_type,entity_id,revision_no,snapshot,created_by,reason) values('project',p_project_id,public.next_revision_no('project',p_project_id),snap,auth.uid(),left(coalesce(p_reason,'manual_save'),80)) returning id into rid;return rid;end$$;
revoke all on function public.capture_project_revision(uuid,text) from public;grant execute on function public.capture_project_revision(uuid,text) to authenticated;

create or replace function public.restore_page_revision(p_revision_id bigint) returns void language plpgsql security definer set search_path=public as $$declare r record;page_data jsonb;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and active=true and role in ('super_admin','admin')) then raise exception 'admin_required';end if;
 select * into r from public.content_revisions where id=p_revision_id and entity_type='page';if r.id is null then raise exception 'revision_not_found';end if;
 perform public.capture_page_revision(r.entity_id,'before_restore');page_data=r.snapshot->'page';
 update public.pages set title=page_data->>'title',slug=page_data->>'slug',status=(page_data->>'status')::public.content_status,seo=coalesce(page_data->'seo','{}'::jsonb),updated_at=now() where id=r.entity_id;
 delete from public.page_blocks where page_id=r.entity_id;
 insert into public.page_blocks(id,page_id,block_type,position,visible,data,created_at,updated_at) select (x->>'id')::uuid,r.entity_id,x->>'block_type',(x->>'position')::int,(x->>'visible')::boolean,coalesce(x->'data','{}'::jsonb),coalesce((x->>'created_at')::timestamptz,now()),now() from jsonb_array_elements(coalesce(r.snapshot->'blocks','[]'::jsonb)) x;
end$$;
revoke all on function public.restore_page_revision(bigint) from public;grant execute on function public.restore_page_revision(bigint) to authenticated;
