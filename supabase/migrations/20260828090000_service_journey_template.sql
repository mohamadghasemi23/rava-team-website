-- First independent public renderer family and its versioned catalog entry.
insert into public.template_catalog(
  key,name_fa,name_en,description_fa,description_en,industry_key,status,commercial_tier,is_public,metadata
) values (
  'rava-service-journey','روایت تصویری راوا','RAVA Visual Journey',
  'قالب خدماتی داستان‌محور با تصویرسازی، فضای سفید سخاوتمندانه، گالری موزاییکی و دعوت به اقدام سینمایی.',
  'A story-led service template with illustration, generous whitespace, a mosaic gallery and a cinematic call to action.',
  'services','active','premium',true,
  '{"family":"services","renderer":"journey","visual_direction":"illustrated-story","customer_zero_candidate":true,"starter":false}'::jsonb
)
on conflict(key) do update set
  name_fa=excluded.name_fa,name_en=excluded.name_en,
  description_fa=excluded.description_fa,description_en=excluded.description_en,
  industry_key=excluded.industry_key,status=excluded.status,commercial_tier=excluded.commercial_tier,
  is_public=excluded.is_public,metadata=excluded.metadata,updated_at=now();

insert into public.template_versions(
  template_id,version,status,theme_defaults,layout_blueprint,seo_defaults,module_defaults,
  changelog_fa,changelog_en,published_at
)
select id,1,'published',
  '{"colors":{"background":"#3F62B4","surface":"#FFFFFF","text":"#111A36","primary":"#3158BD","accent":"#86B8FF"},"typography":{"heading":"display-rounded","body":"system"},"radius":28,"spacing":"airy","motion":"narrative"}'::jsonb,
  '{"renderer":"journey","header":"floating-clean","hero":"illustrated-split","sections":["benefits","story","services-carousel","feature-story","team","mosaic-gallery","cinematic-cta"],"footer":"night-landscape"}'::jsonb,
  '{"schema":["Organization","ProfessionalService"],"indexable":true,"content_policy":"verified-facts-only"}'::jsonb,
  array['cms','media','seo_core','analytics_core','security','help']::text[],
  'نسخه نخست قالب خدماتی روایت تصویری','Initial visual-journey service template',now()
from public.template_catalog where key='rava-service-journey'
on conflict(template_id,version) do update set
  theme_defaults=excluded.theme_defaults,layout_blueprint=excluded.layout_blueprint,
  seo_defaults=excluded.seo_defaults,module_defaults=excluded.module_defaults,
  changelog_fa=excluded.changelog_fa,changelog_en=excluded.changelog_en;

insert into public.starter_pack_template_compatibility(
  starter_pack_version_id,template_version_id,recommended_modules,is_default,active
)
select spv.id,tv.id,array['cms','media','seo_core','analytics_core','security','help']::text[],false,true
from public.starter_content_pack_versions spv
join public.starter_content_packs sp on sp.id=spv.starter_pack_id and sp.key='services.digital-agency.rava-team'
join public.template_catalog tc on tc.key='rava-service-journey'
join public.template_versions tv on tv.template_id=tc.id and tv.version=1 and tv.status='published'
where spv.version=1 and spv.status='published'
on conflict(starter_pack_version_id,template_version_id) do update set active=true,recommended_modules=excluded.recommended_modules;

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
      'id',s.id,'name',s.name,'locale',s.primary_locale,'theme',s.theme_config,
      'templateKey',coalesce(tc.key,'rava-service-minimal'),
      'layout',coalesce(sr.layout_snapshot,s.settings->'layout_config','{}'::jsonb)
    ),
    'page',jsonb_build_object(
      'id',p.id,'title',p.title,'slug',p.slug,'seo',p.seo,'published_at',p.published_at
    ),
    'blocks',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',b.id,'type',b.block_type,'position',b.position,'data',b.data
      ) order by b.position,b.id)
      from public.page_blocks b where b.page_id=p.id and b.visible=true
    ),'[]'::jsonb)
  ) into v_result
  from public.site_domains d
  join public.site_environments e on e.id=d.environment_id and e.site_id=d.site_id and e.active=true
  join public.sites s on s.id=d.site_id and s.status='active'
  join public.organizations o on o.id=s.organization_id and o.status='active'
  join public.pages p on p.site_id=s.id and p.slug=v_slug and p.status='published'
  left join public.site_design_state ds on ds.site_id=s.id
  left join public.site_releases sr on sr.id=ds.published_release_id and sr.site_id=s.id
  left join public.template_catalog tc on tc.id=sr.template_id and tc.status='active'
  where d.hostname=v_hostname and d.verified_at is not null
  limit 1;
  return v_result;
end;
$$;

revoke all on function public.get_published_page(text,text) from public;
grant execute on function public.get_published_page(text,text) to anon,authenticated;

update public.help_translations
set body_markdown=body_markdown||E'\n\nقالب «روایت تصویری راوا» نخستین خانواده‌ای است که چیدمان، ریتم، گالری و دعوت به اقدام مستقل دارد. انتخاب آن فقط پیش‌نویس می‌سازد و انتشار همچنان نیازمند تأیید جداگانه است.',
    version=version+1
where locale='fa' and topic_id=(select id from public.help_topics where key='platform.design.manage');

update public.help_translations
set body_markdown=body_markdown||E'\n\n“RAVA Visual Journey” is the first independent renderer family with its own composition, rhythm, gallery and call to action. Selecting it creates a draft only; publishing still requires separate approval.',
    version=version+1
where locale='en' and topic_id=(select id from public.help_topics where key='platform.design.manage');
