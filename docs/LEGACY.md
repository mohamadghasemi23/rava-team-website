# Legacy Handling

## Archive
A safety branch exists for the pre-reboot state:
`archive/pre-rava-reboot-2026-09-13`

Do not delete legacy ideas or code solely because they are out of V1 if they may be useful later; preserve them in archive/history, not in the active implementation path.

## Legacy concepts no longer driving V1
- Website OS
- multi-tenant site builder
- generic page builder
- broad role/permission platform
- revisions/audit platform
- scheduled publishing
- client website factory

## Branches to treat as legacy until audited
- agent/platform-core-foundation
- agent/production-v1-foundation
- design/rava-ui-visual-handoff
- feature/media-manager
- feature/media-polish
- feature/media-scale

These branches may contain useful code, but none is automatically authoritative after the reboot.

## Rule
The authoritative direction is the reboot documentation on `reboot/rava-v1-spec`, then the cleaned implementation once merged into main.
