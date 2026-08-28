# Validation

Status: **BUSINESS PHASE BF-6 — HOTEL / BOARDING OPERATIONS FOUNDATION — PASS (LOCAL PROTOTYPE)**
Validation date: 2026-08-28
Owner: Engineering / QA

This document owns current test evidence. A passing build is not a production-readiness claim.

BF-6 is browser-local implementation evidence only. It is not a production-readiness claim, and it does not add backend, database, payment, LINE transport, Consumer, Daycare, CareProof, Incident, or deployment work.

## BF-6 required validation — PASS (local prototype)

| Check | BF-6 result | Required evidence before marking complete |
|---|---|---|
| Capability-aware navigation and direct route | **PASS** | Ari exposes a live Hotel navigation item/route; Thonglor has no live Hotel link and renders the blocked state; Daycare remains planned/disabled |
| Booking / Hotel Stay separation | **PASS** | Calendar keeps a date-range Hotel Booking with aggregate capacity; the linked per-Pet `PrototypeHotelStay` owns execution data without duplicate Customer/Pet/Booking state |
| Hotel lifecycle / Intake / checkout | **PASS** | Local lifecycle guards, explicit Intake target, room-before-check-in, lightweight care check before checkout, and recent-service projection are covered by source/executable contracts |
| Occupancy & availability | **PASS** | 7/14/28 range, one continuous span per assigned interval, room/zone assignment, capacity/overlap conflict messages, and shared Calendar date synchronization are implemented |
| Room move | **PASS** | Browser QA moved Luna A01 → B03 with an optional reason and retained history; source/executable contract blocks availability conflicts before a write |
| Daily Care | **PASS** | Per-Pet tasks remain distinct; browser QA completed Luna’s water check and retained completion state/actor after re-render |
| Multi-Pet & hybrid service | **PASS** | Grouped Booking fixtures project independent Mochi/Biscuit Stays; Hotel links the separate Luna Grooming Job without duplicating identity or lifecycle |
| Shared integrations | **PASS** | Calendar, Home, Customer Detail, Resources, Scan/Intake and Inbox use IDs/shared selectors; Hotel sends existing structured requests and offers no Business approval action |
| Privacy | **PASS** | Hotel uses Business-safe pet avatars and permitted instruction projection only; it does not render Passport fields or grant access |
| Responsive, accessibility & motion | **PASS** | Browser QA confirms no document overflow at 320/375/390/430/768/1024/1200/1440; mobile replaces the grid with room/stay lists, and detail controls provide the drag alternative |
| Regression boundaries | **PASS** | 73 executable contracts cover BF1–BF6/Phase E/Consumer freeze; no Daycare, Billing, Full CareProof, Full Incident, backend, data persistence, or LINE transport was introduced |
| `npm run lint` | **PASS** | ESLint exited 0 |
| `npm test` | **PASS — 73 tests, 73 passed** | Production build plus `node --test tests/rendered-html.test.mjs` |
| `npm run build` | **PASS** | Vinext build completed with 29 `page.tsx` route entries including `/business/hotel` |
| Browser console / route audit | **PASS** | Local `/business/hotel` QA at 320/375/390/430/768/1024/1200/1440 produced no error/warn console entries; QA server is stopped after final verification |

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

## Automated test results — BF-6 current evidence

| Command | Actual result | Notes |
|---|---|---|
| `npm run lint` | **PASS** | ESLint exited 0 |
| `npm test` | **PASS — 73 tests, 73 passed** | Runs the production build plus `node --test tests/rendered-html.test.mjs` |
| `npm run build` | **PASS** | Vinext build completes with 29 `page.tsx` route entries including `/business/hotel` |

## Documentation rebase checks — BF-6 final audit

| Check | Current status |
|---|---|
| Canonical Markdown owner documents and README router | **PASS** | Requested canonical documents and README route summary updated; manual updated last from those sources |
| Hybrid `Person → Business → Branch → Enabled Service Modules` model and Product/privacy boundaries preserved | **PASS** |
| Implemented vs planned Business scope separated; Grooming and Hotel are local only, while Daycare/Billing/CareProof remain not started | **PASS** |
| BF-3 Customer/Guardian/Passport, BF-4 Inbox, BF-5 Grooming Job and BF-6 Booking/Stay boundaries preserved | **PASS — automated regression** |
| Business visual reference mapped into semantic tokens; no runtime dependency on attached files | **PASS** |
| LINE Seed Sans TH scoped to Business/public Business; Consumer typography/visual system unchanged | **PASS** |
| Exact Warm White/Primary/status/feature tokens and service/status separation | **PASS** |
| Light / Warm White only; no Business dark attributes, tokens or theme toggle | **PASS** |
| No Emoji/Dingbat UI icons; Lucide wrapper retained | **PASS** |
| AI Rainbow/Gradient/Progress absent from active Product rendering | **PASS** |
| Planned Business navigation architecture retained with native disabled/no-fake-route semantics | **PASS** |
| Public floating glass Header, rounded Footer, real links only, and no operational marketing Footer | **PASS** |
| Forms, badges, dialogs, alerts, structural loading, motion and reduced-motion contracts | **PASS** |
| Tables | **PASS — shared Business table contract retained; no current non-tabular surface was forced into a table** |
| Broken relative Markdown links | **PASS — automated/source audit** |
| Stale legacy references and active visual assumptions | **PASS — old Business values superseded; Consumer-only rules retained** |
| Derived HTML manual aligned | **PASS — updated after canonical docs** | Compact Consumer/Guardian direction status and target flow added; no implementation detail or fake route added |
| `/workfiledesign` boundary respected | **PASS — no status/diff entries** |
| Consumer visual redesign paused; expected Consumer visual files changed: none | **PASS — no Consumer-specific implementation files changed** |

