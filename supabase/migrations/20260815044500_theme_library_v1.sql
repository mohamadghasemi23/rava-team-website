-- RAVA Theme Library v1: four extensible families.
insert into public.theme_definitions(theme_key,name_fa,name_en,version,status,description_fa,description_en,default_tokens,component_variants,compatibility)
values
('rava-creative-noir','کریتیو نوآر','Creative Noir','1.0.0','active','برای استودیوهای خلاق، موزیک، فشن و پورتفولیوهای تصویرمحور.','For creative studios, music, fashion and image-led portfolios.',
'{"color":{"background":"#07080b","surface":"#101216","text":"#f5f5f2","muted":"#92959d","accent":"#7c5cff","border":"rgba(255,255,255,.10)"},"radius":{"sm":10,"md":18,"lg":34},"layout":{"container":1280,"sectionGap":112},"motion":{"intensity":1.15},"typography":{"faFamily":"Vazirmatn","enFamily":"Space Grotesk","displayFamily":"Space Grotesk","baseSize":16,"scale":1.34,"lineHeight":1.75,"headingLineHeight":1.02,"weightBody":400,"weightHeading":700,"letterSpacing":-0.02}}'::jsonb,
'{"header":"studio-01","hero":"editorial-01","portfolio":"asymmetric-01","footer":"statement-01","button":"pill-01"}'::jsonb,
'{"family":"creative","siteArchetypes":["portfolio","hybrid"],"modules":["portfolio","services"]}'::jsonb),
('rava-service-calm','سرویس کالم','Service Calm','1.0.0','active','برای شرکت‌های خدماتی، معماری، مشاوره و برندهای مینیمال.','For services, architecture, consulting and calm premium brands.',
'{"color":{"background":"#f2f0ea","surface":"#fbfaf6","text":"#191b1f","muted":"#74766f","accent":"#315d55","border":"rgba(25,27,31,.12)"},"radius":{"sm":8,"md":16,"lg":26},"layout":{"container":1180,"sectionGap":96},"motion":{"intensity":0.7},"typography":{"faFamily":"Vazirmatn","enFamily":"Manrope","displayFamily":"Manrope","baseSize":16,"scale":1.26,"lineHeight":1.85,"headingLineHeight":1.12,"weightBody":400,"weightHeading":650,"letterSpacing":0}}'::jsonb,
'{"header":"minimal-01","hero":"split-01","portfolio":"grid-01","footer":"statement-01","button":"soft-01"}'::jsonb,
'{"family":"service","siteArchetypes":["service","hybrid"],"modules":["services","portfolio"]}'::jsonb),
('rava-corporate-axis','کورپوریت اکسیس','Corporate Axis','1.0.0','active','برای شرکت‌ها، B2B، هلدینگ‌ها و سایت‌های رسمی نتیجه‌محور.','For B2B, enterprise and proof-driven corporate websites.',
'{"color":{"background":"#f6f8fb","surface":"#ffffff","text":"#0f172a","muted":"#64748b","accent":"#175cd3","border":"rgba(15,23,42,.11)"},"radius":{"sm":6,"md":10,"lg":18},"layout":{"container":1320,"sectionGap":88},"motion":{"intensity":0.55},"typography":{"faFamily":"Vazirmatn","enFamily":"Inter","displayFamily":"Inter","baseSize":16,"scale":1.22,"lineHeight":1.7,"headingLineHeight":1.16,"weightBody":400,"weightHeading":700,"letterSpacing":-0.01}}'::jsonb,
'{"header":"corporate-01","hero":"proof-01","portfolio":"case-study-01","footer":"corporate-01","button":"solid-01"}'::jsonb,
'{"family":"corporate","siteArchetypes":["service","corporate","hybrid"],"modules":["services","portfolio","analytics"]}'::jsonb),
('rava-commerce-flow','کامرس فلو','Commerce Flow','1.0.0','active','برای فروشگاه‌های برند، فروش آنلاین و معماری آماده Marketplace.','For brand stores, online retail and marketplace-ready commerce.',
'{"color":{"background":"#f7f7f8","surface":"#ffffff","text":"#17181b","muted":"#71757d","accent":"#e5481d","border":"rgba(23,24,27,.10)"},"radius":{"sm":8,"md":14,"lg":22},"layout":{"container":1440,"sectionGap":72},"motion":{"intensity":0.7},"typography":{"faFamily":"Vazirmatn","enFamily":"Inter","displayFamily":"Inter","baseSize":15,"scale":1.2,"lineHeight":1.7,"headingLineHeight":1.16,"weightBody":400,"weightHeading":700,"letterSpacing":0}}'::jsonb,
'{"header":"commerce-01","hero":"commerce-01","portfolio":"product-grid-01","footer":"commerce-01","button":"commerce-01"}'::jsonb,
'{"family":"commerce","siteArchetypes":["commerce","hybrid"],"modules":["catalog","inventory","cart","checkout","orders","payments","customers","discounts","shipping"],"marketplaceReady":true}'::jsonb)
on conflict(theme_key) do update set
 name_fa=excluded.name_fa,name_en=excluded.name_en,version=excluded.version,status=excluded.status,
 description_fa=excluded.description_fa,description_en=excluded.description_en,default_tokens=excluded.default_tokens,
 component_variants=excluded.component_variants,compatibility=excluded.compatibility,updated_at=now();
