# User Flows

Status: **CANONICAL GOAL-ORIENTED FLOWS (BUSINESS-FIRST REBASE)**  
Owner: UX Architecture

A flow defines goal, decision, privacy boundary and recovery. It does not prescribe page count. Route classification is owned by [ROUTES](./ROUTES.md).

## Product priority and portal entry

- **Primary Commercial Experience**: Business Landing (`/`) → Business Login (`/business/login`) → Business Home (`/business/home`) → Shared Calendar & Bookings (`/business/calendar`) → Grooming Operations (`/business/grooming`, when enabled) or Hotel Operations (`/business/hotel`, when enabled) → Customers & Pets (`/business/customers`) → Inbox (`/business/inbox`) → Shared Scanner & Intake (`/business/scan`).
- **Compatibility Redirect**: `/business` immediately redirects to `/`.
- **Consumer web prototype (CURRENT / FROZEN)**: Pet owners can access `/my-pets`, `/create-passport`, `/activity`, `/passports`, and `/qr-preview`. These routes remain retained and regression-tested, but the standalone web experience is no longer the target final Guardian channel.
- **Guardian target (FUTURE / PAUSED)**: LINE-first experience through a LINE Mini App. LINE Login, the Mini App, LINE notifications, and production identity linking are not implemented.
- **Priority order**: P0 Business Product → P1 Business workflows → P2 Guardian touchpoints required by Business workflows → P3 independent Guardian expansion.

### Business navigation architecture

- Desktop shows live `หน้าหลัก`, `ปฏิทิน`, `ลูกค้าและสัตว์เลี้ยง`, and `ข้อความ`. Under `งานบริการ`, `อาบน้ำ / ตัดขน` and `โรงแรม` are live only when the active Branch enables the matching capability.
- The Sidebar keeps Daycare and the planned `การเงิน`, `รายงาน`, `ทีม`, and `ตั้งค่า` rows visible as disabled architecture. A Branch without Grooming or Hotel never presents that service execution board as usable.
- Mobile keeps Home, Calendar, Scan, Messages, and More. More contains live Customers plus only the capability-enabled Grooming/Hotel destinations, followed by disabled planned groups.

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
  4. Inspect `งานถัดไป`, today counters, and compact service summaries. Grooming values derive from Service Job state; Hotel arrivals, departures, occupancy/capacity, available/reserved, ready-for-pickup and attention derive from the same Branch Hotel Stay state as Hotel Operations.
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
  7. Status advances to Checked In. A Grooming launch attaches the matching Service Job; a Hotel launch carries the explicit `hotelStayId`, returns to that same Stay, and enables its guarded check-in. The engine never infers a Stay from free text or creates a second Customer, Pet, Booking, Intake, Job, Stay, or check-in flow.

### 5. Customers & Pets foundation (BF-3 Live Local Prototype)
- **Routes**: `/business/customers` → `/business/customers/[customerId]`.
- **Flow**:
  1. Frontdesk searches by Customer name, Pet name, or phone using one clear search field and only actionable relationship filters; Passport connected/not-connected is not a browse filter.
  2. Open the stable Business relationship detail. The page first explains the relationship, then separates contact/actions, local Pets, upcoming/recent Bookings, current/recent Hotel Stays, lightweight tags and Business notes.
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
  5. From Customer Detail or Hotel Stay, `ส่งข้อความ` reuses the existing Business + Customer conversation; Booking/Stay may add Pet/Booking/Branch context without creating another permanent thread. Business notes, care notes and incident notes never become Customer messages automatically.
  6. From a valid Booking, send one structured `ขออนุมัติเพิ่มบริการ` request with service, demo amount, added time, and optional note. The state begins at `รอเจ้าของตอบ`.
  7. The minimum Guardian-response simulator is visibly labeled as a local test. Business has no normal approve action and duplicate decisions are idempotent. When the request is linked to a Grooming Service Job, a Guardian approval updates only that Job's local add-ons and estimated duration; it never mutates Booking or creates Charge/Payment.
  8. Switching Branch within the same Business keeps the Customer conversation. Context from another Branch is named and its Booking action is withheld; protected Passport values remain governed by the original active consent.

