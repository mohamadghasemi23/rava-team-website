-- Promotion-aware checkout V3. Builds on the hardened/idempotent V2 order creator and applies promotions in the same DB transaction.
create or replace function public.create_storefront_order_v3(p_tenant uuid,p_items jsonb,p_customer jsonb,p_ip_hash text,p_request_key uuid,p_coupon_code text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_result jsonb;v_order uuid;v_order_row public.orders%rowtype;v_p public.promotions%rowtype;v_usage int;v_customer_usage int;v_customer_key text;v_remaining numeric(18,4);v_shipping numeric(18,4);v_discount numeric(18,4):=0;v_amount numeric(18,4);v_target_ok boolean;v_applied jsonb:='[]'::jsonb;v_coupon text:=nullif(upper(trim(coalesce(p_coupon_code,''))), '');v_coupon_seen boolean:=false;v_coupon_applied boolean:=false;v_existing_coupon text;v_already_evaluated boolean:=false;
begin
 if v_coupon is not null and (length(v_coupon)>64 or v_coupon!~'^[A-Z0-9_-]+$') then raise exception 'invalid_coupon';end if;
 v_result:=public.create_storefront_order_v2(p_tenant,p_items,p_customer,p_ip_hash,p_request_key);
 v_order:=(v_result->>'order_id')::uuid;
 select * into v_order_row from public.orders where id=v_order and tenant_id=p_tenant for update;if not found then raise exception 'order_not_found';end if;
 v_already_evaluated:=coalesce((v_order_row.metadata->>'promotion_evaluated')::boolean,false);v_existing_coupon:=nullif(upper(coalesce(v_order_row.metadata->>'coupon_code','')),'');
 if v_already_evaluated then
   if coalesce(v_existing_coupon,'')<>coalesce(v_coupon,'') then raise exception 'idempotency_conflict';end if;
   return jsonb_build_object('order_id',v_order,'subtotal',v_order_row.subtotal,'discount',v_order_row.discount_total,'shipping',v_order_row.shipping_total,'tax',v_order_row.tax_total,'total',v_order_row.grand_total,'currency',v_order_row.currency,'payment_status',v_order_row.payment_status,'reservation_expires_at',v_order_row.metadata->>'inventory_reserved_until');
 end if;
 v_customer_key:=md5(lower(coalesce(nullif(p_customer->>'email',''),nullif(p_customer->>'phone',''),p_ip_hash)));
 v_remaining:=coalesce(v_order_row.subtotal,0);v_shipping:=coalesce(v_order_row.shipping_total,0);
 for v_p in
   select * from public.promotions p
   where p.tenant_id=p_tenant and p.status='active' and (p.starts_at is null or p.starts_at<=now()) and (p.ends_at is null or p.ends_at>now())
     and (p.automatic=true or (v_coupon is not null and p.code is not null and upper(p.code)=v_coupon))
   order by p.priority asc,p.id asc
   for update
 loop
   if v_coupon is not null and v_p.code is not null and upper(v_p.code)=v_coupon then v_coupon_seen:=true;end if;
   if v_remaining<coalesce(v_p.min_subtotal,0) then continue;end if;
   if v_p.kind='fixed_amount' and v_p.currency is not null and upper(v_p.currency)<>upper(v_order_row.currency) then continue;end if;
   select count(*) into v_usage from public.promotion_redemptions where tenant_id=p_tenant and promotion_id=v_p.id;
   if v_p.usage_limit is not null and v_usage>=v_p.usage_limit then continue;end if;
   if v_p.per_customer_limit is not null then select count(*) into v_customer_usage from public.promotion_redemptions where tenant_id=p_tenant and promotion_id=v_p.id and customer_key=v_customer_key;if v_customer_usage>=v_p.per_customer_limit then continue;end if;
   if not exists(select 1 from public.promotion_targets t where t.promotion_id=v_p.id) then v_target_ok:=true;
   else
     select exists(
       select 1 from public.promotion_targets t
       where t.promotion_id=v_p.id and t.tenant_id=p_tenant and (
         t.target_type='all' or
         (t.target_type='product' and exists(select 1 from public.order_items oi where oi.order_id=v_order and oi.tenant_id=p_tenant and oi.product_id=t.target_id)) or
         (t.target_type='variant' and exists(select 1 from public.order_items oi where oi.order_id=v_order and oi.tenant_id=p_tenant and oi.variant_id=t.target_id)) or
         (t.target_type='category' and exists(select 1 from public.order_items oi join public.products pr on pr.id=oi.product_id and pr.tenant_id=p_tenant where oi.order_id=v_order and oi.tenant_id=p_tenant and pr.category_id=t.target_id))
       )
     ) into v_target_ok;
   end if;
   if not v_target_ok then continue;end if;
   if v_p.kind='percentage' then v_amount:=v_remaining*(v_p.value/100);
   elsif v_p.kind='fixed_amount' then v_amount:=least(v_remaining,v_p.value);
   elsif v_p.kind='free_shipping' then v_amount:=v_shipping;
   else continue;end if;
   if v_p.max_discount is not null then v_amount:=least(v_amount,v_p.max_discount);end if;v_amount:=greatest(0,round(v_amount,4));if v_amount<=0 then continue;end if;
   if v_p.kind='free_shipping' then v_shipping:=greatest(0,v_shipping-v_amount);else v_remaining:=greatest(0,v_remaining-v_amount);end if;
   v_discount:=v_discount+v_amount;
   insert into public.promotion_redemptions(tenant_id,promotion_id,order_id,customer_key,discount_amount,currency) values(p_tenant,v_p.id,v_order,v_customer_key,v_amount,v_order_row.currency) on conflict(promotion_id,order_id) do nothing;
   v_applied:=v_applied||jsonb_build_array(jsonb_build_object('promotion_id',v_p.id,'name',v_p.name,'amount',v_amount,'kind',v_p.kind));
   if v_coupon is not null and v_p.code is not null and upper(v_p.code)=v_coupon then v_coupon_applied:=true;end if;
   if not v_p.stackable then exit;end if;
 end loop;
 if v_coupon is not null and (not v_coupon_seen or not v_coupon_applied) then raise exception 'coupon_not_eligible';end if;
 update public.orders set discount_total=v_discount,shipping_total=v_shipping,grand_total=greatest(0,v_remaining+v_shipping+coalesce(tax_total,0)),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('promotion_evaluated',true,'coupon_code',v_coupon,'applied_promotions',v_applied),updated_at=now() where id=v_order and tenant_id=p_tenant returning * into v_order_row;
 return jsonb_build_object('order_id',v_order,'subtotal',v_order_row.subtotal,'discount',v_order_row.discount_total,'shipping',v_order_row.shipping_total,'tax',v_order_row.tax_total,'total',v_order_row.grand_total,'currency',v_order_row.currency,'payment_status',v_order_row.payment_status,'reservation_expires_at',v_order_row.metadata->>'inventory_reserved_until','promotions',v_applied);
end$$;
revoke all on function public.create_storefront_order_v3(uuid,jsonb,jsonb,text,uuid,text) from public,anon,authenticated;
grant execute on function public.create_storefront_order_v3(uuid,jsonb,jsonb,text,uuid,text) to service_role;
