# RAVA Project Status

This is the durable handoff for answering: **Where are we, what is safe, what is blocked, and what comes next?**

It is a maintained snapshot, not proof by itself. GitHub, the repository, CI, Staging, Production and VPS state must be refreshed before acting.

## Snapshot

- **Last updated:** 2026-08-30 UTC
- **Current milestone:** Complete the services-first Customer Zero path on isolated Staging before any Production release.
- **Active branch:** `agent/platform-core-foundation`
- **Pull request:** Draft PR `#2`, `Build RAVA multi-tenant platform core`, targeting `main`
- **Last confirmed documentation baseline pushed to the GitHub branch:** `9de4888` (`docs(project): add durable status and decision memory`)
- **Last product-code commit before the documentation-only updates:** `2f6470a` (`feat(design): add premium ThreeUI horizon template`)
- **Production authorization:** Not granted. No Production deploy, merge, DNS change or `ravateam.ir` change is authorized by this status file.

## Current verified position

### Repository and CI

- PR #2 is open and remains Draft.
- The GitHub checks attached to `2f6470a` were observed successful on 2026-08-30: application Build, PostgreSQL migrations/security tests, dedicated PostgreSQL security workflow, and immutable Staging image Build.
- The documentation baseline through `9fdd3ff` was pushed on 2026-08-30. Application Build, immutable Staging image Build, PostgreSQL migrations/security tests and the dedicated PostgreSQL security workflow all passed for that commit.

### Staging

- Last operator-confirmed web deployment: `2f6470a`, with container, HTTP, auth gateway, REST gateway, Storage gateway, loopback-only proxy, no-Netlify runtime and Compose Gates reported passing.
- Self-hosted Supabase-compatible Staging uses PostgreSQL 17.
- Customer Zero draft data and exact draft-preview workflow exist in Staging; this does not mean Production readiness.
- Staging is accessed through the loopback-only tunnel at `127.0.0.1:19080`; refresh container health before testing.

### Production

- Production deployment has not been approved.
- DNS and `ravateam.ir` must remain unchanged until all applicable release Gates pass and the owner explicitly approves that exact Production action.

### Infrastructure constraints

- Last observed root disk state on 2026-08-30: approximately `1.1 GiB` free on a `20 GiB` volume (`95%` used). This is volatile and must be rechecked.
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

## Active workstream

The current conversation workstream is reviewing design and content Skills/resources while keeping VPS disk usage stable. New Skill discovery now uses the bounded `rava-skill-scout` workflow. Lightweight text-only Skills may be installed after license and overlap review. Dependency-heavy UI libraries are deferred until disk capacity and architecture justify them.

## Known incomplete work and risks

- A systematic owner-led usability review of every core Admin journey is still required; observations must be added to `docs/ADMIN_UX_REQUIREMENTS.md` and converted into prioritized implementation work.
- Tables, navigation, Help placement, setup wording, template selection, page management and responsive behavior require continued real-browser verification rather than commit-history assumptions.
- The service-site experience needs a complete, verified Customer Zero content/design pass with real RAVA facts and portfolio evidence.
- The desired library of at least ten distinctive, versioned templates is not complete.
- Production readiness still requires the applicable backup/restore, off-box backup, monitoring, SMTP, security, domain/SSL, performance, accessibility, SEO, form-delivery and rollback rehearsal Gates.
- The VPS disk is a near-term operational risk until capacity is increased.
- No blank-site handoff, fabricated claims, cross-tenant leakage, permission shortcuts or silent AI execution are acceptable.

## Prioritized next actions

1. Finish the remaining lightweight Skill/resource reviews without adding heavy project dependencies.
2. Confirm PR #2 has advanced to the pushed documentation commits and wait for their GitHub checks; do not merge.
3. Perform a read-only disk/backup/image audit and define a conservative survival policy until disk expansion.
4. Run a structured owner usability walkthrough from site creation through content, pages, preview, template selection and approval; capture every issue in the durable UX backlog.
5. Fix P0/P1 usability and correctness defects exposed by that walkthrough with RPIM-scoped changes and full Gates.
6. Establish the original RAVA design system and template-family roadmap, then complete the first service template and Customer Zero content on Staging.
7. Rehearse all release-readiness Gates; request separate explicit approval before any Production action.

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
