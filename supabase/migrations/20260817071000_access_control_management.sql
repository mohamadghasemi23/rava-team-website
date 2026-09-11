-- RAVA scoped access-control management
-- Secure RPCs for custom roles, permissions, memberships and explicit overrides.

create table public.access_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  scope_type public.scope_kind not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  role_ids uuid[] not null default '{}'::uuid[],
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  invited_by uuid not null references public.profiles(id),
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint access_invitations_email_format check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint access_invitations_status_check check (status in ('pending','accepted','revoked','expired')),
  constraint access_invitations_scope_shape check (
    (scope_type = 'platform' and organization_id is null and site_id is null) or
    (scope_type = 'organization' and organization_id is not null and site_id is null) or
    (scope_type = 'site' and organization_id is not null and site_id is not null)
  )
);

create index access_invitations_scope_idx on public.access_invitations(scope_type, organization_id, site_id, status, created_at desc);
create index access_invitations_email_idx on public.access_invitations(lower(email), status);

alter table public.access_invitations enable row level security;

insert into public.permissions (key,module_key,name_fa,name_en,risk_level) values
  ('platform.access.manage','security','مدیریت دسترسی پلتفرم','Manage platform access','critical'),
  ('access.view','security','مشاهده دسترسی‌ها','View access','high'),
  ('access.manage','security','مدیریت دسترسی‌ها','Manage access','critical')
on conflict (key) do nothing;

create policy "authorized staff view access invitations"
on public.access_invitations for select to authenticated
using (
  public.has_permission('platform.access.manage', null, null)
  or public.has_permission('access.view', organization_id, site_id)
);

create or replace function private.can_manage_access(
  p_organization_id uuid default null,
  p_site_id uuid default null
) returns boolean
language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select case
    when public.has_permission('platform.access.manage', null, null) then true
    when p_site_id is not null then public.has_permission('access.manage', p_organization_id, p_site_id)
    when p_organization_id is not null then public.has_permission('access.manage', p_organization_id, null)
    else false
  end;
$$;
revoke all on function private.can_manage_access(uuid,uuid) from public, anon, authenticated;

create or replace function public.create_custom_role(
  p_scope_type public.scope_kind,
  p_key text,
  p_name_fa text,
  p_name_en text,
  p_description_fa text default '',
  p_description_en text default '',
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_permission_keys text[] default '{}'::text[]
) returns uuid
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_role_id uuid;
  v_permission text;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if p_key !~ '^[a-z0-9_.:-]{2,80}$' then raise exception 'invalid role key'; end if;
  if length(trim(p_name_fa)) < 2 or length(trim(p_name_en)) < 2 then raise exception 'invalid role name'; end if;
  if p_scope_type = 'platform' then
    if not private.can_manage_access(null,null) then raise exception 'permission denied'; end if;
    p_organization_id := null; p_site_id := null;
  elsif p_scope_type = 'organization' then
    if p_organization_id is null or not private.can_manage_access(p_organization_id,null) then raise exception 'permission denied'; end if;
    p_site_id := null;
  elsif p_scope_type = 'site' then
    if p_organization_id is null or p_site_id is null or not private.can_manage_access(p_organization_id,p_site_id) then raise exception 'permission denied'; end if;
    if not exists(select 1 from public.sites s where s.id=p_site_id and s.organization_id=p_organization_id) then raise exception 'invalid scope'; end if;
  end if;

  insert into public.roles(scope_type,organization_id,site_id,key,name_fa,name_en,description_fa,description_en,is_system,immutable,created_by)
  values(p_scope_type,p_organization_id,p_site_id,p_key,trim(p_name_fa),trim(p_name_en),coalesce(p_description_fa,''),coalesce(p_description_en,''),false,false,v_actor)
  returning id into v_role_id;

  foreach v_permission in array coalesce(p_permission_keys,'{}'::text[]) loop
    if not exists(select 1 from public.permissions where key=v_permission) then raise exception 'unknown permission: %', v_permission; end if;
    insert into public.role_permissions(role_id,permission_key) values(v_role_id,v_permission) on conflict do nothing;
  end loop;

  perform public.record_audit_event('access.role.created','role',v_role_id::text,p_organization_id,p_site_id,null,
    jsonb_build_object('key',p_key,'permissions',coalesce(p_permission_keys,'{}'::text[])),
    jsonb_build_object('scope_type',p_scope_type),null,null,'notice');
  return v_role_id;
