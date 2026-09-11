-- The public SECURITY DEFINER entry point is owned by postgres. Its private
-- helper must share that owner because direct EXECUTE remains revoked from
-- authenticated callers.
alter function private.site_has_template_access(uuid,uuid) owner to postgres;
revoke all on function private.site_has_template_access(uuid,uuid) from public,anon,authenticated;

create or replace function public.set_site_template_access(p_site_id uuid,p_template_id uuid,p_active boolean,p_access_kind text default 'granted') returns boolean
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_actor uuid:=auth.uid();v_org uuid;
begin
 if v_actor is null then raise exception 'authentication required';end if;
 if not(public.has_permission('platform.sites.manage',null,null) or public.has_permission('templates.manage',null,null)) then raise exception 'permission denied';end if;
 select organization_id into v_org from public.sites where id=p_site_id;if v_org is null then raise exception 'site not found';end if;
 if not exists(select 1 from public.template_catalog where id=p_template_id and status='active') then raise exception 'template unavailable';end if;
 if p_access_kind not in('granted','contract','campaign','support') then raise exception 'invalid access kind';end if;
 insert into public.site_template_access(site_id,template_id,access_kind,active,granted_by) values(p_site_id,p_template_id,p_access_kind,p_active,v_actor)
 on conflict(site_id,template_id) do update set access_kind=excluded.access_kind,active=excluded.active,granted_by=excluded.granted_by,updated_at=now();
 perform public.record_audit_event(
   case when p_active then 'design.template.access_granted' else 'design.template.access_revoked' end,
   'template',p_template_id::text,v_org,p_site_id,null,
   jsonb_build_object('active',p_active,'access_kind',p_access_kind),
   jsonb_build_object('source','site_template_access'),null,null,'notice'
 );
 return true;
end$$;
revoke all on function public.set_site_template_access(uuid,uuid,boolean,text) from public,anon;
grant execute on function public.set_site_template_access(uuid,uuid,boolean,text) to authenticated;

create or replace function public.apply_template_to_site(p_site_id uuid,p_template_version_id uuid,p_theme_overrides jsonb default '{}'::jsonb,p_note text default null) returns table(revision_id uuid,revision integer)
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_actor uuid:=auth.uid();v_org uuid;v_tv public.template_versions%rowtype;v_t public.template_catalog%rowtype;v_revision integer;v_id uuid;v_theme jsonb;v_granted boolean;
begin
 if v_actor is null then raise exception 'authentication required';end if;
 select organization_id into v_org from public.sites where id=p_site_id and status in('draft','active');
 if v_org is null then raise exception 'site not found';end if;
 if not(
   public.has_permission('platform.sites.manage',null,null)
   or public.has_permission('templates.manage',null,null)
   or public.has_permission('design.manage',v_org,p_site_id)
 ) then raise exception 'permission denied';end if;
 if jsonb_typeof(coalesce(p_theme_overrides,'{}'::jsonb))<>'object' then raise exception 'invalid theme overrides';end if;
 select * into v_tv from public.template_versions where id=p_template_version_id and status='published';if not found then raise exception 'template version unavailable';end if;
 select * into v_t from public.template_catalog where id=v_tv.template_id and status='active';if not found then raise exception 'template unavailable';end if;
 v_granted:=private.site_has_template_access(p_site_id,v_t.id);
 if not v_t.is_public and not v_granted and not public.has_permission('platform.sites.manage',null,null) and not public.has_permission('templates.manage',null,null) then raise exception 'template not available for tenant';end if;
 if not v_granted and not private.site_can_use_template_tier(p_site_id,v_t.commercial_tier) then raise exception 'template commercial entitlement required';end if;
 select coalesce(max(r.revision),0)+1 into v_revision from public.site_design_revisions r where r.site_id=p_site_id;
 v_theme:=coalesce(v_tv.theme_defaults,'{}'::jsonb)||coalesce(p_theme_overrides,'{}'::jsonb);
 insert into public.site_design_revisions(site_id,revision,source,template_id,template_version_id,theme_config,layout_config,note,created_by) values(p_site_id,v_revision,'template',v_t.id,v_tv.id,v_theme,v_tv.layout_blueprint,left(p_note,500),v_actor) returning id into v_id;
 insert into public.site_design_state(site_id,current_revision_id,current_template_id,current_template_version_id,updated_by,updated_at) values(p_site_id,v_id,v_t.id,v_tv.id,v_actor,now()) on conflict(site_id) do update set current_revision_id=excluded.current_revision_id,current_template_id=excluded.current_template_id,current_template_version_id=excluded.current_template_version_id,updated_by=excluded.updated_by,updated_at=now();
 perform public.record_audit_event(
   'design.template.applied','site',p_site_id::text,v_org,p_site_id,null,
   jsonb_build_object('template_key',v_t.key,'template_version',v_tv.version,'commercial_tier',v_t.commercial_tier,'access_grant',v_granted,'revision',v_revision),
   jsonb_build_object('note',left(p_note,500)),null,null,'notice'
 );
 return query select v_id,v_revision;
end$$;
revoke all on function public.apply_template_to_site(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.apply_template_to_site(uuid,uuid,jsonb,text) to authenticated;
