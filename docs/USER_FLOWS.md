# User Flows

Status: **CANONICAL GOAL-ORIENTED FLOWS (BE1–BE8 / BUSINESS-FIRST REBASE)**
Owner: UX Architecture

A flow defines goal, decision, privacy boundary and recovery. It does not prescribe page count. Route classification is owned by [ROUTES](./ROUTES.md).

## Product priority and portal entry

- **Primary Commercial Experience**: Business Landing (`/`) → Business Login (`/business/login`) → Business Home (`/business/home`) → Shared Calendar & Bookings (`/business/calendar`) → Grooming Operations (`/business/grooming`, when enabled) or Hotel/Daycare Operations (`/business/hotel`, `/business/daycare`, when enabled) → Billing / Payments / Revenue (`/business/billing`) → Reports (`/business/reports`) → Team & Staff Operations (`/business/team`) → Business/Branch Settings (`/business/settings`) → Customers & Pets/derived CRM (`/business/customers`) → Inbox (`/business/inbox`) → Shared Scanner & Intake (`/business/scan`).
- **Compatibility Redirect**: `/business` immediately redirects to `/`.
- **Consumer web prototype (CURRENT / FROZEN)**: Pet owners can access `/my-pets`, `/create-passport`, `/activity`, `/passports`, and `/qr-preview`. These routes remain retained and regression-tested, but the standalone web experience is no longer the target final Guardian channel.
- **Guardian target (FUTURE / PAUSED)**: LINE-first experience through a LINE Mini App. LINE Login, the Mini App, LINE notifications, and production identity linking are not implemented.
- **Priority order**: P0 Business Product → P1 Business workflows → P2 Guardian touchpoints required by Business workflows → P3 independent Guardian expansion.

### Backend flow boundaries (BE1–BE8)

```text
Customer + Pet (BE2)
→ Booking / planning (BE3)
→ Grooming Job | Hotel Stay | Daycare Attendance (BE4 execution)
→ Service Record (BE4 canonical completion evidence)
→ Charge → Payment / allocation (BE7; completion is not payment)
→ Reports + CRM read-only projections (BE8)
```

```text
Temporary Business QR (BE5)
→ server-validated scoped grant
→ Consent / Intake
→ receive or check-in
→ expiry or revoke removes protected access
```

```text
Conversation + Message (BE6)
→ durable read/unread and contextual state
→ outbox / retry / dedup
→ Business-owned LINE OA adapter boundary (mock provider in tests)
```

Every protected transition resolves Person → active Membership → Business → Branch access → target object. Reports and CRM only query canonical records and do not write projections.

### Business navigation architecture

- Desktop shows live `หน้าหลัก`, `ปฏิทิน`, `ลูกค้าและสัตว์เลี้ยง`, `ข้อความ`, and `การเงิน`. Under `งานบริการ`, Grooming, Hotel and Daycare are live only when the active Branch enables the matching capability.
- The Sidebar exposes live Finance, `รายงาน`, `ทีม` and `ตั้งค่า`. Grooming, Hotel and Daycare destinations appear only for enabled services at the active Branch. Mobile More and the command palette use the same capability source; Service Records and CRM remain in Customer context.
- Mobile keeps Home, Calendar, Scan, Messages, and More. More contains live Customers, Finance, Reports, Team, Settings and only the capability-enabled Grooming/Hotel/Daycare destinations.

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
- **Context Switcher**: Frontdesk staff selects an authorized active Branch from the BE1 configuration registry. Initial dev/test Branches are Whisker Rest Ari, Whisker Rest Thonglor and Paw Partner Onnut; BF10 additions and active-state changes update the same selector. BE3 queries switch Branch context over the same durable Business-wide Customer/Pet identities—never cloned per Branch—while active modules, planning Resources and Bookings update coherently without transferring consent.

