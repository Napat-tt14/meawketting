# Current Implementation

Status: **REPOSITORY TRUTH — LOCAL FRONT-END PROTOTYPE / BF-6 HOTEL FOUNDATION**
Audit date: 2026-08-28
Owner: Engineering

```text
LOCAL ONLY / BROWSER-LOCAL MOCK STATE
REAL AUTHENTICATION, AUTHORIZATION AND BUSINESS MEMBERSHIP: NOT IMPLEMENTED
REAL TOKEN SECURITY: NOT IMPLEMENTED
BACKEND AND DATABASE: NOT STARTED
REAL PAYMENTS: NOT IMPLEMENTED
TARGET PLATFORM: Cloudflare
PRODUCTION: NOT DEPLOYED / NOT VERIFIED
BUSINESS DESIGN SYSTEM: ATTACHED REFERENCE MAPPED INTO CURRENT ARCHITECTURE
BUSINESS THEME: LIGHT / WARM WHITE ONLY
BUSINESS FONT: LINE SEED SANS TH — ACTUAL LOADED FACES 400 / 700; MAX UI WEIGHT 700
CONSUMER FONT: UNCHANGED / PAUSED
CONSUMER CURRENT: STANDALONE WEB PROTOTYPE RETAINED / FROZEN
CONSUMER TARGET: LINE-FIRST GUARDIAN EXPERIENCE THROUGH LINE MINI APP
CONSUMER DEVELOPMENT: PAUSED
LINE LOGIN: NOT IMPLEMENTED
LINE MINI APP: NOT IMPLEMENTED
LINE NOTIFICATIONS: NOT IMPLEMENTED
PRODUCTION GUARDIAN IDENTITY LINKING: NOT IMPLEMENTED
```

## Repository facts

- React 19.2.6, Vinext 1.0.0-beta.8, @vitejs/plugin-rsc 0.5.34, Vite 8.0.13 and Tailwind CSS 4.2.1.
- File-based routes under `app/`; shared UI under `app/_components`; prototype state under `app/_prototype`.
- Important UI dependencies: `react-icons` and `qrcode.react`.
- Business/public Business UI uses scoped LINE Seed Sans TH; Consumer retains its existing Noto Sans Thai/Sriracha rules.
- LINE Seed Sans TH webfonts are local WOFF2 assets in `public/fonts/line-seed-th/`; runtime `@font-face` registration loads Regular 400 and Bold 700 (59,000 bytes before transfer compression). Business UI does not request or compute weights above 700.
- `@font-face` uses `font-display: swap`; FC Minimal and Anuphan are removed from Business font loading, and `font-synthesis: none` prevents synthetic Business faces.
- Validation commands: `npm run lint`, `npm test`, `npm run build`.
- Static derived manual: `docs/.htmlmanual/manual.html`; local server: `scripts/manual-server.mjs`.
- Cloudflare-compatible local build tooling is present, but there is no production Cloudflare runtime/storage selection, configuration, deployment, or verification.
- The repository contains a standalone Consumer web prototype. It is the **CURRENT / RETAINED / FROZEN** experience, not the target final Guardian channel.
- The target Guardian channel is a future LINE Mini App. No LINE Login, Mini App, LINE notification, or production Guardian identity-linking implementation exists.

## Route implementation

BF-6 validation passed with 29 `page.tsx` route entries: 25 active local routes, 3 compatibility redirects, and 1 legacy QR demo. The canonical BF-6 route table is owned by [ROUTES](./ROUTES.md); it includes the capability-aware local Hotel destination at `/business/hotel`.

No LINE Mini App route or replacement Consumer route was added.

## Implemented surfaces & components

