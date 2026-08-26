# User Flows

Status: **CANONICAL GOAL-ORIENTED FLOWS (BUSINESS-FIRST REBASE)**  
Owner: UX Architecture

A flow defines goal, decision, privacy boundary and recovery. It does not prescribe page count. Route classification is owned by [ROUTES](./ROUTES.md).

## Product priority and portal entry

- **Primary Commercial Experience**: Business Landing (`/`) → Business Login (`/business/login`) → Business Home (`/business/home`) → Shared Calendar & Bookings (`/business/calendar`) → Customers & Pets (`/business/customers`) → Inbox (`/business/inbox`) → Shared Scanner & Intake (`/business/scan`).
- **Compatibility Redirect**: `/business` immediately redirects to `/`.
- **Consumer web prototype (CURRENT / FROZEN)**: Pet owners can access `/my-pets`, `/create-passport`, `/activity`, `/passports`, and `/qr-preview`. These routes remain retained and regression-tested, but the standalone web experience is no longer the target final Guardian channel.
- **Guardian target (FUTURE / PAUSED)**: LINE-first experience through a LINE Mini App. LINE Login, the Mini App, LINE notifications, and production identity linking are not implemented.
- **Priority order**: P0 Business Product → P1 Business workflows → P2 Guardian touchpoints required by Business workflows → P3 independent Guardian expansion.

### Business navigation architecture

- Desktop shows live `หน้าหลัก`, `ปฏิทิน`, `ลูกค้าและสัตว์เลี้ยง`, and `ข้อความ`.
- The Sidebar keeps `งานบริการ · ยังไม่เปิดใช้` visible for services enabled by the active Branch, followed by planned `การเงิน`, `รายงาน`, `ทีม`, and `ตั้งค่า`. These are disabled buttons, not routes.
- Mobile keeps Home, Calendar, Scan, Messages, and More. More contains the live Customers link plus the same Branch-enabled service and management planned groups.

## Business flows (Primary commercial experience)

### 1. Business entry and authentication flow
- **Entry**: Root homepage (`/`) or `/business/login`.
- **Landing (`/`)**:
  1. Understand Business value in the first viewport: bookings, schedule, customers/pets, service work, team/branches, intake, communication, and revenue direction.
  2. Inspect the clearly labeled mock “Today” product preview; it is demo data, not live customer data.
  3. Choose the primary CTA **เข้าสู่ระบบสำหรับธุรกิจ** → `/business/login`, or scroll to `#business-core`.
  4. Review supported multi-service businesses, the connected Hotel + Grooming scenario, product-direction workflow, and Guardian-controlled trust layer.
  5. Pet owners use the visually secondary `#guardian` bridge → `/my-pets`, with `/create-passport` as a supporting action.
- **Login (`/business/login`)**: Google prototype authentication. Redirects to `/business/home`.
- **Context Switcher**: Frontdesk staff switches between demo branches (Whisker Rest Ari, Whisker Rest Thonglor, Paw Partner Onnut). Active modules, team members, and bookings update coherently.

### 2. Business Home & Today's priorities (BF-1)
- **Route**: `/business/home`.
- **Flow**:
  1. Review priority cues in `สิ่งที่ต้องจัดการ` (e.g., arrivals, pending decisions).
  2. Use the 16:9 banner as the visual focal point. It auto-advances every six seconds, pauses on hover/focus, and always provides previous/next arrows.
  3. On desktop, start `เพิ่มการจอง`, `สแกนรับเข้า`, or `ค้นหาลูกค้า` from the action rail to the banner's right; smaller screens stack the same actions below it.
  4. Inspect `งานถัดไป`, today counters, and compact Grooming/Hotel summaries.
  5. Open the Inbox-derived `ข้อความใหม่` item; the count and navigation badge use the same browser-local conversation state.

### 3. Shared Booking & Calendar flow (BF-2 Live)
- **Route**: `/business/calendar`.
- **Flow**:
  1. Inspect a Sunday-first Calendar in Day, Week, Month, or a 28/35/42-day Custom range on desktop/tablet; mobile defaults to chronological Agenda. Returning staff receive their cookie-saved view preference.
  2. Filter by service module (Grooming / Hotel / Daycare) or status (Confirmed, Arrived, Pending, Cancelled).
  3. Read Grooming as a peach time block, Hotel as a continuous sky stay span, and Daycare as a mint day item; every item also names its service and status.
  4. Click `เพิ่มการจอง`, select a Branch-enabled service, Customer, Pet, and date/time. If the relationship is missing, reuse Add Customer/Add Pet without leaving the sheet.
  5. Automatic capacity and resource validation checks exclusive groomer/table/dryer collisions, hotel room limits, or daycare zone capacity before review.
  6. Drag a supported Booking or use either edge to shrink/extend its time/stay; long-press starts touch drag. Valid changes save through the shared Booking state; conflicts keep the original and offer concrete recovery.
  7. Hold Alt while dragging to duplicate, or focus a Booking and use Ctrl/Cmd+C then Ctrl/Cmd+V. Copies receive a new Booking ID and still pass availability checks.
  8. Select the Booking and edit fields as the complete keyboard alternative to drag/resize.
  9. Review and confirm; cancellation retains history while releasing local allocation. A compact legend remains below the schedule and success feedback never shifts the grid.

