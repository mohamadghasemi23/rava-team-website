# RAVA V1 Reboot Roadmap

## Phase 0 — Reboot specification
Status: in progress / nearly complete
- Product definition
- Scope lock
- Design direction lock
- Admin definition
- Security baseline
- Homepage content source

## Phase 1 — Legacy audit
Classify current repository code into:
- KEEP
- SIMPLIFY
- REBUILD
- REMOVE FROM MAIN PATH
- ARCHIVE ONLY

Do not delete useful legacy material before confirming it exists in the archive branch.

## Phase 2 — Foundation cleanup
- Remove obsolete Website OS assumptions from active docs/code path.
- Simplify database model.
- Reduce roles and CMS complexity.
- Keep working auth/storage pieces that fit V1.
- Establish secure environment/config baseline.

## Phase 3 — Public homepage migration
- Recreate/adapt the Modern Agency homepage structure faithfully.
- Convert to Persian RTL.
- Convert dark theme to light RAVA theme.
- Preserve motion, sliders/carousels and project presentation behavior.
- Connect content to lightweight CMS data.

## Phase 4 — Core pages
- Work index
- Project detail/case study
- Services overview
- 5 service detail routes
- About
- Contact / Start Project

## Phase 5 — Admin V1
- Dashboard and two analytics charts
- Home editor
- Services
- Projects
- About
- Leads
- Media
- SEO
- Settings / Enamad

## Phase 6 — SEO and performance
- Metadata/canonical/Open Graph
- sitemap/robots
- structured data
- internal linking
- performance/Core Web Vitals work
- accessibility checks

## Phase 7 — Security hardening
- RLS verification
- auth/session review
- form abuse/rate limiting
- upload hardening
- security headers/CSP
- secrets review
- production dependency review

## Phase 8 — QA and launch
- Mobile/tablet/desktop QA
- RTL QA
- forms/leads QA
- admin permissions QA
- SEO crawl/index checks
- backup and rollback readiness

## Codex execution rule
Do not jump ahead to speculative future features. Finish the current phase and verify it before expanding scope.
