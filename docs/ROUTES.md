# Routes

Status: **CURRENT REPOSITORY AUDIT (BUSINESS-FIRST REBASE)**  
Audit date: 2026-08-26
Owner: Product Architecture / Front-end

This file owns URLs and navigation destinations only. Wizard steps, tabs, task states, boards, modals and reusable errors are not routes by default.

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
REPOSITORY ROUTE ENTRIES: 27
ACTIVE LIVE LOCAL ROUTES: 23
COMPATIBILITY REDIRECTS: 3
LEGACY DEMO ROUTES: 1
```

## Active live local routes — 23

| Route | Context / goal | Status and boundary |
|---|---|---|
| `/` | **Business-first Landing (Canonical Commercial Homepage)** | LIVE LOCAL; primary CTA `/business/login`; owner entry secondary |
| `/business/login` | Business Login with mock Google auth | LIVE MOCK; no real membership |
| `/business/home` | Branch-aware Business Home with three-image auto carousel, arrows, desktop banner/action split and operational overview | LIVE LOCAL PROTOTYPE |
| `/business/calendar` | Sunday-first branch-aware Day/Week/Month/Custom Calendar with remembered view, continuous stays, guarded move/both-edge resize, keyboard/Alt copy, touch handlers, mobile Agenda, and Booking Editor | LIVE LOCAL PROTOTYPE |
| `/business/customers` | Search and browse Business-level Customer relationships and linked local Pets in responsive desktop table/mobile cards; filters are booking-based only | LIVE LOCAL PROTOTYPE |
| `/business/customers/[customerId]` | Stable responsive Customer relationship detail with clearer Pets, Booking context, tags, Business notes and primary actions | LIVE LOCAL PROTOTYPE |
| `/business/inbox` | Business-wide Customer conversations with readable split/mobile layouts, compact search/filters, Pet/Booking context, unread state, local send, three default quick replies with remembered visibility, and structured add-service request prototype | LIVE LOCAL PROTOTYPE; `?conversation=`, `?customerId=`, `?petId=`, and `?bookingId=` provide local recovery/context; no real delivery |
| `/business/scan` | Temporary Business QR scan/manual validation | LIVE LOCAL MOCK |
| `/business/intake/[intakeId]` | Allowed data, Intake, consent review, check-in | LIVE LOCAL MOCK |
| `/login` | Consumer web-prototype mock login | LIVE MOCK — CURRENT WEB PROTOTYPE; not LINE Login |
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

The target is a LINE-first Guardian experience:

```text
Add Meawketting LINE → LINE Login → open LINE Mini App → My Pets → Add Pet → Pet Passport
```

This is conceptual and **NOT IMPLEMENTED**. Do not add `/line/*`, Mini App paths, or replacement Consumer routes until a future Consumer phase defines the production channel and identity-linking architecture.

## Planned route concepts (Next milestones)

| Concept | Target Milestone | Purpose |
|---|---|---|
| Billing & Checkout | BF-5 | Combined invoice, multi-service charges, payment status (`/business/billing`) |
| Dedicated Service Boards | M-GROOM / M-HOTEL / M-DAYCARE | Dedicated Grooming Queue, Hotel Room Matrix, Daycare Attendance |
| Business Onboarding | Multi-branch setup | Resumable business setup wizard (`/business/onboarding`) |

## Root homepage anchor destinations

The public Business header uses only anchors that exist on `/`:

| Anchor | Destination |
|---|---|
| `#business-core` | Business Core capability and prototype-status section |
| `#services` | Multi-service business types |
| `#guardian` | Secondary owner / Guardian ecosystem entry |

Header account links use current live web routes: `/login` and `/business/login`. `/login` is the retained Consumer web-prototype mock, not LINE Login. No planned capability receives a fake public route, and no LINE route is implied.

BF-4 intentionally adds no `/business/inbox/[conversationId]` route. Desktop uses a split view, mobile uses a full conversation task, and the stable local selection is recoverable through `?conversation=<id>`; Customer/Booking launch parameters normalize to that query after reusing or creating the Business-level conversation.
