# Cloudflare D1 production runbook

Production status — 2026-10-15: commit 18de0d9 was deployed successfully as Worker version 050df786-d4f7-445a-b4c7-1d29d5b4a9c7 (build a1114ee3-38f2-4c02-9334-49b08c0b89b8). The owner confirmed the Supabase source project was deleted and explicitly approved a fresh start on empty D1; source Person/Business preservation and transfer are superseded by that decision. No synthetic accounts or Businesses were inserted. Runtime bindings are native DB/D1, private MEDIA/R2 and API_RATE_LIMITER. Public landing/login/register pages respond 200. Google Login reaches the provider but is blocked by redirect_uri_mismatch until https://meawketting.com/api/auth/google/callback is registered on the existing OAuth client; real sign-in and first-Business creation are not yet verified. LINE Login is explicitly deferred by the owner.

## Active resources

- Worker: meawketting, https://meawketting.com; deployed through Dashboard Retry build from main commit 18de0d9.
- DB: meawketting-production, ID 3e920509-817c-4d36-9243-7ad0afe4a874, APAC hint. Reviewed 0001_initial.sql has 70 STRICT domain tables, 133 explicit indexes, 81 triggers and one view.
- MEDIA: private Standard R2 bucket meawketting-private-media, Asia Pacific, Public Access disabled.
- API_RATE_LIMITER: 300 requests per 60 seconds. Existing generated asset/image bindings remain build-managed.
- Runtime vars: MEAWKETTING_AUTH_MODE=session, MEAWKETTING_ENV=production, MEAWKETTING_FIXTURE_MODE=off, MEAWKETTING_PUBLIC_ORIGIN=https://meawketting.com.

## Complete Google acceptance

The existing Google OAuth client has GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET configured in the Worker. Register this exact Authorized redirect URI on that same Google Cloud OAuth web client:

`https://meawketting.com/api/auth/google/callback`

Then start a new login from /business/login. Real sign-in, opaque session issuance, first-workspace registration and Owner permissions remain unverified until that provider change is accepted. No client ID/secret rotation or new OAuth client is required to fix the observed redirect mismatch. LINE_LOGIN_CHANNEL_ID and LINE_LOGIN_CHANNEL_SECRET are not configured; the owner explicitly deferred LINE Login. When configured later, LINE uses the same callback route with provider identity held in consumed server state.

## Data and release policy

The owner deleted Supabase and approved starting again on empty D1. Do not run the historical source-transfer tool against another database or invent Person linkage from emails. No production test fixtures were seeded. Historical 2026-10-13 source counts and local test evidence are retained as audit records, not migrated or recoverable data. Runtime uses native D1 only, with no PostgreSQL fallback, dual-write or manual backup/restore implementation.

Deploy authorization applies to the reviewed retry. The agent did not commit or push local documentation changes. Future schema changes are reviewed forward migrations in migrations/d1; generated Drizzle drafts omit custom guards and are not authoritative.

## Verification

Existing local verification: backend 121, rendered HTML 99, client loading/refresh 44 and security 9 tests passed, plus TypeScript/build/lint and 41 local HTTP handler requests. These tests were not repeated for documentation-only changes.

Production deployment: build a1114ee3-38f2-4c02-9334-49b08c0b89b8, version 050df786-d4f7-445a-b4c7-1d29d5b4a9c7. Landing/login/register HTTP 200, guest account status 401, and unsupported GET /api/be1 405. Direct Google start successfully writes D1 OAuth state and reaches Google, but provider callback registration is still required. Production authenticated Business, payment, LINE and media behavior are not yet acceptance-tested. See work/d1-deployment-2026-10-15.md for actual evidence.

Run future build and rendered HTML checks serially because both use dist/. Local DB migrate/seed scripts explicitly target local D1; never seed synthetic records into production.
