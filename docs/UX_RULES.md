# UX Rules

Status: **CANONICAL BEHAVIOR, STATE AND RECOVERY CONTRACTS (BUSINESS DESIGN SYSTEM REBASE 2026-08-23)**
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

## Business Home, navigation and context (BF-1)

- Mock Business Login enters `/business/home` by default.
- Business Home prioritizes attention and next work before compact summaries. The shell labels the page context as demo once; unavailable real integrations are named only where their limitation matters.
- Business Home uses a 16:9 banner with explicit previous/next arrows. It advances every six seconds, pauses during hover/focus, and stops for reduced-motion. Desktop keeps the banner on the left and add Booking / scan intake / find Customer in a right-hand action rail.
- The compact header keeps the active Business and Branch visible. Role remains inspectable in the user menu; top-right controls align to the same 44px grid and the account click-away layer never blurs the page. The prototype switcher changes browser-local context only.
- The logged-in Header may inherit the public Warm White/glass visual DNA, but compact operational usability, Branch context, Scanner access, User Menu and mobile safe areas take priority over a marketing pill treatment.
- Changing Branch updates Home values and the visible module menu together. Modules enabled for the active Branch remain visible as planned/disabled service rows until their full operational board launches; modules not enabled for the Branch remain absent.
- Desktop navigation has live Home, Calendar, Customers & Pets, and Messages plus a prominent Scanner action in the header. Mobile has exactly Home, Calendar, Scan, Messages and More; Customers & Pets is live inside More.
- Planned navigation remains visible to communicate Product architecture: Branch-enabled service modules appear under `งานบริการ · ยังไม่เปิดใช้`; Finance, Reports, Team, and Settings appear under `ยังไม่เปิดใช้`. BF-4 removes disabled treatment only from `ข้อความ`.
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

## Customers & Pets rules (BF-3 Live Local Prototype)

- Customer is a Business-level relationship. A Customer is not duplicated by Grooming, Hotel, Daycare, or Branch; operational history continues to name its Branch.
- `ผู้ติดต่อหลัก` means a contact relationship only. Never use `เจ้าของ` unless the real relationship is known. Booking convenience never grants Guardian or Pet Passport authority.
- A local Customer and a local Pet relationship may be added without an account or Passport. New Pets start unlinked and are clearly presented as Business relationship records, not Business-owned Passports.
- A phone match raises `อาจมีลูกค้ารายนี้อยู่แล้ว`. Staff can view the existing record or choose `สร้างต่อ`; the prototype never silently merges identities.
- Search supports Customer name, Pet name, and phone with one visible input boundary. Results are clickable Customer rows—not a spreadsheet table—and show short labeled Customer, Pet, next Booking/activity and tag information. Passport connected/not-connected is context on the record, not a list filter.
- Connection and access remain separate. The list gives only the compact connection state; expiry, source, allowed-data and no-additional-access detail uses progressive disclosure on Customer/Pet detail. Protected values remain hidden and never become editable Business data.
- Business notes and tags are Business-owned local records. Important source labels distinguish `ข้อมูลที่ลูกค้าแจ้ง`, `ข้อมูลของร้าน`, and Guardian-controlled Passport data. Correction remains a suggestion, not an overwrite.
- A Customer detail opens with one relationship summary, then separates contact/actions, Pets, Booking history and Business notes/tags. It can start the existing Booking Editor with Customer/Pet preselected; Calendar keeps its own capacity/Branch validation and uses shared relationship names where practical.
- A valid Temporary Business QR may reconnect an explicit, already-known local relationship after consent validation. An unknown QR never auto-creates a permanent Customer.

## Inbox & Customer Communication rules (BF-4 Live Local Prototype)

