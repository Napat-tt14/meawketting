# Backend Readiness — BE0 baseline / BE1 + BE2 + BE3 implementation

Status: **BE1 IDENTITY / BUSINESS / BRANCH + BE2 CUSTOMER / PET + BE3 BOOKING / CALENDAR / RESOURCES IMPLEMENTED LOCALLY**  
Date: 2026-09-07  
Owner: Product Architecture / Engineering

This is the canonical backend-readiness document for the frozen Business frontend (BF1–BF12). BE0 established the boundary; BE1 implements identity/tenant scope, BE2 implements Business-scoped Customer/Pet persistence and BE3 implements Booking/Calendar planning plus the minimal Resource availability foundation locally. Guardian/Passport authority, service execution and every later backend domain remain outside the database and application implementation.

Read [ARCHITECTURE](./ARCHITECTURE.md) for product-domain authority, [DECISIONS](./DECISIONS.md) for unresolved policy, and [CURRENT_IMPLEMENTATION](./CURRENT_IMPLEMENTATION.md) for repository facts. Where they conflict, the latest Product Owner direction and DECISIONS prevail.

## BE1 implemented foundation

```text
Person
  → active BusinessMembership (OWNER | MANAGER | STAFF)
  → active Business
  → Owner: all Branches / Business + Branch configuration
    Manager or Staff: explicit active membership_branch_access only
  → target Branch is re-scoped in every protected query/command
```

- **Persistence:** D1-compatible normalized schema in `db/schema.ts`, generated migrations in `drizzle/`, and explicit dev/test seed data. The BE1 schema contains only persons, businesses, branches, Business memberships, lifecycle-aware Branch access, Branch modules, Branch hours and audit events.
- **Boundary:** frozen UI → typed client → `POST /api/be1` → application service → repository → D1. Database bindings are server-only. Requests cannot grant scope by supplying a Business or Branch ID.
- **Authorization:** every protected operation resolves an authenticated Person, active membership and active Business, then checks role/action and Branch access. Inaccessible cross-tenant/cross-Branch targets return safe generic failures.
- **Configuration:** Business text profile, Branch identity/contact/timezone/status, enabled Grooming/Hotel/Daycare modules and all seven operating days are durable. Deactivation keeps history and atomically guards the final active Branch.
- **Traceability:** important mutations persist actor, membership, Business/Branch scope, request ID, correlation ID, target and bounded before/after metadata.
- **Frontend compatibility:** the active Business/Branch selection remains a session display preference, while the authorized workspace/configuration graph is hydrated from the server into one memory cache. Legacy browser Business/Branch values are neither trusted nor backfilled. Other BF domains remain browser-local fixtures.
- **Auth boundary:** `dev-test` mode may use the explicit development identity header. Production mode fails closed because a production authentication provider is **NOT IMPLEMENTED**.
- **Cloudflare:** the local Worker build declares logical D1 binding `DB`; migrations and seed are reproducible against local D1. No production resource or deployment exists. No R2, KV, Queue or Durable Object was added.

### BE1 application capabilities

| Area | Typed operations |
|---|---|
| Session / membership | resolve current Person/membership/workspaces; resolve current membership; list permitted Branches |
| Business | get current Business; update profile |
| Branch | list accessible Branches; get/create/update; activate/deactivate; update operating hours; update enabled modules |

Manager and Staff Branch access is intentionally only a scope foundation. BE1 does not lock a large granular permission matrix or implement operational-domain commands.

## BE2 implemented Customer / Pet foundation

```text
authenticated actor
  → active BE1 BusinessMembership
  → active Business
  → Business-scoped Customer / Pet target
       Customer ── contact relationship ── Pet
  → no Branch identity split and no Guardian/Passport authority inference
```

- **Persistence:** generated migration `0002` adds `customers`, global identity-only `pets`, `business_pet_profiles`, `customer_tags` and `customer_pet_relationships`. Customer profiles and relationship rows are Business-scoped; composite foreign keys reject a cross-Business relationship even if IDs are spoofed.
- **Customer:** stable opaque ID, display name, normalized search key, optional phone/email, Business-owned notes, ordered lightweight tags, lifecycle and created/updated actor metadata. It is one Business-wide identity across Branches and service modules.
- **Pet:** the global table is only an opaque identity anchor. Name, Cat/Dog species, declared source, internal notes and lifecycle are Business-local profile data. Breed/sex/birth/photo fields are not invented because the frozen UI does not currently collect authoritative values; R2/media is not started.
- **Relationship:** a lifecycle-aware many-to-many contact association. It carries no owner, Guardian, Passport, Consent, QR or Access Grant meaning.
- **Queries:** typed list/search/get capabilities are server-scoped by Business. Search covers Customer name, normalized phone digits and active linked Pet name with bounded limit/offset. Indexes follow directory, exact duplicate and relationship traversal queries.
- **Duplicate UX:** exact normalized phone or Pet name/species produces a warning and no write unless staff explicitly continues. Existing active or inactive records are candidates. There is no merge or destructive deduplication.
- **Authorization:** all BE2 commands and queries reuse BE1 actor → active membership → active Business resolution, then fetch targets with Business predicates. Active OWNER/MANAGER/STAFF reuse the current operational foundation; Branch grants cannot widen Business scope or fragment a Business-wide identity.
- **Frontend compatibility:** `/business/customers`, detail, add/edit Customer, add Pet, notes/tags and search use `POST /api/be2` after hydration. One memory cache supplies the frozen synchronous selectors and other browser-local domains keep only stable Customer/Pet references. The former session Customer slice is ignored, emptied on writes and never backfilled or dual-written.
- **Passport boundary:** seeded Passport/access presentation is isolated in an explicit **DEV PROTOTYPE / NON-AUTHORITATIVE READ MODEL ONLY**. It is not returned by BE2 or persisted in D1. Guardian, Passport ownership, Consent, QR and protected fields remain not implemented.
- **Audit:** Customer/Pet/relationship mutations batch actor, membership, Business, target, request/correlation ID, time and bounded state shapes with the data change. Contact values, names, notes and tag labels are deliberately omitted from audit JSON.
- **Fixtures:** `seed-be2-dev.sql` deterministically preserves the frozen Customer/Pet IDs for dev/test only. Browser/session state is not an import source.

