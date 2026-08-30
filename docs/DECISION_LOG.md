# RAVA Decision Log

This append-only log records durable decisions and their rationale. Implementation remains subject to repository evidence and applicable Gates.

If a decision changes, add a new entry that explicitly supersedes the old entry; do not silently rewrite history.

## 2026-08-25 — Services-first commercial sequence

- **Decision:** Complete the service-business website product before the commerce product.
- **Reason:** The service path reaches a polished, sellable Customer Zero faster while proving the shared platform core.
- **Consequence:** Commerce remains on the roadmap but must not distract from completing the services-first critical path.
- **Source:** `docs/SERVICES_FIRST_DELIVERY_PLAN.md`

## 2026-08-25 — RAVA TEAM is Customer Zero

- **Decision:** `ravateam.ir` is the first real service-site customer and must use the same tenant, template, content, preview, release, backup and rollback paths as later customers.
- **Reason:** A bespoke bypass would hide platform defects and fail to prove repeatability.
- **Consequence:** No direct special-case Production path for RAVA TEAM.
- **Source:** `docs/RAVA_PLATFORM_VISION.md`, `docs/SERVICES_FIRST_DELIVERY_PLAN.md`

## 2026-08-25 — No blank customer sites

- **Decision:** Every provisioned site receives localized, industry-appropriate, versioned starter content marked for review.
- **Reason:** Customers buy a usable outcome, not an empty technical shell.
- **Consequence:** Starter content must never fabricate customers, claims, awards, credentials, prices or results and must remain Draft until human approval.
- **Source:** `docs/RAVA_PLATFORM_VISION.md`, `docs/SERVICES_FIRST_DELIVERY_PLAN.md`

## 2026-08-27 — Setup complexity belongs to the owner team

- **Decision:** Site creation and technical provisioning are owner-team operations. Customers receive a simpler experience limited by permission and entitlement.
- **Reason:** Customers should configure content and approved choices without becoming responsible for platform internals.
- **Consequence:** Every primary outcome needs one canonical path; duplicate actions and unnecessary internal controls must be removed.
- **Source:** `docs/ADMIN_UX_REQUIREMENTS.md`

## 2026-08-30 — Defer Tailwind and Motion adoption

- **Decision:** Do not install Tailwind CSS or Motion merely to consume third-party component libraries.
- **Reason:** RAVA already has CSS Modules/design tokens, current disk capacity is constrained, and a second styling/motion system needs architecture-level justification.
- **Revisit when:** Disk is expanded, specialist design begins, broad shadcn adoption is proposed, or validated complex interaction needs exceed maintainable CSS.
- **Source:** `docs/FRONTEND_DESIGN_DECISIONS.md`

## 2026-08-30 — Selective external design-resource policy

- **Decision:** Evaluate external Skills and UI resources individually; keep lightweight, licensed, non-duplicative knowledge and defer dependency-heavy libraries.
- **Reason:** More tools do not automatically improve quality and can increase context, disk, Build size, vendor coupling and maintenance cost.
- **Consequence:** External component code requires license, accessibility, RTL, performance, architecture and commercial-distribution review before adoption.

## 2026-08-30 — Durable status and decision memory is mandatory

- **Decision:** `docs/PROJECT_STATUS.md` and this decision log must be read before meaningful work and updated when status or durable decisions change.
- **Reason:** The growing project cannot rely on conversation memory or scattered documents to preserve the critical path.
- **Consequence:** `AGENTS.md` enforces the protocol; recorded status never replaces live GitHub, CI, Staging, Production or VPS verification.

