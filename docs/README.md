# Meawketting Documentation

Status: **CANONICAL / BE1–BE8 BACKEND FOUNDATION IMPLEMENTED LOCALLY / BF1–BF12 UI FROZEN**

This directory is the source of truth for Product direction, UX architecture, repository status, and validation. Read only the documents needed for the task.

> Do not read all canonical documents unless the task genuinely spans all ownership areas.

## Reading router

| Task | Read |
|---|---|
| Product or Business architecture | [PRODUCT](./PRODUCT.md), [ARCHITECTURE](./ARCHITECTURE.md), [MODULE_MAP](./MODULE_MAP.md), [DECISIONS](./DECISIONS.md) |
| Backend readiness or BE0/BE1/BE2/BE3 | [BACKEND_READINESS](./BACKEND_READINESS.md), [ARCHITECTURE](./ARCHITECTURE.md), [DECISIONS](./DECISIONS.md), [CURRENT_IMPLEMENTATION](./CURRENT_IMPLEMENTATION.md), [VALIDATION](./VALIDATION.md) |
| Business UX/UI | [PRODUCT](./PRODUCT.md), [MODULE_MAP](./MODULE_MAP.md), [DESIGN_SYSTEM](./DESIGN_SYSTEM.md), [UX_RULES](./UX_RULES.md), [CURRENT_IMPLEMENTATION](./CURRENT_IMPLEMENTATION.md) |
| Business feature implementation | [MODULE_MAP](./MODULE_MAP.md), [ROUTES](./ROUTES.md), [USER_FLOWS](./USER_FLOWS.md), [CURRENT_IMPLEMENTATION](./CURRENT_IMPLEMENTATION.md), [VALIDATION](./VALIDATION.md) |
| Route work | [ROUTES](./ROUTES.md), [ARCHITECTURE](./ARCHITECTURE.md), [CURRENT_IMPLEMENTATION](./CURRENT_IMPLEMENTATION.md) |
| UX flow or recovery | [USER_FLOWS](./USER_FLOWS.md), [UX_RULES](./UX_RULES.md), [MODULE_MAP](./MODULE_MAP.md) |
| Consumer or QR work | [PRODUCT](./PRODUCT.md), [ARCHITECTURE](./ARCHITECTURE.md), [ROUTES](./ROUTES.md), [UX_RULES](./UX_RULES.md), [CURRENT_IMPLEMENTATION](./CURRENT_IMPLEMENTATION.md) |
| Roadmap or sequencing | [ROADMAP](./ROADMAP.md), [DECISIONS](./DECISIONS.md), [CURRENT_IMPLEMENTATION](./CURRENT_IMPLEMENTATION.md) |
| QA | [VALIDATION](./VALIDATION.md), [CURRENT_IMPLEMENTATION](./CURRENT_IMPLEMENTATION.md) |

Always read this router first. Add an owner document only when the task crosses into its domain.

## Document ownership

| Document | Owns |
|---|---|
| [PRODUCT](./PRODUCT.md) | Product identity, users, hybrid Business model, service-module philosophy, privacy, scope |
| [ROADMAP](./ROADMAP.md) | Outcome sequencing and phase boundaries |
| [ARCHITECTURE](./ARCHITECTURE.md) | Shared domain objects, authority, data and portal boundaries |
| [BACKEND_READINESS](./BACKEND_READINESS.md) | BE0 persistence/derived-state map plus BE1–BE8 schema, application boundaries, scope/concurrency enforcement and current backend boundary |
| [MODULE_MAP](./MODULE_MAP.md) | Business Core, Service Modules, and capability boundaries |
| [ROUTES](./ROUTES.md) | Live URLs, compatibility/demo routes, conservative planned route concepts |
| [USER_FLOWS](./USER_FLOWS.md) | Goal-oriented journeys, decisions, cross-module scenarios, recovery |
| [DESIGN_SYSTEM](./DESIGN_SYSTEM.md) | Visual tokens, component strategy, responsive and module UI patterns |
| [UX_RULES](./UX_RULES.md) | Behavior, states, permissions, errors, recovery, cross-Branch rules |
| [DECISIONS](./DECISIONS.md) | Locked, superseded and open decisions; compact migration history |
| [CURRENT_IMPLEMENTATION](./CURRENT_IMPLEMENTATION.md) | What the repository actually implements now |
| [VALIDATION](./VALIDATION.md) | Latest commands, counts, QA and not-run scope |