## Business-First Product Direction verification — BF-6 final audit

| Check | Current status | Evidence |
|---|---|---|
| **Root Homepage (`/`) Business-first content and real links** | **PASS** | One Business H1, `/business/login` primary CTA, secondary Guardian bridge, floating glass Header and rounded real-link Footer |
| **`/business` Compatibility Redirect** | **PASS** | Redirect remains `/business` → `/` |
| **Warm White / Pastel Yellow Business system** | **PASS** | `#F4C95D` with `#3D2B00` (**8.65:1**), `#FFFDF9` with `#2B2B2B`, semantic status separation and scoped LINE Seed Sans TH |
| **Responsive source contract** | **PASS** | 16px mobile form text, approximately 1280px public shell, workflow-appropriate Calendar width, safe-area navigation and 44px major controls |
| **Visual browser QA** | **PASS** | Hotel was checked at 320/375/390/430/768/1024/1200/1440: 320–430 hide the multi-day grid and show room/stay lists; 768–1440 retain a contained occupancy board with no document overflow. Daily-care completion, room move history, blocked occupied-room assignment, capability gating and a zero error/warn console were verified locally. |
| **Business navigation runtime** | **PASS — local production preview** | Upgraded to `vinext@1.0.0-beta.8` with its compatible `@vitejs/plugin-rsc@0.5.34`. Native Business document navigation remains intentional; Home → Customers was reverified in production preview with one rendered page H1 and zero RSC prefetch/client-navigation errors. Deployment itself was not run in this task. |
| **Planned-vs-implemented honesty** | **PASS** | Grooming and Hotel are local execution foundations; real delivery, Finance, Reports, team management, Daycare, CareProof, Backend and deployment remain unimplemented/planned |
| **Consumer Development Freeze** | **PASS** | Existing Consumer web prototype, routes, and visual system remain unchanged/frozen; no Consumer-specific implementation files changed |
| **BF-2 Shared Booking & Calendar** | **PASS** | Sunday-first Day/Week/Month/Custom, remembered view, prominent “วันนี้” control, readable mobile agenda, Hotel spans, leading/trailing resize, touch pointer handlers, copy shortcuts, mutation guards, capacity checks, stable Booking drawer and embedded Customer/Pet creation preserved |
| **BF-3 Customers & Pets** | **PASS** | Readable desktop table, responsive detail hierarchy, compact search/filter controls, relationships, privacy/access disclosure and Booking preselection preserved |
| **BF-4 Inbox & Customer Communication** | **PASS** | Responsive list/split tasks, compact search/filters, context, unread, local send, three default quick replies with remembered visibility, and structured-request boundary preserved |
| **BF-5 Grooming Operations Foundation** | **PASS — LOCAL PROTOTYPE** | Capability-aware route/navigation, visual Pet-first Today board, guarded Service Job lifecycle/timing, shared Resource conflict guard, drag source contract with mobile status alternative, internal notes, lightweight history, and capability/Privacy regressions |
| **BF-6 Hotel / Boarding Operations Foundation** | **PASS — LOCAL PROTOTYPE** | Capability-aware operational route/navigation, Booking/Stay separation, continuous occupancy, room/zone capacity guard, move history, per-Pet daily care, additional Grooming context and shared Calendar/Home/Customer/Intake/Inbox references |
| **Shared Business Intake Engine** | **PASS** | Camera/manual recovery, QR rejection, consent, belongings and check-in preserved; a matching known Grooming Job or explicit Hotel Stay target can attach without creating a duplicate identity/Booking/Stay |
| **Canonical Documentation Rebase** | **PASS** | Canonical docs, Guardian direction wording, active visual wording and derived HTML manual reconciled |

## Required browser QA evidence — BF-6 local route

| Viewport | Evidence |
|---|---|
| 320 / 375 / 390 / 430px | **PASS — browser** — room/stay alternative replaces the occupancy grid; no document overflow |
| 768 / 1024px | **PASS — browser** — contained desktop occupancy board; no document overflow |
| 1200px | **PASS — browser** — five summary cards and contained desktop occupancy board; no document overflow |
| 1440px | **PASS — browser** — full operational dashboard/board remains scannable; no document overflow |
| Focus / hover / active / disabled / error / empty / loading / reduced motion | **PASS — browser interaction plus automated/source contracts** |
| Navigation | **PASS** — native Business links remain the local fallback; Hotel is live only for Hotel-enabled Branches |

