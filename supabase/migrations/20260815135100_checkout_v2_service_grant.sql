-- Checkout V2 is intentionally callable only through trusted server code.
revoke all on function public.create_storefront_order_v2(uuid,jsonb,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.create_storefront_order_v2(uuid,jsonb,jsonb,text,uuid) to service_role;
