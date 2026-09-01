# Current Implementation

Status: **REPOSITORY TRUTH — BF1–BF6 LOCAL BUSINESS OPERATIONS PROTOTYPE**
Audit date: 2026-08-31
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

The current audit contains 29 `page.tsx` route entries: 25 active local routes, 3 compatibility redirects, and 1 legacy QR demo. The canonical route table is owned by [ROUTES](./ROUTES.md); `/business/hotel` is the capability-gated Hotel operations route.

No LINE Mini App route or replacement Consumer route was added.

## Implemented surfaces & components

| Area | What code supports | Implementation boundary |
|---|---|---|
| **Business Landing (`/`)** | Business-first Hero, `/business/login` primary CTA, daily-work product board, realistic pet-business photography, multi-service content, floating Warm White glass Header, selective Bento/card hierarchy, secondary Guardian bridge, and rounded public Footer with real destinations only | Live local server components; no backend claims |
| **Business Login (`/business/login`)** | Dedicated Business Login page with mock Google authentication and the scoped LINE Seed Sans TH/Warm White Business visual system | Browser-local mock auth |
| **Business App Shell (BF-1/BF-6)** | Compact Warm White business frame with Branch switcher, live Home/Calendar/Customers/Messages navigation, Inbox unread badges, capability-gated Grooming and Hotel destinations/commands, retained Daycare/management planned rows, 5-slot mobile navigation/More sheet, aligned 44px top-right controls, non-blurring account popover, Ctrl/Cmd+K mock Command Palette beside Scan, and no marketing Footer | Browser-local demo context |
| **Business Home (`/business/home`)** | Three-variant operational banner using existing local imagery with previous/next arrows, one transform-only track, click navigation, touch swipe, reduced-motion pause, square composition and a desktop 50:50 split capped at 400×400px; attention, next work, Grooming Service Job values, and Hotel arrivals/departures/occupancy/capacity/attention derived from shared operational state; unsupported revenue is absent | Implemented local prototype |
| **Business Calendar (BF-2)** | Shared segmented Day/Week/Month/Custom view component; 28/35/42-day custom grids; Agenda-first mobile; compact color-surfaced cards with status retained in accessible names; unobtrusive edge resize affordances; Today scroll/focus; Ctrl/Cmd copy, paste and undo; Delete/Escape/arrow/Home/End spreadsheet-like keys; Alt-drag duplication; view preference cookie; availability-guarded mutation | Implemented local prototype |
| **Booking Foundation (BF-2)** | One-title Booking Editor sheet/dialog with Branch-enabled visual service selector, typeahead Customer combobox, shared Pet-image picker, inline Add Customer/Add Pet, clearer section spacing, aligned appointment/date-range/day fields, automatic availability/resource conflict feedback, review, cancellation and safe recovery | Browser-local session storage |
| **Grooming Operations Foundation (BF-5)** | `/business/grooming` capability-gated Today board with compact Pet-image Job cards, no date/job filter rail, five full-surface status colors, pointer-following drag preview with valid/invalid and rollback feedback, reversible desktop/tablet status drag, touch drop/swipe and mobile grouped status-list/detail alternative, guarded Job transitions, timing, shared Resource assignment, internal notes, Inbox request action and lightweight Job history | Browser-local session storage; local Grooming only, not a full production Grooming system |
| **Hotel / Boarding Operations Foundation (BF-6)** | `/business/hotel` capability-gated Today operations plus continuous room/zone occupancy, occupied/reserved/available capacity, Pet-specific Stay lifecycle, guarded assign/move with dated history and rollback, lightweight authorized care, ready-for-pickup, internal notes/incidents, responsive grouped mobile alternative, and shared Calendar/Home/Customer/Inbox/Intake integration | Browser-local session storage; not a production Hotel, medical, full incident, inventory, pricing or billing system |
| **Customers & Pets (BF-3)** | Responsive operational rows using the shared Business search field and 14px `BusinessSegmentedControl` filters (ทั้งหมด / มีนัดหมาย / ยังไม่มีนัด); zoned Customer detail with icon-only primary actions, inline name edit, Pet-section add action, neutral Customer/Pet avatars, mobile multiple-Pet snap/peek, progressive Passport/access disclosure, local add Customer/Pet, tags/notes, duplicate warning, Booking preselection, and current/recent Hotel Stays from shared identities | Browser-local session storage; no Customer/Guardian authority backend |
| **Inbox & Customer Communication (BF-4 boundary)** | `/business/inbox` readable desktop split/mobile full-task UI; Business-wide Customer conversation reuse; shared search; 14px `BusinessSegmentedControl` filters (ทั้งหมด / ยังไม่ได้อ่าน / กำลังใช้บริการ); safe Customer/Pet/Booking/Branch/Grooming/Hotel context; local send/unread without browser-storage success copy; horizontal mobile quick replies; centered viewport-safe add-service dialog; query recovery and structured add-service request | Separate same-tab session storage; Grooming/Hotel launches reuse the Conversation while operational notes remain internal; no real messaging, attachments, notifications, Consumer Inbox, authorization, Booking, Charge, or Payment effect |
| **Shared Intake & Scanner (Phase E)** | Camera scan, neutral manual code recovery, QR validation, consent review, belongings logging, check-in completion, eligible Grooming Job handoff, and explicit Hotel `hotelStayId` handoff without a second Intake flow; fixture/interruption controls remain state/test-only | Implemented local prototype |
| **Consumer web prototype (Current / Frozen)** | Anonymous create flow, 6 passport themes, My Pets, Public Safety, Lost flow, Temporary Business Sharing | Implemented and regression-tested; retained/frozen; feature expansion paused |
| **LINE-first Guardian experience (Target)** | LINE entry, LINE Login, LINE Mini App, LINE notifications, production Guardian identity linking | Not implemented; future Consumer phase only |
| **Homepage imagery** | Realistic local photo assets in `public/images/business` for Hero, services, workflow action, and closing entries; the public landing does not depend on cat stickers | Static generated assets only; `/workfiledesign` source untouched |
| **Shared Business visual primitives** | Semantic buttons/forms/badges/status, reusable search, keyboard segmented control, breadcrumbs/sidebar headers, semantic data table, alert, focus-managed modal, progress and skeleton components, signature sweep/rainbow modifiers, workflow-appropriate list/row/timeline/board surfaces, 44px touch controls, adaptive dialog/sheet treatment, pathname-keyed route fades, staggered region entry and reduced-motion fallbacks | Visual migration only; existing Product state and domain behavior preserved |

