# RAVA Customer Admin Product Audit

## Status

- Audit date: 2026-09-08
- Scope: authenticated non-platform customer experience across the RAVA Admin Shell
- Evidence: current repository routes, permission registry, Feature Standards, LaunchPad entitlement path, official Shopify Admin guidance, WCAG 2.2 and Supabase authorization guidance
- Implementation state: proposed target model; material navigation/UI changes require approved desktop and mobile previews before implementation

## Product rule

The customer panel is not a reduced copy of the RAVA owner console. It is a Site-scoped workspace for completing ordinary business tasks safely.

Every visible customer destination must satisfy all of these conditions:

1. It supports a frequent or important customer task.
2. It has a real route and useful state today; roadmap-only destinations stay out of navigation.
3. Site scope comes from authenticated server/database context.
4. Read, edit, publish, delete, billing and access-management operations use separate permissions where risk differs.
5. Paid capability is enforced through Entitlements at the server/database boundary, not only hidden in the interface.
6. Baseline security, tenant isolation, accessibility, auditability and safe recovery are never paid add-ons.

## Target customer navigation

The ordinary customer receives no more than five primary destinations. Labels are nouns, short and task-oriented.

| Order | Primary destination | Contents | Availability |
|---|---|---|---|
| 1 | خانه | Site health, publication state, unresolved real tasks, recent outcomes, one recommended next action | Core |
| 2 | سایت | Pages and navigation, media, appearance within Template constraints, preview and publication | Core; Template choices and advanced publishing may be entitled |
| 3 | پیام‌ها | Form submissions, contact requests and later booking/order conversations | Core inbox; automation/export/CRM sync paid |
| 4 | رشد | Basic analytics and SEO health, search appearance and actionable recommendations | Basic Core; advanced analytics, AI SEO and automations paid |
| 5 | حساب | Profile/security, Site members, plan/usage/invoices, domain status and support | Core shell; extra seats, custom roles and premium support paid |

`راهنما` is persistent contextual assistance in the shell rather than a competing primary navigation group. RAVA Academy is opened from Help, onboarding and relevant tasks. A customer should not have to decide between “Help”, “Academy” and “Template guide” as three separate top-level destinations.

## Current-route disposition

| Current route/surface | Customer decision | Correct placement | Finding |
|---|---|---|---|
| `/admin` | Replace customer content | `خانه` | It currently reuses owner-oriented setup data and does not provide the entitled customer's daily Site overview. |
| `/admin/platform/sites/[id]` | Keep and reshape | Customer `خانه` for the active Site | The local `7be86b005b74` correction is the first correct binding, but the page still exposes links based on broad Site state rather than a complete capability manifest. |
| `/admin/pages?site=...` | Keep | `سایت > صفحه‌ها و منو` | Core customer task. Read/edit/publish/delete must remain distinct. |
| `/admin/pages/[id]` | Keep | Page editor under `سایت` | Correct central workspace direction. Template schema must bound sections, media geometry and responsive behavior. |
| `/admin/media?site=...` | Keep, rename to customer language | `سایت > تصاویر و ویدیوها` | Current `media.manage` grants upload, edit and delete together; split read/upload/edit/delete and apply storage quotas. |
| `/admin/platform/sites/[id]/design` | Do not expose in current form | `سایت > ظاهر سایت` | Raw Template access grants, structured JSON, release history and rollback are owner/operator concerns. Customer gets only allowed Template variants and safe appearance tokens. |
| `/admin/platform/sites/[id]/template-guide` | Keep as contextual guide | Help drawer and `درباره این قالب` inside Site appearance | It should not be a primary navigation item. The local LaunchPad/RLS fallback is directionally correct. |
| `/admin/academy` | Keep but move | Help/onboarding | Published learning is valuable, but the page needs an explicit `help.view` authorization gate and audience/permission filtering. |
| `/admin/help` | Owner only | Owner Help administration | This is a content-management console, not customer Help. Correctly absent from customer navigation. |
| `/admin/platform/sites` and `/new` | Owner only | Platform owner console | Customer neither provisions tenants nor sees other customers. |
| `/admin/platform/sites/[id]/starter` | Owner-led by default | Onboarding operation | Installing a starter pack changes broad Site content; customer may select preferences, but RAVA applies/reviews it unless a later plan explicitly grants safe self-service. |
| `/admin/platform/billing` | Owner-only implementation | Separate customer `حساب > اشتراک و صورتحساب` | Existing surface manages platform contracts and is too broad for a customer. Build a Site/Organization-scoped read/pay surface instead. |
| `/admin/system/access` | Owner-only implementation | Separate customer `حساب > اعضای تیم` | Existing role engine is too powerful. Customer gets invite/revoke within seat limits and can grant only a safe subset of permissions they possess. |
| `/admin/system/logs` | Owner only in raw form | `حساب > فعالیت‌های سایت` later | Raw audit/entity/correlation data is operational. Customer needs a localized, Site-scoped activity history with no internal technical context. |
| `/admin/system/errors` | Owner only | Support/status | Never expose raw technical errors. Customers see a safe incident/status message and reference ID when action is required. |
| `/admin/platform/sites/[id]/commerce` | Entitled only | Future `فروشگاه` module | Show only when bought/enabled. It may become a primary destination because it is a daily operational module, but must not appear for LaunchPad service customers without Commerce. |

