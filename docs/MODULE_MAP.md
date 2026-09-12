# Module Map

Status: **CANONICAL CAPABILITY OWNERSHIP (BUSINESS-FIRST REBASE)**  
Owner: Product Architecture

A Module is a capability and outcome, not a route family, Page ID or separate data silo. URLs are owned by [ROUTES](./ROUTES.md); shared objects by [ARCHITECTURE](./ARCHITECTURE.md).

## Guardian direction status

| Label | Module-map truth |
|---|---|
| **CURRENT** | Standalone Consumer web prototype remains implemented and retained/frozen. |
| **TARGET** | Guardian layer planned for a minimal, mobile-first LINE Mini App. |
| **PAUSED** | Consumer development and independent Guardian expansion. |
| **NOT IMPLEMENTED** | LINE Login, LINE Mini App, LINE notifications, and production Guardian identity linking. |

## Product priority

- **Meawketting Business is the main product and primary commercial experience.** Business Core and Service Modules form the core revenue-generating product surface.
- **Consumer development is PAUSED.** The existing Consumer web prototype remains implemented, tested, retained, and frozen as a foundation of identity and consent; it is not the target final channel.

## Backend status (current)

| Backend phase | Current implementation truth |
|---|---|
| **BE1 Identity / Business / Branch** | **PASS — D1 durable** with server-side membership, Business and Branch scope |
| **BE2 Customer / Pet** | **PASS — D1 durable** with Business-wide Customer/Pet identity and relationship guards |
| **BE3 Booking / Calendar / Resources** | **PASS — D1 durable planning** with reservations, capacity/conflict checks, revisions and idempotent create |
| **BE4 Service Operations** | **PASS — D1 durable locally** for Grooming Jobs, Hotel Stays, Daycare Attendance, assignments, care/events and Service Records |
| **BE5 Consent / Intake / Passport access** | **PASS — D1 durable locally** for authority, scoped Temporary Business grants, Consent, Intake, expiry/revoke and audit |
| **BE6 Inbox / Communication / LINE foundation** | **PASS — D1 provider-neutral** for Conversations, Messages, reads, approvals, outbox and webhook dedup/retry; real LINE is not connected |
| **BE7 Billing / Payments** | **PASS — D1 financial model** for Charges, Payments, allocations, refunds, attempts and reconciliation; no gateway is selected |
| **BE8 Reports / History / CRM** | **PASS — read-only derived D1 queries**; no Reports/CRM writable tables |

Normal Business runtime hydrates these domains through typed server clients. `MEAWKETTING_FIXTURE_MODE=test` is an explicit DEV/TEST persistent compatibility mode only; a pre-hydration SSR snapshot is presentation-only, and browser/session data is not production authority.

## Platform and Guardian areas (Business primary; Guardian target LINE Mini App)

| Area | Outcome | Current state |
|---|---|---|
| LINE-first Guardian channel | Lightweight entry through Meawketting LINE, LINE Login, and a LINE Mini App | FUTURE / PAUSED / NOT IMPLEMENTED |
| Consumer web prototype | Existing standalone Create Passport, My Pets, Activity, Pet Detail, Safety/Lost, and Sharing surfaces | CURRENT WEB PROTOTYPE / FROZEN |
| Business Landing (`/`) | Commercial product showcase, multi-service overview, trust advantage, login CTA | LIVE LOCAL PROTOTYPE |
| Business Login (`/business/login`) | Google prototype auth for business staff and managers | LIVE LOCAL PROTOTYPE |
| Business Redirect (`/business`) | Compatibility redirect to `/` | LIVE LOCAL PROTOTYPE |
| Passport / My Pets | Create, preview/export, list Pets and open Passport-first detail | CURRENT WEB PROTOTYPE / FROZEN |
| Quick Passport QR | Five-minute Passport-safe sharing from Pet Detail | CURRENT WEB PROTOTYPE / FROZEN |
| Public Safety / Lost | Guardian-controlled public-safe identity and calm lost recovery | CURRENT WEB PROTOTYPE / FROZEN |
| Temporary Business Sharing | Named Business/Branch, scope, duration, consent, gateway, revoke/history | CURRENT WEB PROTOTYPE / FROZEN |
| Service Record foundation | Shared Business-side service-completion evidence and correction history shown in Customer/Pet context | **LIVE LOCAL DOMAIN DATA**; no standalone CareProof module/menu/route. Guardian LINE visibility, real document/photo delivery and retention policy remain PLANNED |
| Platform Admin | Reason-bound case queue/detail and audit-sensitive operations | ARCHITECTURE ONLY |

The future Guardian layer may later support Business-connected booking, store messages, add-service approval, Consent / Sharing, Temporary Business access, shared Service Records/Service History, Safety / Lost, and Notifications. These are future capabilities only; LINE is an entry/authentication channel and does not become Pet ownership authority.

