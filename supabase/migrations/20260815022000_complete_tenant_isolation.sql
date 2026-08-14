-- Complete tenant isolation across revisions, autosaves, previews, delegated permissions and observability.

alter table if exists public.content_revisions add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.content_autosaves add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.preview_tokens add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.admin_permissions add column if not exists tenant_id uuid references public.tenants(id);

update public.content_revisions r set tenant_id=coalesce((select tenant_id from public.pages p where r.entity_type='page' and p.id=r.entity_id),(select tenant_id from public.projects p where r.entity_type='project' and p.id=r.entity_id),'00000000-0000-4000-8000-000000000001'::uuid) where tenant_id is null;
update public.content_autosaves a set tenant_id=coalesce((select tenant_id from public.pages p where a.entity_type='page' and p.id=a.entity_id),(select tenant_id from public.projects p where a.entity_type='project' and p.id=a.entity_id),'00000000-0000-4000-8000-000000000001'::uuid) where tenant_id is null;
update public.preview_tokens a set tenant_id=coalesce((select tenant_id from public.pages p where a.entity_type='page' and p.id=a.entity_id),(select tenant_id from public.projects p where a.entity_type='project' and p.id=a.entity_id),'00000000-0000-4000-8000-000000000001'::uuid) where tenant_id is null;
update public.admin_permissions set tenant_id='00000000-0000-4000-8000-000000000001' where tenant_id is null;

alter table public.content_revisions alter column tenant_id set not null;
alter table public.content_autosaves alter column tenant_id set not null;
alter table public.preview_tokens alter column tenant_id set not null;
alter table public.admin_permissions alter column tenant_id set not null;

create index if not exists content_revisions_tenant_entity_idx on public.content_revisions(tenant_id,entity_type,entity_id,revision_no desc);
create index if not exists content_autosaves_tenant_idx on public.content_autosaves(tenant_id,entity_type,entity_id,updated_at desc);
create index if not exists preview_tokens_tenant_idx on public.preview_tokens(tenant_id,entity_type,entity_id,expires_at desc);
create index if not exists system_events_tenant_created_idx on public.system_events(tenant_id,created_at desc);

alter table public.admin_permissions drop constraint if exists admin_permissions_pkey;
alter table public.admin_permissions add constraint admin_permissions_pkey primary key(tenant_id,user_id,permission_key);

-- Replace legacy revision/autosave policies with tenant-aware policies.
drop policy if exists content_revisions_staff_read on public.content_revisions;
create policy content_revisions_tenant_read on public.content_revisions for select to authenticated using(public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]) or public.is_platform_staff(array['platform_owner','platform_admin','content_ops']));

drop policy if exists content_autosaves_own on public.content_autosaves;
create policy content_autosaves_tenant_own on public.content_autosaves for all to authenticated using(user_id=auth.uid() and public.can_access_tenant(tenant_id,null)) with check(user_id=auth.uid() and public.can_access_tenant(tenant_id,null));

drop policy if exists preview_tokens_owner_read on public.preview_tokens;
create policy preview_tokens_tenant_read on public.preview_tokens for select to authenticated using(public.can_access_tenant(tenant_id,array['super_admin','admin','content_manager']::public.role_key[]) or public.is_platform_staff(array['platform_owner','platform_admin','content_ops','support_manager']));

-- Tenant-scoped delegated permissions. Platform staff permissions remain in platform_staff.
drop policy if exists admin_permissions_read on public.admin_permissions;
create policy admin_permissions_tenant_read on public.admin_permissions for select to authenticated using((user_id=auth.uid() and public.can_access_tenant(tenant_id,null)) or public.can_access_tenant(tenant_id,array['super_admin']::public.role_key[]) or public.is_platform_staff(array['platform_owner','platform_admin']));

