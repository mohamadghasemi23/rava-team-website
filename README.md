# RAVA TEAM — Production V1

Official production repository for the RAVA TEAM website and custom CMS, led by Mohammad Ghasemi.

## Stack
- Next.js App Router + TypeScript
- Supabase Postgres
- Supabase Auth with cookie-based SSR
- Supabase Storage (next phase)
- Row Level Security from day one

## Core CMS requirements
- Full create/edit/delete/hide/publish control for site content
- Dynamic Pages Builder with reusable blocks
- Projects with dedicated pages and SEO
- Media Library with previews, alt text and responsive variants
- User management with roles and granular permissions
- Leads/Inbox with assignment, statuses and internal notes
- Revisions, trash/restore and audit history
- Per-page SEO, sitemap, Open Graph and structured data
- Responsive QA across mobile, tablet, laptop and desktop
- Accessibility, security, validation, rate limiting and performance hardening

## Database
Initial schema is in `supabase/schema.sql`. RLS is enabled on every application table. Public policies only allow published pages/projects; private/admin policies are intentionally deferred until the first Super Admin is provisioned.

## Environment
Copy `.env.example` to `.env.local` and fill in Supabase project credentials.

## Current milestone
`Production V1 / Foundation`

The existing V4 HTML prototype remains the UI/UX reference and will be migrated section-by-section into data-driven components.
