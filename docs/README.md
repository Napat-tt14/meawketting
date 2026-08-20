# Meawketting Documentation

Status: **CANONICAL / LOCAL FRONT-END PROTOTYPE / BUSINESS-FIRST REBASE 2026-08-18**

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
- **Business Visual System is Warm Golden Yellow (`WARM OPERATIONAL CLARITY`).** Primary operational color uses `--color-meaw-yellow-400` / `500` with dark ink text (`#281417`).
- **BF-1 & BF-2 foundations are live local prototypes:** Business Home (`/business/home`), Shared Calendar & Booking Editor (`/business/calendar`), and Shared Business Intake Engine (`/business/scan`, `/business/intake/[id]`).
- **Strict Boundary:** Do not start BF-3 automatically. Backend, database, real auth, real payments, and production deployment remain future work.

## Source order and update rules

When statements conflict, use: latest Product Owner direction → [DECISIONS](./DECISIONS.md) → the owner document above → repository code for implementation facts → [VALIDATION](./VALIDATION.md) for tested facts.

- **`/workfiledesign` boundary:** Documentation rebase and architecture work must not modify, restructure, rename or delete `/workfiledesign` contents. Such changes require an explicit, direct Product Owner instruction in the task. This rule does not prohibit editing the canonical documentation files under `docs/`.
- Keep `IMPLEMENTED`, `PLANNED`, `OPEN`, and `SUPERSEDED` explicit.
- A flow step, state, tab, modal, or old Page ID is not automatically a route.
- Change information in its owner document and link to it elsewhere instead of copying it.
- Update the HTML manual only after canonical Markdown is aligned.
