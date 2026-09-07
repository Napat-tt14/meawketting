# Product

Status: **CANONICAL PRODUCT DIRECTION (BUSINESS-FIRST REBASE)**  
Owner: Product

## Product identity

Meawketting is a **Pet Business Operating Platform with Pet Passport & Guardian Network**.

- **Meawketting Business is the main product and primary commercial experience.** The business platform drives commercial value, revenue, and day-to-day operations for pet businesses across Grooming, Hotel/Boarding, Daycare, and future multi-service verticals.
- **Pet Passport & Guardian Network is the strategic trust advantage and privacy moat.** Pet owners (Guardians) control and maintain their pet's portable identity, medical context, and bounded consent, while businesses receive verified, purpose-bound data without taking ownership of the Pet Passport.
- **Guardian experience target is LINE-first.** The intended final consumer channel is a lightweight LINE Mini App reached through Meawketting LINE, with LINE as the entry/authentication channel and Pet Passport as the Guardian-facing trust layer.
- **Consumer feature development is PAUSED.** The existing standalone Consumer web prototype (Create/claim Passport, My Pets, Public Safety, Lost flow, Temporary Business Sharing) remains retained and regression-tested, but is frozen and is no longer the target final product channel.

## Guardian direction status

| Label | Current truth |
|---|---|
| **CURRENT** | Standalone Consumer web prototype remains in the repository and is retained/frozen. |
| **TARGET** | LINE-first Guardian experience through a LINE Mini App: LINE → Login → My Pets → Add Pet → Pet Profile / Pet Passport. |
| **PAUSED** | Consumer development and independent Guardian expansion. |
| **NOT IMPLEMENTED** | LINE Login, LINE Mini App, LINE notifications, and production Guardian identity linking. |

The LINE flow is a future product direction, not an implemented integration. A standalone Consumer website is retained for current prototype continuity but is not the primary future Guardian journey.

Core value:

1. **Business Operations Platform**: Connects multi-service bookings, smart calendar, capacity planning, scan-to-intake, and customer service delivery across Grooming, Hotel, Daycare, and future modules.
2. **Pet Passport & Guardian Network**: Pet's portable identity and care context, managed with 100% guardian consent authority.
3. **Scoped Sharing & Zero Over-sharing**: Gives businesses only the information permitted for a stated purpose, branch, and timeframe.
4. **Service Record Foundation**: Business-side evidence of completed service captured from Grooming, Hotel and Daycare execution and reused in Customer/Pet history. The standalone CareProof experience is **SUPERSEDED**; future Guardian visibility requires a separate consent/channel decision.

## Product contexts

| Context | Primary users | Product outcome |
|---|---|---|
| Public | Business prospects, pet owners, finders | Discover the business platform, log in to business portal, access owner portal or safety gateway |
| Business (Main) | Owner, Admin, Manager, Staff, Frontdesk | Run multi-service operations, manage calendar, schedule bookings, scan QR, intake pets, track capacity |
| Guardian (LINE-first target; current web prototype retained) | Primary Guardian, Co-guardian | Manage Passport, configure Public Safety, generate Temporary Business QR, review service history |
| Platform Admin | Trust, Support, Privacy, Verification, Ops | Reason-bound audits, branch verification, safety escalations |

One Person may hold several roles and Business memberships. Consumer and Business remain separate authorization and navigation contexts.

## Root homepage and portal separation

