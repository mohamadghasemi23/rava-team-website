-- P1: versioned service-site classification and starter content catalog.
create type public.pack_catalog_status as enum ('draft','active','deprecated','archived');
create type public.pack_version_status as enum ('draft','published','retired');

create table public.site_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_fa text not null,
  name_en text not null,
  description_fa text not null default '',
  description_en text not null default '',
  status public.pack_catalog_status not null default 'draft',
  commercial_tier text not null default 'core',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_types_key_format check(key ~ '^[a-z0-9][a-z0-9_.:-]{1,79}$'),
  constraint site_types_tier check(commercial_tier in ('core','premium','enterprise')),
  constraint site_types_metadata_object check(jsonb_typeof(metadata)='object')
);

create table public.site_type_versions (
  id uuid primary key default gen_random_uuid(),
  site_type_id uuid not null references public.site_types(id) on delete cascade,
  version integer not null,
  schema_version integer not null default 1,
  status public.pack_version_status not null default 'draft',
  definition jsonb not null default '{}'::jsonb,
  changelog_fa text not null default '',
  changelog_en text not null default '',
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(site_type_id,version),
  constraint site_type_versions_positive check(version>0 and schema_version>0),
  constraint site_type_versions_definition_object check(jsonb_typeof(definition)='object')
);

create table public.industry_packs (
  id uuid primary key default gen_random_uuid(),
  site_type_id uuid not null references public.site_types(id) on delete restrict,
  key text not null unique,
  name_fa text not null,
  name_en text not null,
  description_fa text not null default '',
  description_en text not null default '',
  status public.pack_catalog_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint industry_packs_key_format check(key ~ '^[a-z0-9][a-z0-9_.:-]{1,119}$'),
  constraint industry_packs_metadata_object check(jsonb_typeof(metadata)='object')
);

create table public.industry_pack_versions (
  id uuid primary key default gen_random_uuid(),
  industry_pack_id uuid not null references public.industry_packs(id) on delete cascade,
  version integer not null,
  schema_version integer not null default 1,
  status public.pack_version_status not null default 'draft',
  terminology jsonb not null default '{}'::jsonb,
  recommended_modules text[] not null default '{}'::text[],
  changelog_fa text not null default '',
  changelog_en text not null default '',
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(industry_pack_id,version),
  constraint industry_pack_versions_positive check(version>0 and schema_version>0),
  constraint industry_pack_versions_terminology_object check(jsonb_typeof(terminology)='object')
);

create table public.starter_content_packs (
  id uuid primary key default gen_random_uuid(),
  site_type_id uuid not null references public.site_types(id) on delete restrict,
  industry_pack_id uuid not null references public.industry_packs(id) on delete restrict,
  key text not null unique,
  name_fa text not null,
  name_en text not null,
  description_fa text not null default '',
  description_en text not null default '',
  status public.pack_catalog_status not null default 'draft',
  commercial_tier text not null default 'core',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint starter_content_packs_key_format check(key ~ '^[a-z0-9][a-z0-9_.:-]{1,159}$'),
  constraint starter_content_packs_tier check(commercial_tier in ('core','premium','enterprise','exclusive')),
  constraint starter_content_packs_metadata_object check(jsonb_typeof(metadata)='object'),
  unique(id,site_type_id,industry_pack_id)
);

create or replace function private.valid_starter_manifest(p_manifest jsonb) returns boolean
language sql immutable set search_path=pg_catalog,pg_temp
as $$
  select jsonb_typeof(p_manifest)='object'
    and jsonb_typeof(p_manifest->'locales')='object'
    and jsonb_typeof(p_manifest->'locales'->'fa')='object'
    and jsonb_typeof(p_manifest->'locales'->'en')='object'
    and jsonb_typeof(p_manifest->'locales'->'fa'->'pages')='array'
    and jsonb_typeof(p_manifest->'locales'->'en'->'pages')='array'
    and jsonb_array_length(p_manifest->'locales'->'fa'->'pages')>0
    and jsonb_array_length(p_manifest->'locales'->'en'->'pages')>0
    and coalesce((p_manifest->>'schema_version')::integer,0)>0
$$;
revoke all on function private.valid_starter_manifest(jsonb) from public,anon,authenticated;

