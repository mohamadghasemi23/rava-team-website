# RAVA Admin UX Requirements

This document is the durable acceptance backlog for the owner and customer operating experience. It complements the platform vision and must be updated when usability testing reveals a new requirement.

## Navigation and task flow

- Every primary outcome has one canonical route and one primary action; duplicate buttons with the same destination are prohibited.
- Labels explain the outcome, and consequential operations provide a preview or exact consequence before execution.
- Single-site users never see a site-selection step. Multi-site users use one persistent, explicit active-site switcher.
- Internal platform settings are hidden from customers unless their scoped permission and task require them.

## Access model

- Site creation and technical provisioning are owner-team operations.
- Customers see only authorized sites and capabilities.
- View, edit, approve and publish remain separate permissions.
- Customer complexity is intentionally lower than owner complexity; advanced controls use progressive disclosure.

## Lists and tables

- All data collections use shared RAVA list/table patterns with named columns, readable spacing, consistent row actions and text-plus-icon status.
- Mobile layouts intentionally transform wide tables into readable cards.
- Search, sorting and pagination are provided when collection size requires them.
- Persian dates are Solar Hijri; English dates are Gregorian.
- Empty, loading, error and permission-denied states are explicit.

## Pages and constraint-based builder

- Page creation explains title, URL, parent/menu placement and visibility with examples.
- Templates define allowed block types, required blocks, maximum total blocks, per-type limits and valid ordering; limits are enforced server-side.
- Draft preview is always available without public publishing and supports desktop, tablet and mobile viewports.
- Draft saving and publishing are separate. Unsaved state, save progress and completion are visible.
- New blocks receive safe, localized, industry-aware sample content marked for review. Samples never fabricate credentials, customers, testimonials, results or business facts.
- Galleries use licensed, versioned template assets and never imply that RAVA TEAM work belongs to a customer.

## SEO Core

SEO Core is a baseline product capability, not a promise of rankings. It must grow to cover page titles and descriptions, canonical URLs, robots controls, sitemap, redirects, Open Graph, structured data, internal-link integrity, accessibility/performance signals and safe publishing checks.

- Persian labels use plain language such as “عنوان صفحه در گوگل” and “توضیح صفحه در گوگل”. English labels are independently written for English users.
- Every field includes an example, purpose, recommended range and live preview. Status is never communicated by color alone.
- The system validates lengths and dangerous/inconsistent values server-side while allowing search engines to choose alternate snippets.

## AI SEO assistant

- Owner access starts as an internal capability. Customer access later requires a paid `seo_ai` entitlement, granular permission, usage meter and contract limit.
- AI always follows `Suggest → Diff/Preview → Human Approval → Save`; it never publishes or silently overwrites content.
- The provider is abstracted, server-only and secret-safe. Prompts treat customer content as untrusted data.
- Suggestions are locale-aware, factual, bounded, auditable and must not invent claims or promise rankings.
- The UI shows current and suggested values before the user applies them to editable fields.

## Help and localization

- Every unfamiliar term, field and operation has contextual Persian and English Help with examples and a direct route.
- Persian UI contains no unexplained English product vocabulary; English UI contains no Persian copy.
- RTL/LTR, keyboard access, visible focus, reduced motion and minimum 44px targets are required.
