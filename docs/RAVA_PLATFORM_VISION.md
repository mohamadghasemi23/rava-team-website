# RAVA Platform — Product Vision, Architecture Principles, and Delivery Standard

## Document status

- **Owner:** Mohammad Ghasemi / RAVA TEAM
- **Product:** RAVA TEAM / RAVA Platform
- **Repository:** `mohamadghasemi23/rava-team-website`
- **Purpose:** Canonical product and architecture direction for humans and coding agents
- **Language rule:** Explanations and reports should be Persian; file names, code, permission keys, table names, RPC names, branch names, and technical terminology remain English.
- **Authority:** GitHub and the actual repository state are the implementation source of truth. This document defines intent and constraints, but never proves that a feature is implemented.

## 1. Product mission

RAVA is not merely a corporate website. The long-term product is a serious commercial **Multi-Tenant SaaS Website Operating System / Website Generation & Management Platform** for Iranian and international businesses.

RAVA must rapidly provision professional customer websites and centrally manage their content, users, access, contracts, billing, modules, SEO, analytics, commerce, CRM, support, domains, releases, and integrations.

Primary operating model:

`RAVA Owner → Organization / Customer → Brand / Site → Industry / Site Type → Template → Modules / Entitlements → Domain → Admin → Preview → Staging → Production`

When mature Template Packs and Modules exist, the target is to provision a new customer site in approximately ten minutes without creating a separate codebase for each customer.

The platform must create real revenue. Features should be useful enough that customers willingly pay for them and should be evaluated for customer value, differentiation, upsell, retention, usage cost, operating cost, and commercial tier.

## 2. Non-negotiable architecture principles

Every new Feature must be:

`Tenant-aware + Permission-aware + Entitlement-aware + Locale-aware + Audit-aware + Secure-by-default + API-ready + Observable + Versionable + Testable + Commercial-aware`

- **Tenant-aware:** Data and Operations must not leak between Tenants.
- **Permission-aware:** Sensitive Operations require Server-side authorization.
- **Entitlement-aware:** Paid and Premium Features must be enforced in Backend, not merely hidden in UI.
- **Locale-aware:** Persian and English are required, with extensibility for additional locales.
- **Audit-aware:** Important actions must be traceable.
- **Secure-by-default:** Baseline security is mandatory and must never be sold as an optional paid Feature.
- **API-ready:** Architecture must support future API, Mobile App, and integrations.
- **Observable:** Structured Error, Log, Security Event, request ID, and correlation ID are expected.
- **Versionable:** Template, Design, Content, and important Operations require Versioning where applicable.
- **Testable:** A Feature without safe, meaningful verification is incomplete.
- **Commercial-aware:** Every Feature must be assessed as Core, Premium/Growth, or Enterprise and evaluated for usage and operating economics.

## 3. Multi-Tenant model and isolation

RAVA must support:

- Organization
- Multiple Brands or Sites per Organization
- Multiple Users per Organization
- Memberships at Platform, Organization, and Site scopes
- Shared platform core and shared infrastructure with strong Tenant isolation

Never trust a client-provided `organization_id`, `site_id`, role name, or permission claim. Tenant Context must be derived from authenticated identity and valid Membership/Permission data.

Tenant isolation applies to:

- Database
- RLS
- Storage
- Cache
- Queues
- Logs
- Analytics
- Search
- API

Enterprise architecture must remain capable of future dedicated database, storage, deployment, keys, and region/data-residency options. RAVA should not maintain a separate codebase for every customer.

## 4. Ownership and portability

Customer owns:

- Domain
- Brand data
- Business data
- Customer data
- Content

RAVA owns:

- Platform Core
- Module Engine
- Template Engine
- AI system
- Platform IP

Customers require a logical export path for their own data. Architecture should be ready for data export, deletion, consent, residency, and GDPR-like requirements.

## 5. Authentication and security baseline

Security must be designed as enterprise-grade from the beginning and continuously reviewed.

Required controls include:

