# RAVA Decision Log

## 2026-09-05 — Optional AI providers never block core deployment

- **Decision:** OpenAI credentials are optional runtime configuration. Their absence disables only AI-backed suggestions and must never block the website, Admin, Staging deployment or core health Gates.
- **Behavior:** Compose supplies an empty server-only key when none is configured, the deployment Gate reports `ai_provider_disabled`, and the Admin returns a localized disabled-service message rather than describing the whole system as broken.
- **Security:** No placeholder or fabricated credential is stored. When a real key is later configured it remains server-only in the protected mode-600 environment file.
- **Commercial boundary:** AI remains an optional owner capability and future entitlement; baseline CMS, SEO fields and deployment do not depend on paid provider credit.

## 2026-09-05 — Sector showcase combines a cinematic resting frame with bounded three-dimensional drag

- **Decision:** The commercial-homepage sector showcase uses one uninterrupted, full-width cinematic card at rest. Three-dimensional depth appears only while the visitor actively drags or swipes: the active surface rotates by no more than approximately three degrees, scales no lower than 0.975 and reveals the adjacent sector through direct manipulation. It returns to a flat, readable state after release.
- **Behavior:** Embla Carousel 8.6.0 owns pointer, touch, keyboard-compatible scrolling and looping; its official Autoplay plugin advances every six seconds, resets after interaction and pauses for hover, focus, touch or explicit user pause. Manual pause remains independent from temporary interaction pauses.
- **Accessibility/performance:** The implementation uses bounded CSS transforms rather than WebGL/Three.js. Reduced-motion mode stops autoplay and removes spatial 3D transforms while retaining usable manual controls and complete content.
- **Visual authority:** `.impeccable/mocks/rava-ui-handoff/rava-commercial-carousel-cinematic-drag-approved.png` documents desktop resting, desktop 28% mid-drag and 390px mobile mid-swipe states.
- **Acceptance boundary:** Preview approval authorizes implementation only. The coded result still requires real-browser desktop/mobile captures and owner acceptance before any Staging deployment; Production, DNS and `ravateam.ir` remain unauthorized.

### 2026-09-05 — Superseded depth calibration

- **Superseded:** The original three-degree/0.975-scale drag calibration was technically present but visually imperceptible on the large real carousel and is rejected by the owner.
- **Replacement:** The approved strengthened calibration uses up to 7.5 degrees, 0.965 scale and 18px depth on desktop; up to 4.5 degrees, 0.975 scale and 10px depth on mobile; plus a directional edge, directional shadow and bounded internal parallax. Resting cards remain flat.
- **Visual authority:** `.impeccable/mocks/rava-ui-handoff/rava-commercial-carousel-cinematic-drag-v2-approved.png` documents the approved strengthened desktop and mobile drag states.

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

## 2026-09-04 — V4.4 Hero states use one visual authority per state

- **Decision:** Each Persian Hero interaction state is rendered by one complete, responsive, transparent product image. Semantic hotspots remain in HTML, but CSS must not redraw the signal, selection, trail, panel or plinth already present in that state image.
- **Reason:** The first V4.4 implementation combined a Design-state bitmap with independently positioned CSS overlays. The real Staging capture therefore double-rendered the interaction and diverged materially from the approved four-state preview.
- **Performance boundary:** State media loads through responsive `picture` sources and is covered by a repository CI byte budget. English media remains on the existing localized asset until its own exact V4.4 visual is approved.
- **Gate:** The correction is not visually accepted until fresh real-browser desktop, tablet-width and mobile captures—including all four states—match the approved previews.
- **Source:** `.impeccable/mocks/rava-flagship-v4-4-interactions-approved.png`, `app/components/RavaLivingSystemPage.tsx`, `config/frontend-performance-budgets.json`

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

## 2026-09-02 — Tooling must reduce work, never become the work

