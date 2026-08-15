-- Smart Start demo seeding. Security definer is guarded by tenant access + paid entitlements.
alter table public.discount_codes add column if not exists demo_batch_id uuid references public.starter_demo_batches(id) on delete set null;
alter table public.starter_demo_batches drop constraint if exists starter_demo_batches_tenant_id_kind_status_key;
create unique index if not exists starter_demo_one_active_kind_uq on public.starter_demo_batches(tenant_id,kind) where status='active';

create or replace function public.seed_commerce_demo(p_tenant uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  commerce_batch uuid; inventory_batch uuid; procurement_batch uuid;
  cat_id uuid; p1 uuid; p2 uuid; v1 uuid; v2 uuid; loc_id uuid; supplier_id uuid; po_id uuid;
  has_inventory boolean:=false; has_procurement boolean:=false;
begin
  if auth.uid() is null or not public.can_access_tenant(p_tenant,array['super_admin','admin']::public.role_key[]) then raise exception 'forbidden'; end if;
  if not public.has_entitlement(p_tenant,'commerce.core') then return jsonb_build_object('commerce',false,'reason','entitlement_required'); end if;
  if exists(select 1 from public.starter_demo_batches where tenant_id=p_tenant and kind='commerce' and status='active') then
    return jsonb_build_object('commerce',true,'alreadySeeded',true,'inventory',public.has_entitlement(p_tenant,'inventory.pro'),'procurement',public.has_entitlement(p_tenant,'procurement.pro'));
  end if;
  insert into public.starter_demo_batches(tenant_id,kind,created_by) values(p_tenant,'commerce',auth.uid()) returning id into commerce_batch;
  insert into public.product_categories(tenant_id,name,slug,sort_order,metadata,demo_batch_id)
    values(p_tenant,'محصولات نمونه','demo-products',900,jsonb_build_object('_demo',true,'label','داده نمونه'),commerce_batch) returning id into cat_id;
  insert into public.products(tenant_id,category_id,name,slug,description,status,product_type,metadata,demo_batch_id)
    values(p_tenant,cat_id,'محصول نمونه کلاسیک','demo-classic-product','این محصول فقط برای آموزش پنل فروشگاه ساخته شده است.','active','physical',jsonb_build_object('_demo',true,'cover_url',''),commerce_batch) returning id into p1;
  insert into public.products(tenant_id,category_id,name,slug,description,status,product_type,metadata,demo_batch_id)
    values(p_tenant,cat_id,'محصول نمونه پریمیوم','demo-premium-product','نمونه دوم برای نمایش قیمت، موجودی، Review و Checkout.','active','physical',jsonb_build_object('_demo',true,'cover_url',''),commerce_batch) returning id into p2;
  insert into public.product_variants(tenant_id,product_id,sku,title,price,compare_at_price,currency,inventory_quantity,attributes,metadata,demo_batch_id)
    values(p_tenant,p1,'DEMO-001','پیش‌فرض',1250000,1450000,'IRR',30,'{}',jsonb_build_object('_demo',true),commerce_batch) returning id into v1;
  insert into public.product_variants(tenant_id,product_id,sku,title,price,currency,inventory_quantity,attributes,metadata,demo_batch_id)
    values(p_tenant,p2,'DEMO-002','پیش‌فرض',2380000,'IRR',12,'{}',jsonb_build_object('_demo',true),commerce_batch) returning id into v2;
  insert into public.discount_codes(tenant_id,code,type,value,status,rules,demo_batch_id)
    values(p_tenant,'DEMO10','percent',10,'active',jsonb_build_object('_demo',true,'description','کد تخفیف آموزشی'),commerce_batch)
    on conflict(tenant_id,code) do nothing;
  insert into public.product_reviews(tenant_id,product_id,reviewer_name,rating,title,body,verified_purchase,status,helpful_count,published_at,demo_batch_id)
    values(p_tenant,p1,'مشتری نمونه',5,'تجربه نمونه','این Review فقط برای نمایش و آموزش سیستم نظرات است.',false,'published',3,now(),commerce_batch),
          (p_tenant,p2,'کاربر آزمایشی',4,'نظر آموزشی','ظاهر و تجربه محصول خوب بود. این داده در آمار واقعی محاسبه نمی‌شود.',false,'published',1,now(),commerce_batch);
  -- One demo order illustrates order management but remains excluded from real reports by demo_batch_id.
  insert into public.orders(tenant_id,status,payment_status,fulfillment_status,currency,subtotal,grand_total,customer_snapshot,shipping_address,metadata,demo_batch_id)
    values(p_tenant,'confirmed','paid','unfulfilled','IRR',1250000,1250000,jsonb_build_object('full_name','مشتری نمونه','phone','09120000000'),jsonb_build_object('city','شیراز','address','آدرس آموزشی'),jsonb_build_object('_demo',true),commerce_batch)
    returning id into po_id;
  insert into public.order_items(tenant_id,order_id,product_id,variant_id,title,sku,quantity,unit_price,line_total,snapshot,demo_batch_id)
    values(p_tenant,po_id,p1,v1,'محصول نمونه کلاسیک','DEMO-001',1,1250000,1250000,jsonb_build_object('_demo',true),commerce_batch);

  has_inventory:=public.has_entitlement(p_tenant,'inventory.pro');
  if has_inventory then
    insert into public.starter_demo_batches(tenant_id,kind,created_by) values(p_tenant,'inventory',auth.uid()) returning id into inventory_batch;
    insert into public.inventory_locations(tenant_id,name,code,address,active,is_default,demo_batch_id)
      values(p_tenant,'انبار نمونه مرکزی','DEMO-MAIN',jsonb_build_object('city','شیراز','note','آموزشی'),true,true,inventory_batch) returning id into loc_id;
    insert into public.inventory_balances(tenant_id,location_id,product_id,on_hand,reserved,reorder_point,demo_batch_id)
      values(p_tenant,loc_id,p1,30,4,5,inventory_batch),(p_tenant,loc_id,p2,12,2,4,inventory_batch);
    insert into public.inventory_ledger(tenant_id,location_id,product_id,movement_type,quantity_delta,reason,actor_user_id,demo_batch_id)
      values(p_tenant,loc_id,p1,'receipt',32,'ورود نمونه آموزشی',auth.uid(),inventory_batch),
            (p_tenant,loc_id,p1,'sale',-2,'فروش نمونه آموزشی',auth.uid(),inventory_batch),
            (p_tenant,loc_id,p2,'receipt',12,'ورود نمونه آموزشی',auth.uid(),inventory_batch);
  end if;

  has_procurement:=has_inventory and public.has_entitlement(p_tenant,'procurement.pro');
  if has_procurement then
    insert into public.starter_demo_batches(tenant_id,kind,created_by) values(p_tenant,'procurement',auth.uid()) returning id into procurement_batch;
    insert into public.suppliers(tenant_id,name,code,contact_name,phone,payment_terms,notes,demo_batch_id)
      values(p_tenant,'تأمین‌کننده نمونه RAVA','DEMO-SUP','مدیر نمونه','09120000001','نقدی','فقط برای آموزش',procurement_batch) returning id into supplier_id;
    insert into public.purchase_orders(tenant_id,supplier_id,location_id,status,currency,subtotal,grand_total,ordered_at,notes,created_by,demo_batch_id)
      values(p_tenant,supplier_id,loc_id,'submitted','IRR',10000000,10000000,now(),'سفارش خرید آموزشی',auth.uid(),procurement_batch) returning id into po_id;
    insert into public.purchase_order_items(purchase_order_id,tenant_id,product_id,ordered_quantity,received_quantity,damaged_quantity,unit_cost,line_total,notes,demo_batch_id)
      values(po_id,p_tenant,p1,10,0,0,700000,7000000,'آیتم نمونه',procurement_batch),(po_id,p_tenant,p2,5,0,0,600000,3000000,'آیتم نمونه',procurement_batch);
  end if;
  return jsonb_build_object('commerce',true,'inventory',has_inventory,'procurement',has_procurement,'alreadySeeded',false);
end $$;

create or replace function public.cleanup_commerce_demo(p_tenant uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare n int:=0;
begin
  if auth.uid() is null or not public.can_access_tenant(p_tenant,array['super_admin','admin']::public.role_key[]) then raise exception 'forbidden'; end if;
  -- Delete children/financial examples first. Only rows carrying an active demo batch can be touched.
  delete from public.purchase_order_items where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.purchase_orders where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.suppliers where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.inventory_ledger where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.inventory_balances where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.inventory_locations where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.product_reviews where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.order_items where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.orders where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.discount_codes where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.product_variants where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.products where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  delete from public.product_categories where tenant_id=p_tenant and demo_batch_id in(select id from public.starter_demo_batches where tenant_id=p_tenant and status='active');
  update public.starter_demo_batches set status='cleaned',cleaned_at=now() where tenant_id=p_tenant and status='active'; get diagnostics n=row_count;
  return jsonb_build_object('ok',true,'batchesCleaned',n);
end $$;
revoke all on function public.seed_commerce_demo(uuid) from public;grant execute on function public.seed_commerce_demo(uuid) to authenticated;
revoke all on function public.cleanup_commerce_demo(uuid) from public;grant execute on function public.cleanup_commerce_demo(uuid) to authenticated;
