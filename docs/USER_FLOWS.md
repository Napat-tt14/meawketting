# User Flows

Status: **CANONICAL GOAL-ORIENTED FLOWS (BUSINESS-FIRST REBASE)**  
Owner: UX Architecture

A flow defines goal, decision, privacy boundary and recovery. It does not prescribe page count. Route classification is owned by [ROUTES](./ROUTES.md).

## Product priority and portal entry

- **Primary Commercial Experience**: Business Landing (`/`) → Business Login (`/business/login`) → Business Home (`/business/home`) → Shared Calendar & Bookings (`/business/calendar`) → Shared Scanner & Intake (`/business/scan`).
- **Compatibility Redirect**: `/business` immediately redirects to `/`.
- **Consumer Trust Layer (Paused / Preserved)**: Pet owners access `/my-pets`, `/create-passport`, `/activity`, `/passports`, and `/qr-preview`. Independent consumer feature expansion is paused.

## Business flows (Primary commercial experience)

### 1. Business entry and authentication flow
- **Entry**: Root homepage (`/`) or `/business/login`.
- **Landing (`/`)**:
  1. Understand Business value in the first viewport: bookings, schedule, customers/pets, service work, team/branches, intake, communication, and revenue direction.
  2. Inspect the clearly labeled mock “Today” product preview; it is demo data, not live customer data.
  3. Choose the primary CTA **เข้าสู่ระบบสำหรับธุรกิจ** → `/business/login`, or scroll to `#business-core`.
  4. Review supported multi-service businesses, the connected Hotel + Grooming scenario, product-direction workflow, and Guardian-controlled trust layer.
  5. Pet owners use the visually secondary `#guardian` bridge → `/my-pets`, with `/create-passport` as a supporting action.
- **Login (`/business/login`)**: Google prototype authentication. Redirects to `/business/home`.
- **Context Switcher**: Frontdesk staff switches between demo branches (Whisker Rest Ari, Whisker Rest Thonglor, Paw Partner Onnut). Active modules, team members, and bookings update coherently.

### 2. Business Home & Today's priorities (BF-1)
- **Route**: `/business/home`.
- **Flow**:
  1. Review priority cues in `สิ่งที่ต้องจัดการ` (e.g., arrivals, pending decisions).
  2. Inspect `งานถัดไป` chronological timeline.
  3. View `สรุปวันนี้` capacity counters (Waiting, Bookings, Pickup, Messages).
  4. Quick jump to `สแกนรับเข้า` (`/business/scan`) or `ปฏิทิน` (`/business/calendar`).

### 3. Shared Booking & Calendar flow (BF-2 Live)
- **Route**: `/business/calendar`.
- **Flow**:
  1. Inspect calendar in Day or Week view (Desktop) or Chronological Agenda (Mobile).
  2. Filter by service module (Grooming / Hotel / Daycare) or status (Confirmed, Arrived, Pending, Cancelled).
  3. Click `เพิ่มการจอง` to open contextual Booking Editor sheet/dialog.
  4. Select Branch-enabled service, demo contact & pet, date/time range.
  5. Automatic capacity and resource validation checks for exclusive groomer/table/dryer collisions, hotel room limits, or daycare zone capacity.
  6. Review summary and confirm booking.
  7. Cancel booking flow: proportional cancellation confirmation with local allocation release and history preservation.

### 4. Shared Business Intake Engine flow (Phase E Live)
- **Route**: `/business/scan` → `/business/intake/[intakeId]`.
- **Flow**:
  1. Camera scan or manual 8-character entry for Temporary Business QR.
  2. Pre-validation checks QR type, active Business, active Branch, purpose, scope, and expiry.
  3. Quick Passport and Public Safety QR contracts are strictly rejected.
  4. Display allowed pet profile and medical/care facts without leaking unshared fields.
  5. Log belongings (อาหาร, ยา, ปลอกคอ, ของเล่น, อื่น ๆ) and intake notes.
  6. Review intake summary and confirm receive/check-in.
  7. Status advances to Checked In.

### 5. Planned Business flows
- **Customers & Pets CRM (BF-3)**: Search, view linked pets, tag customer, inspect visit history.
- **Contextual Inbox & Add-on Approvals (BF-4)**: Propose service changes, price/time updates, photo evidence, customer approve/decline.
- **Multi-Service Checkout & Billing (BF-5)**: Combine hotel nights, grooming add-ons, and daycare into one visit checkout.

---

## Consumer flows (Preserved trust foundation — Paused)

| Flow | Happy path | Critical recovery / boundary |
|---|---|---|
| Create and claim | Landing bridge → photo/crop/name/species → Passport Preview → mock Login → Pet Detail | Preserve draft/source image through errors; no public sharing before choice |
| My Pets / Pet Detail | Pet library → Passport-first detail → compact info/care/history → management actions | Relationship loss and missing data reveal no private content |
| Quick Passport QR | Flip Passport → five-minute QR/barcode/countdown → renew or flip back | Passport-safe scope only; no Business/Safety permission |
| Public Safety / Lost | Configure public-safe fields → activate Lost → Finder lead → Guardian review → mark found | Same public identity changes state; restricted contact/location; abuse path |
| Temporary Business Sharing | Select Business/Branch → scope → duration → consent → QR → gateway/decision → revoke/history | No Pet value before valid context and active consent |
| Returned Service History | History list → stable record → evidence/document/correction request | **PLANNED**; internal Business data and unshared evidence excluded |

### Consumer navigation composition

The preserved Consumer shell uses four equal destinations:
```text
หน้าหลัก (PLANNED / DISABLED) · สัตว์เลี้ยง (LIVE: /my-pets) · กิจกรรม (LIVE: /activity) · ข้อความ (PLANNED / DISABLED)
```
- `สร้าง Passport` is a contextual action inside My Pets (`/create-passport`), not a primary navigation bar item.
- Signed-in consumer user menu handles session and account identity only; it never exposes internal business operations.
