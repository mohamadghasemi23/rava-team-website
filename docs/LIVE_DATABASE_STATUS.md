# RAVA V1 — Live Supabase Status

Verified on 2026-09-14 against project `vpwmknzajfdarkqpbjih`.

## Current state

- Project status: `ACTIVE_HEALTHY`.
- Public schema is aligned to the focused RAVA Website V1 model.
- Legacy Website OS tables are preserved in the non-public `legacy` schema: `pages`, `page_blocks`, `revisions`, `audit_log`.
- Existing media rows and Storage objects were preserved.
- Existing active profile was converted from legacy `super_admin` to V1 `admin`.
- `rava-media` is public-read, max 5 MB, and accepts only JPEG/PNG/WebP/AVIF.
- RLS is enabled on all managed V1 public tables.
- Authorization helpers live in non-exposed `private` schema.
- Analytics and rate-limit RPCs are executable only by `service_role`.
- Anonymous roles have only the SELECT privileges required for public website content; they cannot read profiles/leads/internal analytics/rate-limit tables.
- Authenticated roles receive only the table verbs required by the admin app, with RLS enforcing active `admin`/`editor` access.
- Supabase Security Advisor has no schema/RLS/SECURITY DEFINER findings remaining.
- Supabase Performance Advisor has no WARN findings remaining; current INFO entries are only unused-index notices expected on a nearly empty database.

## Supabase plan limitation

The organization is currently on the Free plan. Supabase Security Advisor therefore reports `Leaked Password Protection Disabled`. Supabase documentation states this feature is available on the Pro plan and above. This is not fixable through database SQL or application code on the current plan and must not be treated as a V1 code blocker.

## Migration safety

Do not run historical Website OS migrations again. Do not apply `supabase/schema.sql` over this live database. `schema.sql` is the fresh-install target; live changes must use reviewed forward migrations.

The registered live hardening migrations include:

- `rava_v1_policy_performance_hardening`
- `rava_v1_public_and_staff_policy_split`

Before any future DB-touching milestone, rerun the mandatory preflight, inspect migration state, and run Supabase security/performance advisors after changes.
