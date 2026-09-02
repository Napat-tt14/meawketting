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
| **Business Shell (BF-1/BF-8)** | Branch context switcher, Warm White / Pastel Yellow visual system, live Finance navigation, capability-aware Grooming and Hotel service navigation, plus architecture-visible planned/disabled management navigation | **LIVE** across `/business/*` |
| **Home / Today (BF-1/BF-7)** | Three-image auto-rotating Spotlight with arrows, desktop banner/action split, direct work actions, waiting Intake, Grooming Service Job summary, Hotel Stay-derived arrivals/departures/occupancy/attention, and payment-derived current-Branch revenue/unpaid summaries | **LIVE** at `/business/home` |
| **Booking Engine (BF-2)** | Multi-service booking creation, editing, cancellation, capacity checks, conflict recovery | **LIVE** at `/business/calendar` |
| **Calendar (BF-2)** | Sunday-first Day/Week/Month/Custom scheduling through one view component, continuous Hotel spans, guarded move/both-edge resize, spreadsheet-like copy/paste/undo/Delete/navigation keys, Today focus, touch handlers, compact bottom guide, module/status filters and mobile Agenda | **LIVE** at `/business/calendar` |
| **Scan / Intake (Phase E/BF-6 reuse)** | Camera scan, manual code entry, QR validation, consent review, belongings logging, Grooming handoff and explicit Hotel Stay target handoff | **LIVE** at `/business/scan`; no duplicate Hotel Intake flow |
| **Customers & Pets (BF-3/BF-8)** | One Business-level customer relationship, readable desktop table/mobile cards, responsive detail hierarchy, booking-based filters, linked local Pets, connection/access presentation, tags, notes, Booking context, compact Branch-attributed Charge/Payment history, and one inline shared `ประวัติบริการ` history | **LIVE LOCAL PROTOTYPE** at `/business/customers` and `/business/customers/[customerId]` |
| **Inbox & Customer Communication (BF-4/BF-7)** | Business-wide Customer conversations with readable desktop split view, compact search/filters, Pet/Booking/Branch context, local text, three default quick replies with remembered visibility, unread state, one structured add-service approval prototype, and optional staff-triggered local billing text | **LIVE LOCAL PROTOTYPE** at `/business/inbox`; no real delivery, attachments, notifications, payment link, LINE transport, or Consumer Inbox |
| **Grooming Operations Foundation (BF-5/BF-8)** | Today execution board for linked Grooming Service Jobs, legal lifecycle transition, Pet visual scan anchor, staff/resource assignment with existing conflict evaluator, Intake handoff, Guardian-only add-on approval integration, internal notes, explicit BF-7 checkout handoff, and automatic creation/update of one shared Service Record on completion | **LIVE LOCAL PROTOTYPE** at `/business/grooming` only when the active Branch enables Grooming |
| **Hotel / Boarding Operations Foundation (BF-6/BF-8)** | Today arrivals/departures/current stays, continuous room/zone occupancy and capacity, Stay lifecycle, guarded assignment/moves, lightweight daily care/incidents/notes, shared Intake/Inbox/Customer/Home integration, explicit BF-7 checkout handoff, and automatic creation of one shared Stay Service Record on checkout/completion | **LIVE LOCAL PROTOTYPE** at `/business/hotel` only when the active Branch enables Hotel |
| **Billing, Payments & Revenue Foundation (BF-7)** | Shared browser-local Charges with base/add-on/adjustment/discount lines, separately recorded Payment allocations, derived unpaid/partial/paid/cancelled state, Branch-attributed revenue, Customer history, Home reuse, and Grooming/Hotel checkout review | **LIVE LOCAL PROTOTYPE** at `/business/billing`; whole-THB amounts only; no real payment processing, accounting, tax, refund processor or cross-Branch settlement |
| **Service Record foundation (BF-8)** | One local Service Record per completed Pet-specific Grooming Job or checked-out/completed Hotel Stay; permitted details, activities, resource summary, local photo metadata, correction/source-recompletion audit trail, and optional short BF7 payment reference in history | **LIVE LOCAL DOMAIN DATA** inside Grooming/Hotel completion and Customer/Pet detail; standalone CareProof experience is **SUPERSEDED**. No receipt/certificate/Passport/medical record, Guardian LINE view, real photo storage, or public sharing |
| **Team & Branches** | Role permissions, staff schedules, branch service configuration | **PLANNED** |

## Service Modules

Service Modules plug into Business Core for specific workflows:

