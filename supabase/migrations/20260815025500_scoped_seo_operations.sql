create or replace function public.can_manage_tenant_seo(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.platform_staff_can_access_tenant(p_tenant_id,array['platform_owner','platform_admin','seo_manager'])
 or exists(
   select 1 from public.tenant_memberships tm join public.profiles p on p.id=tm.user_id
   where tm.tenant_id=p_tenant_id and tm.user_id=auth.uid() and tm.active=true and p.active=true
     and tm.role in ('super_admin','admin','content_manager')
 );
$$;
grant execute on function public.can_manage_tenant_seo(uuid) to authenticated;

create or replace function public.set_page_seo(p_tenant_id uuid,p_page_id uuid,p_seo jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.can_manage_tenant_seo(p_tenant_id) then raise exception 'seo_access_denied';end if;
 if pg_column_size(coalesce(p_seo,'{}'::jsonb))>8192 then raise exception 'seo_payload_too_large';end if;
 if not exists(select 1 from public.pages where id=p_page_id and tenant_id=p_tenant_id) then raise exception 'page_not_found';end if;
 update public.pages set seo=coalesce(p_seo,'{}'::jsonb),updated_at=now() where id=p_page_id and tenant_id=p_tenant_id;
 insert into public.system_events(tenant_id,event_id,category,severity,event_name,message,actor_user_id,source,summary_fa,cause_fa,metadata)
 values(p_tenant_id,'EVT-'||gen_random_uuid()::text,'audit','info','seo.page.updated','SEO metadata updated',auth.uid(),'database','اطلاعات SEO یک صفحه تغییر کرد.','تغییر از ابزار SEO و بدون دسترسی به محتوای اصلی صفحه انجام شده است.',jsonb_build_object('page_id',p_page_id));
end$$;

create or replace function public.set_project_seo(p_tenant_id uuid,p_project_id uuid,p_seo jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.can_manage_tenant_seo(p_tenant_id) then raise exception 'seo_access_denied';end if;
 if pg_column_size(coalesce(p_seo,'{}'::jsonb))>8192 then raise exception 'seo_payload_too_large';end if;
 if not exists(select 1 from public.projects where id=p_project_id and tenant_id=p_tenant_id) then raise exception 'project_not_found';end if;
 update public.projects set seo=coalesce(p_seo,'{}'::jsonb),updated_at=now() where id=p_project_id and tenant_id=p_tenant_id;
 insert into public.system_events(tenant_id,event_id,category,severity,event_name,message,actor_user_id,source,summary_fa,cause_fa,metadata)
 values(p_tenant_id,'EVT-'||gen_random_uuid()::text,'audit','info','seo.project.updated','SEO metadata updated',auth.uid(),'database','اطلاعات SEO یک پروژه تغییر کرد.','تغییر از ابزار SEO و بدون دسترسی به محتوای اصلی پروژه انجام شده است.',jsonb_build_object('project_id',p_project_id));
end$$;

grant execute on function public.set_page_seo(uuid,uuid,jsonb),public.set_project_seo(uuid,uuid,jsonb) to authenticated;
