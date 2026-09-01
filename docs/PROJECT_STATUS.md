# RAVA Project Status

This is the durable handoff for answering: **Where are we, what is safe, what is blocked, and what comes next?**

It is a maintained snapshot, not proof by itself. GitHub, the repository, CI, Staging, Production and VPS state must be refreshed before acting.

## Snapshot

- **Last updated:** 2026-09-01 UTC
- **Current milestone:** Complete the services-first Customer Zero path on isolated Staging before any Production release.
- **Active branch:** `agent/platform-core-foundation`
- **Pull request:** Draft PR `#2`, `Build RAVA multi-tenant platform core`, targeting `main`
- **Last confirmed product-code commit pushed to the GitHub branch:** `64c06fa` (`perf(design): enforce flagship frontend budget`)
- **Production authorization:** Not granted. No Production deploy, merge, DNS change or `ravateam.ir` change is authorized by this status file.

## Current verified position

### Repository and CI

- PR #2 is open and remains Draft.
- The GitHub checks attached to `d90f9e6` were observed successful on 2026-08-30: application Build, immutable Staging image Build, PostgreSQL migrations/security tests and the dedicated PostgreSQL security workflow. PR #2 remains Draft and unmerged.

### Staging

- Last verified web deployment: `d90f9e6`, with container, HTTP, auth gateway, REST gateway, Storage gateway, loopback-only proxy, AI-provider-config and Compose Gates passing.
- Self-hosted Supabase-compatible Staging uses PostgreSQL 17.
- The Horizon v2 migration was applied to Staging after backup `20260830T205252Z`; its five dedicated pgTAP assertions and all fifteen public-CMS-runtime assertions passed against the real Staging database.
- Horizon v2 is available but was not silently applied to an existing site. RAVA TEAM remains on `rava-service-journey` v1 and the clinic test site remains on `rava-service-minimal` v1 pending an explicit owner preview/selection.
- Customer Zero draft data and exact draft-preview workflow exist in Staging; this does not mean Production readiness.
- Staging is accessed through the loopback-only tunnel at `127.0.0.1:19080`; refresh container health before testing.

### Production

- Production deployment has not been approved.
- DNS and `ravateam.ir` must remain unchanged until all applicable release Gates pass and the owner explicitly approves that exact Production action.

### Infrastructure constraints

- Last observed root disk state after validated old-image cleanup and the `d90f9e6` pull on 2026-08-30: approximately `2.2 GiB` free on a `20 GiB` volume (`89%` used). This is volatile and must be rechecked.
- Until disk capacity is increased, avoid non-essential dependency installations, local Docker Builds, duplicate images and large caches.
- Do not delete active images, PostgreSQL data, verified backups or rollback assets without exact target validation.
- OpenAI SEO suggestions are structurally implemented, but the provider account last reported no API credits. AI is therefore not an acceptance dependency for the current manual flow.

## What is established

- The canonical product vision and services-first delivery sequence are documented.
- Customer Zero is RAVA TEAM and must use the same tenant, template, content, preview, release and rollback architecture as future customers.
- GitHub is the source of truth; RPIM narrows feature discovery.
- Isolated self-hosted Staging, PostgreSQL backup tooling, rollback-aware web deployment and health Gates exist.
- Core platform foundations, Admin localization/help foundations, CMS draft preview, owner SEO suggestion flow, media video/search support and versioned template work exist in the branch history.
- Admin UX requirements record the one-path task model, owner/customer access separation, readable tables, constrained page building, exact previews, bilingual Help and SEO guidance.
- Design work has begun, but the current templates and Admin surfaces are not accepted as final world-class design.
- A repository-owned, bounded Skill discovery workflow exists at `tools/codex-skills/rava-skill-scout/`; it searches metadata first, caches results and requires explicit approval before installation.
- The Template portfolio now has a documented admission brief, Independence Gate, customer-safe management boundary and commercial scorecard; existing Templates have not yet been audited against it.

## Active workstream

