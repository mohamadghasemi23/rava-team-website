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

## 2026-09-01 — D2 replaces D as the flagship Hero and Journey visual authority

- **Decision:** The owner explicitly approved both the closed-navigation D2 capture and its open optical Mega Menu interaction state as the exact visual authority for the RAVA Living System Hero and Journey.
- **Supersedes:** The original D bitmap for implementation measurement. D remains preserved as historical concept evidence, but its unrelated interior subject is no longer a fidelity target.
- **Boundary:** D2 approves the captured Hero, navigation, product composition, creative-workspace background and four-act Journey. It does not silently approve or define the unfinished lower page family.
- **Gate:** Rebuild the measured spec against D2 and rerun the Hero Gate at the existing 72% threshold; never lower the threshold to manufacture a pass.
- **Source:** `.impeccable/mocks/rava-living-system-d2-candidate.png`, `.impeccable/mocks/rava-living-system-d2-menu-candidate.png`

## 2026-09-02 — Original D composition restored; cup removal was the only requested visual change

- **Decision:** The original RAVA Living System D composition is restored as the exact visual authority for the flagship Hero and Journey. Only the prominent cup and saucer on the upper page-builder canvas are removed; the navigation, open Mega Menu, layout density, perspective editor, lamp, stone forms, responsive-device column, release rail and cinematic four-stage Journey remain part of the approved design.
- **Reason:** The owner clarified that the earlier request was limited to removing the cup, not replacing the overall design. The D2 redesign therefore exceeded the authorized visual scope.
- **Supersedes:** The 2026-09-01 decision that D2 replaces D as visual authority. D2 remains preserved as historical work but is no longer the fidelity target.
- **Implementation boundary:** Rebuild the approved composition with semantic, bilingual, CMS-driven HTML and optimized assets; do not ship the comp itself as a flattened webpage. A fresh desktop/mobile fidelity review is mandatory.
- **Source:** `.impeccable/mocks/rava-living-system-d-cup-removed.png`

## 2026-09-02 — Flagship Mega Menu is closed by default

- **Decision:** The RAVA flagship navigation and Mega Menu render closed on initial page load, including the isolated design-preview route. The menu opens only after an explicit user action.
- **Reason:** The open menu in the visual comp demonstrates the interaction design but must not obscure the primary Hero or imply an automatic expanded state.
- **Consequence:** Open-menu imagery remains interaction documentation only; it is not the default page state. Keyboard and pointer activation retain the native disclosure behavior.
- **Source:** `app/design-preview/rava-living-system/page.tsx`, `.impeccable/surfaces/rava-flagship.md`

## 2026-09-02 — Exact visual approval precedes every user-facing implementation

- **Decision:** No new or materially changed page, section, component, navigation, responsive composition or important interaction state is implemented until the owner has seen and explicitly approved its exact visual preview. Desktop, mobile and applicable interaction states are shown before implementation whenever practical. After coding, real-browser captures require a separate implementation-acceptance decision.
- **Reason:** Written descriptions and partial references allowed implementation assumptions to diverge from the owner's intended result, wasting time and creating visually inconsistent work.
- **Consequence:** Inspiration is not approval; a mock is not an accepted implementation; passing Build is not visual acceptance. Rejected visuals are recorded and cannot be deployed or silently reused as authority.
- **Immediate disposition:** Commit `4b07df8` is visually rejected. It must not be deployed or treated as the flagship baseline.
- **Source:** Owner instruction, `AGENTS.md`, `.impeccable/surfaces/rava-flagship.md`

## 2026-09-02 — New RAVA flagship desktop Base approved

- **Decision:** The owner explicitly approved `.impeccable/mocks/rava-flagship-base-v1.png` as the desktop, closed-navigation visual Base for the RAVA TEAM flagship.
- **Scope:** The approval covers the desktop composition, RAVA-centered product canvas, optical navigation, pronounced curved transition and four-stage Journey. It does not yet approve the mobile adaptation, open-Mega-Menu state or any coded implementation.
- **Gate:** `.impeccable/mocks/rava-flagship-base-v1-mobile.png` and `.impeccable/mocks/rava-flagship-base-v1-menu-open.png` must receive explicit owner approval before implementation begins; real-browser captures remain a separate post-implementation acceptance Gate.
- **Supersedes:** The restored cup-removed D bitmap as the active desktop implementation target. That reference remains preserved as design history.
- **Source:** Owner approval and `.impeccable/surfaces/rava-flagship.md`

## 2026-09-02 — Flagship mobile and open-menu visuals approved

- **Decision:** The owner explicitly approved `.impeccable/mocks/rava-flagship-base-v1-mobile.png` and `.impeccable/mocks/rava-flagship-base-v1-menu-open.png` alongside the approved desktop Base.
- **Consequence:** These three images are now the complete pre-implementation authority for the flagship Hero, responsive composition and Platform Mega Menu. The default navigation remains closed; the open-menu visual documents only the state after user activation.
- **Acceptance boundary:** Code, Build success and Staging health do not establish visual fidelity. Fresh real-browser desktop, mobile and open-menu captures must be shown and explicitly accepted after implementation.
- **Source:** Owner approval and `.impeccable/surfaces/rava-flagship.md`
