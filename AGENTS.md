# AGENTS.md — RAVA Platform Development Rules

This repository is the source of truth for RAVA TEAM / RAVA Platform.

Before designing any Feature, you MUST read `docs/RAVA_PLATFORM_VISION.md`.

## Durable project memory

Before starting any implementation, planning, prioritization, deployment, or infrastructure task, read:

- `docs/PROJECT_STATUS.md` for the current verified position, active objective, blockers, and next actions;
- `docs/DECISION_LOG.md` for approved decisions and their rationale.

Treat these files as navigation aids, not implementation proof. Refresh volatile Git, GitHub, CI, Staging, Production, VPS, and disk facts from their real sources before relying on a recorded snapshot.

Before finishing any meaningful work:

- update `docs/PROJECT_STATUS.md` when the active objective, completed evidence, blocker, environment state, pending Git state, or next priorities changed;
- append to `docs/DECISION_LOG.md` when a durable product, architecture, UX, commercial, dependency, infrastructure, or delivery decision was made;
- never rewrite decision history silently: mark an old decision as superseded and link the replacement;
- never record an item as complete without repository and validation evidence.

## Product context
RAVA is a multi-tenant SaaS Website Operating System, not a single marketing website. Every implementation must preserve multi-tenancy, scoped authorization, commercial entitlements, localization, auditability, observability, versioning, testability and future API compatibility.

Core product law:

**Tenant-aware + Permission-aware + Entitlement-aware + Locale-aware + Audit-aware + Secure-by-default + API-ready + Observable + Versionable + Testable + Commercial-aware**

## Non-negotiable rules

1. Never deploy to production, merge to `main`, apply production database migrations, rotate production secrets, or change production infrastructure unless the user explicitly asks for that exact action.
2. GitHub is the source of truth. Inspect the current branch/PR and relevant files before editing. Do not assume repository state from prior conversation or memory.
3. Do not claim work is complete unless the code exists in the repository and relevant validation/CI has passed.
4. Prefer small, reviewable commits. Preserve existing architecture unless a concrete defect or technical-debt reason justifies a change.
5. Do not rewrite working areas just for stylistic consistency.
6. Never weaken baseline security to create a paid feature. Security, tenant isolation, safe auth and auditability are baseline platform guarantees.

## Definition of Done for every new feature
A feature is NOT complete unless all applicable items below are implemented.

### Help / localization
- Register the feature in `config/feature-standards.json`.
- Add a stable `helpKey`.
- Add both Persian (`fa`) and English (`en`) Help content.
- Add contextual Help binding for user-facing admin routes when applicable.
- Help visibility must respect audience and minimum permission.
- User-facing copy must be localizable; do not hard-code a future-untranslatable architecture.

### Authorization / tenancy
- Resolve tenant/site scope from authenticated server context or trusted database relationships.
- Never trust `organization_id`, `site_id`, role, plan, permission, owner flag or entitlement merely because the client submitted it.
- Enforce authorization on the server/database boundary, not only in UI rendering.
- Use granular permissions instead of broad role-name checks.
- Explicit deny must remain stronger than allow where the access model supports overrides.
- Cross-tenant reads/writes must be impossible by default.

### Entitlements / commercial rules
- Premium/commercial features must be checked through the centralized entitlement runtime.
- UI hiding is not entitlement enforcement.
- Direct Server Action/RPC/API invocation must still be blocked without entitlement.
- Metered features must use the centralized usage enforcement path and idempotency.
- Do not create bypasses that write metered usage directly.

### Database / Supabase-compatible PostgreSQL
- Enable RLS on exposed tenant/user-data tables.
- RLS policies must include real ownership/scope predicates; `TO authenticated` alone is not authorization.
- UPDATE policies require correct `USING` and `WITH CHECK` behavior.
- Prefer `SECURITY INVOKER` where possible.
- `SECURITY DEFINER` is allowed only when necessary and must:
  - validate `auth.uid()`;
  - validate tenant/scope internally;
  - use a controlled `search_path`;
  - revoke default `PUBLIC` execution;
  - grant execution only to intended roles;
  - avoid trusting caller-supplied privileged scope.
- Keep privileged helpers in a private/unexposed schema when practical.
- Do not expose `service_role`/secret keys to browser code.

### Validation / APIs
- Validate all route params, query params, form values, RPC arguments, identifiers, enums and payload sizes server-side.
- Invalid UUID/slug/path/request input must fail safely.
- Never leak stack traces, raw database errors, secrets or internal implementation details to users.
- Preserve safe 404/error behavior.
- Design new server interfaces to remain API-ready and versionable.

