# Meawketting

Meawketting is a Business-first Pet Business Operating Platform prototype. BF1–BF12 UI is frozen; BE1 Person/Business/Branch, BE2 Customer/Pet and BE3 Booking/Calendar planning foundations are implemented locally with Vinext/Cloudflare Worker and D1.

## Run locally

```powershell
npm.cmd install
npm.cmd run db:local:migrate
npm.cmd run db:local:seed
npm.cmd run dev
```

- App: `http://localhost:3000/`
- Canonical documentation router: `docs/README.md`
- Derived static manual: `docs/.htmlmanual/manual.html`

Read `docs/README.md` first and follow its task-specific reading route. The repository intentionally keeps only the canonical owner documents; the HTML manual is not a source of truth.

The local server enables an explicit development/test identity adapter. It is not production authentication. The dev seed supplies Owner/Manager/Staff and denial scenarios; never use it as production data.

Useful backend checks:

```powershell
npm.cmd run typecheck:be1
npm.cmd run typecheck:be2
npm.cmd run typecheck:be3
npm.cmd run db:check
npm.cmd run test:be1
npm.cmd run test:be2
npm.cmd run test:be3
```

## Current prototype

The repository contains 34 `page.tsx` route entries: 30 active local routes, 3 compatibility redirects and 1 legacy QR demo. See `docs/ROUTES.md` for the mechanical classification; final validation evidence is tracked separately.

Implemented Business scope is limited to:

```text
Business Landing → mock Business Login → Business Home
→ Shared Calendar & Booking Editor → Customers & Pets
→ Business Inbox & Customer Communication
→ Scanner → Temporary Business QR validation → allowed Pet data
→ Intake / consent states → receive/check-in complete
→ Grooming Operations (BF-5; Branch capability-aware)
→ Hotel / Boarding Operations (BF-6; Branch capability-aware)
→ Billing, Payments & Revenue Foundation (BF-7; Branch-attributed)
→ Customer/Pet `ประวัติบริการ` (shared Service Record data from BF-8)
→ Team & Staff Operations (BF-9; shared Branch-aware local team data)
→ Business & Branch Settings (BF-10; shared profiles, capabilities and hours)
→ Daycare Operations (BF-11; Pet-specific attendance linked to shared Bookings)
→ Customer CRM & Retention (BF-12; derived within Customers, not another store)
```

BE1 moves Business text profile and Branch registry—including contact details, active state, enabled services and weekly hours—from browser truth to a typed server application boundary and durable D1 records. BE2 likewise makes Business-wide Customer, Business-local Pet profile/contact relationship, notes/tags/lifecycle and Customer/Pet search durable. BE3 makes Booking planning, Pet links, Branch service/resource catalogues, assignments, availability reservations and Calendar range queries durable while continuing to reference BE2 identities. Logo bytes stay a local preview because media/R2 is excluded. Grooming Jobs, Hotel Stays, Daycare Attendance and all other execution/financial/communication domains remain browser-local compatibility data until their own backend phases. Consult `docs/VALIDATION.md` for recorded evidence.

Business Home and Shared Calendar keep their frozen presentation while their Booking summaries and planning mutations use BE3 truth after hydration. Customers & Pets keeps the same frozen UI with BE2 truth, including BE3-backed upcoming Booking projections; the explicit seeded Passport/access compatibility read model remains non-authoritative. Business Inbox, the Shared Business Intake Engine, Grooming Jobs, Hotel Stays/room assignments, Daycare Attendance, Billing/Payments, Service Records/Reports and the full Team directory remain browser-local prototypes that reference durable BE2/BE3 IDs. Charge remains distinct from Payment, execution remains distinct from Booking, and Service Record remains Business-side history. Guardian/Passport authority, Consent, real messaging/LINE, payment processing, media, production auth and deployment are not implemented. BF10 text profile/Branch configuration uses BE1; BF12 CRM remains a derived projection rather than a new store.

Consumer navigation is currently four slots: live `สัตว์เลี้ยง` (`/my-pets`) and `กิจกรรม` (`/activity`), plus disabled planned `หน้าหลัก` and `ข้อความ` placeholders. `สร้าง Pet Passport` remains a contextual action in My Pets at `/create-passport`; no Consumer Home or Inbox/Chat route has been created.

The implemented BE1 access model is:

```text
Person → BusinessMembership → Business → authorized Branch → Enabled Service Modules
                                  └→ Business-wide Customer ↔ Pet contact relationship (BE2)
authorized Branch + Customer/Pet → Booking + planning Resources (BE3)
```

A Business or Branch may enable several services; there is no fixed Business Type or user-facing Workspace layer.

## Boundaries

BE1 Person, Business, Branch, BusinessMembership, Branch access, configuration, server authorization and audit/correlation are implemented locally. BE2 Customer, Pet identity/Business-local profile, neutral contact relationship, notes/tags/lifecycle/search/duplicate warnings and audit are implemented locally. BE3 Booking planning, three time models, multi-Pet links, minimal planning Resources, server availability/conflict enforcement, create idempotency and optimistic revision checks are implemented locally. OWNER has Business-wide Branch/configuration access; active OWNER/MANAGER/STAFF reuse the current operational membership foundation with Branch scope enforced server-side. Production authentication is **not implemented**; the development/test adapter fails closed unless explicitly configured.

Service Operations (BE4), Guardian/Passport/Consent/Intake, Inbox/LINE, Billing/Payment, Reports, media/R2 and Consumer backends have not started. Their existing operational UI data remains local compatibility state linked by durable BE2 Customer/Pet and BE3 Booking IDs. BE3 does not make the browser-local Team directory or Hotel room/zone execution authoritative; it persists only the minimal schedulable Resource projection needed for planning. Secure QR tokens, real payment processing, payroll, HRIS, full accounting, production verification and deployment remain out of scope. Consumer development is **PAUSED**; **BE1, BE2 and BE3 are implemented locally; BE4 is not started**.

```text
TARGET PLATFORM: Cloudflare
PRODUCTION: NOT DEPLOYED / NOT VERIFIED
PRODUCTION READY: NO
```

Cloudflare Worker/Vinext with D1 is the implemented local BE1–BE3 architecture. No production resource or deployment has been created or verified. Browser/session Booking records are dev/test fixtures only and are not backfilled into D1. BF1–BF12 are frozen; standalone CareProof/Handover is superseded. Production integration and later phases do not start automatically. See `docs/ROADMAP.md`.
