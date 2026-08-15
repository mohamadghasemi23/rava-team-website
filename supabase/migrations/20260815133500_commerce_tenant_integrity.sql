-- Defense in depth: child records cannot point at another tenant's parent even if an application bug supplies a foreign UUID.
create unique index if not exists products_tenant_id_uq on public.products(tenant_id,id);
create unique index if not exists product_variants_tenant_id_uq on public.product_variants(tenant_id,id);
create unique index if not exists carts_tenant_id_uq on public.carts(tenant_id,id);
create unique index if not exists orders_tenant_id_uq on public.orders(tenant_id,id);
create unique index if not exists promotions_tenant_id_uq on public.promotions(tenant_id,id);
create unique index if not exists inventory_locations_tenant_id_uq on public.inventory_locations(tenant_id,id);

do $$ begin
 if not exists(select 1 from pg_constraint where conname='product_variants_same_tenant_product_fk') then
  alter table public.product_variants add constraint product_variants_same_tenant_product_fk foreign key(tenant_id,product_id) references public.products(tenant_id,id) on delete cascade not valid;
 end if;
 if not exists(select 1 from pg_constraint where conname='cart_items_same_tenant_cart_fk') then
  alter table public.cart_items add constraint cart_items_same_tenant_cart_fk foreign key(tenant_id,cart_id) references public.carts(tenant_id,id) on delete cascade not valid;
 end if;
 if not exists(select 1 from pg_constraint where conname='cart_items_same_tenant_variant_fk') then
  alter table public.cart_items add constraint cart_items_same_tenant_variant_fk foreign key(tenant_id,variant_id) references public.product_variants(tenant_id,id) on delete cascade not valid;
 end if;
 if not exists(select 1 from pg_constraint where conname='payment_transactions_same_tenant_order_fk') then
  alter table public.payment_transactions add constraint payment_transactions_same_tenant_order_fk foreign key(tenant_id,order_id) references public.orders(tenant_id,id) on delete restrict not valid;
 end if;
 if not exists(select 1 from pg_constraint where conname='order_inventory_reservations_same_tenant_order_fk') then
  alter table public.order_inventory_reservations add constraint order_inventory_reservations_same_tenant_order_fk foreign key(tenant_id,order_id) references public.orders(tenant_id,id) on delete cascade not valid;
 end if;
 if not exists(select 1 from pg_constraint where conname='order_inventory_reservations_same_tenant_variant_fk') then
  alter table public.order_inventory_reservations add constraint order_inventory_reservations_same_tenant_variant_fk foreign key(tenant_id,variant_id) references public.product_variants(tenant_id,id) on delete restrict not valid;
 end if;
 if not exists(select 1 from pg_constraint where conname='inventory_balances_same_tenant_location_fk') then
  alter table public.inventory_balances add constraint inventory_balances_same_tenant_location_fk foreign key(tenant_id,location_id) references public.inventory_locations(tenant_id,id) on delete cascade not valid;
 end if;
 if not exists(select 1 from pg_constraint where conname='inventory_balances_same_tenant_product_fk') then
  alter table public.inventory_balances add constraint inventory_balances_same_tenant_product_fk foreign key(tenant_id,product_id) references public.products(tenant_id,id) on delete cascade not valid;
 end if;
end $$;

comment on constraint product_variants_same_tenant_product_fk on public.product_variants is 'Prevents a variant in one tenant from referencing another tenant product.';
comment on constraint payment_transactions_same_tenant_order_fk on public.payment_transactions is 'Prevents cross-tenant payment/order linkage.';
