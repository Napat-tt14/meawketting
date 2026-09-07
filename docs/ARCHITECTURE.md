# Product and Domain Architecture

Status: **CANONICAL ARCHITECTURE DIRECTION (BUSINESS-FIRST / BF1–BF12 FROZEN / BE1 + BE2 + BE3 IMPLEMENTED LOCALLY)**
Owner: Product Architecture

This document owns shared objects, authority and boundaries. Capability detail is in [MODULE_MAP](./MODULE_MAP.md); unresolved policy is in [DECISIONS](./DECISIONS.md). [BACKEND_READINESS](./BACKEND_READINESS.md) owns the BE0 map and the implemented BE1–BE3 persistence/application boundary.

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
         ├─ shared local team members, Branch memberships and displayed roles
         ├─ operational hours & booking availability
         └─ physical/schedulable resources (stations, rooms, zones)
```

- One Person may belong to several Businesses through durable BE1 memberships. Owner sees every Branch in that Business; Manager/Staff see explicit durable Branch grants. BF9 Team Members remain separate browser-local operational data and do not grant authorization.
- One Business may enable many Service Modules; there is no fixed Business Type enum.
- A Branch is operational, not cosmetic. It scopes services, staff, rooms/stations/zones, execution and local attribution.
- **Workspace is not a user-facing product concept.** Engineering may later introduce an internal tenant abstraction without changing this hierarchy.
- **LINE identity is not a Guardian or Pet ownership object.** LINE is an entry/authentication channel only. The ownership and consent model remains `Person → Guardian relationship → Pet`; production identity linking is a future architecture decision.

## BE1 identity and tenant foundation

```text
authenticated actor adapter
  → Person [active]
  → BusinessMembership [active, OWNER | MANAGER | STAFF]
  → Business [active]
  → Branch scope
       OWNER: all Business Branches
       MANAGER / STAFF: explicit membership_branch_access [active]
  → authorized query/command target
```

- `Person` is the canonical human identity and has no BE1 Customer, Guardian or LINE link.
- Business and Branch configuration is normalized in D1 rather than copied from the browser-shaped prototype envelope. A Branch remains operational, privacy and financial-attribution scope even though BE1 currently persists configuration only.
- Every protected operation repeats Business and Branch scope checks in the application and repository boundary. The browser-selected IDs are selectors, not authority.
- OWNER may update Business/Branch configuration and access every Branch in its Business. MANAGER and STAFF are restricted to explicit Branch grants and have read-only BE1 configuration access. Later operational permissions remain undecided.
- A production authentication provider is not selected. The explicit development/test identity adapter is enabled only by server configuration and production mode fails closed.
- The typed contract is transported through `POST /api/be1`; persistence is behind a repository interface. Mutations write correlated audit metadata.

## BE2 Customer and Pet foundation

```text
Business
  ├─ Customer [Business-scoped]
  │    ├─ internal notes
  │    └─ lightweight tags
  └─ BusinessPetProfile ── profiles ──> Pet [opaque identity anchor]
            ▲
            └── CustomerPetRelationship ── Customer contact association only
```

- `Customer` is durable at Business scope and deliberately has no `branch_id`. Branch is context for Booking, service and Payment activity, not a reason to clone the contact.
- `Pet` is an opaque stable identity shared across Grooming, Hotel and Daycare references. BE2 keeps mutable name/species/source/notes/lifecycle in `BusinessPetProfile`; the global anchor contains no Passport or Guardian data.
- `CustomerPetRelationship` is many-to-many and lifecycle-aware. It expresses only a Business-local contact association, never legal ownership, Guardian authority, Consent or Passport access.
- Every `POST /api/be2` operation reuses BE1 actor → active membership → active Business authorization and then scopes the target in repository SQL. No Branch grant can widen access into a different Business.
- Customer/Pet search and duplicate candidates are Business-scoped. Duplicate warnings do not merge or delete records.
- The frozen Customer UI is fed through a typed client and memory compatibility cache. Remaining browser-local modules keep stable BE2 IDs; the old session Customer slice is not imported or dual-written.
- Passport/access badges for seeded Pets remain an explicit non-authoritative dev read model. BE2 does not implement Guardian, Passport ownership, Consent, QR or protected Passport fields.

## BE3 Booking, Calendar and planning Resource foundation

```text
authorized BE1 Business + Branch
  + durable BE2 Customer + Pet(s)
  → Booking [appointment | date-range | day]
       ├─ BookingPet link(s)
       └─ Branch planning Resource assignment/reservation(s)
  → Calendar/range projections
