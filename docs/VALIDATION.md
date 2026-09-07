# Validation

Status: **BE1 + BE2 + BE3 BACKEND FOUNDATIONS VALIDATED LOCALLY / BF1–BF12 UI FROZEN**

Validation date: 2026-09-07
Owner: Engineering / QA

This document owns current test evidence. A passing local build is not a production-readiness claim.

## BE3 Booking / Calendar / Resources validation — 2026-09-07

| Check | Result | Evidence |
|---|---|---|
| `npm run lint` | **PASS** | ESLint covers BE1–BE3 application/repository/API/client/cache code, frozen frontend adapters, tests, migration/seed scripts and schema. |
| `npm run typecheck:be3` | **PASS** | Strict scoped boundary includes BE1/BE2 dependencies, BE3 contracts/application/repository/D1/API/client/cache, Calendar/Booking/Home/Customer integration, schema, Worker and BE3 tests. |
| `npm run db:check` | **PASS** | BE1–BE3 checks replay all four generated migrations deterministically, load ordered dev/test fixtures, verify the 23-table schema, foreign keys/integrity, authority-field exclusions, query indexes and BE3 reservation triggers/final write guard. |
| `npm run test:be3` | **PASS — 9/9** | Migration-backed application/repository tests cover appointment, one logical Hotel date range, day-based and multi-Pet Bookings; create/update/reschedule/assign/cancel; range/customer/resource reads; operating hours/module/Branch/Resource conflicts; wrong tenant/Branch/Customer/Pet/Resource/Booking and inactive membership denial; optimistic revisions; equivalent/mismatched idempotency retries; competing writes with one winner; bounded audit; constraints; and reopen durability. |
| Frozen frontend regression | **PASS — 90/90** | Calendar range/create/edit/cancel/drag/both-edge resize/duplicate/recovery, Home summaries, Customer upcoming Booking, Branch switching and BF1–BF12/Consumer contracts pass. Source assertions verify the BE3 client/cache, no runtime browser Booking writer and the explicit local BE4 execution compatibility boundary. |
| Local Wrangler D1 migration / seed | **PASS** | `0003_same_nekra.sql` applied to local Wrangler D1 (31 commands). Aggregate BE1 + BE2 + BE3 deterministic seeds completed; BE3 loaded 5 services, 13 Resources, 13 Bookings, 15 Pet links, 27 assignments and 32 reservations without reading browser storage. |
| API smoke | **PASS** | Local `POST /api/be3` returned a Business/Branch range with Hotel as one logical Booking; availability returned typed `DUPLICATE_BOOKING` and `TIME_CONFLICT`; create retained estimate/notes; the same idempotency key replayed the same Booking ID; cancel returned the authoritative revision and lifecycle. |
| `npm run build` | **PASS** | Vinext production build emits `λ /api/be1`, `λ /api/be2` and `λ /api/be3`; D1 migration packaging succeeds. |
| Production deployment | **NONE** | No remote D1/R2 resource, secret, domain, migration or deployment was created. |

BE3 authorization tests call the public application capability boundary against generated migrations and the D1-compatible adapter. Every operation resolves BE1 Person → active membership → active Business → Branch access, then scopes Booking, BE2 Customer/Pet and Resource targets. Browser availability remains advisory. D1 reservation triggers and the final commit guard run inside the mutation batch; audit checks prove Customer/Pet names, contact data and free-form Booking notes are not copied into audit JSON.

Concurrency is validated for this D1/SQLite design, not claimed as a distributed lock: conflicting reservation inserts deterministically leave one valid committed Booking, while create retries use a Business-scoped idempotency key/request hash and edits use optimistic revisions. Time values remain validated Branch-local civil strings/minutes; IANA timezone-to-UTC/DST conversion and full per-day Hotel/Daycare operating-hours policy remain open production work.

**Scope truth:** BE1, BE2 and BE3 backend/database/server authorization are implemented locally. Booking planning is durable; Grooming Job, Hotel Stay and Daycare Attendance execution remain browser-local compatibility data linked by BE3 IDs. Guardian authority, Passport/Consent, BE4 service operations, Inbox/LINE, Billing/Payment backend, Reports backend, media/R2, production Auth and Cloudflare deployment are **NOT IMPLEMENTED**. **BE4 is NOT STARTED.**

## BE2 Customer / Pet retained regression validation — 2026-09-07

| Check | Result | Evidence |
|---|---|---|
| `npm run lint` | **PASS** | Current aggregate lint covers BE1–BE3 server, clients, frozen frontend adapters, tests, migration scripts and schema. |
| `npm run typecheck:be2` | **PASS** | Strict scoped boundary includes BE1 dependencies, BE2 contracts/application/repository/D1/API/client/cache, affected Customers/Booking compatibility code, schema, Worker and BE2 tests. |
| `npm run db:check` | **PASS** | Current aggregate BE1–BE3 replay includes the original BE2 migration/seed assertions, foreign keys/integrity, authority-column exclusions and Customer/Pet directory/phone/name/relationship query indexes. |
| `npm run test:be2` | **PASS — 11/11** | Eight migration-backed application/repository tests plus three cache/client compatibility tests cover Customer CRUD/search/notes/tags/lifecycle, Pet CRUD/lifecycle/multiple relationships, active/inactive duplicate warnings, no merge, cross-Branch identity, wrong Business/spoof/inactive membership/cross-tenant link denial, OWNER/MANAGER/STAFF policy, constraints, minimized audit, reopen durability, partial-directory truth and ordered hydration/mutation responses. |
| Frozen frontend regression | **PASS — 90/90** | Customers list/detail/Add Customer/Add Pet/backend search/notes/tags/quick-action contracts pass with BF1–BF12 and Consumer regressions. Source assertions verify the BE2 client/cache, no browser Customer mutations and explicit non-authoritative Passport compatibility. |
| Local Wrangler D1 migration / seed | **PASS** | The retained BE2 migration/seed remains reproducible inside the successful aggregate BE1–BE3 local Wrangler replay. Seeds are deterministic dev/test data and do not read session storage. |
| API smoke | **PASS** | Local `POST /api/be2` returned Customer/Pet search and list data to active Owner/Manager actors (`200`), hid a Customer ID from another Business behind generic not-found (`404`) and rejected an inactive membership (`403`). |
| `npm run build` | **PASS** | Vinext production build emits `λ /api/be1`, `λ /api/be2` and `λ /api/be3`; D1 migration packaging succeeds. |
| Production deployment | **NONE** | No remote D1/R2 resource, secret, domain, migration or deployment was created. |

BE2 authorization tests call the public application capability boundary against generated migrations and the D1-compatible adapter. Every operation resolves a real BE1 Person/membership/Business record and scopes the Customer/Pet target in repository SQL. Audit checks prove names, phone/email values, notes and tag labels are not copied into audit JSON.

