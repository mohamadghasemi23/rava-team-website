-- Promotion + Tax aware checkout V4. Tax is calculated server-side after discounts/shipping.
create or replace function public.create_storefront_order_v4(p_tenant uuid,p_items jsonb,p_customer jsonb,p_ip_hash text,p_request_key uuid,p_coupon_code text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_result jsonb;v_order uuid;v_o public.orders%rowtype;v_tax public.tax_settings%rowtype;v_tax_base numeric(18,4);v_tax_amount numeric(18,4):=0;
begin
 v_result:=public.create_storefront_order_v3(p_tenant,p_items,p_customer,p_ip_hash,p_request_key,p_coupon_code);
 v_order:=(v_result->>'order_id')::uuid;
 select * into v_o from public.orders where id=v_order and tenant_id=p_tenant for update;if not found then raise exception 'order_not_found';end if;
 select * into v_tax from public.tax_settings where tenant_id=p_tenant;
 if found and v_tax.enabled and v_tax.rate>0 then
   if v_tax.mode='exclusive' then
     v_tax_base:=greatest(0,(v_o.subtotal-v_o.discount_total)+case when v_tax.apply_to_shipping then v_o.shipping_total else 0 end);
     v_tax_amount:=round(v_tax_base*(v_tax.rate/100),4);
     update public.orders set tax_total=v_tax_amount,grand_total=greatest(0,(subtotal-discount_total)+shipping_total+v_tax_amount),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('tax',jsonb_build_object('enabled',true,'mode',v_tax.mode,'rate',v_tax.rate,'apply_to_shipping',v_tax.apply_to_shipping,'label_fa',v_tax.label_fa,'label_en',v_tax.label_en)),updated_at=now() where id=v_order and tenant_id=p_tenant returning * into v_o;
   else
     v_tax_base:=greatest(0,(v_o.subtotal-v_o.discount_total)+case when v_tax.apply_to_shipping then v_o.shipping_total else 0 end);
     v_tax_amount:=round(v_tax_base-(v_tax_base/(1+(v_tax.rate/100))),4);
     update public.orders set tax_total=v_tax_amount,grand_total=greatest(0,(subtotal-discount_total)+shipping_total),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('tax',jsonb_build_object('enabled',true,'mode',v_tax.mode,'rate',v_tax.rate,'apply_to_shipping',v_tax.apply_to_shipping,'label_fa',v_tax.label_fa,'label_en',v_tax.label_en)),updated_at=now() where id=v_order and tenant_id=p_tenant returning * into v_o;
   end if;
 else
   update public.orders set tax_total=0,grand_total=greatest(0,(subtotal-discount_total)+shipping_total),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('tax',jsonb_build_object('enabled',false)),updated_at=now() where id=v_order and tenant_id=p_tenant returning * into v_o;
 end if;
 return jsonb_build_object('order_id',v_order,'subtotal',v_o.subtotal,'discount',v_o.discount_total,'shipping',v_o.shipping_total,'tax',v_o.tax_total,'total',v_o.grand_total,'currency',v_o.currency,'payment_status',v_o.payment_status,'reservation_expires_at',v_o.metadata->>'inventory_reserved_until','tax_settings',v_o.metadata->'tax');
end$$;
revoke all on function public.create_storefront_order_v4(uuid,jsonb,jsonb,text,uuid,text) from public,anon,authenticated;
grant execute on function public.create_storefront_order_v4(uuid,jsonb,jsonb,text,uuid,text) to service_role;
