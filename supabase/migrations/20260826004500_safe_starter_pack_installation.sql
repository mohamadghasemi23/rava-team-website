-- P2: transactional, idempotent starter-pack installation with safe rollback.
create type public.starter_installation_status as enum ('installed','approved','rolled_back');

create table public.starter_pack_installations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  starter_pack_version_id uuid not null references public.starter_content_pack_versions(id) on delete restrict,
  template_version_id uuid not null references public.template_versions(id) on delete restrict,
  installed_design_revision_id uuid not null references public.site_design_revisions(id) on delete restrict,
  status public.starter_installation_status not null default 'installed',
  idempotency_key uuid not null,
  locales text[] not null,
  brand_inputs jsonb not null default '{}'::jsonb,
  manifest_snapshot jsonb not null,
  manifest_content_hash text not null,
  previous_design_state jsonb,
  installed_by uuid not null references public.profiles(id) on delete restrict,
  installed_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  rolled_back_by uuid references public.profiles(id) on delete restrict,
  rolled_back_at timestamptz,
  unique(site_id,idempotency_key),
  check(cardinality(locales)>0),
  check(jsonb_typeof(brand_inputs)='object'),
  check(jsonb_typeof(manifest_snapshot)='object'),
  check(manifest_content_hash ~ '^[0-9a-f]{64}$'),
  check((approved_by is null)=(approved_at is null)),
  check((rolled_back_by is null)=(rolled_back_at is null))
);

