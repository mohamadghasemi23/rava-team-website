# RAVA Services-First Delivery Plan

## Status and authority

This document records the approved first commercial delivery sequence for RAVA Platform. It refines `docs/RAVA_PLATFORM_VISION.md`; it does not prove implementation.

## Approved product decisions

1. **Services first:** the first complete customer-site product is the service-business website experience.
2. **Commerce second:** commerce remains a module on the shared platform core and follows after the service-site path is production-proven.
3. **Customer Zero:** RAVA TEAM is the first real service-site customer. `ravateam.ir` must use the same tenant, content, template, release, and operational paths delivered to later customers.
4. **No blank sites:** provisioning must install a versioned, industry-appropriate starter content pack. A raw empty site is not an acceptable customer handoff.
5. **No fabricated claims:** starter content may include clearly identified examples and placeholders, but it must never invent customers, testimonials, credentials, awards, prices, results, licenses, or business facts.
6. **Human approval before publish:** generated or starter content follows Draft → Preview → customer/owner approval → Release. Installation must never silently publish to Production.

## Product composition

A provisioned site is composed from independently versioned layers:

`Site Type + Industry Pack + Template Version + Starter Content Pack Version + Brand Profile + Modules/Entitlements`

- **Site Type** defines the product family, initially `services`, later `commerce`.
- **Industry Pack** defines domain-specific information architecture, terminology, forms, FAQ patterns, SEO defaults, and recommended modules.
- **Template Version** defines constraint-based layout and visual defaults.
- **Starter Content Pack Version** defines localizable page, navigation, block, form, SEO, and example-content blueprints.
- **Brand Profile** supplies verified customer facts: brand name, tone, locations, contact data, real services, proof, legal details, and approved media.
- **Modules/Entitlements** control capabilities and commercial access without weakening baseline security.

## Starter content contract

Every installable starter pack must provide, when applicable:

- Persian content and an English structure/content variant when English is enabled;
- home, about, services, service detail, portfolio/case study, process, contact/consultation, FAQ, and legal-page blueprints;
- navigation and footer structure;
- SEO titles, descriptions, canonical/indexing defaults, Open Graph defaults, and structured-data intent;
- relevant lead forms and consent copy;
- safe media placeholders with alt-text guidance and provenance/license metadata requirements;
- explicit `sample`, `placeholder`, and `requires_customer_verification` markers;
- stable keys and schema versioning for every content entity;
- an immutable installation snapshot and audit event.

Pack upgrades must be diff-based. They must not overwrite customer-edited content, verified business facts, approved media, or published releases without an explicit review and approval operation.

## Customer Zero: RAVA TEAM

The first pack specialization is `services.digital-agency.rava-team`. It must support three simultaneous jobs:

1. introduce RAVA TEAM and Mohammad Ghasemi's real services;
2. present real, verifiable portfolio and case-study evidence;
3. explain RAVA Platform as the product powering the site and future customer sites.

No `ravateam.ir` DNS or Production change occurs until Staging content, responsive design, accessibility, performance, SEO, forms, security, backup/restore, monitoring, and release rollback gates pass and the owner explicitly approves Production.

## Prioritized implementation queue

### P0 — CMS tenant isolation prerequisite

- Add trusted `organization_id`/`site_id` relationships to pages, blocks, projects, media metadata, leads, settings, and revisions as applicable.
- Replace global uniqueness with site-scoped uniqueness.
- Add foreign-key indexes and tenant-aware RLS.
- Move sensitive writes behind validated server/RPC boundaries.
- Add cross-tenant read/write tests before content installation exists.

### P1 — Site classification and pack catalog

- Add versioned catalogs for site types, industries, starter packs, and localized pack manifests.
- Bind templates and recommended modules to compatible site type/industry combinations.
- Enforce active/version compatibility on the server/database boundary.

### P2 — Safe starter installation engine

- Provision a site and install a selected pack transactionally or through an idempotent resumable workflow.
- Snapshot the exact pack/template versions and customer inputs.
- Create draft content only; never auto-publish Production.
- Audit install, failure, retry, diff, approval, and rollback events.

### P3 — Services admin experience

- Manage services, case studies, team/about content, FAQs, navigation, forms/leads, media, SEO, and bilingual content.
- Provide contextual Persian/English Help for every user-facing admin route.
- Preserve permission, entitlement, audit, structured-error, and responsive UX requirements.

### P4 — RAVA TEAM content and design

- Collect verified brand facts and real portfolio evidence.
- Build and install the RAVA TEAM specialization on isolated Staging.
- Complete design review, mobile/accessibility/performance/SEO testing, form delivery, and content approval.

### P5 — Production readiness and reusable onboarding

- Complete off-box backup, firewall/SSH hardening, monitoring/alerts, SMTP, domain/SSL, and release rollback rehearsal.
- Publish only after explicit owner approval.
- Turn the proven Customer Zero flow into the repeatable service-site onboarding path.

### P6 — Commerce product

- Add commerce packs and storefront flows on the same tenant-aware content, template, release, permission, entitlement, provider, and observability foundations.

## Definition of success for the first milestone

The first milestone is successful when a new service business can be provisioned on Staging with a selected industry and template, receives useful editable draft content rather than an empty site, cannot access another tenant's data, can preview and approve changes, and can publish/rollback through an audited release flow.
