-- Apply after schema creation. This file is intentionally non-destructive.
-- Public clients must never call analytics aggregation directly.
revoke all on function public.record_page_view(text, text) from public;
revoke all on function public.record_page_view(text, text) from anon;
revoke all on function public.record_page_view(text, text) from authenticated;
grant execute on function public.record_page_view(text, text) to service_role;