- **Decision:** RPIM, Skill discovery and durable-memory updates remain lightweight supporting tools, but each task must prioritize one visible or verifiable product outcome. Navigation helpers run only within a bounded scope and cannot block direct scoped implementation when their runtime is unavailable.
- **Reason:** The owner correctly identified that repeated process steps and status cycles were consuming attention without consistently advancing the visible website. Evidence showed RPIM and the Skill Scout were not the cause of the rejected visual; the actual failure was layering new CSS over rejected assets and skipping post-implementation visual comparison.
- **Consequence:** Keep RPIM and the Skill Scout because they reduce broad scanning, but batch checks and memory updates, avoid redundant checkpoints, and require real-browser comparison before any visual-success claim.
- **Source:** Owner feedback, `AGENTS.md`, `scripts/rpim.mjs`, `tools/codex-skills/rava-skill-scout/`

## 2026-09-02 — Interactive RAVA product Hero approved as a polishable design base

- **Decision:** The owner approved the resting and pointer-active desktop previews as the new design base for the RAVA TEAM flagship Hero.
- **Visual authority:** `.impeccable/mocks/rava-flagship-interactive-hero-v1-rest.png` and `.impeccable/mocks/rava-flagship-interactive-hero-v1-active.png`.
- **Interaction:** The central RAVA product console presents the real content, design, preview and publish workflow. Pointer activation adds a restrained local light path and product response rather than unrelated decoration or a page-wide effect.
- **Polish boundary:** Typography, optical material, spacing, iconography and motion choreography may be refined later, but polish must preserve the approved composition and RAVA-centered product story. Any material redesign requires a new visual approval.
- **Content boundary:** Public capability presentation must remain truthful and capability-led; unsupported metrics, testimonials, awards, customers and decorative non-RAVA product imagery are prohibited.
- **Gate:** This is pre-implementation approval only. Exact mobile and open-navigation states still require approval, followed by real coded desktop/mobile/state captures and separate implementation acceptance before any Production action.
- **Source:** Owner approval on 2026-09-02.

## 2026-09-02 — Interactive flagship mobile base approved

- **Decision:** The owner approved the resting and tap-active mobile previews as the responsive design base for the RAVA TEAM flagship Hero.
- **Visual authority:** `.impeccable/mocks/rava-flagship-interactive-hero-v1-mobile-rest.png` and `.impeccable/mocks/rava-flagship-interactive-hero-v1-mobile-active.png`.
- **Responsive boundary:** Mobile uses a genuine one-column, thumb-friendly product console rather than a compressed desktop dashboard.
- **Gamification:** Tapping the four-stage journey progressively activates the path and changes the console to the selected truthful RAVA capability; it does not introduce points, invented achievements or distracting game mechanics.
- **Gate:** Mobile approval remains pre-implementation. Open-navigation states and later real-browser implementation captures still require separate owner approval.
- **Source:** Owner approval on 2026-09-02.

## 2026-09-02 — Interactive flagship navigation states approved

- **Decision:** The owner advanced past and thereby approved the exact desktop Mega Menu and mobile navigation-drawer previews for the interactive flagship base.
- **Visual authority:** `.impeccable/mocks/rava-flagship-interactive-hero-v1-menu-desktop.png` and `.impeccable/mocks/rava-flagship-interactive-hero-v1-menu-mobile.png`.
- **Behavior:** Navigation is closed by default and opens only after an explicit click or tap. Desktop uses a structured capability Mega Menu; mobile uses a touch-sized drawer with the Platform group expanded.
- **Logo boundary:** The current RAVA mark is provisional. The owner is designing the final logo; its later placement and motion treatment require asset inspection and visual approval and must not disturb the approved layout hierarchy.
- **Gate:** Final polish and real coded captures still require separate owner acceptance before Production.
- **Source:** Owner direction on 2026-09-02.

## 2026-09-02 — Flagship styling has one cascade authority

