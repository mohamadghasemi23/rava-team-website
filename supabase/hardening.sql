-- RAVA V1 post-schema hardening.
-- Safe to review independently; do not run blindly against an unknown legacy schema.

-- Server-only RPCs must never be executable from public client roles.
revoke all on function public.record_page_view(text, text) from public, anon, authenticated;
grant execute on function public.record_page_view(text, text) to service_role;

revoke all on function public.consume_contact_rate_limit(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.consume_contact_rate_limit(text, timestamptz, integer) to service_role;

-- Internal authorization helpers live in private schema and are not API endpoints.
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
revoke all on function private.is_rava_staff() from public, anon;
revoke all on function private.is_rava_admin() from public, anon;
grant execute on function private.is_rava_staff() to authenticated, service_role;
grant execute on function private.is_rava_admin() to authenticated, service_role;

-- Least-privilege Data API grants. RLS remains enabled as a second authorization layer.
revoke all privileges on table public.profiles, public.media_assets, public.site_content, public.services, public.projects, public.project_media, public.leads, public.site_settings, public.page_views_daily, public.page_view_visitors_daily, public.public_rate_limits from anon, authenticated;

grant select on public.media_assets, public.site_content, public.services, public.projects, public.project_media, public.site_settings to anon;
grant select,insert,update,delete on public.profiles, public.media_assets, public.site_content, public.services, public.projects, public.project_media, public.site_settings to authenticated;
grant select,update on public.leads to authenticated;
grant select on public.page_views_daily to authenticated;

-- These internal tables are service-role only.
revoke all privileges on table public.page_view_visitors_daily, public.public_rate_limits from anon, authenticated;
