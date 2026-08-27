# RAVA Admin Localization Standard

The administration interface is locale-pure: Persian mode contains Persian user-facing copy and English mode contains English user-facing copy. Customer-entered data, URLs, identifiers, file names, currency codes, and other technical values are displayed as data and are not translated.

## Required implementation

- Server components read the locale only through `getAdminLocale()`.
- Client components read the locale only through `useAdminLocale()`.
- Every visible title, description, label, placeholder, status, confirmation, empty state, toast, validation message, date, and contextual help item has independent `fa` and `en` copy.
- Database-backed content selects the active locale and must not silently fall back to the opposite language.
- Persian terminology should be clear to an Iranian audience. English terminology should be natural for an English-speaking audience.
- Dates use `fa-IR` in Persian and `en-GB` in English unless a domain requirement says otherwise.
- Technical identifiers may remain Latin but must be visually identified as technical data rather than interface copy.

## Enforcement

`node scripts/verify-admin-localization.mjs` rejects any new admin interface file that does not use the centralized locale runtime. The temporary legacy migration queue may only shrink and must never accept a new file.

The localization Gate runs before TypeScript and the production build in CI.
