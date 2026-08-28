# User Flows

Status: **CANONICAL GOAL-ORIENTED FLOWS (BUSINESS-FIRST REBASE)**  
Owner: UX Architecture

A flow defines goal, decision, privacy boundary and recovery. It does not prescribe page count. Route classification is owned by [ROUTES](./ROUTES.md).

## Product priority and portal entry

- **Primary Commercial Experience**: Business Landing (`/`) → Business Login (`/business/login`) → Business Home (`/business/home`) → Shared Calendar & Bookings (`/business/calendar`) → Grooming Operations (`/business/grooming`, when enabled) → Hotel Operations (`/business/hotel`, when enabled) → Customers & Pets (`/business/customers`) → Inbox (`/business/inbox`) → Shared Scanner & Intake (`/business/scan`).
- **Compatibility Redirect**: `/business` immediately redirects to `/`.
- **Consumer web prototype (CURRENT / FROZEN)**: Pet owners can access `/my-pets`, `/create-passport`, `/activity`, `/passports`, and `/qr-preview`. These routes remain retained and regression-tested, but the standalone web experience is no longer the target final Guardian channel.
- **Guardian target (FUTURE / PAUSED)**: LINE-first experience through a LINE Mini App. LINE Login, the Mini App, LINE notifications, and production identity linking are not implemented.
- **Priority order**: P0 Business Product → P1 Business workflows → P2 Guardian touchpoints required by Business workflows → P3 independent Guardian expansion.

### Business navigation architecture

- Desktop shows live `หน้าหลัก`, `ปฏิทิน`, `ลูกค้าและสัตว์เลี้ยง`, and `ข้อความ`. A Grooming-enabled Branch sees live `อาบน้ำ / ตัดขน`; a Hotel-enabled Branch sees live `โรงแรม`, both under `งานบริการ`.
- The Sidebar keeps Daycare visible as planned/disabled only when enabled by the active Branch, followed by planned `การเงิน`, `รายงาน`, `ทีม`, and `ตั้งค่า`. A Branch without Grooming or Hotel never presents that module as a usable destination.
- Mobile keeps Home, Calendar, Scan, Messages, and More. More contains live Customers and each capability-enabled service destination; planned Daycare and management groups remain visibly disabled.

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
  4. Inspect `งานถัดไป`, today counters, and compact service summaries. When Grooming is enabled, its today and ready-for-pickup values come from the same local Service Job state as the Grooming board. When Hotel is enabled, occupancy plus arrivals/departures come from the same local Hotel Stay state as Hotel operations.
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
  7. Status advances to Checked In. When the consented local relationship has a matching Grooming Booking/Job at the active Branch, the intake attaches and activates that shared Grooming Service Job; it does not create a second Customer, Pet, Booking, or check-in flow.

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
  7. The minimum Guardian-response simulator is visibly labeled as a local test. Business has no normal approve action and duplicate decisions are idempotent. When the request is linked to a Grooming Service Job, a Guardian approval updates only that Job's local add-ons and estimated duration; it never mutates Booking or creates Charge/Payment.
  8. Switching Branch within the same Business keeps the Customer conversation. Context from another Branch is named and its Booking action is withheld; protected Passport values remain governed by the original active consent.