```

- `Booking` is the single durable planning aggregate. It carries Business and Branch attribution and references canonical BE2 Customer/Pet IDs; it does not copy Customer/Pet identity or become a Grooming Job, Hotel Stay or Daycare Attendance.
- One Booking retains the frozen prototype's multi-Pet contract. Hotel remains one checkout-exclusive date-range Booking, not one database row per day.
- BE3 persists only the Branch-local schedulable projection needed by planning: service eligibility, active state, capacity units and availability windows. It does not migrate the BF9 Team/HR directory or Hotel room/zone execution truth.
- Calendar range reads and create/edit/reschedule/resource/cancel commands pass through `POST /api/be3`. Browser conflict previews are advisory; the server repeats active Branch, module, hours, Resource, overlap and tenant validation on every write.
- D1 writes reserve Resource/capacity intervals and write a final commit guard in one transactional batch. Reservation triggers reject overlap/capacity races; optimistic revisions reject stale edits and Business-scoped idempotency keys make equivalent create retries replay the original result.
- Successful BE3 writes may refresh still-local BE4 execution projections by stable IDs. That best-effort compatibility step is not atomic with D1 and never becomes Booking authority.

## Shared object model

```text
Business ── has ──> Branch ── enables ──> Service Module
   │                    │
   ├─ relates to ──> Customer ── contact relationship ──> Pet
   └─ profiles ─────────────────────────────────────────> Pet
                              │
                         plans Booking (BF-2 Live)
                              │
                              ├─ Pet-specific Grooming Service Job(s) → BF-5 execution
                              ├─ Pet-specific Hotel Stay(s) → BF-6 execution
                              └─ Pet-specific Daycare Attendance(s) → BF-11 execution
                                             │
                                  shared Branch Resources / Team

Booking + module execution record(s) ── may later join ──> Visit or Order (future parent)

Booking / linked module execution ── may create or reconcile ──> Charge ── allocated by ──> Payment
              │                                                   │
              └─ completed execution creates/reuses ──> Service Record ──> shared Customer/Pet history

