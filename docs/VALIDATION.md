# Validation

Status: **HOTEL OPERATIONS ROLLBACK — PASS (LOCAL PROTOTYPE)**
Validation date: 2026-08-30
Owner: Engineering / QA

This document owns current test evidence. A passing build is not a production-readiness claim.

This rollback is browser-local implementation evidence only. It is not a production-readiness claim, and it does not add backend, database, payment, LINE transport, Consumer, Daycare, CareProof, Incident, or deployment work.

## Business UX/UI + responsive system reset — PASS

| Check | Result | Evidence |
|---|---|---|
| Repository / route audit | **PASS** | Audited `/`, `/business/login`, Business shell/navigation, Home, Calendar and Booking overlays, Customers/detail, Inbox, Scanner/Intake and Grooming; confirmed Hotel has no dedicated route after rollback |
| Text reduction / progressive disclosure | **PASS** | Removed redundant Customers and Inbox overview panels, unsupported Home revenue, repeated detail explanations and staff-facing development controls; Calendar/Grooming guidance moved into optional disclosure |
| Design-system reset | **PASS** | Computed Business body is 16px; supporting text is 14px; page titles use 24–30px; shared 4px spacing rhythm, semantic color/status, 44px touch controls and 160/220/300ms + 280ms navigation motion tokens are active |
| Mobile composition | **PASS** | 320/375/390/430px checks cover all core Business routes with Agenda Calendar, Grooming grouped status-list, mobile Customer Pet snap/peek and full-screen Booking sheet; no accidental document overflow |
| Tablet composition | **PASS** | 768/820/1024px checks cover compact Home banner/actions, touch-safe Calendar spans/handles, adaptive Customer/detail, Inbox split behavior and contained Grooming workflow board |
| Desktop composition | **PASS** | 1200/1440px checks retain persistent navigation, Home banner/action rail, operational rows, Inbox split pane and Calendar planning density without reducing body text |
| Horizontal interaction | **PASS** | Scrolling is limited to filters/tabs, multiple-Pet snap/peek and contained board/timeline surfaces; Customer lists, messages, forms, detail copy, alerts and dialogs have no document-level horizontal overflow |
| Accessibility | **PASS** | Settled routes expose one meaningful H1; audited mobile controls are at least 44px; icon controls are labelled; service/status uses text plus non-color cues; Booking sheet is labelled/modal, moves focus inside and closes cleanly |
| Browser console | **PASS** | In-app Browser diagnostics across the route/breakpoint sweep contain no warning/error entries; only Vite debug connection/HMR and React DevTools information messages were present |
| Product / privacy regression | **PASS** | 75 executable contracts pass; BF1–BF5, Customer != Guardian, Business never owns Passport, consent/access boundaries, planned navigation and drag alternatives remain intact |
| Boundary audit | **PASS** | Consumer/Guardian and `/workfiledesign` have no diff entries; no feature phase, backend, database, LINE API, commit, push or deploy was started |
| `npm run lint` | **PASS** | ESLint exited 0 |
| `npm test` | **PASS — 75 tests, 75 passed** | Includes the successful Vinext production build and `node --test tests/rendered-html.test.mjs` |
| `npm run build` | **PASS** | Vinext build completed with 28 route entries |

## Hotel / Boarding rollback validation — PASS

| Check | Rollback result | Required evidence before marking complete |
|---|---|---|
| Hotel route and operational files | **PASS** | No `/business/hotel` route or Hotel operations/Stay implementation files remain; the route audit reports 28 entries |
| Menu visibility | **PASS** | Desktop Sidebar and mobile More retain a native disabled `โรงแรม` button labeled `ยังไม่เปิดใช้`, with no `href` or fake route |
| Shared planning boundary | **PASS** | Calendar retains date-range Hotel Booking representation and related planning visuals; no Hotel execution state is created |
| Related integrations | **PASS** | Home, Customers, Intake, command palette and live navigation contain no Hotel operations links or Stay/state handoffs |
| Documentation boundary | **PASS** | Canonical docs describe Hotel / Boarding as planned/not started; no document claims a live Hotel page or completed Hotel operations |
| `npm run lint` | **PASS** | ESLint exited 0 |
| `npm test` | **PASS — 75 tests, 75 passed** | Production build plus `node --test tests/rendered-html.test.mjs` |
| `npm run build` | **PASS** | Vinext build completed with 28 `page.tsx` route entries |

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

