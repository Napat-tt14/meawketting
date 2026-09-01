# Roadmap

Status: **CANONICAL OUTCOME ROADMAP (BUSINESS-FIRST REBASE)**  
Owner: Product / Delivery

This roadmap sequences outcomes, not Page IDs or route counts. A planned stage is not implementation approval, and later order remains subject to Product prioritization.

## Consumer / Guardian direction status

| Label | Status | Meaning |
|---|---|---|
| **CURRENT** | Consumer web prototype | Existing standalone Consumer routes remain in the repository and are retained/frozen. |
| **TARGET** | LINE Mini App | LINE-first Guardian channel: LINE → Login → My Pets → Add Pet → Pet Passport. |
| **PAUSED** | Consumer development | No independent Guardian expansion is authorized in the current Business-first stage. |
| **NOT IMPLEMENTED** | LINE Login / LINE Mini App / LINE notifications / production Guardian identity linking | Future architecture and integration work only. |

## Completed local prototype foundations

| Outcome | Status | Scope & Boundary |
|---|---|---|
| **Business-First Product Rebase & Homepage Correction** | **COMPLETE** | Root `/` is the canonical Business Landing; first viewport communicates operating value; Business Login is the primary CTA; Guardian is secondary; `/business` redirects to `/`; Warm White / Pastel Yellow visual system; planned capabilities are labeled honestly |
| **BF-1: Business Core Shell & Home** | **COMPLETE** | Branch context switcher, capability-aware desktop & mobile navigation, priority-first Business Home (`/business/home`) |
| **BF-2: Shared Booking & Calendar** | **COMPLETE** | Multi-service calendar (`/business/calendar`), appointment/stay/day time models, resource capacity checks, conflict recovery, contextual Booking Editor |
| **BF-3: Customers & Pets Foundation** | **COMPLETE** | Business-level Customer relationship, multi-Pet local relationships, Customer/Pet/phone search, Booking context, lightweight tags/notes, Passport connection/access presentation (`/business/customers`, `/business/customers/[customerId]`) |
| **BF-4: Inbox & Customer Communication Foundation** | **COMPLETE — LOCAL PROTOTYPE** | `/business/inbox`, Business-wide Customer conversation reuse, Pet/Booking/Branch context, search, unread, local text/quick replies, and structured add-service request/Guardian-response test boundary; real messaging and notifications excluded |
| **Phase E: Shared Business Intake Engine** | **COMPLETE** | Camera scan, manual code entry, QR validation, consent review, belongings logging, check-in completion (`/business/scan`, `/business/intake/[id]`) |
| **BF-5: Grooming Operations Foundation** | **COMPLETE — LOCAL PROTOTYPE** | Capability-aware `/business/grooming` Today board; Booking-planning and Grooming Service Job-execution stay distinct; Pet-specific Job lifecycle, shared Customer/Pet/Resource/Intake/Inbox references, board/status controls, and lightweight completed-service history. |
| **BF-6: Hotel / Boarding Operations Foundation** | **COMPLETE — LOCAL PROTOTYPE** | Capability-aware `/business/hotel`; Pet-specific Stay records linked to shared date-range Bookings, continuous room/zone occupancy, capacity guards, assignment/move history, Shared Intake check-in, lightweight daily care, incidents/notes, Inbox action, Customer history, and Home summary. |
| **Consumer web prototype (Retained / Frozen)** | **COMPLETE (PAUSED)** | Existing standalone Create Passport, 6 themes, My Pets, Public Safety, Lost flow, and Temporary Business Sharing remain available for regression continuity; this is not the target final Guardian channel |

## Business-First Product Direction

- **Meawketting Business is the main product and primary commercial experience.** Feature development prioritizes business operational capabilities that drive commercial revenue and business customer value.
- **Consumer development is PAUSED.** The current Consumer web prototype remains retained, frozen, and regression-tested; independent Guardian expansion is frozen.
- **LINE-first Guardian experience is the future target.** The LINE Mini App is a future / paused Guardian touchpoint, not the next implementation phase and not a reason to change current Business priority.

