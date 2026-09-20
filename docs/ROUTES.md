# Routes

Status: **CURRENT REPOSITORY AUDIT (BE1–BE8 / BUSINESS-FIRST REBASE)**
Audit date: 2026-09-09
Owner: Product Architecture / Front-end

This file owns URLs and navigation destinations only. Wizard steps, tabs, task states, boards, modals and reusable errors are not routes by default.

2026-09-20 addition: `/business/register` is the public Google/LINE Business signup page. `/api/business/register` handles server-verified onboarding; `/api/auth/line/start` starts Supabase LINE OAuth. Both providers share `/api/auth/google/callback`. See [registration](./BUSINESS_REGISTRATION.md). Guardian LINE access remains paused.

## Consumer / Guardian route status

| Label | Route truth |
|---|---|
| **CURRENT** | Consumer routes below are standalone web prototype routes retained in the repository. |
| **TARGET** | Guardian access is intended to move to a LINE Mini App. |
| **PAUSED** | Consumer development; the current web prototype is frozen. |
| **NOT IMPLEMENTED** | LINE Login, LINE Mini App, LINE notifications, and production Guardian identity linking. |

No LINE Mini App route is created in this audit. The future LINE channel is an entry/authentication decision, not a reason to invent web paths.

## Route count summary

```text
CURRENT ROUTE AUDIT: 36 route entries / 32 active local routes / 3 compatibility redirects / 1 legacy demo route
```

The route table below is the canonical route contract. Matching build/test evidence is recorded in [VALIDATION](./VALIDATION.md).

Service Record is shared domain data created by Grooming completion or Hotel/Daycare checkout/completion and shown in Customer/Pet detail. The former standalone CareProof route, menu and management experience are **SUPERSEDED**; BF-8/BF-11 create no replacement history route.

Team & Staff Operations is a local shared operational route. Its Owner/Manager/Staff labels do not create authentication, authorization or a permission matrix.

BE1 exposes typed same-origin `POST /api/be1` for identity/Business/Branch configuration. BE2 exposes typed same-origin `POST /api/be2` for Customer/Pet queries and commands. BE3 exposes typed same-origin `POST /api/be3` for Booking/Calendar/planning Resource queries and commands. BE4 exposes `POST /api/be4` for Grooming/Hotel/Daycare execution and Service Records; BE5 exposes `POST /api/be5` for Passport authority, Consent, access grants and Intake; BE6 exposes `POST /api/be6` for Conversations, Messages and outbox operations; BE7 exposes `POST /api/be7` for Charges, Payments, allocations, refunds and reconciliation; BE8 exposes `POST /api/be8` for read-only Reports/CRM snapshots. These server endpoints are not counted as `page.tsx` UI routes and expose no PostgreSQL binding to the browser. `POST /api/channels/line/[channelId]` is a provider-neutral, signature-checked webhook boundary for a Business-owned LINE OA; no production credentials are configured.

## Active live local routes — current repository count

