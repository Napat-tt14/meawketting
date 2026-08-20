# UX Rules

Status: **CANONICAL BEHAVIOR, STATE AND RECOVERY CONTRACTS (BUSINESS-FIRST REBASE)**  
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
- **Consumer Navigation (Paused / Preserved)**: Consumer shell uses four slots (หน้าหลัก, สัตว์เลี้ยง, กิจกรรม, ข้อความ). `สร้าง Passport` is contextual inside My Pets (`/my-pets`), not in the navigation bar.

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

## Business Home, navigation and context (BF-1)

- Mock Business Login enters `/business/home` by default.
- Business Home prioritizes attention and next work before compact summaries. Every value is demo fixture data; revenue is explicitly `DEMO / MOCK`.
- The header keeps the active Business, Branch and role inspectable. The prototype switcher changes browser-local context only.
- Changing Branch updates Home values, enabled module summaries and module navigation together. A module not enabled for the active Branch is absent, not merely visually dimmed.
- Desktop navigation has live Home and Calendar plus a prominent Scanner action in the header. Mobile has exactly Home, Calendar, Scan, Messages and More; Home, Calendar and Scan are live and unbuilt items are disabled.
- Planned destinations use disabled semantics, `aria-disabled` and restrained `เร็ว ๆ นี้` copy.

## Shared Booking & Calendar rules (BF-2 Live)

- Calendar answers “ร้านมีอะไรเกิดขึ้นเมื่อไร?” across the Service Modules enabled at the active Branch.
- Desktop/tablet provides a compact day/week planning view; mobile uses a readable date-oriented chronological agenda.
- Booking items communicate service type with text and restrained module/status treatment; cancelled items remain available only when their status filter includes them.
- Creating and editing bookings happens within a contextual dialog/sheet without leaving the calendar view.
- Capacity checks validate all required people, places/equipment, and capacity constraints before review.
- Cancellation preserves booking history in local state and releases demo allocation.

## Shared Business Intake Engine rules (Phase E Live)

- Scanner offers camera and manual recovery; QR/token values never enter general analytics.
- Pre-validation states are Pet-neutral.
- `ข้อมูลที่ร้านได้รับ` shows consented fields only with source/expiry context.
- `ข้อมูลรับเข้า` creates Business facts and correction suggestions without mutating the Pet Passport.
- Required Guardian decision blocks receive/check-in; mid-flow revoke/expiry hides protected data.
- Final receive/check-in is explicit, duplicate-safe, and names the responsibility transition.

## Accessibility and mobile behavior

- Targets are at least 44×44px; no hover-only paths; sticky regions respect safe area insets.
- Status uses text plus a non-color cue (e.g. icon or badge); live updates do not steal focus.
- Visible focus rings with yellow/amber tinting.
- `prefers-reduced-motion: reduce` removes non-essential animations.
