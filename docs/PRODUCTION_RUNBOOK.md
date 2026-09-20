# Supabase and Cloudflare setup

Status: IMPLEMENTED in code; TESTED LOCALLY with synthetic data; EXTERNAL CONFIG REQUIRED; NOT YET DEPLOYED. This is not Production Ready.

## Architecture and authority

Browser → Cloudflare Worker/API → application/domain authorization → PostgreSQL repositories → Supabase PostgreSQL.
Supabase Auth authenticates Google and LINE identities. An auth_person_links row maps the verified Supabase UUID to Person. Existing accounts can be linked by an operator; new accounts can explicitly register their first store after completing and confirming store details. Active Person, Membership, Business, Branch and target/action checks remain in Meawketting on every request. Email, client claims and LINE identity confer no authority. OAuth login alone never creates an Owner. See [Business registration](./BUSINESS_REGISTRATION.md).

Supabase Storage holds private media; PostgreSQL holds scoped metadata only. No privileged credentials enter the browser.

## Product Owner configuration

Create separate Supabase staging and production projects; start with staging only. PostgreSQL 16 or newer is required. Keep real customer data out of staging.

Provide these values through Cloudflare Secrets (never source code, Git, screenshots or chat):
- DATABASE_URL: TLS PostgreSQL connection URI from Supabase Connect, preferably the transaction pooler for Workers. Prepared statements are disabled. Use a server database role authorized for the Business schema; anonymous/authenticated API roles are deliberately denied. Review runtime role privileges separately from the migration administrator before staging approval.
- SUPABASE_URL: project HTTPS URL.
- SUPABASE_PUBLISHABLE_KEY: project publishable/anon key used by the server Auth client.
- SUPABASE_SERVICE_ROLE_KEY: server-only Storage credential. Never use a NEXT_PUBLIC prefix.

Set non-secret environment values: MEAWKETTING_AUTH_MODE=supabase, MEAWKETTING_ENV=staging, MEAWKETTING_FIXTURE_MODE=off, MEAWKETTING_PUBLIC_ORIGIN=the exact HTTPS staging origin. Configure API_RATE_LIMITER and distinct staging hostname/Worker name using wrangler.pilot.example.json. The example is not a deployment authorization. The generated build has no database binding or fallback.

In Supabase Auth, enable Google. Put Google client ID/secret in the Supabase provider settings, not Cloudflare or the browser. Google Authorized redirect URI is the Supabase Auth callback URL shown in that dashboard. Set the Supabase Site URL to staging and allow exactly https://STAGING_HOST/api/auth/google/callback. Do not use wildcard production callback URLs. Configure Google consent/test users and recovery/support policy.

## Migrations and private bucket

An engineer/operator supplies the administrator DATABASE_URL in their local process environment and runs:

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run storage:setup
```

storage:setup also requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. It creates/updates only business-media as private, limits objects to 10 MiB, and allows JPEG/PNG/WebP. Do not add public read/write policies.

Three ordered migrations under supabase/migrations create the clean baseline, Auth/media foundation, and explicit event ordering. They are not SQLite migration replays. The runner uses an advisory lock, one atomic transaction and a checksum ledger; repeat execution is safe, modifying an applied file is rejected. Drizzle generates review drafts in supabase/generated; only reviewed SQL in supabase/migrations is authoritative.

No production data exists to migrate. Never seed staging for real users. For an isolated developer database only, set MEAWKETTING_ENV=test and run npm.cmd run db:seed:test with synthetic fixtures.

## Explicit identity provisioning and recovery

Existing Person/Business/Membership/Branch grants must be explicitly provisioned by an authorized operator. Synthetic Owners are never production onboarding. After verifying the intended Supabase Auth user UUID, set SUPABASE_AUTH_USER_ID and MEAWKETTING_PERSON_ID and run npm.cmd run auth:link with the administrator database connection. The script refuses an inactive or unprovisioned Person and never creates authority. New, unlinked verified accounts use `/business/register`: explicit store details and confirmation create the Person, store, first Branch and Owner membership atomically. Existing linked accounts cannot use registration to elevate privileges or create another Owner workspace.

Google account recovery is handled by the configured provider/Supabase Auth. The durable mapping uses UUID, not mutable email. Any account replacement/relink requires operator identity verification and session revocation; never copy a role from claims. Test recovery and revocation with actual staging accounts before release.

## Media and operational safety

POST /api/media authorizes Business/Branch/Pet/execution context before accepting a bounded body, checks allowed MIME plus image signature, uses opaque random paths and rechecks authorization before metadata commit. Failed metadata persistence attempts object cleanup. Monitor/reconcile private orphan objects if cleanup fails. GET /api/media?id=… reauthorizes and returns a signed URL valid for 60 seconds. A previously issued URL remains usable until expiry; it is a bearer credential and must not be logged. Images are not fully decoded or transcoded by this foundation. No new media UI is exposed.

Run only read-only aggregate checks from scripts/production-operations.sql for operational inspection. Keep request bodies, credentials, signed URLs, customer names and Passport fields out of logs.

## Staging acceptance and rollback

Before production approval, verify real Google PKCE callback, refresh, logout, revoked/unmapped users, recovery, expired cookies, active/inactive memberships, tenant/Branch denial, media upload/read denial and expiry, pooler/TLS connectivity from Cloudflare, and two-operator Booking/payment conflicts. Repeat API smoke using synthetic staging records. Measure latency, connection limits and provider outages.

Use Supabase backup/PITR appropriate to the chosen plan and rehearse restore into a separate project. Restore Storage separately and reconcile metadata/object references; database backup is not an object backup. A code rollback cannot restore the removed database architecture. Back up before later migrations and prefer reviewed forward fixes; never drop an unknown schema/database. Real staging backup/restore, load, security and provider integration remain unverified.

Consumer stays PAUSED. No LINE Mini App, payment-provider choice, production deploy, commit or push is part of this migration.
