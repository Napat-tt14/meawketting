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

### Business-first product direction rebase — 2026-08-18

| ID | Decision |
|---|---|
| D-64 | **Meawketting Business is the main product and primary commercial experience.** The business platform is the primary revenue-driving surface. Pet Passport & Guardian Network serves as the foundational trust, privacy, and identity layer. |
| D-65 | **Root Homepage (`/`) is the canonical Commercial Business Landing page.** The previous Consumer landing is superseded. `/business` becomes a compatibility redirect to `/`. |
| D-66 | **Business Visual System is Warm Golden Yellow (`WARM OPERATIONAL CLARITY`).** Primary operational color uses `--color-meaw-yellow-400` / `500` with accessible dark ink text (`#281417` / `var(--color-meaw-ink-950)`). Distinct from Amber/Orange (`cream-900` / `peach-600`) which is reserved for Waiting/Pending states. |
| D-67 | **Consumer feature development is PAUSED.** The existing consumer features (Create Passport, My Pets, Public Safety, Lost flow, Temporary Business Sharing) remain active, tested, and preserved as a solid trust foundation; no new consumer feature development will proceed in this phase. |

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
| D-73 | The public landing content is intentionally compact at desktop: use an approximately 1200px shell at the 1440px QA baseline with responsive 32px desktop, 24px tablet and 16px mobile gutters. Full-width gradients and decorative atmosphere may extend beyond the shell. |
| D-74 | Generated landing visuals must read as realistic photography rather than cartoon illustration. Local photo assets support the product story without implying live data; no caption labels such as “ภาพถ่ายประกอบ · แนวคิดผลิตภัณฑ์” are needed on the visual. |

### Landing photo-led refresh — 2026-08-20

| ID | Decision |
|---|---|
| D-75 | The root Hero, workflow, and closing entries use real-photo surfaces with a compact 1200px content shell. Decorative gradients may move subtly, but cards must remain readable and the footer logo is shown directly without a contrasting logo box. |
| D-76 | Landing entry cards use balanced editorial photo windows rather than circular crops, and the Hero product board uses a clear split between daily work and supporting photography. |

### BF-2 Booking & Calendar foundation — 2026-08-17

| ID | Decision |
|---|---|
| D-59 | `/business/calendar` is the live shared Business Calendar destination in desktop and mobile navigation. It answers cross-module Branch planning, not Grooming operations, Hotel occupancy or Daycare attendance. |
| D-60 | BF-2 keeps Booking create, edit, review, cancellation and recovery as contextual Calendar task UI. It does not create `/business/bookings/new`, `/business/bookings/[id]`, module Calendar routes or a fake Visit/Order screen. |
| D-61 | The shared Booking foundation represents appointment, date-range and day work without forcing one service module into another module’s operational UX. |
| D-62 | The active browser-local Branch limits Calendar services and filters. A Branch change revalidates an open Booking draft; incompatible service/resource choices cannot remain silently valid. |
| D-63 | BF-2 uses a small Booking-status foundation only: รอยืนยัน, ยืนยันแล้ว, มาถึงแล้ว and ยกเลิก. It does not define service-operation lifecycle states. |

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
| D-43 | Service Job is the shared unit of work extended as Grooming Job, Hotel Stay, Daycare Visit, etc.; module UX and lifecycles remain service-specific |
| D-44 | Resource is a shared internal model; UI uses context words such as ช่าง, จุดบริการ, ห้อง and โซน |
| D-45 | Inbox/Conversation is Business Core and may carry contextual structured decisions, not only generic chat |
| D-46 | Charge and Payment are separate; a multi-service Visit may support combined checkout |
| D-47 | Billing/Revenue do not commit Meawketting to General Ledger, payroll, tax filing or full accounting/ERP |
| D-48 | Phase E is the **Shared Business Intake Engine** and remains valid across Service Modules |
| D-49 | CareProof is cross-service: shared record/evidence foundation plus module-specific content |
| D-50 | Grooming uses appointment/calendar UX; Hotel uses stay/occupancy UX; Daycare uses zone/capacity UX |
| D-51 | Hotel room types are Business-configurable and must not be hardcoded to example names |
| D-52 | Branch is operational scope, not cosmetic context; transfer rechecks resource, consent, execution and attribution |
| D-53 | Business UI direction is **WARM OPERATIONAL CLARITY**, with natural Thai and restrained operational motion |
| D-54 | The Business Foundation stage precedes further feature development; generic Phase F is not the automatic next step |
| D-55 | Current local Business App Home route is `/business/home`; public Business Landing is `/`; mock Login remains `/business/login` |
| D-56 | Business navigation exposes live Home, Calendar, and Scanner; Customers, Inbox, enabled service modules, Finance, Reports, Team and Settings remain planned with no fake routes |
| D-57 | The browser-local active Business/Branch context drives Home summaries and enabled module navigation together |
| D-58 | Business User Menu is account/context-focused: current Business, Branch, role and Sign out; product destinations stay in main navigation |

