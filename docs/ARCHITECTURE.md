# RAVA V1 Architecture

## Stack
- Next.js App Router + TypeScript
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Server-side validation for all writes
- Persian RTL public site and admin

## Architecture principle
Use fixed page/component structures with editable content. Do not use generic page blocks.

## Core entities
### profiles
Admin users only. Minimal roles: admin, editor.

### site_content
Fixed editable content sections using stable keys such as:
- home.hero
- home.stats
- home.about
- home.values
- home.final_cta
- about.intro
- footer.main

### services
Fields should cover title, slug, summary, body/content, order, published state and SEO.

### projects
Fields should cover title, slug, real/concept kind, status, summary/content, client, year, role, scope, cover, featured state, order and SEO.

### project_media
Ordered project gallery/media relation.

### media_assets
Storage path, file metadata, alt text, dimensions and size.

### leads
Project/contact submissions with name, contact information, service interest, message, status, internal notes, source path and timestamps.

### site_settings
Logo, contact data, address, social links, footer settings, Enamad settings and global site options.

### page_views_daily
Privacy-friendly aggregated analytics by date/path for the lightweight admin dashboard.

## Remove from V1 path
- page_blocks
- revisions
- audit_log
- scheduled publishing
- broad role matrix

## Routing
Public:
/
/work
/work/[slug]
/services
/services/web-design
/services/ecommerce
/services/digital-products
/services/brand-content
/services/ai-automation
/about
/contact

Admin:
/admin
/admin/home
/admin/services
/admin/projects
/admin/about
/admin/leads
/admin/media
/admin/seo
/admin/settings

## Analytics
Keep analytics lightweight and privacy-conscious. Prefer aggregated page view metrics; do not store raw IPs or unnecessary personal data.

## SEO reuse from Traffic Engine
Reuse concepts and selected implementation patterns only: metadata, canonical URLs, sitemap, robots, Open Graph, structured data, internal linking and performance practices. Do not couple RAVA Website to the Traffic Engine application or import its content-generation/crawler complexity.
