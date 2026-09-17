# Pilot acceptance workbook

Status: **NOT YET TESTED WITH REAL SHOP**. Automated evidence in [production report](./PRODUCTION_TRACK_REPORT.md); infrastructure/load procedure in [runbook](./PRODUCTION_RUNBOOK.md). The checkboxes below are blank deliberately. An engineer prepares authenticated staging accounts and synthetic data first; no code reading is needed by the Product Owner.

Use two separate browser profiles (Operator 1 and Operator 2), one Owner, one restricted Staff, two shops A/B and two branches of A. Start with known opening hours, one last free room/slot and a written sample price. Record device/browser/width, date, role, shop, branch, result, screenshot and request ID if shown. Screenshots must use synthetic names and contacts. Mark PASS only after refresh; mark BLOCKED when auth/provider is unavailable.

For every workflow ask: **Persistence** ปิด/refresh แล้วข้อมูลยังอยู่ไหม; **Isolation** ร้าน A เห็นร้าน B ไหม; **Authority** คนไม่มีสิทธิ์ทำได้ไหม; **Invalid Action** ระบบปฏิเสธสิ่งผิดไหม; **Double Action** กดสองครั้งหรือสองคนพร้อมกันแล้วซ้ำไหม; **Recovery** API/network fail แล้ว UI หลอกว่าสำเร็จไหม. Reopen from a second browser to distinguish durable data from cached presentation.

| Done | Workflow / simple action | Expected behavior |
|---|---|---|
| [ ] | Owner edits shop/branch details; refresh and switch branch | Changes persist, selected branch is clear, Customer/Pet identity remains shop-wide |
| [ ] | Disable one service module or deactivate a branch, then attempt new work | New invalid work rejected; authorized history remains readable; no silent fallback to another branch |
| [ ] | Staff opens settings and tries Owner-only edit; inactive member reopens a task | Server denies action; display role never grants permission |
| [ ] | Add Customer and Pet, edit phone/name/note, search by Customer/phone/Pet | Refresh retains data; duplicate warning appears where matching criteria apply; no automatic merge |
| [ ] | Open the same Customer from second branch; try a copied URL/ID from shop B | Same shop identity is reused; foreign data never appears, including Passport or money |
| [ ] | Create Booking, edit, cancel; refresh each time | Single durable Booking; cancelled history retained, capacity released correctly |
| [ ] | Drag Booking to another time; shorten and lengthen from both edges | Valid moves persist; invalid move restores authoritative time and explains conflict |
| [ ] | Book outside hours, disabled service, unavailable staff/resource | Explicit rejection; no optimistic success survives refresh |
| [ ] | Create Hotel stay spanning days/month-end | One logical stay, correct nights/capacity on each date; checkout boundary tested |
| [ ] | Both operators simultaneously book the last resource/room/Daycare slot | **ONE succeeds and ONE gets conflict. Never both succeed.** Refresh both to the same result |
| [ ] | Grooming: assign staff/resource → start → care → ready → complete | Valid lifecycle persists; incompatible staff rejected; one Pet Service Record; no automatic Payment |
| [ ] | Hotel: assign/move room → check-in → care notes → ready → checkout | No overcapacity on any date; care and move history persist; one Service Record |
| [ ] | Daycare: choose zone/staff → check-in → activity/care → pickup → complete | Capacity enforced at check-in; history persists; one Service Record |
| [ ] | Scan a valid Temporary Business QR for correct shop/branch | Only permitted fields shown; receive/check-in persists once |
| [ ] | Scan Quick Passport/Public Safety, expired, revoked or wrong-branch token | Intake blocked; failure stays Pet-neutral; private fields never appear |
| [ ] | Revoke consent while operator has Intake open, then submit | Revalidation rejects access; no stale consent authorizes receive |
| [ ] | Inbox: create/open conversation, send, mark read; reopen elsewhere | Message/read state durable; repeated send key creates one message; branch privacy preserved |
| [ ] | Engineer injects duplicate event, timeout, disconnect and failed delivery | No duplicate message; retry state visible; disconnected does not say delivered; provider absent = BLOCKED |
| [ ] | Create Charge; record part-payment, then final payment | Charge is distinct from Payment; balances update correctly; service status unaffected |
| [ ] | Double-submit payment; two operators pay remaining debt together | No duplicate collection/allocation; stale action conflicts or same-key replay returns same result |
| [ ] | Authorized refund/correction under agreed manual policy | One immutable refund, correct net revenue; no automatic cancellation of completed service; gateway refund is BLOCKED |
| [ ] | Reports: switch branch/date, compare service counts and Payments less refunds | Matches prepared canonical sample; no writable report/CRM truth; no Charge-only revenue |
| [ ] | CRM: inspect timeline/order and cross-branch Customer history | Derived sequence and balances match source; restricted branch history stays hidden |
| [ ] | Expire/revoke session; logout and try Back/refresh/second request | Protected reads/writes rejected server-side; requires actual auth integration, currently BLOCKED |
| [ ] | Turn network offline just before save; restore and retry same action | No false success; visible error/recovery; server result reconciles once after ambiguity |
| [ ] | Slow network and 500/429 response during Booking/payment/report | Pending/error state understandable; no wrong-branch stale data; retry never duplicates mutation |
| [ ] | Midnight, shop closing/opening, multi-day boundary, selected branch timezone | Document actual business-day behavior; Thailand-only recommendation needs PO acceptance; DST/multi-timezone blocked until separately validated |
| [ ] | Reopen shop after engineer's staging restore drill | Customers, Bookings, care, messages, payments and sums match agreed restore point; lost interval reconciled before reopening |

Run the checklist at desktop 1440×900, existing mobile widths 390×844 and 360×800, using actual supported devices/browsers. Check navigation, overlays, text clipping, touch alternatives for drag, camera permission denial and manual QR input. Repeat core save/refresh/concurrency steps with representative larger Business data. Check longest Customer names and empty, loading and failed states. Record timezone and the shop's close/open boundary; do not assume testing at noon covers midnight.

Owner/shop operator signs off only the workflows actually performed. A simulated LINE adapter cannot pass real OA delivery; a manual financial entry cannot pass gateway settlement; generated QR fixtures cannot certify real Guardian onboarding. No production credentials or real-shop data are required for this workbook's staging rehearsal.

Release hold: any cross-shop data, unauthorized mutation, conflicting capacity accepted twice, duplicate payment, false success after failure, unproven auth/session or unverified restore. The engineer investigates and repeats the affected flow before reopening the gate.
