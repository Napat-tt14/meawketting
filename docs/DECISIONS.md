# Decisions and Open Questions

Status: **ACTIVE CANONICAL DECISION LOG (BUSINESS-FIRST REBASE)**  
Owner: Product

## Status model

| Status | Meaning |
|---|---|
| DECIDED | Active Product direction |
| ASSUMPTION | Reversible treatment used to continue foundation work |
| OPEN | Requires Product/Legal/Security/Operations decision |
| SUPERSEDED | Compact historical trace; no longer active |

Documentation and prototype behavior never close an OPEN question by convenience.

## Active decisions

### Business font replacement — LINE Seed Sans TH — 2026-08-25

| ID | Decision |
|---|---|
| D-107 | **Business/public Business switches to LINE Seed Sans TH as its primary Thai/Latin UI font.** The official Thai package is selected because it supports Thai, Latin and the product's Business UI direction. |
| D-108 | **LINE Seed Sans TH is served from local WOFF2 webfonts** in `public/fonts/line-seed-th/` using `@font-face`, `font-display: swap` and `font-synthesis: none`. Runtime faces are Regular 400 and Bold 700; Business UI body defaults to 14px, mobile form controls remain at least 16px, and no Business UI weight may exceed 700. The official source package/OFL licensing remain documented. |
| D-109 | **Consumer / Guardian font behavior is unchanged and paused.** Consumer continues its existing Noto Sans Thai/Sriracha visual system; this Business font switch does not authorize Consumer/Guardian UI changes. |

### Business operational UI correction — 2026-08-26

| ID | Decision |
|---|---|
| D-110 | Business Home uses a three-image 16:9 auto-rotating banner with explicit arrow controls and reduced-motion/hover/focus pause. Desktop pairs the banner on the left with the three direct actions on the right. |
| D-111 | Calendar weeks begin Sunday. Move, both-edge resize, Alt-drag duplicate, Ctrl/Cmd copy/paste and touch long-press drag all create normal guarded drafts through the existing availability/save path; selection/edit remains the complete alternative. Calendar view preference is cookie-only and success feedback may not shift the schedule. |
| D-112 | Customers list/detail are operational relationship surfaces: one-boundary search, concise labeled desktop/tablet rows and clear contact/Pet/Booking/notes detail sections. Passport connection is record context and is not a browse filter. |
| D-113 | Inbox keeps a readable split/task hierarchy, one-boundary search and compact honest filters. Quick replies default to three without numbering, provide a dashed add control, and store collapse state in a cookie only. |
| D-114 | Logged-in Header icon controls share a 44px alignment grid. The account popover uses a transparent non-blurring click-away layer; task-dialog overlay behavior is unchanged. |

### Business font replacement — FC Minimal — 2026-08-25 (SUPERSEDED)

| ID | Decision |
|---|---|
| D-104 | **SUPERSEDED by D-107.** Business/public Business previously used FC Minimal as its primary Thai/Latin UI font with Regular 400, Medium 500, SemiBold 600 and Bold 700. |
| D-105 | Consumer / Guardian font behavior remains unchanged and paused; retained as a boundary decision. |
| D-106 | **SUPERSEDED by D-108.** FC Minimal was previously served as local WOFF2 webfonts from `public/fonts/fc-minimal/`. |

### Guardian direction correction — 2026-08-24

| ID | Decision |
|---|---|
| D-98 | **Meawketting Business remains the main product and primary commercial experience.** Priority order is P0 Business Product, P1 Business workflows, P2 Guardian touchpoints required by Business workflows, and P3 independent Guardian expansion. |
| D-99 | **The standalone Consumer experience is no longer the target final product.** The existing Consumer web prototype remains in the repository as **CURRENT / RETAINED / FROZEN** for continuity and regression coverage; existing Consumer routes are not deleted. |
| D-100 | **LINE Mini App becomes the target Guardian channel.** The future experience is LINE-first: Add Meawketting LINE → open Mini App → LINE Login → My Pets → Add Pet → Cat/Dog → Pet Profile / Pet Passport. This direction is **FUTURE / PAUSED**, not an implementation phase. |
| D-101 | **The future Guardian UI direction is a minimal LINE Mini App.** It should be minimal, fast, lightweight, mobile-first, familiar inside LINE, low-text, low-friction, action-clear, and simpler than Business. Business and Guardian interaction systems remain separate while sharing the Master Brand. No detailed Mini App navigation is decided yet. |
| D-102 | **LINE identity is not Pet ownership authority.** LINE is an authentication/entry channel only. The authority model remains `Person → Guardian relationship → Pet`; production identity linking, ownership policy, and consent linking remain future architecture decisions. |
| D-103 | **LINE integration is not implemented.** LINE Login, LINE Mini App, LINE notifications, and production Guardian identity linking must be documented as **NOT IMPLEMENTED** until a separately approved Consumer phase begins. |

### Business Design System rebase — 2026-08-23

