# Product

Status: **CANONICAL PRODUCT DIRECTION (BUSINESS-FIRST REBASE)**  
Owner: Product

## Product identity

Meawketting is a **Pet Business Operating Platform with Pet Passport & Guardian Network**.

- **Meawketting Business is the main product and primary commercial experience.** The business platform drives commercial value, revenue, and day-to-day operations for pet businesses across Grooming, Hotel/Boarding, Daycare, and future multi-service verticals.
- **Pet Passport & Guardian Network is the strategic trust advantage and privacy moat.** Pet owners (Guardians) control and maintain their pet's portable identity, medical context, and bounded consent, while businesses receive verified, purpose-bound data without taking ownership of the Pet Passport.
- **Consumer feature development is PAUSED.** The existing consumer features (Create/claim Passport, My Pets, Public Safety, Lost flow, Temporary Business Sharing) remain active, tested, and preserved as a foundational trust layer, but independent consumer expansion is paused.

Core value:

1. **Business Operations Platform**: Connects multi-service bookings, smart calendar, capacity planning, scan-to-intake, and customer service delivery across Grooming, Hotel, Daycare, and future modules.
2. **Pet Passport & Guardian Network**: Pet's portable identity and care context, managed with 100% guardian consent authority.
3. **Scoped Sharing & Zero Over-sharing**: Gives businesses only the information permitted for a stated purpose, branch, and timeframe.
4. **CareProof Foundation**: Verifiable evidence and service records returned to the Guardian with high integrity.

## Product contexts

| Context | Primary users | Product outcome |
|---|---|---|
| Public | Business prospects, pet owners, finders | Discover the business platform, log in to business portal, access owner portal or safety gateway |
| Business (Main) | Owner, Admin, Manager, Staff, Frontdesk | Run multi-service operations, manage calendar, schedule bookings, scan QR, intake pets, track capacity |
| Consumer (Preserved) | Primary Guardian, Co-guardian | Manage Passport, configure Public Safety, generate Temporary Business QR, review service history |
| Platform Admin | Trust, Support, Privacy, Verification, Ops | Reason-bound audits, branch verification, safety escalations |

One Person may hold several roles and Business memberships. Consumer and Business remain separate authorization and navigation contexts.

## Root homepage and portal separation

- **Root Homepage (`/`)**: Canonical Business-first commercial homepage. Its first viewport explains the operating value for bookings, schedules, customers and pets, services, team/branches, intake, communication, and revenue direction. The primary CTA is **เข้าสู่ระบบสำหรับธุรกิจ** → `/business/login`.
- **Guardian entry is secondary**: Pet owners enter through the lower-page ecosystem bridge to `/my-pets`; `/create-passport` remains a supporting owner action and never the Hero CTA.
- **Product honesty**: Business Home, Calendar, Scan / Intake, and Branch-aware shell are named as local prototype capabilities. Customers & Pets, Messaging, Finance, Reports, wider team management, and CareProof are labeled as product direction rather than shipped production features.
- **`/business` Route**: Compatibility redirect to root homepage (`/`).
- **Business App Frame**: Dedicated workspace frame with Warm Golden Yellow operational visual system, branch switcher, and capability-aware navigation.
- **Consumer Navigation**: Preserved in `/my-pets`, `/activity`, `/create-passport`, `/passports`, and `/qr-preview`. Signed-in consumer navigation remains isolated from internal business operations.

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
- A Branch enables the subset actually offered there and owns local hours, team members, stations/rooms/zones, availability, capacity, and service execution.
- Business onboarding asks **“What services does this Business provide?”** with multi-select choices (Grooming, Hotel, Daycare, Training, Transport, Retail, Other).
- Do not use one fixed `Business Type` or separate Grooming/Hotel/Daycare accounts.
- Do not introduce **Workspace** as a user-facing level between Person, Business and Branch.

## Business product philosophy

Business capabilities have two operational layers:

1. **Business Core**:
   - Priority-first Business Home (`/business/home`)
   - Shared Calendar & Booking Engine (BF-2 live at `/business/calendar`)
   - Shared Business Intake & Scanner (`/business/scan`, `/business/intake/[intakeId]`)
   - Planned Core: Customers & Pets (BF-3), Inbox/Messaging (BF-4), CareProof & Checkout (BF-5)
2. **Service Modules**:
   - Grooming (M-GROOM): Station queues, pet handling notes, styling preferences
   - Hotel / Boarding (M-HOTEL): Nightly stays, room inventory, feeding & medication routines
   - Daycare (M-DAYCARE): Daytime playgroup attendance, hourly capacity, observation notes
   - Future modules: Training, Medical records, Transport

The layers share Customer, Pet, Booking, Service Job, Resource, Conversation, Charge, Payment, and Consent foundations. Modules must not create isolated customer or pet record silos.

## Core loops

### Hybrid Business loop (Primary)

```text
Customer + Pet → Booking / Calendar
→ Shared Business Intake Engine (Scan QR)
→ Scope & Consent Verification
→ Visit/Order containing one or more Service Jobs
→ Module-specific operations (Grooming / Hotel / Daycare)
→ Combined charges / payment where appropriate
→ Cross-service CareProof, checkout & history return
```

### Guardian and trust loop (Preserved)

```text
Create Passport → preview value → claim → manage Pet
→ grant purpose-bound Temporary Business QR
→ business scans and verifies consent
→ receive permitted CareProof and Service History
```

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

## Current implementation vs. planned scope

### Implemented prototype scope (Live)

- **Homepage (`/`)**: Business-first, photo-led landing with a labeled demo product preview, multi-service story, Business Core status labels, connected Hotel + Grooming scenario, Guardian-controlled trust explanation, a photo-backed designed workflow, compact Guardian bridge, and compact footer.
- **Compatibility Redirect**: `/business` redirects to `/`.
- **Business Authentication**: `/business/login` with Google prototype provider.
- **Business App Shell & Navigation (BF-1)**: Branch switcher, capability-aware desktop/mobile navigation, priority-first Business Home (`/business/home`).
- **Shared Booking & Calendar Foundation (BF-2)**: Multi-service calendar (`/business/calendar`), appointment/stay/day time models, capacity checks, conflict recovery, booking editor.
- **Shared Intake & Scanner (Phase E)**: Camera scan, manual code entry, QR type validation, consent checks, belongings logging, check-in completion.
- **Consumer Foundation (Preserved)**: Anonymous create flow, 6 passport themes, My Pets, Public Safety, Lost flow, Temporary Business Sharing.

### Planned next Business foundations

- **BF-3**: Customers & Pets CRM + Guardian Links (Planned, NOT started).
- **BF-4**: Business Inbox & Customer Communication (Planned).
- **BF-5**: Multi-Service Checkout, Billing & Payments (Planned).
- **Service Operation Boards**: Dedicated Grooming Queue, Hotel Room Board, Daycare Attendance (Planned).
