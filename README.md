# RAVA TEAM Website V1

Official RAVA TEAM agency website and focused content/admin system.

> Current implementation branch: `reboot/rava-v1-spec`
>
> This project is **not** a generic page builder, Website OS, multi-tenant SaaS or client-site factory.

## Product
RAVA Website V1 is a Persian/RTL, sales-focused agency website for:
- Web Design & Development
- E-commerce
- Digital Products
- Brand & Content
- AI & Automation

The public experience is a light/RTL adaptation of the selected **Modern Agency** reference. Its homepage hierarchy, project presentation and motion language are preserved while content and branding are RAVA-specific.

## Stack
- Next.js 16 App Router + TypeScript
- React
- Supabase Postgres
- Supabase Auth with cookie-based SSR
- Supabase Storage
- Row Level Security
- GSAP + ScrollTrigger
- Framer Motion
- Netlify deployment target

## Public routes
- `/`
- `/services`
- `/services/[slug]`
- `/work`
- `/work/[slug]`
- `/about`
- `/contact`

## Admin
- `/admin` dashboard + basic analytics
- Homepage content
- Projects + cover/gallery ordering
- Services
- About
- Leads / messages
- Media Library
- SEO
- Settings / contact / footer / Enamad

Layouts and motion are fixed in code. Admin edits content and media; there is no arbitrary block/page builder.

## Security baseline
- Central admin staff guard (`admin` / `editor` only)
- RLS on managed tables
- Server-only service-role operations for Contact and Analytics
- Contact validation + honeypot + database-backed rate limiting
- Media allow-list, size limit and file-signature validation
- Server-only analytics fingerprints; raw visitor IPs are not stored
- Structured Enamad fields; no arbitrary HTML/script storage
- Production security headers via `netlify.toml`

See `docs/SECURITY.md` and `docs/PRELAUNCH_QA.md`.

## Database safety
`supabase/schema.sql` represents the intended V1 schema for a fresh environment. **Do not apply it blindly to an unknown existing production database.** Inspect and back up the real database first, then prepare a safe migration plan.

`supabase/hardening.sql` contains non-destructive RPC permission hardening to apply after the required functions exist.

## Environment
Copy `.env.example` to `.env.local` and configure values locally/through deployment secrets. Never commit secrets.

Required variables include:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CONTACT_RATE_LIMIT_SALT`
- `ANALYTICS_HASH_SALT`

## Development
```bash
npm ci
npm run typecheck
npm run dev
```

Production validation:
```bash
npm ci
npm run typecheck
npm run build
```

`package-lock.json` is committed. CI runs locked install + typecheck + production build on `reboot/rava-v1-spec` and on `main`/PRs.

## Current status
The reboot branch currently passes TypeScript and `next build` on Node 22 / Next.js 16.3.5 in GitHub Actions.

Remaining release gates are real Supabase migration/testing, preview deployment, visual/mobile QA against the Modern Agency reference, live form/media/auth tests, and performance/security verification. See `docs/PRELAUNCH_QA.md`.

## Source of truth
Before architecture or scope changes, read:
- `AGENTS.md`
- `docs/PRODUCT.md`
- `docs/SCOPE.md`
- `docs/ARCHITECTURE.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/ADMIN.md`
- `docs/SECURITY.md`
- `docs/HOME_CONTENT.md`
- `docs/PRELAUNCH_QA.md`

Third-party attribution for the Modern Agency reference is recorded in `THIRD_PARTY_NOTICES.md`.
