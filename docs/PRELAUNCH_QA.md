# RAVA Website V1 — Prelaunch QA

This checklist is the release gate for `reboot/rava-v1-spec`. Do not merge to `main` or deploy production until every blocker is verified on a real environment.

## 1. Build & dependency reproducibility — BLOCKER
- Run `npm install` on a networked machine and commit the generated `package-lock.json`.
- After the lockfile exists, replace remaining `latest` package ranges with the exact versions resolved by the lockfile where practical.
- Run `npm run typecheck`.
- Run `npm run build`.
- Fix every TypeScript and Next.js build error before preview deployment.
- Confirm Node 22 works with the resolved Next.js/Supabase versions.

## 2. Supabase database — BLOCKER
- Do not blindly apply `schema.sql` to an unknown existing production database.
- First inspect the real database and back it up.
- For a fresh V1 database, apply `supabase/schema.sql` and then `supabase/hardening.sql`.
- Confirm `profiles` contains the intended RAVA admin user with role `admin` and `active=true`.
- Verify all RLS policies with anon, editor and admin sessions.
- Verify `record_page_view` and `consume_contact_rate_limit` are executable only by `service_role`.
- Verify the `rava-media` bucket exists, is publicly readable, and only active RAVA staff can write/delete.

## 3. Environment variables — BLOCKER
Configure in preview/production only; never commit values:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CONTACT_RATE_LIMIT_SALT`
- `ANALYTICS_HASH_SALT`

Use independent, long random salts for Contact and Analytics.

## 4. Authentication & admin
- Unauthenticated `/admin/*` redirects to `/login`.
- Active `admin` and `editor` accounts can enter.
- Inactive users and legacy roles cannot enter.
- Only `admin` can change protected global settings/SEO/Enamad where required.
- Logout invalidates the session and returns to public/login flow without redirect loops.
- Admin and login responses are `no-store` in the deployed environment.

## 5. Media
- Upload accepts only JPG, PNG, WebP and AVIF, max 5 MB.
- Server signature validation rejects spoofed MIME types.
- Uploaded media appears in Media Library.
- Alt text edit persists.
- Media referenced by project cover/gallery/OG cannot be deleted accidentally.
- Project cover and gallery ordering persist and render correctly.

## 6. Contact / Leads
- Valid contact form creates one `leads` row and appears in Admin Messages.
- Honeypot submissions do not create leads.
- Invalid email or missing contact details are rejected.
- Rate limit blocks excessive submissions within a 10-minute window.
- No raw visitor IP is stored in `leads`, analytics or rate-limit tables.
- Lead statuses can be changed from Admin.

## 7. Analytics
- Public page navigation records page views.
- `/admin`, `/login`, `/api` and `/_next` are not counted.
- Dashboard shows Today / 7 days / 30 days.
- 30-day trend chart is correct.
- Top-pages chart is correct.
- Unique estimate does not store raw IP and resets by day.

## 8. SEO
- Global title/description from Admin SEO render in HTML metadata.
- Search Console verification works when configured.
- `robots.txt` blocks private routes.
- `sitemap.xml` includes published service/project routes only.
- Each project/service uses its own metadata and optional canonical.
- No global canonical forces internal pages to `/`.
- OG image resolves publicly when configured.

## 9. Public routes
Verify 200/404 behavior and navigation for:
- `/`
- `/services`
- `/services/[slug]`
- `/work`
- `/work/[slug]`
- `/about`
- `/contact`
- `/login`
- `/admin`

Unpublished or unknown service/project slugs must return 404.

## 10. Modern Agency visual fidelity
Compare desktop and mobile against the selected Modern Agency reference. Preserve the reference's hierarchy and interaction logic while keeping RAVA light/RTL:
- Hero scale and spacing
- masked headline reveal
- marquee speed/continuity
- services row rhythm
- asymmetric project bento
- Projects II sticky preview and transition
- Featured Case Study proportions
- About/values rhythm
- final CTA/footer
- reduced-motion fallback

Do not invent new homepage sections during QA.

## 11. Persian / RTL QA
- Use a production Persian font (Vazirmatn preferred) rather than system-font fallback.
- Check mixed Persian/English strings, numerals, URLs and email addresses.
- Verify mobile menu/navigation and tap targets.
- Verify no horizontal overflow at 320px, 375px, 768px, 1024px and large desktop widths.

## 12. Performance
- Run Lighthouse on Home, Work detail, Service detail and Contact.
- Check LCP/CLS/INP and image sizes.
- Prefer optimized image rendering where it materially improves LCP while retaining Supabase media support.
- Make GSAP/Framer animations respect `prefers-reduced-motion`.
- Confirm no unnecessary client-side loading or simulated loading states remain.

## 13. Security
- Confirm `SUPABASE_SERVICE_ROLE_KEY` never appears in client bundles or public logs.
- Confirm RLS remains enabled on all private/managed tables.
- Confirm public forms write only through controlled server routes.
- Confirm no arbitrary HTML/script can be stored for Enamad or content fields.
- Confirm security response headers on Netlify.
- Add a stricter CSP only after preview testing because GSAP/React styles and external media origins must be accounted for correctly.

## 14. Content truthfulness
- Never present Concept Projects as client work.
- Do not publish unverified statistics as factual achievements.
- Replace fallback/demo content with approved RAVA content before launch where necessary.
- Ensure RAVA Website is presented consistently as RAVA's own project.

## Release order
1. Create lockfile and pass typecheck/build.
2. Inspect/backup real Supabase; apply safe V1 database plan.
3. Configure preview environment variables.
4. Deploy preview.
5. Run functional/security/visual/mobile QA.
6. Fix all blockers.
7. Re-run build + QA.
8. Only then open/merge the reboot PR into `main` and deploy production.