**Scope truth:** BE2 Customer/Pet remains green and is consumed by BE3 without changing Customer ≠ Guardian or contact relationship ≠ ownership. The current overall boundary is stated in the BE3 section above.

## BE1 identity / Business / Branch validation — 2026-09-06

| Check | Result | Evidence |
|---|---|---|
| `npm run lint` | **PASS** | ESLint covers `app`, `worker`, `tests`, `scripts`, `db` and configuration files. |
| `npm run typecheck:be1` | **PASS** | Strict scoped boundary covers BE1 contracts/application/repository/API/schema/client/cache, affected Business settings/context code, Worker and tests. No global strict-off or `/workfiledesign` exclusion hack. |
| `npm run db:check:be1` | **PASS** | All generated migrations apply to fresh SQLite databases reproducibly; expected BE1 tables/Branch-access lifecycle columns, foreign-key/integrity checks and scoped query indexes pass. |
| `npm run test:be1` | **PASS — 8/8** | Real generated migrations plus dev seed exercise identity, active/inactive membership and Branch grants, Owner/Manager/Staff scope, wrong Business/Branch/spoof rejection, configuration writes, modules/hours, audit/correlation, last-active guard, constraints and reopen durability. |
| Local D1 migrations / seed | **PASS** | `npm run db:local:migrate` applied the generated migrations and `npm run db:local:seed` loaded explicit dev/test fixtures against Wrangler local D1 only. |
| API smoke | **PASS** | Local `POST /api/be1` resolved Owner workspaces, restricted Manager to Ari, returned generic not-found for inaccessible Thonglor and rejected an inactive membership. Response metadata included request/correlation IDs. |
| `npm run build` | **PASS** | Current Vinext production build emits `λ /api/be1`, `λ /api/be2` and `λ /api/be3` and packages `.openai/drizzle`; production auth mode is not enabled by the build. |
| Production deployment | **NONE** | No Cloudflare production resource, secret, migration, domain or deployment was created. |

Authorization tests use the public typed application boundary against a D1-compatible adapter, not mocked role booleans. Persistence tests close and reopen the database to prove durable read/write behavior. The development identity header is accepted only when the server mode is exactly `dev-test`; otherwise the boundary fails closed with production auth unconfigured.

Frontend compatibility regression retains the frozen Business Shell, Branch switcher, Settings, Customers, Calendar, capability-aware navigation and BF1–BF12 behavior while asserting that legacy browser `businessProfiles`, `branches`, `customers` and `bookings` are no longer retained as truth. Excluded execution domains remain browser-local and reference stable BE2 Customer/Pet and BE3 Booking IDs.

**Scope truth:** BE1 backend/database/server authorization remains implemented locally and green. BE2 adds Customer/Pet and BE3 adds Booking/Calendar planning plus minimal Resources. Production Auth, BE4 service execution, Guardian/Passport/Consent, LINE, Payment, media/R2 and Cloudflare production deployment are **NOT IMPLEMENTED**.

## Historical frozen Business UI audit

## Final Business UI audit — 2026-09-05

**Business Font = LINE Seed Sans TH.** Local 400/700 WOFF2 faces load on public Business and logged-in Business surfaces. No FC Minimal or Anuphan substitution was made. Body text is 16px, supporting text follows the shared type scale, and mobile/tablet text inputs are at least 16px.

Repository inspection was followed by rendered Chromium viewport checks and visual screenshot review. The main matrix covers 16 existing routes/views at **320, 375, 390, 430, 768, 820, 1024, 1200 and 1440px**: public `/`, Business Login, Home, Calendar, Customers, Customer Detail, Inbox, Scan, Grooming, Hotel, Daycare, Billing, Reports, Team, Settings and its Branch section. Actual Intake was opened from Scan and checked at all nine widths. Enabled Daycare was also checked in the existing Onnut Branch context. Booking is audited through its existing Calendar editor; no standalone Booking route was invented.

| Surface | Final result and evidence |
|---|---|
| Public / Login | **PASS** — image-led composition, Thai wrapping, local font and existing destinations; public tablet navigation retains all links on its own row. |
| Header / navigation | **PASS** — Header owns Business/Branch context, actions and account. Sidebar remains primary navigation from 1200px. Compact navigation and More share the breakpoint through 1199px, show the current destination, and preserve capability-based/planned navigation. |
| Home | **PASS** — image-first square banner, readable attention/next-work/quick actions, correct mobile crop and compact desktop summary. Existing arrows/swipe remain; automatic decorative looping is removed. |
| Calendar / Booking | **PASS** — Day/Week/Month/Custom, Hotel multi-day spans, Grooming/Daycare entries and mobile agenda. Minute-accurate Day placement and separate overlap lanes; Booking statuses include visible text. |
| Customers / Pets | **PASS** — aligned list/avatars, connected/verified labels, mobile stack, customer/pet forms, readable full-width CRM detail sections, timeline and quick actions. |
| Inbox | **PASS** — selected/unread conversations, collapsible quick replies, composer contrast/hierarchy and mobile list-to-conversation flow. Changing conversation clears the previous conversation's composer draft/notice. |
| Scan / Intake | **PASS** — actual Intake flow and correction dialog; rendered network/denied/pending/expired/revoked/wrong-context/invalid scan states retain actionable feedback. |
| Grooming | **PASS** — readable contained board lanes, mobile list scrolling, status/attention/resource feedback, visible move result and keyboard focus retained after moving a job. |
| Hotel | **PASS** — occupancy/resources, multi-day layout, detail/nested dialog and mobile tabs. Arrow keys/Home/End move both selection and focus. |
| Daycare | **PASS** — enabled/disabled Branch contexts, pet attendance and capacity/staff states, mobile layout and detail copy. |
| Billing | **PASS** — readable tabular amounts, labeled mobile cards, payment/status contrast and destructive cancellation confirmation. |
| Reports | **PASS** — charts contained, all-Branch comparison and service tables become labeled stacked mobile rows; underlying tables no longer force desktop width. |
| Team | **PASS** — rows/avatars/capabilities and mobile/tablet editor focus, spacing and input sizes. |
| Settings / Branch | **PASS** — sectioned configuration, service/hour forms and Branch editor. Sticky actions no longer cover Sunday hours; closing/saving restores the editor trigger focus. |