| ID | Decision |
|---|---|
| D-90 | `workfiledesign/htmlpack/index.html` and `workfiledesign/htmlpack/design-system.css` are the new visual foundation for **Business and Business-first public surfaces**. They are reference inputs only: implementation extracts and maps them into the existing semantic tokens and shared components; `/workfiledesign` remains untouched and is not a runtime dependency. Product logic, privacy and authority remain governed by the canonical architecture and implementation. |
| D-91 | **SUPERSEDED by D-107.** The previous Business/public typography direction used Anuphan for Thai/Latin UI. Operational page-title sizing, mobile form minimums, tabular numerals and Consumer font boundaries remain valid; only the Business font family changed through the later FC Minimal and LINE Seed decisions. |
| D-92 | **Business theme is Light / Warm White only.** Canonical foundation is Background `#FFFDF9`, Foreground `#2B2B2B`, Card `#FFFFFF`, Border/Input `#ECE8DF`, Primary `#F4C95D`, Primary Hover/Ring `#D7B152`, Primary Foreground `#3D2B00`, Soft Yellow `#FFD86B`, and Accent `#FFF7EB`. No Business dark tokens, `[data-theme='dark']`, `[data-portal-theme='dark']`, theme toggle or dark portal mode is supported. |
| D-93 | Business semantic status colors are Success `#4F7D51`, Warning `#936F28`, Critical `#AC5B53`, and Information `#507893`, always with text plus icon/dot/non-color meaning. Feature classification is Grooming/Coral `#FF9B85`, Hotel/Sky `#6FB1E0`, Daycare/Mint `#5FCFA8`, with Grape `#B79BDB` reserved for an approved future/special category. Service color never means status. |
| D-94 | The shared Business component language adopts hierarchical radius, warm bordered surfaces, Primary/Secondary/Outline/Destructive/Ghost/Link buttons, clean forms, semantic badges, appropriate tables, restrained modal/alert/toast feedback, `cubic-bezier(0.22, 1, 0.36, 1)` premium easing and structural skeleton shimmer. Bento is selective; operational Calendar, Customer, Inbox, Scanner and Intake patterns remain workflow-first. |
| D-95 | The public Business Header uses a fixed centered floating Warm White glass container near an approximately 1280px shell with real navigation and a Business CTA. The public Footer is a centered rounded Warm White surface with only real destinations. The logged-in Business shell inherits the visual DNA without sacrificing compact Branch context or navigation, and **no marketing Footer renders on operational `/business/*` routes**. |
| D-96 | Emoji and Dingbat glyphs are prohibited as UI icons; the existing Lucide wrapper is canonical. AI Rainbow Button/Gradient/Progress may exist only as **RESERVED / EXPERIMENTAL / UNUSED** reference material and must not render in active Business Product UI. Reference AI Marketing/Agency copy is sample content and is not adopted. |
| D-97 | **Consumer visual redesign remains PAUSED until the Product Owner reopens it.** This Business visual migration does not authorize Consumer restyling, BF-5, a new service board, AI Product features, Backend/Database work or deployment. |

### Business-first product direction rebase — 2026-08-18

| ID | Decision |
|---|---|
| D-64 | **Meawketting Business is the main product and primary commercial experience.** The business platform is the primary revenue-driving surface. Pet Passport & Guardian Network serves as the foundational trust, privacy, and identity layer. |
| D-65 | **Root Homepage (`/`) is the canonical Commercial Business Landing page.** The previous Consumer landing is superseded. `/business` becomes a compatibility redirect to `/`. |
| D-67 | **Consumer feature development is PAUSED.** The existing standalone Consumer web prototype (Create Passport, My Pets, Public Safety, Lost flow, Temporary Business Sharing) remains implemented, tested, retained, and frozen as a trust foundation; no new consumer feature development will proceed in this phase. |

### Business-first homepage implementation correction — 2026-08-20

| ID | Decision |
|---|---|
| D-68 | The root Hero answers “What is Meawketting for a pet business?” before introducing Pet Passport. Business Login (`/business/login`) is the primary CTA; Guardian entry is visually secondary. |
| D-69 | The homepage speaks in clear business outcomes without exposing internal local/prototype status labels. Implementation boundaries remain documented and the landing must not describe Customers, Messaging, Finance, Reports, team management, CareProof, backend, auth, or payments as production-ready. |
| D-70 | `/` composes meaningful Business landing sections; `/business` remains a compatibility redirect and must not duplicate landing implementation. |
| D-71 | Public Business navigation may link only to implemented routes or real page anchors (`#business-core`, `#services`, `#guardian`). |
| D-72 | The public landing uses real pet-business photography as its primary visual language. CI cat sticker artwork is not loaded by `/`; `/workfiledesign` remains read-only and untouched. |

### Landing visual density and imagery correction — 2026-08-20

| ID | Decision |
|---|---|
| D-73 | The public landing content is intentionally controlled at desktop: use an approximately 1280px maximum shell with responsive 32px desktop, 24px tablet and 16px mobile gutters. Full-width gradients and decorative atmosphere may extend beyond the shell. Operational Calendar/board workflows may use appropriate wider space. |
| D-74 | Generated landing visuals must read as realistic photography rather than cartoon illustration. Local photo assets support the product story without implying live data; no caption labels such as “ภาพถ่ายประกอบ · แนวคิดผลิตภัณฑ์” are needed on the visual. |

