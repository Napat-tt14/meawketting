# Validation

Status: **LINE SEED TH BUSINESS FONT REPLACEMENT / BUSINESS DESIGN SYSTEM / BOOKING-CALENDAR UX — PASS**
Validation date: 2026-08-27
Owner: Engineering / QA

This document owns current test evidence. A passing build is not a production-readiness claim.

The Business Design System rebase was validated after implementation. The derived HTML manual was reconciled after canonical Markdown and final evidence.

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

## Automated test results

| Command | Actual result | Notes |
|---|---|---|
| `npm.cmd run lint` | **PASS** | ESLint exits 0 |
| `npm.cmd test` | **PASS — 69 tests, 69 passed** | Runs the production build plus `node --test tests/rendered-html.test.mjs` |
| `npm.cmd run build` | **PASS** | Vinext build completes with 27 route entries; no Product route was added by this migration |

## Documentation rebase checks

| Check | Current status |
|---|---|
| Canonical Markdown owner documents and README router | **PASS** | Ten requested owner documents updated; README router remains unchanged and still points to the canonical set |
| Hybrid `Person → Business → Branch → Enabled Service Modules` model and Product/privacy boundaries preserved | **PASS** |
| Implemented vs planned Business scope separated; BF-5/new service boards not started | **PASS** |
| BF-3 Customer/Guardian/Passport and BF-4 Inbox/Booking/Charge boundaries preserved | **PASS — automated regression** |
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

## Business-First Product Direction verification

| Check | Current status | Evidence |
|---|---|---|
| **Root Homepage (`/`) Business-first content and real links** | **PASS** | One Business H1, `/business/login` primary CTA, secondary Guardian bridge, floating glass Header and rounded real-link Footer |
| **`/business` Compatibility Redirect** | **PASS** | Redirect remains `/business` → `/` |
| **Warm White / Pastel Yellow Business system** | **PASS** | `#F4C95D` with `#3D2B00` (**8.65:1**), `#FFFDF9` with `#2B2B2B`, semantic status separation and scoped LINE Seed Sans TH |
| **Responsive source contract** | **PASS** | 16px mobile form text, approximately 1280px public shell, workflow-appropriate Calendar width, safe-area navigation and 44px major controls |
| **Visual browser QA** | **PASS** | Home, Calendar/Booking, Customers/Detail, Inbox, Landing and Login were rechecked at the relevant 390/768/1200/1440 widths; booking price hierarchy, centered/embedded relationship editors, today control, mobile agenda and no horizontal overflow were verified; computed Business typography was 14px with maximum weight 700 |
| **Business navigation runtime** | **PASS WITH LOCAL FALLBACK** | `vinext@1.0.0-beta.2` failed its RSC `next/link` prefetch/client navigation in production preview; Business links now use native document navigation, and Home → Customers navigation was browser-verified while session-backed prototype state remains recoverable |
| **Planned-vs-implemented honesty** | **PASS** | Real delivery, Finance, Reports, team management, operation boards, CareProof, Backend and deployment remain unimplemented/planned |
| **Consumer Development Freeze** | **PASS** | Existing Consumer web prototype, routes, and visual system remain unchanged/frozen; no Consumer-specific implementation files changed |
| **BF-2 Shared Booking & Calendar** | **PASS** | Sunday-first Day/Week/Month/Custom, remembered view, prominent “วันนี้” control, readable mobile agenda, Hotel spans, leading/trailing resize, touch pointer handlers, copy shortcuts, mutation guards, capacity checks, stable Booking drawer and embedded Customer/Pet creation preserved |
| **BF-3 Customers & Pets** | **PASS** | Readable desktop table, responsive detail hierarchy, compact search/filter controls, relationships, privacy/access disclosure and Booking preselection preserved |
| **BF-4 Inbox & Customer Communication** | **PASS** | Responsive list/split tasks, compact search/filters, context, unread, local send, three default quick replies with remembered visibility, and structured-request boundary preserved |
| **Shared Business Intake Engine** | **PASS** | Camera/manual recovery, QR rejection, consent, belongings and check-in preserved |
| **Canonical Documentation Rebase** | **PASS** | Canonical docs, Guardian direction wording, active visual wording and derived HTML manual reconciled |

## Required browser QA evidence

| Viewport | Evidence |
|---|---|
| 390px | **PASS** — Home, Calendar mobile Agenda, Customers/Detail and Inbox; touch handles and mobile navigation are present, quick actions/detail controls fit, and no horizontal overflow was found |
| 768px | **PASS** — Home actions reflow below the banner, Calendar switches to the planning board, Customers remains readable, Inbox keeps a usable split view, and no horizontal overflow was found |
| 1200px | **PASS** — Landing and Login use LINE Seed with 14px root content and maximum computed Business weight 700; no horizontal overflow was found |
| 1440px | **PASS** — Home banner/actions split, aligned header controls, Sunday-first Calendar with both Hotel edges, Customers table/detail hierarchy and Inbox split workspace; no horizontal overflow was found |
| Focus / hover / active / disabled / error / empty / loading / reduced motion | **PASS — browser interaction plus automated/source contracts** |
| Navigation | **PASS WITH FALLBACK** — native Business links avoid the known Vinext beta RSC prefetch failure; `/business/home` → `/business/customers?focus=search` was verified in the production preview |

## Automated test suite contracts (69 tests, 69 passed)

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
23. BF-4 pure state reducers: Business+Customer reuse, cross-Branch continuity, request waiting state, Guardian-owned duplicate-safe decision, and no Booking/Charge effect.
24. BF-4 Customer Detail, Booking, Home and live desktop/mobile navigation integration plus privacy/accessibility/responsive source contracts.
25. BF1–BF4 Business content-density contracts: shared optional Page Header, no obsolete operational eyebrow/heading stacks, one-title Booking editor, responsive Customer table/card hierarchy, and no repeated record-level demo suffixes.
26. Calm operational Business styling, scoped LINE Seed Sans TH, exact semantic tokens, Lucide wrappers, forms/badges/overlays/loading, responsive behavior and reduced motion.
27. Cloudflare direction / Vercel supersession documentation and absence of a production-deployment claim.
28. Absence of scattered raw color values and Emoji in component source; no Business dark theme/toggle and no active AI Rainbow rendering.
29. Consumer regression contracts remain preserved while the future LINE Mini App direction is documented without implementation.
30. LINE Seed Sans TH Business webfonts, loaded 400/700 faces, 14px operational body, maximum weight 700, `font-display: swap`, `font-synthesis: none`, no FC Minimal/Anuphan loading, and no Consumer font change.

## Partially validated / not in scope

- Real backend, database migrations, server-side authorization, and signed QR cryptographic verification.
- Real payment gateway processing, VAT invoice generation, and full accounting.
- Native mobile camera hardware permissions.
- Real messaging transport, sockets, delivery/read synchronization, attachment storage, notifications, full Consumer Inbox, retention/deletion policy, and production Guardian response identity.
- LINE Login, LINE Mini App, LINE notifications, and production Guardian identity linking; these are future Consumer-phase work and are not represented by repository routes.
- Cloudflare is the target platform direction; production runtime/storage architecture, hosting, SSL certificates, custom domain deployment, and deployment verification remain not started.
- Local browser QA is not a production device-lab, native camera-hardware, screen-reader, or assistive-technology certification.
- The in-app browser controller did not synthesize a native pointer drag gesture. Drag/resize mutation, legal/invalid target handling, availability-before-commit, duration/night preservation, and conflict blocking are covered by executable automated tests; handles, drop-zone states, continuous spans, and keyboard editing were browser-audited.