- **Root Homepage (`/`)**: Canonical Business-first commercial homepage. Its first viewport explains the operating value for bookings, schedules, customers and pets, services, team/branches, intake, communication, and revenue direction. The primary CTA is **เข้าสู่ระบบสำหรับธุรกิจ** → `/business/login`.
- **Guardian entry is currently secondary**: The retained web prototype is reachable through the lower-page ecosystem bridge to `/my-pets`; `/create-passport` remains a supporting owner action and never the Hero CTA. This standalone web entry is not the target primary Guardian journey.
- **Product honesty**: Business Home, Calendar, Customers & Pets, Inbox, Scan / Intake, Branch-aware shell, Billing / Payments / Revenue, Reports, the shared Service Record foundation, and the lightweight Team & Staff Operations foundation retain their frozen UI. BE1–BE3 now provide local server authorization and durable Business/Branch, Customer/Pet and Booking/planning Resource truth. There is no standalone CareProof module/menu/page or handover workflow. Service execution remains local; production authentication, granular operational permissions, real messaging/delivery, payment processing, full accounting, full workforce scheduling, payroll/HR, Guardian/Passport/Consent, Guardian LINE visibility, real photo storage, and production service-record delivery remain future work.
- **`/business` Route**: Compatibility redirect to root homepage (`/`).
- **Business App Frame**: Dedicated workspace frame with Warm White / Pastel Yellow operational visual system, branch switcher, and capability-aware navigation.
- **Consumer Navigation**: **CURRENT WEB PROTOTYPE / SUPERSEDED AS FINAL CONSUMER DIRECTION**. The preserved web prototype uses `/my-pets`, `/activity`, `/create-passport`, `/passports`, and `/qr-preview`; it remains isolated from internal Business operations. The final LINE Mini App navigation is intentionally undecided until the future Consumer phase.

## Hybrid Business model

The user-facing hierarchy is:

```text
Person
└─ Business
   ├─ Branch: Ari
   │  ├─ Grooming
   │  ├─ Hotel / Boarding
   │  └─ Daycare
   └─ Branch: Thonglor
      └─ Grooming
```

- A Business may enable multiple Service Modules simultaneously.
- A Branch enables the subset actually offered there and owns local hours, stations/rooms/zones, availability, capacity, and service execution. A local team member may be assigned to one or more Branches without becoming a duplicate person per Branch or service module.
- Business onboarding asks **“What services does this Business provide?”** with multi-select choices (Grooming, Hotel, Daycare, Training, Transport, Retail, Other).
- Do not use one fixed `Business Type` or separate Grooming/Hotel/Daycare accounts.
- Do not introduce **Workspace** as a user-facing level between Person, Business and Branch.

## Business product philosophy

Business capabilities have two operational layers:

1. **Business Core**:
   - Priority-first Business Home (`/business/home`)
   - Shared Calendar & Booking Engine (BF-2 live at `/business/calendar`)
   - Shared Business Intake & Scanner (`/business/scan`, `/business/intake/[intakeId]`)
   - Customers & Pets (BF-3 frozen UI backed by BE2 durable Business-scoped data), Inbox & Customer Communication (BF-4 live local prototype), Grooming Operations (BF-5 live local prototype), Hotel / Boarding Operations (BF-6 live local prototype for enabled Branches), Billing / Payments / Revenue (BF-7 live local prototype), Service Record & Reports foundation (BF-8), and Team & Staff Operations (BF-9 live local prototype at `/business/team`)
2. **Service Modules**:
   - Grooming (M-GROOM): Station queues, pet handling notes, styling preferences
   - Hotel / Boarding (M-HOTEL): Calendar keeps date-range Booking planning while `/business/hotel` executes Pet-specific Stays, continuous room/zone occupancy, guarded assignments/moves, arrivals/departures, pickup readiness, lightweight daily care and attention for Hotel-enabled Branches
   - Daycare (M-DAYCARE): Daytime playgroup attendance, hourly capacity, observation notes
   - Future modules: Training, Medical records, Transport

The layers share Customer, Pet, Booking, Service Job, Resource, Team Member, Conversation, Charge, Payment, Service Record, and Consent foundations. Modules must not create isolated customer, pet or staff record silos.

## Core loops

### Hybrid Business loop (Primary)

