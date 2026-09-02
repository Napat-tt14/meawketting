# UX Rules

Status: **CANONICAL BEHAVIOR, STATE AND RECOVERY CONTRACTS (BUSINESS UX/UI + RESPONSIVE SYSTEM RESET 2026-08-30)**
Owner: UX Architecture

Visual treatment is owned by [DESIGN_SYSTEM](./DESIGN_SYSTEM.md); domain objects by [ARCHITECTURE](./ARCHITECTURE.md).

## Core principles

1. **Business-first commercial clarity.** Business operations drive commercial value; Pet Passport & Guardian Network provides the trust moat.
2. **Minimize navigation without removing safety.** Add a boundary only for comprehension, privacy, meaningful decision, stable identity or recovery.
3. **Concrete consent.** Recipient, purpose, data, duration and revoke must be understandable without legal text.
4. **Sensitive data hidden by default.** Public, Business and Admin see only what current authority requires.
5. **Trust through evidence and limits.** Show source, actor, time, audience and uncertainty; never imply unsupported medical/legal/security certainty.
6. **Operational speed with context.** Keep Business, Branch, Pet/work state and next action visible without forcing needless screens.
7. **Prefer reversible and traceable action.** Suggestion is not overwrite; Charge is not Payment; service completion is not Paid; room move, Service Record correction and Branch transfer retain history.
8. **One Person, explicit contexts.** Consumer, Business/Branch and Admin authorization never blend silently.
9. **Visual hierarchy before explanation.** Identity, grouping, icon, state and next action should make a screen understandable before supporting copy is read.
10. **Adaptive composition, stable behavior.** Mobile, tablet and desktop may present the same data differently; domain state, authority and recovery behavior do not change with the layout.

## Portal separation and entry points

- **Root Homepage (`/`)**: Main commercial Business Landing page. Primary CTA directs to `/business/login`, with secondary entry for pet owners (`/my-pets`).
- **Compatibility Redirect**: `/business` immediately redirects to `/`.
- **Public Business Header**: A fixed, centered floating-glass Header may link only to implemented routes or anchors that exist on `/`. It contains the real Brand, compact navigation and a primary Business CTA—never a theme toggle, Design System badge, Emoji or planned/dead link.
- **Public Business Footer**: The rounded public Footer contains only real destinations/actions and is limited to public/marketing surfaces. Logged-in Business operational routes never render the marketing Footer.
- **Consumer Navigation (Paused / Preserved)**: Consumer shell uses four slots (หน้าหลัก, สัตว์เลี้ยง, กิจกรรม, ข้อความ). `สร้าง Passport` is contextual inside My Pets (`/my-pets`), not in the navigation bar. **CONSUMER VISUAL REDESIGN: PAUSED UNTIL PRODUCT OWNER REOPENS.**

## Business visual-system boundaries

- The attached `workfiledesign/htmlpack/index.html` and `design-system.css` define Business/public visual direction only; existing Product behavior, privacy and authority rules remain canonical here and in Architecture.
- Business uses LINE Seed Sans TH and a Light / Warm White theme only. There is no Business dark theme, dark portal mode or theme toggle. Consumer retains its current visual system and font.
- Emoji/Dingbat glyphs are not UI icons. Use the existing Lucide wrapper plus accessible text/labels.
- Rainbow CTA concepts remain reserved/experimental. Multi-accent indeterminate progress is allowed only for structural Business loading; reference AI Marketing/Agency examples are not Product content.

## Business language

Use natural Thai for normal staff work. Established Brand/protocol nouns may remain English.

