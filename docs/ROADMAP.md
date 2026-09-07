# Roadmap

Status: **CANONICAL OUTCOME ROADMAP (BUSINESS-FIRST REBASE)**  
Owner: Product / Delivery

This roadmap sequences outcomes, not Page IDs or route counts. A planned stage is not implementation approval, and later order remains subject to Product prioritization.

## Backend delivery status

| Outcome | Status | Scope & Boundary |
|---|---|---|
| **BE0: Backend readiness** | **COMPLETE** | Frozen-domain audit, persistence map, Cloudflare study, typed-boundary direction and staged backend plan |
| **BE1: Identity / Business / Branch** | **IMPLEMENTED LOCALLY** | Person, Business, Branch, BusinessMembership, explicit Branch access, narrow OWNER/MANAGER/STAFF role foundation, durable Branch modules/hours, typed API/application/repository boundary, server scope enforcement and audit/correlation. Production auth and deployment excluded. |
| **BE2: Customer / Pet** | **IMPLEMENTED LOCALLY** | Durable Business Customer, identity-only Pet anchor, Business-local Pet profile/contact relationship, notes/tags/lifecycle, search/duplicate warnings, typed API/application/repository, tenant enforcement, audit and frozen-UI cache compatibility. Guardian/Passport authority excluded. |
| **BE3: Booking / Calendar / resources** | **IMPLEMENTED LOCALLY** | Durable appointment/date-range/day Booking aggregates, BE2 Customer/Pet references, minimal schedulable Resource projection, range queries, server availability/conflict enforcement, transactional reservation guards, create idempotency, optimistic revisions, audit and frozen-UI migration. Service execution remains local for BE4. |

Consumer remains paused. LINE, payment, media/R2 and production deployment are not started.

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
| **BF-2: Shared Booking & Calendar** | **IMPLEMENTED — UI FROZEN / BE3 D1 DURABLE** | Multi-service Calendar (`/business/calendar`), appointment/date-range/day models, multi-Pet links, server-enforced resource/capacity conflicts, create/edit/reschedule/resize/cancel and contextual Booking Editor. Execution Job/Stay/Attendance remains local for BE4. |
| **BF-3: Customers & Pets Foundation** | **IMPLEMENTED — UI FROZEN / BE2 + BE3 D1 DURABLE** | Business-level Customer records, durable neutral multi-Pet relationships, backend Customer/Pet/phone search, lightweight tags/notes, BE3-backed Booking context by stable BE2 ID, and explicit non-authoritative Passport connection/access compatibility presentation (`/business/customers`, `/business/customers/[customerId]`) |
| **BF-4: Inbox & Customer Communication Foundation** | **COMPLETE — LOCAL PROTOTYPE** | `/business/inbox`, Business-wide Customer conversation reuse, Pet/Booking/Branch context, search, unread, local text/quick replies, and structured add-service request/Guardian-response test boundary; real messaging and notifications excluded |
| **Phase E: Shared Business Intake Engine** | **COMPLETE** | Camera scan, manual code entry, QR validation, consent review, belongings logging, check-in completion (`/business/scan`, `/business/intake/[id]`) |
| **BF-5: Grooming Operations Foundation** | **COMPLETE — LOCAL PROTOTYPE** | Capability-aware `/business/grooming` Today board; Booking-planning and Grooming Service Job-execution stay distinct; Pet-specific Job lifecycle, shared Customer/Pet/Resource/Intake/Inbox references, board/status controls, and lightweight completed-service history. |
| **BF-6: Hotel / Boarding Operations Foundation** | **COMPLETE — LOCAL PROTOTYPE** | Capability-aware `/business/hotel`; Pet-specific Stay records linked to shared date-range Bookings, continuous room/zone occupancy, capacity guards, assignment/move history, Shared Intake check-in, lightweight daily care, incidents/notes, Inbox action, Customer history, and Home summary. |
| **BF-7: Billing, Payments & Revenue Foundation** | **COMPLETE — LOCAL PROTOTYPE** | `/business/billing`; separate browser-local Charges and Payments, whole-THB line items, derived unpaid/partial/paid/cancelled state, current-Branch attribution, Grooming/Hotel checkout handoffs, shared Customer history and payment-derived Home revenue. Real payment processing, full accounting, tax, refund policy and cross-Branch settlement remain unimplemented. |
| **BF-8: Shared Service Record & Reports Foundation** | **COMPLETE — LOCAL PROTOTYPE** | (1) Shared Service Record domain data in Customer/Pet `ประวัติบริการ`. (2) Reports & Business Insights (`/business/reports`) single-page dashboard derived from shared state across BF1–BF7, with date range filters (วันนี้, 7 วัน, 30 วัน, กำหนดเอง), branch scope, revenue matching BF7, service breakdowns, operational & customer metrics. Standalone CareProof is superseded. Accounting, tax, payroll, forecasting, and AI analytics remain unimplemented. |
| **BF-9: Team & Staff Operations Foundation** | **COMPLETE — LOCAL PROTOTYPE** | `/business/team` reuses the Business/Branch/Resource/Booking/Grooming/Hotel/Calendar foundations for one shared team directory. A person can work at multiple Branches without duplication; capabilities, active/inactive state and lightweight working/unavailable/break/time-off availability guard Grooming and Hotel care assignment and expose today’s workload/conflicts. Displayed roles are not real authorization. Payroll/HR and full workforce scheduling are excluded. |
| **BF-10: Business & Branch Settings** | **IMPLEMENTED — UI FROZEN / BE1 CONFIG DURABLE** | `/business/settings` preserves its UX while Business text profile and Branch identity/contact/active state/modules/hours persist through BE1. Logo bytes remain local preview; Team/resource/operational records remain fixtures. |
| **BF-11: Daycare Operations** | **IMPLEMENTED — LOCAL PROTOTYPE** | `/business/daycare` provides Pet-specific attendance from shared day Bookings, zone capacity, compatible Team assignment, guarded lifecycle, care/notes, pickup and shared Intake/Inbox/Billing/Service Record integration. |
| **BF-12: Customer CRM & Retention Foundation** | **IMPLEMENTED — LOCAL PROTOTYPE** | Existing Customers routes derive lifecycle/service segments, last visit, next Booking, repeat-visit signals, outstanding balance, next actions and a unified timeline. No duplicate CRM store, points, campaign, automation or AI engine. Final integrated validation is recorded separately in VALIDATION. |
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