The current workstream is implementation of owner-approved RAVA Living System D as the RAVA TEAM Customer Zero flagship Template. Four product-centered concepts in the shared RAVA Digital Atelier family are permanently preserved in `docs/RAVA_FLAGSHIP_PRESET_ROADMAP.md`; A, B and C are future sequential Presets. The first CMS-compatible Hero implementation and an environment-gated local design-preview route now exist. On 2026-09-01 the rejected interior still life was replaced again with a cleaner bespoke product plate: one coherent website canvas transforms from blueprint to a finished digital-agency site, using RAVA's pearl, deep-navy, cobalt and verified-green material language. The coded Navbar and Mega Menu now use layered optical-glass highlights, depth shadows and reduced-motion-safe entry. Three real-browser Hero critique passes at 1536px and 390px removed duplicated device props, separated the product canvas from the Hero copy, tightened the mobile composition, added an actual mobile glass menu and removed an ambiguous icon-only mobile CTA. The `RAVA in action` section was then rebuilt as a cinematic four-act operating journey with distinct content, design, responsive-preview and safe-publish visuals; desktop/mobile browser review added a connected mobile progress rail and corrected the verified-release mark. A dedicated performance pass replaced the browser-delivered 3.2 MiB PNG pair with visually reviewed WebP assets totaling 196,634 bytes, removed unnecessary persistent blur work, deferred below-fold rendering and added a CI-enforced 220 KiB Hero-media budget. Chromium selected only WebP; the Template had zero Canvas/WebGL elements and zero continuous animation loops. This is still not an accepted full Template release: the remaining page family and content sections are not implemented, and the existing Impeccable Hero Gate remains at 56%, below its 72% threshold, because the approved Comp bitmap still depicts the superseded interior plate. The latest 2026-09-01 repository Gates passed: feature standards, RPIM verification for 16 features/259 scoped files, the new performance budget, TypeScript and the Next.js production Build. The earlier Horizon v2 candidate remains rollback-safe but is not accepted as the flagship visual direction.

## Known incomplete work and risks

- A systematic owner-led usability review of every core Admin journey is still required; observations must be added to `docs/ADMIN_UX_REQUIREMENTS.md` and converted into prioritized implementation work.
- Tables, navigation, Help placement, setup wording, template selection, page management and responsive behavior require continued real-browser verification rather than commit-history assumptions.
- The service-site experience needs a complete, verified Customer Zero content/design pass with real RAVA facts and portfolio evidence.
- The desired library of at least ten distinctive, versioned templates is not complete.
- Existing service Templates may fail the new diversity standard and require retain/redesign/deprecate decisions after a structured catalog audit; template count alone is not progress.
- Production readiness still requires the applicable backup/restore, off-box backup, monitoring, SMTP, security, domain/SSL, performance, accessibility, SEO, form-delivery and rollback rehearsal Gates.
- The VPS disk is a near-term operational risk until capacity is increased.
- No blank-site handoff, fabricated claims, cross-tenant leakage, permission shortcuts or silent AI execution are acceptable.

## Prioritized next actions

1. Obtain explicit owner review of the exact closed and open-menu D2 candidate captures in `.impeccable/mocks/`; only after approval may their sidecars become approved visual authority, the implementation be re-measured and the Hero Gate rerun without weakening its threshold.
2. Complete the CMS-compatible D Template sections and versioned catalog migration only after the Hero Gate passes, then run complete repository Gates and real Staging validation.
3. After D passes owner acceptance, hide/deprecate legacy Templates from new selection while preserving referenced renderers, revisions, releases and rollback paths; do not alter Production.
4. Continue the structured owner usability walkthrough from site creation through content, pages, preview, Template selection and approval.
5. Audit every existing Template against `docs/TEMPLATE_PORTFOLIO_STANDARD.md`; retain, redesign, merge or deprecate weak duplicates before approving the ten-family service portfolio roadmap.
6. Rehearse all release-readiness Gates; request separate explicit approval before any Production action.

## Update protocol

At the start of work:

1. Read this file and `docs/DECISION_LOG.md`.
2. Refresh branch, PR, CI, Staging/VPS and disk facts that affect the task.
3. Correct stale facts before using them for a decision.

At the end of meaningful work:

1. Move genuinely verified outcomes into **Current verified position** or **What is established**.
2. Record new blockers and remaining validation honestly.
3. Reorder **Prioritized next actions** if the critical path changed.
4. Keep volatile observations dated.
5. Never turn an untested implementation or conversation agreement into a completed claim.
