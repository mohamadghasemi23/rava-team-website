# RAVA V1 Security Baseline

Security is non-negotiable and part of the architecture, not a post-launch task.

## Authentication and authorization
- Supabase Auth with secure server-managed sessions.
- Protect /admin and all admin actions.
- Use least privilege.
- Keep roles minimal: admin and editor.
- Enforce Row Level Security on application tables.
- Never expose service-role credentials to the browser.

## Public writes
Contact/project forms must go through a controlled server endpoint with:
- strict schema validation
- normalization/sanitization as appropriate
- rate limiting
- spam/abuse controls
- bounded field lengths
- generic error messages

## Uploads
- Authenticated upload only.
- Allow-list MIME/file types.
- Enforce size limits.
- Generate safe storage paths.
- Do not trust file extension alone.
- Keep private files private if introduced later.

## Web application hardening
- Strong Content-Security-Policy appropriate to production dependencies.
- HSTS when served over production HTTPS.
- X-Content-Type-Options and appropriate Referrer-Policy/Permissions-Policy.
- Avoid unsafe HTML rendering; sanitize any approved rich text path.
- Prevent open redirects.
- Validate all IDs/slugs/inputs server-side.
- Avoid leaking stack traces, internal IDs or secrets to public clients.

## Database
- Public SELECT only for data explicitly meant to be public.
- No public SELECT for profiles, leads, private settings or admin analytics.
- Public must not receive direct unrestricted INSERT/UPDATE/DELETE policies.
- Sensitive mutations should be mediated by authenticated/server-side code.

## Analytics and privacy
- Do not store raw IP addresses for the V1 analytics feature.
- Do not collect unnecessary personal data.
- Prefer daily/path aggregates for dashboard charts.

## Operations
- Keep secrets in environment variables, never committed.
- Maintain dependency updates deliberately.
- Back up production data/configuration.
- Monitor production errors and suspicious authentication/activity.
- Use HTTPS only in production.
- Review security before launch and after material auth/storage/API changes.

## Principle
No implementation may weaken this baseline merely to ship faster without explicit approval.