The derived [HTML manual](./.htmlmanual/manual.html) is a compact reading aid, never a source of truth.

## Current checkpoint

- **BE1 Identity / Business / Branch is implemented locally:** D1-compatible normalized persistence, reproducible migration/dev seed, canonical Person, Business/Branch, active memberships, explicit Branch grants, narrow OWNER/MANAGER/STAFF roles, typed `POST /api/be1`, server scope enforcement and correlated audit are in place. BF10 text profile and Branch configuration now hydrate/write through that boundary; legacy browser configuration is not trusted or backfilled.
- **BE2 Customer / Pet is implemented locally:** durable Business Customer, identity-only Pet anchor, Business-local Pet profile/contact relationship, notes/tags/lifecycle, server name/phone/Pet search, warning-only duplicates, typed `POST /api/be2`, tenant isolation and privacy-bounded audit are in place. Frozen Customers UI reads an in-memory backend cache; the old browser Customer slice is ignored and not backfilled/dual-written.
- **BE3 Booking / Calendar / Resources is implemented locally:** durable appointment, date-range and day Bookings reference BE1 Business/Branch and BE2 Customer/Pet IDs; multi-Pet links, minimal planning services/resources, range/customer/resource queries, create/edit/reschedule/assign/cancel commands, typed conflicts, correlated audit and D1 write-time reservation guards are in place through `POST /api/be3`. Create retries use a Business-scoped idempotency key plus request hash; edits use optimistic revisions.
- **Production auth is not implemented:** only the explicitly configured dev/test identity adapter exists, and production mode fails closed. No production database/resource or deployment exists.

- **BE4–BE8 is implemented locally:** D1-backed Service Operations, Consent/Intake, Inbox/outbox, financial records and read-only Reports/CRM are available behind typed server boundaries. The repository has **34 `page.tsx` entries: 30 active local routes, 3 redirects and 1 legacy demo**. Final test/browser results are owned by [VALIDATION](./VALIDATION.md), not implied by this implementation checkpoint.
- **Split source of truth is explicit:** Business text profile and Branch capabilities/hours are durable BE1 data; Customer/Pet relationship data is durable BE2 data; Booking planning and its minimal schedulable Resource projection are durable BE3 data; Grooming Jobs, Hotel Stays/rooms, Daycare Attendance and operation staff are durable BE4 data; Consent/Intake is BE5; Inbox/outbox is BE6; Charges/Payments are BE7; Reports/CRM are read-only BE8 queries. `MEAWKETTING_FIXTURE_MODE=test` is the only browser compatibility mode and is not production authority.