## Automated test results — Hotel rollback evidence

| Command | Actual result | Notes |
|---|---|---|
| `npm run lint` | **PASS** | ESLint exited 0 |
| `npm test` | **PASS — 75 tests, 75 passed** | Runs the production build plus `node --test tests/rendered-html.test.mjs` |
| `npm run build` | **PASS** | Vinext build completes with 28 `page.tsx` route entries and no `/business/hotel` route |

## Documentation rebase checks — Hotel rollback audit

| Check | Current status |
|---|---|
| Canonical Markdown owner documents and README router | **PASS** | Canonical documents and README route summary describe the pre-Hotel-page state; derived manual is aligned |
| Hybrid `Person → Business → Branch → Enabled Service Modules` model and Product/privacy boundaries preserved | **PASS** |
| Implemented vs planned Business scope separated; Grooming is local, while Hotel/Daycare/Billing/CareProof remain not started | **PASS** |
| BF-3 Customer/Guardian/Passport, BF-4 Inbox and BF-5 Grooming Job boundaries preserved; Hotel execution remains absent | **PASS — automated regression** |
| Business visual reference mapped into semantic tokens; no runtime dependency on attached files | **PASS** |
| LINE Seed Sans TH scoped to Business/public Business; Consumer typography/visual system unchanged | **PASS** |
| Exact Warm White/Primary/status/feature tokens and service/status separation | **PASS** |
| Light / Warm White only; no Business dark attributes, tokens or theme toggle | **PASS** |
| No Emoji/Dingbat UI icons; Lucide wrapper retained | **PASS** |
| Rainbow CTA absent; multi-accent progress limited to structural loading | **PASS** |
| Planned Business navigation architecture retained with native disabled/no-fake-route semantics | **PASS** |
| Public floating glass Header, rounded Footer, real links only, and no operational marketing Footer | **PASS** |
| Forms, badges, dialogs, alerts, structural loading, motion and reduced-motion contracts | **PASS** |
| Tables | **PASS — shared Business table contract retained; no current non-tabular surface was forced into a table** |
| Broken relative Markdown links | **PASS — automated/source audit** |
| Stale legacy references and active visual assumptions | **PASS — old Business values superseded; Consumer-only rules retained** |
| Derived HTML manual aligned | **PASS — updated after canonical docs and validation** | It preserves the planned Hotel menu note without inventing an operations route |
| `/workfiledesign` boundary respected | **PASS — no status/diff entries** |
| Consumer visual redesign paused; expected Consumer visual files changed: none | **PASS — no Consumer-specific implementation files changed** |

## Business-First Product Direction verification — Hotel rollback audit