| Area | What code supports | Implementation boundary |
|---|---|---|
| **Business Landing (`/`)** | Business-first Hero, `/business/login` primary CTA, daily-work product board, realistic pet-business photography, multi-service content, floating Warm White glass Header, selective Bento/card hierarchy, secondary Guardian bridge, and rounded public Footer with real destinations only | Live local server components; no backend claims |
| **Business Login (`/business/login`)** | Dedicated Business Login page with mock Google authentication and the scoped LINE Seed Sans TH/Warm White Business visual system | Browser-local mock auth |
| **Business App Shell (BF-1/BF-6)** | Compact Warm White business frame with Branch switcher, live Home/Calendar/Customers/Messages navigation, Inbox unread badges, live Grooming and Hotel service navigation only for their enabled active Branches, retained Daycare/management planned rows, 5-slot mobile navigation/More sheet, aligned 44px top-right controls, non-blurring account popover, and no marketing Footer | Browser-local demo context |
| **Business Home (`/business/home`)** | Three-variant auto-rotating 16:9 operational banner using existing local imagery with previous/next arrows and reduced-motion pause; desktop banner-left/direct-actions-right composition; attention, next-work, Grooming Service Job-derived today/ready-for-pickup summary, Hotel Stay-derived occupancy/arrival/departure summary when capable, and revenue boundary | Implemented local prototype |
| **Business Calendar (BF-2)** | Sunday-first Day/Week/Month/Custom views; 28/35/42-day custom grids; continuous Hotel spans; time-positioned Grooming; mobile/touch drag; both-edge resize; Ctrl/Cmd copy/paste and Alt-drag duplication; bottom interaction/shortcut legend; view preference cookie; availability-guarded mutation without layout-shifting success banners | Implemented local prototype |
| **Booking Foundation (BF-2)** | One-title Booking Editor sheet/dialog with Branch-enabled visual service selector, shared Customer/Pet fields, inline reuse of Add Customer/Add Pet, service-specific appointment/date-range/day fields, availability/resource conflicts, review, cancellation and safe recovery | Browser-local session storage |
| **Grooming Operations Foundation (BF-5)** | `/business/grooming` capability-gated Today board with Pet-image Job cards, search/filter/attention, five visible execution groups, desktop/tablet native+pointer drag with valid/invalid and rollback feedback, mobile status-list/detail alternative, guarded Job transitions, timing, shared Resource assignment, internal notes, Inbox request action and lightweight Job history | Browser-local session storage; local Grooming only, not a full production Grooming system |
| **Hotel / Boarding Operations Foundation (BF-6)** | `/business/hotel` capability-gated operational dashboard with today/arrivals/current stays/departures/attention, Pet-first room/zone occupancy, continuous date spans, room assignment and retained move history, conflict-blocked date/room changes, per-Pet daily-care completion, lightweight checkout history, and Stay detail/context controls | Browser-local shared Business envelope; a distinct `PrototypeHotelStay` slice references Booking/Customer/Pet/Branch/Resource records and is not a Booking-status or generic Service Job migration |
| **Customers & Pets (BF-3)** | Responsive desktop/tablet operational rows with short labeled columns, single-boundary search, actionable filters only, neutral Customer/Pet avatars, clearer contact/Pet/Booking/notes detail hierarchy, progressive Passport/access disclosure, local add Customer/Pet, tags/notes, duplicate warning, and Booking preselection | Browser-local session storage; no Customer/Guardian authority backend |
| **Inbox & Customer Communication (BF-4/BF-6 boundary)** | `/business/inbox` readable desktop split/mobile full-task UI; Business-wide Customer conversation reuse; single-boundary search; compact filters; safe Customer/Pet/Booking/Branch/Grooming Job context; Hotel opens the linked Customer/Pet/Booking context without a Stay-specific thread; local send/unread; three default unnumbered quick replies with dashed add control and collapse cookie; query recovery and structured add-service request | Separate same-tab session storage; a local Guardian-only approval can update linked Grooming Job add-ons/estimated duration only; no real messaging, attachments, notifications, Consumer Inbox, authorization, Booking, Hotel Stay, Charge, or Payment effect |
| **Shared Intake & Scanner (Phase E/BF-6 handoff)** | Camera scan, manual 8-char code entry, QR validation, consent review, belongings logging, check-in completion, eligible Grooming Job handoff, and valid Hotel Stay/room-target handoff | Implemented local prototype |
| **Consumer web prototype (Current / Frozen)** | Anonymous create flow, 6 passport themes, My Pets, Public Safety, Lost flow, Temporary Business Sharing | Implemented and regression-tested; retained/frozen; feature expansion paused |
| **LINE-first Guardian experience (Target)** | LINE entry, LINE Login, LINE Mini App, LINE notifications, production Guardian identity linking | Not implemented; future Consumer phase only |
| **Homepage imagery** | Realistic local photo assets in `public/images/business` for Hero, services, workflow action, and closing entries; the public landing does not depend on cat stickers | Static generated assets only; `/workfiledesign` source untouched |
| **Shared Business visual primitives** | Semantic buttons/forms/badges/status, warm cards/Bento where appropriate, dialog/sheet/alert/toast treatment, premium motion, reduced-motion fallbacks and Business structural loading skeletons | Visual migration only; existing Product state and domain behavior preserved |

