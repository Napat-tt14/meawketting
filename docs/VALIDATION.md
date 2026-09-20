# Validation

Supabase migration checkpoint — verified 2026-09-20. NOT PRODUCTION READY.

Cloudflare Worker/Vinext + Supabase PostgreSQL is the BE1–BE8 local architecture. Authentication is Supabase Auth; authorization is the Meawketting backend. Supabase Storage is private media.

## Local evidence

- PostgreSQL-backed backend suite: 79/79 PASS (66 BE1–BE8, 3 BE2 cache, 2 request-context, 7 Auth/Storage, 1 migration-runner test).
- Production/security suite: 7/7 PASS.
- API smoke: 41 requests across 10 routes PASS, real isolated PostgreSQL and actual API handlers; external providers are simulated.
- Empty-schema migrations: all 3 PASS; repeat execution and checksum rejection PASS.
- Frontend 93/93 PASS in the complete final npm test run; lint, build, whole-repository TypeScript and all BE1–BE8/production typechecks PASS. git diff --check PASS.
- Existing duplicate/retry, stale-revision, tenant/Branch isolation, capacity, payment and webhook assertions were retained. BE1 identity / Business / Branch validation remains part of the combined suite.
- Existing BE1/BE2 contracts still lack client revision/replay fields for some writes; the previously documented stale-form/retry audit remains a separate production blocker. No new claim of universal BE1/BE2 replay safety is made.

Tests start a native PostgreSQL 18.4 process on loopback, create an isolated named database and separate schemas, and use synthetic records only. No SQLite mock or real Supabase credentials are used. Run npm.cmd run test:backend, npm.cmd run test:production, npm.cmd run test:api:smoke. Run npm.cmd run build before npm.cmd run test:frontend. npm.cmd run db:check verifies the migration runner.

## Product and document checks

The existing 34 `page.tsx` route entries and frozen Business design remain the baseline. The explicitly approved 2026-09-20 `/business/register` addition brings the current count to 35; see [registration validation and external setup](./BUSINESS_REGISTRATION.md). Shared Business Intake Engine, customer/guardian separation, execution/payment separation, read-only Reports/CRM and Consumer PAUSED are preserved. Broken relative Markdown links and Stale legacy references are checked during documentation cleanup; older dated audit reports are historical and do not define current database/auth architecture.

## External verification still required

Real Supabase + Cloudflare staging: Google consent/callback, refresh/recovery/logout, live Storage policies and signed expiry, TLS/pooler behavior, runtime role privileges, rate limits, operational backup/restore, load and production acceptance. None has been deployed or verified. See [runbook](./PRODUCTION_RUNBOOK.md).
