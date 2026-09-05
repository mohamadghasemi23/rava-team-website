# RAVA Project Intelligence Map (RPIM)

RPIM is the repository navigation layer for scoped development. It does not replace source inspection, security review, or release gates. It identifies the smallest trustworthy reading and verification scope before work begins.

## Workflow

1. Resolve the requested capability with `npm run rpim -- feature <key or phrase>`.
2. Read its listed paths and direct dependencies instead of scanning unrelated modules.
3. After editing, run `npm run rpim -- impact` to identify affected features and scoped checks.
4. Run the suggested scoped checks during iteration.
5. Before a commit intended for release, still run Feature Standards, RPIM verification, admin localization, TypeScript, the production build, and applicable real PostgreSQL tests.

## Commands

```bash
npm run rpim -- feature design.engine
npm run rpim -- feature media
npm run rpim -- impact
npm run rpim -- impact app/components/JourneyRail.tsx app/[slug]/public-page.module.css
npm run rpim:verify
```

`config/project-intelligence.json` is machine-readable and keyed to `config/feature-standards.json`. Every registered first-class feature must have exactly one RPIM entry containing:

- a stable feature key and bounded product area;
- a short purpose statement;
- repository path patterns that actually match files;
- direct feature dependencies;
- scoped verification commands.

The verification Gate rejects missing features, duplicates, unknown dependencies, empty verification lists, and path patterns that no longer match the repository. New features must update both registries in the same change.

## Safety boundary

RPIM reduces discovery cost; it does not prove that an apparently unrelated shared file is harmless. Changes to shared authentication, authorization, tenancy, entitlement, localization, observability, public runtime, database migrations, or deployment infrastructure require their relevant cross-cutting review and full release Gates.
