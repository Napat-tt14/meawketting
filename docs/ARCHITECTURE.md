# Product and Domain Architecture

Status: **CANONICAL ARCHITECTURE DIRECTION (BUSINESS-FIRST REBASE) — NO DATABASE SCHEMA**  
Owner: Product Architecture

This document owns shared objects, authority and boundaries. Capability detail is in [MODULE_MAP](./MODULE_MAP.md); unresolved policy is in [DECISIONS](./DECISIONS.md).

## Guardian channel status

| Label | Architecture truth |
|---|---|
| **CURRENT** | Standalone Consumer web prototype is retained/frozen in the repository. |
| **TARGET** | LINE-first Guardian experience through a LINE Mini App. |
| **PAUSED** | Consumer development and independent Guardian expansion. |
| **NOT IMPLEMENTED** | LINE Login, LINE Mini App, LINE notifications, and production Guardian identity linking. |

## Product architecture hierarchy

```text
Person (Human identity)
├─ Guardian Context (LINE-first target; current Consumer web prototype retained/frozen)
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
- **LINE identity is not a Guardian or Pet ownership object.** LINE is an entry/authentication channel only. The ownership and consent model remains `Person → Guardian relationship → Pet`; production identity linking is a future architecture decision.

## Shared object model

```text
Business ── has ──> Branch ── enables ──> Service Module
   │                    │
   └─ relates to ──> Customer ── manages ──> Pet
                              │
                         plans Booking (BF-2 Live)
                              │
              ┌───────────────┴────────────────┐
              │                                │
  links Pet-specific Grooming Service Job(s)   links Pet-specific Hotel Stay(s)
              │                                │
     Grooming execution (BF-5)          Hotel execution (BF-6)
              └───────────────┬────────────────┘
                              │
                  uses shared Resource(s) at Branch

Booking + module execution record(s) ── may later join ──> Visit or Order (future parent)

Conversation ── links to Customer/Pet/Booking/Visit/Service Job/Branch
Charge ── belongs to Visit or line item context ── settled by Payment(s)
Consent / Access Grant ── gates Business access to Guardian-controlled Pet data
CareProof / Service Record ── records permitted evidence across module execution records
```

`Visit/Order/Service Order` is a required parent concept with an **OPEN final name**. It prevents a multi-service customer journey from fragmenting into module silos.

## Object definitions

| Object | Canonical responsibility | Key boundary |
|---|---|---|
| **Person** | Human identity that can hold Guardian and Business memberships | One identity direction; contexts authorize separately |
| **Business** | Organization-level customer relationship, module enablement and policy context | Not one service category |
| **Branch** | Physical/operational location and execution scope | Owns local capability, people, resources, hours and attribution |
| **Customer** | Business relationship/person arranging services | One Business-level record can use many services and manage several local Pet relationships; a Customer is not automatically a Guardian, owner, or Passport authority |
| **Pet** | Shared Pet identity across services | Never duplicated as Grooming/Hotel/Daycare Pet; the Business-local relationship can exist without a Passport link, while Passport authority remains with Guardian |
| **Visit / Order** | Parent for related service work, operational timeline and combined checkout | Working term; may contain several Pets/jobs subject to open policy |
| **Booking** | Planned activity for one or more Pets and linked module execution records | Supports appointment, date-range and day models; Branch, estimate, planning status and required/assigned resources—not always a one-hour appointment. It is not an execution-status field. |
| **Service Job / execution record** | Shared direction for a unit of work executed for one Pet inside a Booking/Visit | BF-5 locally implements Grooming Service Job and BF-6 implements Hotel Stay as distinct module records. Future extensions may include Daycare Visit or Training Session; neither execution lifecycle is a Booking status. |
| **Resource** | Internal schedulable/capacity entity required for work | Use user-facing words such as ช่าง, จุดบริการ, ห้อง or โซน rather than exposing `Resource` blindly |
| **Conversation** | Contextual communication and workflow thread | Can link Customer, Pet, Booking, Visit, Service Job and Branch; future modules reuse shared context rather than creating isolated identity threads |
| **Charge** | What is owed for service, add-on or retail line item | Separate from payment; several modules may combine under one Visit checkout |
| **Payment** | How and when money was paid or refunded | May settle one or more Charges; provider, refund and cross-Branch rules remain open |
| **Consent / Access Grant** | Guardian authorization for a named recipient, purpose, scope and duration | Business/Branch/context checked on every protected transition; revoke/expiry removes stale access |
| **CareProof / Service Record** | Actor/time/source/audience-aware evidence returned when policy permits | Shared record foundation across module execution records, with service-specific content; internal notes stay private by default |

## Portal and entry architecture

```text
Root Homepage (/) [Business Landing] ───> Business Login (/business/login)
          │                                     │
          │                                     ▼
          │                            Business Shell & Home (/business/home)
          │                                     │
          │                                     ├─ Shared Calendar & Bookings (/business/calendar)
          │                                     ├─ Grooming Operations (/business/grooming, capability-aware)
          │                                     ├─ Hotel Operations (/business/hotel, capability-aware)
          │                                     └─ Shared Scanner & Intake (/business/scan)
          │
          └─── Secondary link for Pet Owners ──> Consumer Portal (/my-pets, /create-passport)
