-- Defense in depth: foreign-key IDs must belong to the same tenant as the child row.
create or replace function public.guard_commerce_tenant_integrity() returns trigger language plpgsql set search_path=public as $$
declare x uuid;
begin
 if tg_table_name='products' then
  if new.category_id is not null then select tenant_id into x from product_categories where id=new.category_id;if x is null or x<>new.tenant_id then raise exception 'category_tenant_mismatch';end if;end if;
  if new.vendor_id is not null then select tenant_id into x from commerce_vendors where id=new.vendor_id;if x is null or x<>new.tenant_id then raise exception 'vendor_tenant_mismatch';end if;end if;
 elsif tg_table_name='product_variants' then select tenant_id into x from products where id=new.product_id;if x is null or x<>new.tenant_id then raise exception 'product_tenant_mismatch';end if;
 elsif tg_table_name='cart_items' then
  select tenant_id into x from carts where id=new.cart_id;if x is null or x<>new.tenant_id then raise exception 'cart_tenant_mismatch';end if;
  select tenant_id into x from product_variants where id=new.variant_id;if x is null or x<>new.tenant_id then raise exception 'variant_tenant_mismatch';end if;
 elsif tg_table_name='order_items' then
  select tenant_id into x from orders where id=new.order_id;if x is null or x<>new.tenant_id then raise exception 'order_tenant_mismatch';end if;
  if new.product_id is not null then select tenant_id into x from products where id=new.product_id;if x is null or x<>new.tenant_id then raise exception 'product_tenant_mismatch';end if;end if;
  if new.variant_id is not null then select tenant_id into x from product_variants where id=new.variant_id;if x is null or x<>new.tenant_id then raise exception 'variant_tenant_mismatch';end if;end if;
 elsif tg_table_name='payment_transactions' then select tenant_id into x from orders where id=new.order_id;if x is null or x<>new.tenant_id then raise exception 'payment_order_tenant_mismatch';end if;
 elsif tg_table_name='product_reviews' then
  select tenant_id into x from products where id=new.product_id;if x is null or x<>new.tenant_id then raise exception 'review_product_tenant_mismatch';end if;
  if new.order_id is not null then select tenant_id into x from orders where id=new.order_id;if x is null or x<>new.tenant_id then raise exception 'review_order_tenant_mismatch';end if;end if;
 elsif tg_table_name='product_questions' then select tenant_id into x from products where id=new.product_id;if x is null or x<>new.tenant_id then raise exception 'question_product_tenant_mismatch';end if;
 elsif tg_table_name='promotion_redemptions' then
  select tenant_id into x from promotions where id=new.promotion_id;if x is null or x<>new.tenant_id then raise exception 'promotion_tenant_mismatch';end if;
  if new.order_id is not null then select tenant_id into x from orders where id=new.order_id;if x is null or x<>new.tenant_id then raise exception 'promotion_order_tenant_mismatch';end if;end if;
 end if;return new;
end$$;

do $$ declare t text;begin foreach t in array array['products','product_variants','cart_items','order_items','payment_transactions','product_reviews','product_questions','promotion_redemptions'] loop execute format('drop trigger if exists commerce_tenant_integrity on public.%I',t);execute format('create trigger commerce_tenant_integrity before insert or update on public.%I for each row execute function public.guard_commerce_tenant_integrity()',t);end loop;end$$;

-- Child tables without tenant_id get relation guards through their parents.
create or replace function public.guard_order_discount_relation() returns trigger language plpgsql set search_path=public as $$
declare ot uuid;pt uuid;begin select tenant_id into ot from orders where id=new.order_id;if ot is null then raise exception 'order_missing';end if;if new.promotion_id is not null then select tenant_id into pt from promotions where id=new.promotion_id;if pt is null or pt<>ot then raise exception 'order_discount_tenant_mismatch';end if;end if;return new;end$$;
drop trigger if exists order_discount_relation_guard on public.order_discounts;create trigger order_discount_relation_guard before insert or update on public.order_discounts for each row execute function public.guard_order_discount_relation();
