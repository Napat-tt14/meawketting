# D1 target acceptance

EXTERNAL CONFIG REQUIRED / NOT YET DEPLOYED. Follow the [runbook](./PRODUCTION_RUNBOOK.md). The production D1 schema is applied/verified through the Dashboard: 70 STRICT domain tables, 133 indexes, 81 triggers, one view and zero foreign-key orphans; `0001_initial.sql` is recorded once. Wrangler credentials still lack D1 write permission; source transfer, OAuth/environment setup and deployed acceptance remain pending. No deployment is authorized by this checklist.

The user declined enabling R2. No bucket was created; production private-media acceptance is blocked until a later authorized provisioning decision.

1. Recheck the applied APAC D1 schema/ledger and `DB` binding, then directly transfer existing records/provider linkage during the deliberate cutover window. Source media rows are currently zero; private media transfer requires later R2 provisioning if files appear. Preserve IDs and verify row counts, foreign keys, totals, receipts, histories and all domain invariants before acceptance. Never merge Persons by email or restore PostgreSQL.
2. Verify direct Google/LINE consent/callback, state/nonce/PKCE failures, returning Person linkage, setup-only unlinked identities, expired/revoked sessions, rotation/logout and deliberate verified recovery for former email-only users.
3. Exercise Owner/Manager/Staff and inactive/revoked users across Businesses/Branches. Guessed IDs and browser role claims must never grant access.
4. Use synthetic Customer/Pet, Booking, execution, Consent/Intake, Inbox and financial records. Reports/CRM must derive results without changing canonical sources.
5. Retry/race Booking/payment/webhook operations, fill each capacity type, cancel during update and submit stale revisions. Verify deterministic conflicts and no duplicate charge/credit/booking.
6. Verify private R2 PNG/JPEG/WebP limits, MIME rejection, scoped keys, authenticated object streaming and cross-tenant/Branch denial. Confirm transferred bytes and private bucket configuration.
7. Check unchanged Business UI on phone/desktop, keyboard operation, local pending/loading/failure states, warm caches and LINE Seed Sans TH. Navigation should change the shell promptly.
8. Record LOCAL, REMOTE TEST and PRODUCTION performance separately. Complete the documented BE1/BE2 stale-form/retry follow-up before production. D1 platform Time Travel remains a platform facility; this migration adds no manual backup/export/restore workflow.

Consumer remains PAUSED. The Guardian LINE Mini App and real payment/provider choice remain separate unimplemented/open scope.
