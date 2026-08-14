create or replace function public.auto_capture_page_revision() returns trigger language plpgsql security definer set search_path=public as $$
declare pid uuid;snap jsonb;next_no integer;begin
 pid=case when tg_table_name='pages' then coalesce(new.id,old.id) else coalesce(new.page_id,old.page_id) end;
 if pid is null or current_setting('rava.skip_revision',true)='1' then return coalesce(new,old);end if;
 select jsonb_build_object('page',to_jsonb(p),'blocks',coalesce((select jsonb_agg(to_jsonb(b) order by b.position) from public.page_blocks b where b.page_id=p.id),'[]'::jsonb)) into snap from public.pages p where p.id=pid;
 if snap is null then return coalesce(new,old);end if;
 select coalesce(max(revision_no),0)+1 into next_no from public.content_revisions where entity_type='page' and entity_id=pid;
 insert into public.content_revisions(entity_type,entity_id,revision_no,snapshot,created_by,reason) values('page',pid,next_no,snap,auth.uid(),lower(tg_table_name||'_'||tg_op));
 return coalesce(new,old);end$$;

drop trigger if exists pages_auto_revision on public.pages;create trigger pages_auto_revision after update on public.pages for each row execute function public.auto_capture_page_revision();
drop trigger if exists page_blocks_auto_revision on public.page_blocks;create trigger page_blocks_auto_revision after insert or update or delete on public.page_blocks for each row execute function public.auto_capture_page_revision();

create or replace function public.restore_page_revision(p_revision_id bigint) returns void language plpgsql security definer set search_path=public as $$declare r record;page_data jsonb;begin
 if not exists(select 1 from public.profiles where id=auth.uid() and active=true and role in ('super_admin','admin')) then raise exception 'admin_required';end if;
 select * into r from public.content_revisions where id=p_revision_id and entity_type='page';if r.id is null then raise exception 'revision_not_found';end if;
 perform public.capture_page_revision(r.entity_id,'before_restore');perform set_config('rava.skip_revision','1',true);page_data=r.snapshot->'page';
 update public.pages set title=page_data->>'title',slug=page_data->>'slug',status=(page_data->>'status')::public.content_status,seo=coalesce(page_data->'seo','{}'::jsonb),updated_at=now() where id=r.entity_id;
 delete from public.page_blocks where page_id=r.entity_id;
 insert into public.page_blocks(id,page_id,block_type,position,visible,data,created_at,updated_at) select (x->>'id')::uuid,r.entity_id,x->>'block_type',(x->>'position')::int,(x->>'visible')::boolean,coalesce(x->'data','{}'::jsonb),coalesce((x->>'created_at')::timestamptz,now()),now() from jsonb_array_elements(coalesce(r.snapshot->'blocks','[]'::jsonb)) x;
 perform set_config('rava.skip_revision','0',true);perform public.capture_page_revision(r.entity_id,'restored');
end$$;