| Internal/English concept | Preferred UI direction |
|---|---|
| Check-in | `รับเข้า` |
| Check-in Review | `ตรวจข้อมูลก่อนรับเข้า` |
| Check-in Complete | `รับเข้าเรียบร้อย` |
| Intake | `ข้อมูลรับเข้า` or context-specific `รับน้องเข้าร้าน` |
| Allowed Data | `ข้อมูลที่ร้านได้รับ` |
| Awaiting Owner | `รอเจ้าของอนุมัติ` |
| Consent Active | `เจ้าของอนุญาตแล้ว` |
| Expired | `สิทธิ์หมดอายุ` |
| Revoked | `เจ้าของยกเลิกสิทธิ์แล้ว` |
| Wrong Business / Branch | `QR นี้ไม่ได้ออกให้ร้าน/สาขานี้` |
| Resource | Use context: `ช่าง`, `จุดบริการ`, `ห้อง`, `โซน` |
| Booking | `การจอง` |
| New Booking | `เพิ่มการจอง` |
| Service Job | Use natural service wording such as `งานอาบน้ำ / ตัดขน`; avoid exposing the internal object name in ordinary staff copy |
| Hotel Booking | `การจองโรงแรม` or `การจองเข้าพัก` when the date range is the focus |
| Waiting to start | `รอเริ่ม` |
| In service | `กำลังทำ` |
| Ready for pickup | `พร้อมรับกลับ` |
| Availability | `เวลาว่าง` or `พร้อมให้บริการ` when the context is clear |
| Conflict | Explain the specific `เวลาชน` / `ไม่ว่าง`; never expose an internal error code |
| Estimated price | `ราคาประมาณ` |
| Charge | `ยอดเรียกเก็บ` or `รายการที่ต้องชำระ`; do not call it a payment |
| Payment | `การรับชำระ` or `บันทึกรับชำระ` |
| Outstanding balance | `ยอดคงเหลือ` |
| Partially paid | `ชำระบางส่วน` |
| Paid | `ชำระแล้ว` |
| Cancelled Charge | `ยกเลิกรายการ` with its reason |
| Service Record | `ประวัติบริการ` or `Service Record`; never label it as a receipt or Pet Passport |

Do not mix internal technical nouns into ordinary Thai instructions without a real comprehension benefit.

## Business content density

- **One idea = one label.** Use one operational H1, optional short context and the primary action; begin the task immediately after that.
- Operational UI avoids marketing-style hierarchy. Remove eyebrow/subtitle/section headings that merely repeat the page or field meaning.
- Helper copy is exception-based and must help a decision, prevent an error, state an important status, name the next action or explain a necessary constraint.
- Use progressive disclosure for detail. Keep scans and lists compact; reveal permission, source, expiry and longer context at the relevant detail level.
- Prefer lists before tables when Customer/Pet relationships read better as rows.
- Chips are reserved for status, filter and tag—not names, phone numbers, services or explanatory sentences.
- Show demo context once in the shell or page context rather than appending `Demo` / `(ตัวอย่าง)` to every record.
- Development fixtures, simulators and interruption controls remain in state/test tooling and must not render as staff-facing Product controls.

## Business Home, navigation and context (BF-1)

- Mock Business Login enters `/business/home` by default.
- Business Home prioritizes attention and next work before compact summaries. The shell labels the page context as demo once; unavailable real integrations are named only where their limitation matters.
- Business Home uses an operational banner with explicit previous/next arrows. It advances every six seconds, pauses during hover/focus, and stops for reduced-motion. Images stay mounted in one transform-only track so transitions slide without replacement flicker. Desktop uses a 50:50 hero split with square media capped at 400×400px beside add Booking / scan intake / find Customer; tablet uses a compact 2:1 crop; mobile uses a square composition before the same actions. BF-7 revenue/current outstanding values use the same recorded local Payment/Charge data as Billing; no separate revenue fixture is shown.
- The compact header keeps the active Business and Branch visible. Role remains inspectable in the user menu; top-right controls align to the same 44px grid and the account click-away layer never blurs the page. The prototype switcher changes browser-local context only.
- The logged-in Header may inherit the public Warm White/glass visual DNA, but compact operational usability, Branch context, Scanner access, User Menu and mobile safe areas take priority over a marketing pill treatment.
- Changing Branch updates Home values and the visible module menu together. Grooming and Hotel are live service destinations only when the active Branch enables the matching capability; modules not enabled for the Branch remain absent.
- Desktop navigation has live Home, Calendar, Customers & Pets, Messages and Finance plus a prominent Scanner action in the header. Mobile has exactly Home, Calendar, Scan, Messages and More; Customers & Pets and Finance are live inside More. Service Record is shown in Customer/Pet detail, not navigation.
- Service navigation under `งานบริการ` contains live capability-enabled Grooming and Hotel destinations. Daycare, Reports, Team, and Settings remain under `ยังไม่เปิดใช้`; Finance is a live shared destination, while Service Record is shared context data rather than a module switch.
- Planned destinations use native disabled semantics plus `aria-disabled`, reduced emphasis, and no `href`; Mobile More mirrors live Branch-enabled services and the same planned groups without adding fake navigation behavior.

