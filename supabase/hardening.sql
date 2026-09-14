-- Apply after schema creation. This file is intentionally non-destructive.
-- Public clients must never call server-only analytics or rate-limit RPCs directly.

revoke all on function public.record_page_view(text, text) from public, anon, authenticated;
grant execute on function public.record_page_view(text, text) to service_role;

revoke all on function public.consume_contact_rate_limit(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.consume_contact_rate_limit(text, timestamptz, integer) to service_role;
