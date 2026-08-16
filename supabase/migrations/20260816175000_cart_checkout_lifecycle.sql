-- Close only the authenticated user's active cart after a successfully-created order.
create or replace function public.complete_customer_cart(p_tenant uuid) returns uuid language plpgsql security definer set search_path=public as $$declare c uuid;begin
 if auth.uid() is null then return null;end if;
 select id into c from public.carts where tenant_id=p_tenant and user_id=auth.uid() and status='open' order by updated_at desc limit 1 for update;
 if c is null then return null;end if;
 update public.carts set status='converted',updated_at=now(),last_activity_at=now(),abandoned_at=null where id=c;
 return c;
end$$;
revoke all on function public.complete_customer_cart(uuid) from public,anon;grant execute on function public.complete_customer_cart(uuid) to authenticated;