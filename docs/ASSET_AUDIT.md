# Static asset audit

Audit date: 2026-09-20. Scope: the active `public/` tree before the first Cloudflare upload. The check searched app, Worker, build, scripts, tests, docs and configuration references, including dynamic image-name construction in the public landing.

## Result

`public/` now contains 20 files and about 13.0 MB. Four items with no active runtime reference were moved out of the web root into `docs/assets/`, preserving them without publishing them as static assets:

| Previous path | New path | Reason |
|---|---|---|
| `public/images/business/pet-business-hero-wide.png` | `docs/assets/archived/pet-business-hero-wide.png` | No app or Worker reference; legacy photo only appeared in the asset regression list |
| `public/catpaw.svg` | `docs/assets/archived/catpaw.svg` | No runtime reference; old Consumer test fixture |
| `public/fonts/line-seed-th/LINE-Seed-Sans-TH-ExtraBold.woff2` | `docs/assets/archived/fonts/LINE-Seed-Sans-TH-ExtraBold.woff2` | No `@font-face` or source reference; active Business faces are Regular 400 and Bold 700 |
| `public/images/landing/ARTWORK.md` | `docs/assets/landing/ARTWORK.md` | Documentation accidentally placed inside the public static tree |

## Kept because they are used

- `pet-hotel-room.png`, `pet-grooming-transparent.png` and `pet-daycare-transparent.png` are selected by `BusinessServicesSection` through a dynamic image-name map.
- `pet-hotel-transparent.png`, `pet-care-phone.png`, `pet-passport-transparent.png` and `pet-owner-clay.png` are used by the public landing sections.
- `business-banner-care-lounge.png`, `business-banner-grooming.png` and `business-banner-hotel.png` are used by Business Home and the pet avatar fallback.
- `hero-care-v1.png` is used by the frozen Consumer prototype, Passport Studio and Business pet-avatar fallback.
- `business-register-welcome.png` is used by `/business/register`.
- `logo.svg`, `favicon.svg`, `catpaw-pattern.svg`, and the Regular/Bold LINE Seed Sans TH fonts are referenced by the active UI.

No application or route source files were deleted from this pass. Route/component usage is spread across dynamic imports and frozen Consumer flows, so removing source modules without a dedicated module-graph review would be unsafe.

## Remaining weight

The remaining largest files are active PNGs: the three Business dashboard banners, the Consumer `hero-care-v1.png`, and the registration illustration. They are kept for visual parity. A separate image-format optimization pass can convert them to WebP/AVIF and update their references; that is a performance change rather than an unused-file cleanup and was not mixed into this audit.