## Automated test suite contracts (73 tests, 73 passed — BF-6 current evidence)

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
14. Business Home three-variant 16:9 auto-rotating Spotlight with adjacent arrows, existing local image reuse, desktop right-hand quick actions, priority overview, one demo-context indicator, and booking-derived today counts (`/business/home`).
15. Branch switcher and capability-aware navigation (Ari, Thonglor, Onnut), including architecture-visible planned service and management groups in desktop Sidebar and Mobile More.
16. BF-2 Sunday-first Day/Week/Month/Custom Calendar, remembered view cookie, 28/35/42-day ranges, continuous Hotel spans, time-positioned appointments, mobile Agenda, and date-normalized Booking Editor (`/business/calendar`).
17. Pure appointment/Hotel move and both-edge resize adapter, duration/night preservation, touch pointer affordances, Ctrl/Cmd copy-paste, Alt-drag copy, existing availability evaluator, specific conflict recovery, capacity checks, and duplicate confirmation prevention.
18. Shared icon + label + tint service identity and Branch-enabled visual service selection; inline Add Customer/Add Pet reuse without a second relationship store.
19. Customers & Pets counted booking filters without a Passport-connection filter, one-boundary search, readable desktop table/mobile cards, responsive detail routes, local add/edit actions, duplicate warning, multiple Pets, local tags/notes, progressive Passport disclosure, and Customer/Pet Booking preselection.
20. Customer/Guardian/Passport boundaries, source labels, access presentation, known Intake relationship reuse, and no auto-create from unknown QR.
21. Scanner and Intake QR type rejection, consent checks, belongings logging, and check-in completion.
22. BF-4 contextual route/list/split UI, Customer/Pet/Booking projection, one-boundary search, compact filters, unread, local send, three default quick replies, remembered collapse state, dashed add action, and absence of a needless dynamic Conversation route.
23. BF-4 pure state reducers: Business+Customer reuse, cross-Branch continuity, request waiting state, Guardian-owned duplicate-safe decision, and no Booking/Charge effect for unlinked requests.
24. BF-4 Customer Detail, Booking, Home and live desktop/mobile navigation integration plus privacy/accessibility/responsive source contracts.
25. BF-5 capability-aware Grooming route/navigation, Pet-visual Job cards, desktop drag/drop source contract, mobile status alternative, protected-data absence, reduced motion, and responsive board containment.
26. BF-5 pure Grooming Service Job selectors/reducer: Booking remains distinct, guarded valid/invalid lifecycle, actual timing, completed history, enabled-Branch behavior, and shared Resource collision detection.
27. BF-5 Calendar/Intake/Inbox/Customer/Home integration: one shared Job identity, Guardian-only approved add-on affecting only Job duration/add-ons, and no Booking/Charge/Payment mutation.
28. BF-6 Hotel route/nav capability gating, Pet-first operational dashboard, 7/14/28 occupancy range, continuous spans, room/zone conflict guard, mobile list alternative, distinct Stay detail, local Care completion/move history, Intake/Calendar/Home/Customer/Inbox integration and protected-data absence.
29. BF1–BF6 Business content-density contracts: shared optional Page Header, no obsolete operational eyebrow/heading stacks, one-title Booking editor, responsive Customer table/card hierarchy, and no repeated record-level demo suffixes.
30. Calm operational Business styling, scoped LINE Seed Sans TH, exact semantic tokens, Lucide wrappers, forms/badges/overlays/loading, responsive behavior and reduced motion.
31. Cloudflare direction / Vercel supersession documentation and absence of a production-deployment claim.
32. Absence of scattered raw color values and Emoji in component source; no Business dark theme/toggle and no active AI Rainbow rendering.
33. Consumer regression contracts remain preserved while the future LINE Mini App direction is documented without implementation.
34. LINE Seed Sans TH Business webfonts, loaded 400/700 faces, 14px operational body, maximum weight 700, `font-display: swap`, `font-synthesis: none`, no FC Minimal/Anuphan loading, and no Consumer font change.

## Partially validated / not in scope

- Real backend, database migrations, server-side authorization, and signed QR cryptographic verification.
- Real payment gateway processing, VAT invoice generation, and full accounting.
- Native mobile camera hardware permissions.
- Real messaging transport, sockets, delivery/read synchronization, attachment storage, notifications, full Consumer Inbox, retention/deletion policy, and production Guardian response identity.
- LINE Login, LINE Mini App, LINE notifications, and production Guardian identity linking; these are future Consumer-phase work and are not represented by repository routes.
- Cloudflare is the target platform direction; production runtime/storage architecture, hosting, SSL certificates, custom domain deployment, and deployment verification remain not started.
- Local browser QA is not a production device-lab, native camera-hardware, screen-reader, or assistive-technology certification.
- The in-app browser controller did not synthesize a native desktop drag gesture. Grooming native/pointer handlers, valid/invalid drop source contracts, and guarded lifecycle/rollback behavior are covered by executable tests; the mobile detail/status-control alternative was browser-verified. This is not a device-lab certification.