### BE2 application capabilities

| Area | Typed operations |
|---|---|
| Customer | list/search/get/create/update; activate/deactivate; update internal notes; replace lightweight tags |
| Pet | get/create/update; activate/deactivate |
| Customer ↔ Pet | link/unlink the neutral Business contact relationship |

BE2 originally stopped here; BE3 now supersedes only its Booking-persistence exclusion. Guardian, Passport/Consent, operations, LINE, Payment, media and deployment remain outside BE2.

## BE3 implemented Booking / Calendar / Resource foundation

```text
authenticated actor
  → active BE1 BusinessMembership
  → active Business
  → permitted active/inactive historical Branch scope
  → durable Booking references BE2 Customer + one-or-more Pets
  → selected planning Resources produce write-time reservations
  → transactional D1 commit or typed deterministic conflict
```

- **Persistence:** generated migration `0003` adds `booking_services`, service Resource requirements, `booking_resources`, Resource/service links, Resource availability windows, `bookings`, `booking_pets`, Resource assignments, write-time reservations and aggregate commit markers. Composite scope foreign keys reject foreign Customer/Pet/Resource links; Booking rows do not copy Customer/Pet identity.
- **Time models:** Grooming appointment uses Branch-local start/end date-time; Hotel uses one logical date range with exclusive check-out; Daycare uses one service date with `end = null` and an internal one-day interval. The existing one-to-many Pet contract is retained through normalized links, not forced into one Pet per Booking.
- **Queries/commands:** typed catalogue, list/range/customer/module/status/Resource, get, availability, create, full edit, reschedule, change Resources and cancel operations are exposed through `POST /api/be3`. List uses bounded limit/offset and returns one aggregate per Booking, including a continuous Hotel record rather than one row per day.
- **Availability:** server application checks active Branch/module/service/Customer/Pets/contact relationships, interval shape, Branch hours, required/eligible Resources, compatibility availability, duplicate fingerprint, exclusive overlap and per-day capacity. Client preview improves UX only; every write rebuilds and revalidates the candidate.
- **Atomic conflict protection:** the complete aggregate, reservation rows, commit marker and audit run in one D1 `batch()`. SQLite/D1 serializes writers; reservation triggers abort the losing exclusive overlap or capacity write after it observes the winner. Commit triggers repeat critical Branch/module/service/identity/relationship/Resource/hours/availability/reservation-integrity checks. Expected revision compare-and-swap plus a per-request write token prevents stale update sub-statements from partially replacing an aggregate. A rejected batch returns typed `TIME_CONFLICT`, `CAPACITY_CONFLICT`, availability/configuration conflict or `VERSION_CONFLICT`; no client availability result is trusted.
- **Idempotency:** create requires a key unique within Business and a SHA-256 normalized-request hash. Same key/same request replays the stored Booking; same key/different request returns `IDEMPOTENCY_KEY_REUSED`, including racing retries. Edit/reschedule/Resource mutations intentionally use expected revision rather than a durable idempotency key; cancel of an already-cancelled Booking is replay-safe.
- **Resource/Team boundary:** BE3 Resource is only the Branch-local schedulable/capacity projection required for planning. An optional `compatibilityStaffId` and copied planning availability windows bridge the frozen BF9 fixture; they do not create Person, Membership, Team/HR or payroll truth. Hotel `planning-capacity` is not a durable room/zone execution assignment. Full Team and Hotel execution migrate later.
- **Frontend compatibility:** the Business shell hydrates a paginated Business Booking directory and each permitted Branch catalogue into memory. Frozen Calendar/Home/Customer selectors switch to BE3 records after hydration; the legacy browser Booking slice is ignored, written empty and never imported or dual-written. Authoritative Booking success may trigger a best-effort local execution projection so BE4 fixtures retain stable references, but that cross-store projection is not atomic and never becomes Booking truth.
- **Authorization/audit:** every operation resolves Person → active membership → active Business → Branch access → scoped target. Wrong Business/Branch, inaccessible grant, foreign Customer/Pet/Resource and spoofed IDs are denied server-side. Booking create/update/reschedule/Resource change/cancel audit actor, membership, Business/Branch, target, request/correlation ID, time and bounded structural before/after metadata without duplicating contact values or notes.
- **Time limitation:** validated local strings are converted to comparable civil-minute integers with `Date.UTC`-style arithmetic; they are not UTC instants. The stored Branch IANA timezone is not yet applied and DST/offset transitions are not modeled. Hours enforcement uses the start weekday and applies open/close times to appointments; complete per-day Hotel/Daycare opening policy remains open.

### BE3 application capabilities

| Area | Typed operations |
|---|---|
| Catalogue / availability | get Branch planning services/resources; check candidate availability |
| Booking query | list by permitted Branches with range/Customer/module/status/Resource filters and pagination; get scoped Booking |
| Booking mutation | create, edit, reschedule, assign/change Resources, cancel; return authoritative result or typed conflict |

