# Product and Domain Architecture

Status: **CANONICAL ARCHITECTURE DIRECTION (BUSINESS-FIRST REBASE) — NO DATABASE SCHEMA**  
Owner: Product Architecture

This document owns shared objects, authority and boundaries. Capability detail is in [MODULE_MAP](./MODULE_MAP.md); unresolved policy is in [DECISIONS](./DECISIONS.md).

## Product architecture hierarchy

```text
Person (Human identity)
├─ Guardian Context (Preserved consumer trust layer: Passport, Public Safety, Sharing)
└─ Business Context (Main commercial product)
   └─ Business Organization
      ├─ enabled Service Modules (Grooming, Hotel, Daycare, etc.)
      └─ Branch (Operational execution unit)
         ├─ enabled subset of Business modules
         ├─ team members and assigned roles
         ├─ operational hours & booking availability
         └─ physical/schedulable resources (stations, rooms, zones)
```

- One Person may belong to several Businesses and Branches with different roles.
- One Business may enable many Service Modules; there is no fixed Business Type enum.
- A Branch is operational, not cosmetic. It scopes services, staff, rooms/stations/zones, execution and local attribution.
- **Workspace is not a user-facing product concept.** Engineering may later introduce an internal tenant abstraction without changing this hierarchy.

## Shared object model

```text
Business ── has ──> Branch ── enables ──> Service Module
   │                    │
   └─ relates to ──> Customer ── manages ──> Pet
                              │
                         plans Booking (BF-2 Live)
                              │
                 creates/joins Visit or Order
                              │
                    contains Service Job(s)
                              │
                  uses Resource(s) at Branch

Conversation ── links to Customer/Pet/Booking/Visit/Service Job/Branch
Charge ── belongs to Visit or line item context ── settled by Payment(s)
Consent / Access Grant ── gates Business access to Guardian-controlled Pet data
CareProof / Service Record ── records permitted evidence across Service Jobs
```

`Visit/Order/Service Order` is a required parent concept with an **OPEN final name**. It prevents a multi-service customer journey from fragmenting into module silos.

## Object definitions

| Object | Canonical responsibility | Key boundary |
|---|---|---|
| **Person** | Human identity that can hold Guardian and Business memberships | One identity direction; contexts authorize separately |
| **Business** | Organization-level customer relationship, module enablement and policy context | Not one service category |
| **Branch** | Physical/operational location and execution scope | Owns local capability, people, resources, hours and attribution |
| **Customer** | Business relationship/person arranging services | One record can use many services and manage several Pets; contact authority remains open |
| **Pet** | Shared Pet identity across services | Never duplicated as Grooming/Hotel/Daycare Pet; Passport authority remains with Guardian |
| **Visit / Order** | Parent for related service work, operational timeline and combined checkout | Working term; may contain several Pets/jobs subject to open policy |
| **Booking** | Planned activity for one or more Pets and Service Jobs | Supports appointment, date-range and day models; Branch, estimate, status and required/assigned resources—not always a one-hour appointment |
| **Service Job** | Unit of work inside a Booking/Visit | Shared foundation with module extensions: Grooming Job, Hotel Stay, Daycare Visit, Training Session |
| **Resource** | Internal schedulable/capacity entity required for work | Use user-facing words such as ช่าง, จุดบริการ, ห้อง or โซน rather than exposing `Resource` blindly |
| **Conversation** | Contextual communication and workflow thread | Can link Customer, Pet, Booking, Visit, Service Job and Branch; not isolated generic chat |
| **Charge** | What is owed for service, add-on or retail line item | Separate from payment; several modules may combine under one Visit checkout |
| **Payment** | How and when money was paid or refunded | May settle one or more Charges; provider, refund and cross-Branch rules remain open |
| **Consent / Access Grant** | Guardian authorization for a named recipient, purpose, scope and duration | Business/Branch/context checked on every protected transition; revoke/expiry removes stale access |
| **CareProof / Service Record** | Actor/time/source/audience-aware evidence returned when policy permits | Shared record foundation, service-specific content; internal notes stay private by default |

## Portal and entry architecture

```text
Root Homepage (/) [Business Landing] ───> Business Login (/business/login)
          │                                     │
          │                                     ▼
          │                            Business Shell & Home (/business/home)
          │                                     │
          │                                     ├─ Shared Calendar & Bookings (/business/calendar)
          │                                     └─ Shared Scanner & Intake (/business/scan)
          │
          └─── Secondary link for Pet Owners ──> Consumer Portal (/my-pets, /create-passport)
```

- **Root Homepage (`/`)** is the primary Business Landing page.
- **`/business`** is a compatibility redirect to `/`.
- Separate portal composition does not mean separate Person accounts.
- Unauthorized deep links reveal neither protected Pet values nor sensitive entity existence.

## Shared Business Intake Engine

```text
Temporary Business QR
→ validate Business / Branch / purpose / scope / duration / consent
→ show allowed Pet data only
→ create Business-owned intake facts or correction suggestion
→ resolve required Guardian decision
→ review and receive/check in
→ create or attach the appropriate module Service Job
```

After receive, the next object may be a Grooming Job, Hotel Stay, Daycare Visit or another module job. Quick Passport QR and Public Safety QR can never enter this engine.

## Authority and data boundaries

| Data | Authority/source | Business rule |
|---|---|---|
| Pet identity and Guardian-managed profile | Guardian according to relationship permission | Read only within active consent; correction is a suggestion |
| Guardian private notes | Authorized Guardian | Never shared by default |
| Business intake and operational notes | Business author under role/Branch | Do not overwrite Pet source; audience is explicit |
| CareProof evidence | Service actor and source context | Actor/time/source/audience retained; visibility policy applied |
| Customer contact/authority | Customer relationship plus policy | Booking authority and Pet consent authority are not assumed identical |
| Public Safety fields | Guardian | Anonymous sees selected public-safe fields only |
| Charge/Payment data | Business operational record | Role, Branch and customer visibility rules apply |
| Platform Admin case/audit | Restricted platform role | Reason-bound and audited; no routine Business/Consumer access |

## Production intent, not implementation

Stable identities, persistent storage, server authorization, idempotency, versioned consent, secure QR tokens, audit, retention, exports, notifications, background jobs, payment providers, backup/recovery and observability remain future backend work.