### Landing photo-led refresh — 2026-08-20

| ID | Decision |
|---|---|
| D-75 | The root Hero, workflow, and closing entries use real-photo surfaces within the approximately 1280px public shell. Decorative gradients may move subtly, but cards must remain readable and the footer logo is shown directly without a contrasting logo box. |
| D-76 | Landing entry cards use balanced editorial photo windows rather than circular crops, and the Hero product board uses a clear split between daily work and supporting photography. |

### BF-2 Booking & Calendar foundation — 2026-08-17

| ID | Decision |
|---|---|
| D-59 | `/business/calendar` is the live shared Business Calendar destination in desktop and mobile navigation. It answers cross-module Branch planning, not Grooming operations, Hotel occupancy or Daycare attendance. |
| D-60 | BF-2 keeps Booking create, edit, review, cancellation and recovery as contextual Calendar task UI. It does not create `/business/bookings/new`, `/business/bookings/[id]`, module Calendar routes or a fake Visit/Order screen. |
| D-61 | The shared Booking foundation represents appointment, date-range and day work without forcing one service module into another module’s operational UX. |
| D-62 | The active browser-local Branch limits Calendar services and filters. A Branch change revalidates an open Booking draft; incompatible service/resource choices cannot remain silently valid. |
| D-63 | BF-2 uses a small Booking-status foundation only: รอยืนยัน, ยืนยันแล้ว, มาถึงแล้ว and ยกเลิก. It does not define service-operation lifecycle states. |

### BF-3 Customers & Pets foundation — 2026-08-21

| ID | Decision |
|---|---|
| D-77 | Customers & Pets is a Business-level shared relationship foundation at `/business/customers` and `/business/customers/[customerId]`. A Customer and Pet relationship is shared across Service Modules and Branches; Booking history retains Branch attribution. |
| D-78 | Customer relationship, Guardian authority, Pet ownership, Passport connection, and active Passport consent remain separate concepts. `ผู้ติดต่อหลัก` is not an ownership or Guardian-authority label. Business-local notes/tags never overwrite Guardian-controlled Pet Passport data. |
| D-79 | A local Customer or Pet relationship may exist without a Meawketting account or Pet Passport. A connection state never grants permanent access; current consent/access decides protected visibility. A phone duplicate warning offers an explicit choice and does not silently merge records. |

### BF1–BF3 operational UI correction — 2026-08-22

| ID | Decision |
|---|---|
| D-82 | Service classification uses icon + visible label + restrained tint: Grooming/Scissors/Coral, Hotel/Bed/Sky, Daycare/PawPrint/Mint. Service color is independent from status, while Pastel Yellow remains the Business action/selection color. Grape is reserved for a future/special classification where approved. |
| D-83 | The shared Calendar supports Day, Week, Month, and Custom 28/35/42-day views. A date-range Booking keeps its exclusive check-out domain model and renders as a continuous Hotel stay segment rather than duplicated daily cards. |
| D-84 | Refined by D-111. Calendar drag, both-edge resize and duplication create a normal Booking draft, run the existing Branch/resource/capacity evaluator, and only then use the existing save path. Selecting the Booking and editing its fields remains the complete non-drag alternative. |

### BF-4 Inbox & Customer Communication foundation — 2026-08-23

| ID | Decision |
|---|---|
| D-85 | `/business/inbox` is the live Business Core communication destination. BF-4 keeps one ongoing browser-local Conversation per Business + Customer relationship; Pet, Booking, Branch, and future Service Job are optional context references rather than separate identities or automatic threads. |
| D-86 | Inbox uses desktop split view and mobile list → full conversation task. No `[conversationId]` route is added; `?conversation=<id>` provides reload/deep-link recovery, while Customer/Booking launch parameters reuse/create then normalize to it. |
| D-87 | Conversation is Business-wide across Branches, but Branch switching does not transfer Passport consent or protected scope. Context outside the active Branch is attributed and cannot open that Branch's Booking editor from Inbox. |
| D-88 | Structured `ขออนุมัติเพิ่มบริการ` is a local request message. Only the explicitly labeled Guardian-side test simulator can approve/decline; the decision is idempotent and BF-4 does not mutate Booking, Charge, Payment, or settlement state. |
| D-89 | Refined by D-113. BF-4 supports browser-local text, quick replies, unread counts, search, request states and cookie-only presentation preferences. Real delivery/read synchronization, attachments/uploads, notifications, LINE/email/SMS, full Consumer Inbox, retention, and production authorization remain unimplemented/open. |

### BF-5 Grooming Operations Foundation — 2026-08-27