## Missing customer capabilities

These are product gaps, not immediate empty menu items.

### P0 — required to make the current LaunchPad customer path coherent

1. A server-generated `CustomerCapabilityManifest` containing active Site, Template workspace, granular permissions, Entitlements, limits and safe destination URLs.
2. A real customer Home that shows publication state, unresolved content/SEO/media tasks and exactly one next action.
3. One customer navigation derived from the manifest; Login, shell, direct routes and actions must consume the same policy decisions.
4. Explicit authorization on Academy and audience/permission-filtered learning content.
5. Granular Media permissions and server-side limits instead of the all-in-one `media.manage` capability.
6. Removal of ordinary customer `design.manage`; replace it with safe appearance selection and separate preview/request-publish/publish capabilities.
7. Authenticated browser tests for owner, entitled customer, wrong Site, revoked entitlement and direct URL attempts.

### P1 — necessary for a sellable service-site product

1. Site-scoped form/message inbox with unread/resolved states and safe export rules.
2. Basic Site analytics: visits, top pages, acquisition and conversion events with plain-language explanations.
3. SEO workspace: page completeness, indexing/canonical state, search preview and concrete tasks.
4. Customer Account: profile, password/session security, Site team, current plan/limits, invoices and domain status.
5. Versioned draft preview plus a clear publish/request-approval path appropriate to the customer's permission.
6. Site-scoped activity history written in customer language.

### P2 — growth and retention

1. Marketing automations and CRM/provider integrations.
2. Scheduled publishing and content calendar.
3. Advanced analytics, funnels, attribution, reports and exports.
4. AI content/SEO suggestions using Suggest → Diff/Preview → Human Approval → Execute.
5. Multi-Site switcher when a customer actually owns more than one Site.

## Commercial packaging

### Baseline included in every paid RAVA Site

- Secure authentication, tenant isolation, RLS, safe sessions and recovery
- One Site workspace and one purchased/assigned Template
- Page/content editing within Template constraints
- Media library with a defined storage allowance
- Real preview, draft saving and a safe publication workflow
- Basic technical SEO defaults and per-page metadata
- Form delivery/inbox at a reasonable baseline allowance
- Basic traffic/conversion overview
- Contextual Help, Academy basics, accessibility and audit records
- Customer data export and essential backup/recovery protections

### Growth / Premium

- Premium Template families and additional Template variants
- Additional Sites, storage, video capacity, form volume and team seats
- Advanced SEO audits, structured-data tools and AI suggestions
- Advanced analytics, funnels, comparison periods, exports and scheduled reports
- Content scheduling, workflow approvals and longer version history
- CRM, email/SMS and automation integrations
- Managed domain/DNS service and priority support