### 4. Shared Business Intake Engine flow (Phase E Live)
- **Route**: `/business/scan` → `/business/intake/[intakeId]`.
- **Flow**:
  1. Camera scan or manual 8-character entry for Temporary Business QR.
  2. Pre-validation checks QR type, active Business, active Branch, purpose, scope, and expiry.
  3. Quick Passport and Public Safety QR contracts are strictly rejected.
  4. Display allowed pet profile and medical/care facts without leaking unshared fields.
  5. Log belongings (อาหาร, ยา, ปลอกคอ, ของเล่น, อื่น ๆ) and intake notes.
  6. Review intake summary and confirm receive/check-in.
  7. Status advances to Checked In.

### 5. Customers & Pets foundation (BF-3 Live Local Prototype)
- **Routes**: `/business/customers` → `/business/customers/[customerId]`.
- **Flow**:
  1. Frontdesk searches by Customer name, Pet name, or phone using one clear search field and only actionable relationship filters; Passport connected/not-connected is not a browse filter.
  2. Open the stable Business relationship detail. The page first explains the relationship, then separates contact/actions, local Pets, upcoming/recent Bookings, lightweight tags and Business notes.
  3. Add a local Customer without a Meawketting account or Pet Passport. A matching phone shows a calm possible-duplicate warning; staff chooses existing record or explicitly continues without an automatic merge.
  4. Add a local Pet relationship with name/species and an optional Business note. It starts as `ยังไม่ได้เชื่อม Pet Passport`.
  5. Start the existing Booking Editor with Customer and optional Pet preselected; no new Booking engine is created.
  6. Treat `ผู้ติดต่อหลัก` as a local Business relationship only. Passport connection and active consent are separate, Guardian data stays read-only, and Business notes do not write into Pet Passport.

### 6. Inbox & Customer Communication (BF-4 Live Local Prototype)
- **Route**: `/business/inbox`.
- **Flow**:
  1. Search by Customer name, Pet name, service, or current message text in the single-boundary search field; optionally use the compact all/unread/active-service filters.
  2. Desktop selects a conversation beside the list. At 320–430px, open a row as a full conversation task and return with the explicit Back control; selection recovers through `?conversation=<id>`.
  3. Read only useful Customer/Pet/Booking/Branch context. Opening a conversation clears its browser-local unread count but does not claim server synchronization.
  4. Send text or choose one of three unnumbered Thai quick replies. The dashed add control extends the local list; collapse/expand is remembered by a cookie. Messages keep explicit local delivery labels.
  5. From Customer Detail, `ส่งข้อความ` reuses the existing Business + Customer conversation; Booking may add Pet/Booking/Branch context without creating another permanent thread.
  6. From a valid Booking, send one structured `ขออนุมัติเพิ่มบริการ` request with service, demo amount, added time, and optional note. The state begins at `รอเจ้าของตอบ`.
  7. The minimum Guardian-response simulator is visibly labeled as a local test. Business has no normal approve action, duplicate decisions are idempotent, and approval does not mutate Booking or create Charge/Payment in BF-4.
  8. Switching Branch within the same Business keeps the Customer conversation. Context from another Branch is named and its Booking action is withheld; protected Passport values remain governed by the original active consent.

### 7. Planned Business flows
- **Multi-Service Checkout & Billing (BF-5)**: Combine hotel nights, grooming add-ons, and daycare into one visit checkout.

---

## Consumer web prototype flows (Current / Retained / Frozen)

| Flow | Happy path | Critical recovery / boundary |
|---|---|---|
| Create and claim | Landing bridge → photo/crop/name/species → Passport Preview → mock Login → Pet Detail | Preserve draft/source image through errors; no public sharing before choice |
| My Pets / Pet Detail | Pet library → Passport-first detail → compact info/care/history → management actions | Relationship loss and missing data reveal no private content |
| Quick Passport QR | Flip Passport → five-minute QR/barcode/countdown → renew or flip back | Passport-safe scope only; no Business/Safety permission |
| Public Safety / Lost | Configure public-safe fields → activate Lost → Finder lead → Guardian review → mark found | Same public identity changes state; restricted contact/location; abuse path |
| Temporary Business Sharing | Select Business/Branch → scope → duration → consent → QR → gateway/decision → revoke/history | No Pet value before valid context and active consent |
| Returned Service History | History list → stable record → evidence/document/correction request | **PLANNED**; internal Business data and unshared evidence excluded |

## Future LINE-first Guardian flow (Conceptual / Paused / Not implemented)

```text
Add Meawketting LINE
→ open LINE Mini App
→ LINE Login
→ My Pets
→ + Add Pet
→ Cat / Dog
→ Pet Profile / Pet Passport
```

This is a target flow only; it does not create routes or imply an existing integration. Later Business-connected actions may include booking, store messages, add-service approval, Consent / Sharing, Temporary Business access, CareProof, Service History, Safety / Lost, and Notifications. LINE identity remains separate from Pet ownership authority and consent.

### Consumer navigation composition

The previous four-item standalone Consumer shell is **CURRENT WEB PROTOTYPE / SUPERSEDED AS FINAL CONSUMER DIRECTION**:
```text
หน้าหลัก (PLANNED / DISABLED) · สัตว์เลี้ยง (LIVE: /my-pets) · กิจกรรม (LIVE: /activity) · ข้อความ (PLANNED / DISABLED)
```
- Keep this composition truthful for the retained web prototype only. Do not treat it as final LINE Mini App navigation.
- `สร้าง Passport` is a contextual action inside My Pets (`/create-passport`) in the current prototype, not a primary navigation bar item.
- Do not design detailed LINE Mini App navigation in this documentation correction; decide it in the future Consumer LINE Mini App phase.
- Signed-in consumer user menu handles session and account identity only; it never exposes internal business operations.
