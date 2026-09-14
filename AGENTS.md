# RAVA TEAM Website — Codex Operating Rules

## Project reboot
This repository has been rebooted. The previous direction (generic Website OS / site builder / multi-tenant CMS) is NOT the product goal anymore.

## Product definition
RAVA V1 is a premium Persian RTL agency website for RAVA TEAM. Its primary purpose is to sell web design, web development, e-commerce and digital product services. Brand/content and AI/automation are secondary complementary services.

## Mandatory Codex preflight
Before starting **every new milestone**, Codex must read and execute `CODEX_PREFLIGHT_CHECKLIST.md` and report the result in Persian using `PASS / WARNING / FAIL / N/A`.

- Core preflight gates (Git safety, runtime, dependencies, build, security, env and scope) are always required.
- VPS/server, PostgreSQL, Docker, ports and browser smoke checks are conditional and must run only when the current milestone actually depends on them.
- If any required gate is `FAIL`, do not begin milestone implementation until the blocker is fixed or explicitly reported.
- Preflight must not delete files/branches, run destructive Git commands, force-push, merge to `main`, or execute production migrations unless the approved milestone explicitly requires a reviewed migration.
- Preflight is a fast gate, not a separate product milestone; avoid unnecessary environment work that increases Codex token usage.

## Non-negotiable rules
1. Do not rebuild or extend a generic page builder, website generator, multi-tenant SaaS, or Website OS.
2. Do not invent UI. The public homepage must faithfully adapt the selected Modern Agency reference structure and interactions to RAVA.
3. Keep the public design light/white or off-white, Persian RTL, minimal and premium.
4. Keep layout and section structure fixed; content is editable through a lightweight admin CMS.
5. Prefer the simplest architecture that satisfies V1.
6. Security is non-negotiable: server validation, RLS, least privilege, safe uploads, rate limiting, secure sessions, CSP/security headers, no secrets in client code.
7. Public content may be editable, but admin users must not be able to arbitrarily redesign pages through drag/drop blocks.
8. Preserve useful legacy code only when it supports the new V1 directly. Archive or remove obsolete complexity.
9. Concept projects are allowed only if clearly labeled as Concept Project.
10. Before changing architecture or scope, read docs/PRODUCT.md, docs/SCOPE.md, docs/ARCHITECTURE.md, docs/DESIGN_SYSTEM.md, docs/ADMIN.md, docs/SECURITY.md and docs/ROADMAP.md.

## Language
- Public website: Persian, RTL.
- Admin panel: Persian, RTL.
- Internal code identifiers may remain English.
- Architecture should remain i18n-ready for a future English version, but V1 ships Persian-first.

## Delivery behavior
- Work from current documented scope only.
- Avoid speculative features.
- Prefer implementation over re-design.
- Do not alter the Modern Agency-inspired hierarchy unless explicitly approved.
- Keep changes reviewable and incremental.