| Route | Context / goal | Status and boundary |
|---|---|---|
| `/` | **Business-first Landing (Canonical Commercial Homepage)** | LIVE LOCAL; primary CTA `/business/login`; owner entry secondary |
| `/privacy` | Thai privacy notice with summary and section navigation | LOCAL DRAFT added 2026-09-17; noindex until operator/contact, retention and provider details are confirmed |
| `/terms` | Thai platform terms with summary and section navigation | LOCAL DRAFT added 2026-09-17; no effective date or implied acceptance; linked from the landing footer |
| `/business/login` | Business Login with Supabase Google Auth | IMPLEMENTED; real provider configuration required |
| `/business/home` | Branch-aware Business Home with square three-image carousel, arrow/click navigation, touch swipe and operational overview | LIVE FROZEN HYBRID; next-work/Booking summaries use BE3 truth and execution/attention/finance hydrate from BE4/BE7/BE8 PostgreSQL projections |
| `/business/calendar` | Sunday-first branch-aware Day/Week/Month/Custom Calendar with shared view control, remembered view, compact accessible status-color cards, server-backed move/both-edge resize, Today focus, spreadsheet-like keyboard shortcuts including undo, touch handlers, mobile Agenda, and searchable/auto-validating Booking Editor | LIVE FROZEN UI / BE3 PostgreSQL TRUTH; range/create/edit/reschedule/Resource/cancel use typed backend operations and server conflict recovery |
| `/business/grooming` | Capability-aware Grooming Today execution board for linked Pet-specific Service Jobs; aligned status cards, pointer-following reversible drag or swipe, no date/job filter rail, and mobile grouped status-list/detail alternative | LIVE FROZEN UI / BE4 PostgreSQL only when the active Branch enables Grooming; Calendar remains Booking planning, not execution |
| `/business/hotel` | Capability-aware Hotel Today operations and continuous room/zone occupancy for Pet-specific Stays linked to shared date-range Bookings; guarded room assignment/moves, lightweight care, notes/incidents and mobile grouped alternatives | LIVE FROZEN UI / BE4 PostgreSQL only when the active Branch enables Hotel; Calendar remains Booking planning, not occupancy execution |
| `/business/daycare` | Pet-specific attendance, zone capacity, shared Team assignment, care/notes, pickup and Intake/Inbox/Billing/Service Record handoffs | LIVE FROZEN UI / BE4 PostgreSQL only when the active Branch enables Daycare; shared day Booking remains planning |
| `/business/settings` | Business profile/logo/contact details and Branch add/edit, active state, enabled modules, weekly hours, shared Team summary/link and existing service-duration/capacity disclosure | LIVE FROZEN UI / BE1 PostgreSQL TRUTH except local logo bytes; `?section=branches` selects Branch settings, not another route; no production permission administration |
| `/business/billing` | Branch-attributed Charge review, Payment recording, derived unpaid/partial/paid/cancelled state, Revenue summary, refunds and Grooming/Hotel/Daycare checkout context | LIVE FROZEN UI / BE7 PostgreSQL; whole-THB model only; no payment gateway, full accounting, tax, or cross-Branch settlement |
| `/business/reports` | Single-page read-only Reports & Business Insights over shared records; date range presets (วันนี้, 7 วัน, 30 วัน, กำหนดเอง), current vs all-Branches scope, payment-derived revenue, all three service modules, Hotel occupancy, Daycare attendance/capacity and operational/customer metrics | LIVE FROZEN UI / BE8 READ-ONLY PostgreSQL; no separate report/CRM store, accounting, tax, forecasting or AI analytics |
| `/business/team` | Branch-aware Team directory with shared display identity, multi-Branch assignment, Grooming/Hotel care/Daycare/Front desk capabilities, active/inactive and lightweight availability/workload context | LIVE FROZEN UI / BE4 PostgreSQL; BE3 keeps only its minimal durable planning Resource projection with an opaque display link. Authentication uses Supabase; no payroll/HR, certification or full workforce scheduling |
| `/business/customers` | Search durable Business-level Customers/Pets through BE2 and derive CRM lifecycle, service and follow-up segments from existing shared operational records | LIVE FROZEN UI / BE2 PostgreSQL TRUTH; no separate CRM route or persisted score; Passport/access badges are non-authoritative compatibility only |
| `/business/customers/[customerId]` | Durable Customer/Pet detail and notes/tags, BE3 upcoming Booking projection, BE4/BE7 service and financial history, BE8 last-visit/repeat-use CRM projection and unified Booking/service/payment/message timeline | LIVE FROZEN UI / BE2 + BE3 + BE4/BE7/BE8 PostgreSQL; next actions are staff-triggered, not campaigns or automation; Guardian/Passport authority not implemented |
| `/business/inbox` | Business-wide Customer conversations with readable split/mobile layouts, compact search/filters, Pet/Booking context, durable unread/read state, send/quick replies, structured add-service approval and optional staff-triggered billing text | LIVE FROZEN UI / BE6 PostgreSQL; `?conversation=`, `?customerId=`, `?petId=`, and `?bookingId=` provide recovery/context; provider delivery and real LINE transport remain external |
| `/business/scan` | Temporary Business QR scan/manual validation; optional explicit `hotelStayId` or `daycareAttendanceId` target | LIVE FROZEN UI / BE5 PostgreSQL; dev/test identity only; a target never bypasses Business/Branch/Customer/Pet consent validation |
| `/business/intake/[intakeId]` | Allowed data, Intake, consent review, guarded execution handoff/check-in | LIVE FROZEN UI / BE5 PostgreSQL; same shared engine for all eligible service targets; real Supabase Auth configuration remains external |
| `/my-pets` | Consumer web-prototype Pet library | LIVE LOCAL MOCK — CURRENT WEB PROTOTYPE / FROZEN |
| `/activity` | Honest Consumer web-prototype activity categories | LIVE LOCAL MOCK — CURRENT WEB PROTOTYPE / FROZEN |
| `/create-passport` | Consumer web-prototype photo/crop/minimum-info task | LIVE LOCAL — CURRENT WEB PROTOTYPE / FROZEN |
| `/create-passport/preview` | Consumer web-prototype 4:5 Passport preview/styles/export | LIVE LOCAL — CURRENT WEB PROTOTYPE / FROZEN |
| `/my-pets/[petId]` | Consumer web-prototype Passport-first Pet detail and Quick QR state | LIVE LOCAL MOCK — CURRENT WEB PROTOTYPE / FROZEN |
| `/my-pets/[petId]/safety` | Consumer web-prototype owner Safety screen | LIVE DEMO FIXTURE BOUNDARY — FROZEN |
| `/my-pets/[petId]/safety/lost` | Consumer web-prototype Owner Lost lifecycle task | LIVE LOCAL MOCK — CURRENT WEB PROTOTYPE / FROZEN |
| `/my-pets/[petId]/sharing` | Consumer web-prototype Temporary Business Sharing for eligible demo fixtures | LIVE DEMO FIXTURE BOUNDARY — FROZEN |
| `/safety/[publicId]` | Public-safe Normal/Lost profile | LIVE LOCAL MOCK |
| `/safety/[publicId]/lead` | Finder lead task | LIVE LOCAL MOCK |
| `/safety/[publicId]/report` | Public abuse report task | LIVE LOCAL MOCK |
| `/temporary-access/[accessId]` | Safe Temporary Business gateway | LIVE LOCAL MOCK |
| `/passports` | Six-style Passport support gallery | LIVE LOCAL SUPPORT |