### Commerce add-on

- Products, variants, inventory, orders, payment/shipping providers, discounting and commerce analytics
- Commercial enforcement applies to the module and usage; checkout security, isolation and audit remain baseline guarantees

### Enterprise

- SSO/SAML, SCIM, custom roles, advanced approval policies and audit export
- Dedicated infrastructure/region/data-residency options, higher SLA and governed support access
- API/webhooks at enterprise scale and negotiated limits

## Items that must never be customer-facing controls

- Tenant/Site provisioning for other customers
- Direct Template entitlement grants or contract overrides
- Raw environment, Container, migration, database or provider configuration
- Internal Template JSON/theme/layout payloads
- Platform-wide roles, permissions, audit logs and error center
- Owner support impersonation and break-glass controls
- Raw secrets, API keys or service-role operations
- Manual completion buttons for notifications that represent real unfinished work

## Information architecture and interaction rules

1. The shell is persistent on every customer page and includes active Site, profile, notifications and Help.
2. A customer with one Site is never asked to select a Site repeatedly. A switcher appears only when two or more accessible Sites exist.
3. Navigation contains destinations, not duplicate actions. Page-specific actions remain in the page header.
4. Every page has one purpose, one dominant action and an explicit back/breadcrumb path for depth greater than two.
5. Notifications are projections of real persisted conditions and resolve only when the underlying condition changes.
6. Paid but unavailable capabilities may appear only in a bounded discovery/upgrade surface, not as broken navigation.
7. Mobile exposes at most five primary destinations and never compresses the entire desktop tree.
8. Loading, empty, error, permission-denied, entitlement-locked, unsaved, saved and published states require intentional copy and accessible status announcements.
9. Touch targets aim for 44 by 44 CSS pixels; keyboard focus remains visible and unobscured.
10. Customer Home uses concise numbers, statuses and actionable tasks rather than decorative charts. A reserved analytics region belongs under `رشد`; until enough real data exists it shows a useful insufficient-data state, and it must not render fabricated series or an empty chart. The region's contract must support later trend, acquisition and conversion visualizations without changing the primary navigation or shell.

## Implementation sequence

### Slice 1 — policy and route truth (no redesign)

- Introduce the `CustomerCapabilityManifest` server contract.
- Split owner and customer Home behavior.
- Make Login and Admin Shell use the same resolved workspace.
- Add Academy permission enforcement.
- Remove customer exposure to broad Design management.
- Add authorization tests and direct-route denial tests.

### Slice 2 — exact visual approval

- Produce one complete desktop and mobile customer shell preview.
- Include closed/open navigation, profile, notifications, core Home, Help, loading, empty, denied and locked states.
- Obtain owner approval before changing authenticated presentation.

### Slice 3 — authenticated shell implementation

- Implement only the approved shell and Home.
- Capture the real coded desktop/mobile output and compare it to the approved preview.

### Slice 4 — sellable operational gaps

- Messages/forms inbox.
- Basic analytics and SEO health.
- Account/team/plan/domain surfaces.
- Granular media and publication permissions.

### Slice 5 — commercial growth modules

- Advanced SEO/AI, analytics, automations, additional seats/storage/Sites and Commerce.

## Acceptance criteria

- A LaunchPad customer lands directly in the entitled Site workspace.
- No owner-only navigation or data appears in UI, direct route reads or mutations.
- Revoking permission or entitlement removes navigation and blocks the direct operation immediately.
- Customer navigation has at most five primary destinations and no dead entries.
- The active Site and Template are obvious without exposing internal identifiers.
- The same task has one canonical path.
- Persian and English are independently complete; no mixed-language user-facing copy.
- Desktop, mobile, keyboard and error/empty/locked states are verified.
- Database tests prove same-Site allow and cross-Site/unauthorized deny behavior.