Conversation ── links to Customer/Pet/Booking/Visit/Service Job/Branch
Charge ── belongs to Visit or line item context ── settled by Payment(s)
Consent / Access Grant ── gates Business access to Guardian-controlled Pet data
Service Record ── records permitted evidence across module execution records
```

`Visit/Order/Service Order` is a required parent concept with an **OPEN final name**. It prevents a multi-service customer journey from fragmenting into module silos.

## Object definitions

| Object | Canonical responsibility | Key boundary |
|---|---|---|
| **Person** | Durable BE1 human identity that can hold Business memberships and later external identities/Guardian relationships | One identity direction; contexts authorize separately |
| **Business** | Durable BE1 organization/tenant profile and policy context | Not one service category; BE2 Customers/Pet profiles and BE3 Booking planning are scoped to the same tenant |
| **Branch** | Durable BE1 physical/operational location, active state, enabled modules and hours | Local capability and attribution scope; historical records are never deleted by deactivation |
| **Customer** | Durable BE2 Business relationship/contact arranging services | One Business-level record can use many services and have several Pet contact relationships; a Customer is not automatically a Guardian, owner, or Passport authority |
| **Pet** | Durable opaque BE2 identity anchor shared across services, with a Business-local operational profile | Never duplicated as Grooming/Hotel/Daycare Pet; a Customer relationship can exist without a Passport link, while Passport/Guardian authority is not implemented in BE2 |
| **Visit / Order** | Parent for related service work, operational timeline and combined checkout | Working term; may contain several Pets/jobs subject to open policy |
| **Booking** | Planned activity for one or more Pets and linked module execution records | Supports appointment, date-range and day models; Branch, estimate, planning status and required/assigned resources—not always a one-hour appointment. It is not an execution-status field. |
| **Service Job / execution record** | Shared direction for a unit of work executed for one Pet inside a Booking/Visit | BF-5 Grooming Service Job, BF-6 Hotel Stay and BF-11 Daycare Attendance are distinct Pet-specific execution records linked to shared Bookings. Their execution lifecycles are not Booking status. Training remains future scope. |
| **Resource** | Durable BE3 Branch-local schedulable/capacity projection required for planning | Use user-facing words such as ช่าง, จุดบริการ, ห้อง or โซน rather than exposing `Resource` blindly; it is not full Team/HR or execution inventory truth |
| **Team Member** | Shared local operational person record for Team & Staff Operations | One member can carry multiple Branch IDs, capabilities, lightweight availability and an active/inactive state. Existing Resources may link to that member; a staff record is not cloned by Grooming, Hotel or Branch. Displayed roles are not authorization. |
| **Conversation** | Contextual communication and workflow thread | Can link Customer, Pet, Booking, Visit, Service Job and Branch; future modules reuse shared context rather than creating isolated identity threads |
| **Charge** | What is owed for a service, add-on, manual adjustment or lightweight discount | **Not a Payment.** BF-7 stores a Branch-attributed local Charge with line-item snapshot, total and cancellation history; a Booking-level base amount is never copied once per Pet-specific Job/Stay/Attendance. |
| **Payment** | A record of how and when money was received | BF-7 records local Cash, bank-transfer or Other Payment allocations. `unpaid` / `partial` / `paid` is derived from allocations; cancelling an unpaid Charge is distinct from refunds. Provider, refund and cross-Branch rules remain open. |
| **Consent / Access Grant** | Guardian authorization for a named recipient, purpose, scope and duration | Business/Branch/context checked on every protected transition; revoke/expiry removes stale access |
| **Service Record** | Business evidence that a Pet-specific service execution completed | BF8/BF11 stores one Branch-attributed local record per completed Grooming Job or checked-out/completed Hotel Stay or Daycare Attendance, with permitted summary/details/activity/resource facts, optional photo metadata, and append-only correction/source-recompletion history. It is **not** a receipt, certificate, Pet Passport, ownership record, medical chart, or Guardian channel. The former standalone CareProof experience is **SUPERSEDED**. |

## Portal and entry architecture

BF10–BF12 adds `/business/settings` for shared Business/Branch configuration and `/business/daycare` for Daycare-enabled Branches. CRM is composed inside `/business/customers` and `/business/customers/[customerId]`; it creates no route or persisted domain store. `?section=branches` selects a Settings section, not a separate Branch route.

```text
Root Homepage (/) [Business Landing] ───> Business Login (/business/login)
          │                                     │
          │                                     ▼
          │                            Business Shell & Home (/business/home)
          │                                     │
           │                                     ├─ Shared Calendar & Bookings (/business/calendar)
           │                                     ├─ Grooming Operations (/business/grooming, capability-aware)
           │                                     ├─ Hotel Operations (/business/hotel, capability-aware)
           │                                     ├─ Daycare Operations (/business/daycare, capability-aware)
           │                                     ├─ Billing, Payments & Revenue (/business/billing)
           │                                     ├─ Team & Staff Operations (/business/team)
           │                                     ├─ Business/Branch Settings (/business/settings)
           │                                     ├─ Customer/Pet history and derived CRM (inline)
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

## BF-4–BF-7 local Conversation architecture

