# Supabase staging acceptance

EXTERNAL CONFIG REQUIRED / NOT YET DEPLOYED. Follow the [runbook](./PRODUCTION_RUNBOOK.md); do not use real customer data.

1. Engineer configures a separate Supabase/Cloudflare staging environment and applies all three migrations to an empty database.
2. Verify mapped Google login, unmapped account denial, expired/revoked sessions, refresh, logout and provider recovery. No arbitrary account can create an Owner.
3. Exercise Owner/Manager/Staff and inactive users across Businesses and Branches. Confirm guessed IDs and client role claims never authorize actions.
4. Create synthetic Customer/Pet, Booking, execution, Consent/Intake, contextual Inbox and financial records. Confirm Reports/CRM derive results and do not mutate sources.
5. Retry Booking/payment/webhook operations, race resource capacity, submit stale revisions and verify payment totals remain correct.
6. Confirm private media upload limits, MIME rejection, opaque paths, cross-tenant/Branch denial and 60-second reads. Test real Storage policies.
7. Check unchanged Business UI on phone/desktop, keyboard operation, failure/loading states and LINE Seed Sans TH.
8. Complete the previously documented BE1/BE2 stale-form/retry follow-up, load/latency and separate-project backup/restore acceptance before production.

Consumer remains PAUSED. No production deployment is authorized by this checklist.
