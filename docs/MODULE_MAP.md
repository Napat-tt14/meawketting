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
| **Business Shell (BF-1)** | Branch context switcher, Warm White / Pastel Yellow visual system, live destinations, architecture-visible planned/disabled service and management navigation | **LIVE** across `/business/*` |
| **Home / Today (BF-1)** | Three-image auto-rotating Spotlight with arrows, desktop banner/action split, direct work actions, arrivals, departures, waiting intake, service summaries, revenue boundary | **LIVE** at `/business/home` |
| **Booking Engine (BF-2)** | Multi-service booking creation, editing, cancellation, capacity checks, conflict recovery | **LIVE** at `/business/calendar` |
| **Calendar (BF-2)** | Sunday-first Day/Week/Month/Custom scheduling with remembered view, continuous Hotel spans, guarded move/both-edge resize, keyboard/Alt copy, touch handlers, compact bottom guide, module/status filters and mobile Agenda | **LIVE** at `/business/calendar` |
| **Scan / Intake (Phase E)** | Camera scan, manual code entry, QR validation, consent review, belongings logging | **LIVE** at `/business/scan` |
| **Customers & Pets (BF-3)** | One Business-level customer relationship, readable desktop table/mobile cards, responsive detail hierarchy, booking-based filters, linked local Pets, connection/access presentation, tags, notes, and Booking context | **LIVE LOCAL PROTOTYPE** at `/business/customers` and `/business/customers/[customerId]` |
| **Inbox & Customer Communication (BF-4)** | Business-wide Customer conversations with readable desktop split view, compact search/filters, Pet/Booking/Branch context, local text, three default quick replies with remembered visibility, unread state, and one structured add-service approval prototype | **LIVE LOCAL PROTOTYPE** at `/business/inbox`; no real delivery, attachments, notifications, or Consumer Inbox |
| **Billing & Payments (BF-5)**| Charges, line items, service bundles, payment status, receipts | **PLANNED** |
| **CareProof Foundation** | Verifiable evidence, photos, checklists, return to Guardian | **PLANNED** |
| **Team & Branches** | Role permissions, staff schedules, branch service configuration | **PLANNED** |

## Service Modules

Service Modules plug into Business Core for specific workflows:

### 1. Grooming / Bathing Module (M-GROOM)
- **Status**: Booking representation LIVE in BF-2; operational queue board PLANNED.
- **Workflow**: Appointment-oriented work with service duration, groomer assignment, table/bath resource allocation, shampoo allergies, cut style preferences, pickup notification.
- **Lifecycle**: `Booked → Arrived → Received → Waiting → In Service → Ready for Pickup → Completed`.

### 2. Hotel / Boarding Module (M-HOTEL)
- **Status**: Booking representation LIVE in BF-2; room occupancy board PLANNED.
- **Workflow**: Multi-day stays with arrival/departure dates, configurable room types, room inventory, feeding/medication instructions, 24h care logs.
- **Lifecycle**: `Reserved → Expected → Received → Staying → Preparing Checkout → Checked Out`.

### 3. Daycare Module (M-DAYCARE)
- **Status**: Booking representation LIVE in BF-2; attendance & playgroup board PLANNED.
- **Workflow**: Day-based attendance by date, zone, and hourly capacity (e.g., `8/12`). Pet temperament matching, playgroup safety notes.
- **Lifecycle**: `Booked → Checked In → Active in Group → Resting → Checked Out`.

### 4. Future Service Modules
- Training, Medical records / Clinic handoff, Transport, Retail.

## Capability boundaries

- Calendar (BF-2) is shared scheduling infrastructure. It represents appointments, continuous multi-day stays, and day bookings together, but does not replace dedicated operational boards (e.g., Grooming queue or Hotel occupancy matrix).
- Shared Business Intake Engine (Phase E) verifies QR consent and hands off to the correct service workflow.
- Customer & Pet identity is shared across all modules; adding a service never duplicates customer profiles.
- BF-4 keeps one ongoing conversation per Business + Customer relationship in this prototype. Pet, Booking, Branch, and future Service Job are context references rather than new identity records or automatic per-Pet/per-Booking threads.
- A Conversation never grants Pet Passport scope. Expired/revoked Branch consent still hides protected values, and the current local structured response does not create a Charge or mutate Booking add-ons.
- Business Core and Service Modules use the Warm White / Pastel Yellow operational visual system.
