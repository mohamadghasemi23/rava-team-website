# RAVA Admin Shell Consolidation

## Target

RAVA has one parent administration product. LaunchPad and future Templates may provide dedicated Template workspaces inside that parent product; they never become a second, parallel administration platform.

## Final route model

`RAVA Admin Shell → active Site → entitled Template workspace → permitted task`

- The global shell owns identity, profile, notifications, help, language, font and access to major modules.
- Site context owns the active Site, Template and environment.
- Shared platform workspaces own cross-Template capabilities such as Site selection, identity, access, billing, notifications, Help and audit history.
- A Template workspace owns the focused editing experience for that Template: its pages, permitted content, media slots, SEO fields, preview and release flow.
- Templates also define their public rendering rules, editable block schemas, media slots and protective limits.

## Migration matrix

| Existing surface | Decision | Destination |
| --- | --- | --- |
| Old dark sidebar and top bar | Replace after parity | Unified module menu and one persistent header |
| Existing permissions and server actions | Preserve | Shared authenticated workspaces |
| Existing site, billing, access, logs and help routes | Preserve and restyle incrementally | Same canonical routes inside the unified shell |
| New page editor header | Promote to shared shell pattern | All related admin routes |
| LaunchPad editor controls | Preserve as a child workspace and generalize its shared primitives | LaunchPad workspace inside the parent Admin Shell |
| Legacy advanced page editor | Hide after verified parity | Owner-only temporary fallback, then remove |
| Duplicate preview, save and Template links | Remove after parity | One action and one canonical route per outcome |

## Delivery order

1. Approve the unified shell preview in closed menu, open menu and mobile states.
2. Replace the visual shell without changing route authorization or mutations.
3. Move page editor, media and SEO into the shell and verify persisted behavior.
4. Migrate site management, access, billing, logs, help and settings one route group at a time.
5. Hide each legacy surface only after functional and visual parity is verified.
6. Remove legacy code only after rollback-safe acceptance.

## Access model

- The RAVA owner can assign LaunchPad to any eligible Site and enter its workspace when the required Site-scoped permissions are present.
- A customer can enter the LaunchPad workspace only when LaunchPad is assigned to that Site through the centralized entitlement system.
- Customer capabilities are additionally limited by scoped permissions and plan rules. Purchasing LaunchPad does not grant owner-level access, arbitrary Site creation, billing administration or entitlement management.
- Additional customer capabilities may be granted explicitly—for example advanced SEO, collaboration or release actions—without exposing unrelated owner modules.
- Navigation must show only relevant destinations, but server actions, RPCs and APIs must independently enforce tenant scope, Site scope, entitlement and operation permission.

## Non-negotiable boundaries

- One canonical path per task; no duplicate action with the same outcome.
- Server-side tenant, permission and entitlement enforcement remains unchanged during visual migration.
- Persian and English use the same information architecture with independently localized copy and direction.
- Customer-visible navigation excludes owner-only modules through permissions, not CSS hiding; hidden UI is never the authorization boundary.
- Preview approval, implementation, authenticated browser acceptance, Push and Deploy remain separate Gates.