### 2. Business Home & Today's priorities (BF-1)
- **Route**: `/business/home`.
- **Flow**:
  1. Review priority cues in `สิ่งที่ต้องจัดการ` (e.g., arrivals, pending decisions).
  2. Use the image-first operational banner as the visual focal point: square on mobile and in the desktop action split, with a compact tablet crop. It auto-advances every six seconds, pauses on hover/focus, stops for reduced motion, and always provides previous/next arrows.
  3. On desktop, start `เพิ่มการจอง`, `สแกนรับเข้า`, or `ค้นหาลูกค้า` from the action rail to the banner's right; smaller screens stack the same actions below it.
  4. Inspect `งานถัดไป`, today counters and compact summaries for enabled services. Upcoming Booking planning comes from BE3. Grooming execution values derive from BE4 Service Jobs; Hotel arrival/occupancy/pickup/attention values derive from BE4 Stays; Daycare attendance/pickup values derive from BE4 Attendance. Current-Branch revenue, payment count and outstanding value derive from the same BE7 Charge/Payment records as Billing.
  5. Open the BE6 Inbox-derived `ข้อความใหม่` item; read state and the navigation badge use the same durable Conversation records.

### 3. Shared Booking & Calendar flow (BF-2 Live)
- **Route**: `/business/calendar`.
- **Flow**:
  1. Inspect a Sunday-first Calendar in Day, Week, Month, or a 28/35/42-day Custom range on desktop/tablet; mobile defaults to chronological Agenda. Returning staff receive their cookie-saved view preference.
  2. Filter by service module (Grooming / Hotel / Daycare) or status (Confirmed, Arrived, Pending, Cancelled).
  3. Read Grooming as a peach time block, Hotel as a continuous sky stay span, and Daycare as a mint day item; every item also names its service and status.
  4. Click `เพิ่มการจอง`, select a Branch-enabled service, Customer, Pet, and date/time. If the relationship is missing, reuse Add Customer/Add Pet without leaving the sheet.
  5. The editor asks BE3 for availability before review. The server is still authoritative: create/edit rechecks active Branch, enabled module, appointment hours, durable Resource eligibility/availability and exclusive/capacity overlap. An opaque staff display link never substitutes BF9 role data for authorization.
  6. Drag a supported Booking or use either edge to shrink/extend its time/stay; long-press starts touch drag. Valid changes send a BE3 reschedule command. Typed conflicts keep/restore the authoritative original and offer concrete recovery.
  7. Hold Alt while dragging to duplicate, or focus a Booking and use Ctrl/Cmd+C then Ctrl/Cmd+V. Copies use a new create idempotency key, receive a new stable Booking ID and still pass server availability checks.
  8. Select the Booking and edit fields as the complete keyboard alternative to drag/resize. Stale revisions recover from the current server record.
  9. Review and confirm; cancellation persists its lifecycle/audit metadata and releases durable reservations. A compact legend remains below the schedule and success feedback never shifts the grid.

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

### 5. Customers & Pets foundation (BF-3 frozen UI / BE2 durable)
- **Routes**: `/business/customers` → `/business/customers/[customerId]`.
- **Flow**:
  1. Frontdesk searches by Customer name, Pet name, or phone through the Business-scoped BE2 query using one clear search field and bounded results; Passport connected/not-connected is not a browse filter.
  2. Open the stable Business relationship detail. Customer, Business-local Pet profile/contact relationship, tags and notes come from BE2; upcoming/recent Booking planning comes from BE3. Hotel Stays, shared `ประวัติบริการ`, Charge/Payment history and CRM inputs are BE4/BE7/BE8 projections over those stable IDs and retain Branch attribution.
  3. Add a durable Business Customer without a Meawketting account or Pet Passport. A matching normalized phone—including an inactive record—shows a calm possible-duplicate warning; staff chooses existing record or explicitly continues without an automatic merge.
  4. Add a durable Business-local Pet profile and neutral Customer contact relationship with name/species and an optional Business note. A matching name/species warns without merging. Frozen seeded Passport presentation starts/continues through a non-authoritative compatibility read model; BE2 creates no Passport state.
  5. Start the existing Booking Editor with Customer and optional Pet preselected; no new Booking engine is created.
  6. Treat `ผู้ติดต่อหลัก` as a Business contact relationship only. Switching Branch keeps the same Customer/Pet identity. Passport connection, Guardian authority and active consent are separate/not implemented in BE2; Business notes never write into Pet Passport.