| Shared contract | Final result |
|---|---|
| Typography / spacing | **PASS** — shared LINE Seed Sans TH scale, Thai line-height, tabular numeric/time values, responsive grid and border corrections. No document-level horizontal overflow, broken images or undersized mobile/tablet text inputs in the measured matrix. |
| Colors / buttons | **PASS** — Yellow primary, Coral Grooming, Sky Hotel and Mint Daycare retained. Operational statuses use semantic color plus text/icon; small status ink is slightly darkened through shared tokens. Final sampled Reports status contrast is at least 4.65:1, payment states 4.95:1 and service labels 11.99:1. Primary/secondary/ghost/destructive/disabled remain distinct. |
| Motion | **PASS** — shared fast/base/slow/drag values 180/220/300/280ms, reduced-motion fallback, no automatic banner/decorative loop. Entry animation releases its stacking context so dialogs render above navigation. |
| Accessibility | **PASS in audited flows** — visible focus, labels, 44px touch controls, image alternatives, non-color status cues, nested dialog Tab/Shift+Tab/Escape/return focus, disabled/loading feedback and scoped shortcuts. This is browser/keyboard inspection, not screen-reader certification. |
| Responsive | **PASS** at 320 / 375 / 390 / 430 / 768 / 820 / 1024 / 1200 / 1440. Wide planning boards retain intentional internal scrolling; mobile Reports/Billing use readable labeled rows/cards. |

Calendar interaction checks used actual mouse input and native CDP touch emulation at 390px. Grooming and Hotel move, leading/trailing edge growth **and shrink**, overlapping-resource rejection with visible conflict feedback and rollback all passed. Nested Booking/Customer/Pet and Grooming/Hotel service-request dialogs retained focus and closed only the intended layer. Keyboard shortcuts no longer intercept unrelated shell controls. Empty/error states were opened where existing fixtures allow; loading/skeleton, disabled and reduced-motion contracts were also checked against rendered/source contracts.

Final normal-network browser runs recorded **zero console errors, page errors and failed requests**. Initial sandbox-only remote font access failures did not recur with normal network access; Business itself uses the verified local font assets. A transient development HMR failure was not reproduced in fresh stable pages. Neither issue was hidden with source/configuration suppression.

Fixed issues include the invisible 1024px More sheet, duplicate/misplaced context, modal stacking and nested focus, Calendar placement/shortcut feedback, lost Grooming keyboard focus, Inbox cross-conversation draft retention, Reports overflow/contrast, CRM narrow columns, Settings sticky overlap, undersized inputs, redundant search borders and prototype-facing operational wording. Rechecks found **no remaining significant Business UI defect** within this audit scope.

The UI was frozen for backend readiness. At the time of this historical audit, backend work had not started; BE1–BE3 were added afterward without redesigning the audited UX. BE2 changes Customer/Pet persistence from browser-local to D1 while preserving the audited relationship semantics: Customer is still not Guardian or owner authority. BE3 changes Booking planning from browser-local to D1 while keeping Booking distinct from execution. Production readiness is still not claimed. Payment/Privacy rules remain unchanged. Consumer is paused and `/workfiledesign` is untouched.

Local evidence: `tmp/business-ui-audit/final/` contains the viewport measurements, screenshots, targeted flow results and clean browser logs; `tmp/business-ui-audit/*-final.log` contains command evidence. These are local ignored QA artifacts, not product assets.

## Existing implementation checkpoint

Before BE1, BF10–BF12 extended the existing BF1–BF9 shared browser-local Business envelope with Business profiles/Branches, pet-specific Daycare attendance and read-only derived CRM. BE1 replaces Business/Branch configuration truth; BE2 replaces Customer/Pet directory truth; BE3 replaces Booking planning and minimal Resource availability truth. Team/HR, Intake, Grooming Job, Hotel Stay/room, Daycare Attendance, Billing, Conversation, Service Record and Reports remain browser-local and reference stable BE2/BE3 IDs. These phases add no duplicate service-domain or CRM store. **Production Ready: NO.** Consumer remains frozen; Guardian/Passport/Consent authority, production auth, later backend domains, LINE, gateway/accounting, payroll, AI and deployment remain outside this checkpoint.

## Final command evidence

| Command | Result | Evidence |
|---|---|---|
| `npm run lint` | **PASS** | ESLint exited 0 |
| `npm test` | **PASS — 90 frontend regressions + 8 BE1 tests + 11 BE2 tests + 9 BE3 tests** | Full suite runs the Vinext production build, BF1–BF12/Phase E/Consumer rendered contracts and all three backend suites |
| `npm run build` | **PASS** | Vinext production build emits `/business/settings`, `/business/daycare`, existing live routes, `λ /api/be1`, `λ /api/be2` and `λ /api/be3`; generated D1 migrations are packaged and no CareProof route is emitted |
| `npm run typecheck:be1`, `typecheck:be2`, `typecheck:be3` | **PASS** | Each changed backend boundary passes its strict scoped TypeScript project without weakening root settings |
| `npm run db:check` | **PASS** | Four generated migrations replay deterministically with BE1–BE3 fixtures, constraints, indexes, authority exclusions and BE3 concurrency guards intact |
| Browser console | **PASS** | Zero console/page errors or failed requests in the final normal-network runs; actual rendered viewport and interaction checks above |
| `git diff --check` | **PASS** | No whitespace errors; no commit, push or deployment performed |
| Route audit | **PASS** | 34 `page.tsx` route entries = 30 active local routes + 3 compatibility redirects + 1 legacy QR demo; Branch management is a Settings section, not a duplicate route |

The first sandboxed Vite build could not write its generated temporary file under `node_modules/.vite-temp` (`EPERM`). The same build was rerun with the required workspace write permission and passed; this was an execution-environment permission issue, not a source failure.

The historical whole-repository `npx tsc --noEmit --incremental false` report contained **477 diagnostics**: 470 in `/workfiledesign`, five in frozen Consumer/shared files and two then-missing Worker environment types. BE1 fixes the Worker types it uses and introduces `tsconfig.be1.json`; BE2 and BE3 add scoped strict projects for their full changed boundaries. All three strict checks pass. No compiler check was globally disabled, `/workfiledesign` was not excluded through a new root hack, and out-of-scope Consumer/design-source files were not repaired. The historical root debt remains separate from the passing BE1–BE3 boundaries.

## BF10 — Branch and Settings evidence

| Contract | Result | Evidence |
|---|---|---|
| Shared configuration | **PASS** | Business text profile and Branch add/edit/active/module/hour data use the BE1 typed backend and D1; deterministic fixtures remain only before hydration/dev-test recovery. Logo bytes stay local because media is excluded. |
| Branch guards | **PASS** | Tests cover duplicate names, invalid hours, Business isolation, explicit Branch access, last-active-Branch protection and active-context fallback without deleting historical records. |
| Inactive Branch Reports history | **PASS** | Regression verifies historical services, financial totals, names and comparison rows remain after Branch deactivation while Hotel/Daycare capacity counts only active Branch contexts. |
| Operational scope | **PASS** | Enabled modules affect navigation, Booking services, Calendar and Home; closed/outside-hours/inactive Branch planning is rejected. New Branches reuse shared resource foundations. |
| Team and service foundation | **PASS** | Branch cards derive active member names/count/capabilities and link to the matching Team context. Disclosures show shared default service duration and Hotel/Daycare capacity, with no second editor or catalog. |

## BF11 — Daycare evidence

