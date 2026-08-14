drop policy if exists system_events_tenant_read on public.system_events;
create policy system_events_tenant_read on public.system_events for select to authenticated using(
  public.platform_staff_can_access_tenant(tenant_id,array['platform_owner','platform_admin'])
  or (
    public.platform_staff_can_access_tenant(tenant_id,array['support_manager'])
    and category in ('error','security','auth','system','performance')
  )
  or (
    tenant_id is not null and public.can_access_tenant(tenant_id,null) and (
      public.can_access_tenant(tenant_id,array['super_admin']::public.role_key[])
      or (
        exists(select 1 from public.admin_permissions ap where ap.tenant_id=system_events.tenant_id and ap.user_id=auth.uid() and ap.permission_key='logs.view')
        and (category<>'security' or exists(select 1 from public.admin_permissions ap where ap.tenant_id=system_events.tenant_id and ap.user_id=auth.uid() and ap.permission_key='security_logs.view'))
        and (category<>'audit' or exists(select 1 from public.admin_permissions ap where ap.tenant_id=system_events.tenant_id and ap.user_id=auth.uid() and ap.permission_key='audit_logs.view'))
        and (category<>'error' or exists(select 1 from public.admin_permissions ap where ap.tenant_id=system_events.tenant_id and ap.user_id=auth.uid() and ap.permission_key='errors.view'))
      )
    )
  )
);