- **Decision:** The RAVA Living System renderer imports one consolidated stylesheet for its active visual version. New visual passes must not be appended before or after legacy authority blocks in the same cascade.
- **Reason:** The first interactive Staging capture proved that individually correct rules can still produce a rejected composition when later historical blocks override geometry and responsive behavior.
- **Consequence:** `rava-living-system-v2.module.css` owns the active Hero, navigation, product console, Journey and lower-page presentation. The former stylesheet remains only as rollback/history evidence until safe deprecation; it is not imported by the active renderer.
- **Gate:** A clean Build is insufficient. Desktop, mobile, open-menu and interactive browser captures must be compared with the approved visual base before acceptance.
- **Source:** Owner-supplied Staging capture and CSS cascade inspection on 2026-09-02.

## 2026-09-03 — RAVA flagship V3 visual system approved before implementation

- **Decision:** The owner explicitly approved the complete V3 desktop, mobile, desktop open-Mega-Menu and mobile open-menu previews as the replacement implementation authority for the RAVA TEAM flagship.
- **Visual authority:** `.impeccable/mocks/rava-flagship-v3-desktop-closed-approved.png`, `.impeccable/mocks/rava-flagship-v3-mobile-closed-approved.png`, `.impeccable/mocks/rava-flagship-v3-desktop-menu-approved.png` and `.impeccable/mocks/rava-flagship-v3-mobile-menu-approved.png`.
- **Required product truth:** The Hero centers a legible RAVA dashboard with real modules, project and release state; navigation is readable optical glass; Hero copy never overlaps the product; device previews and release rail remain in bounds; Journey stages are distinct; the final CTA uses the RAVA navy/pearl/cobalt system.
- **Supersedes:** The V1 interactive previews remain design history, while V3 is the current implementation authority. Deployed commit `19af1da` remains visually rejected.
- **Acceptance boundary:** This approval authorizes implementation only. Complete Gates, real coded desktop/mobile/menu captures and separate owner implementation acceptance are required before another Staging deployment.
- **Source:** Owner approval on 2026-09-03.

## 2026-09-03 — Single mountain-console Hero supersedes the V3 device cluster

- **Decision:** The flagship Hero uses one monolithic dark-glass RAVA product display with the navy mountain website preview, a quiet pearl field, a realistic contact shadow and a concave transition into the navy Journey. The separate desktop/tablet/mobile device cluster is removed from the Hero.
- **Visual authority:** `.impeccable/mocks/rava-flagship-v4-hero-desktop-rest-approved.png`, `.impeccable/mocks/rava-flagship-v4-hero-desktop-design-approved.png` and `.impeccable/mocks/rava-flagship-v4-hero-mobile-rest-approved.png`.
- **Interaction:** The four content/design/preview/publish nodes remain real pointer, touch and keyboard targets. Activation moves one restrained cobalt signal; the design state adds a small local selection treatment. Initial navigation remains closed.
- **Localization and performance:** Persian and English receive dedicated localized desktop/mobile media; English media must contain no Persian script. Critical media remains CI-budgeted and the interaction must honor reduced motion.
- **Supersedes:** The V3 three-device Hero composition at `b721072`. V3 remains deployment history, not the current visual target. Lower-page V3 sections are outside this Hero-only decision.
- **Acceptance boundary:** The approved mock authorizes implementation, not acceptance. Full Gates and real coded desktop/mobile/rest/active captures must be reviewed before Staging deployment; Production, DNS and `ravateam.ir` remain unauthorized.
- **Source:** Owner approvals and selected mountain direction on 2026-09-03.

## 2026-09-03 — Controlled three-dimensional Hero polish approved

- **Decision:** Add depth selectively to the V4 Hero through material edges, refraction, elevation and contact shadows. The optical-glass navigation, tactile CTA controls and monolithic product display receive distinct depth levels; the display sits on a thin pearl/smoked-glass plinth with a deeper shadow and restrained cobalt underglow.
- **Visual authority:** `.impeccable/mocks/rava-flagship-v4-1-depth-desktop-approved.png`, `.impeccable/mocks/rava-flagship-v4-1-depth-mobile-approved.png` and `.impeccable/mocks/rava-flagship-v4-1-hover-approved.png`.
- **Legibility:** Important product-screen labels, the four-stage journey and mountain-site content must remain visibly sharp and high contrast at the delivered desktop and mobile sizes.
- **Gamification:** Hover, focus, tap or click may activate a subtle stage glow, light trail and local content selection. Points, invented achievements, mascots, confetti and attention-seeking perpetual motion remain excluded.
- **Performance/accessibility:** Prefer transform/opacity and static CSS material layers; avoid continuous canvas/WebGL work and honor reduced-motion preferences.
- **Acceptance boundary:** The preview authorizes implementation only. Full Gates and a fresh real-browser comparison remain mandatory before implementation acceptance or another Staging deployment.
- **Source:** Owner approval on 2026-09-03.

