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
| **Home / Today (BF-1/BF-7/BF-11/BE3)** | Three-image Spotlight with arrows, desktop banner/action split, direct work actions, BE3 next-Booking summary, waiting Intake, local Grooming Service Job, Hotel Stay, Daycare attendance and payment-derived Branch summaries | **LIVE FROZEN HYBRID** at `/business/home`; enabled BE1 Branch modules determine visible work |
| **Booking Engine (BF-2/BE3)** | Multi-service Booking create/edit/reschedule/Resource/cancel, idempotent create, optimistic revision, server availability and typed conflict recovery | **LIVE FROZEN UI / BE3 D1 DURABLE** at `/business/calendar`; execution status remains local and separate |
| **Calendar (BF-2/BF-9/BE3)** | Sunday-first Day/Week/Month/Custom range queries through one view component, continuous Hotel spans, guarded move/both-edge resize, spreadsheet-like copy/paste/undo/Delete/navigation keys, Today focus, touch handlers, compact bottom guide, module/status filters and mobile Agenda | **LIVE FROZEN UI / BE3 D1 TRUTH** at `/business/calendar`; browser previews are advisory and server writes revalidate Branch/module/hours/Resource conflicts |
| **Scan / Intake (Phase E/BF-6/BF-11 reuse)** | Camera scan, manual code entry, QR validation, consent review, belongings logging, Grooming handoff and explicit Hotel Stay or Daycare Attendance target handoff | **LIVE** at `/business/scan`; one shared Intake flow with context/consent guards |
| **Customers & Pets (BF-3/BF-8/BF-12)** | One Business-level Customer, durable Business-local Pet profiles/contact relationships, backend name/phone/Pet search, readable desktop rows/mobile stacked rows, responsive detail hierarchy, derived lifecycle/service/follow-up segments, connection/access compatibility presentation, tags, notes, BE3 Booking context, compact Branch-attributed Charge/Payment history, and one inline shared `ประวัติบริการ` history | **LIVE FROZEN UI / BE2 D1 DURABLE + BE3 UPCOMING BOOKINGS** at `/business/customers` and `/business/customers/[customerId]`; Passport badges are non-authoritative dev compatibility only, Guardian/Consent not implemented |
| **Inbox & Customer Communication (BF-4/BF-7)** | Business-wide Customer conversations with readable desktop split view, compact search/filters, Pet/Booking/Branch context, local text, three default quick replies with remembered visibility, unread state, one structured add-service approval prototype, and optional staff-triggered local billing text | **LIVE LOCAL PROTOTYPE** at `/business/inbox`; no real delivery, attachments, notifications, payment link, LINE transport, or Consumer Inbox |
| **Grooming Operations Foundation (BF-5/BF-9)** | Today execution board for linked Grooming Service Jobs, legal lifecycle transition, Pet visual scan anchor, shared Resource assignment with linked Team Member capability/active/availability conflict checks, Intake handoff, Guardian-only add-on approval integration, internal notes, explicit BF-7 checkout handoff, and automatic creation/update of one shared Service Record on completion | **LIVE LOCAL PROTOTYPE** at `/business/grooming` only when the active Branch enables Grooming |
| **Hotel / Boarding Operations Foundation (BF-6/BF-9)** | Today arrivals/departures/current stays, continuous room/zone occupancy and capacity, Stay lifecycle, guarded assignment/moves, lightweight daily care/incidents/notes with optional shared Hotel-care Team Member assignment, shared Intake/Inbox/Customer/Home integration, explicit BF-7 checkout handoff, and automatic creation of one shared Stay Service Record on checkout/completion | **LIVE LOCAL PROTOTYPE** at `/business/hotel` only when the active Branch enables Hotel |
| **Billing, Payments & Revenue Foundation (BF-7/BF-11)** | Shared browser-local Charges with base/add-on/adjustment/discount lines, separately recorded Payment allocations, derived unpaid/partial/paid/cancelled state, Branch-attributed revenue, Customer history, Home reuse, and Grooming/Hotel/Daycare checkout review | **LIVE LOCAL PROTOTYPE** at `/business/billing`; whole-THB amounts only; no real payment processing, accounting, tax, refund processor or cross-Branch settlement |
| **Reports & Business Insights (BF-8/BF-10/BF-11)** | Single-page business dashboard derived dynamically from shared operational/configuration state; date range presets (วันนี้, 7 วัน, 30 วัน, กำหนดเอง), current-Branch vs all-Branches scope, payment-derived revenue matching BF7, completed services, Hotel occupancy and Daycare attendance/capacity, peak times, cancellations, top customers, and recent services | **LIVE LOCAL PROTOTYPE** at `/business/reports`; no separate report fixtures, accounting, tax, payroll, forecasting, or AI analytics |
| **Service Record foundation (BF-8/BF-11)** | One local Service Record per completed Pet-specific Grooming Job or checked-out/completed Hotel Stay or Daycare Attendance; permitted details, activities, resource summary, local photo metadata, correction/source-recompletion audit trail, and optional short BF7 payment reference in history | **LIVE LOCAL DOMAIN DATA** inside Grooming/Hotel/Daycare completion and Customer/Pet detail; standalone CareProof experience is **SUPERSEDED**. No receipt/certificate/Passport/medical record, Guardian LINE view, real photo storage, or public sharing |
| **Team & Staff Operations Foundation (BF-9)** | Shared Branch-aware Team display directory, multi-Branch assignment, service capabilities, active/inactive state, lightweight local availability, today workload and assignment context | **LIVE LOCAL PROTOTYPE** at `/business/team`; BE3 persists only a separate minimal planning Resource projection with an opaque display link. Role labels are informational only. Production auth, payroll/HR, certification and full workforce scheduling are not implemented. |
| **Business & Branch Settings (BF-10/BE1)** | Durable Business profile/contact and Branch identity/contact, activation, enabled modules and weekly hours; local logo preview and Team summaries; existing service-duration/capacity disclosure | **LIVE FROZEN UI / BE1 D1 DURABLE** at `/business/settings`; Branch section is `?section=branches`, not a new route, duplicate Team editor or pricing catalogue |
| **Daycare Operations (BF-11)** | Pet-specific attendance from shared day Bookings, zone capacity, Team assignment, care/notes, pickup and shared Intake/Inbox/Billing/Service Record handoffs | **LIVE LOCAL PROTOTYPE** at `/business/daycare` for Daycare-enabled Branches |
| **Customer CRM & Retention (BF-12)** | Derived lifecycle/service segments, last visit/BE3 next Booking/repeat-use signals, outstanding balance, staff-triggered next actions and unified timeline | **LIVE DERIVED PROJECTION** inside Customers list/detail; no duplicate customer store, predictive scoring, loyalty engine, campaign, automation or AI |