create table public.starter_content_pack_versions (
  id uuid primary key default gen_random_uuid(),
  starter_pack_id uuid not null references public.starter_content_packs(id) on delete cascade,
  version integer not null,
  schema_version integer not null default 1,
  status public.pack_version_status not null default 'draft',
  manifest jsonb not null,
  content_hash text not null,
  changelog_fa text not null default '',
  changelog_en text not null default '',
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(starter_pack_id,version),
  unique(starter_pack_id,content_hash),
  constraint starter_pack_versions_positive check(version>0 and schema_version>0),
  constraint starter_pack_versions_hash check(content_hash ~ '^[0-9a-f]{64}$'),
  constraint starter_pack_versions_manifest check(private.valid_starter_manifest(manifest))
);

create table public.starter_pack_template_compatibility (
  starter_pack_version_id uuid not null references public.starter_content_pack_versions(id) on delete cascade,
  template_version_id uuid not null references public.template_versions(id) on delete cascade,
  recommended_modules text[] not null default '{}'::text[],
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(starter_pack_version_id,template_version_id)
);

create or replace function private.protect_published_pack_version() returns trigger
language plpgsql set search_path=public,pg_temp
as $$
begin
  if tg_op='DELETE' and old.status='published' then raise exception 'published pack version is immutable'; end if;
  if tg_op='UPDATE' and old.status='published' and (
    to_jsonb(new)-array['status','published_at'] is distinct from to_jsonb(old)-array['status','published_at']
  ) then raise exception 'published pack version content is immutable'; end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;
revoke all on function private.protect_published_pack_version() from public,anon,authenticated;

create trigger protect_site_type_version before update or delete on public.site_type_versions for each row execute function private.protect_published_pack_version();
create trigger protect_industry_pack_version before update or delete on public.industry_pack_versions for each row execute function private.protect_published_pack_version();
create trigger protect_starter_pack_version before update or delete on public.starter_content_pack_versions for each row execute function private.protect_published_pack_version();

create or replace function private.validate_pack_compatibility() returns trigger
language plpgsql set search_path=public,pg_temp
as $$
declare v_site_type text; v_industry text; v_template_industry text; v_missing integer;
begin
  select st.key,ip.key into v_site_type,v_industry
  from public.starter_content_pack_versions spv
  join public.starter_content_packs sp on sp.id=spv.starter_pack_id
  join public.site_types st on st.id=sp.site_type_id
  join public.industry_packs ip on ip.id=sp.industry_pack_id
  where spv.id=new.starter_pack_version_id and spv.status='published' and sp.status='active' and st.status='active' and ip.status='active';
  if v_site_type is null then raise exception 'starter pack version unavailable'; end if;
  select tc.industry_key into v_template_industry from public.template_versions tv join public.template_catalog tc on tc.id=tv.template_id where tv.id=new.template_version_id and tv.status='published' and tc.status='active';
  if v_template_industry is null or v_template_industry not in (v_site_type,v_industry,'general') then raise exception 'template is incompatible with starter pack'; end if;
  select count(*) into v_missing from unnest(new.recommended_modules) m left join public.module_catalog mc on mc.key=m and mc.status='active' where mc.key is null;
  if v_missing>0 then raise exception 'unknown recommended module'; end if;
  return new;
end;
$$;
revoke all on function private.validate_pack_compatibility() from public,anon,authenticated;
create trigger validate_pack_compatibility before insert or update on public.starter_pack_template_compatibility for each row execute function private.validate_pack_compatibility();

create index site_type_versions_catalog_idx on public.site_type_versions(site_type_id,status,version desc);
create index industry_packs_type_idx on public.industry_packs(site_type_id,status);
create index industry_pack_versions_catalog_idx on public.industry_pack_versions(industry_pack_id,status,version desc);
create index starter_content_packs_classification_idx on public.starter_content_packs(site_type_id,industry_pack_id,status);
create index starter_content_pack_versions_catalog_idx on public.starter_content_pack_versions(starter_pack_id,status,version desc);
create unique index starter_pack_one_default_template on public.starter_pack_template_compatibility(starter_pack_version_id) where is_default and active;

alter table public.site_types enable row level security;
alter table public.site_type_versions enable row level security;
alter table public.industry_packs enable row level security;
alter table public.industry_pack_versions enable row level security;
alter table public.starter_content_packs enable row level security;
alter table public.starter_content_pack_versions enable row level security;
alter table public.starter_pack_template_compatibility enable row level security;