## 2026-09-03 — V4.2 removes the false underlight and duplicate curve

- **Decision:** The V4.1 real-browser result is rejected and must not be promoted. V4.2 uses exactly one solid pearl-to-navy concave transition, one natural contact shadow and no luminous element beneath the display platform.
- **Visual authority:** `.impeccable/mocks/rava-flagship-v4-2-desktop-approved.png` and `.impeccable/mocks/rava-flagship-v4-2-mobile-approved.png`.
- **Gamification boundary:** Cobalt feedback is confined to the product screen: active-stage halo, a thin internal path and local selection handles. No light source may appear below the product.
- **Media boundary:** The product render must blend into the continuous pearl Hero field without a visible rectangular asset boundary.
- **Navigation:** Hover uses a minimal optical lens, a one-pixel cobalt glint and a two-pixel lift; bulky capsules and broad bloom are rejected.
- **Acceptance boundary:** This approval authorizes implementation only. Full Gates and fresh coded desktop/mobile captures remain required before implementation acceptance or another Staging deployment.
- **Source:** Owner review of the isolated Staging capture and explicit V4.2 approval on 2026-09-03.

## 2026-09-03 — V4.3 unifies the Hero surface and isolates its interaction

- **Decision:** V4.2 remains rejected as a final implementation. V4.3 removes the enclosing navigation-hover frame while preserving the short cobalt glint, uses one continuous depth-bearing pearl Hero surface, and treats the product display and its platform as one aligned object.
- **Visual authority:** `.impeccable/mocks/rava-flagship-v4-3-desktop-approved.png`.
- **Interaction boundary:** All Hero hotspots, paths, selections and feedback must be clipped to the actual screen region. Hero state and the lower Journey-card state are independent; operating one must never open or mutate the other.
- **Responsive boundary:** The same containment and state isolation apply on mobile. A real coded desktop/mobile comparison remains required before implementation acceptance.
- **Acceptance boundary:** This approval authorizes implementation only. Push, CI, Staging deployment and final visual acceptance remain separate Gates.
- **Source:** Owner review of the V4.2 isolated Staging capture and explicit instruction to implement the V4.3 corrections on 2026-09-03.

## 2026-09-03 — V4.4 visual authority is exact and regression-gated

- **Decision:** The desktop, four-state interaction and mobile V4.4 previews are approved as exact implementation authority. Composition, relative scale, copy, navigation, unified pearl field, integrated display/plinth/shadow, concave transition and in-screen interaction may not be reinterpreted during implementation.
- **Visual authority:** `.impeccable/mocks/rava-flagship-v4-4-desktop-approved.png`, `.impeccable/mocks/rava-flagship-v4-4-interactions-approved.png` and `.impeccable/mocks/rava-flagship-v4-4-mobile-approved.png`.
- **Implementation boundary:** Display, platform and contact shadow are one transparent responsive media system. Content, design, preview and publish each produce a distinct local state, and every effect is clipped inside the physical screen.
- **Regression Gate:** Coded captures at 1536, 1240, 820 and 390 pixels plus resting and all four active states must be compared with the approved references. A passing Build alone is insufficient.
- **Localization:** Persian V4.4 is authorized by the shown references. English remains on its safe prior media until an equivalent English V4.4 preview is reviewed; Persian pixels must never leak into English mode.
- **Source:** Owner's explicit approval of all three V4.4 previews on 2026-09-03.

## 2026-09-04 — Commercial homepage replaces the gamified Hero workstream