## Business product layers

```text
Business Product (Primary Commercial Surface)
├─ Business Core — shared operational capabilities & platform infrastructure
└─ Service Modules — service-specific workflows, operational boards, and execution
```

Both layers use the shared objects in [ARCHITECTURE](./ARCHITECTURE.md). Enabling another module does not create another Customer, Pet, Inbox, Billing ledger or account.

## Business Core

Business Core provides the shared operational spine across all services:

| Capability | Product outcome | Implementation state |
|---|---|---|
| **Business Landing (`/`)** | Commercial landing, service overview, Guardian trust differentiator | **LIVE** at `/` |
| **Business Shell (BF-1/BF-10/BF-11)** | Shared active-Branch switcher, Warm White / Pastel Yellow system, live Finance/Reports/Team/Settings navigation and capability-aware Grooming/Hotel/Daycare navigation and commands | **LIVE** across `/business/*`; BE1 configuration, BE2 Customer/Pet directories and BE3 Booking/Branch catalogues hydrate from D1 through typed clients, with deterministic dev/test snapshots before hydration |
| **Home / Today (BF-1/BF-7/BF-11/BE3)** | Three-image Spotlight with arrows, desktop banner/action split, direct work actions, BE3 next-Booking summary, waiting Intake, D1 Grooming Job, Hotel Stay, Daycare attendance and payment-derived Branch summaries | **LIVE FROZEN HYBRID** at `/business/home`; enabled BE1 Branch modules determine visible work and BE4/BE7/BE8 clients hydrate durable projections |
| **Booking Engine (BF-2/BE3)** | Multi-service Booking create/edit/reschedule/Resource/cancel, idempotent create, optimistic revision, server availability and typed conflict recovery | **LIVE FROZEN UI / BE3 D1 DURABLE** at `/business/calendar`; BE4 execution status is a separate D1 domain |
| **Calendar (BF-2/BF-9/BE3)** | Sunday-first Day/Week/Month/Custom range queries through one view component, continuous Hotel spans, guarded move/both-edge resize, spreadsheet-like copy/paste/undo/Delete/navigation keys, Today focus, touch handlers, compact bottom guide, module/status filters and mobile Agenda | **LIVE FROZEN UI / BE3 D1 TRUTH** at `/business/calendar`; browser previews are advisory and server writes revalidate Branch/module/hours/Resource conflicts |
| **Scan / Intake (Phase E/BF-6/BF-11 reuse)** | Camera scan, manual code entry, QR validation, consent review, belongings logging, Grooming handoff and explicit Hotel Stay or Daycare Attendance target handoff | **LIVE** at `/business/scan`; one shared Intake flow with context/consent guards |
| **Customers & Pets (BF-3/BF-8/BF-12)** | One Business-level Customer, durable Business-local Pet profiles/contact relationships, backend name/phone/Pet search, readable desktop rows/mobile stacked rows, responsive detail hierarchy, derived lifecycle/service/follow-up segments, connection/access compatibility presentation, tags, notes, BE3 Booking context, compact Branch-attributed Charge/Payment history, and one inline shared `ประวัติบริการ` history | **LIVE FROZEN UI / BE2 D1 DURABLE + BE3/BE4/BE7/BE8 projections** at `/business/customers` and `/business/customers/[customerId]`; Passport badges are non-authoritative dev compatibility only, while production Guardian authority remains external |
| **Inbox & Customer Communication (BF-4/BF-7)** | Business-wide Customer conversations with readable desktop split view, compact search/filters, Pet/Booking/Branch context, D1 text, three default quick replies with remembered visibility, unread/read state, structured add-service approval and optional staff-triggered billing text | **LIVE FROZEN UI / BE6 D1** at `/business/inbox`; provider delivery, attachments, notifications, payment links, real LINE transport and Consumer Inbox remain external |
| **Grooming Operations Foundation (BF-5/BF-9)** | Today execution board for linked D1 Grooming Service Jobs, guarded lifecycle, Pet visual scan anchor, shared Resource/staff assignment, Intake handoff, add-on approval boundary, internal notes, explicit BF-7 checkout handoff and source-keyed Service Record completion | **LIVE FROZEN UI / BE4 D1** at `/business/grooming` only when the active Branch enables Grooming |
| **Hotel / Boarding Operations Foundation (BF-6/BF-9)** | Today arrivals/departures/current stays, continuous room/zone occupancy and capacity, D1 Stay lifecycle, guarded assignment/moves, lightweight daily care/events, Intake/Inbox/Customer/Home integration, explicit BF-7 checkout handoff and Service Record completion | **LIVE FROZEN UI / BE4 D1** at `/business/hotel` only when the active Branch enables Hotel |
| **Billing, Payments & Revenue Foundation (BF-7/BF-11)** | D1 Charges with base/add-on/adjustment/discount lines, separate Payment allocations, derived unpaid/partial/paid/cancelled state, refunds, Branch attribution, Customer history, Home reuse and Grooming/Hotel/Daycare checkout review | **LIVE FROZEN UI / BE7 D1** at `/business/billing`; whole-THB model only; gateway, accounting, tax and cross-Branch settlement remain external |
| **Reports & Business Insights (BF-8/BF-10/BF-11)** | Read-only report queries over shared records; date/Branch scope, payment-derived revenue, completed services, Hotel occupancy, Daycare attendance/capacity, peak times, cancellations, top customers and recent services | **LIVE FROZEN UI / BE8 READ-ONLY D1** at `/business/reports`; no report fixtures, writable report store, accounting, forecasting or AI analytics |
| **Service Record foundation (BF-8/BF-11)** | One D1 Service Record per completed Pet-specific Grooming Job or checked-out/completed Hotel Stay or Daycare Attendance; permitted details, activities, resource summary, metadata-only media references, correction/source-recompletion audit trail and optional short BF7 payment reference | **LIVE DOMAIN DATA / BE4 D1** inside operations and Customer/Pet detail; standalone CareProof is **SUPERSEDED**. Guardian delivery and real media storage remain external |
| **Team & Staff Operations Foundation (BF-9)** | Shared D1 Branch-aware operation-staff directory, multi-Branch assignment, service capabilities, active/inactive state, lightweight availability and derived workload context | **LIVE FROZEN UI / BE4 D1** at `/business/team`; displayed roles are informational and never authorization. Production auth, payroll/HR, certification and full workforce scheduling remain external |
| **Business & Branch Settings (BF-10/BE1)** | Durable Business profile/contact and Branch identity/contact, activation, enabled modules and weekly hours; local logo preview and Team summaries; existing service-duration/capacity disclosure | **LIVE FROZEN UI / BE1 D1 DURABLE** at `/business/settings`; Branch section is `?section=branches`, not a new route, duplicate Team editor or pricing catalogue |
| **Daycare Operations (BF-11)** | D1 Pet-specific Attendance from shared day Bookings, zone capacity, operation-staff assignment, care/events, pickup and shared Intake/Inbox/Billing/Service Record handoffs | **LIVE FROZEN UI / BE4 D1** at `/business/daycare` for Daycare-enabled Branches |
| **Customer CRM & Retention (BF-12)** | Derived lifecycle/service segments, last visit/BE3 next Booking/repeat-use signals, outstanding balance, staff-triggered next actions and unified timeline | **LIVE DERIVED PROJECTION** inside Customers list/detail; no duplicate customer store, predictive scoring, loyalty engine, campaign, automation or AI |