- Secure authentication
- Server-side validation and sanitization
- Context-appropriate output encoding
- XSS protection
- CSRF protection where applicable
- Injection protection
- Brute-force protection
- Rate limiting
- Anti-bot/CAPTCHA where useful
- Secure cookies
- Session expiration
- Safe Remember Me behavior
- No perpetual login session
- Secure redirects and URL validation
- Validation of route, query, request, and path parameters
- Path traversal prevention
- Payload limits
- Server-side file upload validation
- No raw Backend error leakage
- Secure security headers
- No secrets in logs

Passwords, API keys, JWTs, cookies, session tokens, and secrets must never be logged or committed. PostgreSQL must not be publicly exposed. VPS credentials and secrets must never be committed to GitHub.

## 6. Authorization architecture

Authorization should follow scoped **RBAC + ABAC/ReBAC** principles:

- System roles
- Custom roles
- Granular permissions
- Explicit allow/deny overrides
- Platform, Organization, and Site scopes
- Separate approval permissions
- Separate publish permissions
- Separate refund/payment permissions

An access manager must never delegate stronger permissions than they are authorized to grant. Privilege-escalation prevention must exist at Database/RPC level, not only in UI.

Mohammad / Platform Owner may have operational control, but there must be no secret or untraceable access, no customer password access, and all support impersonation and break-glass access must be audited.

## 7. Errors, logging, observability, and audit

Important failures should include:

- Unique Error ID
- Timestamp
- Category
- Severity
- Event type
- Route
- User/Admin
- Organization
- Site
- Request ID
- Correlation ID
- Safe technical context
- Safe human-readable explanation

The Admin Error Center should support pagination, safe search, category/severity/type/date filters, Error ID, Log ID, explanation, and probable causes. Search filters must be safe against PostgREST/filter grammar manipulation.

Audit important actions including login, failed login, role/permission changes, settings/content changes, deletes, media actions, publishing, billing, payments, owner/support access, and security changes. Owner actions may be hidden from selected customer-facing views by product policy, but must remain in internal audit.

## 8. Help and RAVA Academy

RAVA should aim to provide one of the strongest Persian/English contextual education systems in its market. Every user should receive simple, role-appropriate, permission-aware guidance for the Operations available to them.

Every major Feature requires stable contextual Help with:

- Stable `help_key`
- Persian and English content
- Title, summary, explanation, steps, warnings, and examples
- Video/media where useful
- Related topics
- Minimum permission
- Module
- Feature
- Plan
- Version
- Audience and route context

RAVA Academy should support courses, lessons, curriculum, progress, and completion state. Help and Academy content must not reveal Features or Operations a user cannot access.

## 9. Admin Panel UX and visual quality

The Admin Panel must be professional, consistent, searchable, hierarchical, scalable, and fully responsive. Desktop-first is acceptable where appropriate, but mobile usage must remain complete and understandable.

Expected capabilities:

- Sidebar
- Mobile drawer
- Tree navigation
- Global search
- Future Cmd/Ctrl+K command palette
- Contextual Help
- FA/EN
- Clear separation between customer complexity and internal platform complexity

The panel must not become a confusing collection of unrelated pages. Final graphic and design work should target world-class quality, not merely acceptable Iranian-market quality. Visual design must preserve usability, performance, accessibility, responsiveness, and commercial trust.

Legacy UX requirements to preserve include admin-configurable typography, reusable Media Picker, Media management, responsive images, manageable footer, company/team/contact/license sections, responsive desktop/mobile header behavior, RAVA TEAM branding, Mohammad Ghasemi identity where relevant, and the safe 404 text:

`این صفحه موجود نیست.`

## 10. Template and Page Builder systems

Templates are not visual skins. A Template Pack may contain pages, components, navigation, forms, Modules, SEO defaults, Analytics events, emails, theme defaults, and layout blueprints.

Template categories:

- Core / Free
- Premium
- Enterprise
- Exclusive
- Industry Packs
- Future third-party marketplace

Premium Template access requires real Contract/Site Entitlement enforcement, not only `is_public` or UI checks.

