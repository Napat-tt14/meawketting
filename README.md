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

The build contains 27 route entries: 23 active local routes, 3 compatibility redirects and 1 legacy QR demo. See `docs/ROUTES.md` for the mechanical classification.

Implemented Business scope is limited to:

```text
Business Landing → mock Business Login → Business Home
→ Shared Calendar & Booking Editor → Customers & Pets
→ Business Inbox & Customer Communication
→ Scanner → Temporary Business QR validation → allowed Pet data
→ Intake / consent states → receive/check-in complete
```

Business Home (BF-1), Shared Calendar & Booking Editor (BF-2), Customers & Pets (BF-3), Business Inbox (BF-4), and the reusable **Shared Business Intake Engine** (Phase E) are browser-local prototypes. BF-4 includes local text/quick replies/unread and a structured add-service approval test boundary; real messaging, notifications, attachments, and full Consumer Inbox are not implemented. Grooming Operations, Hotel Operations, Daycare Operations, Billing/Revenue, and cross-service CareProof remain planned.

Consumer navigation is currently four slots: live `สัตว์เลี้ยง` (`/my-pets`) and `กิจกรรม` (`/activity`), plus disabled planned `หน้าหลัก` and `ข้อความ` placeholders. `สร้าง Pet Passport` remains a contextual action in My Pets at `/create-passport`; no Consumer Home or Inbox/Chat route has been created.

The Business product model is:

```text
Person → Business → Branch → Enabled Service Modules
```

A Business or Branch may enable several services; there is no fixed Business Type or user-facing Workspace layer.

## Boundaries

Everything is local mock state for UI validation. Backend, database, real authentication/authorization, secure QR tokens, real payments, production verification and deployment have not started.

```text
TARGET PLATFORM: Cloudflare
PRODUCTION: NOT DEPLOYED / NOT VERIFIED
```

Cloudflare is the selected production platform direction. No Cloudflare runtime/storage architecture or deployment has been chosen or verified. BF-5 and later phases do not start automatically; see `docs/ROADMAP.md`.
