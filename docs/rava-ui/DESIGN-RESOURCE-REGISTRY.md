# RAVA Design Resource Registry

This registry records external design resources considered for RAVA. Listing a resource does not authorize copying, installing dependencies, changing the approved visual authority, or implementing UI without the owner visual approval Gate.

## Evaluation rules

- Use references to extract transferable principles, not proprietary identity, copy, imagery, fonts or signature compositions.
- Prefer resources that improve visual direction, interaction quality, responsive behavior, accessibility or implementation precision.
- Verify licensing before importing code or assets.
- Keep RAVA bilingual, tenant-aware, themeable, versioned, performance-budgeted and compatible with preview/rollback.
- For every material visual change: exact preview first, owner approval second, implementation third, coded browser comparison fourth.

## Registered resources

## Template-foundation policy

RAVA Template families should be sourced from complete, professionally implemented foundations rather than designed from a blank canvas. Candidate foundations are screened for framework compatibility, license/redistribution rights, design quality, responsive states, accessibility, performance, maintenance and adaptation cost. Accepted code is imported selectively and mapped to RAVA's CMS and platform contracts; the source repository and exact license are recorded for every release.

Good discovery pools include the [Vercel Next.js Template marketplace](https://vercel.com/templates/next.js) and individually verified GitHub repositories. Every candidate retains its own license review: inclusion in a marketplace does not grant uniform reuse or redistribution rights.

### Refero Styles

- **URL:** https://styles.refero.design/
- **Type:** Searchable design-reference and `DESIGN.md` library for AI-assisted workflows; not an installable RAVA dependency.
- **Observed offering:** More than 2,000 AI-readable design-system examples covering colors, typography, spacing, components, design rules, screenshots and selected interaction/video references from public product websites.
- **Best RAVA uses:** Shortlist visual directions by page/industry; compare typography, spacing, surface, navigation, carousel and motion patterns; translate selected principles into an original RAVA design specification before visual generation or implementation.
- **Especially relevant to:** Distinct Template families, the RAVA commercial homepage, Admin clarity, responsive states and future sector-specific design research.
- **Guardrails:** Do not copy a source brand, proprietary font, marketing copy, imagery or distinctive trade dress. Do not mix fragments from many references into an incoherent collage. Verify any downloadable asset or code license separately.
- **Workflow status:** Registered and approved for bounded design research. Nothing installed and no runtime dependency added.

### Full Stack FastAPI Template

- **URL:** https://github.com/fastapi/full-stack-fastapi-template
- **Type:** MIT-licensed full-stack application starter maintained under the FastAPI organization; not a design Skill and not a drop-in RAVA module.
- **Observed stack:** FastAPI, SQLModel, Pydantic and PostgreSQL backend; React, TypeScript, Vite, Tailwind CSS and shadcn/ui frontend; Playwright and Pytest testing; generated API client; Docker Compose, Traefik, Mailpit, React Email and GitHub Actions.
- **Best RAVA uses:** Architectural reference for typed/versionable APIs, request validation, generated clients, end-to-end testing, local email testing, password-recovery flows and self-hosted Compose documentation.
- **Mismatch with RAVA:** RAVA currently uses Next.js plus self-hosted Supabase/PostgreSQL/Auth and its own tenant, permission, entitlement, audit and localization contracts. Installing this Template would introduce a parallel backend, ORM, authentication path, frontend build system and proxy, increasing disk use and architectural duplication.
- **Guardrails:** Do not install, scaffold or merge this Template into the active application. Borrow only individually reviewed patterns whose licenses and security boundaries fit RAVA. Do not replace Supabase Auth/RLS or trusted database authorization with its generic JWT/item examples.
- **Workflow status:** Registered as a selective backend/testing reference. Rejected as a wholesale dependency or platform foundation.

### Swiper

- **URLs:** https://swiperjs.com/react and https://swiperjs.com/swiper-mcp
- **Type:** MIT-licensed, modular touch-slider runtime with official React components, documented effects and an official read-only documentation/demo MCP endpoint.
- **Approved RAVA uses:** Three-dimensional and cinematic carousels using `EffectCreative`, `EffectCoverflow` or `EffectCards`; drag/swipe, autoplay, keyboard navigation, pagination and accessibility through official modules rather than hand-built gesture math.
- **Integration rule:** Import only required modules and CSS. Preserve reduced-motion behavior, semantic content, responsive review and the RAVA performance budget. Do not use Swiper Studio or premium output unless separately approved and licensed.
- **Workflow status:** `swiper@14.2.0` is manifest-pinned and locally available; the global `swiper` MCP points to `https://swiperjs.com/mcp`. Embla remains temporarily installed until an owner-approved Swiper preview replaces the current implementation.

## Complete Template candidates — first screening

> **Owner verdict (2026-09-05): Rejected.** The three candidates below were judged visually too weak for RAVA. They remain only as screening history and must not be presented again as flagship directions.

### Bigspring Light Next.js

- **Source/demo:** https://github.com/themefisher/bigspring-light-nextjs and https://bigspring-light-nextjs.vercel.app/
- **License:** MIT for code; bundled demonstration images are explicitly not licensed for reuse.
- **Fit:** Strong structural candidate: Next.js 16.2, React 19, Tailwind 4, Swiper 14, nine-plus pages, blog, contact, features, FAQ, pricing, legal pages, SEO and responsive implementation.
- **Assessment:** Highest compatibility and lowest integration risk in the first screening. Its stock visual identity is not sufficiently distinctive for flagship RAVA, so it is suitable as a page/component foundation only after an approved visual-direction pass and replacement of all demo imagery.

### Creative Agency Portfolio by Terminal Blank

- **Source:** https://github.com/Terminal-Blank/creative-agency-portfolio
- **License:** MIT.
- **Fit:** Next.js 15, React 19, Tailwind 4 and Framer Motion; includes Hero, service Bento grid, work, testimonials, team and contact sections with glass/gradient/motion styling.
- **Assessment:** More expressive than Bigspring and straightforward to port, but it is a young, low-adoption single-page repository with less production evidence and fewer complete site pages. Visual and accessibility review are mandatory before selection.

### Nextly

- **Source/demo:** https://github.com/web3templates/nextly-template and http://nextly.web3templates.com/
- **License:** MIT.
- **Fit:** Next.js 14, React 18, Tailwind 3, Headless UI and a complete responsive marketing-page structure.
- **Assessment:** Clean and legally reusable, but its technology and visual language are older than RAVA's current baseline. Retain as a simple fallback or source of content structure, not the leading flagship candidate.

## Rejected during first screening

- **Cruip Open:** polished and complete, but its stated terms prohibit republishing, redistribution or resale of the Template; unsuitable as a multi-customer RAVA Template foundation.
- **Blazity Next SaaS Starter:** MIT and feature-rich, but built around Next.js 12/React 17 plus TinaCMS, SendGrid and styled-components. Integration would import obsolete and duplicate infrastructure.
- **next-startd:** MIT but based on Next.js 10/React 17 and obsolete dependencies; rejected for the active platform.

## High-craft source pool — second screening

### Claude Directory

- **Source:** https://github.com/pulkitxm/claude-directory
- **License:** MIT at repository root; bundled fonts and media still require an asset-level provenance check before redistribution.
- **Observed offering:** Hundreds of self-contained landing pages, complete Templates, Heroes, motion studies and Three.js/WebGL experiments. Each project includes its originating prompt and a recorded working demo; many also vendor their assets for offline use.
- **Best RAVA use:** Source complete visual foundations and proven interaction/component patterns instead of repeatedly rebuilding them from scratch. Port selected code into RAVA's existing Next.js, CMS, localization, tenancy, Template-versioning and accessibility contracts rather than importing a second application architecture.
- **Quality warning:** The repository explicitly identifies the projects as AI-generated and requires code, dependency, accessibility and responsive review before production use. A polished demo is candidate evidence, not implementation proof.
- **Workflow status:** Approved as a bounded discovery and code-source pool. No Template has been imported yet.

### Second-screening finalists

1. **Superdesign Cinematic Agency** — dark cinematic agency foundation with a 3D rolodex Hero, case-study bento, commercial pricing/calculator journey and editorial close. Strongest expressive option for a creative RAVA Template family, but its rotating Hero and oversized typography require Persian/RTL and performance adaptation.
   - Preview: https://github.com/pulkitxm/claude-directory/blob/main/templates/superdesign-cinematic-agency/demo.mp4
   - Code: https://github.com/pulkitxm/claude-directory/tree/main/templates/superdesign-cinematic-agency
2. **Velvet Vellum Agency** — quiet-luxury editorial agency foundation on warm paper and oxblood, with restrained interactions, work bento, method, testimonials and perspective-grid footer. Strongest minimal, premium service-business direction; factual proof sections must remain hidden until RAVA receives verified evidence.
   - Preview: https://github.com/pulkitxm/claude-directory/blob/main/landing-pages/velvet-vellum-agency-h4/demo.mp4
   - Code: https://github.com/pulkitxm/claude-directory/tree/main/landing-pages/velvet-vellum-agency-h4
3. **Paper Circuit Agentic SaaS** — light paper/blueprint product foundation with a complete product mockup, controlled pointer depth, bento capabilities, enterprise narrative and commercial CTA flow. Strongest structural match for selling the RAVA Platform, subject to removing AI-category language and replacing every mock product claim with real RAVA capability.
   - Preview: https://github.com/pulkitxm/claude-directory/blob/main/landing-pages/paper-circuit-agentic-saas-h16/demo.mp4
   - Code: https://github.com/pulkitxm/claude-directory/tree/main/landing-pages/paper-circuit-agentic-saas-h16

### Not promoted from the second screening

- **Enterprise Admin SaaS:** technically relevant but visually too close to a conventional corporate security dashboard; retain only as a source of enterprise proof-section patterns.
- **Flux Editorial SaaS:** distinctive but intentionally loud and brutalist; unsuitable for the current flagship's restrained premium brief, though it may inform a future high-energy Template family.
- **Superdesign Modern Atmospheric:** polished but visually category-generic for contemporary AI tools and dependent on familiar glow/glass tropes.
- **Obsidian Elite:** strong monochrome art direction but optimized for an invite-only waitlist rather than RAVA's service-and-platform commercial journey.

### Additional high-craft candidates

4. **Superdesign Studio Editorial** — strict black-and-white creative-studio foundation driven by large editorial typography, per-letter reveals, a motion marquee and grayscale-to-color project work. It offers a materially different portfolio-led Template family for creative agencies, photographers and personal brands. The custom cursor must become progressive enhancement and all motion must honor keyboard, touch and reduced-motion behavior.
   - Preview: https://github.com/pulkitxm/claude-directory/blob/main/templates/superdesign-studio-editorial/demo.mp4
   - Code: https://github.com/pulkitxm/claude-directory/tree/main/templates/superdesign-studio-editorial
5. **Super Design Industrial System** — warm industrial/editorial foundation with a structural 12-column grid, split Hero, interactive project list, clip-path media reveals, technical journal and large dark footer. It is the strongest systems-and-craft direction in this round and could demonstrate RAVA's design, content and platform capability without resembling a conventional SaaS landing page.
   - Preview: https://github.com/pulkitxm/claude-directory/blob/main/templates/super-design-industrial-system/demo.mp4
   - Code: https://github.com/pulkitxm/claude-directory/tree/main/templates/super-design-industrial-system
6. **Superdesign Crimson Craft** — dark-luxury, high-ticket service foundation with sticky glass navigation, strong image-led Hero, trust bar, asymmetric service architecture, drag-scroll before/after work and a forceful conversion close. It is a useful foundation for premium service sectors, but fabricated urgency, ROI, avatars and testimonials must be removed until backed by verified customer evidence.
   - Preview: https://github.com/pulkitxm/claude-directory/blob/main/templates/superdesign-crimson-craft/demo.mp4
   - Code: https://github.com/pulkitxm/claude-directory/tree/main/templates/superdesign-crimson-craft