### Audit / observability
- Sensitive mutations must produce audit events.
- Security-relevant allow/deny/block events must be observable.
- Operational failures should produce a structured error ID when appropriate.
- Logs must never contain passwords, tokens, cookies, OTPs, API keys, sessions, card data or equivalent secrets.
- Sanitize both structured context and technical error messages.
- Do not allow callers to forge another tenant's audit/error/security scope.

### UX / admin
- Reuse the existing Admin Shell and shared interaction patterns.
- Desktop and mobile must both be intentionally usable.
- Avoid chart/dashboard clutter that does not support a concrete action.
- Dangerous actions need clear confirmation and, where appropriate, step-up authentication later.

### Tests / verification
Before considering work complete:
- Run the repository feature-standard verification.
- Run TypeScript type checking.
- Run the production build.
- Add or update automated tests when the change affects authorization, tenant isolation, entitlements, billing, data integrity or security-sensitive behavior.
- SQL/database work is not production-ready merely because TypeScript/build CI passes. Validate migrations against a real non-production PostgreSQL/Supabase-compatible environment before production use.

## Current CI commands
Use the repository scripts/workflow as the source of truth. At minimum current CI expects:

```bash
node scripts/verify-feature-standards.mjs
npx tsc --noEmit
npm run build
```

## Scoped development with RPIM

Use the RAVA Project Intelligence Map before broad repository searches:

```bash
npm run rpim -- feature <feature-key-or-phrase>
npm run rpim -- impact
```

- Read the matched Feature paths and direct dependencies first.
- Expand beyond that scope only when code evidence shows a shared or cross-cutting dependency.
- Update `config/project-intelligence.json` whenever a first-class Feature or its boundaries change.
- Run `npm run rpim:verify` in repository Gates.
- RPIM narrows discovery and iterative tests; it never replaces complete release validation or applicable real PostgreSQL tests.

If package scripts are later added for these, prefer the package scripts.

## Current branch / PR workflow
The active platform work is currently on:

- Branch: `agent/platform-core-foundation`
- Draft PR: `#2` — `Build RAVA multi-tenant platform core`

Before modifying, verify these are still current. If they changed, follow the repository's current state rather than this note.

## Architecture expectations

### Multi-tenancy
RAVA Owner → Organization → Site/Brand → Environment → Domains → Modules/Entitlements → Scoped users/roles.

### Environments
Production + Staging are standard platform concepts; Preview may exist for transient review. Do not collapse these concepts into one environment.

### Modules
Modules must be installable/activatable without rebuilding a bespoke client codebase. Keep module boundaries clear and compatible with future Core/Premium/Enterprise packaging.

### Permissions
Use permission capabilities and scope. Avoid introducing logic tied only to names like `admin` or `super_admin`. Legacy shortcuts may exist but should not spread.

### Templates/design
Template/theme releases are versioned. Publishing/rollback must remain auditable and entitlement-aware.

### Commerce
Commerce should remain extensible for products, variants/SKU, multi-location inventory, pricing, B2B catalogs, orders, returns/refunds, payment/shipping provider abstraction, subscriptions and marketplace capabilities. Avoid schema choices that block these future paths.

### AI
Use: Suggest → Diff/Preview → Human Approval → Execute. Low-risk opt-in automation may be added later. Do not silently execute destructive or financially sensitive AI actions.

### Providers
Payment, shipping, email, SMS, tax, storage and similar integrations should use provider abstractions rather than hard-coded vendor-specific business logic.

## Security review priorities
When touching related code, actively look for and fix rather than reproduce:
- delegated permission/grant privilege escalation;
- cross-tenant profile/user directory leakage;
- insecure `SECURITY DEFINER` scope handling;
- unsafe PostgREST search/filter grammar construction;
- unredacted technical error messages;
- direct entitlement/usage bypasses;
- unvalidated invitation/acceptance flows;
- legacy global `super_admin` shortcuts spreading into new code;
- missing tenant-isolation tests.

## Self-hosting direction
RAVA is expected to move away from managed Supabase infrastructure toward user-controlled VPS/self-hosted infrastructure while preserving PostgreSQL/RLS/Auth-compatible concepts where practical. Do not introduce new vendor lock-in without a strong reason. Keep migrations and application architecture portable to self-hosted PostgreSQL/Supabase-compatible deployment.

## Communication / completion reporting
When finishing a task, report:
- what actually changed;
- exact commit SHA(s);
- exact branch/PR;
- tests/CI executed and their result;
- any database/infrastructure validation that has NOT been performed;
- remaining known risks.

Never use phrases equivalent to “done” for uncommitted, untested or unverified work.