## Shared Booking & Calendar rules (BF-2 Live)

- Calendar answers “ร้านมีอะไรเกิดขึ้นเมื่อไร?” across the Service Modules enabled at the active Branch.
- Desktop/tablet supports Day, Week, Month, and Custom planning views beginning on Sunday. Custom ranges use whole seven-day rows: 28, 35, or 42 days. Mobile uses a readable date-oriented chronological Agenda rather than a compressed seven-column grid. The last selected view/range is a cookie-only browser preference.
- Hotel date-range Bookings render as one continuous visible stay segment per calendar row with start/middle/end edges and one accessible label. They are never repeated as independent daily cards.
- Booking items communicate service type with icon, text, and restrained service tint. Service color never carries status; status retains text and an icon. Cancelled items remain available only when their status filter includes them.
- Creating and editing bookings happens within a contextual dialog/sheet without leaving the calendar view.
- Create/Edit uses one title followed by a compact visual service selector, `ลูกค้า`, `สัตว์เลี้ยง`, and service-specific fields. A Customer and Pet relationship may be added inside this flow by reusing the existing editors and state source. Availability/conflict/recovery copy appears only when the state warrants it.
- Capacity checks validate all required people, places/equipment, and capacity constraints before review.
- Pointer drag moves supported Bookings; both appointment edges resize in 30-minute steps and both Hotel edges shrink/extend the exclusive check-out range. Alt-drag duplicates instead of moving. A focused Booking supports Ctrl/Cmd+C then Ctrl/Cmd+V; copy always receives a new Booking ID. Touch uses deliberate long-press drag with larger edge handles. Every preview and commit passes through the existing Branch/resource/capacity evaluator. Invalid destinations keep the original Booking and name the concrete conflict plus recovery actions.
- Drag/resize success must not insert an alert above the schedule. Use settle emphasis or a fixed neutral toast; keep the concise gesture/shortcut legend after the schedule so the grid never jumps.
- Clicking a Booking selects it in place so staff can copy it before editing; Enter or a deliberate double-click opens the same date/time editor. Keyboard and assistive-technology users can complete every supported edit without drag.
- Cancellation preserves booking history in local state and releases demo allocation.

## Grooming Operations rules (BF-5 Live Local Prototype)

