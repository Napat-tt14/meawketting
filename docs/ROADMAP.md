# Roadmap

Current backend checkpoint: [Supabase migration](./SUPABASE_MIGRATION_REPORT.md). Earlier infrastructure/auth sequencing is superseded; frozen Product scope is unchanged.

Status: **CANONICAL OUTCOME ROADMAP (BUSINESS-FIRST REBASE)**  
Owner: Product / Delivery

This roadmap sequences outcomes, not Page IDs or route counts. A planned stage is not implementation approval, and later order remains subject to Product prioritization.

## Backend delivery status

| Outcome | Status | Scope & Boundary |
|---|---|---|
| **BE0: Backend readiness** | **COMPLETE** | Frozen-domain audit, persistence map, Cloudflare study, typed-boundary direction and staged backend plan |
| **BE1: Identity / Business / Branch** | **IMPLEMENTED LOCALLY** | Person, Business, Branch, BusinessMembership, explicit Branch access, narrow OWNER/MANAGER/STAFF role foundation, durable Branch modules/hours, typed API/application/repository boundary, server scope enforcement and audit/correlation. Supabase Auth implemented; provider configuration and deployment external. |
| **BE2: Customer / Pet** | **IMPLEMENTED LOCALLY** | Durable Business Customer, identity-only Pet anchor, Business-local Pet profile/contact relationship, notes/tags/lifecycle, search/duplicate warnings, typed API/application/repository, tenant enforcement, audit and frozen-UI cache compatibility. Guardian/Passport authority excluded. |
| **BE3: Booking / Calendar / resources** | **IMPLEMENTED LOCALLY** | Durable appointment/date-range/day Booking aggregates, BE2 Customer/Pet references, minimal schedulable Resource projection, range queries, server availability/conflict enforcement, transactional reservation guards, create idempotency, optimistic revisions, audit and frozen-UI migration. BE4 owns separate PostgreSQL service execution records. |
| **BE4: Service Operations** | **VALIDATED LOCALLY** | PostgreSQL Grooming Jobs, Hotel Stays, Daycare Attendance, staff/resource/room/zone assignments, care/activity logs, lifecycle events and source-keyed Service Records. Booking remains planning; completion remains separate from payment. |
| **BE5: Consent / Intake / Passport access** | **VALIDATED LOCALLY** | PostgreSQL Person/Pet authority, Consent, Temporary Business QR grants, scoped fields, expiry/revoke, Intake and audit. Customer and LINE identity never infer Guardian authority. |
| **BE6: Inbox / Communication / LINE foundation** | **VALIDATED PROVIDER-NEUTRAL** | PostgreSQL Conversation/Message/read/approval/outbox/webhook ledger, deduplication and retry boundary for each Business-owned LINE OA. Mock provider tests only; production LINE is not connected. |
| **BE7: Billing / Payments** | **VALIDATED BACKEND FINANCIAL MODEL** | PostgreSQL Charge, items/adjustments, Payment allocations, refunds, attempts, provider references, idempotency and reconciliation state. Manual and mock-provider paths are covered; gateway selection remains external. |
| **BE8: Reports / History / CRM** | **VALIDATED LOCALLY** | Read-only PostgreSQL snapshots derive revenue from Payments, completed services, bookings, customers, module/Branch/date metrics and CRM timeline/balance projections. No writable Reports/CRM store exists. |

