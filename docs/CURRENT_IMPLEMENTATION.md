# Current Implementation

Status: **REPOSITORY TRUTH — LOCAL FRONT-END PROTOTYPE (BUSINESS-FIRST REBASE)**  
Audit date: 2026-08-20  
Owner: Engineering

```text
LOCAL ONLY / BROWSER-LOCAL MOCK STATE
REAL AUTHENTICATION, AUTHORIZATION AND BUSINESS MEMBERSHIP: NOT IMPLEMENTED
REAL TOKEN SECURITY: NOT IMPLEMENTED
BACKEND AND DATABASE: NOT STARTED
REAL PAYMENTS: NOT IMPLEMENTED
PRODUCTION: NOT VERIFIED OR DEPLOYED
```

## Repository facts

- React 19.2.6, Vinext 1.0.0-beta.2, Vite 8.0.13 and Tailwind CSS 4.2.1.
- File-based routes under `app/`; shared UI under `app/_components`; prototype state under `app/_prototype`.
- Important UI dependencies: `react-icons` and `qrcode.react`.
- Validation commands: `npm run lint`, `npm test`, `npm run build`.
- Static derived manual: `docs/.htmlmanual/manual.html`; local server: `scripts/manual-server.mjs`.

## Route implementation

The repository contains **24** `page.tsx` route entries:

- 20 active live local routes.
- 3 compatibility redirects (`/business`, `/create-passport/minimum-info`, `/create-passport/success`).
- 1 legacy QR demo (`/qr-preview`).

Exact classification is owned by [ROUTES](./ROUTES.md).

## Implemented surfaces & components

| Area | What code supports | Implementation boundary |
|---|---|---|
| **Business Landing (`/`)** | Business-first Hero, `/business/login` primary CTA, daily-work product board, realistic pet-business photography, multi-service list, capability-led list, Hotel + Grooming story, Guardian-controlled trust band, designed workflow, secondary owner bridge, compact footer | Live local server components; no backend claims |
| **Business Login (`/business/login`)** | Dedicated Business Login page with mock Google authentication | Browser-local mock auth |
| **Business App Shell (BF-1)** | Dedicated business frame with Warm Golden Yellow visual system, Branch context switcher, desktop sidebar, 5-slot mobile navigation, and user menu | Browser-local demo context |
| **Business Home (`/business/home`)** | Priority-first operational overview: `สิ่งที่ต้องจัดการ`, `งานถัดไป`, `สรุปวันนี้` capacity counters, enabled module summaries, labeled demo revenue | Implemented local prototype |
| **Business Calendar (BF-2)** | Cross-module Calendar at `/business/calendar`; desktop day/week view, mobile agenda, module & status filters | Implemented local prototype |
| **Booking Foundation (BF-2)** | Contextual Booking Editor sheet/dialog: appointment, date-range, and day time models; capacity & resource conflict checks; duplicate prevention; cancellation | Browser-local session storage |
| **Shared Intake & Scanner (Phase E)** | Camera scan, manual 8-char code entry, QR validation, consent review, belongings logging, check-in completion | Implemented local prototype |
| **Consumer Foundation (Preserved)** | Anonymous create flow, 6 passport themes, My Pets, Public Safety, Lost flow, Temporary Business Sharing | Active and tested; feature expansion paused |
| **Homepage imagery** | Realistic local photo assets in `public/images/business` for Hero, services, workflow action, and closing entries; the public landing does not depend on cat stickers | Static generated assets only; `/workfiledesign` source untouched |

## Visual System (Warm Golden Yellow)

- Business UI uses **Warm Golden Yellow** (`--color-meaw-yellow-400` / `500` / `--color-meaw-business-primary`) with accessible dark ink text (`#281417` / `var(--color-meaw-ink-950)`).
- Distinct from **Amber / Orange** (`cream-900` / `peach-600`) which is reserved for Waiting/Pending operational states.
- Clean separation from Consumer surfaces (Consumer uses Rose / Cream accents; Business uses Warm Golden Yellow).
- Homepage Yellow primary is `#f2bc26` with `#281417` dark foreground; Yellow is not used as every section background.

## Prototype storage

All durable-looking behavior is same-tab `sessionStorage`:

| Key | Purpose |
|---|---|
| `meawketting:create-passport:prototype-v1` | Create/claimed-local presentation |
| `meawketting:safety-lost:prototype-v1` | Safety/Lost state |
| `meawketting:business-sharing:prototype-v1` | Temporary sharing/access state |
| `meawketting:business-intake:prototype-v1` | Demo context, scanned access, intake draft/correction, receive result, and BF-2 bookings |

## Current limitations

- No API, database, migration, persistent object identity or production Business/Branch model.
- No real Google auth, account recovery, membership, role/Branch authorization or Admin portal.
- No signed QR, server expiry/revoke/replay protection, secure consent history or audit.
- No notification, background job, document generation/storage or secure shared link.
- No payment provider, refund engine, tax document or accounting capability.

## Engineering checkpoint

- Homepage correction completed: `/` communicates Business value in the first viewport, uses Business Login as the primary CTA, keeps Guardian secondary, labels demo/planned content honestly, and avoids duplicating `/business`.
- Landing density correction completed: the main shell is capped at approximately 1200px on desktop (32px side gutters), with 24px tablet and 16px mobile gutters; the product preview may use its own visual split without stretching the full page.
- Homepage generated imagery is photographic rather than cartoon illustration. The landing uses real pet-business photography as its visual language; CI sticker assets are not part of the public landing dependency.
- Business Home, Calendar, Scan and Intake workflows were not rewritten; Consumer routes and privacy boundaries remain preserved.
- Next implementation milestone: BF-3 (Customers & Pets CRM) is planned next, but **NOT started** in this task.