### 6. Inbox & Customer Communication (BF-4 / BE6 D1, provider-neutral)
- **Route**: `/business/inbox`.
- **Flow**:
  1. Search by Customer name, Pet name, service, or current message text in the single-boundary search field; optionally use the compact all/unread/active-service filters.
  2. Desktop selects a conversation beside the list. At 320–430px, open a row as a full conversation task and return with the explicit Back control; selection recovers through `?conversation=<id>`.
   3. Read only useful Customer/Pet/Booking/Branch context. Opening a conversation records a durable BE6 read state scoped to the authorized Business/Branch context.
   4. Send text or choose one of three unnumbered Thai quick replies. The dashed add control extends the durable list; collapse/expand is remembered by a cookie. Messages retain explicit outbox/provider status labels.
    5. From Customer Detail, Grooming Job or Hotel Stay, `ส่งข้อความ` reuses the existing Business + Customer conversation; Booking/Stay may add Pet/Booking/Branch context without creating another permanent thread. A staff member may explicitly send a text about an amount due or recorded payment, but that text never changes a Charge/Payment/Service Record. Business notes, care notes and incident notes never become Customer messages automatically.
  6. From a valid Booking, send one structured `ขออนุมัติเพิ่มบริการ` request with service, demo amount, added time, and optional note. The state begins at `รอเจ้าของตอบ`.
   7. The minimum Guardian-response simulator is visibly labeled as a local test boundary. Business has no normal approve action and duplicate decisions are idempotent. When the request is linked to a Grooming Service Job, a Guardian approval updates only that Job's BE4 add-ons and estimated duration; it never mutates Booking or creates Charge/Payment.
  8. Switching Branch within the same Business keeps the Customer conversation. Context from another Branch is named and its Booking action is withheld; protected Passport values remain governed by the original active consent.

### 7. Grooming Operations Foundation (BF-5 / BE4 D1)
- **Route**: `/business/grooming` for a Grooming-enabled active Branch only.
- **Goal**: answer the execution questions for today—who is waiting, in service, ready for pickup, assigned to a groomer/resource, or needs attention—without turning Calendar into a second board.
- **Flow**:
  1. Open the Grooming Today board from live service navigation, Home, Calendar context, or the post-Intake handoff. A Branch without Grooming receives a calm unavailable state rather than a working board.
  2. Scan Pet photo/avatar, Pet name, scheduled time, assigned groomer, status and a short attention cue from the clearly aligned cards; the board has no date/job filter rail.
  3. On desktop/tablet, drag a Job to the desired active status. The pointer-following preview, reversible movement, valid/invalid destination state, and settle/rollback feedback make the outcome explicit. On mobile, use the grouped status list or open the Job and select a status instead; no work depends on drag.
  4. Open the focused detail drawer/sheet to see shared Pet/Customer contact context, service/timing, resource assignments, internal Business notes, Inbox action, add-on request state and short Job history. Protected Passport data is not pulled into this surface.
  5. Assign or change `ช่าง`, `จุดบริการ`, or `เครื่องเป่า` through the shared Resource foundation. A linked groomer also rechecks the shared Team Member’s active state, Grooming capability and lightweight availability; the local evaluator blocks a conflict and keeps the prior assignment intact.
   6. Receive a valid Grooming booking through BE5 Shared Intake. The matching D1 Job changes through the check-in transition; the board then permits movement among `รอรับเข้า`, `รับเข้าแล้ว`, `รอเริ่ม`, `กำลังทำ`, `พร้อมรับกลับ`, and `เสร็จแล้ว` while cancellation remains terminal.
  7. If an add-on needs consent, send the existing structured Inbox request. The Job shows `รอลูกค้าตอบ`; Business cannot approve. A local Guardian-simulator approval appends the add-on and time only to the linked Job.
   8. On completion, the existing shared selector creates or updates one Business-side Service Record from the permitted Job facts. The Grooming detail confirms that the record was saved; the record is read from Customer/Pet `ประวัติบริการ`, not a new page. It does not create a receipt, certificate, Passport, photo store, or Guardian-facing document.
   9. When staff chooses explicit checkout, open `/business/billing` with the linked Grooming context to review/reconcile the Charge and record Cash, bank-transfer or Other payment if received. Completion remains an operational status: it does not make the Charge paid or prevent a partial/unpaid balance.
   10. Customer/Pet history may show a short read-only BF7 payment reference. Paid never means the service was completed, and service completion never means Paid. If work is reopened and completed again, the original source snapshot remains auditable and the same Service Record is refreshed rather than duplicated.

