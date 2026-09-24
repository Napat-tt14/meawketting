# Meawketting Documentation

Guardian foundation — 2026-09-22: [GUARDIAN_LINE_MINIAPP](./GUARDIAN_LINE_MINIAPP.md) is the main Guardian Product/architecture handoff, owning MVP, audited domain reuse, proposed routes/APIs and decisions. Read it first for Guardian work. **IMPLEMENTED:** Business PostgreSQL/Supabase foundations. **PLANNED:** Guardian Mini App. **PAUSED:** standalone Consumer expansion. **NOT IMPLEMENTED:** real Guardian integration/onboarding/deployment. **PRODUCT DECISION REQUIRED:** authority/disclosure policies. **EXTERNAL DEPENDENCY:** provider/environment configuration. Only type contracts were added; no Guardian runtime.

Status: **CANONICAL / BE1–BE8 BACKEND FOUNDATION IMPLEMENTED LOCALLY / BF1–BF12 UI FROZEN**

Latest checkpoint: [Supabase migration report](./SUPABASE_MIGRATION_REPORT.md), [setup runbook](./PRODUCTION_RUNBOOK.md), [target QA](./PILOT_QA.md). **NOT PRODUCTION READY**.

2026-09-20 addition: [Business signup with Google/LINE](./BUSINESS_REGISTRATION.md), including the approved first-store creation policy and provider setup.

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

Cloudflare Worker/API → Application/Domain → Repository → Supabase PostgreSQL is the only active Business database architecture. Supabase Auth authenticates; Meawketting authorizes Person/Membership/Business/Branch/target/action. Supabase Storage is private media.

BE1–BE8 migration code is IMPLEMENTED and TESTED LOCALLY. External configuration for the selected real Supabase/Cloudflare environment is EXTERNAL CONFIG REQUIRED and NOT YET DEPLOYED. See [validation](./VALIDATION.md) for exact counts and limitations, including the prior BE1/BE2 stale-form/retry follow-up.

Business UI and LINE Seed Sans TH stay frozen. Consumer is PAUSED. /workfiledesign is untouched. No commit/push/deploy.
