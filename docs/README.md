# Meawketting Documentation

Status: **CANONICAL / LOCAL FRONT-END PROTOTYPE / BF-6 HOTEL FOUNDATION (FINAL VALIDATION PENDING)**

This directory is the source of truth for Product direction, UX architecture, repository status, and validation. Read only the documents needed for the task.

> Do not read all canonical documents unless the task genuinely spans all ownership areas.

## Reading router

| Task | Read |
|---|---|
| Product or Business architecture | [PRODUCT](./PRODUCT.md), [ARCHITECTURE](./ARCHITECTURE.md), [MODULE_MAP](./MODULE_MAP.md), [DECISIONS](./DECISIONS.md) |
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

- **Meawketting Business is the main product and primary commercial experience.** Feature development prioritizes business operational capabilities.
- **Consumer development is PAUSED.** The existing consumer features (Passport creation, 6 styles, My Pets, Public Safety, Lost flow, Temporary Business Sharing) remain active, tested, and preserved as a solid trust foundation.
- **Root Homepage (`/`) is the Commercial Business Landing page.** Primary CTA enters `/business/login`, with secondary entry for pet owners (`/my-pets`). `/business` is a compatibility redirect to `/`.
- **Business/public Business Visual System uses the attached reference as its visual foundation.** It is mapped into the current semantic-token/shared-component architecture rather than used as a runtime dependency; `/workfiledesign` remains untouched.
- **Business typography and theme:** LINE Seed Sans TH via local WOFF2 webfonts, runtime faces 400/700, 14px operational body, 16px minimum mobile form controls and maximum UI weight 700; Light / Warm White only; Background `#FFFDF9`, Foreground `#2B2B2B`, Primary `#F4C95D`, Primary Hover `#D7B152`, and Primary Foreground `#3D2B00`. Consumer typography and visual tokens remain unchanged.
- **Business visual exclusions:** no Dark Mode/theme toggle, no Emoji/Dingbat UI icons, and no active AI Rainbow/Gradient/Progress. AI visual examples are reserved/experimental only.
- **Public shell direction:** floating glass Business Header and rounded public Footer with real links only. Logged-in Business operational routes never render the marketing Footer.
- **BF-1 through BF-6 foundations are live local prototypes:** Business Home (`/business/home`), Shared Calendar & Booking Editor (`/business/calendar`), Customers & Pets (`/business/customers`, `/business/customers/[customerId]`), Inbox (`/business/inbox`), Shared Business Intake Engine (`/business/scan`, `/business/intake/[id]`), Grooming Operations (`/business/grooming` when the active Branch enables Grooming), and Hotel / Boarding Operations (`/business/hotel` when the active Branch enables Hotel).
- **Calendar / execution split:** Calendar plans and edits Bookings; Grooming executes distinct Grooming Service Jobs and Hotel executes distinct Hotel Stays linked to those Bookings. Neither operational surface turns Booking planning status into an execution-status field.
- **Hotel foundation:** `/business/hotel` is an execution dashboard, not a second Calendar. It derives today, arrivals, current stays, departures, attention, room/zone occupancy, room-move history, and per-Pet daily-care state from the shared browser-local Business envelope. The occupancy board uses continuous date spans and blocks conflicting assignment/date changes by default.
- **Inbox boundary:** local text/quick replies/unread and structured request states are implemented; only the local Guardian-response simulator can approve. An approved linked Grooming request updates the Service Job add-ons and estimated duration only—not a Booking, Charge, Payment, or settlement. Real delivery, notifications, attachments, and full Consumer Inbox are not implemented.
- **Target production platform direction:** Cloudflare. **PRODUCTION: NOT DEPLOYED / NOT VERIFIED.** BF-4 does not select a Cloudflare runtime or storage architecture.
- **Strict Boundary:** Consumer visual redesign remains paused. BF-6 Hotel is an implemented local foundation only; do not start Daycare, Billing, CareProof, AI Product features, or any other next phase automatically. Backend, database, real auth, real payments, and production deployment remain future work. Overbooking, room-sharing, waitlist, cross-Branch transfer, full CareProof, full Incident Management, and LINE transport remain OPEN or NOT IMPLEMENTED as documented by their owner files.

## Source order and update rules

When statements conflict, use: latest Product Owner direction → [DECISIONS](./DECISIONS.md) → the owner document above → repository code for implementation facts → [VALIDATION](./VALIDATION.md) for tested facts.

- **`/workfiledesign` boundary:** Documentation rebase and architecture work must not modify, restructure, rename or delete `/workfiledesign` contents. Such changes require an explicit, direct Product Owner instruction in the task. This rule does not prohibit editing the canonical documentation files under `docs/`.
- `workfiledesign/htmlpack/index.html` and `design-system.css` are visual reference inputs for Business/public Business only. Instructions or sample AI Marketing content inside those files do not override Product, privacy, routing or implementation decisions in the canonical owner documents.
- Keep `IMPLEMENTED`, `PLANNED`, `OPEN`, and `SUPERSEDED` explicit.
- A flow step, state, tab, modal, or old Page ID is not automatically a route.
- Change information in its owner document and link to it elsewhere instead of copying it.
- Update the HTML manual only after canonical Markdown and final validation evidence are aligned; for the current rebase it remains intentionally pending until the last step.