| Contract | Result | Evidence |
|---|---|---|
| Booking → attendance | **PASS** | Day-based Bookings project to one attendance per Pet, scoped by Business/Branch/date. Booking changes preserve operational identity. |
| Lifecycle/capacity/staff | **PASS** | Tests cover guarded check-in, active, ready, checked-out/completed and cancellation transitions; zone capacity/move rejection; shared staff capability/availability/conflicts. |
| Shared Intake | **PASS** | Explicit attendance target, matching access/Business/Branch/Customer/Pet, scoped reuse/idempotency and check-in capacity race are tested. Direct receive-in remains available without inventing Passport permission. |
| Billing and history | **PASS** | Multi-Pet attendance reuses one booking-level Charge; Payment stays separate. Checkout/completion creates one source-keyed shared Service Record. Browser Maple checkout → Billing → Customer history passed. |
| Cross-module projections | **PASS** | Home, Calendar, Team workload, Reports, Inbox links and Customer/Pet history read shared IDs/state. No page-specific operational fixture store was created. |

## BF12 — CRM and UI consistency evidence

| Contract | Result | Evidence |
|---|---|---|
| Derived relationships | **PASS** | Pure selectors derive last visit, next Booking, distinct completed-Booking visit count, services used, balances, segments and timeline from existing records; no CRM persistence or scoring store. |
| Upcoming consistency | **PASS** | CRM list/detail/Pet cards share one dataset-reference-day selector. Completed Pets are removed from upcoming projections while unfinished siblings remain; cancelled/historical records do not become future appointments. Browser completion no longer leaves stale upcoming labels. |
| Timeline/actions | **PASS** | Booking, service, Charge/Payment and Inbox events remain distinct. Quick actions route to existing Booking, Billing, Customer and Inbox surfaces. Internal notes are not customer messages. |
| Loyalty boundary | **PASS** | Planned only; no points, tiers, rewards, automated campaigns, prediction or AI. |
| Shared UI | **PASS** | Final source/browser pass tightened dialog semantics/focus, responsive table containment, narrow Team/Reports wrapping, mobile input sizing, 44px touch controls, motion/reduced-motion and operational wording. |

## BF-7 Billing, Payments & Revenue evidence

| Contract | Result | Evidence |
|---|---|---|
| Charge ≠ Payment | **PASS** | `PrototypeCharge` holds the service amount/lines/history and `PrototypePayment` holds a separately recorded method, amount, allocation, request key, and time. Payment does not mutate the Charge into a paid record. |
| Status and balance | **PASS** | `unpaid`, `partial`, `paid`, and `cancelled` are derived from Charge lines, Payment allocations, and cancellation state; UI always renders text with an icon/non-color cue. |
| Whole-THB amount boundary | **PASS** | Base prices, approved add-ons, adjustments, discounts, and Payments reject fractional values. The prototype uses integer Thai Baht only and makes no accounting-precision claim. |
| Adjustment and cancellation reasons | **PASS** | Manual adjustment/discount require a label and reason; discount cannot produce a negative total. Cancellation requires a reason and is blocked once a Payment exists, with no automatic refund. |
| Idempotency and overpayment | **PASS** | Approved Grooming add-ons are reconciled once by source request id; Payment uses a request key and duplicate submissions return the original record. Payments cannot exceed remaining balance. |
| Grooming Checkout | **PASS** | Ready-for-pickup/completed Grooming Job opens explicit `/business/billing?serviceJobId=…`. Operational completion and payment status remain separate. |
| Hotel Checkout | **PASS** | Ready-for-checkout/checked-out/completed Hotel Stay opens `/business/billing?hotelStayId=…`. A Stay's operational lifecycle does not create a Payment or mark a Charge paid. |
| Multi-pet booking protection | **PASS** | One booking-level base Charge is reused across per-Pet Jobs/Stays; the paired Hotel fixture proves the base estimate is not duplicated. |
| Branch and Customer integration | **PASS** | Charges, Payments, balances, customer financial history, and Home revenue filter to the current Business+Branch context. Cross-Branch payment attempts are rejected. |
| Shared revenue source | **PASS** | Home and Billing both use `getPrototypeRevenueSummary`; revenue is Payment-derived, while unpaid/partial balances remain separate. |
| Inbox boundary | **PASS** | Billing may add a local text notification to the existing Business+Customer conversation only. Inbox does not own Charges or Payments, and no LINE delivery/integration was added. |
| Responsive and accessibility | **PASS** | Desktop uses an accessible Charge table; mobile replaces it with labeled Charge cards. Inputs use 44px targets, status has text+icon, focus is visible, and reduced-motion handling is present. |

## BF-8 Shared Service Record evidence

| Contract | Result | Evidence |
|---|---|---|
| One shared Service Record per source | **PASS** | A completed Grooming Job with `actualCompletedAt` and a checked-out/completed Hotel Stay with `actualCheckOutAt` create/reuse deterministic source-keyed records in the existing Business envelope. Repeated opens never duplicate a record. |
| Grooming completion evidence | **PASS** | The record captures permitted base service, approved add-ons, assigned staff/resources, Business note, actual completion time, activity timeline, and metadata-only photo foundation. Grooming detail confirms the record is saved; Customer/Pet detail is the active history view. |
| Hotel checkout evidence | **PASS** | The record captures check-in/out dates, room/zone summary, ordinary daily-care completion summary, permitted Business note, and checkout time. Hotel detail confirms the record is saved; Customer/Pet detail is the active history view. Medication, Guardian instructions, Intake, and incident data are excluded. |
| No silent history loss | **PASS** | Reopening a completed Grooming source persists its prior visible record. Re-completion refreshes permitted execution facts in the same record and stores a source-revision snapshot; no duplicate record or active handover lock is introduced. |
| Correction audit | **PASS** | Summary/Business-note corrections are append-only with prior value, reason, staff, timestamp, and duplicate-safe request key. Audit timestamps are monotonic relative to the record and prior events. |
| BF7 reference versus Service Record | **PASS** | Customer/Pet history resolves existing source/Booking Charge status as a short read-only reference. `Paid` does not set service completion, and service completion does not set Paid; history does not mutate Charges, Payments, or revenue. |
| Customer/Pet shared history | **PASS** | Customer and Pet detail use the same selectors and source records in one inline `ประวัติบริการ` timeline/list; no separate history fixture or Business Pet Passport data was created. |
| Privacy / Guardian boundary | **PASS** | Service Record is a Business service record, not a receipt, certificate, Pet Passport, ownership record, or medical record. No protected Passport, Guardian care, Intake, medication, incident, or Guardian photo data is copied. Guardian LINE visibility is planned only. |
| Photos / delivery boundary | **PASS** | Before/after photo fields are metadata-only. There is no uploader, cloud/local photo storage, public share, real Guardian delivery, or print/certificate engine. |
| Responsive and accessibility | **PASS** | Pet photo/avatar anchors each history item; inline details stay readable on desktop and mobile; payment status uses text plus icon; focus and reduced-motion rules remain present. |