Consumer remains PAUSED. Supabase Auth and private Storage code are implemented; real Supabase/Cloudflare staging, LINE credentials and a payment gateway remain external.

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
| **BF-2: Shared Booking & Calendar** | **IMPLEMENTED — UI FROZEN / BE3 PostgreSQL DURABLE** | Multi-service Calendar (`/business/calendar`), appointment/date-range/day models, multi-Pet links, server-enforced resource/capacity conflicts, create/edit/reschedule/resize/cancel and contextual Booking Editor. Execution is a separate BE4 domain. |
| **BF-3: Customers & Pets Foundation** | **IMPLEMENTED — UI FROZEN / BE2 + BE3 PostgreSQL DURABLE** | Business-level Customer records, durable neutral multi-Pet relationships, backend Customer/Pet/phone search, lightweight tags/notes, BE3-backed Booking context by stable BE2 ID, and explicit non-authoritative Passport connection/access compatibility presentation (`/business/customers`, `/business/customers/[customerId]`) |
| **BF-4: Inbox & Customer Communication Foundation** | **COMPLETE — BE6 PostgreSQL / PROVIDER-NEUTRAL** | `/business/inbox`, Business-wide Customer conversation reuse, Pet/Booking/Branch context, search, unread/read state, durable text/quick replies, structured add-service request and Guardian-response test boundary; real delivery and notifications remain external. |
| **Phase E: Shared Business Intake Engine** | **COMPLETE — BE5 PostgreSQL** | Camera scan, manual code entry, Temporary Business QR validation, consent review, belongings logging, expiry/revoke and check-in completion (`/business/scan`, `/business/intake/[id]`). |
| **BF-5: Grooming Operations Foundation** | **COMPLETE — BE4 PostgreSQL** | Capability-aware `/business/grooming` Today board; Booking-planning and Grooming Service Job-execution stay distinct; Pet-specific Job lifecycle, shared Customer/Pet/Resource/Intake/Inbox references, board/status controls, and source-keyed Service Records. |
| **BF-6: Hotel / Boarding Operations Foundation** | **COMPLETE — BE4 PostgreSQL** | Capability-aware `/business/hotel`; Pet-specific Stay records linked to shared date-range Bookings, continuous room/zone occupancy, capacity guards, assignment/move history, Shared Intake check-in, lightweight daily care, incidents/notes, Inbox action, Customer history, and source-keyed Service Records. |
| **BF-7: Billing, Payments & Revenue Foundation** | **COMPLETE — BE7 PostgreSQL** | `/business/billing`; separate Charge and Payment records, whole-THB line items, derived unpaid/partial/paid/cancelled state, refunds/attempts/reconciliation, current-Branch attribution, Grooming/Hotel/Daycare checkout handoffs, shared Customer history and payment-derived Home/BE8 revenue. Real gateway and full accounting remain unimplemented. |
| **BF-8: Shared Service Record & Reports Foundation** | **COMPLETE — BE4/BE8 PostgreSQL** | Shared Service Records in Customer/Pet `ประวัติบริการ`; Reports & Business Insights (`/business/reports`) is a read-only PostgreSQL projection across BE1–BE7 with date filters, Branch scope, payment-derived revenue, service breakdowns and operational/customer metrics. No report table or standalone CareProof module exists. |
| **BF-9: Team & Staff Operations Foundation** | **COMPLETE — BE4 PostgreSQL** | `/business/team` reuses the Business/Branch/Resource/Booking/Grooming/Hotel/Calendar foundations for one durable shared operation-staff directory. A person can work at multiple Branches without duplication; capabilities, active/inactive state and lightweight availability guard execution assignment. Displayed roles are not real authorization. Payroll/HR and full workforce scheduling are excluded. |
| **BF-10: Business & Branch Settings** | **IMPLEMENTED — UI FROZEN / BE1 CONFIG DURABLE** | `/business/settings` preserves its UX while Business text profile and Branch identity/contact/active state/modules/hours persist through BE1. Logo bytes remain local preview; operation-staff/resource records use BE4 PostgreSQL. |
| **BF-11: Daycare Operations** | **IMPLEMENTED — BE4 PostgreSQL** | `/business/daycare` provides Pet-specific attendance from shared day Bookings, zone capacity, compatible operation-staff assignment, guarded lifecycle, care/notes, pickup and shared Intake/Inbox/Billing/Service Record integration. |
| **BF-12: Customer CRM & Retention Foundation** | **IMPLEMENTED — BE8 READ-ONLY PostgreSQL PROJECTION** | Existing Customers routes derive lifecycle/service segments, last visit, next Booking, repeat-visit signals, outstanding balance, next actions and a unified timeline. No duplicate CRM store, points, campaign, automation or AI engine. |
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
2. **Booking & Calendar Foundation (BF-2 / BE3)** — **IMPLEMENTED — UI FROZEN / PostgreSQL DURABLE**: Shared cross-module Calendar (`/business/calendar`), appointment, date-range and day Booking aggregates, multi-Pet links, server availability/conflicts, idempotent create and authoritative move/resize/cancel. Execution is a separate BE4 domain.
3. **Customers & Pets Foundation (BF-3 / BE2)** — **IMPLEMENTED — UI FROZEN / PostgreSQL DURABLE**: Business-scoped Customer records, stable Pet identity with Business-local profiles, durable neutral relationships, server search, tags/notes and warning-only duplicate detection. Booking context resolves BE3 records by stable BE2 IDs; Passport/access presentation remains an explicit non-authoritative dev fixture.
4. **Inbox & Customer Communication Foundation (BF-4)** — **COMPLETE — UI FROZEN / BE6 PostgreSQL PROVIDER-NEUTRAL**: Contextual Conversations, Messages, reads, quick replies, Customer/Booking launch recovery, structured add-service decisions, durable outbox attempts and webhook deduplication. Real delivery, attachments, notifications and full Consumer Inbox remain external.
5. **Grooming Operations Foundation (BF-5)** — **COMPLETE — UI FROZEN / BE4 PostgreSQL**: `/business/grooming` is a capability-aware execution board for Grooming Service Jobs. It reuses Calendar Booking planning, Customer/Pet identity, Branch Resources, Intake, Inbox structured requests, Home summaries and source-keyed Service Records; a full production Grooming system remains outside scope.
6. **Hotel / Boarding Operations Foundation (BF-6)** — **COMPLETE — UI FROZEN / BE4 PostgreSQL**: `/business/hotel` is live only for Hotel-enabled Branches. Calendar remains date-range planning; Pet-specific Stays handle Today operations, occupancy, guarded room movement, lightweight care, notes/incidents and Intake/Inbox/Home/Customer handoffs without duplicating shared identities or Bookings.
7. **Billing, Payments & Revenue Foundation (BF-7)** — **COMPLETE — UI FROZEN / BE7 PostgreSQL**: `/business/billing` keeps Charge separate from Payment, records whole-THB allocations, derives financial status, preserves Branch attribution, supports explicit Grooming/Hotel/Daycare checkout, refunds, attempts and reconciliation, and shares data with Customer history and Home revenue. Gateway, full accounting, tax and automated provider refunds remain external.
8. **Shared Service Record & Reports Foundation (BF-8)** — **COMPLETE — UI FROZEN / BE4 + BE8 PostgreSQL**: Grooming, Hotel and Daycare completion create/update one source-keyed Service Record surfaced in Customer/Pet `ประวัติบริการ`. `/business/reports` is a read-only projection over BE1–BE7 with date/Branch filters, payment-derived revenue, completed services, occupancy and customer metrics. Standalone CareProof/Handover UI is superseded; accounting, tax, payroll, forecasting and AI insights remain external.
9. **Team & Staff Operations Foundation (BF-9)** — **COMPLETE — BE4 PostgreSQL / FROZEN UI**: `/business/team` is a shared, Branch-aware directory with one durable operation-staff record per team member, multi-Branch membership, service capability tags, active/inactive status and lightweight availability. Existing Resources stay canonical; Calendar/Booking, Grooming, Hotel care and Daycare reuse the shared Team data for assignment guards and derived workload/conflict context. Owner/Manager/Staff roles are display foundations only; real authorization, payroll/HR and full workforce scheduling are not implemented.
10. **Business & Branch Settings (BF-10)** — **IMPLEMENTED — UI FROZEN / BE1 CONFIG + BE4 STAFF DURABLE**: Shared Business text profile/Branch configuration, active branches, service capabilities and operating-hour guards persist through BE1; Team/resource disclosures read the BE4 directory and there is no additional Branch route, staff editor or pricing catalogue.
11. **Daycare Operations (BF-11 / M-DAYCARE)** — **IMPLEMENTED — UI FROZEN / BE4 PostgreSQL**: Capability-gated attendance, zones, staff, care and pickup at `/business/daycare`, linked to the same Booking, Intake, Customer/Pet, Inbox, Billing and Service Record foundations.
12. **Customer CRM & Retention (BF-12)** — **IMPLEMENTED — UI FROZEN / BE8 READ-ONLY PostgreSQL**: Derived relationship summary, segments, timeline and staff-triggered next actions in existing Customers routes. Loyalty is a placeholder, not a rewards or automation system.
13. **BE1 Identity / Business / Branch backend** — **IMPLEMENTED LOCALLY**: PostgreSQL schema/migration, Person, Business, Branch, membership/access, durable configuration, typed application boundary, server tenant/Branch authorization and correlated audit. Supabase Auth is implemented; real staging configuration and production deployment remain external.
14. **BE2 Customer / Pet backend** — **IMPLEMENTED LOCALLY**: Business-wide Customer and Business-local Pet profile/contact relationship truth, notes/tags/lifecycle, server name/phone/Pet search, warning-only duplicates, stable-ID compatibility for local domains, tenant enforcement and privacy-bounded audit. Guardian/Passport/Consent are not included.
15. **BE3 Booking / Calendar / resources backend** — **IMPLEMENTED LOCALLY**: durable planning aggregates and minimal schedulable Resources use BE1 authorization and BE2 identities; Calendar/Home/Customer projections use BE3 truth, and PostgreSQL write-time guards protect capacity/exclusive conflicts. BE4 consumes these records for execution.
16. **BE4–BE8 backend completion** — **VALIDATED LOCALLY / PROVIDER-NEUTRAL WHERE REQUIRED**: Service Operations, Consent/Intake, Inbox/outbox, financial model and read-only Reports/CRM are implemented with PostgreSQL migrations through `202609180003_event_order.sql`. Populated end-to-end coverage and security/concurrency/idempotency tests are recorded in VALIDATION. Production provider credentials remain external dependencies.
17. **Guardian touchpoints required by Business workflows (P2)** — **FUTURE / PAUSED**: Introduce only when an approved Business workflow requires a Guardian-side action. Target channel is the LINE Mini App; scope and sequencing require a separate Consumer phase decision.
18. **Independent Guardian expansion (P3)** — **PAUSED**: No standalone Consumer expansion or LINE feature build starts automatically.

## Strict Boundary

BE1–BE8 supersede the former “Backend not started” wording for their documented local scopes. Advanced pricing, inventory, full document/certificate Service Records, Guardian delivery, media UI, full Incident Management, veterinary/medical work, live Supabase authentication/infrastructure configuration, payroll/HR, real payment processing/accounting, production LINE, Consumer work, campaigns, automation and AI remain outside this checkpoint. Consumer remains **PAUSED**; `/workfiledesign` remains untouched.