BE3 stops before BE4 service execution. Grooming Job, Hotel Stay, Daycare Attendance, full Team/HR, Intake/Consent, Inbox/LINE, Charge/Payment, Service Record/Reports, media and deployment remain unimplemented backends.

## BE0 historical readiness baseline

## 1. Current frontend architecture

The application is React/Vinext with file-based routes. Before BE1–BE3, Business pages imported domain functions directly from `app/_prototype/businessState.ts`; that file remains the in-browser aggregate for excluded execution/operational domains. BE1 removes Business profile/Branch configuration truth, BE2 removes Customer/Pet truth and BE3 removes Booking planning truth from that envelope, routing each through typed backend clients.

Explicit fixtures remain deterministic development/test defaults. BE2 Customer/Pet and BE3 Booking reads switch to authorized memory caches after hydration and never merge their legacy session slices. `app/_prototype/inboxState.ts` has a separate session store for Conversations/messages. `app/_prototype/sharingState.ts` has a separate session store for Guardian temporary-access drafts and grants. Calendar view and quick-reply visibility are preference cookies. Consumer prototype stores are separate and frozen.

The remaining browser-local arrangement is a UI/domain discovery tool, not security. BE1–BE3 add durable storage, server clock, tenant authorization and audit for their scopes only; BE3 makes Booking planning authoritative but does not make execution, Team/HR, Intake, messaging, finance or other local domains production-ready.

The Vinext Worker now exposes a typed D1 `DB` binding to the server API, and `.openai/hosting.json` declares that logical binding so the build packages generated migrations. `r2` remains `null`. Production resources and deployment are absent.

### Current sources of truth

| Area | Current source | Production replacement boundary |
|---|---|---|
| Business profile / Branch configuration | BE1 typed application/API boundary + D1; memory cache after hydration | Implemented for BE1; production auth/deployment remain pending |
| Customer / Business-local Pet profile / contact relationship / notes / tags | BE2 typed application/API boundary + D1; memory compatibility cache after hydration | Implemented for BE2; stable Business-wide identity, no Guardian/ownership authority |
| Booking / Calendar planning / planning Resources | BE3 typed application/API boundary + D1; Business directory and Branch catalogue memory cache after hydration | Implemented for BE3; browser preview is advisory and session Booking rows are ignored |
| Service execution and other Business operations | `businessState.ts` fixtures + same-tab `sessionStorage` overrides | Future staged application commands/queries backed by authoritative persistence |
| Inbox | `inboxState.ts` fixtures + separate same-tab store | Conversation/message service behind the same application boundary |
| Temporary consent/QR | `sharingState.ts` fixtures + separate same-tab store | Server-authoritative grant/token/audit service |
| Passport/access display on Business Pet cards | Explicit non-authoritative dev compatibility fixture only | Future Guardian/Pet authority and consent records; BE2 stores no Passport snapshot |
| Reporting/CRM/Home | Pure client selectors over operational state | Read models/queries derived from authoritative source records |
| Branch context and UI preferences | Authorized BE1 Branch list plus browser-local selected-context/cookies | Server list is authority; harmless selection preferences remain client-side |

## 2. Domain inventory and authority

| Domain | Current identity and relationships | Scope / authority | Mutable or derived | Production persistence and dependency |
|---|---|---|---|---|
| Person | Durable BE1 Person; UI Team Member remains a separate local operational identity | Global human identity; not inferred from Customer or LINE | Persistent in BE1 | `persons`; later external identities/Guardian relationships require explicit records |
| Business | Durable BE1 `businessId`, profile and enabled-module configuration | Organization/tenant boundary | Persistent in BE1 | `businesses`; memberships, Branches and Customers depend on it |
| Branch | Durable BE1 `branchId`, Business, hours, active state and modules | Operational, privacy and financial attribution scope | Persistent in BE1 | `branches`; commands authorize both Business and Branch where Branch scope applies |
| Business membership | Durable BE1 Person→Business membership and explicit Branch grants; BF9 Team role remains display-only | Person-to-Business access, then Branch access for Branch-scoped capabilities | Persistent in BE1 | `business_memberships` + `membership_branch_access`; granular operational policy remains open |
| Customer | Durable BE2 `customerId`, name/contact/tags/notes | Business relationship; never automatically Guardian or owner | Persistent in BE2 | `customers`, scoped by `business_id`; optional future link to Person only after policy permits |
| Pet and Business Pet relationship | Durable identity-only `pet`, Business-local profile and neutral Customer contact associations; BE3 Bookings and local execution reference stable `petId` | Pet identity is shared across service modules; Business stores only its local profile, relationships and notes | Persistent in BE2 | Global `pets` plus `business_pet_profiles` and `customer_pet_relationships`; module tables reference rather than copy identity |
| Guardian relationship | Current Consumer prototype only; no real linking | Guardian authority remains separate from customer/contact | Persistent when Guardian work begins | `guardian_pet_authority` with explicit permissions and effective dates |
| Booking | Durable BE3 `bookingId`; canonical BE2 Customer, one-or-more Pets, Business/Branch, service, planning time/resources/status and revision | Branch planning record | Persistent in BE3 | `bookings`, `booking_pets`, Resource assignments/reservations; planning status remains distinct from execution |
| Grooming Service Job | `serviceJobId` → Booking/Pet/Customer/Branch; lifecycle/resources/history/add-ons | Branch execution record | Persistent + append-only operational events | `grooming_job`, assignments, add-ons and events |
| Hotel Stay | `hotelStayId` → Booking/Pet/Customer/Branch; room assignment/moves/care/incidents | Branch execution and occupancy record | Persistent + append-only operational events | `hotel_stay`, assignment intervals, care events and restricted incident data |
| Daycare Attendance | `daycareAttendanceId` → Booking/Pet/Customer/Branch/date; zone/staff/care | Branch execution/capacity record | Persistent + append-only operational events | `daycare_attendance`, care events and assignments |
| Resource | Durable BE3 planning IDs for groomers, stations, dryers and Hotel/Daycare capacity; local execution may retain room/zone fixtures | Branch capacity/scheduling; optional `compatibilityStaffId` is opaque and a person-linked Resource is still distinct from Team/Person truth | Planning projection persistent in BE3 | `booking_resources`, service links, availability windows, assignments and reservations; full Team/room execution remains future |
| Team | `staffId`, multiple Branch IDs, capabilities, availability | Person membership and staffing metadata; display role is not authorization | Persistent | Person + memberships + capability/availability records; avoid a module-specific staff registry |
| Intake | `intakeId` links temporary access and optional Job/Stay/Attendance | Branch operational record created after active consent gate | Persistent, time-bound and audited | `intake`; references a grant snapshot and execution target |
| Consent / Access Grant | Temporary access has scope, recipient Business/Branch, expiry/revoke/events | Guardian-controlled disclosure gate; recipient scope is exact | Persistent for validity/audit period | Versioned `access_grant`, token hash and immutable audit events |
| Conversation | `conversationId` with Business/Customer plus contextual references | Business communication record; no Passport access | Persistent when real messaging starts | `conversation`, `message`, delivery/participant records |
| Charge | `chargeId`, Branch attribution, source references, line snapshots/history | What is owed; not execution and not Payment | Persistent, auditable | `charge`, immutable/append-only lines and adjustments |
| Payment | `paymentId`, allocation, request key, method/time | Money received/recorded; not Charge status storage | Persistent, auditable | `payment`, allocations, idempotency key and provider-attempt references |
| Service Record | Source-keyed from completed execution; Pet/Branch/customer/Booking; permitted snapshot/corrections | Shared Business history, never Passport/CareProof | Persistent + append-only corrections | `service_record`, source revision/correction/audit records and private media metadata |
| Reports and CRM | Client-side selectors over Bookings, execution, Charges/Payments, messages and records | Read-only Business insights | Derived | Queries/read models; no independent mutable report or CRM score table initially |