## Service Modules

Service Modules plug into Business Core for specific workflows:

### 1. Grooming / Bathing Module (M-GROOM)
- **Status**: **LIVE LOCAL PROTOTYPE** for Grooming-enabled Branches at `/business/grooming`.
- **Planning / execution split**: Calendar owns the Booking and its booking-status model. Grooming owns a distinct Pet-specific Service Job linked to the Booking; it owns the execution lifecycle and actual timing.
- **Workflow**: Appointment-oriented work with service duration, groomer/station/dryer assignment, internal notes, an attention state, Inbox-linked add-on request, and pickup readiness. Groomer Resources may resolve to the shared BF9 Team Member for capability, active-state and availability guarding. Styling preferences, bath logs, full staff scheduling, inventory, and customer notification are not implemented.
- **Lifecycle**: `รอรับเข้า (booked) → รับเข้าแล้ว (checked-in) → รอเริ่ม (waiting) → กำลังทำ (in-service) → พร้อมรับกลับ (ready-for-pickup) → เสร็จแล้ว (completed)`; `cancelled` is terminal. The permitted transition graph is enforced locally, so a Job cannot jump from Booked straight to Completed.
- **Shared foundation**: Customer/Pet identities come from BE2 and Booking plus groomer/station/dryer planning assignments come from BE3. Scan/Intake and the Grooming Job remain local execution projections linked by those stable IDs.