Later Business-connected actions may include booking, store messages, add-service approval, Consent / Sharing, Temporary Business access, Guardian visibility for the shared Business Service Record/Service History, Safety / Lost, and Notifications. These remain future scope. LINE is an entry/authentication channel, not Pet ownership authority; production identity linking remains an open architecture decision.

## Candidate development sequence

The completed local foundations and future candidate milestones are:

1. **Business-First Rebase & Shell (BF-1)** — **COMPLETE**: Root Business Landing (`/`) with product-inspired demo preview, `/business` redirect, Warm White / Pastel Yellow operational system, Business Home (`/business/home`).
2. **Booking & Calendar Foundation (BF-2 / BE3)** — **IMPLEMENTED — UI FROZEN / D1 DURABLE**: Shared cross-module Calendar (`/business/calendar`), appointment, date-range and day Booking aggregates, multi-Pet links, server availability/conflicts, idempotent create and authoritative move/resize/cancel. Service execution remains local.
3. **Customers & Pets Foundation (BF-3 / BE2)** — **IMPLEMENTED — UI FROZEN / D1 DURABLE**: Business-scoped Customer records, stable Pet identity with Business-local profiles, durable neutral relationships, server search, tags/notes and warning-only duplicate detection. Booking context resolves BE3 records by stable BE2 IDs; Passport/access presentation remains an explicit non-authoritative dev fixture.
4. **Inbox & Customer Communication Foundation (BF-4)** — **COMPLETE — LOCAL PROTOTYPE**: Contextual conversations, local text/quick replies/unread, Customer/Booking launch recovery, and one structured add-service decision foundation. Real delivery, attachments, notifications, full Consumer Inbox, and Booking/Charge effects remain unimplemented.
5. **Grooming Operations Foundation (BF-5)** — **COMPLETE — LOCAL PROTOTYPE**: `/business/grooming` is a capability-aware execution board for Grooming Service Jobs. It reuses Calendar Booking planning, Customer/Pet identity, Branch Resources, Intake, Inbox structured requests, and Home summaries; it does not claim a full Grooming production system.
6. **Hotel / Boarding Operations Foundation (BF-6)** — **COMPLETE — LOCAL PROTOTYPE**: `/business/hotel` is live only for Hotel-enabled Branches. Calendar remains date-range planning; Pet-specific Stays handle Today operations, occupancy, guarded room movement, lightweight care, notes/incidents and Intake/Inbox/Home/Customer handoffs without duplicating shared identities or Bookings.
7. **Billing, Payments & Revenue Foundation (BF-7)** — **COMPLETE — LOCAL PROTOTYPE**: `/business/billing` keeps Charge separate from Payment, records whole-THB local payment allocations, derives financial status, preserves Branch attribution, supports explicit Grooming/Hotel checkout, and shares data with Customer history and Home revenue. It does not implement a gateway, full accounting, tax, refund policy or cross-Branch settlement.
8. **Shared Service Record & Reports Foundation (BF-8)** — **COMPLETE — LOCAL PROTOTYPE**: Grooming completion and Hotel checkout/completion create/update one source-keyed Service Record surfaced in Customer/Pet `ประวัติบริการ`. `/business/reports` provides a single-page business dashboard derived dynamically from shared state across BF1–BF7 with date range presets, branch-aware scope, payment-derived revenue matching BF7, completed services, room occupancy metrics, peak times, cancellations, top customers, and recent services. Standalone CareProof/Handover UI is superseded. Accounting, tax, payroll, forecasting, and AI insights remain unimplemented.
9. **Team & Staff Operations Foundation (BF-9)** — **COMPLETE — LOCAL PROTOTYPE**: `/business/team` is a shared, Branch-aware directory with one local person record per team member, multi-Branch membership, service capability tags, active/inactive status and lightweight availability. Existing Resources stay canonical; Calendar/Booking, Grooming and Hotel care reuse the shared Team data for assignment guards and today workload/conflict context. Owner/Manager/Staff roles are UI foundations only; real authorization, payroll/HR and full workforce scheduling are not implemented.
10. **Business & Branch Settings (BF-10)** — **IMPLEMENTED — UI FROZEN / BE1 CONFIG DURABLE**: Shared Business text profile/Branch configuration, active branches, service capabilities and operating-hour guards persist through BE1; shared Team/resource disclosures remain fixture-backed and there is no additional Branch route, staff editor or pricing catalogue.
11. **Daycare Operations (BF-11 / M-DAYCARE)** — **IMPLEMENTED — LOCAL PROTOTYPE**: Capability-gated attendance, zones, staff, care and pickup at `/business/daycare`, linked to the same Booking, Intake, Customer/Pet, Inbox, Billing and Service Record foundations.
12. **Customer CRM & Retention (BF-12)** — **IMPLEMENTED — LOCAL PROTOTYPE**: Derived relationship summary, segments, timeline and staff-triggered next actions in existing Customers routes. Loyalty is a placeholder, not a rewards or automation system.
13. **BE1 Identity / Business / Branch backend** — **IMPLEMENTED LOCALLY**: D1-compatible schema/migration, Person, Business, Branch, membership/access, durable configuration, typed application boundary, server tenant/Branch authorization and correlated audit. Production auth and production deployment remain not implemented.
14. **BE2 Customer / Pet backend** — **IMPLEMENTED LOCALLY**: Business-wide Customer and Business-local Pet profile/contact relationship truth, notes/tags/lifecycle, server name/phone/Pet search, warning-only duplicates, stable-ID compatibility for local domains, tenant enforcement and privacy-bounded audit. Guardian/Passport/Consent are not included.
15. **BE3 Booking / Calendar / resources backend** — **IMPLEMENTED LOCALLY**: durable planning aggregates and minimal schedulable Resources use BE1 authorization and BE2 identities; Calendar/Home/Customer projections use BE3 truth, and D1 write-time guards protect capacity/exclusive conflicts. BE4 service execution is not started.
16. **Guardian touchpoints required by Business workflows (P2)** — **FUTURE / PAUSED**: Introduce only when an approved Business workflow requires a Guardian-side action. Target channel is the LINE Mini App; scope and sequencing require a separate Consumer phase decision.
17. **Independent Guardian expansion (P3)** — **PAUSED**: No standalone Consumer expansion or LINE feature build starts automatically.

## Strict Boundary

BE1, BE2 and BE3 supersede the former “Backend not started” wording only for identity/tenant, Customer/Pet and Booking/Calendar planning. **BE4 is not started.** Service Operations persistence, Guardian/Passport/Consent, advanced pricing, inventory, full document/certificate Service Records, Guardian delivery, real photo storage, full Incident Management, veterinary/medical work, production authentication/infrastructure, payroll/HR, real payment processing/accounting, LINE, Consumer work, campaigns, automation and AI remain outside this checkpoint. Consumer remains **PAUSED**; `/workfiledesign` remains untouched.