- The implemented prototype uses one ongoing Conversation per `Business + Customer` relationship. It stores IDs for Customer and optional Pet/Booking/Branch/Grooming Service Job context. Hotel launches reuse the Customer/Pet/Booking context rather than creating a Stay-specific thread. Display identity is resolved from the shared Business Customer/Booking source.
- `/business/inbox?conversation=<id>` is the local recovery contract. Customer/Pet/Booking launch parameters reuse or create the relationship and then normalize to this query; no dynamic Conversation route is required for the current split/mobile task model.
- Conversation is Business-wide so switching Branch does not duplicate it. A linked Booking retains Branch attribution, and the active Branch does not gain another Branch's Passport consent or protected data.
- Structured add-service approval is a message/request state. Business can send/cancel but cannot approve; only the explicitly labeled local Guardian-response simulator may approve/decline. A linked approved Grooming request idempotently updates the shared Grooming Service Job's add-on and estimated duration only. It has no Booking, Charge, Payment, settlement, delivery-proof, or production Guardian-identity effect.
- Hotel Business notes, care instructions and incident notes remain internal Stay fields. They are never copied into a Customer message automatically.
- BF-7 may offer an explicit staff action to send a local text about an amount due or a recorded payment through this same Conversation. It does not create another thread, mutate financial state from Inbox, or imply delivery, notification, LINE transport, or a real payment link.

## BF-6 local Hotel / Boarding architecture

- Shared Calendar owns date-range Hotel Booking planning. `/business/hotel` owns arrival/departure execution, occupancy and care; it does not create or edit another Booking model.
- One Hotel Booking projects one `PrototypeHotelStay` per Pet. A Stay references shared Booking, Business, Branch, Customer and Pet IDs and keeps its independent `จองไว้ → รับเข้า → พักอยู่ → พร้อมรับกลับ → เช็กเอาต์ → เสร็จสิ้น` lifecycle, plus guarded cancelled/no-show terminal states.
- Branch room/zone Resources are reused for operational capacity. Date-bounded room assignments preserve movement history; assignment, move, drag and date changes pass the same capacity/conflict evaluator before persistence, so an invalid commit leaves the original room/date state intact.
- Shared Intake receives an explicit `hotelStayId` from the Arrival action. It never guesses a Stay from free-text purpose or the first matching Pet. Intake completion records the handoff; Hotel performs the guarded room-required check-in transition.
- Daily Care is deliberately lightweight: food, water, activity, notes and completion state. A care task may point to a shared BF9 Hotel-care-capable Team Member, which is checked for active Branch membership and availability before assignment. Medication can exist only with explicit instructions and a matching `customer-confirmed-intake` authorization; no medication or health fact is inferred from Pet Passport access.
- Incident/note tracking is an internal lightweight attention list, not a medical record or full Incident Management system. Business notes remain distinct from Inbox messages.
- Navigation, Command Palette and direct-route content all check the active Branch's Hotel capability. Home, Customer Detail and Inbox resolve the same Stay/Customer/Booking state without duplicating identities or conversations.
- Ready-for-pickup, checked-out and completed remain operational states. An explicit checkout action may open BF-7 Billing with the linked Stay context, but no Hotel transition creates a Payment or makes a Charge paid. BF8 automatically creates/reuses one Service Record only after a Stay is checked out/completed with an actual checkout time; it does not copy medication, Guardian instruction, Intake, or incident facts.

## BF-7 local Billing, Payments & Revenue architecture

- `/business/billing` is a **browser-local** financial surface within the existing shared Business state envelope, not a separate ledger, database or payment gateway. It is available in the active Business/Branch context and retains Branch as financial attribution on both Charge and Payment records.
- A Charge references the shared Business, Branch, Customer, Booking and service context, with optional Pet/Grooming Job/Hotel Stay references where a single-Pet source is unambiguous. The Booking estimate becomes one booking-level base-service Charge rather than a duplicate base charge for each linked Pet-specific Job or Stay.
- Charge lines are immutable local financial snapshots: `base-service`, `add-on`, `manual-adjustment`, and `discount`. Manual adjustments and discounts require a stated reason. Approved Grooming add-ons remain Job-only Inbox effects; checkout reconciles those approved add-ons idempotently into Charge lines instead of letting Inbox create a Charge or Payment.
- A Payment is recorded separately with Cash, bank-transfer, or Other method, an amount, note and duplicate-safe local request key, then allocates to Charge(s). Charge status is derived from the sum of allocations and Charge cancellation state: `unpaid`, `partial`, `paid`, or `cancelled`; it is not inferred from a Booking, Grooming Job or Hotel Stay lifecycle.
- Money uses whole Thai Baht integers as a **prototype assumption**. This does not choose tax precision, receipt/invoice requirements, a payment provider, refund policy, discount authority, price authority, accounting treatment or cross-Branch settlement rules.
- Billing, Customer Detail and Business Home reuse the same Charge/Payment records and selectors. Customer/Pet identity remains Business-wide and shared; financial history names its Branch. Current-Branch revenue derives from recorded Payment allocations, not a separate Home fixture.
- BF-7 permits cancellation of an unpaid Charge with a required reason. It does not delete or automatically reverse a recorded Payment, process refunds, settle across Branches, or implement General Ledger, tax, payroll, inventory or accounting exports.

