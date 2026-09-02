# RAVA Project Status

This is the durable handoff for answering: **Where are we, what is safe, what is blocked, and what comes next?**

It is a maintained snapshot, not proof by itself. GitHub, the repository, CI, Staging, Production and VPS state must be refreshed before acting.

## Snapshot

- **Last updated:** 2026-09-02 UTC
- **Current milestone:** Complete the services-first Customer Zero path on isolated Staging before any Production release.
- **Active branch:** `agent/platform-core-foundation`
- **Pull request:** Draft PR `#2`, `Build RAVA multi-tenant platform core`, targeting `main`
- **Last confirmed product/design commit pushed to the GitHub branch:** `5d813ae` (`design: lock d2 flagship hero gate`)
- **Production authorization:** Not granted. No Production deploy, merge, DNS change or `ravateam.ir` change is authorized by this status file.

## Current verified position

### Repository and CI

- PR #2 is open and remains Draft.
- The GitHub checks attached to `d90f9e6` were observed successful on 2026-08-30: application Build, immutable Staging image Build, PostgreSQL migrations/security tests and the dedicated PostgreSQL security workflow. PR #2 remains Draft and unmerged.
- The GitHub checks attached to approved-Base implementation `2598339` were observed successful on 2026-09-02: application Build, immutable Staging image Build, PostgreSQL migrations/security tests, dedicated PostgreSQL security workflow and the deploy preview. This is CI evidence only; no Staging/Production deploy or merge occurred.

### Staging

- Last verified web deployment: approved-Base implementation `2598339` on 2026-09-02, with app/proxy/PostgreSQL/Auth/REST/Storage container health, infrastructure/home/login/admin/auth/REST/Storage HTTP behavior, runtime independence from Netlify, loopback-only proxy, AI-provider configuration and Compose validity Gates passing. The previous `d90f9e6` image remains available through `rava-web:rollback-staging`.
- Self-hosted Supabase-compatible Staging uses PostgreSQL 17.
- The Horizon v2 migration was applied to Staging after backup `20260830T205252Z`; its five dedicated pgTAP assertions and all fifteen public-CMS-runtime assertions passed against the real Staging database.
- Horizon v2 is available but was not silently applied to an existing site. RAVA TEAM remains on `rava-service-journey` v1 and the clinic test site remains on `rava-service-minimal` v1 pending an explicit owner preview/selection.
- Customer Zero draft data and exact draft-preview workflow exist in Staging; this does not mean Production readiness.
- Staging is accessed through the loopback-only tunnel at `127.0.0.1:19080`; refresh container health before testing.

### Production

- Production deployment has not been approved.
- DNS and `ravateam.ir` must remain unchanged until all applicable release Gates pass and the owner explicitly approves that exact Production action.

### Infrastructure constraints

- Root disk state observed after the clean D2 production Build on 2026-09-02: approximately `1.6 GiB` free on a `20 GiB` volume (`92%` used). This is volatile and must be rechecked. Approximately 234 MiB of stale, ownership-locked Next.js cache is isolated under `.next/.locked-pre-d2-20260901` and may be removed later with root access; it is not application or database data.
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

**Visual rejection recorded 2026-09-02:** The owner rejected the coded D restoration at `4b07df8`: it did not match the reference, lacked the defining curved transition, produced a disordered three-image Hero and reintroduced unrelated lamp/stone imagery. It must not be deployed or used as a visual baseline. The next design step is a pre-implementation visual round only: exact desktop/mobile comps and material states must be shown and explicitly approved before any replacement code is written.

Pre-implementation Base `rava-flagship-base-v1.png`, its mobile adaptation and its open-Mega-Menu interaction state were explicitly approved by the owner on 2026-09-02. Together they define one connected RAVA page-building/branding/content/release system, responsive behavior, a pronounced curved Hero boundary and a four-stage navy Journey. The first focused implementation is committed at `2598339`; all GitHub CI and immutable-image Gates passed, and that exact image passed the isolated rollback-aware Staging deployment Gates on 2026-09-02. It is not yet implementation-accepted: fresh real-browser desktop/mobile/open-menu captures must still be compared with the approved previews and explicitly accepted by the owner.

The post-deploy owner walkthrough found that Living System was absent from Template selection. Repository and live Staging evidence confirmed the renderer existed but no `template_catalog`, published `template_versions` or starter-pack compatibility migration had been created. Commit `7dbc0ab` added migration `20260902134253_rava_living_system_template.sql` and six pgTAP assertions; all GitHub Gates passed. Backup `20260902T134745Z` completed successfully before the migration was applied to real Staging PostgreSQL. All six pgTAP assertions passed, and readback confirmed `rava-service-living-system` version 1 is active, published, Premium, discoverable and compatible with the active starter pack. The healthy web app remains the approved renderer image `rava-web:2598339`; no Production action occurred.

