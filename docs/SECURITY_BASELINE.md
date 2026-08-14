# RAVA Security Baseline — Mandatory

This baseline is mandatory for every RAVA route, page, Server Action, API endpoint, admin module, upload flow, database table, and future RAVA-derived project.

## Authentication and sessions
- Never store passwords, plaintext credentials, raw application session tokens, or CAPTCHA secrets.
- Admin authentication must use server-verified identity plus an application session guard.
- Default admin session: max 8 hours, idle timeout 45 minutes.
- Remember-me session: max 7 days, idle timeout 12 hours. Remember me never stores the password.
- Admin session cookie must be HttpOnly, Secure in production, SameSite=Strict, and revoked on logout.
- Expired, revoked, inactive-user, role-invalid, or user-agent-mismatched sessions must be rejected.
- Sensitive routes must re-check authorization server-side. Client-side checks are UX only.

## Login protection
- CAPTCHA token must be verified server-side.
- Login inputs must be validated client-side and independently server-side.
- Login errors must not disclose whether an account exists.
- Login attempts must be rate-limited and temporary blocks applied after abuse.
- CAPTCHA hostname/action must be checked.

## Request boundary
- All application routes inherit the root `proxy.ts` security boundary.
- Reject malformed URL encodings, path traversal, control characters, backslashes, oversized URLs, oversized query values, excessive query parameters, and blocked HTTP methods.
- Reject oversized application request bodies before business logic.
- Unknown routes must render the project 404 page.

## Browser security headers
- HSTS on HTTPS production.
- CSP, frame-ancestors none, X-Frame-Options DENY.
- X-Content-Type-Options nosniff.
- Strict referrer policy.
- Restrictive Permissions-Policy.
- Cross-origin policies and no-store caching for authentication/admin pages.

## Input and output
- Treat every route param, query, form field, JSON value, filename, URL, and metadata field as untrusted.
- Validate type, allowed characters, enum membership, maximum length, and expected format server-side.
- Use parameterized database APIs only. Never concatenate SQL from user input.
- Never render user HTML unless explicitly sanitized with an audited sanitizer.
- Internal redirect targets must be allow-listed/local paths; never redirect directly to arbitrary user-provided URLs.

## Database and authorization
- RLS is mandatory on user/admin writable tables.
- Use least-privilege policies by role and ownership.
- Service-role keys are server-only and never exposed to browser code.
- Destructive changes require explicit authorization and confirmation UX.
- Audit sensitive changes where practical.

## Files and media
- Allow-list MIME types and extensions.
- Enforce size limits before upload and in storage policy where possible.
- Generate server/storage paths; never trust a client path.
- Metadata is untrusted input and must be length-limited/sanitized.
- Soft-delete important media before permanent deletion where supported.

## Abuse / DoS
- Application-level rate limits are mandatory for login and sensitive public mutations.
- Expensive operations must be bounded (pagination, limits, timeouts, file size, query count).
- Do not fetch entire large collections when pagination can be used.
- Network-layer DDoS cannot be solved inside application code; every production host must additionally enable its strongest available WAF/CDN/rate-limit/DDoS controls.

## Secrets and deployment
- Secrets belong only in environment/secret stores; never commit them.
- `.env.example` contains names only, never real values.
- Production must use HTTPS.
- Security migrations must be applied before code that depends on them is promoted.
- Production deploy is blocked if required CAPTCHA/session/security environment variables are missing.

## New feature checklist
Before merging any new feature, confirm:
1. Authentication/authorization needed? Enforced server-side?
2. Every input bounded and validated server-side?
3. Route/query/path values validated?
4. RLS/policies correct for new DB objects?
5. File uploads allow-listed and size-limited?
6. Mutation rate-limited where externally reachable?
7. Destructive action confirmation + server result shown?
8. Secrets remain server-only?
9. 404/error behavior does not leak internals?
10. No new route bypasses the root security boundary?
