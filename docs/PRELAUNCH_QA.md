# RAVA Website V1 — Prelaunch QA

This is the release gate for `reboot/rava-v1-spec`. Do not merge to `main` or deploy production until the remaining Preview/production verification gates pass.

## Completed code/infrastructure gates

- `package-lock.json` is committed and dependency versions are pinned.
- Node 22 is the CI/deployment target.
- CI runs Git/runtime preflight, `npm ci`, high-severity `npm audit`, lint, typecheck and production build.
- Next.js `16.3.5`, React/ReactDOM `19.3.0`.
- Vazirmatn Variable is self-hosted.
- Public + inner-page mobile navigation is implemented.
- Home/internal fallback data is route-safe; no known fallback 404s.
- Contact/About/Home/Footer/SEO/Admin modules are wired to the focused RAVA V1 model.
- Canonical Leads route is `/admin/leads`; `/admin/messages` redirects for compatibility.
- Security headers include HSTS, nosniff, referrer policy, permissions policy and frame denial.
- Mandatory Codex preflight is defined in `CODEX_PREFLIGHT_CHECKLIST.md` and referenced by `AGENTS.md`.

## Live Supabase — completed and verified 2026-09-14

- Project is `ACTIVE_HEALTHY`.
- Live `public` schema is aligned to RAVA Website V1.
- Old Website OS tables were preserved, not deleted, in the non-public `legacy` schema.
- Existing media rows and Storage objects were preserved.
- Existing active account was converted from legacy `super_admin` to V1 `admin`.
- Required V1 tables exist: `profiles`, `media_assets`, `site_content`, `services`, `projects`, `project_media`, `leads`, `site_settings`, `page_views_daily`, `page_view_visitors_daily`, `public_rate_limits`.
- RLS is enabled on every managed V1 public table.
- Authorization helpers live in non-exposed `private` schema.
- `record_page_view` and `consume_contact_rate_limit` are executable only by `service_role`.
- Anonymous role cannot read profiles, leads, visitor hashes or rate-limit rows and cannot execute privileged RPCs.
- `rava-media` is public-read, max 5 MB, and accepts only JPEG/PNG/WebP/AVIF; staff-only mutation policies are active.
- Table-level grants were reduced to least privilege in addition to RLS.
- Supabase Security Advisor has no schema/RLS/SECURITY DEFINER findings.
- Supabase Performance Advisor has no WARN findings; remaining INFO entries are unused-index notices expected on a nearly empty database.
- Live migration history and Git migration files include:
  - `20260914110937_rava_v1_policy_performance_hardening`
  - `20260914111315_rava_v1_public_and_staff_policy_split`

See `docs/LIVE_DATABASE_STATUS.md` for the live baseline. Do not rerun old Website OS migrations and do not apply `schema.sql` blindly over the live DB.

### Supabase plan limitation — not a code blocker

The organization is on Supabase Free. Security Advisor reports Leaked Password Protection disabled; Supabase documents that feature as Pro-plan-and-above. Do not treat this as a RAVA code defect or silently upgrade/spend money. If the account is upgraded later, enable it in Auth settings.

## Remaining release verification

### 1. Preview environment
Configure as deployment secrets; never commit values:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CONTACT_RATE_LIMIT_SALT`
- `ANALYTICS_HASH_SALT`

Use independent long random salts for Contact and Analytics.

### 2. Authentication/Admin live browser test
- Anonymous `/admin/*` redirects to `/login`.
- Active `admin` and `editor` can enter; inactive/invalid roles cannot.
- Only `admin` can change protected Settings/SEO/Enamad.
- Logout has no redirect loop.
- Verify `/admin/leads`, projects, services, home, about, media, SEO and settings with real writes.

### 3. Media live browser test
- Upload JPG/PNG/WebP/AVIF <= 5 MB.
- Reject spoofed/unsupported files.
- Verify preview, alt edit, safe-delete protection, cover selection and gallery ordering.

### 4. Contact/Leads live browser test
- Valid submission creates one Lead and appears in `/admin/leads`.
- Honeypot/invalid input/rate-limit behavior is correct.
- Status changes persist.
- Confirm no raw IP is stored.

### 5. Analytics live browser test
- Public navigation records views.
- `/admin`, `/login`, `/api`, `/_next` are excluded.
- Dashboard Today/7d/30d/trend/top-pages match DB values.

### 6. SEO live test
- Admin SEO renders in metadata.
- `robots.txt` and `sitemap.xml` are correct.
- Project/service metadata/canonical/OG work on Preview.

### 7. Visual/mobile QA against Modern Agency
Check real Preview at 320, 375, 768, 1024 and large desktop widths:
- Hero scale/wrapping/masked reveal
- Marquee continuity
- Services rhythm
- Asymmetric Bento
- Projects II sticky preview
- Featured Case Study proportions
- About/values and final CTA/footer
- mobile menu/tap targets
- Persian/English mixed text
- no horizontal overflow
- reduced-motion behavior

Do not invent new homepage sections during QA.

### 8. Performance + deployed security
- Run Lighthouse on Home, Project Detail, Service Detail and Contact.
- Review LCP/CLS/INP, image sizing and font loading.
- Confirm no service-role secret in browser bundles/logs.
- Confirm HTTPS security headers on the deployed Preview.
- Test a stricter CSP on Preview before enforcing it, accounting for Supabase media origins and runtime styles.

### 9. Final content
- Concept Projects must remain explicitly labeled.
- Do not publish unverified statistics as facts.
- Approve/replace demo/fallback content and project imagery.
- Confirm final contact/social/footer/Enamad values.

## Release order
1. Latest reboot CI green.
2. Configure Preview secrets and deploy Preview.
3. Run functional + auth + media + contact + analytics tests.
4. Run visual/mobile/SEO/Lighthouse/security QA.
5. Fix any Preview findings and rerun CI/QA.
6. Open PR from `reboot/rava-v1-spec` to `main`.
7. Merge only after explicit approval; then deploy production.