```text
Customer + Pet → Booking / Calendar
→ Shared Business Intake Engine (Scan QR)
→ Scope & Consent Verification
→ Visit/Order containing one or more Service Jobs
→ Module-specific operations (Grooming / Hotel / Daycare)
→ Charge (what is owed)
→ Payment (how and when it is paid)
→ Service Record (what the Business completed)
→ shared Customer/Pet history + future Guardian visibility
```

BF-7 implements the Charge → Payment portion and BF-8 provides shared Service Record domain data as browser-local foundations. Completing a Grooming Job or checking out a Hotel Stay creates or updates one source-keyed record; repeated completion is idempotent and the record is read from Customer/Pet history. A Charge can be unpaid, partially paid, paid, or cancelled independently of service completion, and history may show a short read-only payment reference. There is no standalone CareProof or post-completion handover workflow. Real processing, full accounting, tax, refund policy, provider selection, cross-Branch settlement, Guardian visibility, and photo storage remain future work.

### Guardian and trust loop (Current web prototype / Frozen)

```text
Create Passport → preview value → claim → manage Pet
→ grant purpose-bound Temporary Business QR
→ business scans and verifies consent
→ retain the current Passport/consent boundary; no Guardian-facing Service Record delivery is implemented in this web prototype
```

### Guardian loop (Target / Future / Paused)

```text
Add Meawketting LINE
→ open LINE Mini App
→ LINE Login
→ My Pets
→ + Add Pet
→ Cat / Dog
→ Pet Profile / Pet Passport
→ future Business-connected actions when required
```

This is conceptual only. Future capabilities may include Business-connected booking, store messages, add-service approval, Consent / Sharing, Temporary Business access, Guardian visibility for the shared Business Service Record/Service History, Safety / Lost, and Notifications. None of these LINE surfaces are implemented in this task.

## QR contracts

| QR | Recipient and duration | Scope | Business operational access? |
|---|---|---|---|
| **Quick Passport QR** | Short-lived, recipient-neutral | Passport-safe identity | No |
| **Public Safety QR** | Public/finder, persistent safety identity | Guardian-selected public-safe fields | No |
| **Temporary Business QR** | Named Business and Branch; time-bound/revocable | Purpose + selected data + consent | Yes, only after validation |

The three contracts never inherit each other's permissions.

## Privacy & data authority principles

1. The Guardian remains the sole authority for Pet Passport data; business access never creates Pet ownership.
2. Temporary Business access is bound to Business, Branch, purpose, scope, duration, consent, and revoke state.
3. Customer convenience never collapses pet-specific consent, allowed-data, or service boundaries.
4. Business-authored intake notes, belongings, and service logs preserve source and audience; they do not overwrite Guardian source data.
5. Internal business notes are not Guardian-visible unless explicitly made customer-facing under policy.
6. UI hiding is not authorization; production enforcement must be server-side.
7. **LINE identity is not Pet ownership authority.** LINE is an authentication/entry channel only; the production relationship remains `Person → Guardian relationship → Pet`, with identity linking and consent policy still a future architecture decision.

## Current implementation vs. planned scope

### Implemented prototype scope (Live)

**BE3 Booking/Calendar checkpoint (2026-09-07):** Appointment, one logical checkout-exclusive Hotel date range and day-based Booking planning are durable through the same BE1/BE2 membership-scoped D1 architecture. Bookings reference canonical Customer/Pet identities, preserve multi-Pet links and use a minimal Branch planning Resource catalogue. Server writes revalidate Branch/module/hours/availability, return typed conflicts, protect interval/capacity races, replay equivalent create retries and reject stale revisions. Calendar, Home and Customer upcoming Booking projections use this truth. Grooming Job, Hotel Stay, Daycare Attendance and every later execution domain remain local; BE4 is not started.

**BE2 Customer/Pet checkpoint (2026-09-07, retained boundary):** Business Customer, identity-only Pet anchor, Business-local Pet profile/contact relationship, notes/tags/lifecycle and name/phone/Pet search are durable through the BE1 membership-scoped D1 architecture. Duplicate handling warns and never merges automatically. Customer is not Guardian; the relationship is not ownership; seeded Passport/access presentation is non-authoritative compatibility only. Its original Booking exclusion is superseded by BE3; Guardian/Passport/Consent and later domains remain unimplemented.