| ID | Decision |
|---|---|
| D-115 | **Grooming Operations Foundation is authorized and implemented as a local prototype only.** `/business/grooming` is live only for an active Branch with Grooming enabled. It is an execution surface; Calendar remains the shared Booking planning surface. This narrowly supersedes D-97's historical “do not start BF-5” boundary. Its historical Hotel/Billing prohibition is narrowly superseded by D-120/D-126; all other listed future work remains unauthorized. |
| D-116 | **Booking and Grooming Service Job remain distinct objects.** A Grooming Booking locally projects/links a Pet-specific Grooming Service Job; Booking keeps its existing planning status while the Job owns its guarded execution lifecycle, actual timing, shared Resource assignment, internal note, add-ons, and lightweight history. Customer/Pet identity and protected Passport data are not copied into the Job. |
| D-117 | **Grooming uses the existing shared foundation.** Active Branch capability controls both navigation and route behavior; Resources use the existing groomer/station/dryer records and conflict evaluator; Intake attaches a valid matching Grooming Job; Home and Customer/Pet history derive from the same Job state; Inbox carries Job context without creating another conversation identity. |
| D-118 | **Structured add-on approval stays Guardian-only.** The local Business UI can request/cancel but cannot approve. Only the explicitly labeled local Guardian-response simulator can approve/decline. A valid approval idempotently appends the add-on and added estimate to the linked Grooming Service Job only—never Booking, Charge, Payment, settlement, discount, refund, or pricing authority. |
| D-119 | **Grooming visual/interaction treatment is workflow-first.** Pet visual anchors, Coral/Scissors module classification, semantic status/attention, guarded desktop/tablet drag, and a mobile detail/status alternative use the existing Warm White Design System and reduced-motion behavior. Coral never replaces semantic status, and drag never becomes the only state-change path. |

### BF-6 Hotel / Boarding Operations Foundation — 2026-08-31

| ID | Decision |
|---|---|
| D-120 | **Hotel / Boarding Operations Foundation is authorized and implemented as a local prototype only.** `/business/hotel` is live only for an active Branch with Hotel enabled. It is the execution and occupancy surface; Calendar remains the shared date-range Booking planning surface. This narrowly supersedes D-115's historical “does not authorize Hotel” boundary. Its historical “does not authorize Billing/Payments or BF-7” clause is narrowly superseded by D-126; all other listed future work remains unauthorized. |
| D-121 | **Booking and Hotel Stay remain distinct objects.** A Hotel Booking locally projects/links one Pet-specific Stay per booked Pet. Booking retains the exclusive check-out date-range planning model; Stay owns its guarded Reserved → Checked-in → Staying → Ready for pickup/Checkout → Completed lifecycle, with Cancelled/No-show terminal support, actual operational timing, room/zone assignment, movement history, care work, Business notes and lightweight attention/incident records. Shared Customer/Pet identity and protected Passport data are not copied into the Stay. |
| D-122 | **Hotel reuses the shared Intake and Resource foundations.** Booking launches the existing Intake flow with an explicit matching Hotel Stay identifier, and successful Intake hands back to that Stay for room-required check-in. Rooms/zones remain shared Branch Resources; assignment, move and date changes run the existing capacity/conflict guard before commit and preserve movement history. BF-6 does not close room-sharing, overbooking, waitlist or production capacity-policy questions. |
| D-123 | **Daily Care is a lightweight operational checklist, not a medical system.** Food, water, activity, notes and completion state belong to the Stay. Medication may appear only with explicit instructions and a matching customer-confirmed Intake authorization. Lightweight incident/attention notes, Business-internal notes and customer messages remain separate; Hotel launches reuse the existing Business + Customer Inbox Conversation rather than creating a Hotel conversation identity. |
| D-124 | **Hotel integrates by derivation, not duplicated records.** Home derives arrivals, departures, occupancy and attention from shared Stay state; Customer/Pet detail derives active and historical stays; Calendar continues to render the Booking's continuous date range; Inbox carries optional Stay context. The Hotel operations view must not become another Booking, Customer, Pet, Inbox or Intake store. |
| D-125 | **Hotel visual/interaction treatment is occupancy-first and responsive.** Desktop/tablet may use a continuous multi-day room/zone board and guarded drag-to-move with rollback feedback. Mobile uses grouped tabs/lists and a complete non-drag room assignment alternative rather than compressing the desktop board. Sky identifies Hotel, semantic colors identify status/attention, Brand Yellow remains the primary action, and reduced-motion behavior remains supported. |

### BF-7 Billing, Payments & Revenue Foundation — 2026-09-01

