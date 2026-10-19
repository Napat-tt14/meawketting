# Validation

## OAuth hotfix — 2026-10-19

Fixed Workers-incompatible OAuth `redirect: "error"` in token/verification and Google JWKS requests, retaining redirect rejection through `manual` plus non-2xx checks. The 16 targeted auth, native Workers and registration tests pass, including new native Google/LINE callback/session and redirect rejection coverage and safe provider-error logging. BE1/production typechecks, targeted ESLint and the production build passed. Dashboard active hotfix version `c05f2868-e6f9-44ac-bc31-1608dfeeed26` reaches Google token exchange; Google now returns HTTP 401 `invalid_client`, requiring the owner to correct the matching client secret. Real session/first-Business acceptance remains pending. Source changes remain local and must be included in the next Git build. Evidence: `work/oauth-fix-2026-10-19.md`, `work/google-invalid-client-2026-10-19.png`.

## Forward-only D1 migration — 2026-10-13

Cloudflare Worker/Vinext + D1 is the BE1–BE8 local architecture. Direct Google/LINE OAuth authenticates into D1 identities and hashed opaque sessions. Private R2 media uses authenticated Worker reads. The user approved removal of email/password auth; the prior Supabase runtime, PostgreSQL migrations and Hyperdrive database path are retired.

Confirmed local checkpoints from this migration:

- BE1–BE8 native SQLite suites: 76 passing tests, including the added booking/capacity race coverage.
- D1 migration/schema checks: 7 passing tests.
- Direct OAuth/session/R2 and Business registration: 14 passing tests, zero skipped. These verify real generated-key RSA signatures with synthetic provider transport, bad issuer/audience/expiry/nonce/signature, one-use state, session rotation/logout/revocation, identity uniqueness, tenant/Branch media denial, MIME/size/CSRF checks, R2 compensation and registration atomicity/retries.
- Auth-related ESLint: pass. Broader validation results and any subsequently added tests are recorded in `work/d1-migration-2026-10-13.md`; do not use earlier historical counts as evidence for current code.

Tests use native SQLite and the D1 adapter, not mocked PostgreSQL transactions. The schema is applied to an empty local database and fixtures use SQLite semantics. External OAuth, LINE transport and payment providers are simulated. LOCAL timings are not production latency measurements.

```powershell
npm.cmd run test:backend
npm.cmd run test:production
npm.cmd run test:api:smoke
npm.cmd run db:check
npm.cmd run typecheck:production
npm.cmd run lint
npm.cmd run build
npm.cmd run test:frontend
git diff --check
```

BE1 identity / Business / Branch validation, existing receipts/replay/revisions, service execution/payment separation, Shared Business Intake Engine, read-only Reports/CRM, scoped loading, targeted cache invalidation and Consumer PAUSED remain required checks. Existing BE1/BE2 contracts still lack revision/replay keys on every edit; migration does not claim universal stale-form protection.

## Remote and production limits

The owner enabled R2 on 2026-10-15; private Standard bucket `meawketting-private-media` was created in Asia Pacific with Public Access disabled. R2 media tests use a local synthetic binding; they do not establish deployed Worker upload/read acceptance. Source media rows were zero at the migration inspection. The APAC production D1 schema was applied and verified through the Dashboard on 2026-10-13: 70 STRICT domain tables, 133 explicit indexes, 81 triggers, one view and zero foreign-key orphans. The Wrangler ledger records `0001_initial.sql` once. Remote Persons, Bookings and Payments remain empty because source data has not been transferred.

Read-only source inspection found 37 application rows containing real Person/Business/Branch authority, configuration and audit data; the reviewed transformation produces 38 D1 rows including Google/LINE identities. Source Customer, Booking and Payment rows are zero. The available Wrangler credential still lacks `d1:write`; source transfer and its target invariant verification remain pending. OAuth/environment setup, remote performance runs, real Google/LINE consent/callback/logout, production payment/provider callbacks and deployed API walkthroughs have not completed. No commit, push or deploy was performed. Fix forward in D1; no PostgreSQL fallback, dual write, backup/export or restore implementation is permitted. D1 platform Time Travel is separate from application logic.

Use the [runbook](./PRODUCTION_RUNBOOK.md), [auth/media setup](./D1-AUTH-MEDIA.md) and [target acceptance](./PILOT_QA.md) for remaining configuration and acceptance. A passing local test does not establish Production Ready.

## Historical UI and domain evidence

The 2026-10-12 setup/navigation checkpoint verified route-specific loading, warm cache reuse, API deadlines, guidance and responsive/reduced-motion behavior with synthetic browser APIs. Its 97 rendered checks and earlier PostgreSQL suite counts are historical; rerun the current commands after D1 changes.

The earlier 34 `page.tsx` route entries were a dated baseline. `/business/register` and `/business/setup` brought the documented route count to 36; [ROUTES](./ROUTES.md) remains the route contract. Broken relative Markdown links and Stale legacy references are checked during documentation cleanup. Meaningful Product decisions and Guardian policy gaps remain documented; historical Supabase setup commands do not define active architecture.


## Production update — 2026-10-15

Actual deployment completed for commit 18de0d9, version 050df786-d4f7-445a-b4c7-1d29d5b4a9c7. Read-only production HTTP checks: /, /business/login and /business/register returned 200; unauthenticated /api/business/register returned 401; GET /api/be1 returned 405 because that route requires POST. Browser Google start reached the provider and exposed redirect_uri_mismatch. Google Cloud project listing then reported Error while loading resources, so provider configuration was handed to the owner with the exact callback. No successful real login, Business registration, payment or media upload is claimed. Evidence: work/d1-production-smoke-2026-10-15.json and work/d1-deploy-success-2026-10-15.png.
