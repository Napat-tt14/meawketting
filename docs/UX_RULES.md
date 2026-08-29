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
7. **Prefer reversible and traceable action.** Suggestion is not overwrite; Charge is not Payment; room move and Branch transfer retain history.
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
- AI Rainbow/Gradient/Progress concepts are reserved/experimental and remain absent from active Business UI. Reference AI Marketing/Agency examples are not Product content.

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
| Hotel Stay | `การเข้าพัก` or context-specific `น้องที่กำลังพัก`; avoid exposing the local object name in ordinary staff copy |
| Booked stay | `กำลังจะเข้าพัก` |
| Expected today | `เข้าพักวันนี้` |
| In stay | `พักอยู่` |
| Ready for checkout | `พร้อมรับกลับ` |
| Departure today | `ออกวันนี้` |
| Checked out | `เช็กเอาต์แล้ว` |
| No-show | `ไม่มาตามนัด` |
| Daily care | `งานดูแลวันนี้` |
| Room move | `ย้ายห้อง` |
| Waiting to start | `รอเริ่ม` |
| In service | `กำลังทำ` |
| Ready for pickup | `พร้อมรับกลับ` |
| Availability | `เวลาว่าง` or `พร้อมให้บริการ` when the context is clear |
| Conflict | Explain the specific `เวลาชน` / `ไม่ว่าง`; never expose an internal error code |
| Estimated price | `ราคาประมาณ` |

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
- Business Home uses an operational banner with explicit previous/next arrows. It advances every six seconds, pauses during hover/focus, and stops for reduced-motion. Desktop keeps the 16:9 banner on the left and add Booking / scan intake / find Customer in a right-hand action rail; tablet uses a compact 2:1 crop; mobile uses a square artwork composition before the same three actions. Unsupported revenue is not shown.
- The compact header keeps the active Business and Branch visible. Role remains inspectable in the user menu; top-right controls align to the same 44px grid and the account click-away layer never blurs the page. The prototype switcher changes browser-local context only.
- The logged-in Header may inherit the public Warm White/glass visual DNA, but compact operational usability, Branch context, Scanner access, User Menu and mobile safe areas take priority over a marketing pill treatment.
- Changing Branch updates Home values and the visible module menu together. Grooming and Hotel are live service destinations only when their active Branch capability is enabled; Daycare remains visible planned/disabled when enabled, and modules not enabled for the Branch remain absent.
- Desktop navigation has live Home, Calendar, Customers & Pets, and Messages plus a prominent Scanner action in the header. Mobile has exactly Home, Calendar, Scan, Messages and More; Customers & Pets is live inside More.
- Planned navigation remains visible to communicate Product architecture: live Grooming and Hotel (when capable) appear under `งานบริการ`; Branch-enabled Daycare and Finance, Reports, Team, and Settings remain under `ยังไม่เปิดใช้`. BF-4 removed disabled treatment from `ข้อความ`, BF-5 from Grooming, and BF-6 from Hotel only.
- Planned destinations use native disabled semantics plus `aria-disabled`, reduced emphasis, and no `href`; Mobile More mirrors the same planned groups without adding navigation behavior.

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
- Selecting a Booking opens the same date/time editor, so keyboard and assistive-technology users can complete every supported edit without drag.
- Cancellation preserves booking history in local state and releases demo allocation.

## Grooming Operations rules (BF-5 Live Local Prototype)

- Calendar plans a **Booking**; Grooming executes a distinct Pet-specific **Grooming Service Job** linked by reference. Booking status and Job status must never be merged into one field or treated as synonyms.
- The local Grooming lifecycle is guarded: `booked → checked-in → waiting → in-service → ready-for-pickup → completed`; `checked-in → in-service` is also allowed when the waiting queue is skipped, and `cancelled` is terminal. A Job cannot jump from `booked` to `completed`.
- Grooming status uses visible Thai text, icon/non-color context, and semantic status treatment. Coral and Scissors identify the Grooming module only; they never communicate a status, approval, error, or attention level.
- Desktop/tablet support status drag/drop as an acceleration. Lifted cards, valid/invalid destination highlights, and a calm settle or rollback feedback must preserve the original Job when a transition is rejected. Keyboard, touch, and mobile users can open the detail and choose a permitted next status; drag is never the sole state-change path.
- Each Job card keeps Pet photo/avatar as the scan anchor, then the minimum operational context: Pet, base service, scheduled time, groomer, current status, and a short attention cue. Avoid text-only cards and do not make a broad badge wall.
- Job detail uses a section hierarchy: Pet/Customer contact → service/timing → status → resources → add-ons → internal Business notes → separate Customer messages → history. It does not present one long undifferentiated modal, duplicate Customer/Pet records, or expose non-consented Passport data.
- Resource UI names existing shared Resources as `ช่าง`, `จุดบริการ`, and `เครื่องเป่า`. Changing a resource runs the same local availability/conflict foundation; it is not a staff roster, payroll, commission, or scheduling system.
- Attention is short and actionable: delayed versus the local scheduled estimate, awaiting Guardian consent, unassigned groomer, or pickup readiness. It uses text and an icon with a semantic surface; it is never color-only.
- Internal Business notes remain separate from Customer messages. The Inbox action opens/reuses the Business-wide Customer conversation; the note does not become a Customer-visible message or Passport write.
- Intake reuses the existing consent-safe path. At check-in it may attach/activate only a valid matching Grooming Job; it does not introduce another scan/intake state machine.
- Business may send or cancel an add-service request but **cannot self-approve**. A local Guardian-response helper exists only in fixture/state tests; it is not a staff-facing control. Test approval updates only the linked Job add-on and estimated duration, not Booking, Charge, Payment, discount, refund, or settlement state.
- Completed Jobs contribute a lightweight shared recent-service item. That item is not Full CareProof and has no photo proof, certificate, or Guardian-returned service-record claim.