## Service Modules

Service Modules plug into Business Core for specific workflows:

### 1. Grooming / Bathing Module (M-GROOM)
- **Status**: **LIVE FROZEN UI / BE4 D1** for Grooming-enabled Branches at `/business/grooming`.
- **Planning / execution split**: Calendar owns the Booking and its booking-status model. Grooming owns a distinct Pet-specific Service Job linked to the Booking; it owns the execution lifecycle and actual timing.
- **Workflow**: Appointment-oriented work with service duration, groomer/station/dryer assignment, internal notes, an attention state, Inbox-linked add-on request, and pickup readiness. Groomer Resources may resolve to the shared BF9 Team Member for capability, active-state and availability guarding. Styling preferences, bath logs, full staff scheduling, inventory, and customer notification are not implemented.
- **Lifecycle**: `รอรับเข้า (booked) → รับเข้าแล้ว (checked-in) → รอเริ่ม (waiting) → กำลังทำ (in-service) → พร้อมรับกลับ (ready-for-pickup) → เสร็จแล้ว (completed)`; `cancelled` is terminal. The permitted transition graph is enforced server-side, so a Job cannot jump from Booked straight to Completed.
- **Shared foundation**: Customer/Pet identities come from BE2 and Booking plus groomer/station/dryer planning assignments come from BE3. Scan/Intake and the Grooming Job are D1 execution records linked by those stable IDs.

