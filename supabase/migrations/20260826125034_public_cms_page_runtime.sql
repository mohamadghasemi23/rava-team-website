-- Tenant-safe public CMS runtime. Public callers resolve content through a
-- verified hostname instead of enumerating published rows through PostgREST.
drop policy if exists pages_public_published on public.pages;
drop policy if exists projects_public_published on public.projects;
drop policy if exists page_blocks_public_published on public.page_blocks;

revoke select on public.pages,public.page_blocks,public.projects from anon;

create or replace function public.get_published_page(p_hostname text,p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
declare
  v_hostname text:=lower(trim(trailing '.' from btrim(coalesce(p_hostname,''))));
  v_slug text:=lower(trim(both '/' from btrim(coalesce(p_slug,''))));
  v_result jsonb;
begin
  if length(v_hostname)<1 or length(v_hostname)>253 or v_hostname ~ '[/:?#[:space:]]' then return null; end if;
  if length(v_slug)<1 or length(v_slug)>180 or v_slug ~ '[/\\?#[:space:]]' then return null; end if;

  select jsonb_build_object(
    'site',jsonb_build_object(
      'id',s.id,
      'name',s.name,
      'locale',s.primary_locale,
      'theme',s.theme_config
    ),
    'page',jsonb_build_object(
      'id',p.id,
      'title',p.title,
      'slug',p.slug,
      'seo',p.seo,
      'published_at',p.published_at
    ),
    'blocks',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',b.id,
        'type',b.block_type,
        'position',b.position,
        'data',b.data
      ) order by b.position,b.id)
      from public.page_blocks b
      where b.page_id=p.id and b.visible=true
    ),'[]'::jsonb)
  )
  into v_result
  from public.site_domains d
  join public.site_environments e on e.id=d.environment_id and e.site_id=d.site_id and e.active=true
  join public.sites s on s.id=d.site_id and s.status='active'
  join public.organizations o on o.id=s.organization_id and o.status='active'
  join public.pages p on p.site_id=s.id and p.slug=v_slug and p.status='published'
  where d.hostname=v_hostname and d.verified_at is not null
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.get_published_page(text,text) from public;
grant execute on function public.get_published_page(text,text) to anon,authenticated;

with topic as (
  insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('cms.public_pages.runtime','cms','cms.public_pages','cms.view','published','content','admin',false,4,36)
  on conflict(key) do update set module_key=excluded.module_key,feature_key=excluded.feature_key,minimum_permission=excluded.minimum_permission,status='published',category=excluded.category,audience=excluded.audience
  returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','انتشار صفحه روی آدرس مستقل','صفحه منتشرشده فقط روی دامنه تأییدشده همان سایت و Slug خودش نمایش داده می‌شود.','راوا برای نمایش عمومی، دامنه درخواست را به Site فعال متصل می‌کند و فقط Blockهای قابل‌نمایش صفحه منتشرشده را برمی‌گرداند.',
'["صفحه را در Site درست بساز.","Slug یکتا و مناسب انتخاب کن.","Blockها را بازبینی کن.","دامنه و Environment را تأیید کن.","صفحه را با دسترسی Publish منتشر کن."]'::jsonb,
'["Draft و Block مخفی در سایت عمومی نمایش داده نمی‌شوند.","دامنه اشتباه یا تأییدنشده به محتوای Site دسترسی ندارد."]'::jsonb,
array['صفحه عمومی','دامنه','slug','انتشار','cms'] from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Publish a page at its own URL','A published page is visible only on its Site verified domain and its own slug.','RAVA resolves the request hostname to an active Site and returns only visible blocks belonging to the published page.',
'["Create the page in the correct Site.","Choose a suitable unique slug.","Review its blocks.","Verify the Domain and Environment.","Publish with the Publish permission."]'::jsonb,
'["Draft pages and hidden blocks never appear publicly.","An unverified or mismatched domain cannot access Site content."]'::jsonb,
array['public page','domain','slug','publish','cms'] from public.help_topics where key='cms.public_pages.runtime'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;

insert into public.help_context_bindings(topic_id,route_pattern,context_key,priority)
select id,'/admin/pages*','cms-public-pages',9 from public.help_topics where key='cms.public_pages.runtime'
on conflict(topic_id,route_pattern,context_key) do update set priority=excluded.priority;
