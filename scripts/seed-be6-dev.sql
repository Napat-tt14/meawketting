-- DEV/TEST ONLY: fictional Business-owned channels and independently verified contact addresses.
-- This seed connects no LINE OA, creates no Person authority, and imports no browser messages.
INSERT INTO business_channels(id,business_id,branch_id,provider,state,external_account_id,secret_ref,created_at)
VALUES('channel_be6_whisker_test','business-whisker-rest','whisker-ari','mock','active','TEST-WHISKER-OA','TEST_ONLY','2026-08-18T00:00:00.000Z'),
('channel_be6_paw_test','business-paw-partner','partner-onnut','mock','active','TEST-PAW-OA','TEST_ONLY','2026-08-18T00:00:00.000Z')
ON CONFLICT(id) DO NOTHING;
INSERT INTO customer_channel_links(id,business_id,channel_id,customer_id,external_subject,status,verification_source,created_at)
VALUES('contact_link_be6_nalin','business-whisker-rest','channel_be6_whisker_test','booking-contact-nalin','TEST-LINE-NALIN','active','dev-test','2026-08-18T00:00:00.000Z')
ON CONFLICT(id) DO NOTHING;
