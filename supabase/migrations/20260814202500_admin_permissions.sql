create table if not exists public.admin_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null check (permission_key in ('logs.view','errors.view','security_logs.view','audit_logs.view','logs.export')),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

alter table public.admin_permissions enable row level security;

-- Super admins can inspect delegated permissions. A user may inspect only their own grants.
create policy admin_permissions_read on public.admin_permissions for select to authenticated using (
  user_id = auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.active=true and p.role='super_admin')
);

-- Direct browser writes are forbidden. Grants/revocations go through SECURITY DEFINER functions.
revoke insert, update, delete on public.admin_permissions from anon, authenticated;

create or replace function public.set_admin_permission(p_user_id uuid, p_permission_key text, p_granted boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_actor_role public.role_key; v_target_role public.role_key;
begin
  select role into v_actor_role from public.profiles where id=auth.uid() and active=true;
  if v_actor_role is distinct from 'super_admin' then raise exception 'super_admin_required'; end if;
  select role into v_target_role from public.profiles where id=p_user_id and active=true;
  if v_target_role is null or v_target_role='super_admin' then raise exception 'invalid_permission_target'; end if;
  if p_permission_key not in ('logs.view','errors.view','security_logs.view','audit_logs.view','logs.export') then raise exception 'invalid_permission_key'; end if;
  if p_granted then
    insert into public.admin_permissions(user_id,permission_key,granted_by) values(p_user_id,p_permission_key,auth.uid())
    on conflict(user_id,permission_key) do update set granted_by=excluded.granted_by, granted_at=now();
  else
    delete from public.admin_permissions where user_id=p_user_id and permission_key=p_permission_key;
  end if;
  insert into public.system_events(event_id,category,severity,event_name,message,actor_user_id,actor_role,source,summary_fa,cause_fa,metadata)
  values('EVT-'||gen_random_uuid()::text,'audit','info',case when p_granted then 'permissions.granted' else 'permissions.revoked' end,
    'Observability permission changed',auth.uid(),'super_admin','database',
    case when p_granted then 'یک دسترسی مدیریتی توسط سوپر ادمین اعطا شد.' else 'یک دسترسی مدیریتی توسط سوپر ادمین لغو شد.' end,
    'این تغییر از بخش مدیریت دسترسی‌ها انجام شده است.',jsonb_build_object('target_user_id',p_user_id,'permission_key',p_permission_key,'granted',p_granted));
end $$;
revoke all on function public.set_admin_permission(uuid,text,boolean) from public;
grant execute on function public.set_admin_permission(uuid,text,boolean) to authenticated;

create or replace function public.has_admin_permission(p_permission_key text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.active=true and p.role='super_admin')
  or exists(select 1 from public.admin_permissions ap join public.profiles p on p.id=ap.user_id where ap.user_id=auth.uid() and p.active=true and ap.permission_key=p_permission_key);
$$;
revoke all on function public.has_admin_permission(text) from public;
grant execute on function public.has_admin_permission(text) to authenticated;

-- Tighten event-log RLS: super admin by default; delegated users only see permitted categories.
drop policy if exists system_events_admin_read on public.system_events;
create policy system_events_permission_read on public.system_events for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.active=true and p.role='super_admin')
  or (
    exists(select 1 from public.admin_permissions ap where ap.user_id=auth.uid() and ap.permission_key='logs.view')
    and (category <> 'security' or exists(select 1 from public.admin_permissions ap where ap.user_id=auth.uid() and ap.permission_key='security_logs.view'))
    and (category <> 'audit' or exists(select 1 from public.admin_permissions ap where ap.user_id=auth.uid() and ap.permission_key='audit_logs.view'))
    and (category <> 'error' or exists(select 1 from public.admin_permissions ap where ap.user_id=auth.uid() and ap.permission_key='errors.view'))
  )
);