## Hotel / Boarding Operations rules (BF-6 Live Local Prototype)

- Calendar plans a Hotel **Booking**; Hotel executes a distinct Pet-specific **Hotel Stay** linked by reference. Booking planning/cancellation status and Hotel Stay lifecycle must never be merged into one field or treated as synonyms. The local Stay is a module-specific record in the shared Business envelope, not a duplicate Booking, Customer, Pet, Room, or generic Service Job migration.
- `/business/hotel` answers execution questions: who arrives today, who is in stay, who departs today, what room/zone is vacant, which Pet needs care, and what attention is unresolved. It begins with today/attention content, then exposes Occupancy, Stays and Daily Care; it is not a Calendar clone.
- Hotel direct navigation and the live service row use the same active-Branch capability. A Branch without Hotel receives a calm unavailable state and never a working operations board. Daycare remains planned/disabled; no BF-6 control implies Daycare implementation.
- The local execution lifecycle is `booked → expected-today → checked-in → in-stay → ready-for-checkout → checked-out`, with terminal `cancelled` or `no-show`. Staff copy distinguishes the naturally readable Thai stages; state changes preserve Booking planning records. A checked-out Stay adds only a lightweight shared recent-service entry—never a billing, payment, CareProof, certificate, Guardian-history, or checkout-settlement claim.
- Desktop/tablet occupancy is a room/zone-by-date board. A Stay renders as one continuous range span with accessible Pet, room/zone, arrival and departure context; it is never rendered as repeated daily cards. Seven, fourteen and twenty-eight-day views reuse the Calendar date foundation. Mobile removes the occupancy board and uses task tabs—`วันนี้`, `กำลังพัก`, `เข้าพัก`, `ออกวันนี้`, `งานดูแล`—with a focused list/detail surface.
- A room/zone uses the shared Resource model but staff language says `ห้อง` or `โซน`. The UI may show name, type/capacity and usable state from available fixture/config context, but BF-6 does not become full room-management settings or hardcode a universal room taxonomy.
- Before creating/checking in a Stay with a room, assigning a room, moving room, extending, shortening, or changing a Stay date, the local overlap/capacity evaluator must run. It blocks conflicts by default, leaves the existing state intact, and says what happened (for example, that a named room is occupied during the selected range or a zone is full on a date) with `เลือกห้องอื่น`, `เปลี่ยนวัน`, or `ยกเลิกการเปลี่ยน` recovery. Never use a generic error or silently overbook.
- Conflict-blocking is a **PROTOTYPE ASSUMPTION**, not a production overbooking decision. BF-6 has no overbooking override/permission flow, no waitlist, and no final room-sharing rule. Current behavior uses Resource capacity without declaring one Pet per room or automatic sharing. Those policies remain OPEN.
- A room move preserves history. The existing room/zone is not overwritten: the Stay appends the prior room/zone, next room/zone, timestamp and optional operational note. Desktop/tablet may offer guarded drag with lift/ghost/destination/invalid/rollback feedback; Stay detail has an equally complete room-change control for keyboard, touch and mobile users.
- Daily care is per Pet/Stay and only for the local in-stay context. It shows compact icon/time/task/state rows (for example food, water check, activity, cleaning or permitted care instruction); completion retains local `completedAt` and available `completedBy` state through browser navigation. It is operational evidence only, not medical management, a medication system, workforce scheduling, Full CareProof, or an incident system.
- Guardian-provided care instruction, internal Business note and Daily Care task are separate content types and sections. Protected Passport information/photos are shown only under active Business/Branch/scope/duration permission; expiry/revoke hides protected values rather than leaving stale data in the Stay UI. Business-owned operational facts remain separate from Guardian-controlled Passport data.
- Hotel Arrival uses the shared Intake path when intake/consent review is required. Completing Intake explicitly attaches the existing linked Stay; staff then selects an available room/zone or preserves an unassigned attention state and performs the separately guarded Stay check-in. It never creates a Hotel-only scan/intake model. Belongings and permitted instructions remain in their existing consent-safe domains.
- Departures use a lightweight operational readiness check for required daily care, belongings, Business notes and any linked add-on/Service Job state. It never becomes a payment/Billing gate. An outstanding item is named as attention rather than silently bypassed.
- A Customer can be grouped visually with several Pets, but each Pet retains independent Stay state, room assignment, care instruction, active consent and task completion. Customer convenience never makes one Guardian consent cover another Pet.
- A linked Grooming Job can appear as an additional service in the same Customer/Pet context while retaining its own lifecycle and shared identity references. Add-service requests reuse the existing local Inbox structured-request boundary: Business can send/cancel but cannot approve for the Guardian; no LINE transport or API is added.
- Hotel attention is concise and actionable: arriving today without a room, departure today, overdue/unfinished care, pending customer response, detected room conflict, recent move, or a late pickup fixture. It uses semantic text/icon treatment rather than a wall of colored cards.
- Hotel search covers Pet, Customer and room/zone. Lightweight filters are `ทั้งหมด`, `เข้าวันนี้`, `กำลังพัก`, `ออกวันนี้`, and `ต้องจัดการ`; advanced reporting is outside BF-6.