## Business visual system (Warm White / Pastel Yellow)

- `workfiledesign/htmlpack/index.html` and `workfiledesign/htmlpack/design-system.css` were audited and mapped as visual reference inputs; they are not runtime dependencies and `/workfiledesign` remains untouched.
- Scoped semantic Business tokens live in `app/globals.css`: Background `#FFFDF9`, Foreground `#2B2B2B`, Surface `#FFFFFF`, Border/Input `#ECE8DF`, Primary `#F4C95D`, Hover/Ring `#D7B152`, Primary Foreground `#3D2B00`, Soft Yellow `#FFD86B`, and Accent `#FFF7EB`.
- Semantic status tokens are Success `#4F7D51`, Warning `#936F28`, Critical `#AC5B53`, and Information `#507893`, with soft and dot counterparts. Status remains text plus icon/dot/non-color meaning.
- Service classification remains independent: Grooming uses Scissors + Coral `#FF9B85`, Hotel uses Bed + Sky `#6FB1E0`, Daycare uses PawPrint + Mint `#5FCFA8`, and Grape `#B79BDB` is reserved for future/special classification.
- Business/public Business uses LINE Seed Sans TH with 14px operational body text, 16px minimum mobile form text, and a hard 700 maximum weight; Consumer retains its existing Noto Sans Thai visual language. JetBrains Mono is not a general Business UI font.
- Business implements Light / Warm White only. There are no Business dark theme tokens, dark portal attributes or theme toggle.
- Emoji/Dingbat UI icons remain prohibited. AI Rainbow/Gradient/Progress is reserved/experimental and unused by active Product surfaces.
- Component curvature follows hierarchy (buttons 8–12px, inputs around 8px, cards 17–20px, large public surfaces 20–28px); pills remain semantic rather than universal.
- Motion uses premium easing and restrained 180–300ms interaction patterns with reduced-motion handling. Structural Business skeletons represent metrics, rows and Calendar layout instead of one giant spinner.
- Consumer source and styling are outside this migration. **CONSUMER VISUAL REDESIGN: PAUSED UNTIL PRODUCT OWNER REOPENS.** The future Guardian visual direction is a minimal, mobile-first LINE Mini App and is not implemented here.

## Prototype storage

Domain/demo records use same-tab `sessionStorage`; lightweight display preferences use browser cookies and never enter the prototype database envelope:

| Key | Purpose |
|---|---|
| `meawketting:create-passport:prototype-v1` | Create/claimed-local presentation |
| `meawketting:safety-lost:prototype-v1` | Safety/Lost state |
| `meawketting:business-sharing:prototype-v1` | Temporary sharing/access state |
| `meawketting:business-intake:prototype-v1` | Demo context, scanned access, intake draft/correction, receive result, BF-2 Bookings, BF-3 Customer/Pet relationship overrides, Business notes/tags, BF-5 Grooming Service Jobs, and BF-6 Hotel Stays/room moves/daily-care state in one local Business envelope |
| `meawketting:business-inbox:prototype-v1` | BF-4 Conversation IDs/context references, text/request messages, unread counts, and local Guardian-response test state; Customer/Pet/Booking/Service Job identity remains sourced from the shared Business envelope |
| Calendar view preference cookie | Last selected Day/Week/Month/Custom view (and related range choice where applicable) |
| Inbox quick-reply visibility cookie | Whether the staff member collapsed or reopened quick replies |

## Current limitations

- No API, database, migration, persistent object identity or production Business/Branch model.
- No real Google auth, account recovery, membership, role/Branch authorization or Admin portal.
- No real Customer identity merge, Guardian invitation/linking, Customer contact authority, Pet ownership policy, Passport permission backend, or cross-Branch authorization policy.
- No signed QR, server expiry/revoke/replay protection, secure consent history or audit.
- No notification, background job, document generation/storage or secure shared link.
- No real message transport, sockets, delivery/read synchronization, attachment upload/storage, LINE Login, LINE Mini App, LINE notifications, LINE/email/SMS integration, full Consumer Inbox, template management, campaign, or chatbot.
- No production Guardian identity linking. LINE identity is only a future entry/authentication channel and does not establish Pet ownership authority automatically.
- No payment provider, refund engine, tax document or accounting capability.
- No Daycare operational board, full room-management settings, overbooking override, room-sharing policy, waitlist, cross-Branch Hotel transfer, housekeeping workforce scheduling, medical management, full incident system, complex staff scheduling, payroll/commissions, inventory/product-stock, pricing override/discount/refund authority, Full CareProof, or production Grooming/Hotel workflow.