## BF-8 shared Service Record architecture

- Service Record is **domain data in the existing Business state envelope**, not a module, dashboard, menu item, standalone route, or post-completion workflow. The former standalone CareProof experience is **SUPERSEDED**.
- One immutable source key gives one record per Pet-specific execution: a completed Grooming Job with `actualCompletedAt`, a checked-out/completed Hotel Stay with `actualCheckOutAt`, or a checked-out/completed Daycare Attendance with `completedAt` / `checkedOutAt`. Completion creates or updates that record in the same local transaction; repeated actions are idempotent and never add a duplicate.
- A record references the shared Business, Branch, Customer, Pet, Booking, and exactly one Job, Stay or Attendance. It stores a service summary, permitted details/activity timeline, staff/resource labels, a local Business-note snapshot, optional before/after **metadata**, and append-only correction/source-recompletion history. It neither duplicates Customer/Pet identity nor becomes a new Booking, Charge, Payment, Inbox, Passport, or medical record.
- Grooming summaries may include the completed base service, approved Job add-ons, and assigned shared resources. Hotel summaries may include stay dates, room/zone movement summary, and ordinary completed daily-care summary. Hotel Service Record explicitly excludes Guardian care instructions, Intake details, medication instructions/authorization, and incident content.
- Photo support is metadata-only in BF8. There is no uploader, cloud/object storage, public share URL, copied Passport photo, or real photo-retention implementation.
- Customer and Pet detail render one shared `ประวัติบริการ` timeline/list with inline expandable details. They may show a short read-only reference to the existing BF7 Charge/Payment balance (`no-charge`, unpaid, partial, paid, or cancelled), but Billing remains the source of financial truth. Service completion and Payment remain separate states.
- Lightweight correction supports only Service Record summary or Business note. It appends prior value, next value, reason, staff, time and a duplicate-safe request key; source re-completion also appends a permitted source-revision snapshot. Audit timestamps are monotonic and neither path silently destroys prior record/history. Legacy handover fields in older browser records are retained for compatibility only; no current UI starts or advances that workflow.
- Guardian LINE visibility is **PLANNED**, not implemented; no Consumer route, LINE Mini App, LINE message, Guardian UI, or Guardian authorization/ownership claim is added.

## BF-9 Team & Staff Operations architecture

- `/business/team` reads and writes one shared browser-local Team Member foundation in the existing Business state envelope. It does not introduce a second Staff, Person or Resource store.
- A Team Member belongs to the active Business and may reference one or more Branch IDs. Branch switching filters the same member identity by membership; it never creates one person per Branch.
- The lightweight model contains only a name/avatar anchor, displayed `owner` / `manager` / `staff` role, service capabilities (`grooming`, `hotel-care`, `daycare`, `front-desk`), active/inactive state and simple working, unavailable, break or time-off intervals. It is not a certification, attendance, leave-approval, timesheet or full workforce scheduling system.
- BE3 schedulable Resources are the canonical planning assignment model for groomer/station/dryer and coarse Hotel/Daycare capacity. An opaque compatibility staff ID lets the frozen UI resolve a BF9 display person, but BF9 mutation does not authorize or silently mutate durable Resource state. Hotel care and room/zone execution remain local and do not create another Booking model.
- Team workload is a local derived view of today’s linked Booking/Grooming/Hotel/Daycare work. It identifies current/next work and local conflicts/overload signals; it is not productivity scoring or a staffing optimization engine.
- BF9 role labels establish an operational presentation vocabulary only. BE1 separately enforces membership/Branch scope for Business/Branch configuration; production authentication and a granular operational permission matrix are not implemented.