create policy site_types_read on public.site_types for select to authenticated using(status='active' and public.has_permission('starter_packs.view',null,null) or public.has_permission('starter_packs.manage',null,null) or public.has_permission('platform.sites.manage',null,null));
create policy site_type_versions_read on public.site_type_versions for select to authenticated using(status='published' and exists(select 1 from public.site_types c where c.id=site_type_id and c.status='active') and (public.has_permission('starter_packs.view',null,null) or public.has_permission('starter_packs.manage',null,null) or public.has_permission('platform.sites.manage',null,null)));
create policy industry_packs_read on public.industry_packs for select to authenticated using(status='active' and (public.has_permission('starter_packs.view',null,null) or public.has_permission('starter_packs.manage',null,null) or public.has_permission('platform.sites.manage',null,null)));
create policy industry_pack_versions_read on public.industry_pack_versions for select to authenticated using(status='published' and exists(select 1 from public.industry_packs c where c.id=industry_pack_id and c.status='active') and (public.has_permission('starter_packs.view',null,null) or public.has_permission('starter_packs.manage',null,null) or public.has_permission('platform.sites.manage',null,null)));
create policy starter_content_packs_read on public.starter_content_packs for select to authenticated using(status='active' and (public.has_permission('starter_packs.view',null,null) or public.has_permission('starter_packs.manage',null,null) or public.has_permission('platform.sites.manage',null,null)));
create policy starter_content_pack_versions_read on public.starter_content_pack_versions for select to authenticated using(status='published' and exists(select 1 from public.starter_content_packs c where c.id=starter_pack_id and c.status='active') and (public.has_permission('starter_packs.view',null,null) or public.has_permission('starter_packs.manage',null,null) or public.has_permission('platform.sites.manage',null,null)));
create policy starter_pack_compatibility_read on public.starter_pack_template_compatibility for select to authenticated using(active and exists(select 1 from public.starter_content_pack_versions v where v.id=starter_pack_version_id and v.status='published') and (public.has_permission('starter_packs.view',null,null) or public.has_permission('starter_packs.manage',null,null) or public.has_permission('platform.sites.manage',null,null)));

revoke all on public.site_types,public.site_type_versions,public.industry_packs,public.industry_pack_versions,public.starter_content_packs,public.starter_content_pack_versions,public.starter_pack_template_compatibility from anon;
revoke insert,update,delete on public.site_types,public.site_type_versions,public.industry_packs,public.industry_pack_versions,public.starter_content_packs,public.starter_content_pack_versions,public.starter_pack_template_compatibility from authenticated;
grant select on public.site_types,public.site_type_versions,public.industry_packs,public.industry_pack_versions,public.starter_content_packs,public.starter_content_pack_versions,public.starter_pack_template_compatibility to authenticated;

insert into public.permissions(key,module_key,name_fa,name_en,risk_level) values
('starter_packs.view','cms','مشاهده بسته‌های شروع','View starter packs','low'),
('starter_packs.manage','cms','مدیریت بسته‌های شروع','Manage starter packs','high'),
('starter_packs.install','cms','نصب محتوای شروع','Install starter content','high')
on conflict(key) do nothing;

insert into public.site_types(key,name_fa,name_en,description_fa,description_en,status,commercial_tier,metadata)
values('services','سایت خدماتی','Service Website','سایت حرفه‌ای برای معرفی خدمات، اعتمادسازی و دریافت سرنخ.','A professional website for service presentation, trust building and lead generation.','active','core','{"product_family":"services","requires_human_publish_approval":true}')
on conflict(key) do nothing;
insert into public.site_type_versions(site_type_id,version,status,definition,changelog_fa,changelog_en,published_at)
select id,1,'published','{"required_entities":["pages","navigation","services","projects","leads","seo"],"publish_flow":["draft","preview","approval","release"]}','نسخه پایه سایت خدماتی','Initial service-site definition',now() from public.site_types where key='services'
on conflict(site_type_id,version) do nothing;

insert into public.industry_packs(site_type_id,key,name_fa,name_en,description_fa,description_en,status,metadata)
select id,'services.digital-agency','آژانس دیجیتال','Digital Agency','ساختار محتوایی مناسب طراحی سایت، برند و خدمات دیجیتال.','Content structure for web, brand and digital services.','active','{"facts_must_be_verified":true}' from public.site_types where key='services'
on conflict(key) do nothing;
insert into public.industry_pack_versions(industry_pack_id,version,status,terminology,recommended_modules,changelog_fa,changelog_en,published_at)
select id,1,'published','{"service":"خدمت","project":"نمونه‌کار قابل راستی‌آزمایی","consultation":"درخواست مشاوره"}',array['cms','media','seo_core','analytics_core','security','help'],'نسخه پایه آژانس دیجیتال','Initial digital-agency industry pack',now() from public.industry_packs where key='services.digital-agency'
on conflict(industry_pack_id,version) do nothing;