| ID | Decision |
|---|---|
| D-126 | **Billing, Payments & Revenue Foundation is authorized and implemented as a local prototype only.** `/business/billing` is a live Finance destination in the shared Business shell. This narrowly supersedes the BF-6 historical prohibition on BF-7 and the Finance-planned clause in D-56. It does not authorize BF-8, real payment processing, Backend/Database, deployment, Consumer work, or a financial-accounting expansion. |
| D-127 | **Charge and Payment remain separate local records.** A Charge captures what is owed with `base-service`, `add-on`, `manual-adjustment`, and `discount` lines; a Payment captures how and when funds were received with allocation(s). `unpaid`, `partial`, `paid`, and `cancelled` are derived from Charge cancellation/allocation state, not from Grooming/Hotel execution. This implements D-46 without changing its multi-service Visit/Order parent as an OPEN concept. |
| D-128 | **BF-7 reuses shared Business state and Branch attribution.** Charges and Payments stay in the existing browser-local Business envelope and reference shared Customer/Pet/Booking/Job/Stay context rather than creating a financial silo. A Booking-level base amount is represented once so multi-Pet Jobs/Stays do not duplicate it; Billing, Customer history and Home revenue derive from the same records. |
| D-129 | **Checkout is explicit and remains separate from execution.** Grooming and Hotel can hand their linked Job/Stay to BF-7 review, but ready/completed operational status never proves payment. Approved Grooming add-ons remain Job-only Inbox effects until checkout idempotently reconciles them into a Charge. An unpaid Charge may be cancelled with a reason; BF-7 has no refund processor or automatic reversal of recorded Payments. |
| D-130 | **Money and communication are deliberately narrow prototype assumptions.** Amounts are whole Thai Baht integers; local payment methods are Cash, bank-transfer and Other. A staff member may explicitly send a local billing text through the existing Business+Customer Conversation, but Inbox never mutates a Charge/Payment and no LINE delivery, payment link, provider confirmation or notification is implied. |
| D-131 | **Financial policy remains open.** BF-7 does not decide price/discount authority, tax/invoice requirements, refund policy, payment provider, accounting treatment/export, or cross-Branch checkout/payment/settlement; OQ-BF15–19 and OQ-BF27–29 remain active. |

### BF-8 CareProof, Service Record & Handover Foundation — 2026-09-02 (SUPERSEDED)

The standalone module and handover workflow below are retained only as historical trace. D-137–D-140 are the active BF-8 correction.

| ID | Decision |
|---|---|
| D-132 | **CareProof, Service Record & Handover is authorized and implemented as a Business-side local prototype only.** `/business/careproof` is a live shared destination within the existing browser-local Business envelope. This narrowly supersedes D-126's historical “does not authorize BF-8” boundary; it does not authorize BF-9, Guardian/LINE delivery, Backend/Database, deployment, medical work, a document/certificate system, or real photo storage. |
| D-133 | **One execution source produces one Service Record.** A completed Grooming Job or checked-out/completed Hotel Stay creates/reuses a Pet-specific, Branch-attributed record keyed by its source ID. It references shared Customer, Pet, Booking, Job/Stay, Charge/Payment, and Conversation identity rather than duplicating those domains. A Grooming re-completion before handover refreshes permitted facts in that same record and appends a source-revision snapshot; it never makes a second record. |
| D-134 | **CareProof, Payment, and Handover remain three separate state concerns.** BF8 reads the existing BF7 financial status as a reference only. Staff must explicitly confirm review before setting `handed-over`; Paid does not hand over automatically and handover does not create/mutate Charge, Payment, revenue, or execution state. A handed-over source cannot be silently reopened in this prototype. |
| D-135 | **CareProof privacy and correction scope stay intentionally narrow.** Grooming may expose permitted service/add-on/resource/local-note facts; Hotel may expose dates, room/zone and ordinary daily-care summary only. Passport, Guardian instructions, Intake, medication authorization, incident content, Guardian photo data, and ownership claims are excluded. Summary/Business-note corrections retain prior value, reason, staff, monotonic time and duplicate-safe request key; metadata-only photos have no uploader/storage/delivery. |
| D-136 | **Guardian visibility is a future policy/channel decision.** BF8 may send an explicit local Inbox text, but does not create a Guardian record view, public share, LINE route, LINE message, delivery proof, certificate/print output, or retention/delete policy. OQ-BF21, OQ-BF23, OQ-BF24 and OQ-BF26 remain open. |

### BF-8 Service Record correction — 2026-09-02

| ID | Decision |
|---|---|
| D-137 | **The standalone CareProof experience is SUPERSEDED.** Service Record remains shared Business domain data only: no CareProof module, dashboard, menu, management page, duplicate summary page, standalone route, or post-completion handover workflow. Execution stays in Grooming/Hotel, money stays in Billing, and history stays in Customer/Pet detail. |
| D-138 | **One execution source produces one Service Record.** A completed Grooming Job or checked-out/completed Hotel Stay creates or updates one Pet-specific, Branch-attributed record keyed by its source ID in the existing Business envelope. Repeated completion/checkout is idempotent; source re-completion keeps an append-only permitted revision and never creates a duplicate. |
| D-139 | **Customer/Pet history is the only active Service Record view.** Customer and Pet detail use one inline `ประวัติบริการ` timeline/list with Pet visual anchor and expandable summary/details, activities, staff/resources, permitted photo metadata and completion time. A short BF7 payment reference may be shown read-only; Service completion ≠ Paid and Paid ≠ Service completion. |
| D-140 | **Privacy, correction and Guardian boundaries remain narrow.** Service Records contain permitted Business service facts only and never copy Pet Passport, Guardian care, Intake, medication authorization, incident or ownership data. Lightweight corrections retain prior value, reason, staff, time and request key. Guardian visibility is planned for a future LINE Mini App; Consumer, LINE integration, Backend, real photo storage and certificate/print work remain out of scope. Legacy handover fields/history in old browser records are retained only for compatibility and are not advanced by current UI. |

