# Meawketting

Business-first Pet Business Operating Platform. BF1–BF12 Business UI is frozen. Consumer is PAUSED.

Browser → Cloudflare Worker/API → Application/Domain → D1 Repository → Cloudflare D1 (`DB`).
Direct Google/LINE OAuth and D1 opaque hashed sessions authenticate users; Meawketting authorizes Person/Membership/Business/Branch/target/action.
Private Cloudflare R2 (`MEDIA`) holds media. No browser table access or privileged browser credentials.

R2 media is implemented in code only: the user declined its subscription setup and no bucket exists. The production APAC D1 database has been created and its schema applied/verified through the Dashboard: 70 STRICT domain tables, 133 indexes, 81 triggers and one view, with zero foreign-key orphans. Production data transfer, OAuth/environment setup and deployed acceptance remain pending.

## Run and validate locally

```powershell
npm.cmd ci
npm.cmd run test:backend
npm.cmd run test:production
npm.cmd run test:api:smoke
npm.cmd run lint
npm.cmd run typecheck:production
npm.cmd run build
npm.cmd run test:frontend
```

Backend tests use isolated native SQLite with the D1 adapter and synthetic records. Local Worker development uses Wrangler's local D1 binding and `migrations/d1`; run `npm.cmd run db:migrate`, optionally `npm.cmd run db:seed:test` for an explicit test environment, then `npm.cmd run dev`. Keep local provider values in ignored `.dev.vars`. The dev-test identity is explicit and rejected in production. Real Google/LINE testing requires configured direct-provider callbacks; see [auth/media setup](./docs/D1-AUTH-MEDIA.md).

Read [canonical docs](./docs/README.md), [architecture](./docs/ARCHITECTURE.md), [validation](./docs/VALIDATION.md) and [setup runbook](./docs/PRODUCTION_RUNBOOK.md). `migrations/d1` is the executable schema source of truth; Drizzle describes SQLite domain tables, while the migration includes native constraints and guards. Migration is forward-only, with no database fallback, dual writes, manual backup/export or PostgreSQL restore path.

## Preserved boundaries

Customer ≠ Guardian; LINE identity ≠ Pet authority; Business never owns Pet Passport; Booking ≠ execution; Charge ≠ Payment; completed ≠ paid. Reports/CRM remain derived/read-only. Branch authorization stays server-side. Business UX/UI and LINE Seed Sans TH remain unchanged; /workfiledesign is untouched.

IMPLEMENTED and TESTED LOCALLY does not mean Production Ready. The real production D1 database and migration `0001_initial.sql` are applied and verified through the Cloudflare dashboard. The available Wrangler credential still lacks D1 write permission. Real source authority/configuration records have not been transferred; OAuth/environment configuration, Google/LINE consent/callback tests, remote latency and operational acceptance remain pending. R2 remains unprovisioned and source media rows are zero. Existing BE1/BE2 stale-form/retry contract limits remain documented. No commit, push or deployment is authorized by this work.
