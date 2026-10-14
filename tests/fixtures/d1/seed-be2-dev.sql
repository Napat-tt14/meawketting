-- DEV/TEST ONLY. Deterministic compatibility identities for frozen BF fixtures.
-- This seed never reads browser/session storage and contains no Guardian,
-- Passport, consent, access-grant, QR, or ownership authority.

INSERT INTO customers (
  id, business_id, display_name, display_name_key, phone, phone_key, email, business_notes,
  status, created_at, updated_at, created_by_person_id, updated_by_person_id
) VALUES
  ('booking-contact-nalin', 'business-whisker-rest', 'คุณนลิน', 'คุณนลิน', '081-555-0142', '0815550142', 'nalin@example.test', 'ลูกค้าชอบนัดช่วงเช้า', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('booking-contact-pim', 'business-whisker-rest', 'คุณพิม', 'คุณพิม', '089-444-2088', '0894442088', NULL, 'กรุณาโทรก่อนรับกลับ', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('booking-contact-onnut-aom', 'business-paw-partner', 'คุณอ้อม', 'คุณอ้อม', '086-333-1199', '0863331199', NULL, '', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('booking-contact-onnut-lee', 'business-paw-partner', 'คุณลี', 'คุณลี', NULL, NULL, 'lee@example.test', '', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO pets (id, created_at, created_by_person_id) VALUES
  ('booking-pet-mochi', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('booking-pet-milo', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('booking-pet-biscuit', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('booking-pet-luna', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('booking-pet-tofu', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('booking-pet-pudding', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('booking-pet-maple', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001'),
  ('booking-pet-leo', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO business_pet_profiles (
  business_id, pet_id, name, name_key, species, profile_source, business_notes, status,
  created_at, updated_at, created_by_person_id, updated_by_person_id
) VALUES
  ('business-whisker-rest', 'booking-pet-mochi', 'Mochi', 'mochi', 'cat', 'customer-reported', '', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'booking-pet-milo', 'Milo', 'milo', 'dog', 'customer-reported', '', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'booking-pet-biscuit', 'Biscuit', 'biscuit', 'cat', 'customer-reported', '', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'booking-pet-luna', 'Luna', 'luna', 'cat', 'customer-reported', '', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'booking-pet-tofu', 'Tofu', 'tofu', 'dog', 'customer-reported', '', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'booking-pet-pudding', 'Pudding', 'pudding', 'dog', 'customer-reported', '', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'booking-pet-maple', 'Maple', 'maple', 'dog', 'customer-reported', '', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'booking-pet-leo', 'Leo', 'leo', 'cat', 'customer-reported', '', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO customer_tags (
  business_id, customer_id, tag_key, label, position, created_at, updated_at,
  created_by_person_id, updated_by_person_id
) VALUES
  ('business-whisker-rest', 'booking-contact-nalin', 'ลูกค้าประจำ', 'ลูกค้าประจำ', 0, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'booking-contact-nalin', 'hotel', 'Hotel', 1, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-whisker-rest', 'booking-contact-pim', 'grooming', 'Grooming', 0, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'booking-contact-onnut-aom', 'daycare', 'Daycare', 0, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('business-paw-partner', 'booking-contact-onnut-lee', 'hotel', 'Hotel', 0, '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;

INSERT INTO customer_pet_relationships (
  id, business_id, customer_id, pet_id, status, created_at, updated_at,
  created_by_person_id, updated_by_person_id
) VALUES
  ('cpr_fixture_nalin_mochi', 'business-whisker-rest', 'booking-contact-nalin', 'booking-pet-mochi', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('cpr_fixture_nalin_milo', 'business-whisker-rest', 'booking-contact-nalin', 'booking-pet-milo', 'active', '2026-08-17T03:00:01.000Z', '2026-08-17T03:00:01.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('cpr_fixture_nalin_biscuit', 'business-whisker-rest', 'booking-contact-nalin', 'booking-pet-biscuit', 'active', '2026-08-17T03:00:02.000Z', '2026-08-17T03:00:02.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('cpr_fixture_pim_luna', 'business-whisker-rest', 'booking-contact-pim', 'booking-pet-luna', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('cpr_fixture_pim_tofu', 'business-whisker-rest', 'booking-contact-pim', 'booking-pet-tofu', 'active', '2026-08-17T03:00:01.000Z', '2026-08-17T03:00:01.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('cpr_fixture_aom_pudding', 'business-paw-partner', 'booking-contact-onnut-aom', 'booking-pet-pudding', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('cpr_fixture_aom_maple', 'business-paw-partner', 'booking-contact-onnut-aom', 'booking-pet-maple', 'active', '2026-08-17T03:00:01.000Z', '2026-08-17T03:00:01.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001'),
  ('cpr_fixture_lee_leo', 'business-paw-partner', 'booking-contact-onnut-lee', 'booking-pet-leo', 'active', '2026-08-17T03:00:00.000Z', '2026-08-17T03:00:00.000Z', 'prs_01k47meawketting000000001', 'prs_01k47meawketting000000001') ON CONFLICT DO NOTHING;