- Calendar plans a **Booking**; Grooming executes a distinct Pet-specific **Grooming Service Job** linked by reference. Booking status and Job status must never be merged into one field or treated as synonyms.
- The local Grooming lifecycle is guarded and reversible across active workflow states: `booked ↔ checked-in ↔ waiting ↔ in-service ↔ ready-for-pickup ↔ completed`; direct movement to a selected active destination is allowed from the board, while `cancelled` remains terminal.
- Grooming status uses visible Thai text, icon/non-color context, and semantic status treatment. Coral and Scissors identify the Grooming module only; they never communicate a status, approval, error, or attention level.
- Desktop/tablet support status drag/drop as an acceleration. A pointer-following card preview, valid/invalid destination highlights, and calm settle or rollback feedback must preserve the original Job when a transition is rejected. Keyboard, touch, and mobile users can open the detail and choose a permitted active status; drag is never the sole state-change path.
- Each Job card keeps Pet photo/avatar as the scan anchor, then separates Pet/time on the left, status on the right, and groomer/attention context below. Date and job filter rails are not part of the board surface.
- Job detail uses a section hierarchy: Pet/Customer contact → service/timing → status → resources → add-ons → internal Business notes → separate Customer messages → history. It does not present one long undifferentiated modal, duplicate Customer/Pet records, or expose non-consented Passport data.
- Resource UI names existing shared Resources as `ช่าง`, `จุดบริการ`, and `เครื่องเป่า`. Changing a resource runs the same local availability/conflict foundation; it is not a staff roster, payroll, commission, or scheduling system.
- Attention states remain accessible context and are shown as a compact card row; there is no date/job filter rail. Status is communicated by the centered lane heading, visible text badge and full card surface.
- Internal Business notes remain separate from Customer messages. The Inbox action opens/reuses the Business-wide Customer conversation; the note does not become a Customer-visible message or Passport write.
- Intake reuses the existing consent-safe path. At check-in it may attach/activate only a valid matching Grooming Job; it does not introduce another scan/intake state machine.
- Business may send or cancel an add-service request but **cannot self-approve**. A local Guardian-response helper exists only in fixture/state tests; it is not a staff-facing control. Test approval updates only the linked Job add-on and estimated duration, not Booking, Charge, Payment, discount, refund, or settlement state.
- A completed Job creates/updates one Pet-specific BF8 Service Record with permitted service, approved add-on, staff/resource, local note, and actual-completion facts. Reopening and re-completion preserve the prior source snapshot as audit history rather than creating a duplicate record.
- An explicit checkout action may open the linked Job in BF-7 Billing for separate Charge review and optional Payment recording. A completed Job remains an execution result, not a paid financial state; no post-completion handover workflow is required.

## Hotel / Boarding Operations rules (BF-6 Live Local Prototype)

- Calendar plans a shared date-range **Booking**; Hotel Operations executes one distinct Pet-specific **Hotel Stay** per booked Pet. Booking planning status and Stay execution status must never be merged or treated as synonyms.
- `/business/hotel`, desktop/mobile navigation and the command-palette destination are live only for Hotel-enabled Branches. A non-enabled Branch receives an unavailable direct-route state and no live service link.
- The local lifecycle covers booked/reserved, expected, checked-in, staying, ready-for-pickup/checkout, checked-out, completed, cancelled and no-show foundations. Transitions preserve operational history and never create a Payment or change Charge status. A checked-out/completed Stay with an actual checkout creates/updates its one BF8 Service Record; an explicit checkout may open the linked Stay in BF-7 Billing for separate review.
- Desktop/tablet occupancy uses continuous Stay spans grouped by room/zone with occupied, reserved and available capacity. Mobile uses grouped Today/Stay tabs and lists; it never squeezes the desktop board into narrow columns.
- Assigning or moving a room validates the requested date interval, room/zone capability and capacity before commit. A valid move appends date-bounded assignment/movement history; a conflict preserves the current room and provides calm rollback feedback.
- Desktop room drag is an acceleration only. The Stay detail room selector is the keyboard/touch/mobile alternative; no Hotel task depends on dragging. Motion obeys the canonical settle/rollback scale and reduced-motion fallback.
- Daily care is lightweight: food, water, activity, cleaning/check, note and completion state. Medication requires explicit instructions and Customer-confirmed Intake authorization linked to the same Stay; Passport presence or free-text notes never authorize medication.
- Business notes, care notes and lightweight incident/attention notes remain internal. A Customer message must use the existing Business+Customer Inbox Conversation with Pet/Booking context; no per-Stay Conversation is created.
- Hotel Stay detail groups shared Customer/Pet contact, dates, lifecycle, room, care, internal notes/incidents, Inbox action and movement history. It does not expose non-consented Passport data or become a medical/full incident system.

## Billing, Payments & Revenue rules (BF-7 Live Local Prototype)

