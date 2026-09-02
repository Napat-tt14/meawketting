# Design System

Status: **CANONICAL VISUAL/UI DIRECTION (BUSINESS UX/UI + RESPONSIVE SYSTEM RESET 2026-08-30)**
Owner: Product Design

## Context direction

Meawketting is warm, modern, and trustworthy. Visual treatment adapts to operational density and risk:

| Context | Direction |
|---|---|
| Business Operations (Main) | **WARM OPERATIONAL CLARITY** — LINE Seed Sans TH, Warm White, Pastel Yellow action color, refined curvature, calm motion and clear information hierarchy |
| Public / Business Landing (`/`) | The same Business visual foundation applied to a commercial page: floating glass Header, direct first-viewport value, product-inspired preview, selective Bento/card composition, real product navigation and a rounded public Footer |
| Guardian LINE Mini App (Target / Paused) | **MINIMAL LINE MINI APP** — minimal, fast, lightweight, mobile-first, familiar inside LINE, low text, low friction, large clear actions, simple Pet profiles, and no marketing-heavy UI |
| Consumer web prototype (Current / Frozen) | Existing standalone web visual system remains retained for prototype continuity; no Consumer redesign is authorized now |
| Consent / Lost / High-risk | Direct copy, high contrast, restrained color and motion |
| Platform Admin | Neutral, evidence/reason/audit-first dense surfaces |

Business surfaces must feel readable, calm, efficient, warm, fluid, modern, and human—never a cold grey corporate dashboard or a playful toy.

## Scope, source and exclusions

- `workfiledesign/htmlpack/index.html` and `workfiledesign/htmlpack/design-system.css` are the **visual source of truth for Business and Business-first public surfaces** from this rebase onward.
- They are reference inputs, not runtime dependencies. Extract and map their tokens and patterns into the existing semantic token and shared-component architecture; do not copy either file wholesale.
- `/workfiledesign` remains read-only and untouched.
- This rebase is scoped to Business and Business-first public surfaces. **CONSUMER VISUAL REDESIGN: PAUSED UNTIL PRODUCT OWNER REOPENS.** The current Consumer web prototype remains unchanged. The future Guardian direction is a separate LINE Mini App phase, not an implementation task in this rebase.
- Business supports **Light / Warm White only**. Do not implement `[data-theme='dark']`, `[data-portal-theme='dark']`, dark Business tokens, a theme toggle or a dark portal mode.
- Emoji and Dingbat glyphs are not UI icons. Use the existing Lucide wrapper and accessible labels; decorative artwork uses SVG, illustration or image assets.
- AI Rainbow CTA styling remains **RESERVED / EXPERIMENTAL**. A restrained multi-accent indeterminate progress treatment is allowed only for structural Business loading, without AI Marketing/Agency copy or operational status meaning.

## Typography ownership

| Context | Font status |
|---|---|
| **Business / public Business** | **LINE Seed Sans TH** from official local WOFF2 webfonts; actual faces 400 / 700 |
| **Consumer / Guardian** | **Unchanged / paused** — current Noto Sans Thai and bounded Sriracha rules remain outside this Business font replacement |

