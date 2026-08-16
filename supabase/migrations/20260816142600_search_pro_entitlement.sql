-- Search Basic ships with Commerce Core. Search Pro is a separately contracted entitlement.
insert into public.feature_catalog(feature_key,title_fa,title_en,description_fa,description_en,category,default_enabled) values
('search.pro','جستجوی حرفه‌ای','Search Pro','Autocomplete پیشرفته، تحلیل جستجو، عبارات بدون نتیجه، قوانین رتبه‌بندی، مترادف‌ها و پیشنهاد محصول.','Advanced autocomplete, search analytics, zero-result insights, ranking rules, synonyms and product recommendations.','commerce',false)
on conflict(feature_key) do update set title_fa=excluded.title_fa,title_en=excluded.title_en,description_fa=excluded.description_fa,description_en=excluded.description_en,category=excluded.category,default_enabled=false;

create or replace function public.record_product_search(p_tenant uuid,p_query text,p_result_count integer,p_category text default null,p_min_price numeric default null,p_max_price numeric default null,p_in_stock boolean default null,p_sort text default null) returns void language plpgsql security definer set search_path=public as $$ begin
 if not public.has_entitlement(p_tenant,'search.pro') then return;end if;
 if length(trim(coalesce(p_query,'')))<2 then return;end if;
 insert into public.product_search_events(tenant_id,query,result_count,category_slug,min_price,max_price,in_stock,sort_key) values(p_tenant,left(trim(p_query),120),greatest(0,p_result_count),left(p_category,120),p_min_price,p_max_price,p_in_stock,left(p_sort,30));
end $$;

create or replace function public.public_product_search_suggestions(p_tenant uuid,p_query text,p_limit integer default 8) returns table(slug text,name text,category_name text)
language plpgsql stable security definer set search_path=public as $$ begin
 if not public.has_entitlement(p_tenant,'search.pro') then return;end if;
 return query select p.slug,p.name,c.name from public.products p left join public.product_categories c on c.id=p.category_id where p.tenant_id=p_tenant and p.status='active' and length(trim(coalesce(p_query,'')))>=2 and (p.name ilike '%'||trim(p_query)||'%' or similarity(p.name,trim(p_query))>.15) order by similarity(p.name,trim(p_query)) desc,p.name limit greatest(1,least(p_limit,12));
end $$;

insert into public.admin_help_items(help_key,title_fa,body_fa,warning_fa,title_en,body_en,warning_en,active) values
('search.basic','جستجوی پایه فروشگاه','جستجوی محصول، فیلتر دسته، قیمت و موجودی و مرتب‌سازی پایه همراه Commerce Core است و برای فروشگاه فعال قفل نمی‌شود.',null,'Store search basics','Product search, category/price/stock filters and basic sorting are included with Commerce Core and are not separately locked for an active store.',null,true),
('search.pro','Search Pro قراردادی','Autocomplete پیشرفته، Search Analytics، گزارش عبارت‌های بدون نتیجه، Synonym، Ranking/Merchandising Rules و پیشنهادهای هوشمند جزو Search Pro هستند و فقط با فعال‌سازی قراردادی توسط مدیر پلتفرم در دسترس قرار می‌گیرند.','فعال‌کردن ظاهری در UI کافی نیست؛ قابلیت‌های Pro باید در لایه سرور/دیتابیس هم Entitlement را بررسی کنند.','Contractual Search Pro','Advanced autocomplete, search analytics, zero-result reporting, synonyms, ranking/merchandising rules and intelligent recommendations belong to Search Pro and require contractual platform entitlement.','UI visibility is not sufficient; Pro capabilities must enforce entitlement at the server/database boundary.',true)
on conflict(help_key) do update set title_fa=excluded.title_fa,body_fa=excluded.body_fa,warning_fa=excluded.warning_fa,title_en=excluded.title_en,body_en=excluded.body_en,warning_en=excluded.warning_en,active=true;