create or replace function public.set_admin_permission(p_tenant_id uuid,p_user_id uuid,p_permission_key text,p_granted boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not (public.is_platform_staff(array['platform_owner','platform_admin']) or public.can_access_tenant(p_tenant_id,array['super_admin']::public.role_key[])) then raise exception 'tenant_super_admin_required'; end if;
 if not exists(select 1 from public.tenant_memberships tm where tm.tenant_id=p_tenant_id and tm.user_id=p_user_id and tm.active=true and tm.role<>'super_admin') then raise exception 'invalid_permission_target'; end if;
 if p_permission_key not in ('logs.view','errors.view','security_logs.view','audit_logs.view','logs.export') then raise exception 'invalid_permission_key'; end if;
 if p_granted then insert into public.admin_permissions(tenant_id,user_id,permission_key,granted_by) values(p_tenant_id,p_user_id,p_permission_key,auth.uid()) on conflict(tenant_id,user_id,permission_key) do update set granted_by=excluded.granted_by,granted_at=now();
 else delete from public.admin_permissions where tenant_id=p_tenant_id and user_id=p_user_id and permission_key=p_permission_key; end if;
 insert into public.system_events(tenant_id,event_id,category,severity,event_name,message,actor_user_id,actor_role,source,summary_fa,cause_fa,metadata)
 values(p_tenant_id,'EVT-'||gen_random_uuid()::text,'audit','info',case when p_granted then 'permissions.granted' else 'permissions.revoked' end,'Tenant permission changed',auth.uid(),'super_admin','database',case when p_granted then 'یک دسترسی مدیریتی در این سایت اعطا شد.' else 'یک دسترسی مدیریتی در این سایت لغو شد.' end,'این تغییر از بخش مدیریت دسترسی‌های همان مشتری انجام شده است.',jsonb_build_object('target_user_id',p_user_id,'permission_key',p_permission_key,'granted',p_granted));
end$$;
revoke all on function public.set_admin_permission(uuid,uuid,text,boolean) from public;grant execute on function public.set_admin_permission(uuid,uuid,text,boolean) to authenticated;

create or replace function public.has_admin_permission(p_tenant_id uuid,p_permission_key text)
returns boolean language sql stable security definer set search_path=public as $$
 select public.is_platform_staff(array['platform_owner','platform_admin'])
 or public.can_access_tenant(p_tenant_id,array['super_admin']::public.role_key[])
 or exists(select 1 from public.admin_permissions ap where ap.tenant_id=p_tenant_id and ap.user_id=auth.uid() and ap.permission_key=p_permission_key);
$$;
revoke all on function public.has_admin_permission(uuid,text) from public;grant execute on function public.has_admin_permission(uuid,text) to authenticated;

-- Observability: platform owner/admin may see fleet-wide events; tenant users see only active tenant events and delegated categories.
drop policy if exists system_events_permission_read on public.system_events;
create policy system_events_tenant_read on public.system_events for select to authenticated using(
 public.is_platform_staff(array['platform_owner','platform_admin'])
 or (tenant_id is not null and public.can_access_tenant(tenant_id,null) and (
   public.can_access_tenant(tenant_id,array['super_admin']::public.role_key[])
   or (exists(select 1 from public.admin_permissions ap where ap.tenant_id=system_events.tenant_id and ap.user_id=auth.uid() and ap.permission_key='logs.view')
     and (category<>'security' or exists(select 1 from public.admin_permissions ap where ap.tenant_id=system_events.tenant_id and ap.user_id=auth.uid() and ap.permission_key='security_logs.view'))
     and (category<>'audit' or exists(select 1 from public.admin_permissions ap where ap.tenant_id=system_events.tenant_id and ap.user_id=auth.uid() and ap.permission_key='audit_logs.view'))
     and (category<>'error' or exists(select 1 from public.admin_permissions ap where ap.tenant_id=system_events.tenant_id and ap.user_id=auth.uid() and ap.permission_key='errors.view'))))));

-- Rebuild capture/restore helpers so tenant identity is part of every snapshot operation.
create or replace function public.capture_page_revision(p_page_id uuid,p_reason text default 'manual_save') returns bigint language plpgsql security definer set search_path=public as $$declare rid bigint;snap jsonb;tid uuid;begin
 select tenant_id into tid from public.pages where id=p_page_id;if tid is null then raise exception 'page_not_found';end if;if not (public.can_access_tenant(tid,array['super_admin','admin','content_manager']::public.role_key[]) or public.is_platform_staff(array['platform_owner','platform_admin','content_ops'])) then raise exception 'tenant_access_denied';end if;
 select jsonb_build_object('page',to_jsonb(p),'blocks',coalesce((select jsonb_agg(to_jsonb(b) order by b.position) from public.page_blocks b where b.page_id=p.id and b.tenant_id=tid),'[]'::jsonb)) into snap from public.pages p where p.id=p_page_id and p.tenant_id=tid;
 insert into public.content_revisions(tenant_id,entity_type,entity_id,revision_no,snapshot,created_by,reason) values(tid,'page',p_page_id,public.next_revision_no('page',p_page_id),snap,auth.uid(),left(coalesce(p_reason,'manual_save'),80)) returning id into rid;return rid;end$$;

create or replace function public.capture_project_revision(p_project_id uuid,p_reason text default 'manual_save') returns bigint language plpgsql security definer set search_path=public as $$declare rid bigint;snap jsonb;tid uuid;begin
 select tenant_id into tid from public.projects where id=p_project_id;if tid is null then raise exception 'project_not_found';end if;if not (public.can_access_tenant(tid,array['super_admin','admin','content_manager']::public.role_key[]) or public.is_platform_staff(array['platform_owner','platform_admin','content_ops'])) then raise exception 'tenant_access_denied';end if;
 select to_jsonb(p) into snap from public.projects p where p.id=p_project_id and p.tenant_id=tid;insert into public.content_revisions(tenant_id,entity_type,entity_id,revision_no,snapshot,created_by,reason) values(tid,'project',p_project_id,public.next_revision_no('project',p_project_id),snap,auth.uid(),left(coalesce(p_reason,'manual_save'),80)) returning id into rid;return rid;end$$;

create or replace function public.restore_page_revision(p_revision_id bigint) returns void language plpgsql security definer set search_path=public as $$declare r record;page_data jsonb;begin
 select * into r from public.content_revisions where id=p_revision_id and entity_type='page';if r.id is null then raise exception 'revision_not_found';end if;if not (public.can_access_tenant(r.tenant_id,array['super_admin','admin']::public.role_key[]) or public.is_platform_staff(array['platform_owner','platform_admin'])) then raise exception 'tenant_admin_required';end if;
 perform public.capture_page_revision(r.entity_id,'before_restore');page_data=r.snapshot->'page';update public.pages set title=page_data->>'title',slug=page_data->>'slug',status=(page_data->>'status')::public.publish_status,seo=coalesce(page_data->'seo','{}'::jsonb),updated_at=now() where id=r.entity_id and tenant_id=r.tenant_id;
 delete from public.page_blocks where page_id=r.entity_id and tenant_id=r.tenant_id;insert into public.page_blocks(id,tenant_id,page_id,block_type,position,visible,data,created_at,updated_at) select (x->>'id')::uuid,r.tenant_id,r.entity_id,x->>'block_type',(x->>'position')::int,(x->>'visible')::boolean,coalesce(x->'data','{}'::jsonb),coalesce((x->>'created_at')::timestamptz,now()),now() from jsonb_array_elements(coalesce(r.snapshot->'blocks','[]'::jsonb)) x;
end$$;
