-- DEV/TEST ONLY. No Charge or Payment is inferred from browser fixtures or service completion.
-- This account is usable only by explicitly injected test adapters. The Business API has no provider configured.
INSERT OR IGNORE INTO payment_provider_accounts(id,business_id,provider,external_account_id,secret_ref,source,status)
VALUES('payment_account_be7_test','business-whisker-rest','mock','TEST-BE7-MERCHANT','test-only-unprovisioned','dev-test','active');
