# RAVA TEAM Website / Platform

Production-oriented foundation for the RAVA TEAM multi-tenant website platform.

## Current architecture direction

RAVA is evolving from a single managed website into a multi-tenant SaaS platform with:

- Organizations and Sites
- Preview / Staging / Production environments
- Module entitlements and commercial tiers
- Scoped roles and granular permissions
- Tenant-aware audit, error and security observability
- Bilingual Help / Academy foundations
- Owner Control Plane for provisioning and managing customer sites

## Development rule

A feature is considered implemented only when its code exists in this repository and is represented by a real Git commit. Conversation-only designs are not treated as completed work.

## Verification

Pull requests must pass the repository CI TypeScript type-check and Next.js build before they are considered ready to merge.

## Deployment

Production deployment and production database migration application are separate actions and must not be performed without explicit approval.

## Current platform-core work

The active platform core introduces tenant-aware permission evaluation, safe audit/error event writers, structured error IDs, redacted log contexts, searchable Logs/Errors admin views, and safe 404/error boundaries.

See `docs/MIGRATION_RUNBOOK.md` for deployment/migration operational notes.