### 2. Hotel / Boarding Module (M-HOTEL)
- **Status**: **LIVE FROZEN UI / BE4 D1** for Hotel-enabled Branches at `/business/hotel`; a non-capable Branch receives a calm unavailable state and no live navigation/Command Palette entry.
- **Planning / execution split**: Calendar owns the shared date-range Booking and continuous planning span. Hotel owns one Pet-specific Stay per Booking Pet, Today operations, occupancy, room/zone assignment and execution status.
- **Lifecycle**: `จองไว้ → รับเข้า → พักอยู่ → พร้อมรับกลับ → เช็กเอาต์ → เสร็จสิ้น`, with guarded `cancelled`/`no-show` terminal states. Check-in requires the Shared Intake target and a valid room/zone assignment.
- **Occupancy and movement**: BE3 provides coarse Hotel planning capacity for Booking; BE4 enforces Branch room/zone assignment, moves, capacity and Stay movement history. Invalid execution changes roll back and do not create another Booking.
- **Daily Care**: lightweight food, water, activity, note and completion state. A task may be assigned to a shared active Hotel-care Team Member when its Branch/capability/availability permit it. Medication appears/completes only with explicit instructions and matching customer-confirmed Intake authorization; no Passport health data is inferred.
- **Attention and communication**: Today surfaces care due, pickup readiness, unresolved lightweight incident/note and waiting Inbox request cues. Business notes/incidents remain internal; `ส่งข้อความ` reuses the Business + Customer conversation.
- **Not included**: Hotel-owned financial logic or automatic settlement, pricing authority, inventory, medical/veterinary workflows, full Incident Management, Consumer or LINE work. BF7 may reference a Stay for explicit checkout, and BF8 may summarize it only after genuine checkout; neither action creates a Payment or makes the Service Record a payment or handover state.

### 3. Daycare Module (M-DAYCARE)
- **Status**: **LIVE FROZEN UI / BE4 D1 (BF-11)** at `/business/daycare` for Daycare-enabled Branches; desktop operational board and mobile grouped status views share the same Attendance records.
- **Planning / execution split**: Calendar owns the day Booking. Daycare owns a linked attendance per Pet, scheduled/actual drop-off and pickup, zone capacity, responsible shared Team Member, care events and internal notes.
- **Lifecycle**: `Booked → Checked In → Active → Ready for Pickup → Checked Out → Completed`, with guarded terminal cancellation. Rest is a care event, not another Booking or attendance status.
- **Shared foundation**: explicit Shared Intake target, Customer/Pet/Booking identity, Branch zone Resources, Team capability/availability guards, same Customer Inbox, explicit Billing checkout and source-keyed Service Record. Completion and payment remain independent.
- **Not included**: automated temperament matching, medical/clinical decisions, a full incident or safety policy engine, production workforce policy, rewards, real transport or notifications.

### 4. Future Service Modules
- Training, Medical records / Clinic handoff, Transport, Retail.

## Capability boundaries

- Calendar (BF-2/BE3) is durable shared planning infrastructure for appointments, continuous multi-day Hotel spans and day Bookings. Grooming, Hotel and Daycare have distinct BE4 D1 Pet-specific execution records linked to that same stable Booking foundation.
- Shared Business Intake Engine (Phase E) verifies QR consent and may target an eligible linked Grooming Job, explicit matching Hotel Stay or explicit Daycare Attendance rather than creating another intake flow. It never grants Passport data beyond active Business/Branch/scope/duration consent.
- Customer & Pet identity is shared across all modules; adding a service never duplicates customer profiles.
- BF-4 keeps one ongoing conversation per Business + Customer relationship in this prototype. Pet, Booking, Branch and Grooming Service Job are context references rather than new identity records or automatic per-Pet/per-Booking/Stay/Attendance threads. Hotel and Daycare launches reuse Customer/Pet/Booking context.
- A Conversation never grants Pet Passport scope. Expired/revoked Branch consent still hides protected values. The local Guardian-only structured response may update the linked Grooming Job add-ons and estimated duration, but never creates a Charge or mutates a Booking. Hotel Business notes, care and incident data never become messages automatically.
- BF-7 uses the existing shared Business state and shared Customer/Pet identities. Charge and Payment are separate BE7 D1 financial records with Branch attribution; Billing, Customer history and Home revenue do not keep separate financial fixtures. A completed Job/Stay/Attendance is not a paid financial state.
- BF-8/BF-11 use that same shared Business state and reference completed Grooming Jobs or checked-out/completed Hotel Stays and Daycare Attendance by source ID. Service Records are Pet-specific even where a Charge is Booking-level; payment is a read-only BF7 reference and remains separate from service completion. Customer/Pet history reuses the same records, not a fixture or Passport copy.
- BF-9/BF-11 use the same BE4 operation-staff records. A member can work in more than one Branch without duplication; BE3 uses only an opaque compatibility link from its durable planning Resource. Hotel care and Daycare execution assignments are D1-backed, and displayed Team roles never authorize a backend request.
- Business Core and Service Modules use the Warm White / Pastel Yellow operational visual system.
- BE1 Branch configuration is shared across selectors, navigation, BE3 Booking, Team and Reports. BE4 owns durable Attendance execution; BE8 derives CRM from durable Customer/Booking/execution/financial/Inbox records and never becomes a parallel source of truth. Final integrated validation is documented only in [VALIDATION](./VALIDATION.md).
