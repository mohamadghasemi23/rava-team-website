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