- The default prototype identity is one ongoing Conversation per Business + Customer relationship. Pet, Booking, Branch, and future Service Job are contextual references; opening from Customer or Booking reuses that relationship rather than creating per-Pet or per-Booking threads.
- Search is browser-local, has one visible boundary, and is limited to Customer name, Pet name, current service, and message text. Filters appear only when the fixture/state supports them honestly: all, unread, and active service; labels remain compact at the 14px body scale.
- Opening a Conversation marks its incoming fixture messages read only in the current browser session. Navigation and Home use this same unread state; no server delivery/read synchronization is claimed.
- Message send and quick replies are local text prototypes. Quick replies show three defaults without numbering plus a dashed circular add control; collapse/expand is remembered in a cookie. Delivery labels explicitly say `ในเบราว์เซอร์`; no socket, notification, upload, email, SMS, or LINE behavior is implied.
- A structured add-service request is a separate message kind with service, demo amount, added time, optional note, and `รอเจ้าของตอบ`. Business may cancel but cannot approve for the Guardian.
- The minimum Guardian-response simulator must remain explicitly labeled as a local test. One decision is idempotent. Approval does not alter Booking, create a Charge/Payment, or claim settlement until a safe shared add-on model exists.
- Conversation history and Customer/Pet identity references do not create Passport permission. Protected Passport values are never snapshotted into Inbox messages/context; expiry/revoke keeps them hidden.
- Conversations are Business-wide across Branch switching. Relevant Booking context retains Branch attribution, actions are withheld when the Booking is outside the active Branch, and another Branch never inherits protected consent scope.
- Desktop may select the first conversation in split view. Mobile starts with the list, opens a full conversation task, moves focus to its heading, provides Back recovery, and retains the query deep link.

## Shared Business Intake Engine rules (Phase E Live)

- Scanner offers camera and manual recovery; QR/token values never enter general analytics.
- Pre-validation states are Pet-neutral.
- `ข้อมูลที่ร้านได้รับ` shows consented fields only with source/expiry context.
- `ข้อมูลรับเข้า` creates Business facts and correction suggestions without mutating the Pet Passport.
- Required Guardian decision blocks receive/check-in; mid-flow revoke/expiry hides protected data.
- Final receive/check-in is explicit, duplicate-safe, and names the responsibility transition.

## Controls, feedback and motion behavior

- Business forms retain persistent labels and low-text guidance. Helper text is added only for a rule, conflict, permission or consequence; fields are not individually wrapped in decorative cards.
- On mobile, form controls use at least 16px text. Major actions and icon controls retain at least 44×44px targets.
- Primary, Secondary, Outline, Destructive, Ghost and Link actions keep a clear hierarchy. Disabled controls do not respond to pointer interaction; destructive actions name the consequence.
- Hover may enhance a button, card, row or table, but the same action/state remains usable by keyboard and touch. Operational Calendar, Booking, Customer, Scanner and Intake interactions remain calm and immediate.
- Badge, dot, alert and validation status always combine semantic color with visible text and an icon or other non-color cue. Service color remains classification, never status.
- Dialogs and mobile sheets trap and restore focus, support predictable close/recovery and keep the primary/destructive hierarchy clear. Toast placement respects mobile safe areas and is reserved for meaningful feedback.
- Structural skeletons mirror Customer rows, Calendar, Home metrics and Inbox lists. Normal progress uses Brand/Semantic color; AI Rainbow progress is not active.
- Motion uses the premium easing and typical 180–300ms duration from the Design System. No bounce, wobble or confetti; reduced-motion removes non-essential transforms, shimmer travel and animation.

## Accessibility and mobile behavior

- Targets are at least 44×44px; no hover-only paths; sticky regions respect safe area insets.
- Status uses text plus a non-color cue (e.g. icon or badge); live updates do not steal focus.
- Visible focus rings use the Business primary/ring Yellow treatment with sufficient contrast; error state remains separately understandable.
- Semantic HTML and keyboard behavior come first; icon-only controls require a screen-reader label and modals restore focus.
- Responsive QA covers 320, 375, 390, 430, 768, 1024, 1200 and 1440px. Public content caps around 1280px while Calendar/board width follows the workflow.
- `prefers-reduced-motion: reduce` removes non-essential animations.