### Future Guardian touchpoint direction (P2 / P3 — Paused)

The conceptual future flow is:

```text
Add Meawketting LINE
→ LINE Login
→ open LINE Mini App
→ My Pets
→ + Add Pet
→ Cat / Dog
→ Pet Profile / Pet Passport
```

Later Business-connected actions may include booking, store messages, add-service approval, Consent / Sharing, Temporary Business access, CareProof, Service History, Safety / Lost, and Notifications. These remain future scope. LINE is an entry/authentication channel, not Pet ownership authority; production identity linking remains an open architecture decision.

## Candidate development sequence

The next approved implementation milestone must be chosen after the foundation review:

1. **Business-First Rebase & Shell (BF-1)** — **COMPLETE**: Root Business Landing (`/`) with product-inspired demo preview, `/business` redirect, Warm White / Pastel Yellow operational system, Business Home (`/business/home`).
2. **Booking & Calendar Foundation (BF-2)** — **COMPLETE**: Shared cross-module Calendar (`/business/calendar`), appointment, stay, and day booking models, capacity validation.
3. **Customers & Pets Foundation (BF-3)** — **COMPLETE**: Cross-service Customer relationship, linked local Pets, permitted-data boundary presentation, tags, notes, and Booking context.
4. **Inbox & Customer Communication Foundation (BF-4)** — **COMPLETE — LOCAL PROTOTYPE**: Contextual conversations, local text/quick replies/unread, Customer/Booking launch recovery, and one structured add-service decision foundation. Real delivery, attachments, notifications, full Consumer Inbox, and Booking/Charge effects remain unimplemented.
5. **Grooming Operations Foundation (BF-5)** — **COMPLETE — LOCAL PROTOTYPE**: `/business/grooming` is a capability-aware execution board for Grooming Service Jobs. It reuses Calendar Booking planning, Customer/Pet identity, Branch Resources, Intake, Inbox structured requests, and Home summaries; it does not claim a full Grooming production system.
6. **Hotel / Boarding Operations Foundation (BF-6)** — **COMPLETE — LOCAL PROTOTYPE**: `/business/hotel` is live only for Hotel-enabled Branches. Calendar remains date-range planning; Pet-specific Stays handle Today operations, occupancy, guarded room movement, lightweight care, notes/incidents and Intake/Inbox/Home/Customer handoffs without duplicating shared identities or Bookings.
7. **Daycare Operations (M-DAYCARE)** — **PLANNED**: Hourly capacity, playgroup safety, attendance. No Daycare operational route or board has started.
8. **Billing, Charges & Payments** — **PLANNED**: Multi-service charges, combined checkout, payment status, receipts.
9. **Cross-Service CareProof** — **PLANNED**: Verified evidence, photo logs, checklists, return to Guardian.
10. **Backend & Production Architecture** — **PLANNED**: Real auth, database schema, multi-tenant isolation, payment gateway, and Cloudflare production architecture/deployment. Cloudflare is the selected platform direction; runtime/storage choices remain open.
11. **Guardian touchpoints required by Business workflows (P2)** — **FUTURE / PAUSED**: Introduce only when an approved Business workflow requires a Guardian-side action. Target channel is the LINE Mini App; scope and sequencing require a separate Consumer phase decision.
12. **Independent Guardian expansion (P3)** — **PAUSED**: No standalone Consumer expansion or LINE feature build starts automatically.

## Strict Boundary

Completing BF-6 does **NOT** authorize starting BF-7, Daycare, Billing/Payments, advanced pricing, inventory, full CareProof, full Incident Management, veterinary/medical work, Backend, Production, LINE Login, LINE Mini App, or Consumer work automatically. Room policy, waitlist and cross-Branch transfer remain future decisions. Each milestone requires a separate Product Owner approval and execution plan. Consumer remains paused until a Business workflow milestone requires a Guardian-side touchpoint.
