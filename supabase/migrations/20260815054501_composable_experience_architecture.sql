-- RAVA Composable Experience Architecture
-- Theme = brand identity; Module = capability; Page Type = semantic role; Experience Pack = page-level presentation.
create table if not exists public.experience_packs(
  experience_key text primary key,
  family text not null,
  page_type text not null,
  label_fa text not null,
  label_en text not null,
  description_fa text not null default '',
  description_en text not null default '',
  required_feature text references public.feature_catalog(key) on delete set null,
  compatible_archetypes text[] not null default '{}'::text[],
  compatible_modules text[] not null default '{}'::text[],
  default_config jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  status text not null default 'active' check(status in('active','deprecated','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pages add column if not exists page_type text not null default 'standard';
alter table public.pages add column if not exists experience_key text references public.experience_packs(experience_key) on delete set null;
alter table public.pages add column if not exists experience_config jsonb not null default '{}'::jsonb;

insert into public.experience_packs(experience_key,family,page_type,label_fa,label_en,description_fa,description_en,required_feature,compatible_archetypes,compatible_modules,default_config) values
('agency-editorial','service','service','خدمات ادیتوریال','Agency Editorial','صفحه خدمات با تایپوگرافی قوی، Case Study و CTAهای حرفه‌ای.','Editorial service page with strong typography, proof and conversion CTAs.',null,array['portfolio','services','hybrid','custom'],array[]::text[], '{"hero":"editorial","sections":"story-led","cta":"clean"}'::jsonb),
('portfolio-case-study','portfolio','case_study','کیس استادی تصویری','Portfolio Case Study','روایت پروژه با مدیای بزرگ، مسئله، راه‌حل و نتیجه.','Immersive project story with media, challenge, solution and results.',null,array['portfolio','services','hybrid','custom'],array[]::text[], '{"hero":"media-first","gallery":"immersive","proof":"metrics"}'::jsonb),
('commerce-premium','commerce','product','کامرس پریمیوم','Commerce Premium','صفحه محصول حرفه‌ای با گالری، اطلاعات خرید، اعتمادسازی و پیشنهادهای مرتبط.','Premium product detail experience with gallery, purchase information and related items.','commerce.core',array['commerce','hybrid','custom'],array['catalog','cart','checkout'], '{"gallery":"editorial","buybox":"sticky","recommendations":true}'::jsonb),
('commerce-collection','commerce','collection','کالکشن فروشگاهی','Commerce Collection','فهرست محصول با جستجو، فیلتر، مرتب‌سازی و کارت‌های Conversion-focused.','Collection experience with search, filters, sorting and conversion-focused product cards.','commerce.core',array['commerce','hybrid','custom'],array['catalog'], '{"filters":"sidebar","grid":"responsive","quickView":true}'::jsonb),
('editorial-story','editorial','article','داستان ادیتوریال','Editorial Story','برای مقاله، خبر، معرفی عمیق و محتوای Story-driven.','Long-form editorial experience for articles, news and story-driven content.',null,array['portfolio','services','commerce','hybrid','custom'],array[]::text[], '{"readingWidth":"comfortable","toc":true,"media":"wide"}'::jsonb),
('conversion-landing','marketing','landing','لندینگ تبدیل‌محور','Conversion Landing','لندینگ کمپین با تمرکز روی پیام، اثبات، CTA و تبدیل.','Campaign landing page focused on message, proof, CTA and conversion.',null,array['portfolio','services','commerce','hybrid','custom'],array[]::text[], '{"nav":"minimal","cta":"repeated","proof":"strong"}'::jsonb)
on conflict(experience_key) do update set family=excluded.family,page_type=excluded.page_type,label_fa=excluded.label_fa,label_en=excluded.label_en,description_fa=excluded.description_fa,description_en=excluded.description_en,required_feature=excluded.required_feature,compatible_archetypes=excluded.compatible_archetypes,compatible_modules=excluded.compatible_modules,default_config=excluded.default_config,status='active',updated_at=now();

alter table public.experience_packs enable row level security;
create policy experience_packs_read on public.experience_packs for select using(status <> 'archived');

create index if not exists pages_tenant_page_type_idx on public.pages(tenant_id,page_type,status);
create index if not exists pages_tenant_experience_idx on public.pages(tenant_id,experience_key);
