-- Attribute a recovered cart conversion to the exact authenticated order.
create or replace function public.complete_customer_cart_with_order(p_tenant uuid,p_order uuid) returns uuid language plpgsql security definer set search_path=public as $$declare c uuid;profile_id uuid;begin
 if auth.uid() is null then return null;end if;
 select id into profile_id from public.customer_profiles where tenant_id=p_tenant and user_id=auth.uid();if profile_id is null then raise exception 'customer_profile_required';end if;
 if not exists(select 1 from public.orders where id=p_order and tenant_id=p_tenant and account_customer_id=profile_id) then raise exception 'order_not_owned';end if;
 select id into c from public.carts where tenant_id=p_tenant and user_id=auth.uid() and status='open' order by updated_at desc limit 1 for update;if c is null then return null;end if;
 update public.carts set status='converted',updated_at=now(),last_activity_at=now(),abandoned_at=null where id=c;
 update public.cart_recovery_attempts set status='recovered',recovered_at=now(),order_id=p_order,updated_at=now() where tenant_id=p_tenant and cart_id=c and status='opened';
 return c;end$$;
revoke all on function public.complete_customer_cart_with_order(uuid,uuid) from public,anon;grant execute on function public.complete_customer_cart_with_order(uuid,uuid) to authenticated;