## Business visual system (Warm White / Pastel Yellow)

- `workfiledesign/htmlpack/index.html` and `workfiledesign/htmlpack/design-system.css` were audited and mapped as visual reference inputs; they are not runtime dependencies and `/workfiledesign` remains untouched.
- Scoped semantic Business tokens live in `app/globals.css`: Background `#FFFDF9`, Foreground `#2B2B2B`, Surface `#FFFFFF`, Border/Input `#ECE8DF`, Primary `#F4C95D`, Hover/Ring `#D7B152`, Primary Foreground `#3D2B00`, Soft Yellow `#FFD86B`, and Accent `#FFF7EB`.
- Semantic status tokens are Success `#4F7D51`, Warning `#936F28`, Critical `#AC5B53`, and Information `#507893`, with soft and dot counterparts. Status remains text plus icon/dot/non-color meaning.
- Service classification remains independent: Grooming uses Scissors + Coral `#FF9B85`, Hotel uses Bed + Sky `#6FB1E0`, Daycare uses PawPrint + Mint `#5FCFA8`, and Grape `#B79BDB` is reserved for future/special classification.
- Business/public Business uses LINE Seed Sans TH with 16px operational body text, 14px supporting text, 24–30px responsive page titles, 16px minimum mobile form text, and a hard 700 maximum weight; Consumer retains its existing Noto Sans Thai visual language. JetBrains Mono is not a general Business UI font.
- Business implements Light / Warm White only. There are no Business dark theme tokens, dark portal attributes or theme toggle.
- Emoji/Dingbat UI icons remain prohibited. Rainbow CTA styling remains reserved/experimental; multi-accent indeterminate progress is used only for structural Business loading and never for operational status.
- Component curvature follows hierarchy (buttons 8–12px, inputs around 8px, cards 17–20px, large public surfaces 20–28px); pills remain semantic rather than universal.
- Motion uses premium easing with canonical 160ms Fast, 220ms Base, 300ms Slow and 280ms Navigation tokens plus reduced-motion handling. Structural Business skeletons represent metrics, rows and Calendar layout instead of one giant spinner.
- Consumer source and styling are outside this migration. **CONSUMER VISUAL REDESIGN: PAUSED UNTIL PRODUCT OWNER REOPENS.** The future Guardian visual direction is a minimal, mobile-first LINE Mini App and is not implemented here.

## Prototype storage

Domain/demo records use same-tab `sessionStorage`; lightweight display preferences use browser cookies and never enter the prototype database envelope:

| Key | Purpose |
|---|---|
| `meawketting:create-passport:prototype-v1` | Create/claimed-local presentation |
| `meawketting:safety-lost:prototype-v1` | Safety/Lost state |
| `meawketting:business-sharing:prototype-v1` | Temporary sharing/access state |
| `meawketting:business-intake:prototype-v1` | Demo context, scanned access, intake draft/correction, receive result, BF-2 Bookings, BF-3 Customer/Pet relationship overrides, Business notes/tags, and BF-5 Grooming Service Jobs in one local Business envelope |
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

- The 2026-08-30 Business UX/UI reset evidence remains valid for the public Business entry, shell, Home, Calendar/Booking overlays, Customers/detail, Inbox, Scanner/Intake and Grooming across its recorded breakpoints. BF-6 was additionally checked in the in-app browser at a 1294px desktop width and 390×844 mobile: the desktop occupancy board stays contained, mobile uses grouped lists/tabs and a bottom sheet, and the non-drag room selector remains usable.