### Production platform direction correction — 2026-08-21

| ID | Decision |
|---|---|
| D-80 | **Cloudflare replaces Vercel as the target production platform direction.** `TARGET PLATFORM: Cloudflare`; `PRODUCTION: NOT DEPLOYED / NOT VERIFIED`. |
| D-81 | BF-3 does not choose Cloudflare Pages, Workers, Durable Objects, D1, R2, KV, a storage model, or a deployment architecture. Those decisions remain open for the future Backend / Production phase. |

### Superseded platform direction

| ID | Status | Historical direction | Replacement |
|---|---|---|---|
| S-01 | **SUPERSEDED** | Any earlier Vercel hosting/deployment target direction | Cloudflare is the active target platform direction; no Cloudflare deployment is claimed. |

### Superseded Business visual direction — 2026-08-23

| ID | Status | Historical direction | Replacement |
|---|---|---|---|
| S-02 / D-66 | **SUPERSEDED** | Business Primary `#F2BC26`, hover `#E0A30B`, dark ink `#281417`, and the prior Yellow/Amber token mapping | D-92 and the current Design System palette |
| S-03 / D-11 | **SUPERSEDED** | Noto Sans Thai as one active UI font across operational and Consumer surfaces | D-107: LINE Seed Sans TH for Business/public; existing Noto Sans Thai remains Consumer-only |
| S-04 / D-73/D-75 | **SUPERSEDED IN PART** | Approximately 1200px as the public landing shell cap | Approximately 1280px public/marketing shell; operational width remains workflow-specific |
| S-05 / D-82 | **SUPERSEDED IN PART** | Grooming service classification used a peach family and generic Paw naming | Grooming/Coral and Daycare/PawPrint under D-82/D-93 |
| S-06 | **SUPERSEDED** | “Light theme is first; semantic tokens remain theme-ready” for Business | Business is explicitly Light / Warm White only; no Business dark-mode implementation or toggle under D-92 |

### Hybrid Business foundation — 2026-08-14 / BF-1 route and shell — 2026-08-15

| ID | Decision |
|---|---|
| D-36 | User-facing Business hierarchy is **Person → Business → Branch → Enabled Service Modules** |
| D-37 | A Business and Branch may enable several services; no fixed Business Type or separate Grooming/Hotel/Daycare account |
| D-38 | `Workspace` is not a user-facing level; any internal tenant abstraction requires no Product vocabulary change |
| D-39 | Business product separates **Business Core** from service-specific modules while sharing Customer, Pet and operational foundations |
| D-40 | Customer and Pet identities are shared across modules; modules cannot create independent relationship silos |
| D-41 | A parent Visit/Order concept must group related Service Jobs; final user-facing term remains OPEN |
| D-42 | Booking supports several Pets/jobs and slot/date/date-range models; exact multi-Pet policy remains OPEN |
| D-43 | Service Job remains the shared direction for module work extended as Grooming Job, Hotel Stay, future Daycare Visit, etc.; module UX and lifecycles remain service-specific. BF-5 locally implements Grooming Service Jobs and BF-6 locally implements Hotel Stays. |
| D-44 | Resource is a shared internal model; UI uses context words such as ช่าง, จุดบริการ, ห้อง and โซน |
| D-45 | Inbox/Conversation is Business Core and may carry contextual structured decisions, not only generic chat |
| D-46 | Charge and Payment are separate; a multi-service Visit may support combined checkout |
| D-47 | Billing/Revenue do not commit Meawketting to General Ledger, payroll, tax filing or full accounting/ERP |
| D-48 | Phase E is the **Shared Business Intake Engine** and remains valid across Service Modules |
| D-49 | Service Record is cross-service: shared record/evidence foundation plus module-specific content |
| D-50 | Grooming uses appointment/calendar UX; Hotel uses stay/occupancy UX; Daycare uses zone/capacity UX |
| D-51 | Hotel room types are Business-configurable and must not be hardcoded to example names |
| D-52 | Branch is operational scope, not cosmetic context; transfer rechecks resource, consent, execution and attribution |
| D-53 | Business UI direction is **WARM OPERATIONAL CLARITY**, with natural Thai and restrained operational motion |
| D-54 | The Business Foundation stage precedes further feature development; generic Phase F is not the automatic next step |
| D-55 | Current local Business App Home route is `/business/home`; public Business Landing is `/`; mock Login remains `/business/login` |
| D-56 | Business navigation exposes live Home, Calendar, Customers, and BF-4 Messages plus Scanner in the Header. Grooming and Hotel are live only for capable active Branches; Daycare, Reports, Team and Settings remain planned/disabled controls with no fake routes. The historical Finance-planned clause is superseded by D-126. |
| D-57 | The browser-local active Business/Branch context drives Home summaries and visible Branch-enabled service rows together; capability-gated Grooming and Hotel routes are live only for capable Branches, while a service module not enabled for the active Branch remains absent and its route does not expose operations. |
| D-58 | Business User Menu is account/context-focused: current Business, Branch, role and Sign out; product destinations stay in main navigation |

