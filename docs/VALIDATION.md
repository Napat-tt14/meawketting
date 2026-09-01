# Validation

Status: **BF-6 HOTEL / BOARDING OPERATIONS FOUNDATION — PASS (LOCAL PROTOTYPE)**

Validation date: 2026-08-31
Owner: Engineering / QA

This document owns current test evidence. A passing local build is not a production-readiness claim.

BF-6 adds browser-local Hotel execution on top of BF1–BF5. It does not add Backend, Database, Billing, Payment, LINE transport, Consumer work, full medical/care, full Incident Management, deployment, or BF7.

## Final command evidence

| Command | Result | Evidence |
|---|---|---|
| `npm run lint` | **PASS** | ESLint exited 0 |
| `npm test` | **PASS — 76 tests, 76 passed** | Runs the Vinext production build and `node --test tests/rendered-html.test.mjs` |
| `npm run build` | **PASS** | Vinext production build completed and emitted `/business/hotel` |
| Route audit | **PASS** | 29 `page.tsx` route entries = 25 active local routes + 3 compatibility redirects + 1 legacy QR demo |

The first sandboxed build attempt could not write Vite's generated file under `node_modules/.vite-temp` (`EPERM`). The same build was rerun with the required workspace write permission and passed. This was an execution-environment permission issue, not a source failure.

## BF-6 Hotel operations evidence

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

| Surface | Result | Evidence |
|---|---|---|
| Desktop Hotel board | **PASS — in-app browser** | At the 1294px desktop preview width, Today metrics, the continuous room/zone board, per-room capacity, operational groups, and Stay detail rendered without document-level horizontal overflow. |
| Mobile Hotel operations | **PASS — 390×844** | Desktop occupancy is replaced by grouped tabs/lists; Stay detail becomes a bottom sheet; room selection provides a non-drag alternative; fixed navigation does not cover sheet content. |
| Capability switch | **PASS — in-app browser** | Switching from Hotel-enabled Ari to non-Hotel Thonglor removed the live Hotel navigation and command. Switching back restored both. |
| Capacity rollback | **PASS — in-app browser** | Attempting to move active Stay Luna from A01 into reserved B03 reported the conflict and retained A01. |
| Ready-for-pickup span | **PASS — in-app browser** | Hotel Operations presents pickup-day occupancy as an operational marker while Calendar keeps checkout-exclusive planning semantics. |
| Motion/accessibility | **PASS — source and executable contracts** | Labeled controls, semantic text alongside color, 44px mobile controls, reduced-motion fallback, and non-drag room/status actions are retained. This is not device-lab certification. |

## Documentation and design-system checks

| Check | Result |
|---|---|
| Canonical Markdown owners | **PASS** — Product, Architecture, Module Map, Routes, User Flows, Design System, UX Rules, Decisions, Current Implementation, Roadmap, and Validation describe BF6 consistently. |
| Derived HTML manual | **PASS** — updated after canonical Markdown and final BF6 evidence. |
| Broken relative Markdown links | **PASS — automated/source audit** |
| Stale legacy references | **PASS — active Hotel rollback/planned wording removed; explicitly historical decisions remain historical** |
| Business visual system | **PASS** — Warm White/light only; Hotel uses Sky/Blue classification; Brand Yellow remains the primary CTA; semantic status colors remain independent. |
| Icon and theme boundary | **PASS** — Lucide wrappers remain; no Emoji/Dingbat UI icons and no Business dark theme/toggle were added. |
| Shared Business Intake Engine | **PASS** — reused by Grooming and Hotel with explicit target identity; no parallel Hotel Intake flow. |
| Hybrid identity model | **PASS** — `Person → Business → Branch → Enabled Service Modules`; Customer/Guardian/Pet/Passport boundaries remain unchanged. |
| `/workfiledesign` boundary | **PASS — untouched** — no status or diff entry is present. |
| Platform wording | **PASS** — Cloudflare is the target platform direction; production remains **NOT DEPLOYED / NOT VERIFIED**. |

## Regression and boundary evidence

| Boundary | Result |
|---|---|
| BF1–BF5 regression | **PASS** — Home, Calendar/Booking, Customers/Pets, Inbox, Shared Intake, and Grooming executable contracts remain green. |
| Grooming lifecycle | **PASS** — BF5 reversible guarded status behavior and actual completion timing remain intact. |
| Consumer development | **PAUSED / unchanged** — existing Consumer routes and Noto Sans Thai visual system remain frozen; no LINE Mini App or Consumer Inbox was started. |
| Billing / Payment / accounting | **NOT STARTED** |
| Backend / Database / production auth | **NOT STARTED** |
| Advanced room/dynamic pricing and full inventory | **NOT STARTED** |
| Full medical/care, full Incident Management, and full CareProof | **NOT STARTED** — BF6 contains only authorized lightweight care and internal attention notes. |
| BF7 | **NOT STARTED** |

## Planning versus execution boundary