### Rules locked by BE0

- Customer is not Guardian. A contact can arrange a service without Pet ownership or Passport authority.
- Customer and Pet persistence is Business-wide. Changing Branch never creates another Customer, Pet profile or relationship.
- Business never owns a Pet Passport. It may hold its own customer/Pet relationship and only a scoped, active grant to protected Guardian data.
- Pet identity is shared. Grooming Job, Hotel Stay and Daycare Attendance reference the same Pet; no module creates a duplicate Pet.
- Booking is planning; Service Job/Stay/Attendance is execution. Their status machines stay separate.
- Charge is what is owed; Payment is a recorded settlement/allocation. Neither represents service completion.
- Branch is an operational, privacy and financial scope. It is not a UI filter or cosmetic location label.
- A Service Record is shared service history derived from a completed source, not a standalone CareProof module and not a Pet Passport, receipt, certificate, medical record or Guardian delivery surface.
- A future LINE identity proves only the provider subject authenticated by LINE. It does not itself prove Person linkage, Guardian authority or Pet ownership.

## 3. Persistence, derivation and lifecycle map

| Category | Keep or calculate | BE0 rule |
|---|---|---|
| **MUST PERSIST** | Persons/external identities, Businesses, Branches, authorized memberships, Customers, Pet identity/Business relationship, services/resources, Bookings, execution records and their events, Intake, active/revoked grant records and audit trail, Conversations/messages, Charges/lines/adjustments, Payments/allocations/attempts/idempotency keys, Service Records/corrections/media metadata | Persist explicit user/business facts, source snapshots required for history, authorization facts and financial/audit facts. Every mutating record carries Business and, where operationally applicable, Branch attribution. |
| **DERIVED** | Charge balance/status, revenue, outstanding total, occupancy/capacity totals, workload, Home attention/next work, Reports, CRM lifecycle/follow-up segments, unread count, display labels, availability result | Recompute from authoritative records. Materialize only when a measured query need requires it; a projection has a rebuild path and never becomes an independent writer. |
| **EPHEMERAL** | Open dialog/sheet, selected row/tab/filter, draft form text, command palette state, drag preview, local validation message, calendar view cookie, quick-reply visibility cookie | Keep client-side or in a user-preference store only when worthwhile. Do not migrate session mechanics as domain data. |
| **EXTERNAL** | LINE subject/profile and webhook event, LINE OA connection, provider payment attempt/webhook, object-storage bytes, email/SMS provider delivery | Store only the canonical reference, verified event metadata, status and audit data needed by Meawketting. Provider payloads need minimization and retention policy. |
| **FUTURE / NOT YET PERSISTED** | Guardian authority policy, real Passport contents, public safety/lost data rules, production photo binaries, invoice/tax/refund records, notification preferences, full HR/payroll, loyalty/campaigns/AI | Product decision and dedicated design are required before schema or persistence work. |

Browser-local records and fixtures are not production migration input. They are development seeds and test data. Production begins with an empty authoritative tenant or deliberate approved seed import; it must not ingest a user's browser storage as business data.

### Immutable, append-only and mutable treatment

