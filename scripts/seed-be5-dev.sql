-- DEV/TEST ONLY. Explicit fictional Passport/Primary Guardian authority, separate from all Business memberships.
INSERT OR IGNORE INTO persons(id,display_name,status,created_at,updated_at) VALUES('prs_be5_guardian_000001','ผู้ดูแลทดสอบหนึ่ง','active','2026-09-08T00:00:00.000Z','2026-09-08T00:00:00.000Z');
INSERT OR IGNORE INTO persons(id,display_name,status,created_at,updated_at) VALUES('prs_be5_guardian_000002','ผู้ดูแลทดสอบสอง','active','2026-09-08T00:00:00.000Z','2026-09-08T00:00:00.000Z');
INSERT OR IGNORE INTO pets(id,created_at) VALUES('pet_be5_unlinked_000001','2026-09-08T00:00:00.000Z');
INSERT OR IGNORE INTO passport_profiles(pet_id,name,species,reference,updated_at) VALUES('booking-pet-mochi','Mochi Passport','cat','TEST-PASSPORT-MOCHI','2026-09-08T00:00:00.000Z');
INSERT OR IGNORE INTO passport_profiles(pet_id,name,species,reference,updated_at) VALUES('booking-pet-milo','Milo Passport','cat','TEST-PASSPORT-MILO','2026-09-08T00:00:00.000Z');
INSERT OR IGNORE INTO passport_profiles(pet_id,name,species,reference,updated_at) VALUES('pet_be5_unlinked_000001','Unlinked Pet','dog','TEST-UNLINKED','2026-09-08T00:00:00.000Z');
INSERT OR IGNORE INTO pet_authorities(id,person_id,pet_id,role,status,source,created_at) VALUES('authority_be5_mochi','prs_be5_guardian_000001','booking-pet-mochi','primary','active','dev-test','2026-09-08T00:00:00.000Z');
INSERT OR IGNORE INTO pet_authorities(id,person_id,pet_id,role,status,source,created_at) VALUES('authority_be5_milo','prs_be5_guardian_000002','booking-pet-milo','primary','active','dev-test','2026-09-08T00:00:00.000Z');
INSERT OR IGNORE INTO pet_authorities(id,person_id,pet_id,role,status,source,created_at) VALUES('authority_be5_co','prs_be5_guardian_000002','booking-pet-mochi','co-guardian','active','dev-test','2026-09-08T00:00:00.000Z');
INSERT OR IGNORE INTO pet_authorities(id,person_id,pet_id,role,status,source,created_at) VALUES('authority_be5_unlinked','prs_be5_guardian_000001','pet_be5_unlinked_000001','primary','active','dev-test','2026-09-08T00:00:00.000Z');
-- Grants contain short-lived credentials and are issued explicitly by the test/Guardian boundary, never seed placeholders.