The first real owner preview of `rava-web:2598339` is visually rejected. It still renders obsolete lamp/stone imagery, conflicting legacy navigation CSS and an unrelated Hero because the implementation changed final geometry without replacing rejected browser assets or consolidating stacked legacy layers. It must not be promoted or treated as accepted. Replacement assets must show only truthful RAVA page-building, content, preview and release subjects. A newly generated mobile candidate containing unsupported customer/project/satisfaction statistics was also rejected internally and will not enter the repository.

**Correction recorded 2026-09-02:** The owner clarified that the original RAVA Living System D composition is the exact flagship visual authority and that only the prominent cup was meant to be removed. This correction supersedes the D2-authority statements later in this section: D2 remains historical evidence, not the current fidelity target. A versioned cup-removed D reference and provenance sidecar now exist. The next code pass must restore D's topology, density, perspective editor, device/release rail, optical navigation and cinematic Journey with semantic, bilingual, CMS-driven implementation. No Production action is authorized.

The flagship Mega Menu is now explicitly closed on initial load, including the isolated design-preview route. Its expanded appearance is an interaction state reached only after user activation, not part of the default Hero presentation.

The first D restoration implementation pass now restores the dense desktop topology in code: solid pearl Hero ground, perspective page-builder canvas, separate tablet and phone previews, vertical draft/preview/published rail and the compact navy four-stage Journey. Both approved lamp-and-stone plates were restored from repository history, edited only to remove their cups/saucers, and compressed to a combined 28 KiB WebP browser payload with prompt provenance. The lower CMS-driven sections remain intact. Fresh real-browser desktop/mobile captures are still required before claiming visual acceptance.

The current workstream is implementation of owner-approved RAVA Living System D2 as the RAVA TEAM Customer Zero flagship Template. Four product-centered concepts in the shared RAVA Digital Atelier family are permanently preserved in `docs/RAVA_FLAGSHIP_PRESET_ROADMAP.md`; A, B and C are future sequential Presets. The first CMS-compatible Hero implementation and an environment-gated local design-preview route now exist. On 2026-09-01 the rejected interior still life was replaced again with a cleaner bespoke product plate: one coherent website canvas transforms from blueprint to a finished digital-agency site, using RAVA's pearl, deep-navy, cobalt and verified-green material language. The coded Navbar and Mega Menu now use layered optical-glass highlights, depth shadows and reduced-motion-safe entry. Three real-browser Hero critique passes at 1536px and 390px removed duplicated device props, separated the product canvas from the Hero copy, tightened the mobile composition, added an actual mobile glass menu and removed an ambiguous icon-only mobile CTA. The `RAVA in action` section was then rebuilt as a cinematic four-act operating journey with distinct content, design, responsive-preview and safe-publish visuals; desktop/mobile browser review added a connected mobile progress rail and corrected the verified-release mark. A dedicated performance pass replaced the browser-delivered PNG pair with visually reviewed WebP assets, removed unnecessary persistent blur work, deferred below-fold rendering and added a CI-enforced media budget. In response to owner review that the upper Hero still felt visually empty, a bespoke 88 KiB creative-workspace background was added: translucent web-layout grids, content architecture and a restrained cobalt publishing signal now support the foreground without reducing copy contrast. The three delivered Hero assets total 285,450 bytes under the revised 320 KiB Gate; Chromium review at desktop and mobile confirmed the intended composition. The Template has zero Canvas/WebGL elements and zero continuous animation loops. The owner approved the exact D2 closed-navigation and open-Mega-Menu Chromium captures on 2026-09-01. The measured D2 spec now contains 17 regions, three verified plates and four measured text regions; the unchanged implementation baseline passed the Impeccable Hero Gate at 100% against the approved real-browser capture, with the separate open-menu state also matching at 100%. This locks the approved baseline but does not replace a fresh browser capture after any subsequent UI code change. On 2026-09-02 the lower flagship page was implemented as CMS-compatible, bilingual sections for the RAVA promise, truthful product evidence, services, FAQ, final conversion action and footer. Service, project, FAQ and CTA blocks use published CMS data when present and safe Template copy otherwise; navigation resolves to real preview pages when those pages exist. The resulting server-rendered HTML contains all six sections. Local repository Gates passed after the change: feature standards, RPIM verification for 16 features/2,699 scoped files, the 285,450/327,680-byte performance budget, TypeScript and the clean Next.js production Build. The lower-page implementation is not yet visually accepted: this Codex environment has no runnable browser, so fresh desktop/mobile captures and interaction review remain mandatory before advancing the D2 sections phase. The earlier Horizon v2 candidate remains rollback-safe but is not accepted as the flagship visual direction.

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

1. Replace obsolete Living System imagery with owner-approved RAVA-only assets, consolidate the conflicting Hero/Navbar/Journey CSS, and obtain fresh real-browser desktop/mobile/open-menu captures from the draft.
2. Compare those captures with the approved Base and request explicit implementation acceptance; do not publish the rejected Staging visual.
3. After Living System passes owner acceptance, hide/deprecate legacy Templates from new selection while preserving referenced renderers, revisions, releases and rollback paths; do not alter Production.
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