## BF-9 Team & Staff Operations evidence

| Contract | Result | Evidence |
|---|---|---|
| Team menu and route | **PASS** | `/business/team` is a live desktop Sidebar, mobile More and Command Palette destination. It renders one Team page with local-prototype, authorization and payroll/HR boundaries visible. |
| Shared member identity and Branch context | **PASS** | The same Team Member record can carry several Branch IDs. Branch switching filters membership without cloning the person; the multi-Branch fixture resolves to one staff ID in Ari and Thonglor. |
| Lightweight directory | **PASS** | The responsive Team list/table hybrid and stacked mobile cards show avatar, name, displayed role, Branch membership, capabilities, active/inactive state, availability and today workload. Local add/edit/active-state controls write the existing browser-local Business envelope. |
| Capability and active-state filtering | **PASS** | Grooming and Hotel-care selectors derive from the shared Team Member capability. Inactive or incompatible members are disabled/rejected, while active eligible members remain assignable. |
| Availability foundation | **PASS** | Working, unavailable, break and time-off intervals are evaluated against an assignment interval. An overlapping break/time-off produces an explicit local unavailable result rather than a silent assignment. |
| Calendar / Booking integration | **PASS** | Existing linked Groomer Resources remain the canonical Booking assignment. The shared evaluator adds staff active, capability, availability and timing checks to Calendar/Booking conflict feedback. |
| Grooming integration | **PASS** | Grooming continues to assign existing Branch Resources; a linked Groomer Team Member is checked before assignment, so an inactive or unavailable groomer cannot be selected silently. |
| Hotel integration | **PASS** | Hotel daily-care tasks can assign the same active Hotel-care Team Member. Branch/capability/availability rejection preserves the task assignment; no Hotel staff fixture or Resource clone was created. |
| Workload and conflict context | **PASS** | Today’s linked Booking/Grooming/Hotel care work derives current, next and conflict/overload context from shared IDs. It is not productivity scoring or a staffing optimizer. |
| Roles and HR boundary | **PASS** | Owner, Manager and Staff are displayed foundation labels only. No real authentication, authorization, permission matrix, payroll, HRIS, attendance, timesheet, leave/recruitment or performance workflow is implemented. |

## BF-6 Hotel operations regression evidence

| Contract | Result | Evidence |
|---|---|---|
| Branch capability gate | **PASS** | Hotel navigation, mobile destination, command-palette command, and operational route are live only when the active Branch enables Hotel. A non-Hotel Branch sees no live Hotel destination and the direct route renders the unavailable state. |
| Booking → Stay | **PASS** | Shared Hotel date-range Bookings project to one Pet-specific Hotel Stay per booked Pet. Booking remains planning state; Stay remains execution state. |
| Shared Intake → check-in | **PASS** | Scanner and the Shared Business Intake Engine carry an explicit `hotelStayId`; successful Intake hands off to the same Stay. No second Intake, Customer, Pet, or Booking flow exists. |
| Stay lifecycle | **PASS** | Reserved/booked, expected, checked-in, staying, ready for pickup/checkout, checked-out, completed, cancelled, and no-show states exist with guarded operational actions. |
| Continuous occupancy | **PASS** | Multi-day Stays render as continuous date spans. The board reports occupied, reserved, and available capacity per room/zone and for the Branch. |
| Room/zone moves | **PASS** | Assign and move validate the requested date interval and capacity before commit. Valid moves retain dated assignment/movement history; invalid moves preserve the original room and show rollback feedback. |
| Daily care | **PASS** | Food, water, activity, cleaning/check, note, and lightweight completion state are supported. Medication requires explicit instructions plus Customer-confirmed Intake authorization linked to the same Stay. |
| Today operations | **PASS** | Arrivals, departures, currently staying, care due, unresolved attention/incident notes, and ready-for-pickup work derive from Hotel Stay state. Processed arrivals/departures remain visible for today's operational history. |
| Calendar integration | **PASS** | Calendar remains the shared planning surface and preserves continuous Hotel Booking spans plus guarded move/resize. Hotel Operations consumes those dates for execution/occupancy without duplicating Calendar logic. |
| Home integration | **PASS** | Today's arrivals, departures, occupied/capacity, reserved/available, and attention counts derive from the same Branch Hotel Stay state. |
| Customer/Pet integration | **PASS** | Current and historical Stays appear on the existing Customer detail, using shared Customer and Pet identities. |
| Inbox integration | **PASS** | Stay launches the existing Business+Customer conversation with Pet/Booking context. Business notes, care notes, and incident notes remain internal and are not Conversation messages. |
| Privacy | **PASS** | Customer is not treated as Guardian; Business does not own Passport authority; unknown QR data does not create identities; protected medication action requires explicit Intake authorization. |

## Business font replacement

| Check | Status | Evidence |
|---|---|---|
| Authorized LINE Seed TH source audit | **PASS** | Official LINE Seed Sans TH package from `seed.line.me` was used; its Thai package is released under SIL Open Font License 1.1 and no `/workfiledesign` source was modified |
| Webfont selection | **PASS** | Official package already includes Web/WOFF2 assets; Regular and Bold are the only faces referenced by Business CSS, with no re-encoding or synthetic generation |
| Business font family | **PASS** | Business/public Business uses local `LINE Seed Sans TH` through `--font-meaw-business` |
| Business weights | **PASS** | Loaded faces are Regular 400 and Bold 700; `font-synthesis: none` is enabled, semantic 500/600 declarations resolve to those faces, and computed Business UI never exceeds 700 |
| Font loading | **PASS** | Local `@font-face` declarations use `font-display: swap`; FC Minimal and Anuphan are no longer in Business loading |
| Consumer boundary | **PASS** | Consumer remains Noto Sans Thai/Sriracha unchanged and paused; no Consumer font token was changed |
| Font payload | **PASS** | The two referenced LINE Seed WOFF2 files total 59,000 bytes before transfer compression; the repository's ExtraBold asset is unreferenced and therefore not loaded |
| Thai/UI surfaces | **PASS** | Business typography rules cover body, headings, buttons, inputs, tables, Calendar, modal, badge, Header and Sidebar |

## Consumer / Guardian direction correction

| Boundary | Status | Evidence |
|---|---|---|
| **CURRENT** Consumer web prototype | **PASS** | Existing standalone Consumer routes remain in the repository and are documented as retained/frozen. |
| **TARGET** LINE-first Guardian experience | **PASS** | Conceptual flow is documented as LINE → Login → My Pets → Add Pet → Pet Passport. |
| **PAUSED** Consumer development | **PASS** | Business remains the primary product; no Consumer implementation or redesign phase was started. |
| **NOT IMPLEMENTED** LINE Login / LINE Mini App / LINE notifications / production Guardian identity linking | **PASS** | Documentation explicitly preserves these boundaries and creates no LINE routes. |
| LINE identity vs Pet ownership | **PASS** | Architecture and decisions preserve `Person → Guardian relationship → Pet`; LINE is only an entry/authentication channel. |
| Consumer regression coverage | **PASS** | Existing Consumer automated contracts remain listed and are preserved until a future migration explicitly replaces them. |