### 8. Hotel / Boarding Operations Foundation (BF-6 / BE4 D1)
- **Route**: `/business/hotel` for a Hotel-enabled active Branch only.
- **Goal**: answer who arrives/leaves today, who is staying, where each Pet is assigned, remaining capacity, care due, attention notes, and who is ready for pickup without turning Calendar into an execution board.
- **Flow**:
  1. Open Hotel Operations from capability-gated navigation, Home, Customer detail, Calendar context, or the explicit post-Intake handoff. A Branch without Hotel receives a calm unavailable state and no live Hotel menu/command.
  2. Review Today arrivals, departures, currently staying, care due, unresolved attention/incident notes, ready-for-pickup work, and occupied/reserved/available capacity from the shared Branch Stay state.
  3. On desktop/tablet, scan each room/zone across a continuous date range. Occupied, reserved and available counts respect room capacity, including multi-Pet Bookings as separate Pet-specific Stays.
  4. Start with the existing Hotel Booking in Calendar, then open the Shared Business Intake Engine with its explicit Stay target. After consented Intake succeeds, assign a valid room and move through checked-in → staying → ready for pickup/checkout → completed; cancelled/no-show remain terminal alternatives as appropriate.
  5. Assign or move a Stay only after capacity/conflict validation. A valid move records date-bounded assignment and movement history; an invalid target preserves the original room and shows rollback feedback.
  6. Complete lightweight food, water, activity, cleaning/check and note tasks. Where the task has an assignee, choose a shared active Hotel-care Team Member in the current Branch; an unavailable or incompatible member is not silently assigned. Medication is actionable only when the same Stay has Customer-confirmed Intake authorization plus explicit instructions; this is not a medical system.
  7. Keep Business notes and lightweight incident/attention notes internal. Use the existing Inbox action for Customer communication so no Conversation is duplicated.
   8. On mobile, use grouped Today/Stay lists and the detail sheet with the room selector and lifecycle controls. No work depends on dragging or on squeezing the desktop occupancy grid into the viewport.
   9. When staff chooses explicit checkout, open `/business/billing` with the linked Stay context to review/reconcile the Charge and record payment if received. Ready-for-pickup, checked-out and completed remain operational states and never mean paid.
   10. After actual checkout, the shared selector creates or updates one Stay Service Record with permitted dates, room/zone and ordinary daily-care summary. Customer/Pet `ประวัติบริการ` shows it inline; no separate summary or handover page is opened. Medication, Guardian instructions, Intake details and incidents do not enter the record.
- **Boundary**: Calendar remains date-range planning; Hotel Operations owns Stay execution and occupancy. BF-7 owns the separate local Charge/Payment record, while BF8 owns shared Service Record data after genuine checkout. Pricing authority, full inventory, full Incident Management and medical records are not part of BF6.