## Compatibility redirects — 3

| Route | Destination | Purpose |
|---|---|---|
| `/business` | `/` | Redirects legacy business landing path to canonical root homepage |
| `/create-passport/minimum-info` | `/create-passport` | Merged step backward compatibility |
| `/create-passport/success` | `/my-pets/claimed-local` | Post-create redirect |

## Legacy demo route — 1

| Route | Boundary |
|---|---|
| `/qr-preview` | Visual regression demo only; not canonical architecture |

## Target Guardian channel (No routes yet)

The target is a LINE-first Guardian experience. Service Records are currently Business-side history only; future Guardian visibility remains a separate policy/channel decision:

```text
Add Meawketting LINE → LINE Login → open LINE Mini App → My Pets → Add Pet → Pet Passport
```

This is conceptual and **NOT IMPLEMENTED**. Do not add `/line/*`, Mini App paths, or replacement Consumer routes until a future Consumer phase defines the production channel and identity-linking architecture.

## Planned route concepts (Next milestones)

| Concept | Target Milestone | Purpose |
|---|---|---|
| Multi-Service Visit / Order checkout | Future checkout policy | Combined service grouping and checkout policy; no additional route is created by BF-7 |
| Guardian Service Record visibility | Future Guardian phase | LINE Mini App service-record visibility/delivery; no Guardian route is created by BF-8 |
| Business Onboarding | Multi-branch setup | Resumable business setup wizard (`/business/onboarding`) |

## Root homepage anchor destinations

The public Business header uses only anchors that exist on `/`:

| Anchor | Destination |
|---|---|
| `#business-core` | Business Core capability and prototype-status section |
| `#services` | Multi-service business types |
| `#guardian` | Secondary owner / Guardian ecosystem entry |

The old Consumer web login route was removed while the Guardian entry is redesigned around LINE. The public header keeps Business login at `/business/login`; no LINE route is implied until that channel is implemented.

BF-4 intentionally adds no `/business/inbox/[conversationId]` route. Desktop uses a split view, mobile uses a full conversation task, and the stable local selection is recoverable through `?conversation=<id>`; Customer/Booking launch parameters normalize to that query after reusing or creating the Business-level conversation.