The Page Builder should be a **Constraint-based visual builder**, not an unrestricted freeform drag-and-drop system. The goal is consistent Design, responsive output, safe layouts, and manageable complexity. An Advanced/Developer mode may exist for RAVA designers.

## 11. Design Versioning and releases

Design and Content workflows should support:

`Draft → Revision → Preview → Publish → Release → Rollback`

Publishing should produce immutable snapshots. Rollback should create a new Release based on a previous snapshot rather than deleting history. Production changes must not bypass the Release flow.

Standard environments are Preview, Staging, and Production. Development must never change Production without explicit approval.

## 12. Feature Flags

Feature Flags should support:

- Internal only
- Mohammad only
- Specific Tenant
- Beta users
- Percentage rollout
- Everyone

Flags must not replace Permission or Entitlement checks.

## 13. Billing, contracts, entitlements, and commercial model

RAVA should support:

- Plans
- Subscriptions/Contracts
- Addons
- Site Entitlements
- Usage meters
- Invoices
- Payments
- Renewals
- Grace periods
- Suspensions
- Hard limits
- Soft limits

Pricing direction:

`Base subscription + Modules + Limits + Usage`

Usage examples include AI tokens, email, SMS, storage, bandwidth, and API requests.

Commercial tiers:

- Core
- Premium / Growth
- Enterprise

Paid Feature enforcement order:

`Permission check → Entitlement check → Usage/Limit check → Execute`

Hard limits block execution; soft limits warn. Metered Operations require idempotency. Baseline security must never be a paid Feature.

## 14. Commerce

RAVA Commerce is expected eventually to support products, variants, SKU, prices, multi-currency, inventory, multi-warehouse, stock movements, reservations, cart, checkout, orders, draft orders, coupons, bundles, gift cards, wishlist, compare, reviews, preorder, backorder, subscriptions, digital products, B2B catalogs, customer segment pricing, quantity pricing, payment terms, returns, refunds, loyalty, multi-vendor, and international commerce.

Commerce Operations must be transaction-safe. Stock must not be altered through arbitrary direct table updates.

## 15. Provider architecture

External services must be abstracted behind Providers, including:

- Payment
- Shipping
- Tax
- SMS
- Email
- Storage
- AI

Support Iranian and international Providers without permanent lock-in to a single vendor.

## 16. SEO, AI, Analytics, CRM, and Search

SEO Core includes canonical, sitemap, robots, schema, Open Graph, redirects, indexing controls, and performance. Premium/AI SEO may include keyword tracking, competitor analysis, content gaps, AI audits and suggestions, internal-link assistance, cannibalization detection, metadata generation, and content briefs. Never promise rankings.

AI follows:

`Suggest → Diff / Preview → Human Approval → Execute`

Low-risk optional autopilot may exist. Dangerous Operations require confirmation and possibly step-up authentication. AI actions must be auditable, Permission-aware, Entitlement-aware, and usage-metered.

Analytics must be actionable and may include operational, business, product, behavior, and AI insights. Owner-level aggregate platform metrics must respect Tenant privacy. Anonymous benchmarking may be added later.

CRM should eventually cover both RAVA internal CRM and customer CRM, including leads, contacts, opportunities, pipelines, customer activity, and support history.

Future Search should support entity-aware global Admin search across customers, Sites, orders, products, invoices, logs, users, and permissions, followed later by natural-language actions and command palette workflows.

## 17. Notifications, Support, API, and Webhooks

Unified Notifications should cover security, order, payment, stock, lead, ticket, SEO, system, billing, domain, backup, and AI insight events with severity, recipient, channel, Tenant, read/unread state, action, and deep link.

Support should include tickets, change requests, SLA, internal notes, customer-visible messages, and audit.

Future API and Webhooks require scoped API keys/tokens, permissions, rotation, rate limits, usage tracking, sandbox mode, and secure webhook processing.

## 18. Media security

Media requires Server-side validation, MIME verification, file size limits, safe filenames, Storage isolation, metadata, alt text, and responsive variants. SVG is potentially active content and must not be trusted. Client-side validation alone is insufficient.

