# Meawketting

Business-first Pet Business Operating Platform. BF1–BF12 Business UI is frozen. Consumer is PAUSED.

Browser → Cloudflare Worker/API → Application/Domain → D1 Repository → Cloudflare D1 (`DB`).
Direct Google/LINE OAuth and D1 opaque hashed sessions authenticate users; Meawketting authorizes Person/Membership/Business/Branch/target/action.
Private Cloudflare R2 (`MEDIA`) holds media. No browser table access or privileged browser credentials.

Production status — 2026-10-15: commit 18de0d9 was deployed successfully as Worker version 050df786-d4f7-445a-b4c7-1d29d5b4a9c7 (build a1114ee3-38f2-4c02-9334-49b08c0b89b8). The owner confirmed the Supabase source project was deleted and explicitly approved a fresh start on empty D1; source Person/Business preservation and transfer are superseded by that decision. No synthetic accounts or Businesses were inserted. Runtime bindings are native DB/D1, private MEDIA/R2 and API_RATE_LIMITER. Public landing/login/register pages respond 200. Google Login reaches the provider but is blocked by redirect_uri_mismatch until https://meawketting.com/api/auth/google/callback is registered on the existing OAuth client; real sign-in and first-Business creation are not yet verified. LINE Login is explicitly deferred by the owner.

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

Deployment success is distinct from login acceptance. Complete the existing Google OAuth client redirect configuration and verify a real first-user signup before declaring Business use ready. LINE Login remains deferred. The historical 2026-10-13 source counts and local test evidence do not represent migrated production data; the owner approved starting again. This deployment did not commit or push repository changes.