## Browser and responsive evidence

Current in-app browser pass used the local development server, eight explicit widths, and DOM geometry after reflow. No page-level horizontal overflow remained at **320, 375, 390, 430, 768, 1024, 1200 or 1440px**. Dense tables retain all columns in bounded horizontal scrollers.

An additional **820px** pass checked fully loaded Public, Login, Home, Calendar, Customers/detail, Inbox, Scan, missing-record Intake, Grooming, Hotel, enabled Onnut Daycare, Billing, Reports, Team and both Settings sections. All had document width equal to the 805px content viewport (820px including scrollbar). The final fresh browser session reported no warnings/errors after these navigations.

| Current surface/check | Result | Evidence |
|---|---|---|
| Public `/` and Business Login | **PASS** | All eight widths; mobile public hero places the existing loaded photograph immediately after the headline and before supporting copy/actions. At 390px the photo starts at about 321px with no page overflow. Desktop composition is preserved. Future supplemental modules are explicitly labeled unavailable. |
| Home, Calendar/Booking, Customers/detail, Inbox, Scan | **PASS** | All eight widths; Pet anchors, mobile lists, visible actions and operational navigation retained. |
| Grooming, Hotel, Daycare | **PASS** | All eight widths; capability-aware service destinations; Daycare desktop board and mobile tabs/list inspected directly. |
| Billing, Reports, Team | **PASS after correction** | Fixed Reports 320px customer-card wrapping; contained absolute screen-reader labels inside table scrollports; fixed narrow Team status wrapping. Targeted 320/768/1200 retests passed. |
| Settings/Branches | **PASS** | Profile/Branch forms, add/edit disclosure, shared Team/resource summary and context-correct Team handoff inspected. A QA Branch was created, survived reload, and was deactivated; the context safely fell back. |
| Intake | **PASS** | Missing-record recovery stays Pet-neutral; valid fixture access showed only authorized basic information; record/review/confirm completed via the existing engine. Protected health/Guardian data was not copied. |
| Daycare → history | **PASS** | Maple pickup/completion reduced occupied capacity, preserved the sibling attendance, and appeared in Customer service history. Legacy upcoming/Pet labels were rechecked after the shared-selector correction. |
| Keyboard/dialog | **PASS** | Booking Tab cycle remained inside the dialog across repeated wraps; Escape closed it. Embedded Add Customer rendered one dialog, not nested modal semantics, with no mobile overflow. Shared modal/editor focus recovery is additionally source-tested. |
| Console | **PASS — final reload/navigation pass** | No new browser errors/warnings after the final source fixes. A development-only HMR duplicate-React error from a newly optimized Link import was removed by using the existing plain-link handoff and reloading; it did not recur in the clean pass. |

Earlier BF6 direct-manipulation checks are retained below; these do not imply native device-lab coverage for this checkpoint.

| Surface | Result | Evidence |
|---|---|---|
| Desktop Hotel board | **PASS — in-app browser** | At the 1294px desktop preview width, Today metrics, the continuous room/zone board, per-room capacity, operational groups, and Stay detail rendered without document-level horizontal overflow. |
| Mobile Hotel operations | **PASS — 390×844** | Desktop occupancy is replaced by grouped tabs/lists; Stay detail becomes a bottom sheet; room selection provides a non-drag alternative; fixed navigation does not cover sheet content. |
| Capability switch | **PASS — in-app browser** | Switching from Hotel-enabled Ari to non-Hotel Thonglor removed the live Hotel navigation and command. Switching back restored both. |
| Capacity rollback | **PASS — in-app browser** | Attempting to move active Stay Luna from A01 into reserved B03 reported the conflict and retained A01. |
| Ready-for-pickup span | **PASS — in-app browser** | Hotel Operations presents pickup-day occupancy as an operational marker while Calendar keeps checkout-exclusive planning semantics. |
| Billing desktop/mobile | **PASS — source and executable contracts** | Desktop renders a labeled Charge table and mobile switches to labeled Charge cards; the route, status labels/icons, checkout launch parsing, and shared revenue selector are covered by rendered/source and state contracts. |
| Customer/Pet Service Record history | **PASS — source and executable contracts** | Customer/Pet detail renders one inline `ประวัติบริการ` timeline/list with Pet visual anchors, expandable service details, BF7 reference, correction/source-recompletion audit and privacy exclusions; no standalone route or handover surface is rendered. |
| Team directory desktop/mobile | **PASS — rendered and executable contracts** | Desktop renders the readable Team list/table hybrid; mobile stacks the same avatar, Branch, capability, status and workload priority. Local add/edit uses the shared focus-managed modal and no emoji/dark-theme UI is introduced. |
| Motion/accessibility | **PASS — source and executable contracts** | Labeled controls, semantic text alongside color, 44px mobile controls, reduced-motion fallback, and non-drag room/status actions are retained. This is not device-lab certification. |

## Documentation and design-system checks

| Check | Result |
|---|---|
| Canonical Markdown owners | **PASS** — Product, Architecture, Backend Readiness, Module Map, Routes, User Flows, UX Rules, Decisions, Current Implementation, Roadmap, and Validation distinguish BE2 durable Customer/Pet truth from remaining local domains and unimplemented Guardian authority. |
| Derived HTML manual | **PASS** — updated last after canonical BE2 Markdown and validation evidence, without becoming another source of truth. |
| Manual structure and responsive QA | **PASS** — 14 panels, 14 matching tabs, 17 capabilities, 23 resolved internal anchors and 6 existing relative document/asset paths. All panels were exercised at 320/390/1440px; the reference table and Roadmap overflow were corrected and rechecked. Business typography specimens and 16px mobile input sizing match their labels; fresh manual console was clean. |
| Broken relative Markdown links | **PASS — automated/source audit** |
| Stale legacy references | **PASS — standalone CareProof route/module/workflow wording removed; explicit superseded decision trace remains historical** |
| Business visual system | **PASS** — Warm White/light only; Billing and Service Record history use semantic status colors with text/icons, inline detail behavior, Pet visual anchors, and Brand Yellow remains the primary CTA. |
| Icon and theme boundary | **PASS** — Lucide wrappers remain; no Emoji/Dingbat UI icons and no Business dark theme/toggle were added. |
| Shared Business Intake Engine | **PASS** — reused by Grooming, Hotel and Daycare with explicit target identity; no parallel service-specific Intake flow. |
| Hybrid identity model | **PASS** — `Person → Business → Branch → Enabled Service Modules`; Customer/Guardian/Pet/Passport boundaries remain unchanged. |
| `/workfiledesign` boundary | **PASS — untouched** — no status or diff entry is present. |
| Platform wording | **PASS** — Cloudflare is the target platform direction; production remains **NOT DEPLOYED / NOT VERIFIED**. |

