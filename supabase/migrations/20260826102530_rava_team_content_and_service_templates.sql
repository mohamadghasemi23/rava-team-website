-- P4: additional versioned service templates for Customer Zero and future tenants.
revoke all on public.template_catalog,public.template_versions from anon;
revoke insert,update,delete,truncate,references,trigger on public.template_catalog,public.template_versions from authenticated;
grant select on public.template_catalog,public.template_versions to authenticated;
insert into public.template_catalog(key,name_fa,name_en,description_fa,description_en,industry_key,status,commercial_tier,is_public,metadata) values
('rava-service-editorial','ادیتوریال راوا','RAVA Service Editorial','قالب جسور و تایپوگرافیک برای استودیوها، آژانس‌ها و برندهای خلاق.','A bold, typographic service template for studios, agencies and creative brands.','services','active','core',true,'{"family":"services","visual_direction":"editorial","customer_zero_candidate":true,"starter":false}'::jsonb),
('rava-service-midnight','میدنایت راوا','RAVA Service Midnight','قالب تیره و فنی برای شرکت‌های فناوری، محصول و خدمات حرفه‌ای.','A dark technical template for technology, product and professional service companies.','services','active','premium',true,'{"family":"services","visual_direction":"technology","customer_zero_candidate":true,"starter":false}'::jsonb)
on conflict(key) do update set name_fa=excluded.name_fa,name_en=excluded.name_en,description_fa=excluded.description_fa,description_en=excluded.description_en,status=excluded.status,metadata=excluded.metadata,updated_at=now();

insert into public.template_versions(template_id,version,status,theme_defaults,layout_blueprint,seo_defaults,module_defaults,changelog_fa,changelog_en,published_at)
select t.id,1,'published','{"colors":{"paper":"#F2F0E8","ink":"#11130F","primary":"#5B7CFF","accent":"#C8FF45","highlight":"#FF7048"},"typography":{"heading":"editorial-sans","body":"system"},"radius":2,"spacing":"expressive","motion":"restrained"}'::jsonb,'{"header":"editorial","hero":"split-orbit","sections":["manifesto","services-index","systems-grid","founder-story","process","contact"],"footer":"studio"}'::jsonb,'{"schema":["Organization","ProfessionalService"],"indexable":true,"content_policy":"verified-facts-only"}'::jsonb,array['cms','media','seo_core','analytics_core','security','help']::text[],'نسخه نخست قالب ادیتوریال خدماتی','Initial editorial service template',now()
from public.template_catalog t where t.key='rava-service-editorial'
on conflict(template_id,version) do nothing;

insert into public.template_versions(template_id,version,status,theme_defaults,layout_blueprint,seo_defaults,module_defaults,changelog_fa,changelog_en,published_at)
select t.id,1,'published','{"colors":{"background":"#06101D","surface":"#0A1829","primary":"#2F8CFF","accent":"#A9D8FF","text":"#F6FBFF"},"typography":{"heading":"geometric-sans","body":"system"},"radius":24,"spacing":"comfortable","motion":"ambient"}'::jsonb,'{"header":"glass","hero":"signal-field","sections":["capabilities","platform","proof","process","contact"],"footer":"technology"}'::jsonb,'{"schema":["Organization","ProfessionalService","SoftwareApplication"],"indexable":true,"content_policy":"verified-facts-only"}'::jsonb,array['cms','media','seo_core','analytics_core','security','help']::text[],'نسخه نخست قالب تیره خدماتی','Initial midnight service template',now()
from public.template_catalog t where t.key='rava-service-midnight'
on conflict(template_id,version) do nothing;

insert into public.starter_pack_template_compatibility(starter_pack_version_id,template_version_id,recommended_modules,is_default,active)
select spv.id,tv.id,array['cms','media','seo_core','analytics_core','security','help']::text[],false,true
from public.starter_content_pack_versions spv
join public.starter_content_packs sp on sp.id=spv.starter_pack_id and sp.key='services.digital-agency.rava-team'
join public.template_catalog tc on tc.key in ('rava-service-editorial','rava-service-midnight')
join public.template_versions tv on tv.template_id=tc.id and tv.version=1 and tv.status='published'
where spv.version=1 and spv.status='published'
on conflict(starter_pack_version_id,template_version_id) do update set active=true,recommended_modules=excluded.recommended_modules;