## 19. Domains and Mobile readiness

A Site may have multiple aliases and one canonical primary domain. Localized or market-specific domain behavior must be explicit.

The architecture must remain API-ready for future iOS, Android, and mobile Admin applications. Present web decisions must not block future Mobile Apps.

## 20. Infrastructure direction

RAVA is leaving Supabase Managed hosting. Do not create paid Supabase branches.

Direction: **Self-hosted Supabase on RAVA's own VPS**, preserving where appropriate:

- PostgreSQL
- RLS
- Auth / GoTrue
- PostgREST
- Storage
- Studio
- `supabase-js`
- RPC architecture

This replaces Supabase Managed hosting, not necessarily Supabase technology.

VPS work should include OS hardening, SSH keys, restricted root/password login, firewall, Docker/Compose, reverse proxy, SSL, secured Studio, SMTP, backups, off-box backups, monitoring, Database migration tests, and Staging validation.

One VPS is initially acceptable but is a Single Point of Failure. Architecture must remain ready for future split, replication, and HA.

## 21. Backup, restore, and disaster recovery

Infrastructure should eventually support PostgreSQL backups, PITR where practical, scheduled backups, Tenant-level export/restore, versioned object Storage, encryption, separate credentials, off-box backups, retention policy, regional copies where required, restore tests, and a DR runbook.

A backup that has never passed a restore test is not reliable.

## 22. SQL and PostgreSQL security rules

SQL review must pay special attention to:

- `SECURITY DEFINER`
- `search_path`
- Function grants
- `PUBLIC`
- `anon`
- `authenticated`
- RLS
- Tenant scope
- Privilege escalation
- Grantability
- Cross-Tenant joins
- Site/Organization consistency
- Idempotency
- Race conditions
- Transaction safety

SQL is not production-ready merely because TypeScript Build passes. Migrations require eventual execution and verification against a real PostgreSQL environment.

## 23. Feature Definition of Done

A working UI alone does not complete a Feature. Before claiming completion, verify applicable items:

- Tenant scope
- Permission
- Entitlement
- Server validation
- Audit
- Structured Errors
- Safe logging
- FA Help
- EN Help
- Contextual Help
- RLS or secure RPC
- Tests
- CI
- Responsive UX
- Commercial classification

`config/feature-standards.json` and `docs/FEATURE_DEFINITION_OF_DONE.md` are part of the project standard and must be inspected and updated when applicable.

## 24. Git and delivery rules

Before any work:

1. Read `AGENTS.md` completely.
2. Inspect current Repository and Branch state.
3. Fetch and treat GitHub as source of truth.
4. Confirm implementation in actual code; never rely only on prior claims or documentation.

Never:

- Rewrite the project blindly
- Replace stable architecture without evidence
- Merge to `main` without explicit approval
- Deploy without explicit approval
- Modify Production without explicit approval
- Apply Production Database migrations without explicit approval
- Claim work is complete without code and verification evidence

Always:

- Preserve legitimate changes from both sides of diverged Branches
- Prefer small focused changes and commits
- Report exact changed files
- Report exact commit SHA
- Run Feature Standards, Type Check, Build, and relevant tests
- Report remaining risks
- Identify anything still requiring real PostgreSQL/VPS/integration verification

## 25. Required workflow for every implementation task

1. Read relevant code.
2. Understand existing architecture.
3. Identify risks.
4. Propose the smallest correct change.
5. Implement it.
6. Add or improve validation and security.
7. Add Help FA/EN if Feature-facing.
8. Add audit and observability where needed.
9. Add/update Feature Standards metadata when applicable.
10. Run Feature Standards, Type Check, Build, and relevant tests.
11. Report exact changed files.
12. Report exact commit SHA.
13. Report remaining risks.
14. Clearly state requirements for real PostgreSQL/VPS/integration testing.

Do not say **done** unless the actual Repository state supports the claim.

## 26. Current known foundation and gaps