### 1. Grooming / Bathing Module (M-GROOM)
- **Status**: **LIVE LOCAL PROTOTYPE** for Grooming-enabled Branches at `/business/grooming`; Daycare remains planned/disabled.
- **Planning / execution split**: Calendar owns the Booking and its booking-status model. Grooming owns a distinct Pet-specific Service Job linked to the Booking; it owns the execution lifecycle and actual timing.
- **Workflow**: Appointment-oriented work with service duration, groomer/station/dryer assignment, internal notes, an attention state, Inbox-linked add-on request, and pickup readiness. Styling preferences, bath logs, staff scheduling, inventory, and customer notification are not implemented.
- **Lifecycle**: `รอรับเข้า (booked) → รับเข้าแล้ว (checked-in) → รอเริ่ม (waiting) → กำลังทำ (in-service) → พร้อมรับกลับ (ready-for-pickup) → เสร็จแล้ว (completed)`; `cancelled` is terminal. The permitted transition graph is enforced locally, so a Job cannot jump from Booked straight to Completed.
- **Shared foundation**: Customer/Pet identities are referenced from Business Core, existing Resource objects remain the source of staff/station/dryer assignment and conflict checks, and Scan/Intake attaches a matching Grooming Job when the valid local context supports it.

### 2. Hotel / Boarding Module (M-HOTEL)
- **Status**: **LIVE LOCAL PROTOTYPE** for Hotel-enabled Branches at `/business/hotel`; a non-capable Branch receives a calm unavailable state and no live navigation/Command Palette entry.
- **Planning / execution split**: Calendar owns the shared date-range Booking and continuous planning span. Hotel owns one Pet-specific Stay per Booking Pet, Today operations, occupancy, room/zone assignment and execution status.
- **Lifecycle**: `จองไว้ → รับเข้า → พักอยู่ → พร้อมรับกลับ → เช็กเอาต์ → เสร็จสิ้น`, with guarded `cancelled`/`no-show` terminal states. Check-in requires the Shared Intake target and a valid room/zone assignment.
- **Occupancy and movement**: Branch room/zone Resources provide capacity. Assignment, drag, manual move and Stay date edits validate conflicts before commit; successful moves retain date-bounded assignment and movement history, while invalid changes roll back.
- **Daily Care**: lightweight food, water, activity, note and completion state. Medication appears/completes only with explicit instructions and matching customer-confirmed Intake authorization; no Passport health data is inferred.
- **Attention and communication**: Today surfaces care due, pickup readiness, unresolved lightweight incident/note and waiting Inbox request cues. Business notes/incidents remain internal; `ส่งข้อความ` reuses the Business + Customer conversation.
- **Not included**: Hotel-owned financial logic or automatic settlement, pricing authority, inventory, medical/veterinary workflows, full Incident Management, Backend/Database, Consumer or LINE work. BF7 may reference a Stay for explicit checkout, and BF8 may summarize it only after genuine checkout; neither action creates a Payment or makes the service record a payment or handover state.

### 3. Daycare Module (M-DAYCARE)
- **Status**: Booking representation LIVE in BF-2; attendance & playgroup board PLANNED.
- **Workflow**: Day-based attendance by date, zone, and hourly capacity (e.g., `8/12`). Pet temperament matching, playgroup safety notes.
- **Lifecycle**: `Booked → Checked In → Active in Group → Resting → Checked Out`.

### 4. Future Service Modules
- Training, Medical records / Clinic handoff, Transport, Retail.

## Capability boundaries

- Calendar (BF-2) is shared planning infrastructure. It represents appointments, continuous multi-day Hotel Booking spans, and day bookings together. Grooming `/business/grooming` and Hotel `/business/hotel` are separate module execution surfaces linked to the same Booking foundation; Daycare attendance remains unimplemented.
- Shared Business Intake Engine (Phase E) verifies QR consent and may target an eligible linked Grooming Job or one explicit matching Hotel Stay rather than creating another intake flow. It never grants Passport data beyond active Business/Branch/scope/duration consent.
- Customer & Pet identity is shared across all modules; adding a service never duplicates customer profiles.
- BF-4 keeps one ongoing conversation per Business + Customer relationship in this prototype. Pet, Booking, Branch and Grooming Service Job are context references rather than new identity records or automatic per-Pet/per-Booking/Stay threads. Hotel launches reuse Customer/Pet/Booking context.
- A Conversation never grants Pet Passport scope. Expired/revoked Branch consent still hides protected values. The local Guardian-only structured response may update the linked Grooming Job add-ons and estimated duration, but never creates a Charge or mutates a Booking. Hotel Business notes, care and incident data never become messages automatically.
- BF-7 uses the existing shared Business state and shared Customer/Pet identities. Charge and Payment are separate local financial records with Branch attribution; Billing, Customer history and Home revenue do not keep separate financial fixtures. A completed Job/Stay is not a paid financial state.
- BF-8 uses that same shared Business state and references completed Grooming Jobs/checked-out Hotel Stays by source ID. Service Records are Pet-specific even where a Charge is Booking-level; payment is a read-only BF7 reference and remains separate from service completion. Customer/Pet history reuses the same records, not a fixture or Passport copy.
- Business Core and Service Modules use the Warm White / Pastel Yellow operational visual system.