### 9. Billing, Payments & Revenue Foundation (BF-7 / BE7 D1 financial model)
- **Route**: `/business/billing`.
- **Goal**: review what is owed separately from how and when money is received, without turning local prototype records into a payment gateway or accounting system.
- **Flow**:
  1. Open Finance directly, or choose explicit checkout from a linked Grooming Job, Hotel Stay or Daycare Attendance. The active Branch remains the financial attribution context.
  2. Review the D1 Charge: one booking-level base-service amount, reconciled approved Grooming add-ons where applicable, and any manual adjustment or discount with its required reason. Whole Thai Baht integers are a prototype assumption.
  3. Read the Charge total, paid amount and remaining amount. Status is derived from Charge cancellation and Payment allocations: `ยังไม่ชำระ`, `ชำระบางส่วน`, `ชำระแล้ว`, or `ยกเลิก`; service completion never supplies a payment state.
  4. Record Cash, bank-transfer or Other payment with a local note. A duplicate-safe request prevents repeated local submission from creating a second payment effect; partial payment leaves the remaining balance visible.
  5. Cancel only an unpaid Charge and provide a reason. This does not process a refund, reverse a recorded payment, decide tax/invoice policy, or settle work across Branches.
  6. Return to Customer Detail or Business Home to see the same shared financial history or payment-derived current-Branch revenue. An optional local Inbox text is staff-triggered only and does not change the financial record.

### 10. Shared Service Record behavior (BF-8/BF-11 / BE4 D1 source, BE8 read-only projection)
- **Where it appears**: No standalone route, menu, dashboard, management page, summary page or post-completion workflow. The former CareProof standalone experience is **SUPERSEDED**.
- **Flow**:
  1. Complete a Grooming Job or check out/complete a Hotel Stay or Daycare Attendance in its existing execution surface. The shared selector creates or updates one source-keyed, Pet-specific Service Record in the existing Business envelope.
  2. Repeating the completion/checkout action reuses the same `serviceRecordId`; it never creates a duplicate. Re-completion retains a permitted source snapshot in append-only history.
  3. Open Customer or Pet detail and read one `ประวัติบริการ` timeline/list. Pet photo/avatar anchors each item; inline expansion shows summary, service details, activities, staff/resources, local note, permitted photo metadata and completion time.
  4. A short BF7 Charge/Payment reference may appear in the item (`ไม่มี Charge`, unpaid, partial, paid or cancelled). It is read-only: service completion and payment remain separate states.
  5. If a record needs correction, update only the supported summary or Business note with reason/staff/time/request key. The prior value remains auditable; no silent deletion is allowed.
- **Boundary**: Service Record is a Business service record only. Guardian LINE visibility is planned. Real photo storage, social/public sharing, full medical charts and full document/certificate/print systems remain out of scope; the current source is BE4 D1 and the BE8 view is read-only.

### 11. Team & Staff Operations Foundation (BF-9 / BE4 D1)
- **Route**: `/business/team`.
- **Goal**: answer who works today, which Branch they serve, what work they can accept, current/next work, and whether a local assignment conflicts—without creating an HR system.
- **Flow**:
  1. Open Team from the live Business navigation. The current Branch filters a shared directory; a member assigned to several Branches remains one person record.
  2. Scan avatar, name, displayed role, Branch membership, service capabilities, active/inactive status and lightweight current availability. The desktop list/table hybrid supports comparison; the same priority fields stack on mobile.
  3. Add or edit the small local profile: name/avatar seed, one or more Branches, capabilities, displayed Owner/Manager/Staff role, active flag, and basic working/unavailable/break/time-off windows. This is not a certification, attendance, leave, payroll or HR workflow.
  4. Review today’s linked Booking, Grooming, Hotel care and Daycare workload, including current/next work and surfaced conflict/overload context. Team does not create module-specific staff fixtures.
  5. Return to Calendar/Booking, Grooming, Hotel or Daycare; their assignment controls reuse the same Team Member and show a concrete inactive, capability, availability or time-conflict recovery instead of silently accepting an invalid assignee.
- **Boundary**: BF9 Owner, Manager and Staff labels are display data only. BE1 active memberships and Branch grants authorize BE1–BE7 server operations; BE8 is read-only. Production authentication and a granular operational permission matrix are not implemented. Consumer remains paused; payroll and HRIS remain excluded.

### 12. Business & Branch Settings (BF-10 frozen UI / BE1 durable)