- `Service / Job / Stay → Charge → Payment` is the required visible mental model. A Charge records what is owed; a Payment records how and when funds were received. Staff must never be led to infer that creating a Charge, completing a Grooming Job, or completing a Hotel Stay means paid.
- Amounts use whole Thai Baht integers as a **prototype assumption**. Show total, paid and remaining with tabular numerals and clear labels; do not imply VAT calculation, invoice compliance, exchange handling, gateway precision, or accounting policy.
- Status is derived, not separately edited: unpaid, partial and paid come from recorded Payment allocations; cancelled comes from a valid Charge cancellation. Status always uses text and an icon/non-color cue as well as semantic color.
- A Booking-level base amount is represented once. A multi-Pet Booking must not create one full base Charge per linked Grooming Job or Hotel Stay. An approved Grooming add-on remains a Job-only Inbox effect until explicit checkout reconciles it idempotently into the Charge.
- Manual adjustment and discount entries require an explicit reason. Cancelling is allowed only for an unpaid Charge and also requires a reason. Cancellation does not automatically delete, reverse or refund an existing Payment.
- Charge and Payment records preserve Branch attribution. Customer and Pet identity remain shared at Business level, while Billing and Home show the active Branch's financial scope. Cross-Branch checkout, payment and settlement rules remain open and must not be implied by the UI.
- Finance uses a dense desktop table/row pattern only when comparison helps. At mobile widths it becomes labeled Charge/Payment rows or a task sheet; total, status, Branch and the next safe action remain visible without horizontal scrolling.
- The available Payment methods are local Cash, bank-transfer and Other records. A duplicate-safe local submission guard prevents a repeated click from creating a duplicate payment effect. There is no real gateway, bank confirmation, receipt compliance, refund processor, General Ledger, tax or accounting export.

## Shared Service Record rules (BF-8 local domain foundation)

- Service Record is shared domain data, not a module. The visible flow stays in context: Grooming/Hotel execution → automatic record creation/update → Customer/Pet `ประวัติบริการ`. Do not add a CareProof dashboard, menu item, management page, duplicate summary page, standalone route or post-completion handover workflow.
- One Service Record belongs to one completed Grooming Job or checked-out/completed Hotel Stay, scoped to the same Business and Branch. It reuses shared Customer, Pet, Booking, Job/Stay and Charge/Payment references; it never creates a duplicate history fixture, Customer/Pet identity, Invoice, Passport or medical record.
- Grooming shows completed base service, approved add-ons, staff/resource labels, local Business note, completion time and photo metadata if present. Hotel shows stay dates, room/zone, ordinary daily-care summary, permitted local note and completion time. Hotel Service Record must never copy Guardian care instructions, Intake details, medication instructions/authorization or incident content.
- Photo support is metadata-only. There is no upload, cloud/local object storage, public sharing URL, copied Passport image, print/certificate engine or real retention policy in BF8.
- Correction is lightweight and append-only: summary or local Business note changes retain prior value, reason, staff, time and duplicate-safe request key. Source re-completion retains a safe prior source snapshot. No UI action silently destroys original history.
- Customer/Pet detail uses one inline timeline/list. Pet photo/avatar is the visual anchor; expandable items reveal summary, service details, activities, staff/resources, permitted photo metadata, completion time and a short read-only BF7 payment reference. Payment state uses text plus icon/non-color cue and never changes Service Record state.
- Guardian LINE visibility is **PLANNED** and Consumer work remains paused. Legacy handover metadata in old local records may remain for compatibility, but the current UI does not start or advance that workflow.

## Customers & Pets rules (BF-3 Live Local Prototype)