- Business webfonts live in `public/fonts/line-seed-th/` and are loaded with `@font-face` plus `font-display: swap`.
- Source files come from the official LINE Seed Sans TH package at [seed.line.me](https://seed.line.me/index_th.html); the downloaded package is not a runtime dependency and no `/workfiledesign` source was modified.
- The selected production faces map to Regular 400 and Bold 700. Business UI never requests or computes a weight above 700; semantic 500/600 roles remain available through the token layer and `font-synthesis: none` prevents synthetic heavier faces.
- FC Minimal and Anuphan are no longer part of Business font loading. They remain only as historical documentation where older directions are explicitly marked superseded.

## Guardian visual direction (Target / Future / Paused)

The future Guardian experience should feel like a **minimal LINE Mini App**, not a smaller Business dashboard and not a marketing-heavy standalone site:

- Keep the interaction mobile-first, fast, lightweight, familiar inside LINE, and low-text.
- Prefer large clear actions, low friction, simple Pet profiles, and concise Pet Passport surfaces.
- Keep Guardian interaction/UI simpler than Business while allowing both contexts to use the Master Brand.
- Business Design System tokens and operational navigation remain separate; this direction does not authorize Consumer restyling or detailed Mini App navigation.
- [petjod.com](https://petjod.com/) is UX/reference inspiration only. Do not copy its branding, copywriting, assets, or layout 1:1.
- LINE is an entry/authentication channel, not Pet ownership authority. LINE Login, LINE Mini App, LINE notifications, and production Guardian identity linking are not implemented.

## Token architecture

```text
Primitive value → Semantic token → Component styling
```

- Components use semantic tokens, not raw hex values.
- Implemented tokens live in `@theme static` in `app/globals.css`.
- Business/public tokens are scoped so they do not visually migrate Consumer surfaces. The current Consumer web prototype retains its current semantic canvas and type rules; the future LINE Mini App system is not yet defined.
- Gradients and motifs are decorative tokens, never status or operational meaning.
- Prefer one canonical Business token implementation; do not keep the prior Business palette active in parallel.

### Color palette & semantic roles

| Role | Canonical value | Direction |
|---|---:|---|
| Business background | `#FFFDF9` | Warm White page canvas |
| Business foreground | `#2B2B2B` | Primary text |
| Card / popover | `#FFFFFF` | Primary raised surface |
| Border / input | `#ECE8DF` | Warm low-contrast structure |
| Muted surface | `#F4F4F5` | Restrained supporting surface |
| Muted foreground | `#707070` | Supporting copy after contrast validation |
| **Business primary / action** | `#F4C95D` | Pastel Yellow brand and action |
| Primary hover / focus ring | `#D7B152` | Interaction and visible focus |
| Primary foreground | `#3D2B00` | Accessible dark text on Yellow |
| Soft Yellow | `#FFD86B` | Selected/soft emphasis, not status |
| Accent background | `#FFF7EB` | Warm section/sidebar/accent surface |
| Accent foreground | `#4D3700` | Text on warm accent surfaces |

### Semantic status palette

| Status | Foreground | Soft surface | Dot / supporting cue |
|---|---:|---:|---:|
| Success / Good | `#4F7D51` | `#EBF6EC` | `#7BC47F` |
| Warning | `#936F28` | `#FEF5E3` | `#F5B942` |
| Critical / Destructive | `#AC5B53` | `#FDECEA` | `#EF7F73` |
| Information | `#507893` | `#ECF5FB` | `#7DBBE6` |

### Feature accent palette

| Accent | Base | Soft | Current meaning |
|---|---:|---:|---|
| Coral | `#FF9B85` | `#FFE8E2` | Grooming |
| Mint | `#5FCFA8` | `#DCF7EC` | Daycare |
| Sky | `#6FB1E0` | `#E0EEFA` | Hotel / Boarding |
| Grape | `#B79BDB` | `#EDE6FA` | Future/special classification where approved |

### Color distinction rule

- **Pastel Yellow (`#F4C95D`)** represents **Brand & Action**: primary buttons, active navigation, selected controls, scanner frames and focus/key highlights.
- Status uses the semantic Success, Warning, Critical and Information palette above. Brand Yellow and feature accents never substitute for status.
- Feature color classifies a service; it does not communicate progress, availability, approval or risk.
- BF-7 financial and BF-8 Service Record references use visible text plus an icon or other non-color cue: paid, unpaid, partial, cancelled and no-charge must remain distinguishable even when semantic color is unavailable. A Grooming Coral or Hotel Sky cue still identifies service, never payment state.

### Service visual identity

Service identity is a secondary classification system and never replaces status:

| Service | Icon | Surface family | Meaning |
|---|---|---|---|
| Grooming / อาบน้ำตัดขน | Scissors | Soft Coral | Appointment-oriented service work |
| Hotel | Bed | Soft sky | Date-range stay work |
| Daycare | Paw | Soft mint | Day-based care work |

- Every service cue uses **icon + visible label + restrained tint**. Color alone is insufficient.
- Pastel Yellow remains reserved for primary actions, active selection, and focus/key highlights.
- Status retains its own text/icon semantic treatment; a mint Daycare surface does not mean success and a Coral Grooming surface does not mean warning.

## Typography

**LINE Seed Sans TH** is the primary Thai/Latin UI typeface for Business and Business-first public surfaces. The current Consumer web prototype retains its existing Noto Sans Thai visual system; Sriracha remains limited to short decorative Consumer accents and is prohibited in operational content. Future LINE Mini App typography is intentionally undecided until that phase. JetBrains Mono is reserved for justified technical/code presentation only.

| Role | Size / Line-height | Typical weight |
|---|---|---:|
| Display | 40–48px | 700; public surfaces only |
| Page title | 24–30px | 700 |
| Section | 18–22px | 600–700 |
| Large | 18px | 500–600 |
| Body | 16px / 1.5 | 400–500 |
| Supporting | 14px / 1.5 | 400–500 |
| Caption | 12–13px | 500 |
| Micro / Tag | 10–11px | 600; exceptional compact tag only |

- Persistent labels; placeholders never replace labels.
- Business operational page titles use a responsive 24–30px scale; Display scale is not forced into dense app workflows.
- Business content defaults to 16px with a 1.5 line-height. Supporting copy uses 14px, mobile form controls remain at least 16px to avoid input zoom, and important working information never drops to Caption or Micro.
- No Business component uses a weight above 700. Use 400 for body, 600 for controls/labels and 700 only for the strongest heading or value in a group.
- Numeric operational columns, amounts, times and counts use tabular numerals.
- Do not bold label, value, helper and status at the same time; weight establishes one reading priority per block.
- Thai text wrapping, mixed Thai/Latin terms, and 200% text zoom must not clip text or touch targets.

## Spacing, shape and surface hierarchy

- 4px spacing base: `0, 4, 8, 12, 16, 20, 24, 32, 48, 64, 80`.
- Page gutters: 16px mobile, 24px tablet, 32px desktop. Public marketing, floating Header and rounded Footer use a centered shell capped at approximately 1280px; product preview art may expand independently only when needed.
- Touch target: minimum 44×44px; primary CTAs 48–56px.
- Base curvature is approximately 20px, applied through hierarchy: buttons 8–12px, inputs/selects 8px, cards 17–20px and large marketing/footer/banner surfaces 20–28px.
- Pills are reserved for badges, segmented tabs, filters and explicitly compact semantic CTAs; normal Business buttons do not become pills.
- Prefer warm thin borders, subtle surface tinting and restrained shadows over heavy elevation in operational surfaces. Glass is reserved for suitable shell/public surfaces and must keep text contrast.
- Cards may lift subtly on capable pointing devices, but touch users receive an equally clear pressed/selected state and no action depends on hover.
- The homepage avoids a feature-card wall: Services and Business Core use divided lists; Yellow is reserved for actions and anchors rather than section-wide repetition.

## Business content density

- **One idea = one label.** An operational page normally has one H1, optional short context, and its primary action before work begins.
- Operational UI avoids marketing-style hierarchy. Eyebrow, title, subtitle, section title and helper must not repeat the same idea.
- Helper copy is exception-based: use it for a consequential rule, availability, conflict, permission, recovery or constraint—not to restate a field label.
- Use progressive disclosure for detail. Customer rows show the relationship, Pets, next Booking and lightweight status; access/source/expiry detail belongs in the relevant Customer/Pet detail.
- Prefer lists before tables when relational information reads better as rows. Use the surface that matches the information: schedule, agenda, row, timeline, status strip, grouped fields or compact stat.
- Chips are reserved for status, filter and tag. Names, phone numbers, services and long Passport sentences remain normal text.
- Demo context appears once in the Business shell/page context rather than being repeated on records.
- Avoid card-inside-card composition. A card exists only when a real boundary is needed.

## Business navigation architecture

- Desktop keeps live `หน้าหลัก`, `ปฏิทิน`, `ลูกค้าและสัตว์เลี้ยง`, `ข้อความ`, and `การเงิน`; the Inbox uses the same unread source as Home and mobile navigation.
- The Sidebar exposes Grooming and Hotel as live `งานบริการ` destinations only when the active Branch enables the matching capability, and Finance as the live shared BF-7 destination. Service Record is shown in Customer/Pet detail rather than as a navigation destination. Daycare, Reports, Team and Settings remain under the planned grouping. Mobile More mirrors the same Branch capability state plus Finance.
- Planned rows are native disabled buttons with `aria-disabled`, reduced emphasis, and no `href` or fake route. Mobile More mirrors the live Customers and capability-enabled service links, plus the same Branch-enabled planned/service-management groups.

## Operational focal points and schedules

- Business Home begins with a three-variant square Spotlight using local Business imagery. Desktop uses a 50:50 hero split and caps the media at 400×400px; the carousel keeps every image mounted and moves one transform-only track to prevent replacement flicker. It advances every six seconds, pauses while hovered or focused, stops under reduced-motion, and always exposes 44px previous/next arrow controls.
- On desktop the Spotlight is the left focal column and add Booking / scan intake / find Customer form a dedicated right-hand action rail. Tablet uses a compact 2:1 crop so direct actions and the first operational section remain in the initial viewport. Mobile uses a square artwork composition followed by the same task order.
- Calendar uses service-tinted schedule surfaces instead of border color alone. Grooming appointments are time-positioned blocks; Hotel Bookings are continuous date-range bars with distinct start, continuation, and end edges; Daycare uses the day-based service treatment.
- A Hotel Booking label appears once per visible week segment, not once per day column. The domain keeps an exclusive check-out date even though the visual bar communicates the complete arrival-to-check-out span.
- Calendar weeks begin on Sunday. Both Hotel edges and both appointment time edges can shrink or extend; touch uses a deliberate long-press drag while pointer users can move, Alt-drag to duplicate, or copy/paste the focused Booking with Ctrl/Cmd+C and Ctrl/Cmd+V.
- Calendar view/range choices are browser-local preferences (cookie), never database state. Interaction guidance and shortcut keys are a quiet legend after the schedule; transient success feedback must not insert content above the grid or shift its position.
- Calendar density is limited to Pet, service and time/date. Compact cards do not show a status word or dot; the semantic surface and complete Thai accessible name retain state context, while filters and Booking detail keep explicit status wording. Customer, Branch, notes, and resources belong in selection/detail UI.
- Grooming is the execution companion to Calendar, not another planning grid. Its desktop/tablet board uses clear status columns and a touch-safe horizontal workflow width with no date/job filter rail; mobile uses a grouped status list instead of squeezing five columns.
- A Grooming Job card uses the permitted Pet photo/avatar as its visual scan anchor, then keeps Pet/time on the left, workflow status on the right, and groomer/attention context in separate rows. Coral/Scissors provide module recognition only.
- Grooming board drag gives the card a pointer-following preview and the destination a valid/invalid highlight. Status movement is reversible, and settle/rollback and status/detail drawer transitions use the canonical 160/220/300ms motion scale; bounce, confetti, color-only success, and drag-only mobile workflows are prohibited.
- Grooming detail is a focus-managed right drawer on larger screens and a sheet/task surface on smaller screens. It uses compact section hierarchy for identity/contact, service/timing, status, resources, add-ons, internal notes, messages, and history rather than a long text modal.
- Hotel / Boarding uses Bed + Sky/Blue for module recognition only; lifecycle, success, warning and incident states continue to use semantic status tokens. Brand Yellow remains the primary CTA instead of turning Sky into the main action color.
- On desktop/tablet, Hotel Operations presents each room/zone as a capacity row across a continuous date range. Occupied, reserved and available values use text plus surface/border treatment, and multi-day Stay spans preserve start/continuation/end semantics without becoming a second Calendar.
- Hotel Stay detail is a focus-managed right drawer at larger widths and a bottom sheet/task surface on mobile. Identity/contact, dates, lifecycle, room, care, internal notes/incidents, messages and movement history remain grouped and scannable rather than nested into cards.
- At mobile widths the desktop occupancy board is hidden in favor of grouped Today/Stay tabs and lists. Room selection and lifecycle controls are explicit non-drag alternatives; the desktop board must never be compressed into unreadable columns.
- Desktop room drag previews valid/invalid capacity before commit, settles smoothly when accepted, and rolls back without losing the current room when rejected. These transitions use the canonical motion scale and obey `prefers-reduced-motion`.
- Billing uses amount-first hierarchy: a clearly labeled total, paid and remaining values use tabular numerals; Charge lines and Payment records are dense desktop rows only where comparison benefits staff. Mobile changes them to labeled card-rows while preserving Charge status, Branch attribution and the primary payment action.

## Business landing imagery

- Generic stock illustration is not used on the public landing. Real pet-business photography is the primary visual language.
- Homepage editorial imagery uses the generated photographs in `public/images/business` for the Hero, services, workflow, and closing entries. The removed `public/images/cats` directory is intentionally not a landing dependency.
- CI artwork remains a product/brand asset outside the public landing scope; `/workfiledesign` remains read-only and outside implementation scope.
- Product imagery must remain a labeled demo preview and must not imply live customer data. Photo assets are editorial mood/supporting visuals, not live customer data.

## Public Header and Footer

- The public Business Header is fixed near the top and centered in the approximately 1280px shell. It uses a translucent Warm White glass surface, subtle blur, thin warm border, soft shadow and rounded container.
- It contains the real Meawketting brand, compact navigation to implemented anchors/routes and one primary Business CTA. It contains no theme toggle, Design System badge, Emoji or dead/planned link.
- The logged-in Business Header inherits Warm White, brand Yellow, refined radius and subtle interaction while remaining compact. Active Business/Branch context, Branch switcher, Scanner action, mock Ctrl/Cmd+K Command Palette, User Menu and mobile navigation preserve the current operational architecture; the top-right icon controls share a 44px alignment grid and opening the account menu does not blur the work behind it.
- The public Footer is a centered, rounded Warm White/white surface with a thin warm border, controlled spacing, optional SVG/art decoration and only real destinations/actions. Privacy, Terms, Pricing and Support are not invented as links.
- Marketing Footer rendering is restricted to public/marketing surfaces. It is absent from `/business/home`, `/business/calendar`, `/business/grooming`, `/business/hotel`, `/business/customers`, `/business/inbox`, `/business/scan`, `/business/intake/*` and every other logged-in operational route.

## Cards and Bento

- Cards use Warm White/white surfaces, a thin warm border, restrained shadow and an optional subtle hover lift. Feature icon surfaces may use Coral, Mint, Sky or Grape soft accents without turning classification into status.
- Bento composition is appropriate for Home summaries, feature overviews and the public Business Landing. Calendar, Customers, Inbox, Scanner, Intake and forms retain the workflow-first schedule/row/conversation/action structure.
- Do not card everything, nest cards without a real boundary or convert normal metadata into pills.

## Business buttons

- Shared variants are **Primary, Secondary, Outline, Destructive, Ghost and Link**; reuse/refactor existing primitives before creating a new one.
- **Primary** uses `#F4C95D` with `#3D2B00`, a subtle shadow and a strong visible focus ring. Hover uses `#D7B152` plus `translateY(-1px)`; pressed returns to `translateY(0)` with `scale(0.98)`.
- Disabled buttons have reduced opacity, no pointer interaction and no hover/pressed transform. Icon-only controls have an accessible name and major controls preserve a 44px target.
- **Secondary / Outline / Ghost / Link** maintain a calm hierarchy and never compete with the page's primary action. **Destructive** uses the Critical palette only where consequence warrants it.
- The Signature Sweep treatment is selective: it supports primary Business landing CTAs, the high-value Booking CTA and review action, plus page-level Add Customer and service-entry Booking CTAs when readability remains intact. It starts with Primary Yellow and resolves to a solid Foreground Black surface with white text on hover/focus, while secondary form saves and Send Message actions remain calm and immediate.
- AI Rainbow buttons are reserved/experimental and are not active Product buttons.

## Forms and controls

- Input, textarea, search, select, checkbox and switch share the 8px input curvature, `#ECE8DF` border, Warm White surface, clear hover and a strong Yellow semantic focus ring.
- Invalid fields use Critical border/text plus explicit wording; focus and error may coexist without hiding either state. Labels remain visible and placeholders never replace them.
- Business forms remain low-text. Helper copy exists only for a rule, conflict, permission or consequence, and fields are not individually wrapped in decorative cards.
- Mobile form text is at least 16px. Checkbox/switch labels remain tappable, and custom select/search controls preserve keyboard and assistive-technology behavior.

## Shared component registry from reference sections 3.3 and 7–10

| Reference pattern | Current Business component / modifier | Runtime use |
|---|---|---|
| 3.3 Signature effects | `.business-signature-sweep`, `.business-signature-rainbow` | Sweep starts with tokenized Primary Yellow and reveals tokenized Foreground Black on hover/focus; rainbow CTA remains reserved/experimental and inactive |
| 7.1 Segmented tabs | `BusinessSegmentedControl` | Calendar Day/Week/Month/Custom; arrow/Home/End keyboard behavior |
| 7.2 Breadcrumbs & sidebar headers | `BusinessBreadcrumbs`, `BusinessSidebarSectionHeader` | Shared semantic breadcrumb contract and active desktop sidebar section headings |
| 8 Data tables | `BusinessDataTable` | Semantic caption, tabular numerals, compact variant and controlled horizontal overflow for future genuinely tabular surfaces |
| 9 Alerts & modals | `BusinessAlert`, `BusinessModal` | Calendar feedback uses the shared alert; modal provides backdrop close, Escape, focus trap/restore and size variants |
| 10 Progress & skeletons | `BusinessProgress`, `BusinessSkeleton` | Structural Business loading uses indeterminate progress plus shape-matched skeletons |

All primitives consume the existing three-layer Business token model. The reference HTML/CSS remains a visual input only; runtime components use project icons and contain no Emoji.

## Badges, dots and micro tags

- Shared badge roles are Default, Secondary, Outline, Destructive, Good, Warning, Critical and Info.
- Status normally uses visible text plus icon or semantic color; it is never inferred from a decorative dot alone. Micro/Tag 10px is allowed only for compact, non-critical tagging.
- Compact Calendar cards intentionally omit the status label and dot: their semantic surface is paired with the complete Thai status in the control's accessible name, while filters and detail contexts retain readable status wording.
- Badges are reserved for status, filter, tag and small category. Important operational data and ordinary metadata remain readable text.

## Data tables

- Tables use LINE Seed Sans TH, tabular numerals where needed, warm borders, restrained headers, readable row spacing and a clear hover/focus treatment.
- Use tables only for genuinely tabular BF-7 Billing, Reports, Team, inventory-like or financial data. Service Record history belongs to the Customer/Pet timeline context rather than a standalone table.
- Every responsive table has an explicit mobile strategy: priority-column reduction, stacked labeled rows or controlled horizontal scrolling with the primary action/identity retained. Customer/Pet Service Record history keeps the Pet visual anchor and text-plus-icon payment reference in its inline detail pattern.

## Modal, alert, toast and feedback surfaces

- Task dialogs use a restrained overlay with backdrop blur, rounded Warm White surface, clear action hierarchy and a subtle scale/translate entry using premium easing. Mobile may use a focus-managed bottom sheet. The compact Header account popover is the exception: its click-away layer is transparent and never blurs the page.
- Dialog focus is trapped and restored; Escape/close behavior is predictable; destructive confirmation clearly names the consequence.
- Success, Warning, Critical and Information alerts use the semantic palettes with a Lucide icon and text. Toasts use safe-area-aware placement and restrained slide/fade motion; trivial actions do not create decorative noise.
- Empty states explain what happened and offer a real next action when one exists. No Emoji is used as empty/alert art.

## Motion and loading

- Canonical easing is `--ease-premium: cubic-bezier(0.22, 1, 0.36, 1)`.
- Canonical duration tokens are `--duration-fast: 160ms`, `--duration-base: 220ms`, `--duration-slow: 300ms`, and `--duration-navigation: 280ms`. Fast covers press/hover, Base covers tabs/accordion/dropdown, Slow covers emphasized settle/rollback, and Navigation covers sheet/drawer transitions.
- Approved patterns include button hover/press, subtle card lift, modal fade/scale, toast slide/fade, accordion/tabs, normal progress and structural skeleton shimmer.
- Calendar, Booking, Grooming board, Customer records, Scanner and Intake remain responsive and restrained. Bounce, wobble and confetti are not used.
- Shared skeletons match content structure: Customer rows, Calendar, Home metrics and Inbox list. Prefer structural skeletons over a giant generic spinner.
- Determinate progress uses Brand/Semantic colors. The shared multi-accent indeterminate bar is limited to structural page loading and respects reduced motion; it never communicates Booking or operational status.
- `prefers-reduced-motion: reduce` removes non-essential animation, shimmer travel and transforms without hiding state or feedback.

## Customers & Pets (BF-3) visual language

- The Customer list is a fast operational row list on desktop and a stacked readable row on mobile. It is not a spreadsheet table, a consumer Passport gallery or a card wall.
- Desktop/tablet rows keep stable identity, Pet, next-Booking and activity columns with short visible labels; long authority/access explanations move to detail disclosure instead of stretching the list.
- List filters describe actionable relationship states only. Passport connection/non-connection filters are intentionally absent; Passport status remains record context, not a primary browse mode.
- Yellow remains for primary actions, selected filters, and navigation. Customer rows remain white/warm-neutral with borders and concise hierarchy.
- Customer rows use name/contact, plain Pet lines, next Booking and optional tags. Pet names, phone numbers and services are not chips.
- Customer initials and neutral Cat/Dog placeholders establish scan anchors. A real Pet photo may replace the placeholder only when the Business is allowed to use it; Consumer Passport cards are never reused as Business list rows.
- The list carries only a compact Passport connection state. Source, expiry, allowed-data and no-additional-access detail is disclosed inside Customer/Pet detail when relevant.
- Connection/access states use visible text and an icon, not color alone. A connected state never implies permanent access.
- `ข้อมูลที่ลูกค้าแจ้ง`, `ข้อมูลของร้าน`, and `ข้อมูลจาก Pet Passport` are reserved source labels where a boundary matters. Business notes and lightweight tags remain visually separate from Guardian-controlled information.
- At 390px the order is search → filters → results for the list, and identity → contact actions → Pets → upcoming/recent Bookings → notes/tags for detail. Multiple Pets use a horizontal snap/peek strip; ordinary detail sections never require horizontal scrolling. Dialogs become bottom sheets while retaining focus trap and restoration.

## Inbox & communication (BF-4) visual language

- The Inbox is a row list plus message timeline, not a card wall or a generic messenger clone. Desktop uses a readable split view; 320–430px uses list → full conversation task.
- Rows prioritize Customer/Pet identity, current service, latest message, time, and an accessible unread marker. Search has one visible boundary and the three honest filters (`ทั้งหมด`, `ยังไม่ได้อ่าน`, `กำลังใช้บริการ`) use compact 14px labels.
- Customer messages use neutral/white surfaces. Business messages use a restrained warm surface; Pastel Yellow is reserved for active navigation, selected rows/filters, focus, and send/request actions rather than every bubble.
- Consecutive messages group by sender/time. Moderate-radius bubbles, separators, plain timestamps, and explicit local delivery copy keep the interface operational rather than playful.
- Structured requests are distinct semantic blocks with service, demo amount, added time, visible status, and Guardian-response boundary. Status never relies on color alone.
- The composer and quick replies retain 44px targets, a persistent label for assistive technology, safe-area spacing, and no document-level horizontal overflow. Mobile focus moves to the selected conversation heading.
- Quick replies show three defaults, omit decorative numbering, and use a dashed circular add control. Staff can collapse the section; that choice is stored in a browser cookie and can be restored without a database write.

## Responsive architecture

| Viewport | Range | Behavior |
|---|---|---|
| Mobile | 320–767px | Low–medium density; bottom navigation and full-screen/sheet tasks; Calendar is Agenda-first; Grooming is a grouped status list; Billing uses labeled Charge/Payment rows; Customer Pets may use a snap/peek strip |
| Tablet | 768–1023px | Medium density; touch-first adaptive grids; compact Home banner/actions; Calendar day/week hybrid; Grooming boards remain contained and horizontally navigable only inside the workflow surface; Billing keeps clear amount hierarchy |
| Desktop | 1024px+ | Medium–high density without smaller body text; persistent navigation; split panes, operational rows, compact financial tables and Calendar planning use the available width |

- Required QA widths are 320, 375, 390, 430, 768, 820, 1024, 1200 and 1440px.
- Horizontal scrolling is allowed only for filter chips, segmented views, multiple-Pet snap/peek summaries, tablet workflow boards and Calendar date-range spans. It is prohibited for body copy, forms, Customer lists, Inbox messages, detail sections, critical alerts and confirmation dialogs.
- Responsive components keep the same data and behavior but may change composition: desktop row/board/split pane → tablet adaptive row/contained board → mobile stacked summary/tabbed task/full-screen sheet.
- Desktop hover enhancement always has a usable focus, pressed and touch equivalent. No mobile path depends on hover.
- The public shell may cap around 1280px; operational Calendar/board workflows are not artificially constrained when wider space materially improves planning.
- The responsive rules above describe current Business/public surfaces. The future LINE Mini App is mobile-first by direction, but its detailed navigation and component specification are deferred to the Consumer LINE Mini App phase.

## Accessibility

- Normal text contrast >= 4.5:1; large text >= 3:1.
- Visible focus rings use the high-contrast semantic Yellow ring; Yellow buttons retain `#3D2B00` foreground.
- One semantic H1 per page; semantic HTML, keyboard navigation, dialog focus trap/restore and ARIA are required where native semantics are insufficient.
- Major controls retain at least 44×44px targets; icon-only controls have screen-reader labels; mobile form controls remain at least 16px.
- Status and validation are never conveyed by color alone; Signature Sweep and glass never reduce text readability.
- Thai wrapping and 200% text zoom must not clip content or controls.
- `prefers-reduced-motion: reduce` disables non-essential animations while preserving understandable state transitions.
- Calendar date-range spans expose an accessible name containing the Pet and arrival/departure range. Pet images have meaningful alt text or an intentionally empty decorative alt when adjacent text already supplies identity.
