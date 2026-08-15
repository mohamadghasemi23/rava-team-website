-- RAVA Section Builder V1
-- Draft/Published section state + variant + responsive controls.
alter table public.page_blocks add column if not exists section_key text;
alter table public.page_blocks add column if not exists draft_data jsonb;
alter table public.page_blocks add column if not exists published_data jsonb;
alter table public.page_blocks add column if not exists draft_variant text not null default 'default';
alter table public.page_blocks add column if not exists published_variant text not null default 'default';
alter table public.page_blocks add column if not exists draft_responsive jsonb not null default '{"desktop":true,"tablet":true,"mobile":true}'::jsonb;
alter table public.page_blocks add column if not exists published_responsive jsonb not null default '{"desktop":true,"tablet":true,"mobile":true}'::jsonb;
alter table public.page_blocks add column if not exists published_at timestamptz;
alter table public.page_blocks add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.page_blocks set
 section_key=coalesce(section_key,block_type),
 draft_data=coalesce(draft_data,data,'{}'::jsonb),
 published_data=coalesce(published_data,data,'{}'::jsonb)
where section_key is null or draft_data is null or published_data is null;

create table if not exists public.section_definitions(
 section_key text primary key,
 category text not null,
 label_fa text not null,
 label_en text not null,
 description_fa text not null default '',
 description_en text not null default '',
 variants jsonb not null default '[]'::jsonb,
 required_feature text references public.feature_catalog(key) on delete set null,
 compatible_page_types text[] not null default '{}'::text[],
 status text not null default 'active' check(status in('active','deprecated','archived')),
 version int not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.section_definitions enable row level security;
create policy section_definitions_read on public.section_definitions for select using(status<>'archived');

insert into public.section_definitions(section_key,category,label_fa,label_en,description_fa,description_en,variants,required_feature,compatible_page_types) values
('hero','content','هیرو','Hero','شروع قدرتمند صفحه با عنوان، متن، رسانه و CTA.','Primary page introduction with copy, media and CTA.','["editorial","split","media","minimal"]',null,array['standard','service','case_study','product','collection','article','landing']),
('services','business','خدمات','Services','نمایش خدمات یا قابلیت‌های اصلی.','Service/capability presentation.','["cards","editorial","list","spotlight"]',null,array['standard','service','landing']),
('stats','proof','آمار و اعداد','Stats','اعداد کلیدی برای اعتمادسازی.','Key metrics and proof.','["inline","cards","large-numbers"]',null,array['standard','service','case_study','landing']),
('testimonials','proof','نظرات مشتریان','Testimonials','نظرات و تجربه مشتریان.','Customer testimonials and social proof.','["cards","quote","carousel"]',null,array['standard','service','product','landing']),
('faq','content','سوالات متداول','FAQ','پرسش و پاسخ ساختاریافته.','Structured frequently asked questions.','["accordion","split"]',null,array['standard','service','product','collection','article','landing']),
('gallery','media','گالری','Gallery','گالری تصویری انعطاف‌پذیر.','Flexible visual gallery.','["grid","masonry","immersive"]',null,array['standard','service','case_study','product','article']),
('video','media','ویدیو','Video','ویدیو با پوستر و متن همراه.','Video section with poster and supporting copy.','["cinematic","inline","full-bleed"]','portfolio.video',array['standard','service','case_study','product','article','landing']),
('team','business','تیم','Team','معرفی اعضای تیم.','Team member presentation.','["cards","editorial","compact"]',null,array['standard','service']),
('pricing','commerce','قیمت‌گذاری','Pricing','پلن‌ها و بسته‌های قیمت‌گذاری.','Plans and pricing packages.','["cards","comparison","featured"]',null,array['service','landing']),
('product-grid','commerce','محصولات','Product Grid','نمایش محصولات از کاتالوگ فروشگاه.','Commerce product grid.','["grid","editorial","compact"]','commerce.core',array['standard','collection','landing']),
('cta','conversion','دعوت به اقدام','CTA','دعوت واضح به اقدام بعدی.','Focused conversion call-to-action.','["clean","banner","immersive"]',null,array['standard','service','case_study','product','collection','article','landing']),
('contact','business','تماس','Contact','اطلاعات و مسیرهای تماس.','Contact details and action paths.','["split","minimal","card"]',null,array['standard','service','landing']),
('text','content','متن','Text','محتوای متنی عمومی.','General text content.','["editorial","wide","compact"]',null,array['standard','service','case_study','product','collection','article','landing']),
('image','media','تصویر','Image','تصویر تکی با Alt و Caption.','Single image with alt and caption.','["contained","wide","full-bleed"]',null,array['standard','service','case_study','product','article'])
on conflict(section_key) do update set category=excluded.category,label_fa=excluded.label_fa,label_en=excluded.label_en,description_fa=excluded.description_fa,description_en=excluded.description_en,variants=excluded.variants,required_feature=excluded.required_feature,compatible_page_types=excluded.compatible_page_types,status='active',updated_at=now();

create index if not exists page_blocks_tenant_page_position_idx on public.page_blocks(tenant_id,page_id,position);
