alter table public.profiles add column if not exists last_login_at timestamptz;

create or replace function public.super_admin_update_user(
  p_user_id uuid,
  p_display_name text,
  p_role public.role_key,
  p_active boolean
) returns void
language plpgsql security definer set search_path=public as $$
declare v_actor_role public.role_key; v_target_role public.role_key;
begin
  select role into v_actor_role from public.profiles where id=auth.uid() and active=true;
  if v_actor_role is distinct from 'super_admin' then raise exception 'super_admin_required'; end if;
  select role into v_target_role from public.profiles where id=p_user_id;
  if v_target_role='super_admin' and p_user_id<>auth.uid() then raise exception 'cannot_modify_other_super_admin'; end if;
  if p_user_id=auth.uid() and (p_active=false or p_role<>'super_admin') then raise exception 'cannot_remove_own_super_admin_access'; end if;
  update public.profiles set display_name=left(trim(p_display_name),120), role=p_role, active=p_active, updated_at=now() where id=p_user_id;
  if p_active=false then update public.admin_sessions set revoked_at=coalesce(revoked_at,now()) where user_id=p_user_id and revoked_at is null; end if;
  insert into public.system_events(event_id,category,severity,event_name,message,actor_user_id,actor_role,source,summary_fa,cause_fa,metadata)
  values('EVT-'||gen_random_uuid()::text,'audit','info','users.profile.updated','Administrative user profile changed',auth.uid(),'super_admin','database','اطلاعات یا سطح دسترسی یک کاربر مدیریتی تغییر کرد.','این تغییر توسط سوپر ادمین از بخش مدیریت کاربران انجام شده است.',jsonb_build_object('target_user_id',p_user_id,'role',p_role,'active',p_active));
end $$;
revoke all on function public.super_admin_update_user(uuid,text,public.role_key,boolean) from public;
grant execute on function public.super_admin_update_user(uuid,text,public.role_key,boolean) to authenticated;

create or replace function public.super_admin_revoke_user_sessions(p_user_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_actor_role public.role_key; v_count integer;
begin
  select role into v_actor_role from public.profiles where id=auth.uid() and active=true;
  if v_actor_role is distinct from 'super_admin' then raise exception 'super_admin_required'; end if;
  update public.admin_sessions set revoked_at=coalesce(revoked_at,now()) where user_id=p_user_id and revoked_at is null and expires_at>now();
  get diagnostics v_count = row_count;
  insert into public.system_events(event_id,category,severity,event_name,message,actor_user_id,actor_role,source,summary_fa,cause_fa,metadata)
  values('SEC-'||gen_random_uuid()::text,'security','warning','users.sessions.revoked','Administrative sessions revoked',auth.uid(),'super_admin','database','نشست‌های فعال یک کاربر مدیریتی بسته شد.','این عملیات توسط سوپر ادمین برای خروج اجباری کاربر از پنل انجام شده است.',jsonb_build_object('target_user_id',p_user_id,'revoked_count',v_count));
  return v_count;
end $$;
revoke all on function public.super_admin_revoke_user_sessions(uuid) from public;
grant execute on function public.super_admin_revoke_user_sessions(uuid) to authenticated;

create policy "super admin reads admin sessions" on public.admin_sessions for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.active=true and p.role='super_admin')
);