- Homepage correction completed: `/` communicates Business value in the first viewport, uses Business Login as the primary CTA, keeps Guardian secondary, labels demo/planned content honestly, and avoids duplicating `/business`.
- Public shell correction uses an approximately 1280px centered maximum with 32px desktop, 24px tablet and 16px mobile gutters; operational Calendar/board workflows retain appropriate width.
- Homepage generated imagery is photographic rather than cartoon illustration. The landing uses real pet-business photography as its visual language; CI sticker assets are not part of the public landing dependency.
- BF1–BF6 operational UI is implemented without duplicating Customer/Pet/Booking/Conversation/Intake records or rebuilding privacy/Booking logic: shared service identity, identity avatars, Home Spotlight, compact shell, capability-aware Grooming/Hotel navigation, retained planned navigation, row/timeline/schedule/occupancy surfaces, and restrained cards/chips.
- Customer list no longer uses the old desktop table-header structure; desktop/tablet rows use a stable concise hierarchy, mobile stacks the same priority fields, Passport connection is not a browse filter, and detail separates contact, Pets, Bookings and Business notes while keeping authority/access context progressively disclosed.
- Calendar uses a Sunday-first range-aware planning board. Hotel stays render continuously; Day/Week/Month/Custom share one component/date model; mouse, pen and touch pointer drag use one interaction path for move and both-edge resize, while native attributes remain a semantic fallback. Clicking selects a Booking before copy; Enter/double-click opens it. Copy/paste, undo, Delete, arrow navigation and Alt-drag duplication all create guarded drafts that pass through the existing availability evaluator before the same save path. Today moves, scrolls and focuses the current demo date.
- Booking create/edit keeps appointment, date-range, day, Branch/module validation, conflict, review and cancellation logic while adding the visual service selector, searchable Customer combobox, Pet imagery and automatic availability feedback, and reusing the existing Customer/Pet editors inline.
- Grooming uses Service Jobs stored alongside the shared Business prototype envelope. A Grooming Booking projects a Pet-specific linked Job; Booking planning/status stays independent of the Job execution lifecycle. Home, Calendar, Scan and Intake reuse this foundation; Consumer web routes and privacy boundaries remain preserved and frozen.
- BF-4 Inbox Foundation is **IMPLEMENTED LOCAL PROTOTYPE** at `/business/inbox`; Home, Customer Detail, Booking context, Grooming Job detail, and navigation reuse the same Inbox state. Customer/Booking/Job launches reuse the Business + Customer conversation and normalize to `?conversation=`; quick replies default to three and their collapsed state is a cookie-only preference; no dynamic conversation route was needed.
- Public Header and Footer follow the attached visual direction: floating glass Header, a token-driven Signature Sweep Business login button and rounded public Footer with real navigation only. `RouteFooter` continues to exclude the marketing Footer from every logged-in Business operational route.
- BF-5 Grooming Operations Foundation is **IMPLEMENTED LOCAL PROTOTYPE**. The capability-aware board has pointer-following mouse/pen/touch drag preview with reversible status movement and a grouped mobile list; centered plain lane headings, visible status chips and full-surface card colors communicate the queue clearly. Date/job filters are removed from the board surface. It gates transitions, persists actual start/completion timing in the local Job, keeps Business notes distinct from Inbox messages, validates shared Resource assignments, and contributes completed Jobs to shared Customer/Pet history. It is not full Grooming production operations.
- BF-6 Hotel / Boarding Operations Foundation is **IMPLEMENTED LOCAL PROTOTYPE**. A shared Hotel Booking projects one linked Stay per Pet; Booking remains date-range planning while Stay owns execution lifecycle, occupancy, assignment/move history, authorized lightweight care, Business notes, lightweight attention incidents and pickup readiness. Calendar, Home, Customer detail, Inbox and the Shared Intake Engine derive or link through the same identifiers instead of creating parallel stores.
- Structured Approval is a **LOCAL PROTOTYPE FOUNDATION**. Waiting/approved/declined/cancelled states exist with duplicate-safe Guardian-side test decisions. A Guardian-approved Grooming request adds only to the linked Job's local add-ons/estimated duration; it does not mutate Booking add-ons or create Charge/Payment.
- Real Messaging, real Notifications, attachments, and the full Consumer Messages application are **NOT IMPLEMENTED**. Consumer independent development remains **PAUSED**.
- LINE Login and the LINE Mini App are **NOT IMPLEMENTED**. No LINE route, notification channel, or production Guardian identity-linking work was started.
- Advanced/full Hotel policy and workforce systems remain deferred alongside Daycare Operations, Billing/Payments, Full CareProof, Full Incident Management, Backend, Database, Real Auth, LINE transport, and Cloudflare production deployment. Consumer remains PAUSED and BF7 does not start automatically.