- Business profile, Branch configuration, Customer contact/tags and open Booking planning details are mutable through BE1–BE3 with authorization and bounded audit where policy requires it. Future full Team member capabilities remain outside this durable scope.
- Execution events, room/zone moves, care completion, Intake receipt, consent decisions/revocation, Charge adjustments/cancellation, Payment recording, Service Record correction and webhook handling need append-only event/audit entries even if a current-state row is maintained.
- Charges retain line snapshots. Changing a future service catalog must not silently rewrite historical money.
- Service Record corrections retain prior value, reason, actor and time. The source-keyed record is updated only through its permitted correction/recompletion rules.

## 4. Application and API boundary

The frozen UI must talk to an application-facing contract, never a database binding, SQL client, R2 bucket or provider SDK. BE1–BE3 use adapters behind the current selectors/actions without requiring a route or visual redesign.

```text
Frozen React UI
    ↓ typed command/query client
Application/API layer
    ↓ authorization, validation, idempotency, transaction orchestration
Domain layer
    ↓ repositories / projections / outbox interfaces
Persistence and external integration adapters
    ↓
D1 or chosen relational store | R2 | queues | LINE | payment provider
```

Commands validate actor membership, Branch access, object scope and domain transition before a transaction. Queries return purpose-built view data and apply scope at the server; they do not hand the browser an unfiltered tenant graph. The server owns current time, identifiers, idempotency and audit attribution.

| Capability | Command boundary | Query boundary |
|---|---|---|
| Businesses / Branches | create/update Business profile, create/update/activate Branch, configure modules/hours | authorized Business context, Branch list/configuration |
| Customers / Pets | create/update Customer, attach/localize Pet relationship, edit Business notes/tags | customer list/detail, known Pet relationship, duplicate candidates |
| Bookings | create/update/cancel Booking, assign/release resource | calendar, availability/conflicts, booking detail |
| Grooming / Hotel / Daycare | transition execution, assign resource/room/zone/staff, record permitted care/note, checkout/completion | boards, occupancy, operational detail and history |
| Team / Resources | manage membership capability/availability and Branch resource configuration | staff/resource availability, workload and capacity |
| Intake / Consent | issue/revoke grant, create/resume intake, submit correction, confirm check-in | grant gate, scoped allowed data, Intake detail/audit |
| Conversations | open contextual conversation, send message, record structured request decision | conversation list/thread/unread and delivery state |
| Charges / Payments | create/reconcile Charge, add authorized adjustment/discount, cancel unpaid Charge, record Payment or provider event | balances, payment history, checkout view |
| Service history | create/reconcile source-keyed record, correct permitted field, attach approved media metadata | Customer/Pet history and read-only financial reference |
| Reports | no ordinary mutation; scheduled/materialized projection only after need is proven | scoped operational, financial and CRM projections |

BE1 uses `POST /api/be1` for identity/Business/Branch capabilities and BE2 uses `POST /api/be2` for Customer/Pet capabilities. Both contracts remain separate from persistence and can evolve without exposing SQL or bindings to the UI. Later domains are not implied by this transport choice.

## 5. Identity, authority and privacy foundation

### Identity model

1. `Person` is the durable human identity.
2. `BusinessMembership` links Person to Business with a role/policy set.
3. `membership_branch_access` limits Manager/Staff scope. For the BE1 prototype direction, Owner access covers every Branch in the Business; owner transfer and future sensitive-action policy remain open.
4. A Customer may later link to Person, but that link does not grant Guardian/Pet authority.
5. A Guardian relationship is a separate Person-to-Pet authority record with permissions, status, evidence policy and effective dates.
6. `ExternalIdentity(provider, subject)` links a verified login provider subject to Person only through an explicit server-side linking flow. Future LINE Login creates or links this identity; it never creates a Guardian relationship by itself.

BE1 defines Owner/Manager/Staff for its narrow Business/Branch foundation. Owner can read all Branches and change Business/Branch configuration; Manager and Staff can read their explicit Branches but cannot change BE1 configuration. BE2 lets every active membership role use the current Business-wide Customer/Pet operational capabilities because no finer permission rule is approved. BF9 Team role labels remain separate browser-local operational data and never authorize requests. No larger permission matrix is implied.

### Authorization and security rules

- Resolve the authenticated Person and active membership server-side for every command and query.
- Verify Business scope, then Branch scope, then object ownership before reading or mutating. Client-supplied `businessId`, `branchId`, `customerId` and `petId` are selectors to validate, never authority.
- Scope every repository query by authorized Business. Include Branch predicates for operational/financial records; cross-Branch reporting is an explicit Business-authorized aggregate, never an unscoped query.
- Require a server transaction or equivalent serialization for Booking/resource capacity, Hotel room assignment, Daycare zone capacity, check-in, money recording and one-time grant use.
- Issue opaque, high-entropy QR tokens. Persist only a token hash, recipient/scope/expiry/status and audit trail. QR URLs contain no Customer/Pet/Passport data. Revoke and expiry are checked at every protected read and intake confirmation.
- Record immutable audit events with actor Person/membership, effective Business/Branch, action, target, timestamp, request/correlation ID, reason where required and bounded before/after metadata. Avoid protected data in application logs.
- Treat Passport, Guardian instructions, medication authorization, incident details, images and financial data as protected classifications with narrow read/write policies and retention decisions.
- An authorization failure returns safe generic feedback and is logged without revealing cross-tenant object existence.

Temporary grant expiry is a read-time enforcement condition, so a cron job is not required for security. A later scheduled cleanup can retire expired data after the approved retention period.

## 6. Cloudflare production study

### Implemented local direction — not production-provisioned