create table public.starter_pack_installation_items (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null references public.starter_pack_installations(id) on delete cascade,
  entity_type text not null check(entity_type='page'),
  stable_key text not null check(stable_key ~ '^[a-z0-9][a-z0-9_.:-]{1,119}$'),
  locale text not null check(locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  entity_id uuid not null,
  installed_snapshot_hash text not null check(installed_snapshot_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique(installation_id,entity_type,stable_key,locale),
  unique(installation_id,entity_type,entity_id)
);

create index starter_pack_installations_site_time_idx on public.starter_pack_installations(site_id,installed_at desc);
create index starter_pack_installation_items_install_idx on public.starter_pack_installation_items(installation_id);

create function private.protect_starter_installation_snapshot() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
  if tg_op='DELETE' then raise exception 'starter installation history is immutable'; end if;
  if (to_jsonb(new)-array['status','approved_by','approved_at','rolled_back_by','rolled_back_at'])
    is distinct from
    (to_jsonb(old)-array['status','approved_by','approved_at','rolled_back_by','rolled_back_at']) then
    raise exception 'starter installation snapshot is immutable';
  end if;
  return new;
end $$;
revoke all on function private.protect_starter_installation_snapshot() from public,anon,authenticated;
create trigger protect_starter_installation_snapshot before update or delete on public.starter_pack_installations
for each row execute function private.protect_starter_installation_snapshot();

create function private.protect_starter_installation_item() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'starter installation items are immutable'; end $$;
revoke all on function private.protect_starter_installation_item() from public,anon,authenticated;
create trigger protect_starter_installation_item before update or delete on public.starter_pack_installation_items
for each row execute function private.protect_starter_installation_item();

alter table public.starter_pack_installations enable row level security;
alter table public.starter_pack_installation_items enable row level security;

create policy starter_pack_installations_read on public.starter_pack_installations for select to authenticated using(
  public.has_permission('platform.sites.manage',null,null)
  or public.has_permission('starter_packs.install',organization_id,site_id)
  or public.has_permission('sites.view',organization_id,site_id)
);
create policy starter_pack_installation_items_read on public.starter_pack_installation_items for select to authenticated using(exists(
  select 1 from public.starter_pack_installations i where i.id=installation_id and (
    public.has_permission('platform.sites.manage',null,null)
    or public.has_permission('starter_packs.install',i.organization_id,i.site_id)
    or public.has_permission('sites.view',i.organization_id,i.site_id)
  )
));
revoke all on public.starter_pack_installations,public.starter_pack_installation_items from anon;
revoke insert,update,delete on public.starter_pack_installations,public.starter_pack_installation_items from authenticated;
grant select on public.starter_pack_installations,public.starter_pack_installation_items to authenticated;

create function private.starter_page_snapshot_hash(p_page_id uuid) returns text
language sql stable security definer set search_path=public,pg_catalog,pg_temp as $$
  select encode(extensions.digest(jsonb_build_object(
    'title',p.title,'slug',p.slug,'status',p.status,'seo',p.seo,
    'blocks',coalesce((select jsonb_agg(jsonb_build_object(
      'block_type',b.block_type,'position',b.position,'visible',b.visible,'data',b.data
    ) order by b.position,b.id) from public.page_blocks b where b.page_id=p.id),'[]'::jsonb)
  )::text,'sha256'),'hex') from public.pages p where p.id=p_page_id
$$;
revoke all on function private.starter_page_snapshot_hash(uuid) from public,anon,authenticated;

create function private.can_install_starter_pack(p_site_id uuid) returns boolean
language sql stable security definer set search_path=public,private,pg_temp as $$
  select p_site_id is not null and (
    public.has_permission('platform.sites.manage',null,null)
    or public.has_permission('starter_packs.install',private.site_org(p_site_id),p_site_id)
  )
$$;
revoke all on function private.can_install_starter_pack(uuid) from public,anon,authenticated;

create function public.install_starter_pack(
  p_site_id uuid,
  p_starter_pack_version_id uuid,
  p_template_version_id uuid,
  p_idempotency_key uuid,
  p_locales text[] default array['fa']::text[],
  p_brand_inputs jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public,private,pg_catalog,pg_temp as $$
declare
  v_actor uuid:=auth.uid(); v_org uuid; v_old public.starter_pack_installations%rowtype;
  v_pack public.starter_content_pack_versions%rowtype; v_tv public.template_versions%rowtype;
  v_install uuid:=gen_random_uuid(); v_rev_id uuid:=gen_random_uuid(); v_rev int;
  v_prior jsonb; v_locale text; v_page jsonb; v_block jsonb; v_page_id uuid;
  v_title text; v_brand text; v_count int:=0; v_position int;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_site_id is null or p_starter_pack_version_id is null or p_template_version_id is null or p_idempotency_key is null then
    raise exception 'invalid_installation_request' using errcode='22023';
  end if;
  if not private.can_install_starter_pack(p_site_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  if not exists(select 1 from private.resolve_site_entitlement(p_site_id,'cms',now()) e where e.allowed) then
    raise exception 'feature_not_entitled' using errcode='42501';
  end if;
  if jsonb_typeof(coalesce(p_brand_inputs,'{}'))<>'object'
    or pg_column_size(coalesce(p_brand_inputs,'{}'))>16384
    or length(coalesce(p_brand_inputs->>'name',''))>120 then
    raise exception 'invalid_brand_inputs' using errcode='22023';
  end if;
  if p_locales is null or cardinality(p_locales)=0 or cardinality(p_locales)>2
    or exists(select 1 from unnest(p_locales) l where l not in ('fa','en'))
    or cardinality(p_locales)<>(select count(distinct l) from unnest(p_locales) l) then
    raise exception 'invalid_locales' using errcode='22023';
  end if;
  select organization_id into v_org from public.sites where id=p_site_id for update;
  if v_org is null then raise exception 'site_not_found' using errcode='P0002'; end if;

  select * into v_old from public.starter_pack_installations where site_id=p_site_id and idempotency_key=p_idempotency_key;
  if found then
    if v_old.starter_pack_version_id<>p_starter_pack_version_id or v_old.template_version_id<>p_template_version_id
      or v_old.locales<>p_locales or v_old.brand_inputs<>coalesce(p_brand_inputs,'{}') then
      raise exception 'idempotency_key_reused' using errcode='22023';
    end if;
    perform public.record_audit_event('starter_pack.install.retried','starter_pack_installation',v_old.id::text,v_org,p_site_id,null,
      jsonb_build_object('status',v_old.status),'{}',null,null,'info');
    return jsonb_build_object('installation_id',v_old.id,'status',v_old.status,'idempotent_replay',true);
  end if;

  select * into v_pack from public.starter_content_pack_versions where id=p_starter_pack_version_id and status='published';
  if not found then raise exception 'starter_pack_version_unavailable' using errcode='22023'; end if;
  select * into v_tv from public.template_versions where id=p_template_version_id and status='published';
  if not found then raise exception 'template_version_unavailable' using errcode='22023'; end if;
  if not exists(select 1 from public.starter_pack_template_compatibility where starter_pack_version_id=v_pack.id and template_version_id=v_tv.id and active) then
    raise exception 'incompatible_template' using errcode='22023';
  end if;
  foreach v_locale in array p_locales loop
    if not(v_pack.manifest->'locales' ? v_locale) then raise exception 'locale_unavailable' using errcode='22023'; end if;
  end loop;
  if exists(
    select 1 from unnest(p_locales) l
    cross join lateral jsonb_array_elements(v_pack.manifest->'locales'->l->'pages') p
    join public.pages x on x.site_id=p_site_id and x.slug=p->>'slug'
  ) then raise exception 'starter_page_slug_conflict' using errcode='23505'; end if;

  select jsonb_build_object(
    'current_revision_id',s.current_revision_id,'current_template_id',s.current_template_id,
    'current_template_version_id',s.current_template_version_id,'published_release_id',s.published_release_id
  ) into v_prior from public.site_design_state s where s.site_id=p_site_id;
  select coalesce(max(revision),0)+1 into v_rev from public.site_design_revisions where site_id=p_site_id;
  insert into public.site_design_revisions(id,site_id,revision,source,template_id,template_version_id,theme_config,layout_config,note,created_by)
  values(v_rev_id,p_site_id,v_rev,'template',v_tv.template_id,v_tv.id,v_tv.theme_defaults,v_tv.layout_blueprint,'Starter pack installation',v_actor);
  insert into public.site_design_state(site_id,current_revision_id,current_template_id,current_template_version_id,updated_by,updated_at)
  values(p_site_id,v_rev_id,v_tv.template_id,v_tv.id,v_actor,now())
  on conflict(site_id) do update set current_revision_id=excluded.current_revision_id,current_template_id=excluded.current_template_id,
    current_template_version_id=excluded.current_template_version_id,updated_by=excluded.updated_by,updated_at=now();
  insert into public.starter_pack_installations(
    id,organization_id,site_id,starter_pack_version_id,template_version_id,installed_design_revision_id,
    idempotency_key,locales,brand_inputs,manifest_snapshot,manifest_content_hash,previous_design_state,installed_by
  ) values(v_install,v_org,p_site_id,v_pack.id,v_tv.id,v_rev_id,p_idempotency_key,p_locales,
    coalesce(p_brand_inputs,'{}'),v_pack.manifest,v_pack.content_hash,v_prior,v_actor);

  v_brand:=nullif(btrim(p_brand_inputs->>'name'),'');
  foreach v_locale in array p_locales loop
    for v_page in select value from jsonb_array_elements(v_pack.manifest->'locales'->v_locale->'pages') loop
      if coalesce(v_page->>'status','')<>'draft'
        or not coalesce((v_page->>'requires_customer_verification')::boolean,false) then
        raise exception 'unsafe_starter_page' using errcode='22023';
      end if;
      v_page_id:=gen_random_uuid(); v_title:=v_page->>'title';
      if v_brand is not null then v_title:=replace(replace(v_title,'[نام برند]',v_brand),'[Brand Name]',v_brand); end if;
      insert into public.pages(id,site_id,title,slug,status,seo,created_by,updated_by)
      values(v_page_id,p_site_id,v_title,v_page->>'slug','draft',jsonb_build_object('starter',jsonb_build_object(
        'installation_id',v_install,'stable_key',v_page->>'stable_key','locale',v_locale,
        'sample',coalesce((v_page->>'sample')::boolean,false),
        'placeholder',coalesce((v_page->>'placeholder')::boolean,false),
        'requires_customer_verification',true
      )),v_actor,v_actor);
      v_position:=0;
      for v_block in select value from jsonb_array_elements(coalesce(v_page->'blocks','[]')) loop
        insert into public.page_blocks(page_id,block_type,position,data)
        values(v_page_id,v_block->>'type',v_position,v_block-'type');
        v_position:=v_position+1;
      end loop;
      insert into public.starter_pack_installation_items(installation_id,entity_type,stable_key,locale,entity_id,installed_snapshot_hash)
      values(v_install,'page',v_page->>'stable_key',v_locale,v_page_id,private.starter_page_snapshot_hash(v_page_id));
      v_count:=v_count+1;
    end loop;
  end loop;
  perform public.record_audit_event('starter_pack.installed','starter_pack_installation',v_install::text,v_org,p_site_id,null,
    jsonb_build_object('pack_version_id',v_pack.id,'template_version_id',v_tv.id,'locales',p_locales,'draft_pages',v_count),
    jsonb_build_object('idempotency_key',p_idempotency_key),null,null,'notice');
  return jsonb_build_object('installation_id',v_install,'status','installed','idempotent_replay',false,
    'draft_pages',v_count,'design_revision',v_rev);
end $$;

create function public.preview_starter_pack_rollback(p_installation_id uuid) returns jsonb
language plpgsql security definer set search_path=public,private,pg_catalog,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_i public.starter_pack_installations%rowtype; v_modified jsonb; v_rev uuid;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into v_i from public.starter_pack_installations where id=p_installation_id;
  if not found then raise exception 'installation_not_found' using errcode='P0002'; end if;
  if not private.can_install_starter_pack(v_i.site_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('stable_key',x.stable_key,'locale',x.locale)),'[]') into v_modified
  from public.starter_pack_installation_items x where x.installation_id=v_i.id
    and private.starter_page_snapshot_hash(x.entity_id) is distinct from x.installed_snapshot_hash;
  select current_revision_id into v_rev from public.site_design_state where site_id=v_i.site_id;
  return jsonb_build_object('installation_id',v_i.id,'status',v_i.status,'modified_items',v_modified,
    'design_changed',v_rev is distinct from v_i.installed_design_revision_id,
    'can_rollback',v_i.status='installed' and jsonb_array_length(v_modified)=0 and v_rev=v_i.installed_design_revision_id);
end $$;

create function public.approve_starter_pack_installation(p_installation_id uuid) returns jsonb
language plpgsql security definer set search_path=public,private,pg_catalog,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_i public.starter_pack_installations%rowtype;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into v_i from public.starter_pack_installations where id=p_installation_id for update;
  if not found then raise exception 'installation_not_found' using errcode='P0002'; end if;
  if not private.can_install_starter_pack(v_i.site_id) or not(
    public.has_permission('platform.sites.manage',null,null)
    or public.has_permission('cms.publish',v_i.organization_id,v_i.site_id)
  ) then raise exception 'permission_denied' using errcode='42501'; end if;
  if v_i.status<>'installed' then raise exception 'installation_not_approvable' using errcode='22023'; end if;
  if exists(select 1 from public.starter_pack_installation_items x join public.pages p on p.id=x.entity_id
    where x.installation_id=v_i.id and p.status<>'draft') then
    raise exception 'starter_content_not_draft' using errcode='22023';
  end if;
  update public.starter_pack_installations set status='approved',approved_by=v_actor,approved_at=now() where id=v_i.id;
  perform public.record_audit_event('starter_pack.approved','starter_pack_installation',v_i.id::text,v_i.organization_id,v_i.site_id,
    jsonb_build_object('status','installed'),jsonb_build_object('status','approved'),'{}',null,null,'notice');
  return jsonb_build_object('installation_id',v_i.id,'status','approved');
end $$;

create function public.rollback_starter_pack_installation(p_installation_id uuid) returns jsonb
language plpgsql security definer set search_path=public,private,pg_catalog,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_i public.starter_pack_installations%rowtype; x record; v_rev uuid;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into v_i from public.starter_pack_installations where id=p_installation_id for update;
  if not found then raise exception 'installation_not_found' using errcode='P0002'; end if;
  if not private.can_install_starter_pack(v_i.site_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  if v_i.status<>'installed' then raise exception 'installation_not_rollbackable' using errcode='22023'; end if;
  select current_revision_id into v_rev from public.site_design_state where site_id=v_i.site_id for update;
  if v_rev is distinct from v_i.installed_design_revision_id then
    raise exception 'design_changed_since_installation' using errcode='55000';
  end if;
  for x in select * from public.starter_pack_installation_items where installation_id=v_i.id loop
    if private.starter_page_snapshot_hash(x.entity_id) is distinct from x.installed_snapshot_hash then
      raise exception 'starter_content_changed_since_installation' using errcode='55000';
    end if;
  end loop;
  delete from public.pages where id in(
    select entity_id from public.starter_pack_installation_items where installation_id=v_i.id and entity_type='page'
  );
  if v_i.previous_design_state is null then
    delete from public.site_design_state where site_id=v_i.site_id;
  else
    update public.site_design_state set
      current_revision_id=(v_i.previous_design_state->>'current_revision_id')::uuid,
      current_template_id=(v_i.previous_design_state->>'current_template_id')::uuid,
      current_template_version_id=(v_i.previous_design_state->>'current_template_version_id')::uuid,
      published_release_id=(v_i.previous_design_state->>'published_release_id')::uuid,
      updated_by=v_actor,updated_at=now() where site_id=v_i.site_id;
  end if;
  update public.starter_pack_installations set status='rolled_back',rolled_back_by=v_actor,rolled_back_at=now() where id=v_i.id;
  perform public.record_audit_event('starter_pack.rolled_back','starter_pack_installation',v_i.id::text,v_i.organization_id,v_i.site_id,
    jsonb_build_object('status','installed'),jsonb_build_object('status','rolled_back'),'{}',null,null,'warning');
  return jsonb_build_object('installation_id',v_i.id,'status','rolled_back');
end $$;

revoke all on function public.install_starter_pack(uuid,uuid,uuid,uuid,text[],jsonb) from public,anon;
revoke all on function public.preview_starter_pack_rollback(uuid) from public,anon;
revoke all on function public.approve_starter_pack_installation(uuid) from public,anon;
revoke all on function public.rollback_starter_pack_installation(uuid) from public,anon;
grant execute on function public.install_starter_pack(uuid,uuid,uuid,uuid,text[],jsonb) to authenticated;
grant execute on function public.preview_starter_pack_rollback(uuid) to authenticated;
grant execute on function public.approve_starter_pack_installation(uuid) to authenticated;
grant execute on function public.rollback_starter_pack_installation(uuid) to authenticated;

with t as (
  insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('starter.pack.installation','cms','starter.pack.installation','starter_packs.install','published','content','owner',false,7,38)
  on conflict(key) do update set minimum_permission=excluded.minimum_permission,status='published' returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','نصب امن محتوای شروع','بسته محتوا و Template سازگار را بدون انتشار خودکار نصب کن.','نصب، نسخه دقیق بسته و Template را ثبت می‌کند و فقط Draft می‌سازد. درخواست تکراری محتوای تکراری نمی‌سازد و rollback ابتدا تغییرات کاربر را بررسی می‌کند.','["سایت، بسته و Template را انتخاب کن.","زبان و اطلاعات تأییدشده برند را وارد کن.","Draftها را بازبینی کن.","پس از تأیید انسانی از Release استفاده کن."]','["نصب به معنی انتشار نیست.","rollback محتوای ویرایش‌شده را حذف نمی‌کند."]',array['starter pack','نصب محتوا','template','draft','rollback'] from t
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Install starter content safely','Install compatible content and a Template without automatic publishing.','Installation snapshots exact versions and creates Drafts only. Replays create no duplicates and rollback first checks customer edits.','["Choose the Site, pack and Template.","Provide locales and verified brand inputs.","Review Drafts.","Use Release only after human approval."]','["Installation is not publication.","Rollback never deletes edited content."]',array['starter pack','content installation','template','draft','rollback'] from public.help_topics where key='starter.pack.installation'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;