- Customer is a Business-level relationship. A Customer is not duplicated by Grooming, Hotel, Daycare, or Branch; operational history continues to name its Branch.
- `ผู้ติดต่อหลัก` means a contact relationship only. Never use `เจ้าของ` unless the real relationship is known. Booking convenience never grants Guardian or Pet Passport authority.
- A local Customer and a local Pet relationship may be added without an account or Passport. New Pets start unlinked and are clearly presented as Business relationship records, not Business-owned Passports.
- A phone match raises `อาจมีลูกค้ารายนี้อยู่แล้ว`. Staff can view the existing record or choose `สร้างต่อ`; the prototype never silently merges identities.
- Search supports Customer name, Pet name, and phone with one visible input boundary. Results are clickable Customer rows—not a spreadsheet table—and show short labeled Customer, Pet, next Booking/activity and tag information. Passport connected/not-connected is context on the record, not a list filter.
- Connection and access remain separate. The list gives only the compact connection state; expiry, source, allowed-data and no-additional-access detail uses progressive disclosure on Customer/Pet detail. Protected values remain hidden and never become editable Business data.
- Business notes and tags are Business-owned local records. Important source labels distinguish `ข้อมูลที่ลูกค้าแจ้ง`, `ข้อมูลของร้าน`, and Guardian-controlled Passport data. Correction remains a suggestion, not an overwrite.
- A Customer detail opens with the Customer header and actions, then separates Pets, Booking history, current/recent Hotel Stays, one shared `ประวัติบริการ` timeline/list, compact Charge/Payment history with unpaid balance and Branch attribution, and Business notes/tags without a repeated explanatory overview. Multiple Pets may use a horizontal snap/peek strip on mobile. It can start the existing Booking Editor with Customer/Pet preselected; Calendar keeps its own capacity/Branch validation and uses shared relationship names where practical.
- A valid Temporary Business QR may reconnect an explicit, already-known local relationship after consent validation. An unknown QR never auto-creates a permanent Customer.

## Inbox & Customer Communication rules (BF-4 Live Local Prototype)

- The default prototype identity is one ongoing Conversation per Business + Customer relationship. Pet, Booking, Branch, Service Job and Stay are contextual references; opening from Customer, Booking, Grooming Job or Hotel Stay reuses that relationship rather than creating per-Pet, per-Booking, per-Job or per-Stay threads.
- Search is browser-local, has one visible boundary, and is limited to Customer name, Pet name, current service, and message text. Filters appear only when the fixture/state supports them honestly: all, unread, and active service; supporting labels may use the 14px supporting scale while message content remains at the 16px body scale.
- Opening a Conversation marks its incoming fixture messages read only in the current browser session. Navigation and Home use this same unread state; no server delivery/read synchronization is claimed.
- Message send and quick replies are local text prototypes. Quick replies show three defaults without numbering plus a dashed circular add control; collapse/expand is remembered in a cookie. Delivery labels explicitly say `ในเบราว์เซอร์`; no socket, notification, upload, email, SMS, or LINE behavior is implied.
- A structured add-service request is a separate message kind with service, demo amount, added time, optional note, and `รอเจ้าของตอบ`. Business may cancel but cannot approve for the Guardian.
- The Guardian-response simulator remains an idempotent state/test helper and is never exposed in the staff-facing Inbox. A linked test approval may update only the local Service Job add-on and estimate; it does not alter Booking, create a Charge/Payment, or claim settlement.
- Staff may explicitly send a local text about an amount due or a recorded payment using the same Conversation. That optional message does not mutate Charge/Payment/Service Record state and never claims a payment link, document share, delivery, notification, email, SMS or LINE transport.
- Conversation history and Customer/Pet identity references do not create Passport permission. Protected Passport values are never snapshotted into Inbox messages/context; expiry/revoke keeps them hidden.
- Conversations are Business-wide across Branch switching. Relevant Booking context retains Branch attribution, actions are withheld when the Booking is outside the active Branch, and another Branch never inherits protected consent scope.
- Desktop may select the first conversation in split view. Mobile starts with the list, opens a full conversation task, moves focus to its heading, provides Back recovery, and retains the query deep link.

## Shared Business Intake Engine rules (Phase E Live)

