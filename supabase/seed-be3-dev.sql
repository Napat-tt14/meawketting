-- DEV/TEST ONLY. Deterministic BE3 planning catalog and Booking fixtures.
-- This never reads browser/session storage. Customer/Pet names remain in BE2;
-- Booking rows hold only durable IDs. Team/HR and Hotel execution rooms are out.

INSERT INTO booking_services (
  id, business_id, branch_id, module, label, time_model, default_duration_minutes,
  estimate, status, created_at, updated_at, created_by_person_id, updated_by_person_id
) VALUES
  ('ari-grooming-bath-groom', 'business-whisker-rest', 'whisker-ari', 'grooming', 'อาบน้ำ / ตัดขน', 'appointment', 90, 850, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('ari-hotel-stay', 'business-whisker-rest', 'whisker-ari', 'hotel', 'เข้าพักโรงแรม', 'date-range', NULL, 1200, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('thonglor-grooming-bath', 'business-whisker-rest', 'whisker-thonglor', 'grooming', 'อาบน้ำและตัดเล็บ', 'appointment', 60, 650, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('onnut-hotel-stay', 'business-paw-partner', 'partner-onnut', 'hotel', 'เข้าพักโรงแรม', 'date-range', NULL, 1000, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('onnut-daycare-full-day', 'business-paw-partner', 'partner-onnut', 'daycare', 'Daycare เต็มวัน', 'day', NULL, 450, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO booking_service_resource_requirements (
  business_id, branch_id, service_id, resource_kind, position, created_at, created_by_person_id
) VALUES
  ('business-whisker-rest', 'whisker-ari', 'ari-grooming-bath-groom', 'groomer', 0, '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'ari-grooming-bath-groom', 'grooming-station', 1, '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'ari-grooming-bath-groom', 'dryer', 2, '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'ari-hotel-stay', 'hotel-room-type', 0, '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'thonglor-grooming-bath', 'groomer', 0, '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'thonglor-grooming-bath', 'grooming-station', 1, '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'thonglor-grooming-bath', 'dryer', 2, '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'onnut-hotel-stay', 'hotel-room-type', 0, '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'onnut-daycare-full-day', 'daycare-zone', 0, '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO booking_resources (
  id, business_id, branch_id, module, kind, label, capacity_mode, capacity,
  compatibility_staff_id, hotel_role, status, created_at, updated_at,
  created_by_person_id, updated_by_person_id
) VALUES
  ('ari-groomer-pim', 'business-whisker-rest', 'whisker-ari', 'grooming', 'groomer', 'ช่างพิม', 'exclusive', 1, 'team-pim', NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('ari-groomer-joy', 'business-whisker-rest', 'whisker-ari', 'grooming', 'groomer', 'ช่างจอย', 'exclusive', 1, 'team-joy', NULL, 'inactive', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('ari-station-a', 'business-whisker-rest', 'whisker-ari', 'grooming', 'grooming-station', 'จุดบริการ A', 'exclusive', 1, NULL, NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('ari-station-b', 'business-whisker-rest', 'whisker-ari', 'grooming', 'grooming-station', 'จุดบริการ B', 'exclusive', 1, NULL, NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('ari-dryer-1', 'business-whisker-rest', 'whisker-ari', 'grooming', 'dryer', 'เครื่องเป่า 1', 'exclusive', 1, NULL, NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('ari-dryer-2', 'business-whisker-rest', 'whisker-ari', 'grooming', 'dryer', 'เครื่องเป่า 2', 'exclusive', 1, NULL, NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('ari-hotel-capacity', 'business-whisker-rest', 'whisker-ari', 'hotel', 'hotel-room-type', 'พื้นที่พักตามเงื่อนไข', 'capacity', 2, NULL, 'planning-capacity', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('thonglor-groomer-nok', 'business-whisker-rest', 'whisker-thonglor', 'grooming', 'groomer', 'ช่างนก', 'exclusive', 1, 'team-nok', NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('thonglor-station-a', 'business-whisker-rest', 'whisker-thonglor', 'grooming', 'grooming-station', 'จุดบริการ A', 'exclusive', 1, NULL, NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('thonglor-dryer-1', 'business-whisker-rest', 'whisker-thonglor', 'grooming', 'dryer', 'เครื่องเป่า 1', 'exclusive', 1, NULL, NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('onnut-hotel-capacity', 'business-paw-partner', 'partner-onnut', 'hotel', 'hotel-room-type', 'พื้นที่พักตามเงื่อนไข', 'capacity', 2, NULL, 'planning-capacity', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('onnut-daycare-social', 'business-paw-partner', 'partner-onnut', 'daycare', 'daycare-zone', 'โซนสังคม', 'capacity', 2, NULL, NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('onnut-daycare-quiet', 'business-paw-partner', 'partner-onnut', 'daycare', 'daycare-zone', 'โซนสงบ', 'capacity', 6, NULL, NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO booking_resource_service_links (
  business_id, branch_id, resource_id, service_id, created_at, created_by_person_id
) VALUES
  ('business-whisker-rest', 'whisker-ari', 'ari-groomer-pim', 'ari-grooming-bath-groom', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'ari-groomer-joy', 'ari-grooming-bath-groom', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'ari-station-a', 'ari-grooming-bath-groom', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'ari-station-b', 'ari-grooming-bath-groom', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'ari-dryer-1', 'ari-grooming-bath-groom', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'ari-dryer-2', 'ari-grooming-bath-groom', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'ari-hotel-capacity', 'ari-hotel-stay', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'thonglor-groomer-nok', 'thonglor-grooming-bath', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'thonglor-station-a', 'thonglor-grooming-bath', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'thonglor-dryer-1', 'thonglor-grooming-bath', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'onnut-hotel-capacity', 'onnut-hotel-stay', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'onnut-daycare-social', 'onnut-daycare-full-day', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'onnut-daycare-quiet', 'onnut-daycare-full-day', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO booking_resource_availability_windows (
  id, business_id, branch_id, resource_id, state, start_local, end_local,
  start_minute, end_minute, created_at, updated_at, created_by_person_id, updated_by_person_id
) VALUES
  ('be3-team-pim-working', 'business-whisker-rest', 'whisker-ari', 'ari-groomer-pim', 'working', '2026-08-18T08:00', '2026-08-18T18:00', 29784000, 29784600, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('be3-team-pim-break', 'business-whisker-rest', 'whisker-ari', 'ari-groomer-pim', 'break', '2026-08-18T12:00', '2026-08-18T13:00', 29784240, 29784300, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('be3-team-joy-working', 'business-whisker-rest', 'whisker-ari', 'ari-groomer-joy', 'working', '2026-08-18T08:00', '2026-08-18T18:00', 29784000, 29784600, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('be3-team-nok-working', 'business-whisker-rest', 'whisker-thonglor', 'thonglor-groomer-nok', 'working', '2026-08-18T08:00', '2026-08-18T17:00', 29784000, 29784540, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO bookings (
  id, business_id, branch_id, customer_id, service_id, service_module, time_model,
  start_local, end_local, start_minute, end_minute, start_weekday, status, estimate,
  notes, revision, write_token, idempotency_key, create_request_hash, created_at,
  updated_at, cancelled_at, created_by_person_id, updated_by_person_id, cancelled_by_person_id
) VALUES
  ('booking-fixture-ari-grooming-1030', 'business-whisker-rest', 'whisker-ari', 'booking-contact-nalin', 'ari-grooming-bath-groom', 'grooming', 'appointment', '2026-08-18T10:30', '2026-08-18T12:00', 29784150, 29784240, 'tuesday', 'confirmed', 850, 'ใช้ตรวจสอบเวลาชน', 1, 'seed:grooming-1030', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL),
  ('booking-fixture-ari-grooming-biscuit', 'business-whisker-rest', 'whisker-ari', 'booking-contact-nalin', 'ari-grooming-bath-groom', 'grooming', 'appointment', '2026-08-18T08:00', '2026-08-18T09:00', 29784000, 29784060, 'tuesday', 'arrived', 850, 'งานเช้าที่เสร็จแล้วสำหรับตรวจประวัติบริการ', 1, 'seed:grooming-biscuit', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL),
  ('booking-fixture-ari-grooming-tofu-active', 'business-whisker-rest', 'whisker-ari', 'booking-contact-pim', 'ari-grooming-bath-groom', 'grooming', 'appointment', '2026-08-18T09:15', '2026-08-18T10:45', 29784075, 29784165, 'tuesday', 'arrived', 850, 'ใช้แสดงงานที่กำลังรอช่างรับช่วง', 1, 'seed:grooming-tofu', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL),
  ('booking-fixture-ari-grooming-milo', 'business-whisker-rest', 'whisker-ari', 'booking-contact-nalin', 'ari-grooming-bath-groom', 'grooming', 'appointment', '2026-08-18T12:15', '2026-08-18T13:45', 29784255, 29784345, 'tuesday', 'arrived', 850, 'รอเจ้าของมารับหลังเสร็จบริการ', 1, 'seed:grooming-milo', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL),
  ('booking-fixture-ari-grooming-luna', 'business-whisker-rest', 'whisker-ari', 'booking-contact-pim', 'ari-grooming-bath-groom', 'grooming', 'appointment', '2026-08-18T14:30', '2026-08-18T16:00', 29784390, 29784480, 'tuesday', 'confirmed', 850, 'มีสิทธิ์สแกนรับเข้าเพื่อเชื่อม Intake กับงานนี้', 1, 'seed:grooming-luna', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL),
  ('booking-fixture-ari-hotel-luna', 'business-whisker-rest', 'whisker-ari', 'booking-contact-pim', 'ari-hotel-stay', 'hotel', 'date-range', '2026-08-18', '2026-08-21', 29783520, 29787840, 'tuesday', 'confirmed', 3600, 'เข้าพัก 3 คืน', 1, 'seed:hotel-luna', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL),
  ('booking-fixture-ari-hotel-biscuit-checkout', 'business-whisker-rest', 'whisker-ari', 'booking-contact-nalin', 'ari-hotel-stay', 'hotel', 'date-range', '2026-08-16', '2026-08-18', 29780640, 29783520, 'sunday', 'confirmed', 2400, 'เตรียมรับกลับวันนี้', 1, 'seed:hotel-biscuit', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL),
  ('booking-fixture-ari-hotel-milo', 'business-whisker-rest', 'whisker-ari', 'booking-contact-nalin', 'ari-hotel-stay', 'hotel', 'date-range', '2026-08-19', '2026-08-20', 29784960, 29786400, 'wednesday', 'confirmed', 1200, 'พื้นที่พักเต็มในวันที่ 19 สิงหาคม', 1, 'seed:hotel-milo', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL),
  ('booking-fixture-ari-hotel-nalin-pair', 'business-whisker-rest', 'whisker-ari', 'booking-contact-nalin', 'ari-hotel-stay', 'hotel', 'date-range', '2026-08-24', '2026-08-26', 29792160, 29795040, 'monday', 'confirmed', 4800, 'ลูกค้าเข้าพักพร้อมน้องสองตัว แต่ต้องจัดห้องและดูแลแยกกัน', 1, 'seed:hotel-pair', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL),
  ('booking-fixture-ari-cancelled', 'business-whisker-rest', 'whisker-ari', 'booking-contact-pim', 'ari-grooming-bath-groom', 'grooming', 'appointment', '2026-08-18T14:00', '2026-08-18T15:30', 29784360, 29784450, 'tuesday', 'cancelled', 850, 'ยกเลิกแล้ว จึงไม่กินเวลาหรือทรัพยากร', 1, 'seed:cancelled', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', '2026-08-17T04:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('booking-fixture-thonglor-grooming', 'business-whisker-rest', 'whisker-thonglor', 'booking-contact-pim', 'thonglor-grooming-bath', 'grooming', 'appointment', '2026-08-18T10:45', '2026-08-18T11:45', 29784165, 29784225, 'tuesday', 'confirmed', 650, 'ตรวจสอบรายการก่อนเริ่มงาน', 1, 'seed:thonglor-grooming', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL),
  ('booking-fixture-onnut-daycare-full', 'business-paw-partner', 'partner-onnut', 'booking-contact-onnut-aom', 'onnut-daycare-full-day', 'daycare', 'day', '2026-08-18', NULL, 29783520, 29784960, 'tuesday', 'confirmed', 900, 'สองรายการทำให้โซนสังคมเต็มในวันที่ 18 สิงหาคม', 1, 'seed:daycare-full', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL),
  ('booking-fixture-onnut-hotel-leo', 'business-paw-partner', 'partner-onnut', 'booking-contact-onnut-lee', 'onnut-hotel-stay', 'hotel', 'date-range', '2026-08-18', '2026-08-20', 29783520, 29786400, 'tuesday', 'pending', 2000, 'ตรวจสอบรายการก่อนเริ่มงาน', 1, 'seed:hotel-leo', NULL, NULL, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', NULL, 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001', NULL) ON CONFLICT DO NOTHING;

INSERT INTO booking_pets (business_id, branch_id, booking_id, pet_id, position, created_at, created_by_person_id) VALUES
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-1030','booking-pet-mochi',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-biscuit','booking-pet-biscuit',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-tofu-active','booking-pet-tofu',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-milo','booking-pet-milo',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-luna','booking-pet-luna',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-hotel-luna','booking-pet-luna',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-hotel-biscuit-checkout','booking-pet-biscuit',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-hotel-milo','booking-pet-milo',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-hotel-nalin-pair','booking-pet-mochi',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-hotel-nalin-pair','booking-pet-biscuit',1,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-cancelled','booking-pet-tofu',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-thonglor','booking-fixture-thonglor-grooming','booking-pet-tofu',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-paw-partner','partner-onnut','booking-fixture-onnut-daycare-full','booking-pet-pudding',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-paw-partner','partner-onnut','booking-fixture-onnut-daycare-full','booking-pet-maple',1,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-paw-partner','partner-onnut','booking-fixture-onnut-hotel-leo','booking-pet-leo',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO booking_resource_assignments (
  business_id, branch_id, booking_id, resource_id, position, created_at, created_by_person_id
) VALUES
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-1030','ari-groomer-pim',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-1030','ari-station-a',1,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-1030','ari-dryer-1',2,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-biscuit','ari-groomer-pim',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-biscuit','ari-station-a',1,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-biscuit','ari-dryer-1',2,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-tofu-active','ari-groomer-joy',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-tofu-active','ari-station-b',1,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-tofu-active','ari-dryer-2',2,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-milo','ari-groomer-joy',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-milo','ari-station-b',1,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-milo','ari-dryer-2',2,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-luna','ari-groomer-pim',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-luna','ari-station-a',1,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-grooming-luna','ari-dryer-1',2,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-cancelled','ari-groomer-pim',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-cancelled','ari-station-a',1,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-cancelled','ari-dryer-1',2,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-thonglor','booking-fixture-thonglor-grooming','thonglor-groomer-nok',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-thonglor','booking-fixture-thonglor-grooming','thonglor-station-a',1,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-thonglor','booking-fixture-thonglor-grooming','thonglor-dryer-1',2,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-hotel-luna','ari-hotel-capacity',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-hotel-biscuit-checkout','ari-hotel-capacity',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-hotel-milo','ari-hotel-capacity',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-whisker-rest','whisker-ari','booking-fixture-ari-hotel-nalin-pair','ari-hotel-capacity',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-paw-partner','partner-onnut','booking-fixture-onnut-daycare-full','onnut-daycare-social',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001'),
  ('business-paw-partner','partner-onnut','booking-fixture-onnut-hotel-leo','onnut-hotel-capacity',0,'2026-08-17T03:00:00.000Z','prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO booking_resource_reservations (
  business_id, branch_id, booking_id, resource_id, reservation_key, reservation_date, start_minute, end_minute, units
)
SELECT assignment.business_id, assignment.branch_id, assignment.booking_id, assignment.resource_id,
       'interval', NULL, booking.start_minute, booking.end_minute, 1
FROM booking_resource_assignments assignment
INNER JOIN bookings booking
  ON booking.business_id = assignment.business_id AND booking.branch_id = assignment.branch_id AND booking.id = assignment.booking_id
INNER JOIN booking_resources resource
  ON resource.business_id = assignment.business_id AND resource.branch_id = assignment.branch_id AND resource.id = assignment.resource_id
WHERE resource.capacity_mode = 'exclusive' ON CONFLICT DO NOTHING;

WITH RECURSIVE capacity_days (business_id, branch_id, booking_id, resource_id, day_minute, end_minute, units) AS (
  SELECT assignment.business_id, assignment.branch_id, assignment.booking_id, assignment.resource_id,
         CAST(booking.start_minute / 1440 AS INTEGER) * 1440, booking.end_minute,
         (SELECT COUNT(*) FROM booking_pets pet WHERE pet.business_id = booking.business_id AND pet.branch_id = booking.branch_id AND pet.booking_id = booking.id)
  FROM booking_resource_assignments assignment
  INNER JOIN bookings booking
    ON booking.business_id = assignment.business_id AND booking.branch_id = assignment.branch_id AND booking.id = assignment.booking_id
  INNER JOIN booking_resources resource
    ON resource.business_id = assignment.business_id AND resource.branch_id = assignment.branch_id AND resource.id = assignment.resource_id
  WHERE resource.capacity_mode = 'capacity'
  UNION ALL
  SELECT business_id, branch_id, booking_id, resource_id, day_minute + 1440, end_minute, units
  FROM capacity_days WHERE day_minute + 1440 < end_minute
)
INSERT INTO booking_resource_reservations (
  business_id, branch_id, booking_id, resource_id, reservation_key, reservation_date, start_minute, end_minute, units
)
SELECT business_id, branch_id, booking_id, resource_id,
       to_char(to_timestamp(day_minute * 60) AT TIME ZONE 'UTC','YYYY-MM-DD'), to_char(to_timestamp(day_minute * 60) AT TIME ZONE 'UTC','YYYY-MM-DD'), day_minute, day_minute + 1440, units
FROM capacity_days ON CONFLICT DO NOTHING;