## Customers & Pets rules (BF-3 Live Local Prototype)

- Customer is a Business-level relationship. A Customer is not duplicated by Grooming, Hotel, Daycare, or Branch; operational history continues to name its Branch.
- `ผู้ติดต่อหลัก` means a contact relationship only. Never use `เจ้าของ` unless the real relationship is known. Booking convenience never grants Guardian or Pet Passport authority.
- A local Customer and a local Pet relationship may be added without an account or Passport. New Pets start unlinked and are clearly presented as Business relationship records, not Business-owned Passports.
- A phone match raises `อาจมีลูกค้ารายนี้อยู่แล้ว`. Staff can view the existing record or choose `สร้างต่อ`; the prototype never silently merges identities.
- Search supports Customer name, Pet name, and phone with one visible input boundary. Results are clickable Customer rows—not a spreadsheet table—and show short labeled Customer, Pet, next Booking/activity and tag information. Passport connected/not-connected is context on the record, not a list filter.
- Connection and access remain separate. The list gives only the compact connection state; expiry, source, allowed-data and no-additional-access detail uses progressive disclosure on Customer/Pet detail. Protected values remain hidden and never become editable Business data.
- Business notes and tags are Business-owned local records. Important source labels distinguish `ข้อมูลที่ลูกค้าแจ้ง`, `ข้อมูลของร้าน`, and Guardian-controlled Passport data. Correction remains a suggestion, not an overwrite.
- A Customer detail opens with the Customer header and actions, then separates Pets, Booking history and Business notes/tags without a repeated explanatory overview. Multiple Pets may use a horizontal snap/peek strip on mobile. It can start the existing Booking Editor with Customer/Pet preselected; Calendar keeps its own capacity/Branch validation and uses shared relationship names where practical.
- A valid Temporary Business QR may reconnect an explicit, already-known local relationship after consent validation. An unknown QR never auto-creates a permanent Customer.

## Inbox & Customer Communication rules (BF-4 Live Local Prototype)

- The default prototype identity is one ongoing Conversation per Business + Customer relationship. Pet, Booking, Branch, and future Service Job are contextual references; opening from Customer or Booking reuses that relationship rather than creating per-Pet or per-Booking threads.
- Search is browser-local, has one visible boundary, and is limited to Customer name, Pet name, current service, and message text. Filters appear only when the fixture/state supports them honestly: all, unread, and active service; supporting labels may use the 14px supporting scale while message content remains at the 16px body scale.
- Opening a Conversation marks its incoming fixture messages read only in the current browser session. Navigation and Home use this same unread state; no server delivery/read synchronization is claimed.
- Message send and quick replies are local text prototypes. Quick replies show three defaults without numbering plus a dashed circular add control; collapse/expand is remembered in a cookie. Delivery labels explicitly say `ในเบราว์เซอร์`; no socket, notification, upload, email, SMS, or LINE behavior is implied.
- A structured add-service request is a separate message kind with service, demo amount, added time, optional note, and `รอเจ้าของตอบ`. Business may cancel but cannot approve for the Guardian.
- The Guardian-response simulator remains an idempotent state/test helper and is never exposed in the staff-facing Inbox. A linked test approval may update only the local Service Job add-on and estimate; it does not alter Booking, create a Charge/Payment, or claim settlement.
- Conversation history and Customer/Pet identity references do not create Passport permission. Protected Passport values are never snapshotted into Inbox messages/context; expiry/revoke keeps them hidden.
- Conversations are Business-wide across Branch switching. Relevant Booking context retains Branch attribution, actions are withheld when the Booking is outside the active Branch, and another Branch never inherits protected consent scope.
- Desktop may select the first conversation in split view. Mobile starts with the list, opens a full conversation task, moves focus to its heading, provides Back recovery, and retains the query deep link.

