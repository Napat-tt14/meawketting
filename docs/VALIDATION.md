# Validation

Status: **BUSINESS-FIRST HOMEPAGE REDESIGN — PASS (LOCAL PROTOTYPE)**  
Validation date: 2026-08-20  
Owner: Engineering / QA

This document owns current test evidence. A passing build is not a production-readiness claim.

## Automated test results

| Command | Actual result | Notes |
|---|---|---|
| `npm.cmd run lint` | **PASS — exit 0** | 0 lint errors across app, worker, tests, scripts, and config files |
| `npm.cmd test` | **PASS — 57 tests, 57 passed** | Production build plus node:test runner; 0 failed, 0 skipped |
| `npm.cmd run build` | **PASS — 24 route entries** | Vinext / Vite production build across all 24 route entries |

## Documentation rebase checks

| Check | Current status |
|---|---|
| 12 canonical Markdown owner documents present | PASS |
| README task-specific reading router | PASS |
| Hybrid `Person → Business → Branch → Enabled Service Modules` model | PASS |
| Business Core and Service Modules separated | PASS |
| Shared domain objects and hybrid scenarios documented | PASS |
| Implemented vs planned Business scope separated | PASS |
| Shared Business Intake Engine preserved | PASS |
| Broken relative Markdown links | PASS — 0 |
| Stale legacy references | PASS — 0 |
| Derived HTML manual aligned | PASS — compact hybrid Business guide; updated last |
| `/workfiledesign` boundary respected | PASS — zero edits made to `/workfiledesign` |
| Public landing cat asset dependency | PASS — `public/images/cats` removed; landing source contains no sticker image references |

## Business-First Product Direction verification

| Check | Current status | Evidence |
|---|---|---|
| **Root Homepage (`/`) is Business Landing** | **PASS** | One Business-oriented H1, direct first-viewport operations message, daily-work product board, multi-service story, capability-led Business Core, primary CTA to `/business/login`, secondary Guardian entry |
| **`/business` Compatibility Redirect** | **PASS** | `app/business/page.tsx` issues `redirect("/")` from `next/navigation`; verified with 307 redirect test |
| **Warm Golden Yellow Visual System** | **PASS** | Primary `#f2bc26` with dark ink `#281417` at **9.98:1** contrast; Yellow reserved for actions/anchors; Waiting, Info, Success, and Error remain separate semantic colors |
| **Responsive homepage contract** | **PASS** | Browser QA at 320, 375, 390, 430, 768, 1024, and 1440px; no horizontal overflow; 48px+ Hero CTAs; main landing shell is capped at approximately 1200px at 1440px with 32px desktop gutters, 24px tablet gutters, and 16px mobile gutters; product preview stacks below copy on mobile |
| **Accessibility & browser console** | **PASS** | One H1; semantic Header/Main/Footer; native links; visible focus contract; meaningful photo alt text; 44px minimum CTA/owner targets; reduced-motion override for gradient/photo motion; 0 browser warnings/errors during homepage QA |
| **Planned-vs-implemented honesty** | **PASS** | Landing copy avoids internal status labels; the repository documentation still identifies Business Home, Calendar, Scan / Intake, and Branch context as local prototypes and marks Customers, Messaging, Finance, Reports, team management, workflow, and CareProof as direction/partial |
| **Consumer Development Freeze** | **PASS** | Existing Consumer features (Passport creation, 6 styles, My Pets, Public Safety, Lost flow, Temporary Business Sharing) preserved and passing all regression tests |
| **BF-2 Shared Booking & Calendar** | **PASS** | `/business/calendar` live local prototype with appointment, stay, and day booking models, capacity checks, and Booking Editor |
| **Shared Business Intake Engine** | **PASS** | Camera/manual scanner, QR type rejection, consent review, belongings logging, check-in completion |
| **Canonical Documentation Rebase** | **PASS** | All 12 canonical documents aligned with Business-first positioning; derived HTML manual updated last |

## Automated test suite coverage (57 tests)

1. Root Business Operating Platform landing page (`/`) copy, one Business H1, CTAs, product preview, multi-service story, trust, and metadata.
2. Homepage component composition, honest status wording, real Header anchors, Yellow/dark foreground tokens, reduced motion, and responsive CSS contract.
3. Public landing independence from the removed cat sticker directory and photographic asset inventory.
4. Semantic app canvas and separation of Consumer and Business chrome.
5. Anonymous create flow, crop, name, species, and draft recovery.
6. Passport preview, 6 themes, and 4:5 export.
7. Consumer Login mock handoff.
8. My Pets, Pet Detail, and honest Activity categories.
9. Quick Passport 5-minute QR contract.
10. Public Safety profile, Lost activation, Finder lead, and abuse reporting.
11. Temporary Business Sharing, scope, duration, and consent gateway.
12. `/business` compatibility redirect to `/`.
13. Business Login mock authentication and returnTo handling.
14. Business Home priority overview and booking-derived today counts (`/business/home`).
15. Branch switcher and capability-aware navigation (Ari, Thonglor, Onnut).
16. BF-2 Shared Calendar and Booking Editor (`/business/calendar`).
17. Appointment, stay, and day booking models, capacity conflict checks, and duplicate confirmation prevention.
18. Scanner and Intake QR type rejection, consent checks, belongings logging, and check-in completion.
19. Calm operational Business styling (Warm Golden Yellow), typography, Lucide icon wrappers, and reduced motion.
20. Absence of raw hex color values and emoji in source code.

## Partially validated / not in scope

- Real backend, database migrations, server-side authorization, and signed QR cryptographic verification.
- Real payment gateway processing, VAT invoice generation, and full accounting.
- Native mobile camera hardware permissions.
- Production hosting, SSL certificates, and custom domain deployment.
- Browser QA covers layout, links, imagery, overflow, and console; it is not a production device-lab or assistive-technology certification.