**Current BF10–BF12 checkpoint (2026-09-04):** Business/Branch Settings, Daycare Operations and derived Customer CRM/retention are implemented locally. This is an implementation checkpoint, not a claim of final integrated validation or production readiness.

- **Business & Branch Settings (BF-10/BE1):** `/business/settings` edits durable Business profile/contact and Branch identity/contact, active state, enabled services and weekly operating hours through BE1. Logo bytes remain a local preview. Branch cards summarize the same active Team Members and link to Team in that Branch, while service disclosure reads existing duration and capacity resources. The same configuration drives branch selection, capability-aware navigation and BE3 new-booking availability. There is no separate Settings-only Business/Branch truth, staff editor, pricing engine or production permission administration.
- **Daycare Operations (BF-11):** `/business/daycare` is available to Daycare-enabled Branches. Pet-specific attendance references the shared day Booking, Customer/Pet, zone Resources and Team, with guarded intake/attendance/pickup states, care notes, explicit Inbox/Billing actions and Service Records after checkout/completion.
- **Customer CRM & Retention (BF-12):** existing Customers routes derive lifecycle/service segments, last visit, next Booking, unique completed visits, repeat-use/follow-up signals, outstanding balance, staff-triggered next actions and a Booking/service/payment/message timeline. CRM does not persist another customer record or predicted score. Loyalty is a clearly planned placeholder; points, memberships, benefits, campaigns, automation and AI are not implemented.

