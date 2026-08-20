# Module Map

Status: **CANONICAL CAPABILITY OWNERSHIP (BUSINESS-FIRST REBASE)**  
Owner: Product Architecture

A Module is a capability and outcome, not a route family, Page ID or separate data silo. URLs are owned by [ROUTES](./ROUTES.md); shared objects by [ARCHITECTURE](./ARCHITECTURE.md).

## Product priority

- **Meawketting Business is the main product and primary commercial experience.** Business Core and Service Modules form the core revenue-generating product surface.
- **Consumer development is PAUSED.** Consumer capabilities (Passport, My Pets, Public Safety, Lost flow, Temporary Business Sharing) remain live, tested, and preserved as the foundation of identity and consent.

## Platform and Consumer areas (Preserved)

| Area | Outcome | Current state |
|---|---|---|
| Business Landing (`/`) | Commercial product showcase, multi-service overview, trust advantage, login CTA | LIVE LOCAL PROTOTYPE |
| Business Login (`/business/login`) | Google prototype auth for business staff and managers | LIVE LOCAL PROTOTYPE |
| Business Redirect (`/business`) | Compatibility redirect to `/` | LIVE LOCAL PROTOTYPE |
| Passport / My Pets | Create, preview/export, list Pets and open Passport-first detail | LIVE LOCAL PROTOTYPE (PAUSED) |
| Quick Passport QR | Five-minute Passport-safe sharing from Pet Detail | LIVE LOCAL PROTOTYPE (PAUSED) |
| Public Safety / Lost | Guardian-controlled public-safe identity and calm lost recovery | LIVE LOCAL PROTOTYPE (PAUSED) |
| Temporary Business Sharing | Named Business/Branch, scope, duration, consent, gateway, revoke/history | LIVE LOCAL PROTOTYPE (PAUSED) |
| Returned Service History / Documents | Guardian-visible service records and versioned output | PLANNED |
| Platform Admin | Reason-bound case queue/detail and audit-sensitive operations | ARCHITECTURE ONLY |

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
| **Business Shell (BF-1)** | Branch context switcher, Warm Golden Yellow visual system, capability-aware nav | **LIVE** across `/business/*` |
| **Home / Today (BF-1)** | Priority-first operational overview: arrivals, departures, waiting intake, revenue | **LIVE** at `/business/home` |
| **Booking Engine (BF-2)** | Multi-service booking creation, editing, cancellation, capacity checks, conflict recovery | **LIVE** at `/business/calendar` |
| **Calendar (BF-2)** | Cross-module day/week scheduling, filter by module/status, mobile agenda | **LIVE** at `/business/calendar` |
| **Scan / Intake (Phase E)** | Camera scan, manual code entry, QR validation, consent review, belongings logging | **LIVE** at `/business/scan` |
| **Customers & Pets (BF-3)** | One customer record, linked pets, permitted data, tags, operational history | **PLANNED** (Next) |
| **Inbox & Messaging (BF-4)** | Contextual conversations, operational updates, photo sharing, structured approvals | **PLANNED** |
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

- Calendar (BF-2) is shared scheduling infrastructure. It represents appointments, stays, and day bookings together, but does not replace dedicated operational boards (e.g., Grooming queue or Hotel occupancy matrix).
- Shared Business Intake Engine (Phase E) verifies QR consent and hands off to the correct service workflow.
- Customer & Pet identity is shared across all modules; adding a service never duplicates customer profiles.
- Business Core and Service Modules use the Warm Golden Yellow operational visual system.