## BF10–BF12 shared-state extension

- **Reports history versus capacity:** Branch comparison rows and historical names include inactive Branch metadata so deactivation never hides operational or financial history. Hotel/Daycare capacity derives only from active Branch contexts and currently enabled modules; historical membership never adds inactive capacity to current utilization.
- **Business/Branch configuration:** BE1 makes D1 the durable source for Business text profile, Branch identity/contact/timezone/active state, enabled modules and weekly hours. Settings and the Branch switcher hydrate one typed in-memory compatibility cache; selectors fall back to fixtures only before hydration/dev-test recovery. Legacy browser `businessProfiles`/`branches` are ignored and dropped rather than dual-written or backfilled. Disabling a Branch preserves history and cannot remove the last active Branch; disabling a module stops new work without deleting historical records. Logo bytes remain a local preview because media/R2 is outside BE1.
- **Daycare execution:** `daycareAttendances` stores one Pet-specific record per shared Daycare Booking Pet. It references Business, Branch, Customer, Pet, Booking, optional Intake, zone Resource and responsible Team Member. The guarded lifecycle is `booked → checked-in → active → ready-for-pickup → checked-out → completed`, plus terminal cancellation; care events include meal, water, activity, rest and note. Zone capacity and staff capability/active/availability guards run before assignment or intake transition.
- **Shared handoffs:** Daycare supplies an explicit `daycareAttendanceId` to the existing Scanner/Intake and Billing entry points. Business/Branch/Customer/Pet identity must match; no protected Passport facts are inferred. Staff may explicitly open the same Business + Customer Inbox. Checkout/completion creates or reuses one source-keyed Daycare Service Record; a Booking-level Charge base is not duplicated for every Pet. Attendance completion never records a Payment.
- **Derived CRM:** `crmPresentation.ts` reads shared Bookings, Service Records, Charges/Payments and Conversations to derive lifecycle/service segments, unique completed visits, latest visit, next Booking, outstanding balance, relationship signals, next action and timeline. These are recalculated views, not persisted scores, another Customer database or a prediction engine. Business-level customer identity and Branch attribution remain intact.
- **Hydration and scope:** configuration selectors support deterministic fixture-only server snapshots, then hydrate the authorized BE1 session/configuration graph into memory. The active context key is only a display preference. Other BF domains still opt into their same-tab prototype state. Production auth, LINE transport, gateway, accounting, payroll, rewards, marketing automation and AI are not added. Existing BF9 architecture remains the browser-local Team foundation; Consumer stays frozen.

## BF-5 local Grooming Service Job architecture

- `/business/grooming` is an execution surface for an active Grooming-capable Branch; Calendar remains the shared Booking planning surface. The direct route checks the same active Branch capability as navigation, so a non-capable Branch is not shown a working Grooming board.
- `PrototypeServiceJob` lives in the existing browser-local Business envelope, separate from Booking records. It keeps references to `Booking`, `Business`, `Branch`, `Customer`, `Pet`, and assigned shared `Resource` IDs rather than copying Customer/Pet identity, Passport values, or a second booking fixture.
- Current local implementation is Grooming-only. It projects one Pet-specific Job from each Grooming Booking and retains a narrow lifecycle: `booked → checked-in → waiting → in-service → ready-for-pickup → completed`, with a permitted direct `checked-in → in-service` path and terminal `cancelled`. Booking's `pending/confirmed/arrived/cancelled` planning state remains independent.
- A Job carries scheduled start/end and estimate, actual service start/completion, assigned Groomer/Station/Dryer resource IDs, internal Business note, approved local add-ons, and lightweight activity history. It is explicitly not a Visit/Order, staffing roster, payroll object, inventory object, price/discount/refund authority, Charge, Payment, or Service Record itself. Completing the Job automatically creates or updates its one BF8 Service Record; an explicit BF-7 checkout may reference the Job, but completing the Job never records payment.
- Job resource changes use the existing Branch/service Resource list and overlap evaluator. A linked Team Member adds the BF9 active/capability/availability check, so an inactive or unavailable groomer cannot be silently assigned. This is still a local conflict guard only; full staff scheduling, capacity policy, holds and resolution authority remain open.
- A completed Grooming Job remains visible in shared Customer/Pet `ประวัติบริการ` and produces its one local BF8 Service Record. That record stays Business-side; no Guardian-visible service document, certificate, or real photo proof is created.

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