BE1–BE3 use the existing Cloudflare-compatible Worker/Vinext runtime and **one relational D1 database with strict Business/Branch predicates and migrations** locally. BE3 additionally uses transactional `batch()` writes, optimistic revisions and SQLite triggers over a reservation ledger; it does not add a Durable Object or distributed lock. Private R2 remains only a later media candidate. Do not add KV, Queues, Durable Objects, Cron or Analytics Engine until a specific approved workload needs each one.

D1 is an appropriate initial fit because the Business model is relational and transaction-sensitive: memberships, Customer/Pet relationships, Bookings, execution, Charges and Payments need joins, indexes and transactions. It is not an automatic final choice. Cloudflare documents a 10 GB maximum per paid D1 database and single-threaded execution per individual database; capacity/load tests and reporting needs must be reviewed before committing to it for high-volume production. [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

| Capability | Recommended use | Why / trade-off |
|---|---|---|
| Runtime | Cloudflare Workers with the current Vinext app | Existing build has a Worker entry and Cloudflare Vite plugin. Keep application/domain code portable so this is not a database coupling. |
| Relational persistence | D1 implemented locally through BE3; production/load acceptance still pending | Fits normalized operational records and transactional Booking reservations. Per-database single-threaded throughput and 10 GB limit mean measure contention, hot resources, heavy reports and tenant growth; move to a managed Postgres-compatible service if those constraints dominate. |
| Object/image storage | Private R2 bucket after image policy is approved | Keeps binaries outside relational rows. Workers can bind R2 directly; use short-lived, purpose-scoped uploads and authorized reads. [R2 Workers API](https://developers.cloudflare.com/r2/get-started/workers-api/) |
| KV/cache | None through BE3; later cache only disposable public/config/read models | KV must not be membership, consent, financial, Booking or revocation source of truth because those need consistent authoritative reads. |
| Queues/events | None through BE3; introduce with transactional outbox for LINE, payment webhook follow-up, image processing and noncritical notifications | Queues support retries/batching but delivery order is not guaranteed, so every consumer needs idempotency. [Queues overview](https://developers.cloudflare.com/queues/) and [delivery model](https://developers.cloudflare.com/queues/reference/how-queues-work/) |
| Durable Objects | Not initially | Consider only if measured demand requires a strongly coordinated per-resource calendar/hold or connection state. First use relational transaction constraints; avoid inventing stateful infrastructure. |
| Cron | Not initially | Use only for approved recurring reconciliation, retention/cleanup or reminders. Cron runs in UTC and configuration propagation is not instantaneous. [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) |
| Secrets | Workers secrets / approved account secret store | Secrets are encrypted bindings. Never put provider credentials in `vars`, frontend bundles or git. [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/) |
| Observability | Structured application audit + Workers Logs from the first authenticated mutation | Workers Logs collect invocation/custom/error logs; retain minimal PII and add external OTLP/Logpush only when operations policy requires it. [Workers observability](https://developers.cloudflare.com/workers/observability/) |
| Product analytics | None initially; Analytics Engine only for approved aggregate operational telemetry | It supports high-cardinality, non-blocking analytics writes, but it is not the financial/reporting source of truth. [Analytics Engine](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/) |

### Alternatives and trade-offs

- **Managed Postgres-compatible database from day one:** preferable if expected write concurrency, SQL/reporting complexity, regulated backup/recovery requirements or multi-operator finance workflows exceed D1's measured envelope. It adds network/operational/vendor complexity but avoids an early D1 migration.
- **D1 per Business:** may reduce hot-tenant contention and aligns with D1's horizontal-scale guidance, but complicates all-Branch Business reports, migrations, operational tooling and account binding management. Do not choose it before tenant/load evidence.
- **R2 public bucket/custom domain for media:** suitable only for intentionally public marketing assets. Pet, service and Business-uploaded images require private delivery and authorization.
- **Queues from the outset:** would add retry and event complexity before an asynchronous use case exists. Use an outbox once LINE, payments or image work actually needs reliable decoupling.

Cloudflare is the target platform, not an instruction to use every Cloudflare service. BE1–BE3 have local D1 binding/configuration only; no production service has been provisioned or deployed.

## 7. LINE boundary

Guardian target remains a future LINE Mini App. Business communication will eventually let a Business answer through Meawketting Inbox, but each Business needs its own approved LINE OA connection and consented customer relationship. Meawketting must not assume one central LINE account is the chat hub for every Business.

```text
Guardian LINE client / Mini App
  → LINE Login verified subject
  → explicit Person link and, where approved, Guardian↔Pet authority

Business-owned LINE OA
  ↔ verified webhook endpoint
  ↔ LINE integration adapter + inbound event ledger
  ↔ canonical Conversation / Message / Delivery records
  ↔ Business Inbox projection
```

- Store a Business-owned OA connection record, encrypted credentials/secrets by environment, connection lifecycle and webhook verification configuration. Do not put an OA channel secret in a Branch record or browser.
- Verify the LINE webhook signature before accepting events. Persist a provider event ID/fingerprint and process duplicate deliveries idempotently.
- Resolve inbound LINE participants to a Person/Customer only through explicit approved linking. An unmatched message remains an integration/contact-resolution workflow, not an automatic Customer/Guardian/Pet creation.
- Outgoing messages create a canonical Message and Delivery Attempt first. Provider delivery/retry state is external integration state; queue delivery only after an outbox is available.
- Define retention, attachment access, staff authority, template policy, customer opt-in and failure/retry behavior before coding.

LINE Login and the Mini App remain not implemented after BE3.

## 8. Payment boundary

The BF7 separation is production-ready in concept: `Booking/execution → Charge → Payment allocation`. Production adds a provider-facing attempt layer without changing that relationship.

| Record | Responsibility |
|---|---|
| Charge | Branch-attributed owed amount, immutable line snapshots, authorized adjustments/discounts/cancellation and derived balance/status |
| Payment | Business-recorded or provider-confirmed received amount, method, time and allocations; no direct “paid” mutation on Charge |
| Payment Attempt | Optional provider-facing initiation/reference, provider state, failure metadata, request idempotency key and reconciliation linkage |
| Provider webhook event | Verified external event ID/hash, raw-payload retention policy, received time, processing result and duplicate protection |

Every create/initiate/record operation has a durable idempotency key scoped to the actor and intended command. Every provider webhook is deduplicated independently. Reconciliation is monotonic and auditable: provider confirmation may create or update a Payment/Attempt, but never changes service completion. Refund, chargeback, tax invoice, bank-transfer matching, settlement, currency/precision and gateway selection remain Product Owner decisions.

## 9. File and image storage boundary

| Use case | Owner / access rule | Proposed handling |
|---|---|---|
| Business logo | Business-authorized membership | Private R2 object plus metadata; public derivative only if Product approves public Business profile exposure |
| Pet photo | Guardian/Pet authority or explicit Business-local upload policy | Private object; distinguish source and visibility. Never infer Passport access from possession of a file |
| Grooming before/after | Business service record, Pet-specific, Branch-attributed | Private R2 object + Service Record metadata. Visibility to Guardian is future consent/product policy |
| Hotel/Daycare service photo | Business operation, possibly sensitive | Private object + execution/service-record metadata; no automatic message delivery |
| Marketing imagery | Product-owned public asset | Static/public delivery may be appropriate; separate from operational media |

Authorize upload before issuing a short-lived single-object upload grant. R2 presigned URLs are bearer tokens, so use narrow object key, method, content type/size constraints and short expiry; a signed URL cannot be individually revoked once issued. For sensitive reads, an authenticated Worker authorization check is preferable to a long-lived direct URL. [R2 presigned URL security](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)

Use opaque object keys, store media metadata separately, scan/validate type and size before publishing, and define retention/deletion/legal-hold rules before implementation. The prototype's `localAssetRef` is metadata only and is not a migration source.

## 10. Migration sequence without UI rewrite

| Stage | Scope | Exit criterion |
|---|---|---|
| **BE0** | Readiness boundaries and decisions; no infrastructure | **COMPLETE** |
| **BE1 — Identity and tenant foundation** | Person, Business/Branch, membership/Branch access, typed application boundary, dev/test identity adapter and audit correlation; replace Business/Branch configuration truth server-side | **IMPLEMENTED LOCALLY** — protected operations are server-scoped; production auth/deploy excluded |
| **BE2 — Customer/Pet relationship** | Customer, identity-only Pet anchor, Business-local Pet profile/contact relationship, notes/tags, search, duplicate warnings, lifecycle, server reads/writes and audit | **IMPLEMENTED LOCALLY** — Customer/Pet truth no longer depends on browser state; no Guardian authority inference |
| **BE3 — Booking and resources** | Booking, service/resource configuration, availability/capacity transaction rules | **IMPLEMENTED LOCALLY** — durable all-three-time-model aggregate, server conflict revalidation, transactional reservation guards, create idempotency, revision conflicts and frozen Calendar migration; production load acceptance remains pending |
| **BE4 — Service operations** | Grooming Job, Hotel Stay, Daycare Attendance, assignments, event history and Service Record source creation | Execution is durable and preserves Booking/execution separation |
| **BE5 — Consent and Intake** | Guardian authority decisions, grants, secure QR, Intake and audit/expiry/revoke enforcement | Protected data cannot be read through UI or direct API without valid server grant |
| **BE6 — Inbox and LINE** | Canonical conversations/messages, Business OA connection, verified webhooks/outbox | Inbound/outbound delivery is idempotent and tenant-isolated |
| **BE7 — Billing and payments** | Charge/Payment/attempt/reconciliation, provider only after gateway policy | Financial idempotency, audit and reconciliation pass integration tests |
| **BE8 — Reports and history** | Server read models, bounded report queries, approved media metadata/delivery policy | Projections rebuild from sources and agree with transactional records |

Introduce a typed frontend gateway that initially preserves each frozen screen's view model and action result shapes. Migrate one capability at a time from fixture/session selector to query and command. Do not dual-write browser and production data as a source of truth; use controlled development fixtures and contract tests instead. Browser storage has no backfill value.

## 11. TypeScript debt and production type boundaries

The historical BE0 whole-repository run contained 477 diagnostics: 470 in `/workfiledesign`, five in frozen Consumer/shared files, and two then-missing Worker environment types. BE1 adds `tsconfig.be1.json`, BE2 adds `tsconfig.be2.json`, and BE3 adds its own strict reviewable boundary covering their APIs, application/repository/schema, clients/caches, affected frozen Business code, Worker types and tests. Latest outcomes belong to [VALIDATION](./VALIDATION.md); the Worker environment errors are fixed with official Cloudflare types. `/workfiledesign` remains untouched and no global strict/exclude suppression was added.

The implemented boundary follows the BE0 direction:

- `tsconfig.be1.json` contains the BE1 Business/application files and the shared contracts they import;
- `tsconfig.be2.json` includes the BE2 boundary plus the frozen Customer/Pet and stable-ID compatibility consumers it changes;
- the BE3 strict boundary includes Booking contracts/application/D1 repository, route/client/cache and the frozen Calendar/Home/Customer compatibility consumers it changes;
- the Worker uses official Cloudflare runtime environment types for the chosen binding;
- a separate frozen Consumer config retained as visible debt until Consumer work is authorized;
- an informational whole-repository report that continues to disclose `/workfiledesign` diagnostics without modifying it.

Each production-bound package or CI job must fail on its own boundary. The root historical report remains a health signal, not a reason to weaken `strict` or globally exclude errors.

## 12. Open Product Owner decisions before later implementation

1. Final parent term and policy: Visit, Order or Service Order; multi-Pet and multi-service checkout behavior.
2. Permission detail beyond the BE1 role foundation, owner transfer and sensitive-action dual control. BE1 has locked only Owner all-Branch/configuration access and explicit Manager/Staff Branch scope.
3. Customer contact authority versus Guardian authority, including who may book, approve add-ons and receive messages.
4. Guardian↔Pet authority evidence, co-guardian rights, revocation/appeal and explicit Passport data classes/scopes.
5. Temporary QR format, maximum duration, one-time/multi-use rule, fallback code policy, display and audit retention.
6. Booking hold/conflict/overbooking/waitlist/cancellation/no-show policies by service.
7. Pricing override, discount, refund, tax receipt/invoice, provider/gateway, currency and settlement policy.
8. LINE OA ownership/onboarding/disconnection, message retention, customer opt-in, attachment and failure/retry policy.
9. Photo/service-record visibility, retention, deletion, export, public sharing and incident/medical data policy.
10. Thailand PDPA/legal retention, deletion/export, backup/recovery and audit retention requirements.
11. D1 acceptance criteria: expected tenant size, concurrency, reporting volume, recovery needs and the threshold for managed Postgres.

Existing open questions in [DECISIONS](./DECISIONS.md) remain open; BE1–BE3 resolve only their explicitly recorded foundation decisions. In particular, BE3 preserves the prototype's multi-Pet aggregate but does not close the future Visit/Order, pricing, overbooking, waitlist, buffer or cancellation-policy questions.

## 13. Risks before later backend stages

- Current state is UI-shaped nested JSON. Normalize carefully while retaining history/source snapshots; a direct object-to-table dump would duplicate or lose authority boundaries.
- BE3 validates and persists Branch-local civil date/time strings plus comparable minutes, but does not yet convert with the stored IANA timezone or handle DST/offset changes. Production needs UTC instants for appointment semantics plus explicit date-only/exclusive-checkout and multi-day operating policy.
- Browser-local role/context, storage guards and QR fallback codes are not security controls.
- The current local stores have no cross-store transaction. BE3 Booking and reservation writes are atomic inside D1, but the best-effort synchronization into local BE4 execution fixtures is not; Intake, grant use, execution capacity and financial writes still need explicit atomic boundaries.
- BE1–BE3 servers own high-entropy IDs, time and request/correlation metadata. Deterministic legacy Customer/Pet/Booking IDs exist only in explicit dev/test seeds; later browser-local modules still need server-owned identity and idempotency when migrated.
- Offset pagination gives a bounded query foundation but not a point-in-time directory snapshot if another device reorders Bookings between pages. The in-tab client serializes its own reads/writes; production synchronization/cursors and multi-device refresh policy remain to be designed and load-tested.
- Payment request keys currently protect repeated local clicks only; provider events and reconciliation need independent durable duplicate handling.
- Current reporting and CRM selectors are correct read-time directions, but expensive production queries need indexes, measured query budgets and rebuildable projections.
- No approved retention/visibility policy exists for messages, operational photos, Service Records, incident data and consent audit. Storage must wait for policy.

## 14. BE1 / BE2 / BE3 completion boundary

BE1 is deliberately small: Person identity, Business/Branch membership and server-enforced scope; typed application/query-command boundary; durable Business/Branch configuration; audit/correlation; and a compatibility migration for only the active Business context. BE2 adds only durable Customer/Pet identity, Business-local profile/contact relationship, notes/tags, lifecycle, search/duplicate warnings and frozen-selector compatibility. BE3 adds only durable Booking planning, minimal service/Resource availability, typed conflicts, transactional reservation guards, create idempotency, optimistic revision control and frozen Booking projection compatibility. Service execution and every later backend remain separate. Migration, persistence and authorization tests cover tenant isolation, Branch access, cross-Business spoof/link denial, durable reopen behavior and BE3 conflict/idempotency scenarios; exact current evidence is recorded only in VALIDATION.

## Current boundary

- BE1 backend: **IMPLEMENTED LOCALLY**
- BE2 Customer/Pet backend: **IMPLEMENTED LOCALLY**
- BE3 Booking/Calendar/Resource backend: **IMPLEMENTED LOCALLY**
- Database: **IMPLEMENTED — BE1 + BE2 + BE3 SCOPE ONLY**
- Production authentication: **NOT IMPLEMENTED**
- BE1 server authorization: **IMPLEMENTED**
- Customer/Pet server authorization: **IMPLEMENTED**
- Guardian authority / Passport / Consent: **NOT IMPLEMENTED**
- Booking planning backend: **IMPLEMENTED LOCALLY**
- BE4 Service Operations backend: **NOT IMPLEMENTED / NOT STARTED**
- LINE / Mini App / OA integration: **NOT IMPLEMENTED**
- Payment gateway: **NOT IMPLEMENTED**
- Cloudflare provisioning/deployment: **NOT IMPLEMENTED**
- Business frontend BF1–BF12: **FROZEN BASELINE**
- Business font: **LINE Seed Sans TH**
- Consumer: **PAUSED**; future target is a LINE Mini App
- `/workfiledesign`: **UNTOUCHED**
- Commit/push/deploy: **NONE**
- BE2: **IMPLEMENTED LOCALLY**
- BE3: **IMPLEMENTED LOCALLY**
- BE4: **NOT STARTED**