## Engineering checkpoint

- Homepage correction completed: `/` communicates Business value in the first viewport, uses Business Login as the primary CTA, keeps Guardian secondary, labels demo/planned content honestly, and avoids duplicating `/business`.
- Public shell correction uses an approximately 1280px centered maximum with 32px desktop, 24px tablet and 16px mobile gutters; operational Calendar/board workflows retain appropriate width.
- Homepage generated imagery is photographic rather than cartoon illustration. The landing uses real pet-business photography as its visual language; CI sticker assets are not part of the public landing dependency.
- BF1–BF6 operational UI is implemented without duplicating Customer/Pet/Booking records or rebuilding privacy/Booking logic: shared service identity, identity avatars, Home Spotlight, compact shell, Grooming/Hotel capability navigation, retained planned navigation, row/timeline/schedule/occupancy-board surfaces, and restrained cards/chips.
- Customer list no longer uses the old desktop table-header structure; desktop/tablet rows use a stable concise hierarchy, mobile stacks the same priority fields, Passport connection is not a browse filter, and detail separates contact, Pets, Bookings and Business notes while keeping authority/access context progressively disclosed.
- Calendar uses a Sunday-first range-aware planning board. Hotel stays render continuously; Day/Week/Month/Custom share one date model; move, both-edge resize, copy/paste, Alt-drag duplication and touch drag all create guarded drafts that pass through the existing availability evaluator before the same save path.
- Booking create/edit keeps appointment, date-range, day, Branch/module validation, conflict, review and cancellation logic while adding the visual service selector and reusing the existing Customer/Pet editors inline.
- Grooming uses Service Jobs stored alongside the shared Business prototype envelope. A Grooming Booking projects a Pet-specific linked Job; Booking planning/status stays independent of the Job execution lifecycle. Home, Calendar, Scan and Intake reuse this foundation; Consumer web routes and privacy boundaries remain preserved and frozen.
- BF-4 Inbox Foundation is **IMPLEMENTED LOCAL PROTOTYPE** at `/business/inbox`; Home, Customer Detail, Booking context, Grooming Job detail, and navigation reuse the same Inbox state. Customer/Booking/Job launches reuse the Business + Customer conversation and normalize to `?conversation=`; quick replies default to three and their collapsed state is a cookie-only preference; no dynamic conversation route was needed.
- Public Header and Footer follow the attached visual direction: floating glass Header and rounded public Footer with real navigation only. `RouteFooter` continues to exclude the marketing Footer from every logged-in Business operational route.
- BF-5 Grooming Operations Foundation is **IMPLEMENTED LOCAL PROTOTYPE**. The capability-aware board has desktop/tablet drag with a mobile status-control alternative; it gates transitions, persists actual start/completion timing in the local Job, keeps Business notes distinct from Inbox messages, validates shared Resource assignments, and contributes completed Jobs to shared Customer/Pet history. It is not full Grooming production operations.
- BF-6 Hotel / Boarding Operations Foundation is **IMPLEMENTED LOCAL PROTOTYPE**. The capability-aware operational dashboard keeps Booking planning separate from a distinct Pet-specific Hotel Stay, projects continuous room/zone occupancy, blocks local room/date capacity conflicts, preserves room-move history, retains per-Pet daily-care completion, and reuses Intake, Calendar, Home, Customers/Pets, Resources and Inbox references. It is not full Hotel production operations.
- Structured Approval is a **LOCAL PROTOTYPE FOUNDATION**. Waiting/approved/declined/cancelled states exist with duplicate-safe Guardian-side test decisions. A Guardian-approved Grooming request adds only to the linked Job's local add-ons/estimated duration; it does not mutate Booking add-ons or create Charge/Payment.
- Real Messaging, real Notifications, attachments, and the full Consumer Messages application are **NOT IMPLEMENTED**. Consumer independent development remains **PAUSED**.
- LINE Login and the LINE Mini App are **NOT IMPLEMENTED**. No LINE route, notification channel, or production Guardian identity-linking work was started.
- BF-6 Hotel completed without starting Daycare Operations, Billing/Payments, Full CareProof, Full Incident Management, Backend, Database, Real Auth, LINE transport, or Cloudflare deployment. Overbooking, room sharing, waitlist and cross-Branch Hotel transfer remain open/not implemented. No next phase starts automatically.