### Product and trust foundation (Preserved)

| ID | Decision |
|---|---|
| D-01 | Product name is **Meawketting**; initial species are Cat and Dog with Cat first/default and Pet-ready language |
| D-02 | Create first, claim later remains current web-prototype behavior. The target Consumer entry/auth direction is LINE-first with future LINE Login; current `/login` is only a mock web prototype, and production identity linking remains open. Business Google Login is a separate Business prototype concern. |
| D-03 | One Person identity may hold several contexts; Consumer, Business and Platform Admin authorize and navigate separately |
| D-04 | Business never owns Pet Passport data through sharing, intake, service or payment |
| D-05 | Quick Passport, Public Safety and Temporary Business QR are three separate privacy contracts |
| D-06 | Pet Detail is Passport-first; Quick Passport QR is a five-minute state, not a Business permission or separate route |
| D-07 | Temporary Business access binds recipient, Branch when applicable, purpose, scope, duration, consent and revoke/history |
| D-08 | Business intake creates Business data/correction suggestions and never overwrites Guardian source data |
| D-09 | Service Document is not automatically a Tax Invoice; neutral `Acknowledge` language remains until legal policy is decided |
| D-10 | Memorial, Archive, Transfer and Delete are distinct lifecycle actions |
| D-12 | Passport/export is 4:5 with six current styles; icons use Lucide through `react-icons`, never Emoji/Dingbat UI glyphs |
| D-14 | Business owns its Landing, Login, Header/User Menu and operational navigation; current local namespace is `/business` |
| D-16 | Route model is Product → Module → Route → Flow → Task → State → Component; flow steps and old Page IDs are not routes |
| D-17 | The canonical documentation set is the 12 owner files routed by `docs/README.md`; the HTML manual is derived only |
| D-18 | `/workfiledesign` is outside documentation-rebase scope: do not modify, restructure, rename or delete it without an explicit direct Product Owner instruction |
| D-19 | **CURRENT WEB PROTOTYPE ONLY / SUPERSEDED AS FINAL CONSUMER DIRECTION:** the retained Consumer prototype uses four equal destinations—หน้าหลัก, สัตว์เลี้ยง, กิจกรรม and ข้อความ. Home and Messages are **PLANNED / DISABLED**; Pets is live at `/my-pets`; Activity is live at `/activity`. Final LINE Mini App navigation is undecided. |
| D-20 | In the current web prototype, Create Passport is a contextual action inside My Pets at `/create-passport`, not a primary navigation destination. |
| D-21 | In the current web prototype, the signed-in Consumer User Menu is account-oriented: identity information and Sign out only. |
| D-22 | In the current web prototype, planned Consumer Home and Messages must not receive fake routes. The future LINE Mini App must not receive detailed navigation design until its separate phase. |

## Open Business foundation questions

| ID | Question |
|---|---|
| OQ-BF01 | Final user-facing term: Visit, Order or Service Order? |
| OQ-BF02 | When and how may one Booking contain multiple Pets? |
| OQ-BF03 | How do statuses, cancellation and checkout behave for a multi-service Visit? |
| OQ-BF04 | Resource conflict detection, hold and resolution policy? |
| OQ-BF05 | Branch transfer authority, customer approval and operational policy? |
| OQ-BF06 | Cross-Branch consent and reauthorization rules? |
| OQ-BF07 | Customer ownership/contact authority and who may book/approve for a Pet? |
| OQ-BF08 | Shared Booking convenience vs Pet-specific consent boundaries? |
| OQ-BF09 | Hotel capacity, room-sharing and room-type capacity rules? |
| OQ-BF10 | Required room-move assignment/history detail? |
| OQ-BF11 | Is overbooking ever allowed and under what authority? |
| OQ-BF12 | Waitlist model and conversion/expiry behavior? |
| OQ-BF13 | Grooming duration, buffer and compatible-service rules? |
| OQ-BF14 | Cancellation and no-show policy by module? |
| OQ-BF15 | Pricing override rules and audit requirements? |
| OQ-BF16 | Discount authority by role/Branch? |
| OQ-BF17 | Refund policy and relationship to completed work? |
| OQ-BF18 | Payment providers and supported settlement methods? |
| OQ-BF19 | Tax receipt/invoice requirements and jurisdictional scope? |
| OQ-BF20 | Conversation retention and customer access? |
| OQ-BF21 | Photo/message retention and deletion policy? |
| OQ-BF22 | Structured Inbox approval identity, expiry, withdrawal and dispute rules? |
| OQ-BF23 | Which Business-generated notes are visible to the Guardian? |
| OQ-BF24 | Guardian Service Record visibility, correction and hide/delete policy? |
| OQ-BF25 | Required Hotel daily-care tasks and exception handling? |
| OQ-BF26 | Service-specific evidence retention requirements? |
| OQ-BF27 | Branch revenue attribution for transfer and multi-Branch work? |
| OQ-BF28 | Cross-Branch charges, checkout and payments? |
| OQ-BF29 | Accounting export/integration direction? |
| OQ-BF30 | Grooming-specific style preferences, bath logs, compatible-service rules, and the operational scope of a future full Grooming system? |