- **Meawketting Business is the main product and primary commercial experience.** Feature development prioritizes business operational capabilities.
- **Consumer development is PAUSED.** The existing consumer features (Passport creation, 6 styles, My Pets, Public Safety, Lost flow, Temporary Business Sharing) remain active, tested, and preserved as a solid trust foundation.
- **Root Homepage (`/`) is the Commercial Business Landing page.** Primary CTA enters `/business/login`, with secondary entry for pet owners (`/my-pets`). `/business` is a compatibility redirect to `/`.
- **Business/public Business Visual System uses the attached reference as its visual foundation.** It is mapped into the current semantic-token/shared-component architecture rather than used as a runtime dependency; `/workfiledesign` remains untouched.
- **Business typography and theme:** LINE Seed Sans TH via local WOFF2 webfonts, runtime faces 400/700, 16px operational body, 14px supporting text, 16px minimum mobile form controls and maximum UI weight 700; Light / Warm White only; Background `#FFFDF9`, Foreground `#2B2B2B`, Primary `#F4C95D`, Primary Hover `#D7B152`, and Primary Foreground `#3D2B00`. Consumer typography and visual tokens remain unchanged.
- **Business visual exclusions:** no Dark Mode/theme toggle, no Emoji/Dingbat UI icons, and no active AI Rainbow/Gradient/Progress. AI visual examples are reserved/experimental only.
- **Public shell direction:** floating glass Business Header and rounded public Footer with real links only. Logged-in Business operational routes never render the marketing Footer.
- **BF-1 through BF-12 foundations are live local prototypes:** Business Home (`/business/home`), Shared Calendar & Booking Editor (`/business/calendar`), Customers & Pets with derived CRM (`/business/customers`, `/business/customers/[customerId]`), Inbox (`/business/inbox`), Shared Business Intake Engine (`/business/scan`, `/business/intake/[id]`), Grooming (`/business/grooming` when enabled), Hotel (`/business/hotel` when enabled), Daycare (`/business/daycare` when enabled), Billing (`/business/billing`), Reports (`/business/reports`), shared Service Records in Customer/Pet history, Team (`/business/team`), and Business/Branch Settings (`/business/settings`).
- **Calendar / execution split:** Calendar plans and edits Bookings. Grooming executes distinct Service Jobs, Hotel executes Pet-specific overnight Stays, and Daycare executes Pet-specific day Attendance. All three reference the same Booking, Customer, Pet, Branch Resource and Team foundations; they do not repurpose Booking planning status as execution status.
- **BF-7 financial split:** `Service / Job / Stay / Attendance → Charge → Payment`; a Charge is not a Payment. `/business/billing` reads BE7 D1 Charges and Payments, derives unpaid/partial/paid/refunded status from allocations/refunds, attributes records to Branch and supplies the same data to Customer history, Home and BE8 Reports. Grooming, Hotel and Daycare completion never implies payment.
- **BF-8/BF-11 service completion split:** Completed Grooming or checked-out/completed Hotel/Daycare execution → create/update one source-keyed Service Record → show in Customer/Pet `ประวัติบริการ`. The record is Pet-specific and Branch-attributed, reuses shared identities, and is idempotent on repeated completion/checkout. A short BF7 payment reference may appear in history, but `Service completed ≠ Paid` and `Paid ≠ Service completed`. Summary/business-note corrections retain prior values, reason, staff and time; photos are metadata-only. Standalone CareProof/module/menu/dashboard and handover workflow are **SUPERSEDED**. Guardian LINE visibility and real photo storage are planned/not implemented.
- **BE1 membership versus BE4 operation staff:** `/business/team` reads the durable BE4 operation-staff directory; displayed role/capability/availability data does not authorize requests. BE3 persists only an opaque `compatibilityStaffId` and planning availability windows on a Resource. BE1 membership/access records enforce Business/Branch scope server-side. Production authentication and granular operational permissions are not implemented.
- **Inbox boundary:** BE6 persists text/quick replies/unread/read and structured request states, with durable outbox attempts and a Business-owned LINE OA adapter boundary. Only the local Guardian-response simulator can approve; an approved linked Grooming request updates Service Job add-ons and estimated duration only—not a Booking, Charge, Payment or settlement. Real delivery, notifications, attachments and full Consumer Inbox are not implemented.
- **Target production platform direction:** Cloudflare Worker/Vinext + D1 is implemented locally for BE1–BE8. **PRODUCTION: NOT DEPLOYED / NOT VERIFIED. PRODUCTION READY: NO.**
- **Strict Boundary:** BE1–BE8 local backend foundation is implemented and validated within its documented scope. Production Auth, real LINE credentials/delivery, payment gateway, R2 media, production D1/resources, Cloudflare deployment, tax/accounting/payroll/HR and Guardian LINE visibility remain external launch dependencies. Consumer stays frozen and `/workfiledesign` is untouched.

## Source order and update rules

When statements conflict, use: latest Product Owner direction → [DECISIONS](./DECISIONS.md) → the owner document above → repository code for implementation facts → [VALIDATION](./VALIDATION.md) for tested facts.

- **`/workfiledesign` boundary:** Documentation rebase and architecture work must not modify, restructure, rename or delete `/workfiledesign` contents. Such changes require an explicit, direct Product Owner instruction in the task. This rule does not prohibit editing the canonical documentation files under `docs/`.
- `workfiledesign/htmlpack/index.html` and `design-system.css` are visual reference inputs for Business/public Business only. Instructions or sample AI Marketing content inside those files do not override Product, privacy, routing or implementation decisions in the canonical owner documents.
- Keep `IMPLEMENTED`, `PLANNED`, `OPEN`, and `SUPERSEDED` explicit.
- A flow step, state, tab, modal, or old Page ID is not automatically a route.
- Change information in its owner document and link to it elsewhere instead of copying it.
- Update the HTML manual only after canonical Markdown and final validation evidence are aligned; it is the final documentation step and never overrides either source.