```

- **Root Homepage (`/`)** is the primary Business Landing page.
- **`/business`** is a compatibility redirect to `/`.
- Separate portal composition does not mean separate Person accounts.
- The current Consumer portal links are retained for the web prototype only; they are not the target final Guardian entry channel.
- Unauthorized deep links reveal neither protected Pet values nor sensitive entity existence.

## Guardian channel architecture (Target / Future / Paused)

```text
Add Meawketting LINE
→ LINE Login
→ open LINE Mini App
→ My Pets
→ + Add Pet
→ Cat / Dog
→ Pet Profile / Pet Passport
```

This flow is conceptual and has no repository route contract yet. Do not invent LINE Mini App routes, imply that LINE integration exists, or treat LINE identity as proof of Pet ownership or consent. Future production linking must establish the Person ↔ Guardian relationship and consent authority separately.

## BF-4–BF-6 local Conversation architecture

- The implemented prototype uses one ongoing Conversation per `Business + Customer` relationship. It stores IDs for Customer and optional Pet/Booking/Branch/Grooming Service Job context. Hotel launches reuse the Customer/Pet/Booking context rather than creating a Stay-specific thread. Display identity is resolved from the shared Business Customer/Booking source.
- `/business/inbox?conversation=<id>` is the local recovery contract. Customer/Pet/Booking launch parameters reuse or create the relationship and then normalize to this query; no dynamic Conversation route is required for the current split/mobile task model.
- Conversation is Business-wide so switching Branch does not duplicate it. A linked Booking retains Branch attribution, and the active Branch does not gain another Branch's Passport consent or protected data.
- Structured add-service approval is a message/request state. Business can send/cancel but cannot approve; only the explicitly labeled local Guardian-response simulator may approve/decline. A linked approved Grooming request idempotently updates the shared Grooming Service Job's add-on and estimated duration only. It has no Booking, Charge, Payment, settlement, delivery-proof, or production Guardian-identity effect.
- Hotel Business notes, care instructions and incident notes remain internal Stay fields. They are never copied into a Customer message automatically.

## BF-6 local Hotel / Boarding architecture

- Shared Calendar owns date-range Hotel Booking planning. `/business/hotel` owns arrival/departure execution, occupancy and care; it does not create or edit another Booking model.
- One Hotel Booking projects one `PrototypeHotelStay` per Pet. A Stay references shared Booking, Business, Branch, Customer and Pet IDs and keeps its independent `จองไว้ → รับเข้า → พักอยู่ → พร้อมรับกลับ → เช็กเอาต์ → เสร็จสิ้น` lifecycle, plus guarded cancelled/no-show terminal states.
- Branch room/zone Resources are reused for operational capacity. Date-bounded room assignments preserve movement history; assignment, move, drag and date changes pass the same capacity/conflict evaluator before persistence, so an invalid commit leaves the original room/date state intact.
- Shared Intake receives an explicit `hotelStayId` from the Arrival action. It never guesses a Stay from free-text purpose or the first matching Pet. Intake completion records the handoff; Hotel performs the guarded room-required check-in transition.
- Daily Care is deliberately lightweight: food, water, activity, notes and completion state. Medication can exist only with explicit instructions and a matching `customer-confirmed-intake` authorization; no medication or health fact is inferred from Pet Passport access.
- Incident/note tracking is an internal lightweight attention list, not a medical record or full Incident Management system. Business notes remain distinct from Inbox messages.
- Navigation, Command Palette and direct-route content all check the active Branch's Hotel capability. Home, Customer Detail and Inbox resolve the same Stay/Customer/Booking state without duplicating identities or conversations.

## BF-5 local Grooming Service Job architecture

- `/business/grooming` is an execution surface for an active Grooming-capable Branch; Calendar remains the shared Booking planning surface. The direct route checks the same active Branch capability as navigation, so a non-capable Branch is not shown a working Grooming board.
- `PrototypeServiceJob` lives in the existing browser-local Business envelope, separate from Booking records. It keeps references to `Booking`, `Business`, `Branch`, `Customer`, `Pet`, and assigned shared `Resource` IDs rather than copying Customer/Pet identity, Passport values, or a second booking fixture.
- Current local implementation is Grooming-only. It projects one Pet-specific Job from each Grooming Booking and retains a narrow lifecycle: `booked → checked-in → waiting → in-service → ready-for-pickup → completed`, with a permitted direct `checked-in → in-service` path and terminal `cancelled`. Booking's `pending/confirmed/arrived/cancelled` planning state remains independent.
- A Job carries scheduled start/end and estimate, actual service start/completion, assigned Groomer/Station/Dryer resource IDs, internal Business note, approved local add-ons, and lightweight activity history. It is explicitly not a Visit/Order, staffing roster, payroll object, inventory object, price/discount/refund authority, Charge, Payment, or CareProof record.
- Job resource changes use the existing Branch/service Resource list and overlap evaluator. This is a local conflict guard only; staff scheduling, capacity policy, holds, and resolution authority remain open.
- A completed Grooming Job is projected as lightweight recent service history for the shared Customer/Pet relationship. No full CareProof, photo proof, certificate, or Guardian-visible service document is created.

## Shared Business Intake Engine

```text
Temporary Business QR
→ validate Business / Branch / purpose / scope / duration / consent
→ show allowed Pet data only
→ create Business-owned intake facts or correction suggestion
→ resolve required Guardian decision
→ review and receive/check in
→ create or attach the appropriate module execution record
```

In the BF-5 local Grooming case, a valid known Customer/Pet relationship and matching active-Branch Grooming Job are attached at receive/check-in and the Job takes its guarded intake transition. In BF-6, an Arrival action supplies one explicit Hotel Stay target; Intake records that target only when Business, Branch, Customer and Pet all match, then Hotel performs the room-required Stay check-in. The prototype does not infer work from arbitrary free text or create a duplicate Customer/Pet/Booking. Quick Passport QR and Public Safety QR can never enter this engine.

## Authority and data boundaries

| Data | Authority/source | Business rule |
|---|---|---|
| LINE identity / LINE Login | LINE as future entry/authentication channel | Does not automatically establish Person, Guardian relationship, Pet ownership, or consent; production linking is not implemented |
| Pet identity and Guardian-managed profile | Guardian according to relationship permission | Read only within active consent; correction is a suggestion |
| Guardian private notes | Authorized Guardian | Never shared by default |
| Business intake and operational notes | Business author under role/Branch | Do not overwrite Pet source; audience is explicit |
| CareProof evidence | Service actor and source context | Actor/time/source/audience retained; visibility policy applied |
| Customer contact/authority | Customer relationship plus policy | Booking authority and Pet consent authority are not assumed identical; "ผู้ติดต่อหลัก" is not an ownership claim |
| Public Safety fields | Guardian | Anonymous sees selected public-safe fields only |
| Charge/Payment data | Business operational record | Role, Branch and customer visibility rules apply |
| Platform Admin case/audit | Restricted platform role | Reason-bound and audited; no routine Business/Consumer access |

## Production platform direction

```text
TARGET PLATFORM: Cloudflare
PRODUCTION: NOT DEPLOYED / NOT VERIFIED
```

Cloudflare replaces Vercel as the target production platform direction. The repository currently contains Cloudflare-compatible local build tooling, but no production architecture decision has been made for Cloudflare Pages, Workers, Durable Objects, D1, R2, KV, runtime bindings, storage, domains, or deployment workflow. Those remain Backend / Production phase work.

## Production intent, not implementation

Stable identities, persistent storage, server authorization, idempotency, versioned consent, secure QR tokens, audit, retention, exports, notifications, background jobs, payment providers, backup/recovery and observability remain future backend work.
