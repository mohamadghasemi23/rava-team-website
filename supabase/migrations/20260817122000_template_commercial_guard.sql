-- Premium/exclusive templates are not tenant-self-service until a dedicated template entitlement exists.
-- Platform/template managers can still see and apply them through the RLS/RPC elevated permission path.
update public.template_catalog
set is_public=false, updated_at=now()
where commercial_tier in ('premium','enterprise','exclusive');