insert into public.starter_content_packs(site_type_id,industry_pack_id,key,name_fa,name_en,description_fa,description_en,status,commercial_tier,metadata)
select st.id,ip.id,'services.digital-agency.rava-team','بسته شروع خدمات دیجیتال راوا','RAVA Digital Services Starter','ساختار کامل Draft برای معرفی خدمات دیجیتال و خود پلتفرم؛ تمام واقعیت‌های کسب‌وکار نیازمند تأیید مالک است.','Complete draft structure for digital services and the platform story; all business facts require owner verification.','active','core','{"customer_zero_compatible":true,"never_fabricate_claims":true}'
from public.site_types st join public.industry_packs ip on ip.site_type_id=st.id where st.key='services' and ip.key='services.digital-agency'
on conflict(key) do nothing;

with manifest(value) as (values($manifest$
{
  "schema_version":1,
  "pack_key":"services.digital-agency.rava-team",
  "brand_fields_required":["brand_name","approved_services","contact_channels","verified_portfolio","legal_identity"],
  "claims_policy":{"fabrication_forbidden":true,"customer_verification_required":true},
  "locales":{
    "fa":{"navigation":["home","services","portfolio","about","process","faq","contact"],"pages":[
      {"stable_key":"home","title":"[نام برند]؛ شریک دیجیتال کسب‌وکار شما","slug":"home","status":"draft","sample":false,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"hero","title":"راهکار دیجیتال متناسب با کسب‌وکار شما","text":"خدمات تأییدشده برند را اینجا معرفی کنید."},{"type":"services","title":"خدمات ما","items":[]},{"type":"cta","title":"برای شروع گفت‌وگو آماده‌اید؟"}]},
      {"stable_key":"about","title":"درباره [نام برند]","slug":"about","status":"draft","sample":false,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"text","title":"داستان و رویکرد","text":"اطلاعات واقعی تیم، تجربه و ارزش‌ها پس از تأیید مالک وارد شود."}]},
      {"stable_key":"services","title":"خدمات","slug":"services","status":"draft","sample":false,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"service_list","title":"خدمات تأییدشده","items":[]}]},
      {"stable_key":"service-detail","title":"جزئیات خدمت","slug":"service-detail","status":"draft","sample":true,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"text","title":"مسئله، راهکار و خروجی","text":"دامنه و خروجی واقعی این خدمت را مشخص کنید."}]},
      {"stable_key":"portfolio","title":"نمونه‌کارها","slug":"portfolio","status":"draft","sample":false,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"project_list","title":"پروژه‌های قابل راستی‌آزمایی","items":[]}]},
      {"stable_key":"process","title":"فرآیند همکاری","slug":"process","status":"draft","sample":true,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"steps","title":"از شناخت تا تحویل","items":["شناخت نیاز","پیشنهاد و تأیید","اجرا و بازبینی","تحویل و پشتیبانی"]}]},
      {"stable_key":"contact","title":"تماس و مشاوره","slug":"contact","status":"draft","sample":false,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"lead_form","title":"درخواست مشاوره","consent_required":true}]},
      {"stable_key":"faq","title":"پرسش‌های متداول","slug":"faq","status":"draft","sample":true,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"faq","items":[]}]},
      {"stable_key":"privacy","title":"حریم خصوصی","slug":"privacy","status":"draft","sample":true,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"legal","text":"متن حقوقی باید متناسب با رویه واقعی جمع‌آوری داده و با تأیید مسئول کسب‌وکار تکمیل شود."}]}
    ]},
    "en":{"navigation":["home","services","portfolio","about","process","faq","contact"],"pages":[
      {"stable_key":"home","title":"[Brand Name], your digital partner","slug":"home-en","status":"draft","sample":false,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"hero","title":"Digital solutions shaped around your business","text":"Add only owner-approved services and facts."}]},
      {"stable_key":"about","title":"About [Brand Name]","slug":"about-en","status":"draft","sample":false,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"text","title":"Story and approach","text":"Add verified team, experience and values."}]},
      {"stable_key":"services","title":"Services","slug":"services-en","status":"draft","sample":false,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"service_list","items":[]}]},
      {"stable_key":"service-detail","title":"Service detail","slug":"service-detail-en","status":"draft","sample":true,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"text","title":"Problem, approach and deliverables"}]},
      {"stable_key":"portfolio","title":"Portfolio","slug":"portfolio-en","status":"draft","sample":false,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"project_list","items":[]}]},
      {"stable_key":"process","title":"How we work","slug":"process-en","status":"draft","sample":true,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"steps","items":["Discovery","Proposal and approval","Delivery and review","Handover and support"]}]},
      {"stable_key":"contact","title":"Contact and consultation","slug":"contact-en","status":"draft","sample":false,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"lead_form","consent_required":true}]},
      {"stable_key":"faq","title":"Frequently asked questions","slug":"faq-en","status":"draft","sample":true,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"faq","items":[]}]},
      {"stable_key":"privacy","title":"Privacy","slug":"privacy-en","status":"draft","sample":true,"placeholder":true,"requires_customer_verification":true,"blocks":[{"type":"legal","text":"Adapt this draft to actual data practices and obtain responsible-owner approval."}]}
    ]}
  }
}
$manifest$::jsonb))
insert into public.starter_content_pack_versions(starter_pack_id,version,status,manifest,content_hash,changelog_fa,changelog_en,published_at)
select p.id,1,'published',m.value,encode(digest(m.value::text,'sha256'),'hex'),'نسخه اولیه Draft دوزبانه','Initial bilingual draft manifest',now()
from public.starter_content_packs p cross join manifest m where p.key='services.digital-agency.rava-team'
on conflict(starter_pack_id,version) do nothing;