The Repository is expected to contain a substantial platform foundation, potentially including Organizations, Sites, environments, domains, Module catalog, Permissions, roles, Memberships, overrides, provisioning, Help/Academy, Logs, Errors, security events, audit, Template/Theme/Release Engine, Contracts/Billing, Entitlements, Usage meters, Commerce Core, and a Feature Standards CI gate.

These are expectations, not implementation proof. Agents must verify them in actual code.

Known priorities/gaps to verify include:

- Real PostgreSQL integration testing
- Automated Tenant-isolation tests
- Privilege-escalation tests
- RLS tests
- Migration validation on self-hosted PostgreSQL
- Invitation-token acceptance flow
- Invitation email delivery
- Tenant-safe profile directory
- Replacement of legacy `profiles.role='super_admin'` shortcuts
- Real Provider integrations
- Public storefront
- Cart and checkout
- Payment, shipping, and tax Providers
- Inventory reservation and fulfillment
- Returns/refunds
- CRM
- SEO
- Analytics
- Notifications
- API/Webhooks
- Backup/Restore and DR
- Mobile Apps

Current active platform development is expected on `agent/platform-core-foundation` with main work historically tracked in `PR #2`; verify current GitHub state before relying on this statement.

## 27. Idea intake and prioritization

New ideas from Mohammad or the engineering agent should be captured rather than lost. They must not be implemented blindly or immediately merely because they were proposed.

Evaluate each idea for:

- Customer problem and practical usefulness
- Revenue potential and willingness to pay
- Differentiation and competitive value
- Core / Premium / Enterprise classification
- Security and privacy impact
- Tenant, Permission, Entitlement, Locale, Audit, and observability impact
- UX complexity
- Technical debt and scalability
- Vendor lock-in
- Operating and support cost
- Dependencies, effort, and risk
- Priority relative to the current milestone

Place approved ideas in an explicit prioritized execution queue. Challenge ideas that introduce security weakness, poor UX, technical debt, low commercial value, lock-in, excessive operating cost, or unnecessary complexity. Propose a better architecture when necessary, but do not redesign stable components without evidence.

## 28. Owner operating experience

The mature platform should allow Mohammad / RAVA Owner to:

- Create a customer and Organization
- Select Site type and Template
- Select Modules
- Configure Contract and Entitlements
- Connect Domain
- Create Admin Users and set Permissions
- Provision Preview, Staging, and Production
- Manage Billing and Support
- Monitor Errors, Usage, and Security
- Publish updates and roll back safely

The customer should receive a clean, understandable, professional Admin Panel without exposure to unnecessary internal platform complexity.

## 29. Final product standard

Treat RAVA as a serious commercial SaaS platform intended to serve real Iranian and international businesses.

Do not optimize only for making a demo work. Optimize for:

`Security + Maintainability + Scalability + Operational clarity + Commercial viability + Excellent Admin UX`

Ideas may evolve indefinitely, but every implemented change must remain evidence-based, scoped, testable, reviewable, and honest.

## 30. Approved services-first and non-empty-site strategy

The first complete customer-site product is the **service-business website** experience. Commerce follows as a module on the same shared platform core after the service-site path is production-proven.

RAVA TEAM / `ravateam.ir` is **Customer Zero** for the service-site product. It must use the same Tenant, Template, Content, Release, Permission, Entitlement, Audit, Staging, backup, and rollback paths intended for later customers; it must not become a bespoke bypass or separate architecture.

RAVA must not hand off a blank site. New-site provisioning must combine a Site Type, Industry Pack, compatible Template Version, versioned Starter Content Pack, verified Brand Profile, and entitled Modules to create useful editable draft content appropriate to the customer's field.

Starter content must be localizable, versioned, auditable, clearly mark samples/placeholders, and require customer verification for business facts. It must never fabricate customers, testimonials, credentials, awards, licenses, prices, results, or other claims. Pack upgrades must be diff-based and must not overwrite customer-edited or published content without explicit review and approval.

The implementation order and acceptance gates are defined in `docs/SERVICES_FIRST_DELIVERY_PLAN.md`. Tenant-safe CMS scope is a prerequisite for installing starter content.
