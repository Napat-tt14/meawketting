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
| Returned Service History / Documents | Guardian-visible service records and versioned output | PLANNED |
| Platform Admin | Reason-bound case queue/detail and audit-sensitive operations | ARCHITECTURE ONLY |

The future Guardian layer may later support Business-connected booking, store messages, add-service approval, Consent / Sharing, Temporary Business access, CareProof, Service History, Safety / Lost, and Notifications. These are future capabilities only; LINE is an entry/authentication channel and does not become Pet ownership authority.

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
| **Business Shell (BF-1/BF-5)** | Branch context switcher, Warm White / Pastel Yellow visual system, capability-aware Grooming live navigation, architecture-visible planned/disabled service and management navigation including Hotel | **LIVE** across `/business/*` |
| **Home / Today (BF-1/BF-5)** | Three-image auto-rotating Spotlight with arrows, desktop banner/action split, direct work actions, arrivals, departures, waiting intake, Grooming Service Job-derived summary, service summaries and revenue boundary | **LIVE** at `/business/home` |
| **Booking Engine (BF-2)** | Multi-service booking creation, editing, cancellation, capacity checks, conflict recovery | **LIVE** at `/business/calendar` |
| **Calendar (BF-2)** | Sunday-first Day/Week/Month/Custom scheduling through one view component, continuous Hotel spans, guarded move/both-edge resize, spreadsheet-like copy/paste/undo/Delete/navigation keys, Today focus, touch handlers, compact bottom guide, module/status filters and mobile Agenda | **LIVE** at `/business/calendar` |
| **Scan / Intake (Phase E)** | Camera scan, manual code entry, QR validation, consent review, belongings logging | **LIVE** at `/business/scan` |
| **Customers & Pets (BF-3)** | One Business-level customer relationship, readable desktop table/mobile cards, responsive detail hierarchy, booking-based filters, linked local Pets, connection/access presentation, tags, notes, and Booking context | **LIVE LOCAL PROTOTYPE** at `/business/customers` and `/business/customers/[customerId]` |
| **Inbox & Customer Communication (BF-4)** | Business-wide Customer conversations with readable desktop split view, compact search/filters, Pet/Booking/Branch context, local text, three default quick replies with remembered visibility, unread state, and one structured add-service approval prototype | **LIVE LOCAL PROTOTYPE** at `/business/inbox`; no real delivery, attachments, notifications, or Consumer Inbox |
| **Grooming Operations Foundation (BF-5)** | Today execution board for linked Grooming Service Jobs, legal lifecycle transition, Pet visual scan anchor, staff/resource assignment with existing conflict evaluator, Intake handoff, Guardian-only add-on approval integration, internal notes, and lightweight completed-service history | **LIVE LOCAL PROTOTYPE** at `/business/grooming` only when the active Branch enables Grooming |
| **Hotel / Boarding Operations** | Shared Calendar date-range Hotel Bookings remain available; dedicated operations, occupancy, room assignment, daily-care and Stay workflows are deferred | **PLANNED / NOT STARTED**; disabled menu entry, no `/business/hotel` route |
| **Billing & Payments**| Charges, line items, service bundles, payment status, receipts | **PLANNED** |
| **CareProof Foundation** | Verifiable evidence, photos, checklists, return to Guardian | **PLANNED** |
| **Team & Branches** | Role permissions, staff schedules, branch service configuration | **PLANNED** |

## Service Modules

Service Modules plug into Business Core for specific workflows:

### 1. Grooming / Bathing Module (M-GROOM)
- **Status**: **LIVE LOCAL PROTOTYPE** for Grooming-enabled Branches at `/business/grooming`; Hotel / Boarding and Daycare remain visibly planned/disabled.
- **Planning / execution split**: Calendar owns the Booking and its booking-status model. Grooming owns a distinct Pet-specific Service Job linked to the Booking; it owns the execution lifecycle and actual timing.
- **Workflow**: Appointment-oriented work with service duration, groomer/station/dryer assignment, internal notes, an attention state, Inbox-linked add-on request, and pickup readiness. Styling preferences, bath logs, staff scheduling, inventory, and customer notification are not implemented.
- **Lifecycle**: `รอรับเข้า (booked) → รับเข้าแล้ว (checked-in) → รอเริ่ม (waiting) → กำลังทำ (in-service) → พร้อมรับกลับ (ready-for-pickup) → เสร็จแล้ว (completed)`; `cancelled` is terminal. The permitted transition graph is enforced locally, so a Job cannot jump from Booked straight to Completed.
- **Shared foundation**: Customer/Pet identities are referenced from Business Core, existing Resource objects remain the source of staff/station/dryer assignment and conflict checks, and Scan/Intake attaches a matching Grooming Job when the valid local context supports it.

### 2. Hotel / Boarding Module (M-HOTEL)
- **Status**: **PLANNED / NOT STARTED**. Shared Calendar retains date-range Hotel Booking representation; no dedicated `/business/hotel` route exists.
- The Business sidebar and mobile More menu keep a disabled `โรงแรม` button labeled `ยังไม่เปิดใช้` so the planned capability remains discoverable.
- Occupancy, arrivals/departures execution, room assignment/moves, daily care, Hotel Stay state and Hotel-specific Intake handoff will be designed in a future milestone.

### 3. Daycare Module (M-DAYCARE)
- **Status**: Booking representation LIVE in BF-2; attendance & playgroup board PLANNED.
- **Workflow**: Day-based attendance by date, zone, and hourly capacity (e.g., `8/12`). Pet temperament matching, playgroup safety notes.
- **Lifecycle**: `Booked → Checked In → Active in Group → Resting → Checked Out`.

### 4. Future Service Modules
- Training, Medical records / Clinic handoff, Transport, Retail.

## Capability boundaries

- Calendar (BF-2) is shared planning infrastructure. It represents appointments, continuous multi-day Hotel Booking spans, and day bookings together. Grooming `/business/grooming` is the only service execution surface currently implemented; Hotel / Boarding remains planned and does not duplicate any execution state. Daycare attendance remains unimplemented.
- Shared Business Intake Engine (Phase E) verifies QR consent and may target an eligible linked Grooming Job at check-in rather than creating another intake flow. It never grants Passport data beyond active Business/Branch/scope/duration consent.
- Customer & Pet identity is shared across all modules; adding a service never duplicates customer profiles.
- BF-4 keeps one ongoing conversation per Business + Customer relationship in this prototype. Pet, Booking, Branch and Grooming Service Job are context references rather than new identity records or automatic per-Pet/per-Booking threads. Future Hotel work will reuse the same shared context.
- A Conversation never grants Pet Passport scope. Expired/revoked Branch consent still hides protected values. The local Guardian-only structured response may update the linked Grooming Job add-ons and estimated duration, but never creates a Charge or mutates a Booking. No future Hotel transport or execution behavior is implied.
- Business Core and Service Modules use the Warm White / Pastel Yellow operational visual system.