### 7. Grooming Operations Foundation (BF-5 Live Local Prototype)
- **Route**: `/business/grooming` for a Grooming-enabled active Branch only.
- **Goal**: answer the execution questions for today—who is waiting, in service, ready for pickup, assigned to a groomer/resource, or needs attention—without turning Calendar into a second board.
- **Flow**:
  1. Open the Grooming Today board from live service navigation, Home, Calendar context, or the post-Intake handoff. A Branch without Grooming receives a calm unavailable state rather than a working board.
  2. Scan Pet photo/avatar, Pet name, base service, scheduled time, assigned groomer, status and a short attention cue. Search or filter by attention when the queue is dense.
  3. On desktop/tablet, drag a Job only to a permitted destination. The lifted card, valid/invalid destination state, and settle/rollback feedback make the outcome explicit. On mobile, open the Job and select the next legal status instead; no work depends on drag.
  4. Open the focused detail drawer/sheet to see shared Pet/Customer contact context, service/timing, resource assignments, internal Business notes, Inbox action, add-on request state and short Job history. Protected Passport data is not pulled into this surface.
  5. Assign or change `ช่าง`, `จุดบริการ`, or `เครื่องเป่า` through the shared Resource foundation. The existing availability evaluator blocks a conflicting local assignment and keeps the prior assignment intact.
  6. Receive a valid Grooming booking through shared Intake. The matching Job changes through the check-in transition; from there it follows the guarded lifecycle `รอรับเข้า → รับเข้าแล้ว → รอเริ่ม → กำลังทำ → พร้อมรับกลับ → เสร็จแล้ว` (with terminal cancellation).
  7. If an add-on needs consent, send the existing structured Inbox request. The Job shows `รอลูกค้าตอบ`; Business cannot approve. A local Guardian-simulator approval appends the add-on and time only to the linked Job.
  8. On completion, a lightweight Grooming service entry appears in the shared Customer/Pet recent history. This is not a CareProof, certificate, photo proof, or billing record.

### 8. Hotel / Boarding Operations Foundation (BF-6 Live Local Prototype)
- **Route**: `/business/hotel` for a Hotel-enabled active Branch only.
- **Goal**: answer execution questions for today—who arrives, who is staying, who leaves, what is vacant, who needs care, which room/zone has a conflict, and what needs staff action—without duplicating Calendar planning.
- **Flow**:
  1. Open Hotel from capability-aware service navigation, Home summary, Calendar/Booking context, Customer detail, or a valid Intake handoff. A Branch without Hotel receives a calm unavailable state rather than a working dashboard.
  2. Start at the operational Today hierarchy: arrivals, departures, current stays, vacancy, daily care and attention. Pet photo/avatar, Pet name, Customer, room/zone, relevant time/range and visible status provide the fast scan context.
  3. Choose Occupancy to inspect the shared date foundation in 7-, 14-, or 28-day range. Desktop/tablet shows room/zone rows with one continuous Stay span across its date range, vacancy/gaps and conflict markers; mobile uses date selection, room/stay lists and Stay detail rather than a compressed wide grid.
  4. Open a Stay to see its separate booking relationship, Pet/Customer context, dates, status, room/zone, permitted instructions, Daily Care, linked Grooming/additional service context, messages, internal notes, room-move history and lightweight activity. Customer grouping can make several Pets readable, but every Pet stays independent.
  5. For an expected arrival, start the existing consent-safe Intake path where required. Reuse its allowed data/belongings/instruction context; completing it explicitly attaches the existing linked Stay. Staff then chooses an available room/zone (or leaves an explicit unassigned-room attention state) and performs the separately guarded Stay check-in. No Hotel-specific scanner or second Customer/Pet/Booking is created.
  6. Before assigning/changing room, extending/shortening or changing dates, run the shared date-range/Resource availability guard. If a room overlaps or a zone is full, keep the prior state and offer the concrete recovery: choose another room, change dates, or cancel. The local default blocks conflict; it does not silently overbook or offer an override.
  7. Move a Pet during a stay through the Stay controls. Preserve room-move history with prior room/zone, next room/zone, timestamp and optional operational note; do not overwrite the historical assignment. Any desktop drag/drop is only an optional acceleration—the detail control is the complete keyboard, touch and mobile path.
  8. Use Daily Care for per-Pet compact task rows (time, icon, task, state). Completing a task retains local `completedAt`/available `completedBy`; Guardian-provided instructions, Business notes and daily tasks remain distinct. Sensitive Passport fields and photos remain gated by active consent and disappear on expiry/revoke.
  9. For a departure, use the lightweight operational readiness view for care, belongings, notes and linked add-on/Job status. Mark checkout only when staff completes the intended local operation; no Billing/payment settlement is triggered. Checkout yields a lightweight recent service entry, not a CareProof or Guardian-history redesign.
  10. Use `ส่งข้อความ` to open/reuse the shared Business Inbox conversation. A mid-stay Grooming/add-service request follows the existing structured request/Guardian-only local response simulator; Hotel staff cannot approve for the Guardian and BF-6 adds no LINE transport.

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
