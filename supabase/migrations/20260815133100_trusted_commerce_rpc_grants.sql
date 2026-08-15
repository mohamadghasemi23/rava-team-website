-- Explicit trusted execution grants. These functions are intentionally unavailable to anon/authenticated clients.
revoke all on function public.create_storefront_order(uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_storefront_order(uuid,jsonb,jsonb,text) to service_role;
revoke all on function public.commit_verified_payment(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.commit_verified_payment(uuid,text,text,timestamptz) to service_role;