### 7. Grooming Operations Foundation (BF-5 Live Local Prototype)
- **Route**: `/business/grooming` for a Grooming-enabled active Branch only.
- **Goal**: answer the execution questions for today—who is waiting, in service, ready for pickup, assigned to a groomer/resource, or needs attention—without turning Calendar into a second board.
- **Flow**:
  1. Open the Grooming Today board from live service navigation, Home, Calendar context, or the post-Intake handoff. A Branch without Grooming receives a calm unavailable state rather than a working board.
  2. Scan Pet photo/avatar, Pet name, scheduled time, assigned groomer, status and a short attention cue from the clearly aligned cards; the board has no date/job filter rail.
  3. On desktop/tablet, drag a Job to the desired active status. The pointer-following preview, reversible movement, valid/invalid destination state, and settle/rollback feedback make the outcome explicit. On mobile, use the grouped status list or open the Job and select a status instead; no work depends on drag.
  4. Open the focused detail drawer/sheet to see shared Pet/Customer contact context, service/timing, resource assignments, internal Business notes, Inbox action, add-on request state and short Job history. Protected Passport data is not pulled into this surface.
  5. Assign or change `ช่าง`, `จุดบริการ`, or `เครื่องเป่า` through the shared Resource foundation. The existing availability evaluator blocks a conflicting local assignment and keeps the prior assignment intact.
  6. Receive a valid Grooming booking through shared Intake. The matching Job changes through the check-in transition; the board then permits movement among `รอรับเข้า`, `รับเข้าแล้ว`, `รอเริ่ม`, `กำลังทำ`, `พร้อมรับกลับ`, and `เสร็จแล้ว` while cancellation remains terminal.
  7. If an add-on needs consent, send the existing structured Inbox request. The Job shows `รอลูกค้าตอบ`; Business cannot approve. A local Guardian-simulator approval appends the add-on and time only to the linked Job.
  8. On completion, a lightweight Grooming service entry appears in the shared Customer/Pet recent history. This is not a CareProof, certificate, photo proof, or billing record.

### 8. Hotel / Boarding Operations Foundation (BF-6 Live Local Prototype)
- **Route**: `/business/hotel` for a Hotel-enabled active Branch only.
- **Goal**: answer who arrives/leaves today, who is staying, where each Pet is assigned, remaining capacity, care due, attention notes, and who is ready for pickup without turning Calendar into an execution board.
- **Flow**:
  1. Open Hotel Operations from capability-gated navigation, Home, Customer detail, Calendar context, or the explicit post-Intake handoff. A Branch without Hotel receives a calm unavailable state and no live Hotel menu/command.
  2. Review Today arrivals, departures, currently staying, care due, unresolved attention/incident notes, ready-for-pickup work, and occupied/reserved/available capacity from the shared Branch Stay state.
  3. On desktop/tablet, scan each room/zone across a continuous date range. Occupied, reserved and available counts respect room capacity, including multi-Pet Bookings as separate Pet-specific Stays.
  4. Start with the existing Hotel Booking in Calendar, then open the Shared Business Intake Engine with its explicit Stay target. After consented Intake succeeds, assign a valid room and move through checked-in → staying → ready for pickup/checkout → completed; cancelled/no-show remain terminal alternatives as appropriate.
  5. Assign or move a Stay only after capacity/conflict validation. A valid move records date-bounded assignment and movement history; an invalid target preserves the original room and shows rollback feedback.
  6. Complete lightweight food, water, activity, cleaning/check and note tasks. Medication is actionable only when the same Stay has Customer-confirmed Intake authorization plus explicit instructions; this is not a medical system.
  7. Keep Business notes and lightweight incident/attention notes internal. Use the existing Inbox action for Customer communication so no Conversation is duplicated.
  8. On mobile, use grouped Today/Stay lists and the detail sheet with the room selector and lifecycle controls. No work depends on dragging or on squeezing the desktop occupancy grid into the viewport.
- **Boundary**: Calendar remains date-range planning; Hotel Operations owns Stay execution and occupancy. Billing, pricing, full inventory, full Incident Management, medical records and CareProof are not part of BF6.

### 9. Planned Business flows
- **Multi-Service Checkout & Billing**: Combine hotel nights, grooming add-ons, and daycare into one visit checkout. **PLANNED**.
- **Daycare Operations**: Dedicated Daycare attendance workflow. **PLANNED; not started.**

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
