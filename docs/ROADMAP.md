# Roadmap

Status: **CANONICAL OUTCOME ROADMAP (BUSINESS-FIRST REBASE)**  
Owner: Product / Delivery

This roadmap sequences outcomes, not Page IDs or route counts. A planned stage is not implementation approval, and later order remains subject to Product prioritization.

## Completed local prototype foundations

| Outcome | Status | Scope & Boundary |
|---|---|---|
| **Business-First Product Rebase & Homepage Correction** | **COMPLETE** | Root `/` is the canonical Business Landing; first viewport communicates operating value; Business Login is the primary CTA; Guardian is secondary; `/business` redirects to `/`; Warm Golden Yellow visual system; planned capabilities are labeled honestly |
| **BF-1: Business Core Shell & Home** | **COMPLETE** | Branch context switcher, capability-aware desktop & mobile navigation, priority-first Business Home (`/business/home`) |
| **BF-2: Shared Booking & Calendar** | **COMPLETE** | Multi-service calendar (`/business/calendar`), appointment/stay/day time models, resource capacity checks, conflict recovery, contextual Booking Editor |
| **Phase E: Shared Business Intake Engine** | **COMPLETE** | Camera scan, manual code entry, QR validation, consent review, belongings logging, check-in completion (`/business/scan`, `/business/intake/[id]`) |
| **Consumer Foundation (Preserved)** | **COMPLETE (PAUSED)** | Create passport flow, 6 themes, My Pets, Public Safety, Lost flow, Temporary Business Sharing |

## Business-First Product Direction

- **Meawketting Business is the main product and primary commercial experience.** Feature development prioritizes business operational capabilities that drive commercial revenue and business customer value.
- **Consumer development is PAUSED.** Consumer capabilities (Passport, My Pets, Public Safety, Lost flow, Temporary Business Sharing) remain active, tested, and preserved as a solid trust foundation, but independent consumer expansion is frozen.

## Candidate development sequence

The next approved implementation milestone must be chosen after the foundation review:

1. **Business-First Rebase & Shell (BF-1)** — **COMPLETE**: Root Business Landing (`/`) with product-inspired demo preview, `/business` redirect, Warm Golden Yellow operational system, Business Home (`/business/home`).
2. **Booking & Calendar Foundation (BF-2)** — **COMPLETE**: Shared cross-module Calendar (`/business/calendar`), appointment, stay, and day booking models, capacity validation.
3. **Customers & Pets CRM (BF-3)** — **PLANNED (NEXT)**: Cross-service customer relationship, linked pets, permitted data, tags, operational history. **(DO NOT START AUTOMATICALLY)**.
4. **Inbox & Messaging Foundation (BF-4)** — **PLANNED**: Contextual conversations, photo updates, pickup readiness, structured change approvals.
5. **Billing, Charges & Payments (BF-5)** — **PLANNED**: Multi-service charges, combined checkout, payment status, receipts.
6. **Dedicated Service Operation Boards**:
   - **Grooming Operations (M-GROOM)**: Dedicated station/groomer queue, styling preferences, bath logs.
   - **Hotel / Boarding Operations (M-HOTEL)**: Room inventory matrix (Room × Date), daily feeding/medication logs.
   - **Daycare Operations (M-DAYCARE)**: Hourly capacity, playgroup safety, attendance.
7. **Cross-Service CareProof**: Verified evidence, photo logs, checklists, return to Guardian.
8. **Backend & Production Architecture**: Real auth, database schema, multi-tenant isolation, payment gateway, production deployment.

## Strict Boundary

Completion of this rebase task does **NOT** authorize starting BF-3 or any subsequent milestone automatically. Each milestone requires a separate Product Owner approval and execution plan.
