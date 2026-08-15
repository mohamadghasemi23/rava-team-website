-- RAVA Guidance System: searchable help, role-aware onboarding and per-user preferences.
create table if not exists public.guidance_articles(
  article_key text primary key check(article_key~'^[a-z0-9][a-z0-9._-]{2,120}$'),
  area text not null default 'general',
  route_prefix text,
  audience text not null default 'all' check(audience in('all','tenant','platform')),
  title_fa text not null,
  summary_fa text not null default '',
  body_fa text not null,
  title_en text not null,
  summary_en text not null default '',
  body_en text not null,
  keywords text[] not null default '{}',
  related_help_keys text[] not null default '{}',
  importance text not null default 'standard' check(importance in('standard','important','critical')),
  active boolean not null default true,
  sort_order integer not null default 100,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guidance_tours(
  tour_key text primary key check(tour_key~'^[a-z0-9][a-z0-9._-]{2,120}$'),
  route_prefix text not null,
  audience text not null default 'all' check(audience in('all','tenant','platform')),
  title_fa text not null,
  title_en text not null,
  version integer not null default 1 check(version>0),
  steps jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guidance_user_preferences(
  user_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  locale text not null default 'fa' check(locale in('fa','en')),
  experience_mode text not null default 'basic' check(experience_mode in('basic','advanced')),
  guidance_dock_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,tenant_id)
);

create table if not exists public.guidance_tour_progress(
  user_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tour_key text not null references public.guidance_tours(tour_key) on delete cascade,
  tour_version integer not null,
  status text not null default 'new' check(status in('new','in_progress','completed','skipped')),
  step_index integer not null default 0 check(step_index>=0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,tenant_id,tour_key)
);

create index if not exists guidance_articles_route_idx on public.guidance_articles(route_prefix,active,sort_order);
create index if not exists guidance_articles_area_idx on public.guidance_articles(area,active,sort_order);
create index if not exists guidance_tours_route_idx on public.guidance_tours(route_prefix,active);

alter table public.guidance_articles enable row level security;
alter table public.guidance_tours enable row level security;
alter table public.guidance_user_preferences enable row level security;
alter table public.guidance_tour_progress enable row level security;

create policy guidance_articles_read on public.guidance_articles for select to authenticated using(
  active=true and (audience<>'platform' or public.is_platform_staff(array['platform_owner','platform_admin','seo_manager','support_manager','content_ops','viewer']))
);
create policy guidance_articles_platform_write on public.guidance_articles for all to authenticated using(public.is_platform_staff(array['platform_owner','platform_admin'])) with check(public.is_platform_staff(array['platform_owner','platform_admin']));

create policy guidance_tours_read on public.guidance_tours for select to authenticated using(
  active=true and (audience<>'platform' or public.is_platform_staff(array['platform_owner','platform_admin','seo_manager','support_manager','content_ops','viewer']))
);
create policy guidance_tours_platform_write on public.guidance_tours for all to authenticated using(public.is_platform_staff(array['platform_owner','platform_admin'])) with check(public.is_platform_staff(array['platform_owner','platform_admin']));

create policy guidance_preferences_own on public.guidance_user_preferences for all to authenticated using(user_id=auth.uid() and public.can_access_tenant(tenant_id,null)) with check(user_id=auth.uid() and public.can_access_tenant(tenant_id,null));
create policy guidance_progress_own on public.guidance_tour_progress for all to authenticated using(user_id=auth.uid() and public.can_access_tenant(tenant_id,null)) with check(user_id=auth.uid() and public.can_access_tenant(tenant_id,null));

insert into public.guidance_articles(article_key,area,route_prefix,audience,title_fa,summary_fa,body_fa,title_en,summary_en,body_en,keywords,related_help_keys,importance,sort_order) values
('getting-started.admin','getting-started','/admin','all','شروع کار با پنل','سریع‌ترین مسیر برای شناخت پنل بدون حفظ‌کردن منوها.','از منوی کناری برای حرکت بین بخش‌ها استفاده کنید. هرجا علامت ? دیدید، راهنمای همان عملیات را باز کنید. برای پیدا کردن یک بخش، از جستجوی منو یا مرکز راهنما استفاده کنید. تغییرات حساس قبل از اجرا تأیید می‌گیرند و نتیجه عملیات بعد از پاسخ سرور نمایش داده می‌شود.','Getting started with admin','The fastest way to understand the admin without memorising menus.','Use the sidebar to move between areas. Open the ? icon whenever you need contextual guidance. Use menu search or the Help Center to find a feature. Sensitive actions require confirmation and the server result is shown after completion.',array['شروع','پنل','منو','راهنما','getting started','admin'],array[]::text[],'standard',10),
('getting-started.content','content','/admin/pages','tenant','مدیریت محتوا','صفحه، پروژه و رسانه چگونه با هم کار می‌کنند؟','Pages ساختار صفحات سایت را نگه می‌دارد، Projects نمونه‌کارها را مدیریت می‌کند و Media Library محل فایل‌هاست. ابتدا فایل را در Media ثبت کنید و سپس در صفحه یا پروژه انتخابش کنید. Draft را قبل از Publish بررسی کنید.','Managing content','How pages, projects and media work together.','Pages hold site page structure, Projects manage case studies and Media Library stores assets. Upload media first, then select it from pages or projects. Review drafts before publishing.',array['صفحه','پروژه','رسانه','content','pages','projects','media'],array['projects.media','media.upload'],'standard',20),
('getting-started.seo','seo','/admin/seo','all','شروع سئو','فرق SEO دستی با Managed SEO و اتوماسیون چیست؟','هر سایت ابزارهای پایه برای ویرایش دستی Title و Meta Description دارد. اتوماسیون پیشرفته فقط برای سرویس Managed SEO و تیم مجاز RAVA فعال می‌شود. قبل از ذخیره خودکار، پیشنهادها باید قابل بررسی و Audit باشند.','Getting started with SEO','The difference between manual SEO, Managed SEO and automation.','Every site can manually edit core SEO fields. Advanced automation is available only for Managed SEO and authorised RAVA staff. Automated suggestions should remain reviewable and auditable.',array['سئو','seo','meta','managed seo','اتوماسیون'],array['seo.basics','seo.managed_service','seo.auto'],'important',30),
('getting-started.theme','appearance','/admin/appearance','tenant','شروع Theme Studio','ظاهر سایت را بدون دست‌زدن به محتوا تغییر دهید.','Theme Studio ظاهر را از محتوا جدا نگه می‌دارد. ابتدا Theme و Tokenها را به‌صورت Draft تغییر دهید، Preview کنید و فقط بعد از اطمینان Publish کنید. Revision قبلی برای بازگشت نگهداری می‌شود.','Getting started with Theme Studio','Change the site appearance without changing content.','Theme Studio keeps presentation separate from content. Edit theme and tokens as a draft, preview them, and publish only after review. Previous revisions remain available for recovery.',array['تم','قالب','رنگ','theme','appearance','design'],array['theme.switch','theme.publish'],'important',40),
('platform.owner.orientation','platform','/admin/platform','platform','راهنمای پنل مرکزی RAVA','این بخش بالاتر از پنل مشتری است و روی چند سایت اثر می‌گذارد.','Control Plane برای مدیریت Tenantها، تیم مرکزی، سرویس‌ها و وضعیت سایت‌هاست. عملیات سراسری یا تعلیق سایت حساس هستند؛ همیشه Tenant فعال، Scope نیرو و Audit را قبل از تأیید بررسی کنید.','RAVA Control Plane orientation','This layer sits above customer admin and can affect multiple sites.','Use the Control Plane to manage tenants, platform staff, services and site status. Cross-tenant and suspension actions are sensitive; verify active tenant, staff scope and audit context before confirmation.',array['platform','tenant','مشتری','کنترل پلین','owner'],array['tenant.active_context','tenant.status','tenant.isolation','platform.staff.scope'],'critical',50)
on conflict(article_key) do nothing;

insert into public.guidance_tours(tour_key,route_prefix,audience,title_fa,title_en,version,steps) values
('admin.first-run','/admin','all','تور سریع پنل','Admin quick tour',1,'[
 {"selector":".admin-sidebar","title_fa":"منوی اصلی","body_fa":"تمام بخش‌هایی که اجازه دسترسی دارید از اینجا در دسترس‌اند. جستجو هم داخل همین منوست.","title_en":"Main navigation","body_en":"All areas you are allowed to access live here, including menu search."},
 {"selector":".admin-app-content","title_fa":"فضای کاری","body_fa":"محتوای هر بخش اینجا باز می‌شود. عملیات حساس قبل از اجرا تأیید می‌گیرند.","title_en":"Workspace","body_en":"Each admin area opens here. Sensitive operations require confirmation before execution."},
 {"selector":"[data-guidance-dock]","title_fa":"راهنمای همیشه در دسترس","body_fa":"هر زمان گیج شدید، این دکمه راهنمای مرتبط با همان صفحه و جستجوی کل آموزش‌ها را باز می‌کند.","title_en":"Always-available help","body_en":"Open this whenever you need contextual help or want to search all guidance."}
]'::jsonb)
on conflict(tour_key) do nothing;