| Check | Current status | Evidence |
|---|---|---|
| **Root Homepage (`/`) Business-first content and real links** | **PASS** | One Business H1, `/business/login` primary CTA, secondary Guardian bridge, floating glass Header and rounded real-link Footer |
| **`/business` Compatibility Redirect** | **PASS** | Redirect remains `/business` → `/` |
| **Warm White / Pastel Yellow Business system** | **PASS** | `#F4C95D` with `#3D2B00` (**8.65:1**), `#FFFDF9` with `#2B2B2B`, semantic status separation and scoped LINE Seed Sans TH |
| **Responsive source contract** | **PASS** | 16px Business body/form text, approximately 1280px public shell, workflow-appropriate Calendar width, safe-area navigation and 44px touch controls |
| **Visual browser QA** | **NOT RUN** | This source rollback does not require a new Hotel page QA pass; shared Calendar/planned-menu behavior is covered by source contracts and the final local build/test pass. |
| **Business navigation runtime** | **PASS — local production preview** | Upgraded to `vinext@1.0.0-beta.8` with its compatible `@vitejs/plugin-rsc@0.5.34`. Native Business document navigation remains intentional; Home → Customers was reverified in production preview with one rendered page H1 and zero RSC prefetch/client-navigation errors. Deployment itself was not run in this task. |
| **Planned-vs-implemented honesty** | **PASS** | Grooming is the local execution foundation; Hotel is planned/not started, and Finance, Reports, team management, Daycare, CareProof, Backend and deployment remain unimplemented/planned |
| **Consumer Development Freeze** | **PASS** | Existing Consumer web prototype, routes, and visual system remain unchanged/frozen; no Consumer-specific implementation files changed |
| **BF-2 Shared Booking & Calendar** | **PASS** | Sunday-first Day/Week/Month/Custom via shared Segmented Control, remembered view, prominent “วันนี้” control, readable mobile agenda, date-range Hotel Booking spans, mouse/pen/touch pointer move plus leading/trailing resize, copy shortcuts, mutation guards, capacity checks, stable Booking drawer and embedded Customer/Pet creation preserved |
| **BF-3 Customers & Pets** | **PASS** | Readable desktop rows, shared search field, 14px Segmented Control filters, responsive detail hierarchy, relationships, privacy/access disclosure and Booking preselection preserved |
| **BF-4 Inbox & Customer Communication** | **PASS** | Responsive list/split tasks, shared search field, 14px Segmented Control filters, context, unread, local send, three default quick replies with remembered visibility, and structured-request boundary preserved |
| **BF-5 Grooming Operations Foundation** | **PASS — LOCAL PROTOTYPE** | Capability-aware route/navigation, centered componentized lane headers, aligned Pet-first Today cards with full-surface status colors, reversible guarded Service Job lifecycle/timing, pointer-following drag preview, shared Resource conflict guard, grouped mobile list/detail alternative, internal notes, lightweight history, and capability/Privacy regressions |
| **Hotel / Boarding Operations** | **PASS — PLANNED / NOT STARTED** | No dedicated route, Hotel Stay, occupancy board, room workflow, daily-care state or Hotel-specific Intake target remains; Sidebar and mobile More retain only the disabled planned menu item |
| **Shared Business Intake Engine** | **PASS** | Camera/manual recovery, QR rejection, consent, belongings and check-in preserved; only a matching known Grooming Job can attach, with no Hotel execution target |
| **Canonical Documentation Rebase** | **PASS** | Canonical docs, Guardian direction wording, active visual wording and derived HTML manual reconciled |

## Required browser QA evidence — current Business routes

| Viewport | Evidence |
|---|---|
| 320 / 375 / 390 / 430px | **NOT RUN** — shared source contracts cover grouped lists, Calendar agenda, planned menu semantics and no document-level Hotel surface |
| 768 / 820 / 1024px | **NOT RUN** — shared source contracts cover touch-first Calendar/Grooming workflows and the disabled planned Hotel row |
| 1200px | **NOT RUN** — persistent navigation and operational boards remain scoped to implemented routes |
| 1440px | **NOT RUN** — Home action rail and implemented operational boards remain scannable at 16px body text |
| Focus / hover / active / disabled / error / empty / loading / reduced motion | **PASS — browser interaction plus automated/source contracts** |
| Navigation | **PASS** — native Business links remain the local fallback; Hotel is a disabled planned button with no `href` |

## Automated test suite contracts (rollback contract refresh pending)

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
28. Hotel rollback contract: no `/business/hotel` route or Hotel operations/state files, no Hotel execution links or handoffs, shared date-range Booking support remains, and the disabled planned menu item is visible without an `href`.
29. BF1–BF5 Business content-density contracts: shared optional Page Header, no obsolete operational eyebrow/heading stacks, one-title Booking editor, responsive Customer table/card hierarchy, and no repeated record-level demo suffixes.
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
- Cloudflare is the target platform direction; production runtime/storage architecture, hosting, SSL certificates, custom domain deployment, and deployment verification remain not started.
- Local browser QA is not a production device-lab, native camera-hardware, screen-reader, or assistive-technology certification.
- The in-app browser controller did not synthesize a native desktop drag gesture. Grooming native/pointer handlers, pointer-following preview, valid/invalid drop source contracts, reversible guarded lifecycle/rollback behavior, and the mobile grouped-list/detail alternative are covered by executable tests/browser checks; this is not a device-lab certification.
