-- Shipping Pro quote + checkout V5. Quotes and final shipping totals are server-authoritative.
insert into public.feature_catalog(key,label_fa,label_en,category,commercial,description_fa,description_en) values
('shipping.pro','ارسال حرفه‌ای','Shipping Pro','commerce',true,'روش‌های ارسال، محدوده‌های جغرافیایی، قیمت‌گذاری و برآورد زمان تحویل','Shipping methods, geographic zones, pricing and delivery estimates')
on conflict(key) do update set label_fa=excluded.label_fa,label_en=excluded.label_en,category=excluded.category,commercial=excluded.commercial,description_fa=excluded.description_fa,description_en=excluded.description_en;

alter table public.product_variants add column if not exists shipping_weight_grams numeric(12,2) check(shipping_weight_grams is null or shipping_weight_grams>=0);
alter table public.shipping_methods add column if not exists price_per_kg numeric(18,4) not null default 0 check(price_per_kg>=0);

create or replace function public.shipping_quote(p_tenant uuid,p_items jsonb,p_customer jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 s public.shipping_settings%rowtype;i jsonb;v record;q int;subtotal numeric(18,4):=0;v_currency text;grams numeric(18,4):=0;weight_complete boolean:=true;
 country text:=upper(nullif(trim(coalesce(p_customer->>'country_code',p_customer->>'country','')),''));region text:=upper(nullif(trim(coalesce(p_customer->>'region_code',p_customer->>'state',p_customer->>'province','')),''));postal text:=upper(nullif(trim(coalesce(p_customer->>'postal_code','')),''));
 m record;zone_ok boolean;price numeric(18,4);out_methods jsonb:='[]'::jsonb;
begin
 if not public.has_entitlement(p_tenant,'commerce.core') or not public.has_entitlement(p_tenant,'shipping.pro') then return jsonb_build_object('enabled',false,'methods','[]'::jsonb);end if;
 select * into s from public.shipping_settings where tenant_id=p_tenant;if not found or not s.enabled then return jsonb_build_object('enabled',false,'methods','[]'::jsonb);end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise exception 'invalid_items';end if;
 for i in select * from jsonb_array_elements(p_items) loop
   begin q=(i->>'quantity')::int;exception when others then raise exception 'invalid_quantity';end;if q<1 or q>99 then raise exception 'invalid_quantity';end if;
   select pv.id,pv.price,pv.currency,pv.shipping_weight_grams into v from public.product_variants pv join public.products p on p.id=pv.product_id and p.tenant_id=p_tenant and p.status='active' where pv.id=(i->>'variantId')::uuid and pv.tenant_id=p_tenant;
   if not found then raise exception 'invalid_variant';end if;if v_currency is null then v_currency=v.currency;elsif v_currency<>v.currency then raise exception 'mixed_currency';end if;
   subtotal:=subtotal+(v.price*q);if v.shipping_weight_grams is null then weight_complete:=false;else grams:=grams+(v.shipping_weight_grams*q);end if;
 end loop;
 for m in select sm.* from public.shipping_methods sm where sm.tenant_id=p_tenant and sm.enabled=true and upper(sm.currency)=upper(coalesce(v_currency,s.default_currency)) and (sm.min_order is null or subtotal>=sm.min_order) and (sm.max_order is null or subtotal<=sm.max_order) order by sm.sort_order,sm.id loop
   if exists(select 1 from public.shipping_method_zones mz where mz.tenant_id=p_tenant and mz.method_id=m.id) then
     select exists(select 1 from public.shipping_method_zones mz join public.shipping_zones z on z.id=mz.zone_id and z.tenant_id=p_tenant and z.enabled=true where mz.tenant_id=p_tenant and mz.method_id=m.id and (cardinality(z.countries)=0 or country=any(z.countries)) and (cardinality(z.regions)=0 or region=any(z.regions)) and (cardinality(z.postal_prefixes)=0 or exists(select 1 from unnest(z.postal_prefixes) pref where postal like upper(pref)||'%'))) into zone_ok;
   else zone_ok:=true;end if;
   if not zone_ok then continue;end if;
   if m.pricing_type='weight' and not weight_complete then continue;end if;
   if m.pricing_type='free' then price:=0;
   elsif m.pricing_type='weight' then price:=m.base_price+ceil(grams/1000.0)*m.price_per_kg;
   else price:=m.base_price;end if;
   if (s.free_shipping_threshold is not null and subtotal>=s.free_shipping_threshold) or (m.free_over is not null and subtotal>=m.free_over) then price:=0;end if;
   price:=greatest(0,round(price,4));
   out_methods:=out_methods||jsonb_build_array(jsonb_build_object('id',m.id,'code',m.code,'name_fa',m.name_fa,'name_en',m.name_en,'price',price,'currency',v_currency,'estimated_min_days',m.estimated_min_days,'estimated_max_days',m.estimated_max_days));
 end loop;
 return jsonb_build_object('enabled',true,'currency',v_currency,'subtotal',subtotal,'destination',jsonb_build_object('country',country,'region',region,'postal_code',postal),'weight_grams',case when weight_complete then grams else null end,'methods',out_methods);
end$$;
revoke all on function public.shipping_quote(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.shipping_quote(uuid,jsonb,jsonb) to service_role;

create or replace function public.create_storefront_order_v5(p_tenant uuid,p_items jsonb,p_customer jsonb,p_ip_hash text,p_request_key uuid,p_coupon_code text default null,p_shipping_method uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 quote jsonb;shipping_enabled boolean;chosen jsonb;ship numeric(18,4):=0;v_result jsonb;v_order uuid;o public.orders%rowtype;t public.tax_settings%rowtype;tax_base numeric(18,4);tax_amount numeric(18,4):=0;existing_method text;
begin
 quote:=public.shipping_quote(p_tenant,p_items,p_customer);shipping_enabled:=coalesce((quote->>'enabled')::boolean,false);
 if shipping_enabled then
   if p_shipping_method is null then raise exception 'shipping_method_required';end if;
   select x into chosen from jsonb_array_elements(quote->'methods') x where x->>'id'=p_shipping_method::text limit 1;
   if chosen is null then raise exception 'shipping_method_unavailable';end if;ship:=coalesce((chosen->>'price')::numeric,0);
 end if;
 v_result:=public.create_storefront_order_v4(p_tenant,p_items,p_customer,p_ip_hash,p_request_key,p_coupon_code);v_order:=(v_result->>'order_id')::uuid;
 select * into o from public.orders where id=v_order and tenant_id=p_tenant for update;if not found then raise exception 'order_not_found';end if;
 if coalesce((o.metadata->>'shipping_evaluated')::boolean,false) then
   existing_method:=nullif(o.metadata->>'shipping_method_id','');
   if coalesce(existing_method,'')<>coalesce(p_shipping_method::text,'') then raise exception 'idempotency_conflict';end if;
 else
   update public.orders set shipping_total=case when shipping_enabled then ship else 0 end,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('shipping_evaluated',true,'shipping_enabled',shipping_enabled,'shipping_method_id',case when shipping_enabled then p_shipping_method::text else null end,'shipping_quote',case when shipping_enabled then chosen else null end),updated_at=now() where id=v_order and tenant_id=p_tenant returning * into o;
 end if;
 select * into t from public.tax_settings where tenant_id=p_tenant;
 if found and t.enabled and t.rate>0 then
   tax_base:=greatest(0,(o.subtotal-o.discount_total)+case when t.apply_to_shipping then o.shipping_total else 0 end);
   if t.mode='exclusive' then tax_amount:=round(tax_base*(t.rate/100),4);update public.orders set tax_total=tax_amount,grand_total=greatest(0,(subtotal-discount_total)+shipping_total+tax_amount),updated_at=now() where id=v_order and tenant_id=p_tenant returning * into o;
   else tax_amount:=round(tax_base-(tax_base/(1+(t.rate/100))),4);update public.orders set tax_total=tax_amount,grand_total=greatest(0,(subtotal-discount_total)+shipping_total),updated_at=now() where id=v_order and tenant_id=p_tenant returning * into o;end if;
 else update public.orders set tax_total=0,grand_total=greatest(0,(subtotal-discount_total)+shipping_total),updated_at=now() where id=v_order and tenant_id=p_tenant returning * into o;end if;
 return jsonb_build_object('order_id',v_order,'subtotal',o.subtotal,'discount',o.discount_total,'shipping',o.shipping_total,'tax',o.tax_total,'total',o.grand_total,'currency',o.currency,'payment_status',o.payment_status,'reservation_expires_at',o.metadata->>'inventory_reserved_until','shipping_method',o.metadata->'shipping_quote','tax_settings',o.metadata->'tax');
end$$;
revoke all on function public.create_storefront_order_v5(uuid,jsonb,jsonb,text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.create_storefront_order_v5(uuid,jsonb,jsonb,text,uuid,text,uuid) to service_role;