### Product and trust foundation (Preserved)

| ID | Decision |
|---|---|
| D-01 | Product name is **Meawketting**; initial species are Cat and Dog with Cat first/default and Pet-ready language |
| D-02 | Create first, claim later; Google is the primary auth direction, Phone is UI-only and email/password is not planned |
| D-03 | One Person identity may hold several contexts; Consumer, Business and Platform Admin authorize and navigate separately |
| D-04 | Business never owns Pet Passport data through sharing, intake, service or payment |
| D-05 | Quick Passport, Public Safety and Temporary Business QR are three separate privacy contracts |
| D-06 | Pet Detail is Passport-first; Quick Passport QR is a five-minute state, not a Business permission or separate route |
| D-07 | Temporary Business access binds recipient, Branch when applicable, purpose, scope, duration, consent and revoke/history |
| D-08 | Business intake creates Business data/correction suggestions and never overwrites Guardian source data |
| D-09 | Service Document is not automatically a Tax Invoice; neutral `Acknowledge` language remains until legal policy is decided |
| D-10 | Memorial, Archive, Transfer and Delete are distinct lifecycle actions |
| D-11 | Noto Sans Thai is the active UI font; Sriracha is short decoration only |
| D-12 | Passport/export is 4:5 with six current styles; icons use Lucide through `react-icons`, never Emoji/Dingbat UI glyphs |
| D-14 | Business owns its Landing, Login, Header/User Menu and operational navigation; current local namespace is `/business` |
| D-16 | Route model is Product → Module → Route → Flow → Task → State → Component; flow steps and old Page IDs are not routes |
| D-17 | The canonical documentation set is the 12 owner files routed by `docs/README.md`; the HTML manual is derived only |
| D-18 | `/workfiledesign` is outside documentation-rebase scope: do not modify, restructure, rename or delete it without an explicit direct Product Owner instruction |
| D-19 | Consumer navigation direction is four equal destinations: หน้าหลัก, สัตว์เลี้ยง, กิจกรรม and ข้อความ. Home and Messages are **PLANNED / DISABLED**; Pets is live at `/my-pets`; Activity is live at `/activity`. |
| D-20 | Create Passport is a contextual action inside My Pets at `/create-passport`, not a primary navigation destination. |
| D-21 | Signed-in Consumer User Menu is account-oriented: identity information and Sign out only. |
| D-22 | Planned Consumer Home and Messages must not receive fake routes. Home must not link to public `/`; Messages must not imply real Inbox/Chat. |

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
| OQ-BF24 | CareProof visibility, correction and hide/delete policy? |
| OQ-BF25 | Required Hotel daily-care tasks and exception handling? |
| OQ-BF26 | Service-specific evidence retention requirements? |
| OQ-BF27 | Branch revenue attribution for transfer and multi-Branch work? |
| OQ-BF28 | Cross-Branch charges, checkout and payments? |
| OQ-BF29 | Accounting export/integration direction? |

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
| OQ-14 | Production hosting/domain, security and deployment architecture |

## Current reversible assumptions

- Primary Guardian controls high-risk Pet actions until relationship policy changes.
- Public Lost uses area-level location text; precise coordinates are hidden.
- Production Scanner requires authenticated membership before protected data.
- Consent snapshots are versioned.
- Light theme is first; semantic tokens remain theme-ready.
- Current Business, Branch, role, QR duration and checked-in references are Demo fixtures, not production policy.
- BF-2 Booking, service, Customer/Pet reference and Resource/capacity fixtures are browser-local demo data.