- Scanner offers camera and manual recovery; QR/token values never enter general analytics.
- Pre-validation states are Pet-neutral.
- `ข้อมูลที่ร้านได้รับ` shows consented fields only with source/expiry context.
- `ข้อมูลรับเข้า` creates Business facts and correction suggestions without mutating the Pet Passport.
- Required Guardian decision blocks receive/check-in; mid-flow revoke/expiry hides protected data.
- Final receive/check-in is explicit, duplicate-safe, and names the responsibility transition. A valid Grooming launch may attach its shared Grooming Service Job; a valid Hotel launch carries an explicit `hotelStayId` and hands back to that same Stay. Intake never infers a Stay from Pet/free text or creates a second Job, Stay, Customer, Pet or Booking.

## Responsive composition and horizontal interaction

- Mobile (320–430px) is task-first and low–medium density: one primary action, stacked summaries, Agenda/list/timeline content, labeled Billing and inline Service Record history, bottom navigation and full-screen or sheet overlays. It is never a squeezed desktop table or board.
- Tablet (768/820/1024px) is a first-class touch surface with medium density, 44px controls, compact adaptive grids and contained workflow scrolling where an implemented board genuinely requires it.
- Desktop (1200/1440px) uses medium–high density through columns, split panes and operational boards—not smaller body text or card walls.
- Horizontal scrolling is allowed for filter chips, segmented controls, multiple-Pet snap/peek summaries, tablet Grooming columns and contained Calendar date-range spans. A partial next item should signal that more content is available. Billing uses its defined responsive table-to-row strategy; Service Record history stays inline and readable without document-level horizontal scrolling.
- Body copy, forms, Customer lists, Inbox messages, detail sections, critical alerts and confirmation dialogs must never require horizontal scrolling.
- Progressive disclosure owns advanced guidance, shortcut legends, access metadata, history and development context. The current task and required safety/recovery information remain visible.

## Controls, feedback and motion behavior

- Business forms retain persistent labels and low-text guidance. Helper text is added only for a rule, conflict, permission or consequence; fields are not individually wrapped in decorative cards.
- On mobile, form controls use at least 16px text. Major actions and icon controls retain at least 44×44px targets.
- Primary, Secondary, Outline, Destructive, Ghost and Link actions keep a clear hierarchy. Disabled controls do not respond to pointer interaction; destructive actions name the consequence.
- Hover may enhance a button, card, row or table, but the same action/state remains usable by keyboard and touch. Operational Calendar, Booking, Grooming board, Customer, Scanner and Intake interactions remain calm and immediate.
- Badge, alert and validation status normally combine semantic color with visible text and an icon or other non-color cue. Compact Calendar cards intentionally omit status dots/labels, retain full Thai status in their accessible name and use the semantic card surface; service color remains classification, never status.
- Dialogs and mobile sheets trap and restore focus, support predictable close/recovery and keep the primary/destructive hierarchy clear. Grooming Job detail drawer/sheets move focus to their title and return it to the triggering record. Toast placement respects mobile safe areas and is reserved for meaningful feedback.
- Structural skeletons mirror Customer rows, Calendar, Home metrics and Inbox lists. Determinate progress uses Brand/Semantic color; the multi-accent indeterminate bar is loading-only and carries no operational meaning.
- Motion uses the premium easing with canonical 160ms Fast, 220ms Base, 300ms Slow and 280ms Navigation tokens from the Design System. No bounce, wobble or confetti; reduced-motion removes non-essential transforms, shimmer travel and animation.

## Accessibility and mobile behavior

- Targets are at least 44×44px; no hover-only paths; sticky regions respect safe area insets.
- Status uses text plus a non-color cue (e.g. icon or badge); live updates do not steal focus. Grooming drag has an explicit detail/control alternative for keyboard and touch users; every Calendar date-range span has an accessible Pet/date-range label.
- Visible focus rings use the Business primary/ring Yellow treatment with sufficient contrast; error state remains separately understandable.
- Semantic HTML and keyboard behavior come first; icon-only controls require a screen-reader label and modals restore focus.
- Responsive QA covers 320, 375, 390, 430, 768, 820, 1024, 1200 and 1440px. Public content caps around 1280px while Calendar/board width follows the workflow.
- `prefers-reduced-motion: reduce` removes non-essential animations.