## Shared Business Intake Engine rules (Phase E Live)

- Scanner offers camera and manual recovery; QR/token values never enter general analytics.
- Pre-validation states are Pet-neutral.
- `ข้อมูลที่ร้านได้รับ` shows consented fields only with source/expiry context.
- `ข้อมูลรับเข้า` creates Business facts and correction suggestions without mutating the Pet Passport.
- Required Guardian decision blocks receive/check-in; mid-flow revoke/expiry hides protected data.
- Final receive/check-in is explicit, duplicate-safe, and names the responsibility transition. A valid matching Grooming Booking may attach its shared Grooming Service Job; a valid matching Hotel Booking/Stay may target its existing Hotel Stay and available room/zone. Neither path creates a duplicate Job, Stay, Customer, Pet, Booking, or intake model.

## Responsive composition and horizontal interaction

- Mobile (320–430px) is task-first and low–medium density: one primary action, stacked summaries, Agenda/list/timeline content, bottom navigation and full-screen or sheet overlays. It is never a squeezed desktop table or board.
- Tablet (768/820/1024px) is a first-class touch surface with medium density, 44px controls, compact adaptive grids and contained workflow scrolling where a board or occupancy timeline genuinely requires it.
- Desktop (1200/1440px) uses medium–high density through columns, split panes and operational boards—not smaller body text or card walls.
- Horizontal scrolling is allowed for filter chips, segmented controls, multiple-Pet snap/peek summaries, tablet Grooming columns and Hotel occupancy timelines. A partial next item should signal that more content is available.
- Body copy, forms, Customer lists, Inbox messages, detail sections, critical alerts and confirmation dialogs must never require horizontal scrolling.
- Progressive disclosure owns advanced guidance, shortcut legends, access metadata, history and development context. The current task and required safety/recovery information remain visible.

## Controls, feedback and motion behavior

- Business forms retain persistent labels and low-text guidance. Helper text is added only for a rule, conflict, permission or consequence; fields are not individually wrapped in decorative cards.
- On mobile, form controls use at least 16px text. Major actions and icon controls retain at least 44×44px targets.
- Primary, Secondary, Outline, Destructive, Ghost and Link actions keep a clear hierarchy. Disabled controls do not respond to pointer interaction; destructive actions name the consequence.
- Hover may enhance a button, card, row or table, but the same action/state remains usable by keyboard and touch. Operational Calendar, Booking, Grooming board, Hotel occupancy/stay controls, Customer, Scanner and Intake interactions remain calm and immediate.
- Badge, dot, alert and validation status always combine semantic color with visible text and an icon or other non-color cue. Service color remains classification, never status.
- Dialogs and mobile sheets trap and restore focus, support predictable close/recovery and keep the primary/destructive hierarchy clear. Grooming Job and Hotel Stay detail drawer/sheets move focus to their title and return it to the triggering record. Toast placement respects mobile safe areas and is reserved for meaningful feedback.
- Structural skeletons mirror Customer rows, Calendar, Home metrics and Inbox lists. Normal progress uses Brand/Semantic color; AI Rainbow progress is not active.
- Motion uses the premium easing with canonical 160ms Fast, 220ms Base, 300ms Slow and 280ms Navigation tokens from the Design System. No bounce, wobble or confetti; reduced-motion removes non-essential transforms, shimmer travel and animation.

## Accessibility and mobile behavior

- Targets are at least 44×44px; no hover-only paths; sticky regions respect safe area insets.
- Status uses text plus a non-color cue (e.g. icon or badge); live updates do not steal focus. Grooming drag and Hotel occupancy drag each have an explicit detail/control alternative for keyboard and touch users; every occupancy span has an accessible Pet/room/date-range label.
- Visible focus rings use the Business primary/ring Yellow treatment with sufficient contrast; error state remains separately understandable.
- Semantic HTML and keyboard behavior come first; icon-only controls require a screen-reader label and modals restore focus.
- Responsive QA covers 320, 375, 390, 430, 768, 820, 1024, 1200 and 1440px. Public content caps around 1280px while Calendar/board width follows the workflow.
- `prefers-reduced-motion: reduce` removes non-essential animations.