In the BF-5 local Grooming case, a valid known Customer/Pet relationship and matching active-Branch Grooming Job are attached at receive/check-in and the Job takes its guarded intake transition. In BF-6, an Arrival action supplies one explicit Hotel Stay target; Intake records that target only when Business, Branch, Customer and Pet all match, then Hotel performs the room-required Stay check-in. BF-11 supplies an explicit Daycare Attendance target; the same identity/consent boundary and a fresh zone-capacity check guard its check-in. A local Daycare attendance may also use its direct receive-in action without requesting Passport data; this grants no additional consent. The prototype does not infer work from arbitrary free text or create a duplicate Customer/Pet/Booking. Quick Passport QR and Public Safety QR can never enter this engine.

## Authority and data boundaries

| Data | Authority/source | Business rule |
|---|---|---|
| LINE identity / LINE Login | LINE as future entry/authentication channel | Does not automatically establish Person, Guardian relationship, Pet ownership, or consent; production linking is not implemented |
| Pet identity and Guardian-managed profile | Guardian according to relationship permission | Read only within active consent; correction is a suggestion |
| Guardian private notes | Authorized Guardian | Never shared by default |
| Business intake and operational notes | Business author under role/Branch | Do not overwrite Pet source; audience is explicit |
| Team member and displayed role | Browser-local BF9 operational data | One shared display member may span Branches and service capabilities. It is not the durable BE1 membership/access source or BE3 Resource authority. |
| Planning Resource / availability reservation | BE3 D1 records scoped through active membership and Branch access | Enforces schedulability, service eligibility, active state, availability and overlap/capacity at write time; it is not Team/HR or Hotel execution inventory. |
| Person / Business membership / Branch grant | BE1 D1 records resolved through the server identity/application boundary | Authorizes BE1 configuration, BE2 Customer/Pet and BE3 Booking/Resource capabilities; client IDs and BF9 role labels cannot grant access. |
| Customer / Business Pet profile / contact relationship | BE2 D1 records, always selected through an active Business membership | Business-internal contact/profile data only; does not grant Guardian, ownership, Passport, Consent or QR authority. |
| Service Record evidence | Business service actor and completed Job/Stay/Attendance source | BF8 retains permitted actor/time/source and append-only correction/source-recompletion history. It never copies Passport, Guardian instruction, medication authorization, incident content, or Guardian-owned photo data; LINE visibility is planned. |
| Customer contact/authority | Customer relationship plus policy | Booking authority and Pet consent authority are not assumed identical; "ผู้ติดต่อหลัก" is not an ownership claim |
| Public Safety fields | Guardian | Anonymous sees selected public-safe fields only |
| Charge/Payment data | Business operational record | BF-7 records Branch financial attribution and Customer visibility from shared identities; role, cross-Branch settlement, refund and provider rules remain open |
| Platform Admin case/audit | Restricted platform role | Reason-bound and audited; no routine Business/Consumer access |

## Production platform direction

```text
TARGET PLATFORM: Cloudflare
PRODUCTION: NOT DEPLOYED / NOT VERIFIED
```

Cloudflare replaces Vercel as the target production platform direction. BE1–BE3 use the local Worker/Vinext runtime and a D1 relational binding with reproducible migrations. No production D1 database, domain or deployment workflow has been provisioned; R2, KV, Queues and Durable Objects remain unused.

## Production intent, not implementation

BE1–BE3 provide local stable Person/tenant/Customer/Pet/Booking identities, scoped persistence, server authorization and correlated mutation audit for their narrow domains. Booking/Calendar planning and minimal scheduling Resources are durable; service execution remains separate and browser-local. Production authentication, Guardian/Passport/Consent, BE4 operations persistence, production infrastructure, backup/recovery/observability policy, secure QR tokens, retention, exports, notifications, background jobs, real payment processing/providers, payroll/HR and tax/refund/accounting policy remain future work. **BE4 is not started.**