## Regression and boundary evidence

| Boundary | Result |
|---|---|
| BF1–BF9 regression | **PASS** — Home, Calendar/Booking, Customers/Pets, Inbox, Shared Intake, Grooming, Hotel, Billing, Payment, Reports, Team, Service Record and revenue executable contracts remain green. |
| Grooming and Hotel lifecycle | **PASS** — BF5/BF6 operational states remain guarded and distinct from BF7 Payment; completion/checkout creates the shared Service Record without a separate workflow. |
| Consumer development | **PAUSED / unchanged** — existing Consumer routes and Noto Sans Thai visual system remain frozen; no LINE Mini App or Consumer Inbox was started. |
| Billing / Payment foundation | **PASS — LOCAL ONLY** — Charge, Payment, checkout, shared revenue, customer history, and branch attribution are implemented without a gateway or accounting system. |
| Shared Service Record foundation | **PASS — LOCAL ONLY** — source-keyed Service Records, permitted completion evidence, shared Customer/Pet history, correction/source-recompletion audit and BF7 read-only reference are implemented without a standalone module, handover workflow, Guardian delivery or a document system. |
| Team & Staff Operations foundation | **PASS — LOCAL ONLY** — shared multi-Branch Team Members, capabilities, lightweight availability, active-state and workload are reused by Calendar/Booking, Grooming and Hotel care. Displayed roles are not real authorization; payroll/HR and full workforce scheduling are excluded. |
| BE1 Backend / Database / server authorization | **PASS — IMPLEMENTED LOCALLY** |
| BE2 Customer / Pet Backend / tenant authorization | **PASS — IMPLEMENTED LOCALLY** |
| Production authentication / deployment | **NOT IMPLEMENTED** |
| Advanced room/dynamic pricing and full inventory | **NOT STARTED** |
| Full medical/care, full Incident Management, certificate/print Service Records, Guardian visibility, and real photo storage | **NOT STARTED** — BF6 contains only authorized lightweight care and internal attention notes; BF8 remains a bounded Business-side service record. |
| BF10–BF12 | **PASS — LOCAL FRONTEND COMPLETE**; no next phase started |

## Planning versus execution boundary

Calendar owns Booking dates, planning availability, continuous spans, move, and resize. Grooming, Hotel and Daycare own their operational Job/Stay/Attendance lifecycles and automatically create/update one shared Service Record when complete. Billing owns Charge lines, Payment allocations, balance/status derivation, and local checkout review; Service Record owns permitted completion evidence and correction/source-recompletion audit without taking over financial or operational state. Team owns shared member membership/capability/availability/workload context; Settings edits the shared Business/Branch configuration. CRM only derives relationship/timeline facts. Customer/Pet identity, Branch Resources, Shared Intake, Inbox Conversation and Team Member remain shared records; no service-specific identity copies or parallel financial/history stores were created.

## Automated test suite contracts

