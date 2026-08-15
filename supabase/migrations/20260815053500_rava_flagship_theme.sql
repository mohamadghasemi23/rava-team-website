-- First production use of Theme Library: RAVA TEAM itself.
-- Keep this assignment tenant-specific; other customers remain contract/theme driven.
update public.theme_definitions
set name_fa='راوا سیگنچر',name_en='RAVA Signature',version='1.1.0',
 description_fa='تم پرچمدار راوا؛ دارک، سینمایی، تایپوگرافیک و مناسب استودیوهای خلاق و برندهای پریمیوم.',
 description_en='RAVA flagship theme: dark, cinematic, typography-led and built for premium creative brands.',
 default_tokens='{"color":{"background":"#05070b","surface":"#0d1118","text":"#f5f7fb","muted":"#8b94a5","accent":"#247cff","border":"rgba(255,255,255,.10)"},"radius":{"sm":10,"md":18,"lg":34},"layout":{"container":1320,"sectionGap":118},"motion":{"intensity":1.05},"typography":{"faFamily":"Vazirmatn","enFamily":"Space Grotesk","displayFamily":"Space Grotesk","baseSize":16,"scale":1.34,"lineHeight":1.78,"headingLineHeight":1.02,"weightBody":400,"weightHeading":700,"letterSpacing":-0.02}}'::jsonb,
 component_variants='{"header":"studio-01","hero":"editorial-01","portfolio":"asymmetric-01","footer":"statement-01","button":"pill-01"}'::jsonb,
 updated_at=now()
where theme_key='rava-creative-noir';

insert into public.tenant_theme_settings(tenant_id,theme_key,draft_tokens,published_tokens,draft_variants,published_variants,admin_skin_sync,published_at,updated_at)
select '00000000-0000-4000-8000-000000000001'::uuid,d.theme_key,d.default_tokens,d.default_tokens,d.component_variants,d.component_variants,true,now(),now()
from public.theme_definitions d where d.theme_key='rava-creative-noir'
on conflict(tenant_id) do update set
 theme_key=excluded.theme_key,
 draft_tokens=excluded.draft_tokens,
 published_tokens=excluded.published_tokens,
 draft_variants=excluded.draft_variants,
 published_variants=excluded.published_variants,
 admin_skin_sync=true,
 published_at=excluded.published_at,
 updated_at=excluded.updated_at;