- **Homepage (`/`)**: Business-first, photo-led landing with a labeled demo product preview, multi-service story, Business Core status labels, connected Hotel + Grooming scenario, Guardian-controlled trust explanation, a photo-backed designed workflow, compact Guardian bridge, and compact footer.
- **Compatibility Redirect**: `/business` redirects to `/`.
- **Business Authentication**: `/business/login` with Google prototype provider.
- **Business App Shell & Navigation (BF-1)**: Branch switcher, aligned desktop/mobile controls, capability-aware navigation, and priority-first Business Home with an auto-rotating banner/desktop quick-action split (`/business/home`).
- **Shared Booking & Calendar Foundation (BF-2/BE3)**: Frozen Sunday-first multi-service calendar (`/business/calendar`) backed by durable BE3 range queries and commands, with remembered view, appointment/stay/day time models, leading/trailing resize, touch handlers, copy shortcuts, server-revalidated capacity/availability, typed conflict recovery, and date-normalized Booking editor.
- **Customers & Pets Foundation (BF-3, extended by BF-12/BE2)**: Durable Business-level Customer, Business-local Pet profiles and neutral many-to-many contact relationships, responsive list/detail hierarchy, backend Business-scoped name/phone/Pet search, warning-only duplicates, lightweight tags/notes and stable Booking context at `/business/customers` and `/business/customers/[customerId]`. Passport connection/access presentation remains a non-authoritative dev fixture; Guardian/Passport/Consent authority is not implemented.
- **Inbox & Customer Communication Foundation (BF-4)**: Business-wide Customer conversation reuse, readable desktop split/mobile task layouts, compact search/filters, Pet/Booking/Branch context, unread state, browser-local text, three default quick replies with remembered visibility, and one structured add-service request prototype at `/business/inbox`. Real delivery/read state, attachments, notifications, full Consumer Inbox, and Booking/Charge effects are not implemented.
- **Shared Intake & Scanner (Phase E)**: Camera scan, manual code entry, QR type validation, consent checks, belongings logging, check-in completion.
- **Grooming Operations Foundation (BF-5)**: Capability-aware `/business/grooming` execution board for distinct Pet-specific Grooming Service Jobs. It reuses Booking planning, Customer/Pet, Resource, Intake, Inbox and Home references; lifecycle, actual timing, assignments and Business notes remain separate from Booking, Charge and Payment. Completing a Job automatically creates or updates its one BF8 Service Record for Customer/Pet history.
- **Hotel / Boarding Operations Foundation (BF-6)**: Capability-gated `/business/hotel` projects each shared Hotel Booking into one Pet-specific Stay without copying Booking, Customer or Pet records. It provides Today arrivals/departures/current guests, continuous room/zone occupancy and capacity, guarded assignment/moves with history, Stay lifecycle, ready-for-pickup, authorized lightweight daily care, Business notes and lightweight incident attention. Check-in reuses the Shared Business Intake Engine through an explicit `hotelStayId`; Home, Calendar, Customer detail and Inbox consume the same shared state and identities. BF8 may create a summary only after checked-out/completed status.
- **Billing, Payments & Revenue Foundation (BF-7, extended by BF-11)**: `/business/billing` is a browser-local shared financial surface. It records line-item Charges and Payment allocations separately, derives unpaid/partial/paid status, attributes amounts to the originating Branch, supports explicit Grooming/Hotel/Daycare checkout review, and feeds the same local payment-derived revenue and Customer history views. Amounts are whole Thai Baht integers in this prototype; no real payment processing or accounting system is claimed.
- **Shared Service Record Foundation (BF-8, extended by BF-11)**: Domain data in the existing Business envelope, not a route or menu. A completed Grooming Job or checked-out/completed Hotel Stay or Daycare Attendance creates or updates one Pet-specific, Branch-attributed record with permitted service details, activities, staff/resources, local notes, completion time and optional photo metadata. Customer and Pet detail show one inline `ประวัติบริการ` timeline/list; a short BF7 payment reference is read-only. Lightweight corrections and source-recompletion history are append-only. The record is not a receipt, certificate engine, Pet Passport, medical record, Guardian channel, or real photo store. **Standalone CareProof experience = SUPERSEDED.**
- **Team & Staff Operations Foundation (BF-9, extended by BF-11)**: `/business/team` provides a Branch-aware local directory with one shared display member record, multi-Branch assignment, Grooming/Hotel care/Daycare/Front desk capability tags, active/inactive state, lightweight availability, and today’s workload. BE3 owns only the durable schedulable Resource projection and may link it to that display identity; Team/HR mutations remain local. Displayed roles are not authorization; separate BE1 memberships authorize BE1–BE3 server operations. Production authentication and granular operational permissions are **not implemented**.
- **Consumer web prototype (CURRENT / FROZEN)**: Anonymous create flow, 6 passport themes, My Pets, Public Safety, Lost flow, Temporary Business Sharing. Existing routes remain implemented and tested; no Consumer expansion is authorized.
- **LINE-first Guardian experience (TARGET / NOT IMPLEMENTED)**: LINE entry, LINE Login, LINE Mini App, LINE notifications, and production Guardian identity linking are not implemented.

### Planned future Business foundations

- **Advanced Daycare policy**: Temperament matching, medical/safety authority, automated playgroup assignment and production capacity policy remain future work beyond the local BF11 attendance/zone foundation.
- **Full checkout, payment and accounting policy**: Combined multi-service Visit checkout, real payment processing, invoice/refund/tax rules, accounting integrations, and cross-Branch settlement (Planned/Open; not implemented).
- **Guardian Service Record visibility / real service documents**: LINE Mini App visibility, real photo/object storage, certificates/print output, retention/hide/delete policy and production record delivery (Planned; not implemented).
- **Full Hotel policy/workforce systems**: Overbooking authority, room-sharing policy, waitlist, housekeeping workforce scheduling, cross-Branch transfer, medical management, full Incident Management and hardware integrations (Open or not implemented).
- **People operations beyond BF9**: Payroll, salary, commission, attendance machine, timesheets, leave approval, recruitment, performance review, HRIS and a full workforce scheduling/permission matrix are not implemented.
