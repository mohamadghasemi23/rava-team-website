# RAVA Website V1 — Codex Preflight Checklist

This preflight is mandatory before starting any new milestone. Its purpose is to prevent environment-related trial and error, reduce Codex token waste, and stop a milestone from being blocked halfway by runtime, dependency, database, port, Docker, build, or browser-test issues.

Use two levels:

- **Core preflight — always required:** Git safety, runtime, dependency health, build gates, env/security checks, milestone scope.
- **Conditional infra preflight — run only when the milestone actually depends on it:** VPS/server resources, PostgreSQL connectivity, Docker, local ports, browser/visual smoke. Do not burn time or tokens validating infrastructure that is not used by the current milestone.

Never delete existing files or branches as part of preflight. Never run destructive production operations during preflight.

## 1. Git safety — REQUIRED

Run and report:

```bash
git status --short --branch
git branch --show-current
git fetch origin --prune
git log -1 --oneline
```

Rules:

- Confirm the intended milestone branch before editing.
- Confirm there are no accidental local changes that would be overwritten.
- No `git reset --hard`.
- No `git clean`.
- No force push.
- No deletion of existing branch/file history during preflight.
- Do not merge to `main` during preflight.
- If the milestone branch does not exist, create a dedicated branch from the approved base.

## 2. Runtime — REQUIRED

Production runtime for RAVA V1 is **Node 22** unless the deployment target is explicitly changed and documented.

Run:

```bash
node --version
npm --version
npx --version
```

Verify:

- Node major version is 22.
- `package-lock.json` exists and matches `package.json`.
- Use `npm ci`, not ad-hoc `npm install`, for validation.
- Do not add `@latest` blindly.
- Do not use `--force` or `--legacy-peer-deps` to hide dependency conflicts.
- Package version changes must be explicit, minimal, and justified.

## 3. Server resources — CONDITIONAL

Run this only when the milestone uses a VPS, self-hosted build, Docker host, or server-side deployment environment.

```bash
df -h
free -h
swapon --show
nproc
```

Verify there is adequate disk/RAM/swap/CPU for:

- `npm ci`
- production build
- temporary build cache
- Docker image build, if Docker is actually used

Do not assume VPS health from an old report. Inspect the real server used by the milestone.

## 4. Dependency health — REQUIRED

Run:

```bash
npm ci --no-audit --no-fund
npm audit --audit-level=high
```

Rules:

- Treat unresolved high/critical vulnerabilities as a blocker unless clearly non-exploitable in this application and documented.
- Check peer-dependency warnings instead of suppressing them.
- Prefer targeted compatible patch/minor updates.
- Never run broad `npm audit fix --force`.
- After any dependency change, rerun install, typecheck/lint/tests/build/audit.

## 5. Build gates — REQUIRED

Run the scripts that exist in `package.json`:

```bash
npm run lint
npm run typecheck
npm test        # only if a test script exists
npm run build
```

Rules:

- Missing test coverage is a WARNING, not permission to invent fake tests.
- Any TypeScript or production build error is FAIL.
- If Next.js/Turbopack/native bindings fail, report the exact root cause.
- Document workarounds explicitly; never hide them in CI or local shell state.

## 6. Database preflight — CONDITIONAL, REQUIRED FOR DB-TOUCHING MILESTONES

RAVA V1 uses Supabase/PostgreSQL.

Before a DB-touching milestone:

- Confirm the target Supabase/PostgreSQL project is ACTIVE/reachable.
- Verify test/staging connectivity before changing schema.
- Inspect the real schema/migration state first.
- Back up before destructive or structural production work.
- If production credentials are intentionally unavailable, use a disposable/test database where possible.
- Do not execute production migrations during generic preflight.
- A milestone may run a migration only when its approved scope explicitly requires it and the migration plan has been reviewed.
- Never apply `supabase/schema.sql` blindly over an unknown existing database.

## 7. Docker — CONDITIONAL

RAVA V1 currently targets a lean Next.js/Netlify deployment. Docker is **not a mandatory preflight dependency unless the active milestone explicitly uses Docker/VPS deployment**.

If Docker is required, run:

```bash
docker --version
docker info
```

Then verify:

- daemon is healthy
- production image can build
- container can start locally
- smoke test is performed on localhost only

Do not introduce Docker into the repo merely to satisfy preflight.

## 8. Ports — CONDITIONAL

Before local/browser/container smoke tests:

```bash
# Linux examples
ss -ltnp | grep -E ':3000|:3100' || true
```

Rules:

- Check required ports first.
- Identify the owning process before stopping anything.
- Never kill unrelated processes.
- Prefer an alternate free port when safer.

## 9. Browser / visual smoke — CONDITIONAL

Run when a milestone changes public UI, admin UI, auth flow, routing, forms, or deploy/runtime behavior.

- Check whether Playwright/Chromium or an equivalent headless browser is already available.
- Do not add a heavy permanent dependency only for one temporary smoke test unless approved.
- Temporary tooling must not mutate production dependencies unnecessarily.
- At minimum smoke-test:
  - `/`
  - `/services`
  - `/work`
  - `/about`
  - `/contact`
  - `/login`
  - `/admin` protection behavior
- For UI milestones, test representative mobile and desktop widths.

## 10. Security smoke — REQUIRED

Verify:

- security headers configuration remains present
- no secret/service-role key is referenced from client-side code
- no privileged env value is logged or bundled
- `/admin` route protection remains active
- admin/private routes are excluded from indexing where relevant
- public forms use controlled server endpoints and validation
- no arbitrary raw HTML/script path is introduced

## 11. Env / deployment skeleton — REQUIRED

Verify `.env.example` matches all runtime env names used by the app.

Current required env names:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
CONTACT_RATE_LIMIT_SALT
ANALYTICS_HASH_SALT
```

Rules:

- Never commit real secrets.
- Ensure deployment/runtime env names match application code.
- Ensure any Docker/runtime env wiring is consistent only if Docker is actually used.

## 12. Milestone discipline — REQUIRED

Before coding:

1. Read `AGENTS.md`.
2. Read the relevant milestone/issue/spec docs.
3. Confirm the exact milestone scope.
4. Run this preflight.
5. Report each gate in Persian as `PASS`, `WARNING`, `FAIL`, or `N/A`.
6. If a required gate is `FAIL`, stop implementation until the blocker is fixed or explicitly reported.
7. Work only inside the approved milestone scope.
8. Use a dedicated milestone branch when starting a new milestone; do not merge during preflight.
9. After implementation, rerun relevant quality gates.
10. Commit + push + open/update PR only after gates pass.
11. Do not merge unless explicitly approved.
12. Final progress report must be in Persian.

## Required report format

```text
RAVA CODEX PREFLIGHT
Milestone: <name>
Branch: <branch>

Git safety: PASS/WARNING/FAIL
Runtime: PASS/WARNING/FAIL
Server resources: PASS/WARNING/FAIL/N/A
Dependencies: PASS/WARNING/FAIL
Build gates: PASS/WARNING/FAIL
Database: PASS/WARNING/FAIL/N/A
Docker: PASS/WARNING/FAIL/N/A
Ports: PASS/WARNING/FAIL/N/A
Browser smoke: PASS/WARNING/FAIL/N/A
Security smoke: PASS/WARNING/FAIL
Env/deployment: PASS/WARNING/FAIL
Milestone scope: PASS/WARNING/FAIL

Blockers:
- ...

Warnings:
- ...

Decision: READY / NOT READY
```

Preflight is a gate, not a development milestone. Keep it fast, factual, and scoped.