1. Open `/business/settings`; edit durable Business text/contact through BE1 without changing Customer or Pet identity. Logo bytes remain a local preview because R2/media is not implemented.
2. Open the Branch section (`?section=branches`) to add/edit durable Branch contact and location, enabled services and weekly hours. Save updates the same BE1 Branch registry used by navigation, Team display and BE3 Booking validation.
3. Enable/disable a Branch explicitly. Historical work remains; the last active Branch cannot be disabled. A disabled current Branch selects an active fallback rather than leaving an invalid context.
4. Read active Team count, names and capabilities from the shared Team source; use `ดูทีม` on an active Branch to switch to that Branch and open the existing Team directory. Expand service/resources to inspect the existing Grooming default duration and Hotel/Daycare capacity; no second staff editor or pricing catalogue is created.
5. Return to Calendar or a service board. New work respects Branch activation, enabled module, operating hours and existing capacity/staff guards. Disabling a service does not erase its history or grant another Branch's consent.

### 13. Daycare Operations (BF-11 / BE4 D1)

1. Select a Daycare-enabled Branch and open `/business/daycare`; use the operational date and status view to see shared day-Booking attendance per Pet.
2. Choose a valid zone and an eligible shared Team Member. A full zone, wrong Branch/capability, inactive or unavailable assignee returns a concrete recovery instead of silently accepting the change.
3. For a consent-bound Intake, launch the Shared Scanner/Intake with the explicit attendance identifier and confirm matching Business/Branch/Customer/Pet context; capacity is rechecked at check-in. The local direct receive-in action remains available for the existing attendance without requesting protected Passport data. Neither path creates a second Intake engine or copied Pet identity, and direct receive-in grants no additional consent.
4. Progress through checked-in, active and ready-for-pickup. Record lightweight meal/water/activity/rest/note events and Business notes; use an explicit action to open the same Customer Inbox.
5. Check out/complete the attendance and reuse its source-keyed Service Record in Customer/Pet history. Open Billing for explicit Charge/Payment review; pickup or completion never marks a Charge paid.

### 14. Customer CRM & Retention (BF-12 / BE8 read-only derived projection)

1. Open Customers and select a derived lifecycle, service or follow-up segment; counts come from the existing shared records, not stored CRM scores.
2. Open Customer detail to read last completed visit, next Booking, unique visits, services, outstanding balance and return/follow-up signals.
3. Review the combined Booking/service/payment/message timeline, then choose the contextual staff-triggered Booking, Inbox or Billing action. Existing tags and notes remain Business-owned relationship data.
4. Treat Loyalty as planned only. No points, tier, reward, automatic message, campaign, prediction or AI action runs from this view.

### 15. Planned Business flows
- **Multi-Service Visit / Order checkout**: Future policy for grouping several services under a parent Visit/Order. **OPEN / PLANNED**.
- **Advanced Daycare policy and automated retention**: Production safety/capacity policy, automated matching, loyalty, rewards and campaigns remain **OPEN / PLANNED**, not effects of BF11/BF12.

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

This is a target flow only; it does not create routes or imply an existing integration. Later Business-connected actions may include booking, store messages, add-service approval, Consent / Sharing, Temporary Business access, Guardian visibility for the shared Business Service Record/Service History, Safety / Lost, and Notifications. LINE identity remains separate from Pet ownership authority and consent.

### Consumer navigation composition

The previous four-item standalone Consumer shell is **CURRENT WEB PROTOTYPE / SUPERSEDED AS FINAL CONSUMER DIRECTION**:
```text
หน้าหลัก (PLANNED / DISABLED) · สัตว์เลี้ยง (LIVE: /my-pets) · กิจกรรม (LIVE: /activity) · ข้อความ (PLANNED / DISABLED)
```
- Keep this composition truthful for the retained web prototype only. Do not treat it as final LINE Mini App navigation.
- `สร้าง Passport` is a contextual action inside My Pets (`/create-passport`) in the current prototype, not a primary navigation bar item.
- Do not design detailed LINE Mini App navigation in this documentation correction; decide it in the future Consumer LINE Mini App phase.
- Signed-in consumer user menu handles session and account identity only; it never exposes internal business operations.