insert into public.starter_pack_template_compatibility(starter_pack_version_id,template_version_id,recommended_modules,is_default)
select spv.id,tv.id,array['cms','media','seo_core','analytics_core','security','help'],true
from public.starter_content_pack_versions spv
join public.starter_content_packs sp on sp.id=spv.starter_pack_id and sp.key='services.digital-agency.rava-team'
join public.template_catalog tc on tc.key='rava-service-minimal'
join public.template_versions tv on tv.template_id=tc.id and tv.version=1 and tv.status='published'
where spv.version=1
on conflict(starter_pack_version_id,template_version_id) do nothing;

with topic as (
  insert into public.help_topics(key,module_key,feature_key,minimum_permission,status,category,audience,is_featured,estimated_minutes,sort_order)
  values('starter.pack.catalog','cms','starter.pack.catalog','starter_packs.view','published','content','owner',false,6,37)
  on conflict(key) do update set minimum_permission=excluded.minimum_permission,status='published' returning id
)
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'fa','Site Type و بسته محتوای شروع','ساختار نسخه‌دار سایت خدماتی، صنعت، قالب سازگار و محتوای Draft را بشناس.','هر بسته شروع یک Manifest تغییرناپذیر و دوزبانه دارد. نصب بعدی فقط Draft می‌سازد و واقعیت‌های کسب‌وکار باید توسط مشتری یا مالک تأیید شوند.','["Site Type را انتخاب کن.","Industry Pack سازگار را انتخاب کن.","نسخه Starter Content و Template سازگار را بازبینی کن.","Brand Profile تأییدشده را آماده کن.","در مرحله نصب فقط Draft بساز."]'::jsonb,'["هیچ ادعای تجاری را جعل نکن.","نسخه منتشرشده Pack را ویرایش نکن؛ نسخه جدید بساز.","نصب Pack به معنی انتشار Production نیست."]'::jsonb,array['site type','industry pack','starter content','محتوای شروع','draft'] from topic
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;
insert into public.help_translations(topic_id,locale,title,summary,body_markdown,steps,warnings,search_keywords)
select id,'en','Site types and starter content packs','Understand the versioned service-site, industry, compatible template and draft-content structure.','Each starter pack has an immutable bilingual manifest. Installation will create drafts only, and business facts require customer or owner verification.','["Choose a Site Type.","Choose a compatible Industry Pack.","Review the Starter Content and compatible Template versions.","Prepare a verified Brand Profile.","Create drafts only during installation."]'::jsonb,'["Never fabricate business claims.","Create a new version instead of editing a published pack.","Installing a pack does not publish Production."]'::jsonb,array['site type','industry pack','starter content','draft'] from public.help_topics where key='starter.pack.catalog'
on conflict(topic_id,locale) do update set title=excluded.title,summary=excluded.summary,body_markdown=excluded.body_markdown,steps=excluded.steps,warnings=excluded.warnings,search_keywords=excluded.search_keywords,version=public.help_translations.version+1;