## Retained open questions

| ID | Question / reversible treatment |
|---|---|
| OQ-01 | Anonymous Passport draft retention/expiry — describe as temporary without a promised duration |
| OQ-02 | Temporary Business QR presets, maximum and one-time behavior — current 2/8/24-hour values are Demo only |
| OQ-03 | Digital acknowledgement/signature and legal status — use neutral `Acknowledge` |
| OQ-04 | Ownership transfer evidence, appeal and interim authority — no instant transfer |
| OQ-05 | Lost location precision/retention — area-level default, precise location hidden |
| OQ-06 | Required Business verification evidence and public badge scope |
| OQ-07 | Guardian/Co-guardian permission presets and high-risk authority |
| OQ-08 | Notification channels/providers and owner-unreachable handling |
| OQ-09 | Required Intake fields/templates by service type |
| OQ-10 | Incident severity, dispute and appeal/SLA policy |
| OQ-11 | Shared document link expiry, PDF technology, generation and retention |
| OQ-12 | Backup/recovery, deletion/export and audit retention |
| OQ-13 | Admin dual-control actions and reason-bound sensitive access |
| OQ-14 | Cloudflare runtime/storage, domain, security and deployment architecture (platform direction is decided; implementation architecture remains OPEN) |

## Current reversible assumptions

- Primary Guardian controls high-risk Pet actions until relationship policy changes.
- Public Lost uses area-level location text; precise coordinates are hidden.
- Production Scanner requires authenticated membership before protected data.
- Consent snapshots are versioned.
- Business is Light / Warm White only with no dark-mode implementation or toggle; Consumer visual behavior remains unchanged during the pause.
- Current Business, Branch, role, QR duration and checked-in references are Demo fixtures, not production policy.
- BF-2 Booking, service, Customer/Pet reference and Resource/capacity fixtures are browser-local demo data.
- BF-3 Customer, Business-local Pet, tags, notes, Passport connection/access presentation, and duplicate warning are browser-local demo data. Real Customer/Guardian authority and server enforcement remain unimplemented.
- BF-4 Conversation/message/unread/request data is same-tab browser-local state. Its minimum Guardian-response simulator is only a test boundary; real participant identity, delivery, authorization, retention, notifications, Booking add-on effects, and disputes remain unimplemented/open.
- BF-5 Grooming Service Jobs, timing, resource assignment, internal notes, activity history, and Job-linked structured-request effects are same-tab browser-local data. The fixture date/time and attention wording are demonstration aids, not an operating-hours, SLA, pickup, or staff-scheduling policy.
- BF-6 Hotel Stays, room/zone assignments, move history, care tasks, lightweight incidents and operational timing are same-tab browser-local data. Shared Calendar date-range Bookings remain the planning source; the Stay is a linked execution projection rather than a second Booking.
- BF-7 Charges and Payments are same-tab browser-local data in the shared Business envelope. Amounts are whole Thai Baht integers; Cash, bank-transfer and Other are recorded locally with duplicate-safe request keys. Charges retain Branch attribution, but real payment processing, tax/invoice treatment, refund policy, provider confirmation, accounting/export and cross-Branch settlement remain OPEN/NOT IMPLEMENTED.
- A Charge holds a one-time Booking-level base amount plus source-aware add-on/adjustment/discount snapshots. Manual adjustments, discounts and unpaid cancellation require a stated reason. Charge status derives from Payment allocations/cancellation, so it is not a Booking, Job or Stay lifecycle field.
- The local Hotel projection creates/links one Stay per booked Pet. This is a reversible prototype implementation, not a decision on the open multi-Pet Booking policy (OQ-BF02) or future Visit/Order parent (OQ-BF01).
- Hotel capacity validation and movement history are UI safety foundations only. Room-sharing/capacity (OQ-BF09), move-history detail (OQ-BF10), overbooking authority (OQ-BF11), waitlist (OQ-BF12), cancellation/no-show policy (OQ-BF14), required care/exception policy (OQ-BF25), full medical authority and production incident policy remain OPEN.
- Local medication care requires explicit instructions plus a matching customer-confirmed Intake authorization. This does not establish a medical record, prescription authority, treatment policy, clinician role or production consent model.
- The local Grooming projection creates/links one Job per booked Pet. This is a reversible prototype implementation, not a decision on the open multi-Pet Booking policy (OQ-BF02) or the future Visit/Order parent (OQ-BF01).
- The local guarded Job transitions and Resource conflict check provide UI safety only. Grooming buffers/compatible services (OQ-BF13), cancellation/no-show (OQ-BF14), pricing override (OQ-BF15), discount authority (OQ-BF16), refund policy (OQ-BF17), resource hold/resolution (OQ-BF04), and structured approval identity/expiry/dispute policy (OQ-BF22) remain OPEN.
- A local Guardian-simulator approval may update only a linked Grooming Service Job's add-ons and estimated duration. It neither proves Guardian identity nor authorizes a Booking, Charge, Payment, price, discount, refund, or settlement change.
