-- DEV/TEST ONLY. This is not a production import and never reads browser storage.
INSERT INTO persons (id, display_name, primary_email, status, created_at, updated_at) VALUES
  ('prs_01k47meawketting000000001', 'คุณนนท์', 'owner@meawketting.example.test', 'active', '2026-09-05T00:00:00.000Z', '2026-09-05T00:00:00.000Z'),
  ('prs_01k47meawketting000000002', 'ผู้จัดการอารีย์', 'manager@meawketting.example.test', 'active', '2026-09-05T00:00:00.000Z', '2026-09-05T00:00:00.000Z'),
  ('prs_01k47meawketting000000003', 'พนักงานทองหล่อ', 'staff@meawketting.example.test', 'active', '2026-09-05T00:00:00.000Z', '2026-09-05T00:00:00.000Z'),
  ('prs_01k47meawketting000000004', 'สมาชิกพักการใช้งาน', 'inactive-membership@meawketting.example.test', 'active', '2026-09-05T00:00:00.000Z', '2026-09-05T00:00:00.000Z'),
  ('prs_01k47meawketting000000005', 'บุคคลนอกธุรกิจ', 'outsider@meawketting.example.test', 'active', '2026-09-05T00:00:00.000Z', '2026-09-05T00:00:00.000Z'),
  ('prs_01k47meawketting000000006', 'บุคคลพักการใช้งาน', 'inactive-person@meawketting.example.test', 'inactive', '2026-09-05T00:00:00.000Z', '2026-09-05T00:00:00.000Z') ON CONFLICT DO NOTHING;

INSERT INTO businesses (
  id, name, contact_name, phone, email, description, address, logo_url, status,
  created_at, updated_at, created_by_person_id, updated_by_person_id
) VALUES
  ('business-whisker-rest', 'Whisker Rest', 'คุณนนท์', '02-114-8828', 'hello@whiskerrest.example', 'บริการดูแล อาบน้ำ ตัดขน และที่พักสำหรับสัตว์เลี้ยง', 'กรุงเทพมหานคร', NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'Paw Partner', 'คุณมายด์', '02-021-4722', 'care@pawpartner.example', 'ทีมดูแลสัตว์เลี้ยงแบบรายวันและเข้าพัก', 'กรุงเทพมหานคร', NULL, 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO branches (
  id, business_id, name, name_key, area, address, phone, email, timezone, status,
  created_at, updated_at, created_by_person_id, updated_by_person_id
) VALUES
  ('whisker-ari', 'business-whisker-rest', 'อารีย์', 'อารีย์', 'อารีย์', 'ซอยอารีย์ 4 แขวงพญาไท กรุงเทพฯ', '02-114-8828', 'ari@whiskerrest.example', 'Asia/Bangkok', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('whisker-thonglor', 'business-whisker-rest', 'ทองหล่อ', 'ทองหล่อ', 'ทองหล่อ', 'ซอยทองหล่อ 13 เขตวัฒนา กรุงเทพฯ', '02-114-8839', 'thonglor@whiskerrest.example', 'Asia/Bangkok', 'active', '2026-08-17T03:01:00.000Z', '2026-08-17T03:01:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('partner-onnut', 'business-paw-partner', 'อ่อนนุช', 'อ่อนนุช', 'อ่อนนุช', 'ถนนอ่อนนุช เขตสวนหลวง กรุงเทพฯ', '02-021-4722', 'onnut@pawpartner.example', 'Asia/Bangkok', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO branch_enabled_modules (business_id, branch_id, module, created_at, created_by_person_id) VALUES
  ('business-whisker-rest', 'whisker-ari', 'grooming', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'hotel', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'grooming', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'hotel', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'daycare', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO branch_operating_hours (
  business_id, branch_id, weekday, closed, opens_at, closes_at, updated_at, updated_by_person_id
) VALUES
  ('business-whisker-rest', 'whisker-ari', 'monday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'tuesday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'wednesday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'thursday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'friday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'saturday', 0, '09:00', '18:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-ari', 'sunday', 0, '09:00', '18:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'monday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'tuesday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'wednesday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'thursday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'friday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'saturday', 0, '09:00', '18:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'whisker-thonglor', 'sunday', 0, '09:00', '18:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'monday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'tuesday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'wednesday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'thursday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'friday', 0, '09:00', '20:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'saturday', 0, '09:00', '18:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'partner-onnut', 'sunday', 0, '09:00', '18:00', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO business_memberships (
  id, person_id, business_id, role, status, created_at, updated_at, created_by_person_id, updated_by_person_id
) VALUES
  ('mem_01k47meawketting000000001', 'prs_01k47meawketting000000001', 'business-whisker-rest', 'OWNER', 'active', '2026-09-05T00:01:00.000Z', '2026-09-05T00:01:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('mem_01k47meawketting000000002', 'prs_01k47meawketting000000001', 'business-paw-partner', 'OWNER', 'active', '2026-09-05T00:02:00.000Z', '2026-09-05T00:02:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('mem_01k47meawketting000000003', 'prs_01k47meawketting000000002', 'business-whisker-rest', 'MANAGER', 'active', '2026-09-05T00:03:00.000Z', '2026-09-05T00:03:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('mem_01k47meawketting000000004', 'prs_01k47meawketting000000003', 'business-whisker-rest', 'STAFF', 'active', '2026-09-05T00:04:00.000Z', '2026-09-05T00:04:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('mem_01k47meawketting000000005', 'prs_01k47meawketting000000004', 'business-paw-partner', 'MANAGER', 'inactive', '2026-09-05T00:05:00.000Z', '2026-09-05T00:05:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO membership_branch_access (
  membership_id, business_id, branch_id, status, created_at, updated_at, created_by_person_id, updated_by_person_id
) VALUES
  ('mem_01k47meawketting000000003', 'business-whisker-rest', 'whisker-ari', 'active', '2026-09-05T00:10:00.000Z', '2026-09-05T00:10:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('mem_01k47meawketting000000004', 'business-whisker-rest', 'whisker-thonglor', 'active', '2026-09-05T00:10:00.000Z', '2026-09-05T00:10:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('mem_01k47meawketting000000005', 'business-paw-partner', 'partner-onnut', 'active', '2026-09-05T00:10:00.000Z', '2026-09-05T00:10:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;
