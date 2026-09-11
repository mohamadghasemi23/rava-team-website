-- Align RLS with the new access.* permissions and avoid expression-index upsert ambiguity.

drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles for select to authenticated
using (
  private.user_has_permission('platform.roles.manage', null, null) or
  private.user_has_permission('platform.access.manage', null, null) or
  (scope_type = 'organization' and (private.user_has_permission('roles.manage', organization_id, null) or private.user_has_permission('access.view', organization_id, null) or private.user_has_permission('access.manage', organization_id, null))) or
  (scope_type = 'site' and (private.user_has_permission('roles.manage', organization_id, site_id) or private.user_has_permission('access.view', organization_id, site_id) or private.user_has_permission('access.manage', organization_id, site_id)))
);

drop policy if exists role_permissions_access on public.role_permissions;
create policy role_permissions_access on public.role_permissions for select to authenticated
using (exists(
  select 1 from public.roles r where r.id=role_id and (
    private.user_has_permission('platform.roles.manage',null,null) or
    private.user_has_permission('platform.access.manage',null,null) or
    private.user_has_permission('roles.manage',r.organization_id,r.site_id) or
    private.user_has_permission('access.view',r.organization_id,r.site_id) or
    private.user_has_permission('access.manage',r.organization_id,r.site_id)
  )
));

drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships for select to authenticated
using (
  user_id=auth.uid() or
  private.user_has_permission('platform.roles.manage',null,null) or
  private.user_has_permission('platform.access.manage',null,null) or
  (scope_type='organization' and (private.user_has_permission('users.manage',organization_id,null) or private.user_has_permission('access.view',organization_id,null) or private.user_has_permission('access.manage',organization_id,null))) or
  (scope_type='site' and (private.user_has_permission('users.manage',organization_id,site_id) or private.user_has_permission('access.view',organization_id,site_id) or private.user_has_permission('access.manage',organization_id,site_id)))
);

drop policy if exists membership_roles_access on public.membership_roles;
create policy membership_roles_access on public.membership_roles for select to authenticated
using (exists(
  select 1 from public.memberships m where m.id=membership_id and (
    m.user_id=auth.uid() or
    private.user_has_permission('platform.roles.manage',null,null) or
    private.user_has_permission('platform.access.manage',null,null) or
    private.user_has_permission('roles.manage',m.organization_id,m.site_id) or
    private.user_has_permission('access.view',m.organization_id,m.site_id) or
    private.user_has_permission('access.manage',m.organization_id,m.site_id)
  )
));

drop policy if exists permission_overrides_select on public.permission_overrides;
create policy permission_overrides_select on public.permission_overrides for select to authenticated
using (
  user_id=auth.uid() or
  private.user_has_permission('platform.roles.manage',null,null) or
  private.user_has_permission('platform.access.manage',null,null) or
  private.user_has_permission('roles.manage',organization_id,site_id) or
  private.user_has_permission('access.view',organization_id,site_id) or
  private.user_has_permission('access.manage',organization_id,site_id)
);

grant select on public.access_invitations to authenticated;

create or replace function public.set_permission_override(
  p_user_id uuid,
  p_permission_key text,
  p_effect public.permission_effect,
  p_scope_type public.scope_kind,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_reason text default null,
  p_expires_at timestamptz default null
) returns uuid
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare v_id uuid; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not private.can_manage_access(p_organization_id,p_site_id) then raise exception 'permission denied'; end if;
  if not exists(select 1 from public.permissions where key=p_permission_key) then raise exception 'unknown permission'; end if;
  if p_expires_at is not null and p_expires_at<=now() then raise exception 'invalid expiry'; end if;
  delete from public.permission_overrides po
  where po.user_id=p_user_id and po.scope_type=p_scope_type
    and po.organization_id is not distinct from p_organization_id
    and po.site_id is not distinct from p_site_id
    and po.permission_key=p_permission_key;
  insert into public.permission_overrides(user_id,scope_type,organization_id,site_id,permission_key,effect,reason,granted_by,expires_at)
  values(p_user_id,p_scope_type,p_organization_id,p_site_id,p_permission_key,p_effect,left(p_reason,500),v_actor,p_expires_at)
  returning id into v_id;
  perform public.record_audit_event('access.permission_override.set','user',p_user_id::text,p_organization_id,p_site_id,null,
    jsonb_build_object('permission',p_permission_key,'effect',p_effect,'expires_at',p_expires_at),
    jsonb_build_object('reason',left(p_reason,500)),null,null,'warning');
  return v_id;
end;
$$;

create or replace function public.add_existing_member(
  p_user_id uuid,
  p_scope_type public.scope_kind,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_role_ids uuid[] default '{}'::uuid[],
  p_is_owner boolean default false
) returns uuid
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare v_membership_id uuid; v_actor uuid:=auth.uid(); v_role public.roles%rowtype;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not private.can_manage_access(p_organization_id,p_site_id) then raise exception 'permission denied'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id and active=true) then raise exception 'active user not found'; end if;
  if p_is_owner and not private.user_has_permission('platform.access.manage',null,null) then raise exception 'only platform access manager may assign owner'; end if;
  if p_scope_type='platform' then p_organization_id:=null; p_site_id:=null;
  elsif p_scope_type='organization' then
    if p_organization_id is null then raise exception 'organization required'; end if; p_site_id:=null;
  elsif p_scope_type='site' then
    if p_organization_id is null or p_site_id is null then raise exception 'site scope required'; end if;
    if not exists(select 1 from public.sites where id=p_site_id and organization_id=p_organization_id) then raise exception 'invalid site scope'; end if;
  end if;
  for v_role in select * from public.roles where id=any(coalesce(p_role_ids,'{}'::uuid[])) loop
    if v_role.scope_type<>p_scope_type or v_role.organization_id is distinct from p_organization_id or v_role.site_id is distinct from p_site_id then raise exception 'role scope mismatch'; end if;
  end loop;
  insert into public.memberships(user_id,scope_type,organization_id,site_id,status,is_owner,invited_by,joined_at)
  values(p_user_id,p_scope_type,p_organization_id,p_site_id,'active',p_is_owner,v_actor,now())
  on conflict do nothing;
  select id into v_membership_id from public.memberships
  where user_id=p_user_id and scope_type=p_scope_type
    and organization_id is not distinct from p_organization_id
    and site_id is not distinct from p_site_id;
  if v_membership_id is null then raise exception 'membership creation failed'; end if;
  update public.memberships set status='active',updated_at=now() where id=v_membership_id;
  delete from public.membership_roles where membership_id=v_membership_id;
  insert into public.membership_roles(membership_id,role_id)
    select v_membership_id, unnest(coalesce(p_role_ids,'{}'::uuid[])) on conflict do nothing;
  perform public.record_audit_event('access.membership.added','membership',v_membership_id::text,p_organization_id,p_site_id,null,
    jsonb_build_object('user_id',p_user_id,'roles',coalesce(p_role_ids,'{}'::uuid[]),'is_owner',p_is_owner),
    '{}'::jsonb,null,null,'warning');
  return v_membership_id;
end;
$$;

revoke all on function public.add_existing_member(uuid,public.scope_kind,uuid,uuid,uuid[],boolean) from public,anon;
grant execute on function public.add_existing_member(uuid,public.scope_kind,uuid,uuid,uuid[],boolean) to authenticated;
