# Routes

Status: **CURRENT REPOSITORY AUDIT (BUSINESS-FIRST REBASE)**  
Audit date: 2026-08-20  
Owner: Product Architecture / Front-end

This file owns URLs and navigation destinations only. Wizard steps, tabs, task states, boards, modals and reusable errors are not routes by default.

## Route count summary

```text
REPOSITORY ROUTE ENTRIES: 24
ACTIVE LIVE LOCAL ROUTES: 20
COMPATIBILITY REDIRECTS: 3
LEGACY DEMO ROUTES: 1
```

## Active live local routes — 20

| Route | Context / goal | Status and boundary |
|---|---|---|
| `/` | **Business-first Landing (Canonical Commercial Homepage)** | LIVE LOCAL; primary CTA `/business/login`; owner entry secondary |
| `/business/login` | Business Login with mock Google auth | LIVE MOCK; no real membership |
| `/business/home` | Branch-aware Business Home and operational overview | LIVE LOCAL PROTOTYPE |
| `/business/calendar` | Branch-aware cross-module Calendar and Booking Editor | LIVE LOCAL PROTOTYPE |
| `/business/scan` | Temporary Business QR scan/manual validation | LIVE LOCAL MOCK |
| `/business/intake/[intakeId]` | Allowed data, Intake, consent review, check-in | LIVE LOCAL MOCK |
| `/login` | Consumer mock login | LIVE MOCK (Preserved) |
| `/my-pets` | Consumer Pet library | LIVE LOCAL MOCK (Preserved) |
| `/activity` | Honest Consumer activity categories | LIVE LOCAL MOCK (Preserved) |
| `/create-passport` | Combined photo/crop/minimum-info task | LIVE LOCAL (Preserved) |
| `/create-passport/preview` | 4:5 Passport preview/styles/export | LIVE LOCAL (Preserved) |
| `/my-pets/[petId]` | Passport-first Pet detail and Quick QR state | LIVE LOCAL MOCK (Preserved) |
| `/my-pets/[petId]/safety` | Demo owner Safety screen | LIVE DEMO FIXTURE BOUNDARY |
| `/my-pets/[petId]/safety/lost` | Owner Lost lifecycle task | LIVE LOCAL MOCK |
| `/my-pets/[petId]/sharing` | Temporary Business Sharing for eligible demo fixtures | LIVE DEMO FIXTURE BOUNDARY |
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

## Planned route concepts (Next milestones)

| Concept | Target Milestone | Purpose |
|---|---|---|
| Customers & Pets CRM | BF-3 | Customer list, search, linked pets, operational tags (`/business/customers`) |
| Business Inbox | BF-4 | Contextual conversations, photo updates, add-on approvals (`/business/inbox`) |
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

Header account links use live routes: `/login` and `/business/login`. No planned capability receives a fake public route.