### 2. Hotel / Boarding Module (M-HOTEL)
- **Status**: **LIVE LOCAL PROTOTYPE** for Hotel-enabled Branches at `/business/hotel`; a non-capable Branch receives a calm unavailable state and no live navigation/Command Palette entry.
- **Planning / execution split**: Calendar owns the shared date-range Booking and continuous planning span. Hotel owns one Pet-specific Stay per Booking Pet, Today operations, occupancy, room/zone assignment and execution status.
- **Lifecycle**: `จองไว้ → รับเข้า → พักอยู่ → พร้อมรับกลับ → เช็กเอาต์ → เสร็จสิ้น`, with guarded `cancelled`/`no-show` terminal states. Check-in requires the Shared Intake target and a valid room/zone assignment.
- **Occupancy and movement**: BE3 provides coarse Hotel planning capacity for Booking; Branch room/zone assignment, drag, manual move and Stay movement history remain local execution behavior. Invalid execution changes roll back and do not create another Booking.
- **Daily Care**: lightweight food, water, activity, note and completion state. A task may be assigned to a shared active Hotel-care Team Member when its Branch/capability/availability permit it. Medication appears/completes only with explicit instructions and matching customer-confirmed Intake authorization; no Passport health data is inferred.
- **Attention and communication**: Today surfaces care due, pickup readiness, unresolved lightweight incident/note and waiting Inbox request cues. Business notes/incidents remain internal; `ส่งข้อความ` reuses the Business + Customer conversation.
- **Not included**: Hotel-owned financial logic or automatic settlement, pricing authority, inventory, medical/veterinary workflows, full Incident Management, Backend/Database, Consumer or LINE work. BF7 may reference a Stay for explicit checkout, and BF8 may summarize it only after genuine checkout; neither action creates a Payment or makes the service record a payment or handover state.

### 3. Daycare Module (M-DAYCARE)
- **Status**: **LIVE LOCAL PROTOTYPE (BF-11)** at `/business/daycare` for Daycare-enabled Branches; desktop operational board and mobile grouped status views share the same attendance records.
- **Planning / execution split**: Calendar owns the day Booking. Daycare owns a linked attendance per Pet, scheduled/actual drop-off and pickup, zone capacity, responsible shared Team Member, care events and internal notes.
- **Lifecycle**: `Booked → Checked In → Active → Ready for Pickup → Checked Out → Completed`, with guarded terminal cancellation. Rest is a care event, not another Booking or attendance status.
- **Shared foundation**: explicit Shared Intake target, Customer/Pet/Booking identity, Branch zone Resources, Team capability/availability guards, same Customer Inbox, explicit Billing checkout and source-keyed Service Record. Completion and payment remain independent.
- **Not included**: automated temperament matching, medical/clinical decisions, a full incident or safety policy engine, production capacity enforcement, rewards, real transport or notifications.

### 4. Future Service Modules
- Training, Medical records / Clinic handoff, Transport, Retail.

## Capability boundaries

- Calendar (BF-2/BE3) is durable shared planning infrastructure for appointments, continuous multi-day Hotel spans and day Bookings. Grooming, Hotel and Daycare have distinct browser-local Pet-specific execution surfaces linked to that same stable Booking foundation.
- Shared Business Intake Engine (Phase E) verifies QR consent and may target an eligible linked Grooming Job, explicit matching Hotel Stay or explicit Daycare Attendance rather than creating another intake flow. It never grants Passport data beyond active Business/Branch/scope/duration consent.
- Customer & Pet identity is shared across all modules; adding a service never duplicates customer profiles.
- BF-4 keeps one ongoing conversation per Business + Customer relationship in this prototype. Pet, Booking, Branch and Grooming Service Job are context references rather than new identity records or automatic per-Pet/per-Booking/Stay/Attendance threads. Hotel and Daycare launches reuse Customer/Pet/Booking context.
- A Conversation never grants Pet Passport scope. Expired/revoked Branch consent still hides protected values. The local Guardian-only structured response may update the linked Grooming Job add-ons and estimated duration, but never creates a Charge or mutates a Booking. Hotel Business notes, care and incident data never become messages automatically.
- BF-7 uses the existing shared Business state and shared Customer/Pet identities. Charge and Payment are separate local financial records with Branch attribution; Billing, Customer history and Home revenue do not keep separate financial fixtures. A completed Job/Stay/Attendance is not a paid financial state.
- BF-8/BF-11 use that same shared Business state and reference completed Grooming Jobs or checked-out/completed Hotel Stays and Daycare Attendance by source ID. Service Records are Pet-specific even where a Charge is Booking-level; payment is a read-only BF7 reference and remains separate from service completion. Customer/Pet history reuses the same records, not a fixture or Passport copy.
- BF-9/BF-11 use the same local Business state for Team display members. A member can work in more than one Branch without duplication; BE3 uses only an opaque compatibility link from its durable planning Resource. Hotel care and Daycare execution assignments remain local, and displayed Team roles never authorize a backend request.
- Business Core and Service Modules use the Warm White / Pastel Yellow operational visual system.
- BE1 Branch configuration is shared across selectors, navigation, BE3 Booking, Team and Reports. BF11 attendance extends the remaining local execution envelope; BF12 CRM derives from durable Customer/Booking plus local execution/financial records and never becomes a parallel source of truth. Final integrated validation is documented only in [VALIDATION](./VALIDATION.md).