1. Root Business Operating Platform landing page (`/`) copy, one Business H1, CTAs, product preview, multi-service story, trust, and metadata.
2. Homepage component composition, honest status wording, real Header anchors, floating glass direction, rounded Footer, Warm White/Pastel Yellow tokens, reduced motion, and responsive CSS contract.
3. Public landing independence from the removed cat sticker directory and photographic asset inventory.
4. Semantic app canvas and separation of Consumer and Business chrome.
5. Anonymous create flow, crop, name, species, and draft recovery.
6. Passport preview, 6 themes, and 4:5 export.
7. Consumer Login mock handoff.
8. My Pets, Pet Detail, and honest Activity categories.
9. Quick Passport 5-minute QR contract.
10. Public Safety profile, Lost activation, Finder lead, and abuse reporting.
11. Temporary Business Sharing, scope, duration, and consent gateway.
12. `/business` compatibility redirect to `/`.
13. Business Login mock authentication and returnTo handling.
14. Business Home three-variant Spotlight with accessible overlaid arrows, transform-only mounted-image track, touch swipe, square composition, 50:50 desktop layout capped at 400×400px, existing local image reuse, quick actions, priority overview, booking-derived today counts, and shared Payment-derived revenue with separate unpaid balance (`/business/home`).
15. Branch switcher and capability-aware navigation (Ari, Thonglor, Onnut), including live Billing/Reports/Team/Settings and enabled Grooming/Hotel/Daycare destinations, with no standalone CareProof route or fake link. Loyalty remains a planned Customer CRM block, not a navigation item.
16. BF-2 Sunday-first Day/Week/Month/Custom Calendar using the shared keyboard segmented component, remembered view cookie, 28/35/42-day ranges, compact status-surfaced cards without visible status dots, continuous Hotel spans, time-positioned appointments, Today scroll/focus, mobile Agenda, and date-normalized Booking Editor (`/business/calendar`).
17. Pure appointment/Hotel move and both-edge shrink/extend adapter, drag-layer pointer passthrough, duration/night preservation, touch pointer affordances, Ctrl/Cmd copy-paste/undo, Delete/Escape/arrow/Home/End navigation, Alt-drag copy, existing availability evaluator, specific conflict recovery, capacity checks, and duplicate confirmation prevention.
18. Shared icon + label + tint service identity and Branch-enabled visual service selection; typeahead Customer and Pet-image controls, automatic availability feedback, and inline Add Customer/Add Pet reuse without a second relationship store.
19. Customers & Pets counted booking filters without a Passport-connection filter, Business-scoped BE2 search, readable operational rows/mobile summaries, responsive detail routes and multiple-Pet snap/peek, durable add/edit actions, warning-only duplicates, durable tags/notes, explicit non-authoritative Passport compatibility, and stable-ID Booking preselection.
20. Customer/Guardian/Passport boundaries, source labels, access presentation, known Intake relationship reuse, and no auto-create from unknown QR.
21. Scanner and Intake QR type rejection, consent checks, belongings logging, and check-in completion.
22. BF-4 contextual route/list/split UI, Customer/Pet/Booking projection, one-boundary search, compact filters, unread, local send, three default quick replies, remembered collapse state, dashed add action, and absence of a needless dynamic Conversation route.
23. BF-4 pure state reducers: Business+Customer reuse, cross-Branch continuity, request waiting state, Guardian-owned duplicate-safe decision, and no Booking/Charge effect for unlinked requests.
24. BF-4 Customer Detail, Booking, Home and live desktop/mobile navigation integration plus privacy/accessibility/responsive source contracts.
25. BF-5 capability-aware Grooming route/navigation, aligned full-surface status Pet cards, pointer-following reversible desktop/touch drag, touch drop/swipe, grouped mobile status alternative, protected-data absence, reduced motion, and responsive board containment.
26. BF-5 pure Grooming Service Job selectors/reducer: Booking remains distinct, guarded valid/invalid lifecycle, actual timing, completed history, enabled-Branch behavior, and shared Resource collision detection.
27. BF-5 Calendar/Intake/Inbox/Customer/Home integration: one shared Job identity, Guardian-only approved add-on affecting only Job duration/add-ons at approval time, then idempotent checkout reconciliation into a BF7 Charge only when staff explicitly opens Billing.
28. BF6 capability-aware Hotel route/navigation, Booking-to-Pet-specific-Stay projection, multi-day occupancy, capacity collision and rollback, movement history, lifecycle, authorized care completion, Today summary math, internal-note privacy, and Home/Calendar/Customer/Inbox/Shared Intake integration.
29. BF7 Billing route/UI: live navigation, Home/Customer links, local optional Inbox message, Charge table/mobile cards, status text+icon, explicit Grooming/Hotel checkout, and no gateway/LINE/accounting implementation.
30. BF7 state: Charge ≠ Payment, whole-THB validation, derived unpaid/partial/paid/cancelled status, manual adjustment/discount/cancellation reason rules, overpayment guard, payment idempotency, branch isolation, shared revenue, customer history, and one booking-level base Charge for paired Pets.
31. BF8 shared Service Record domain/UI: automatic Grooming/Hotel record creation/update, no standalone CareProof route/menu/dashboard, inline Customer/Pet `ประวัติบริการ` timeline/list, Pet visual anchors, permitted summary/timeline/details, metadata-only photos, short BF7 reference, correction/source-recompletion history, and no Guardian/LINE/document implementation.
32. BF8 state: source-keyed Grooming/Hotel record creation, duplicate prevention, completion persistence across Grooming reopen/re-completion, monotonic correction/source audit, payment/service separation, Customer/Pet shared history, Branch isolation, and privacy exclusions.
33. BF1–BF9 Business content-density contracts: shared optional Page Header, no obsolete operational eyebrow/heading stacks, one-title Booking editor, responsive Customer table/card hierarchy, responsive Hotel desktop-board/mobile-list split, responsive Billing, inline Service Record history, and responsive Team list/table-to-card hierarchy without repeated record-level demo suffixes.
34. Calm operational Business styling, scoped LINE Seed Sans TH, exact semantic tokens, Lucide wrappers, forms/badges/overlays/loading, responsive behavior and reduced motion.
35. Cloudflare direction / Vercel supersession documentation and absence of a production-deployment claim.
36. Absence of scattered raw color values and Emoji in component source; no Business dark theme/toggle, no active Rainbow CTA, and loading-only multi-accent indeterminate progress.
37. Consumer regression contracts remain preserved while the future LINE Mini App direction is documented without implementation.
38. LINE Seed Sans TH Business webfonts, loaded 400/700 faces, 16px operational body with 14px supporting text, maximum weight 700, `font-display: swap`, `font-synthesis: none`, no FC Minimal/Anuphan loading, and no Consumer font change.
39. BF9 Team route/UI: live desktop/mobile/Command Palette navigation, one page heading, responsive directory/modal controls, avatar anchors, Branch/capability/status/workload context and explicit authorization/payroll/HR exclusions.
40. BF9 shared state: multi-Branch member identity, no Grooming/Hotel staff fixture duplication, linked Resource staff mapping, active/capability/availability guards, Calendar/Booking and Grooming rejection, Hotel care assignment rollback, and derived workload/conflict context.
41. BF10 configuration: Branch/profile persistence, hydration fixtures, scope/last-active/duplicate/hour guards, dynamic service/resources, capability-aware navigation and shared Team/resource Settings disclosure.
42. BF11 Daycare: Pet-specific Booking projection, guarded lifecycle/capacity/zone/staff changes, shared Charge and Service Record; scoped/idempotent Intake reuse, target identity and capacity-race rejection.
43. BF12 CRM: pure segments/timeline/balances, no duplicate store, activity-reference-day upcoming rules, multi-Pet partial completion and list/detail/Pet-card consistency.
44. BE1: Person/membership/Business/Branch authorization, configuration persistence, audit, constraints and reopen durability.
45. BE2: Customer/Pet CRUD/lifecycle/search/duplicates/relationships, Business-wide identity, tenant/spoof denial, role behavior, audit minimization, migration constraints/indexes, cache compatibility and reopen durability.
46. BE3: appointment/date-range/day and multi-Pet Booking persistence, canonical BE2 references, range/customer/resource queries, active Branch/module/hours/Resource availability, create/edit/reschedule/assign/cancel, typed conflicts, competing-write protection, idempotent create, optimistic revision, tenant/spoof denial, audit minimization, migration constraints/indexes/triggers, cache compatibility and reopen durability.

## Partially validated / not in scope

- Backend domains after BE3 and signed QR cryptographic verification. BE1 identity/Business/Branch, BE2 Customer/Pet and BE3 Booking/Calendar/planning Resource persistence, migrations and server scope are validated above. BE4 service execution is not started.
- Real payment gateway processing, bank confirmation/reconciliation, VAT invoice generation, refunds, General Ledger, and full accounting.
- Native mobile camera hardware permissions.
- Real messaging transport, sockets, delivery/read synchronization, attachment storage, notifications, full Consumer Inbox, retention/deletion policy, and production Guardian response identity.
- LINE Login, LINE Mini App, LINE notifications, and production Guardian identity linking; these are future Consumer-phase work and are not represented by repository routes.
- Cloudflare Worker/Vinext + D1 is the BE1–BE3 local architecture; production resources, custom domain deployment and production verification remain not started.
- Local browser QA is not a production device-lab, native camera-hardware, screen-reader, or assistive-technology certification.
- The in-app browser controller did not synthesize a native Hotel desktop drag gesture. Native drag/drop handlers, capacity preview, rollback source contracts, and the mobile room selector are covered by executable tests plus direct conflict interaction; this is not a device-lab certification.
- Billing visual checks are source/rendered/executable contracts rather than a payment-terminal, banking, or device-lab certification.
- Service Record visual checks are source/rendered/executable contracts rather than a Guardian-facing document, photo-storage, print, or device-lab certification.
- Team visual checks are rendered/source/executable contracts rather than a workforce-scheduling, attendance, payroll, HR or production authorization certification.

## Stop condition

BE1 completes identity / Business / Branch, BE2 completes Customer / Pet and BE3 completes Booking / Calendar planning plus minimal Resource persistence. **Production Ready: NO.** BF1–BF12 remains frozen, standalone CareProof/Handover is superseded and Consumer remains paused. No commit, push or deployment was performed; `/workfiledesign` was not changed. Stop here: **BE4 is not started**. Production authentication, Guardian/Passport/Consent, service-operations backend, payroll/HR, payment-provider integration, production deployment, LINE, media/R2, certificate/print and Consumer work do not start automatically.