- **Decision:** Retire the flagship Hero's display gamification, hotspots and four-state light-trail interaction. The RAVA TEAM homepage is designed and evaluated as one commercial journey rather than an isolated Hero: clear promise, sector discovery, distinct Template showcase, content-ready delivery, simple customer path, platform proof, craft evidence, objections and one conversion path.
- **Design principle:** No color, device metaphor or prior visual treatment is sacred. Contemporary design quality, product truth, conversion clarity, accessibility, performance, localization and CMS manageability decide what remains.
- **Slider:** Sector discovery uses one large manual image slider immediately after the static Hero. It has no autoplay, shows a controlled edge of adjacent work, supports pointer/touch/keyboard operation and gives each sector a materially distinct visual direction.
- **Visual base:** `.impeccable/mocks/rava-ui-handoff/rava-commercial-homepage-desktop-base-approved.png` is approved as a starting base, not final polish. Generated photography and microcopy are illustrative and cannot become client proof or immutable text assets.
- **Implementation boundary:** Public copy and media remain CMS-driven where corresponding blocks exist. Template geometry, responsive behavior and accessibility constraints remain controlled by the versioned Template. Real coded desktop/mobile captures and separate owner acceptance remain mandatory before deployment.
- **Supersedes:** The interactive portions of the 2026-09-02 and 2026-09-03 V4 Hero decisions are historical evidence only and no longer active visual authority.
- **Source:** Owner direction and approval to begin implementation on 2026-09-04.

## 2026-09-05 — Commercial homepage Hero and sector showcase polish approved

- **Decision:** The owner approved the exact desktop and mobile polish previews for the first commercial-homepage slice. They replace the rough Base geometry for navigation, Hero, curve and sector showcase without changing the broader commercial narrative.
- **Visual authority:** `.impeccable/mocks/rava-ui-handoff/rava-commercial-homepage-polish-desktop-approved.png` and `.impeccable/mocks/rava-ui-handoff/rava-commercial-homepage-polish-mobile-approved.png`.
- **Required corrections:** Every CTA has a visible label; the Hero uses a compact, continuous pearl field and a real RAVA service-site canvas; the navy transition is shallow; the sector showcase uses one manual control set and a text-free adjacent-slide cue; the initial healthcare slide uses truthful illustrative content without claims or statistics.
- **Responsive boundary:** Mobile uses a closed compact menu, stacked Hero and one complete sector card with 44-pixel controls. It is an intentional mobile composition, not a compressed desktop layout.
- **Performance boundary:** Static optimized media is preferred; there is no autoplay, gamification, continuous animation, Canvas or WebGL requirement.
- **Acceptance boundary:** Preview approval authorizes implementation only. A real coded desktop/mobile capture and pointer, touch and keyboard checks are still required before implementation acceptance, Push or deployment.
- **Source:** Owner's explicit approval on 2026-09-05.

## 2026-09-05 — Commercial sector showcase gains restrained autoplay and distinct imagery

- **Decision:** The owner approved the livelier desktop/mobile previews as the implementation authority for the current commercial Hero and sector showcase.
- **Visual authority:** `.impeccable/mocks/rava-ui-handoff/rava-commercial-homepage-autoplay-desktop-approved.png` and `.impeccable/mocks/rava-ui-handoff/rava-commercial-homepage-autoplay-mobile-approved.png`.
- **Carousel behavior:** Advance every six seconds; pause while hovered, focused or touched; restart timing after a manual slide change; expose a visible pause/resume control; disable autoplay for `prefers-reduced-motion`.
- **Composition:** Remove the detached adjacent-slide rectangle entirely. Show one complete art-directed sector card, one timer line and one control group.
- **Media:** Professional services, health and education use three distinct project-owned editorial WebP images. Generated people are illustrative Template subjects, never represented as RAVA staff, customers or endorsements.
- **Acceptance boundary:** Full repository Gates and loopback checks do not replace a real coded desktop/mobile browser comparison and interaction review. Push and deployment remain separate actions.
- **Source:** Owner's explicit approval on 2026-09-05.
