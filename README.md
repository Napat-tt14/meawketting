# Meawketting

Business-first Pet Business Operating Platform. BF1–BF12 Business UI is frozen. Consumer is PAUSED.

Browser → Cloudflare Worker/API → Application/Domain → PostgreSQL Repository → Supabase PostgreSQL.
Supabase Auth authenticates Google users; Meawketting authorizes Person/Membership/Business/Branch/target/action.
Supabase Storage holds private media. No browser table access or privileged browser credentials.

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

Backend tests automatically start isolated native PostgreSQL and use synthetic records. For persistent local development, set DATABASE_URL to a dedicated PostgreSQL 16+ test database, run npm.cmd run db:migrate, then set MEAWKETTING_ENV=test and run npm.cmd run db:seed:test. Supply local Worker bindings in ignored .dev.vars and run npm.cmd run dev. Local dev-test identity is explicit and rejected by the production build. Real Google testing requires HTTPS and configured Supabase Auth.

Read [canonical docs](./docs/README.md), [architecture](./docs/ARCHITECTURE.md), [validation](./docs/VALIDATION.md) and [setup runbook](./docs/PRODUCTION_RUNBOOK.md). Migration SQL lives in supabase/migrations; Drizzle schema describes domain tables, while reviewed migrations also own native triggers, RLS and grants.

## Preserved boundaries

Customer ≠ Guardian; LINE identity ≠ Pet authority; Business never owns Pet Passport; Booking ≠ execution; Charge ≠ Payment; completed ≠ paid. Reports/CRM remain derived/read-only. Branch authorization stays server-side. Business UX/UI and LINE Seed Sans TH remain unchanged; /workfiledesign is untouched.

IMPLEMENTED and TESTED LOCALLY does not mean Production Ready. Supabase/Cloudflare staging configuration, real provider tests, recovery, privileges and operational acceptance are EXTERNAL CONFIG REQUIRED and NOT YET DEPLOYED. The existing BE1/BE2 stale-form/retry contract follow-up remains documented. No production deploy, payment-provider selection, Consumer revival, commit or push was performed.
