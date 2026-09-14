# RAVA Website V1 — Prelaunch QA

This is the release gate for `reboot/rava-v1-spec`. Do not merge to `main` or deploy production until every remaining environment blocker is verified.

## Code-side gates — completed
- `package-lock.json` is committed.
- Runtime/dev dependency versions are pinned to the versions proven by CI.
- Node 22 is the deployment/CI target.
- CI uses `npm ci --no-audit --no-fund`.
- `npm run typecheck` and `npm run build` have passed on the reboot branch; re-run after every final code change.
- Next.js is pinned to `16.3.5`; React/ReactDOM to `19.3.0`.
- Vazirmatn Variable is self-hosted through `@fontsource-variable/vazirmatn`.
- Public and inner-page mobile navigation is implemented with Escape close and body scroll lock.
- Public fallback services/projects share one source and their detail routes no longer dead-end when the database is empty.
- Contact page uses the final RAVA inner-page system instead of the temporary functional placeholder.
- Home Hero title and CTAs now use Admin-managed values.
- About public page renders editable title, intro, body, stats, values and CTA.
- General footer/contact/social settings and structured Enamad fields are wired to the public UI.
- Canonical Leads admin route is `/admin/leads`; legacy `/admin/messages` redirects there.
- Security headers include HSTS, nosniff, referrer policy, permissions policy and frame denial.

## Remaining release blockers — require a real environment

### 1. Supabase database
- Do not blindly apply `schema.sql` to an unknown existing database.
- Inspect the actual database and migration history first, then export a backup.
- For a fresh disposable V1 database, apply `supabase/schema.sql` and `supabase/hardening.sql`.
- For an existing RAVA database, prepare and test a forward migration that preserves required auth/profile/media/project/lead data.
- Confirm an intended RAVA user exists in `profiles` with `role='admin'` and `active=true`.
- Verify RLS using anon, editor and admin sessions.
- Verify `record_page_view` and `consume_contact_rate_limit` are executable only by `service_role`.
- Verify `rava-media` is publicly readable while write/update/delete remain staff-only.

### 2. Preview environment
Configure as deployment secrets; never commit values:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CONTACT_RATE_LIMIT_SALT`
- `ANALYTICS_HASH_SALT`

Use separate long random salts for Contact and Analytics.

### 3. Authentication/Admin live test
- Anonymous `/admin/*` redirects to `/login`.
- Active `admin` and `editor` can enter; inactive/legacy roles cannot.
- Only `admin` can change protected global Settings/SEO/Enamad.
- Logout invalidates the session without a redirect loop.
- `/admin/*` and `/login` responses are `no-store` in the deployed environment.
- Verify `/admin/leads`, projects, services, home, about, media, SEO and settings with real writes.

### 4. Media live test
- Accept only JPG, PNG, WebP and AVIF, max 5 MB.
- Reject spoofed file signatures.
- Verify upload, preview, alt text edit, safe delete protection, project cover selection and gallery ordering.

### 5. Contact/Leads live test
- A valid Contact submission creates one `leads` row and appears in `/admin/leads`.
- Honeypot submissions do not create rows.
- Invalid email/missing contact details are rejected.
- Rate limiting blocks excessive submissions in its 10-minute window.
- Lead status changes persist.
- Confirm no raw IP is stored.

### 6. Analytics live test
- Public navigations record page views.
- `/admin`, `/login`, `/api` and `/_next` are excluded.
- Dashboard Today / 7 days / 30 days, trend and top-pages values match database aggregates.
- Unique estimation resets daily without storing raw IP.

### 7. SEO live test
- Global Admin SEO renders in metadata.
- Search Console verification works when configured.
- `robots.txt` blocks private routes.
- `sitemap.xml` resolves and contains the intended public routes.
- Project/service metadata and optional canonical are correct.
- OG image resolves publicly.

### 8. Visual/mobile QA against Modern Agency
Compare the preview on real desktop/mobile widths. Preserve the reference hierarchy and interaction logic while keeping RAVA light/RTL:
- Hero scale, wrapping and masked reveal
- Marquee continuity/speed
- Services rhythm
- Asymmetric project Bento
- Projects II sticky preview/transition
- Featured Case Study proportions
- About/values rhythm
- Final CTA/footer
- Mobile menu and tap targets
- Mixed Persian/English text and numerals
- No horizontal overflow at 320, 375, 768, 1024 and large desktop widths
- `prefers-reduced-motion` fallback

Do not invent new homepage sections during QA.

### 9. Performance
- Run Lighthouse on Home, Project Detail, Service Detail and Contact.
- Review LCP/CLS/INP, font loading and image sizes.
- Replace raw image rendering with optimized delivery where it materially improves LCP without breaking Supabase media.
- Confirm no simulated loading or unnecessary client work remains.

### 10. Security
- Confirm `SUPABASE_SERVICE_ROLE_KEY` never appears in browser bundles/public logs.
- Reconfirm RLS on managed/private tables.
- Confirm public writes happen only through controlled server endpoints.
- Confirm Enamad/content cannot store arbitrary executable HTML/script.
- Confirm Netlify security headers over HTTPS.
- Add/test a stricter CSP only on Preview, because real Supabase media origins and runtime styling must be accounted for before enforcing it.

### 11. Final content
- Never present Concept Projects as client work.
- Do not publish unverified statistics as factual achievements.
- Replace or approve fallback/demo content before production.
- Add approved real project imagery/alt text.
- Confirm final contact/social/footer/Enamad values.

## Release order
1. Final reboot CI green.
2. Inspect and back up real Supabase.
3. Build/test safe database migration on disposable/staging environment.
4. Configure Preview secrets and deploy Preview.
5. Run functional, security, visual, responsive and Lighthouse QA.
6. Fix every blocker and re-run CI/Preview QA.
7. Open the reboot PR into `main`.
8. Merge only after approval, then deploy production.