end;
$$;

create or replace function public.set_role_permissions(
  p_role_id uuid,
  p_permission_keys text[]
) returns void
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare
  v_role public.roles%rowtype;
  v_before text[];
  v_permission text;
begin
  select * into v_role from public.roles where id=p_role_id;
  if not found then raise exception 'role not found'; end if;
  if v_role.immutable then raise exception 'immutable role'; end if;
  if not private.can_manage_access(v_role.organization_id,v_role.site_id) then raise exception 'permission denied'; end if;
  select coalesce(array_agg(permission_key order by permission_key),'{}'::text[]) into v_before from public.role_permissions where role_id=p_role_id;
  foreach v_permission in array coalesce(p_permission_keys,'{}'::text[]) loop
    if not exists(select 1 from public.permissions where key=v_permission) then raise exception 'unknown permission: %', v_permission; end if;
  end loop;
  delete from public.role_permissions where role_id=p_role_id;
  insert into public.role_permissions(role_id,permission_key)
    select p_role_id, unnest(coalesce(p_permission_keys,'{}'::text[])) on conflict do nothing;
  perform public.record_audit_event('access.role.permissions_changed','role',p_role_id::text,v_role.organization_id,v_role.site_id,
    jsonb_build_object('permissions',v_before),jsonb_build_object('permissions',coalesce(p_permission_keys,'{}'::text[])),
    '{}'::jsonb,null,null,'warning');
end;
$$;

create or replace function public.assign_membership_roles(
  p_membership_id uuid,
  p_role_ids uuid[]
) returns void
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare
  v_membership public.memberships%rowtype;
  v_role public.roles%rowtype;
  v_before uuid[];
begin
  select * into v_membership from public.memberships where id=p_membership_id;
  if not found then raise exception 'membership not found'; end if;
  if not private.can_manage_access(v_membership.organization_id,v_membership.site_id) then raise exception 'permission denied'; end if;
  select coalesce(array_agg(role_id order by role_id),'{}'::uuid[]) into v_before from public.membership_roles where membership_id=p_membership_id;
  for v_role in select * from public.roles where id=any(coalesce(p_role_ids,'{}'::uuid[])) loop
    if v_role.scope_type <> v_membership.scope_type
      or v_role.organization_id is distinct from v_membership.organization_id
      or v_role.site_id is distinct from v_membership.site_id then
      raise exception 'role scope mismatch';
    end if;
  end loop;
  if (select count(*) from public.roles where id=any(coalesce(p_role_ids,'{}'::uuid[]))) <> cardinality(coalesce(p_role_ids,'{}'::uuid[])) then
    raise exception 'unknown role';
  end if;
  delete from public.membership_roles where membership_id=p_membership_id;
  insert into public.membership_roles(membership_id,role_id)
    select p_membership_id, unnest(coalesce(p_role_ids,'{}'::uuid[])) on conflict do nothing;
  perform public.record_audit_event('access.membership.roles_changed','membership',p_membership_id::text,v_membership.organization_id,v_membership.site_id,
    jsonb_build_object('roles',v_before),jsonb_build_object('roles',coalesce(p_role_ids,'{}'::uuid[])),
    jsonb_build_object('target_user_id',v_membership.user_id),null,null,'warning');
end;
$$;

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
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'invalid expiry'; end if;
  insert into public.permission_overrides(user_id,scope_type,organization_id,site_id,permission_key,effect,reason,granted_by,expires_at)
  values(p_user_id,p_scope_type,p_organization_id,p_site_id,p_permission_key,p_effect,left(p_reason,500),v_actor,p_expires_at)
  on conflict (user_id,scope_type,coalesce(organization_id,'00000000-0000-0000-0000-000000000000'::uuid),coalesce(site_id,'00000000-0000-0000-0000-000000000000'::uuid),permission_key)
  do update set effect=excluded.effect,reason=excluded.reason,granted_by=excluded.granted_by,expires_at=excluded.expires_at,created_at=now()
  returning id into v_id;
  perform public.record_audit_event('access.permission_override.set','user',p_user_id::text,p_organization_id,p_site_id,null,
    jsonb_build_object('permission',p_permission_key,'effect',p_effect,'expires_at',p_expires_at),
    jsonb_build_object('reason',left(p_reason,500)),null,null,'warning');
  return v_id;
