# RAVA Feature Definition of Done

A feature is **not complete** until all applicable items below are implemented in code and pass CI.

## Mandatory for every feature

- Tenant-aware: organization/site scope is derived or validated server-side; client-supplied tenant IDs are never trusted by themselves.
- Permission-aware: sensitive read/write/execute paths use granular permissions in the backend, not only hidden buttons.
- Secure-by-default: server validation, safe error handling, no secret leakage, bounded payloads, safe route/query handling and least privilege.
- RLS or secure RPC: exposed tables have RLS and privileged RPCs authenticate, authorize and validate scope internally.
- Audit-aware: security-sensitive and business-significant mutations write structured audit events.
- Error-aware: operational failures produce safe user messages plus traceable Error IDs where applicable.
- Help-ready: user/admin-facing features have a stable `help_key`, contextual binding when a UI route exists, and maintained Persian + English content.
- Locale-aware: user-facing labels/help/errors are designed for FA/EN and future locale expansion.
- Observable: relevant security/usage/blocked decisions are structured and searchable without logging secrets.
- Versionable/testable: destructive or publish-like workflows preserve history where applicable and CI must pass TypeScript + build + standards checks.

## Commercial features

Premium/Enterprise functionality must also be Entitlement-aware. The backend must reject execution without a valid entitlement. Hiding a menu or button is never sufficient.

Metered functionality must use the central atomic usage-enforcement path, an idempotency key, Soft/Hard limits when configured, and must not introduce alternate usage writers that bypass enforcement.

Baseline security, tenant isolation, authentication safety, audit integrity and safe error handling are never downgraded or sold as optional paid security.

## Help content contract

Each UI feature must provide:

- Persian title, summary, body/steps and warnings where relevant.
- English title, summary, body/steps and warnings where relevant.
- Context route binding using exact, `:parameter`, or controlled wildcard patterns.
- `minimum_permission` for sensitive topics.
- Correct audience classification.
- No passwords, secrets, internal credentials, exploit details or private tenant data in help content.

## Pull request / CI rule

`config/feature-standards.json` is the project feature registry. Any new first-class feature must be registered or its implementation is incomplete. CI runs `scripts/verify-feature-standards.mjs`; missing help keys, missing permission registrations, or required standards flags fail the build gate.

Passing CI proves repository-level consistency and application buildability. It does **not** prove unapplied SQL migrations work against Production. Database migrations must still be validated in an appropriate non-production Supabase/PostgreSQL environment before Production rollout.