Calendar owns Booking dates, planning availability, continuous spans, move, and resize. Hotel Operations owns occupancy, room assignment/movement, Stay lifecycle, care, attention, and pickup execution. Customer/Pet identity, Branch Resources, Shared Intake, and Inbox Conversation remain shared records; no Hotel-specific copies were created.

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
14. Business Home three-variant Spotlight with accessible overlaid arrows, transform-only mounted-image track, touch swipe, square composition, 50:50 desktop layout capped at 400×400px, existing local image reuse, quick actions, priority overview, no unsupported revenue, and booking-derived today counts (`/business/home`).
15. Branch switcher and capability-aware navigation (Ari, Thonglor, Onnut), including architecture-visible planned service and management groups in desktop Sidebar and Mobile More.
16. BF-2 Sunday-first Day/Week/Month/Custom Calendar using the shared keyboard segmented component, remembered view cookie, 28/35/42-day ranges, compact status-surfaced cards without visible status dots, continuous Hotel spans, time-positioned appointments, Today scroll/focus, mobile Agenda, and date-normalized Booking Editor (`/business/calendar`).
17. Pure appointment/Hotel move and both-edge shrink/extend adapter, drag-layer pointer passthrough, duration/night preservation, touch pointer affordances, Ctrl/Cmd copy-paste/undo, Delete/Escape/arrow/Home/End navigation, Alt-drag copy, existing availability evaluator, specific conflict recovery, capacity checks, and duplicate confirmation prevention.
18. Shared icon + label + tint service identity and Branch-enabled visual service selection; typeahead Customer and Pet-image controls, automatic availability feedback, and inline Add Customer/Add Pet reuse without a second relationship store.
19. Customers & Pets counted booking filters without a Passport-connection filter, one-boundary search, readable operational rows/mobile summaries, responsive detail routes and multiple-Pet snap/peek, local add/edit actions, duplicate warning, local tags/notes, progressive Passport disclosure, and Customer/Pet Booking preselection.
20. Customer/Guardian/Passport boundaries, source labels, access presentation, known Intake relationship reuse, and no auto-create from unknown QR.
21. Scanner and Intake QR type rejection, consent checks, belongings logging, and check-in completion.
22. BF-4 contextual route/list/split UI, Customer/Pet/Booking projection, one-boundary search, compact filters, unread, local send, three default quick replies, remembered collapse state, dashed add action, and absence of a needless dynamic Conversation route.
23. BF-4 pure state reducers: Business+Customer reuse, cross-Branch continuity, request waiting state, Guardian-owned duplicate-safe decision, and no Booking/Charge effect for unlinked requests.
24. BF-4 Customer Detail, Booking, Home and live desktop/mobile navigation integration plus privacy/accessibility/responsive source contracts.
25. BF-5 capability-aware Grooming route/navigation, aligned full-surface status Pet cards, pointer-following reversible desktop/touch drag, touch drop/swipe, grouped mobile status alternative, protected-data absence, reduced motion, and responsive board containment.
26. BF-5 pure Grooming Service Job selectors/reducer: Booking remains distinct, guarded valid/invalid lifecycle, actual timing, completed history, enabled-Branch behavior, and shared Resource collision detection.
27. BF-5 Calendar/Intake/Inbox/Customer/Home integration: one shared Job identity, Guardian-only approved add-on affecting only Job duration/add-ons, and no Booking/Charge/Payment mutation.
28. BF6 capability-aware Hotel route/navigation, Booking-to-Pet-specific-Stay projection, multi-day occupancy, capacity collision and rollback, movement history, lifecycle, authorized care completion, Today summary math, internal-note privacy, and Home/Calendar/Customer/Inbox/Shared Intake integration.
29. BF1–BF6 Business content-density contracts: shared optional Page Header, no obsolete operational eyebrow/heading stacks, one-title Booking editor, responsive Customer table/card hierarchy, responsive Hotel desktop-board/mobile-list split, and no repeated record-level demo suffixes.
30. Calm operational Business styling, scoped LINE Seed Sans TH, exact semantic tokens, Lucide wrappers, forms/badges/overlays/loading, responsive behavior and reduced motion.
31. Cloudflare direction / Vercel supersession documentation and absence of a production-deployment claim.
32. Absence of scattered raw color values and Emoji in component source; no Business dark theme/toggle, no active Rainbow CTA, and loading-only multi-accent indeterminate progress.
33. Consumer regression contracts remain preserved while the future LINE Mini App direction is documented without implementation.
34. LINE Seed Sans TH Business webfonts, loaded 400/700 faces, 16px operational body with 14px supporting text, maximum weight 700, `font-display: swap`, `font-synthesis: none`, no FC Minimal/Anuphan loading, and no Consumer font change.

## Partially validated / not in scope

- Real backend, database migrations, server-side authorization, and signed QR cryptographic verification.
- Real payment gateway processing, VAT invoice generation, and full accounting.
- Native mobile camera hardware permissions.
- Real messaging transport, sockets, delivery/read synchronization, attachment storage, notifications, full Consumer Inbox, retention/deletion policy, and production Guardian response identity.
- LINE Login, LINE Mini App, LINE notifications, and production Guardian identity linking; these are future Consumer-phase work and are not represented by repository routes.
- Cloudflare is the target platform direction; production runtime/storage architecture, custom domain deployment, and production verification remain not started.
- Local browser QA is not a production device-lab, native camera-hardware, screen-reader, or assistive-technology certification.
- The in-app browser controller did not synthesize a native Hotel desktop drag gesture. Native drag/drop handlers, capacity preview, rollback source contracts, and the mobile room selector are covered by executable tests plus direct conflict interaction; this is not a device-lab certification.

## Stop condition

BF-6 is complete as a local Hotel / Boarding Operations Foundation. Consumer remains **PAUSED**. No Billing, Backend, Database, production deployment, or BF7 work was started.
