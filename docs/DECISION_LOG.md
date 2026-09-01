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

## 2026-08-30 — Bounded Skill discovery before third-party installation

- **Decision:** Use the repository-owned `rava-skill-scout` workflow when a required capability is not covered by installed Skills. Search installed and official catalogs first, then use a metadata-first, cached, tightly bounded GitHub search.
- **Reason:** Targeted discovery can improve capability without repeatedly scanning large repositories, wasting context, filling the constrained VPS disk, or installing poorly licensed and unsafe dependencies.
- **Consequence:** Ordinary discovery is capped at ten code matches, five repositories and three deep reviews. No candidate is installed, executed or added to the application without explicit approval.
- **Source:** `tools/codex-skills/rava-skill-scout/`

## 2026-08-30 — Dynamic Horizon v2 uses an original editorial-cinematic direction

- **Decision:** Evolve `rava-service-horizon` through a separate version 2 renderer contract rather than silently restyling version 1. The direction combines an original dark editorial composition, a controlled WebGL hero, a visible project journey and restrained electric accents.
- **Reason:** A premium Template must change the complete visual system, not only the Hero background, while immutable versions remain necessary for honest preview and rollback.
- **Consequence:** Version 1 remains selectable through history and rollback. Version 2 activates only when its exact Template Version is applied. Stripe/Webflow references informed hierarchy and service trust, but no identity, layout, proprietary font, asset or copy was cloned.
- **Motion boundary:** ThreeUI remains limited to the Hero with static/reduced-motion fallbacks. GSAP and a smooth-scroll dependency are deferred until the constrained VPS has capacity and a validated interaction need justifies their runtime and maintenance cost.
- **Source:** `app/components/PublicPageView.tsx`, `app/[slug]/public-page.module.css`, `supabase/migrations/20260830131500_service_horizon_v2.sql`

## 2026-09-01 — Template diversity is a gated commercial portfolio

- **Decision:** RAVA Templates must occupy distinct visual, interaction and commercial territories. Recoloring, font swapping, Hero replacement or reordering the same component stack does not qualify as a new Template.
- **Reason:** A visually repetitive catalog creates false choice, weakens RAVA's differentiation and cannot credibly serve varied industries, buyer expectations and budgets.
- **Consequence:** Every Template needs an approved admission brief, Independence Gate, commercial scorecard, complete page family and release evidence. Templates remain separate from reusable Industry Packs and verified Brand Profiles.
- **Customer boundary:** Customers manage content, brand choices and approved layout variants inside Template-enforced constraints. Template engineering, advanced configuration and release controls remain with explicitly authorized RAVA personnel.
- **Source:** `docs/TEMPLATE_PORTFOLIO_STANDARD.md`

## 2026-09-01 — RAVA Living System D is the Customer Zero flagship foundation

- **Decision:** Build owner-approved Comp D first as the RAVA TEAM flagship foundation. Preserve A, B and C as sequential future Presets in the same RAVA Digital Atelier family rather than implementing all four simultaneously.
- **Reason:** D provides the clearest commercial Hero and product explanation while supporting a focused cinematic platform chapter. Sequential delivery prevents unresolved navigation, optical-material, accessibility, motion and responsive defects from multiplying across four Presets.
- **Quality boundary:** The Comp establishes topology and hierarchy, not a ceiling. Implementation must improve Navbar, Mega Menu, typography, motion, responsive composition and truthful RAVA content without silently replacing the approved visual world.
- **Legacy boundary:** Previous Templates must not be physically deleted while revisions, releases, active sites or rollback paths reference them. After D passes Staging acceptance, legacy Templates are removed from new selection and marked deprecated/archived while their renderers and immutable history remain available for migration and rollback.
- **Source:** `DESIGN.md`, `.impeccable/mocks/rava-living-system-d.png`, `docs/RAVA_FLAGSHIP_PRESET_ROADMAP.md`

## 2026-09-01 — Flagship imagery must explain RAVA

- **Decision:** Every image used by the RAVA TEAM flagship must express RAVA branding or a truthful product capability. Decorative imagery without a direct relationship to RAVA is excluded.
- **Capability set:** Page building, bilingual content, brand design, SEO intelligence, responsive preview, safe publishing and multi-site operation are the primary visual subjects. Exact interface labels and controls remain code-rendered for accessibility and localization.
- **Supersedes:** The interior still-life plates prepared during initial Comp D asset extraction. Their lamp, stone and cup subject matter is rejected for the flagship because it implies an unrelated architecture/interior brand.
- **Source:** Owner direction and `assets/plates/*.prompt.txt`

## 2026-09-01 — Premium visuals must remain inside an enforced performance budget

- **Decision:** Treat frontend performance as a release Gate for RAVA Templates. Static Hero imagery is pre-compressed, delivered without runtime image-transformation work, and checked against repository-owned byte budgets in CI.
- **Current budget:** RAVA Living System Hero media must remain at or below 320 KiB combined and 120 KiB per delivered asset. The increase from the initial 220 KiB budget explicitly funds the owner-requested, product-specific creative-workspace background; source-quality files may remain for reproduction but must not be the normal browser payload.
- **Runtime boundary:** Static Templates do not receive continuous RAF, WebGL, canvas, marquee or timer loops by default. Any future exception requires measured value, visibility gating, reduced-motion fallback, complete cleanup and a separate performance review.
- **Reason:** RAVA must deliver world-class visual quality without unnecessary server transformation cost, mobile jank, long-session CPU/GPU load or uncontrolled asset growth.
- **Source:** `docs/FRONTEND_PERFORMANCE_BUDGET.md`, `config/frontend-performance-budgets.json`