end;
$$;

create or replace function public.revoke_membership(p_membership_id uuid) returns void
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare v_membership public.memberships%rowtype;
begin
  select * into v_membership from public.memberships where id=p_membership_id;
  if not found then raise exception 'membership not found'; end if;
  if v_membership.is_owner then raise exception 'owner membership cannot be revoked here'; end if;
  if not private.can_manage_access(v_membership.organization_id,v_membership.site_id) then raise exception 'permission denied'; end if;
  update public.memberships set status='revoked',updated_at=now() where id=p_membership_id;
  perform public.record_audit_event('access.membership.revoked','membership',p_membership_id::text,v_membership.organization_id,v_membership.site_id,
    jsonb_build_object('status',v_membership.status),jsonb_build_object('status','revoked'),
    jsonb_build_object('target_user_id',v_membership.user_id),null,null,'warning');
end;
$$;

create or replace function public.create_access_invitation(
  p_email text,
  p_scope_type public.scope_kind,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_role_ids uuid[] default '{}'::uuid[],
  p_expires_at timestamptz default null
) returns uuid
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare v_id uuid; v_actor uuid:=auth.uid(); v_role public.roles%rowtype;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not private.can_manage_access(p_organization_id,p_site_id) then raise exception 'permission denied'; end if;
  if lower(trim(p_email)) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid email'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'invalid expiry'; end if;
  for v_role in select * from public.roles where id=any(coalesce(p_role_ids,'{}'::uuid[])) loop
    if v_role.scope_type<>p_scope_type or v_role.organization_id is distinct from p_organization_id or v_role.site_id is distinct from p_site_id then raise exception 'role scope mismatch'; end if;
  end loop;
  insert into public.access_invitations(email,scope_type,organization_id,site_id,role_ids,expires_at,invited_by)
  values(lower(trim(p_email)),p_scope_type,p_organization_id,p_site_id,coalesce(p_role_ids,'{}'::uuid[]),coalesce(p_expires_at,now()+interval '7 days'),v_actor)
  returning id into v_id;
  perform public.record_audit_event('access.invitation.created','access_invitation',v_id::text,p_organization_id,p_site_id,null,
    jsonb_build_object('email',lower(trim(p_email)),'scope_type',p_scope_type,'role_ids',coalesce(p_role_ids,'{}'::uuid[])),
    '{}'::jsonb,null,null,'notice');
  return v_id;
end;
$$;

revoke all on function public.create_custom_role(public.scope_kind,text,text,text,text,text,uuid,uuid,text[]) from public,anon;
revoke all on function public.set_role_permissions(uuid,text[]) from public,anon;
revoke all on function public.assign_membership_roles(uuid,uuid[]) from public,anon;
revoke all on function public.set_permission_override(uuid,text,public.permission_effect,public.scope_kind,uuid,uuid,text,timestamptz) from public,anon;
revoke all on function public.revoke_membership(uuid) from public,anon;
revoke all on function public.create_access_invitation(text,public.scope_kind,uuid,uuid,uuid[],timestamptz) from public,anon;
grant execute on function public.create_custom_role(public.scope_kind,text,text,text,text,text,uuid,uuid,text[]) to authenticated;
grant execute on function public.set_role_permissions(uuid,text[]) to authenticated;
grant execute on function public.assign_membership_roles(uuid,uuid[]) to authenticated;
grant execute on function public.set_permission_override(uuid,text,public.permission_effect,public.scope_kind,uuid,uuid,text,timestamptz) to authenticated;
grant execute on function public.revoke_membership(uuid) to authenticated;
grant execute on function public.create_access_invitation(text,public.scope_kind,uuid,uuid,uuid[],timestamptz) to authenticated;
