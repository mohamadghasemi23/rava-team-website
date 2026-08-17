-- The original billing ingestion RPC predates runtime hard-limit enforcement.
-- Keep the function for migration compatibility, but remove application-level execute access
-- so feature code cannot bypass consume_metered_feature().

revoke execute on function public.record_usage_event(uuid,uuid,text,numeric,text,jsonb) from authenticated;
comment on function public.record_usage_event(uuid,uuid,text,numeric,text,jsonb)
is 'Deprecated internal billing ingestion path. Application features must use consume_metered_feature so entitlement, permission, idempotency, soft limits and hard limits are enforced atomically.';
