# Meawketting

Meawketting is a local front-end prototype for a Business-first Pet Business Operating Platform with Pet Passport & Guardian Trust Network.

## Run locally

```powershell
npm.cmd run dev
```

- App: `http://localhost:3000/`
- Canonical documentation router: `docs/README.md`
- Derived static manual: `docs/.htmlmanual/manual.html`

Read `docs/README.md` first and follow its task-specific reading route. The repository intentionally keeps only the canonical owner documents; the HTML manual is not a source of truth.

## Current prototype

The build contains 30 route entries: 26 active local routes, 3 compatibility redirects and 1 legacy QR demo. See `docs/ROUTES.md` for the mechanical classification.

Implemented Business scope is limited to:

```text
Business Landing → mock Business Login → Business Home
→ Shared Calendar & Booking Editor → Customers & Pets
→ Business Inbox & Customer Communication
→ Scanner → Temporary Business QR validation → allowed Pet data
→ Intake / consent states → receive/check-in complete
→ Hotel / Boarding Operations (BF-6; Branch capability-aware)
→ Billing, Payments & Revenue Foundation (BF-7; Branch-attributed)
→ Customer/Pet `ประวัติบริการ` (shared Service Record data from BF-8)
```

Business Home (BF-1), Shared Calendar & Booking Editor (BF-2), Customers & Pets (BF-3), Business Inbox (BF-4), the reusable **Shared Business Intake Engine** (Phase E), **Grooming Operations Foundation (BF-5)**, **Hotel / Boarding Operations Foundation (BF-6)**, **Billing, Payments & Revenue Foundation (BF-7)**, and the shared **Service Record foundation (BF-8)** are browser-local prototypes. `/business/hotel` is live only for Hotel-enabled Branches and executes Pet-specific Stays linked to shared date-range Bookings, Customer/Pet identity, Branch Resources, Intake, Inbox, Calendar, and Home. `/business/billing` is live for local Charges, payment records, checkout review and Branch-attributed revenue. Completing Grooming or Hotel execution creates/updates one source-keyed Service Record in the existing Business envelope; repeated completion is idempotent. A Charge records what is owed; a Payment records how and when it is paid. Payment status is derived from recorded allocations, so completed Grooming/Hotel execution does not mean paid. Customer/Pet detail shows the record in one inline `ประวัติบริการ` timeline/list with permitted details and optional short payment reference. The standalone CareProof and handover experience is **SUPERSEDED**; real photo storage and Guardian/LINE visibility are not implemented. BF-4 includes local text/quick replies/unread and a structured add-service approval test boundary; Business never approves a Guardian request itself. Real messaging, notifications, attachments, LINE transport, and full Consumer Inbox are not implemented. Daycare Operations, backend, and later phases remain planned.

Consumer navigation is currently four slots: live `สัตว์เลี้ยง` (`/my-pets`) and `กิจกรรม` (`/activity`), plus disabled planned `หน้าหลัก` and `ข้อความ` placeholders. `สร้าง Pet Passport` remains a contextual action in My Pets at `/create-passport`; no Consumer Home or Inbox/Chat route has been created.

The Business product model is:

```text
Person → Business → Branch → Enabled Service Modules
```

A Business or Branch may enable several services; there is no fixed Business Type or user-facing Workspace layer.

## Boundaries

Everything is local mock state for UI validation. Backend, database, real authentication/authorization, secure QR tokens, real payment processing, full accounting, tax, refund policy, cross-Branch settlement, production verification and deployment have not started.

```text
TARGET PLATFORM: Cloudflare
PRODUCTION: NOT DEPLOYED / NOT VERIFIED
```

Cloudflare is the selected production platform direction. No Cloudflare runtime/storage architecture or production deployment has been chosen or verified. Grooming, Hotel, BF-7 Billing, and BF-8 shared Service Record data are current local foundations; standalone CareProof/Handover is superseded. Daycare, backend, and later phases remain planned and do not start automatically. See `docs/ROADMAP.md`.
