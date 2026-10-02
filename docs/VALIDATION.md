# Validation

## Business motion and login diagnostics — 2026-10-02

- Added short CSS entrance motion and native page/card transitions for Business login/signup, email confirmation and setup steps. Browser QA observed active native transitions during login → signup, confirmation, and setup step changes. Back navigation preserved shop/contact fields and service selection; new step headings received focus. Reduced-motion and unsupported native APIs use immediate updates.
- Synthetic API browser QA covered confirmation → form recovery and setup movement without creating real accounts or stores. Service selection fit 375/768/1024/1440px without horizontal overflow. The ignored QA proxy was stopped after testing; screenshots are in `work/`.
- Expected unauthenticated `GET /api/business/register` retains 401 and correlation/no-store headers without emitting a failure event. Other auth/write/permission failures keep safe evidence. Static auth log labels are explicit while rate-limit grouping remains unchanged. OAuth start errors expose only allowlisted configuration reasons and preserve signup intent.
- The Vinext beta development timing regression checks that a Worker epoch timestamp becomes a neutral offset while measured compile/render durations remain unchanged. Production timing headers and streaming bodies are preserved.
- Build, whole-project TypeScript (without incremental cache) and lint: PASS. Frontend: 97/97 PASS. Isolated PostgreSQL registration/Supabase/security tests: 28/28 PASS. Production/security was rerun after preserving limiter grouping: 9/9 PASS, included in the targeted test count above.
- Read-only calls using the local configuration confirmed Google/email provider settings and successful authorization redirects to `accounts.google.com` and `access.line.me`. This checks OAuth entry only. No credentials were entered, no real account/Business was created, and final provider login, email delivery and deployment remain untested. Origin/configuration diagnostics are documented in [Business registration](./BUSINESS_REGISTRATION.md).

## Account signup and Business setup — 2026-10-02

Signup/login now share a two-field email/password form with Google/LINE entry. Business details live only in the separate three-step `/business/setup` route. Active existing memberships skip setup; unlinked verified accounts must complete it before operational access. Domain setup still uses the existing atomic, duplicate-safe transaction and receipt.

- `npm run build`: PASS, including the two password API routes and setup page.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false` and `npm run lint`: PASS.
- `npm run test:frontend`: 97/97 PASS. Obsolete auth file references and headline expectations now follow the redesigned shared component; public signup renders only two inputs, and setup omits operational navigation and marketing footer.
- `node scripts/test-postgres.mjs tests/registration.test.ts tests/supabase.test.ts tests/production.test.ts`: 25/25 PASS with isolated PostgreSQL and synthetic provider replies. Covers confirmation-only signup, PKCE, secure cookies, verified email, active/blocked account destinations, CSRF, forged authority, validation, safe provider errors, setup retry/rollback and Branch isolation.
- Browser QA uses an ignored localhost proxy with synthetic auth/API replies; no real account is created. Verified two-field signup, minimum-password feedback, visibility toggle, confirmation focus, wrong-password recovery, first login, direct Home setup guard, Back/selection preservation, service validation, confirmation, failed submit/retry, Home navigation and completed-account setup bypass. Auth and service selection fit 320/375/390/430/768/820/1024/1200/1440px without horizontal overflow. Screenshots/logs are ignored under `work/`.
- `.gitignore` additionally excludes authenticated test snapshots, browser reports and Supabase CLI caches. No schema migration or new dependency is required.

These checks validate local code. Live email delivery, Google/LINE provider accounts and deployment were not exercised; provider configuration is documented in [Business registration](./BUSINESS_REGISTRATION.md). Earlier checkpoints below are historical results.

## Guardian foundation checkpoint — 2026-09-22

Documentation and one type-only Guardian contract file changed. Business/Consumer runtime, schema, tests and workfiledesign were not changed. Initial working tree was clean. Status vocabulary and implementation gaps are in [Guardian foundation](./GUARDIAN_LINE_MINIAPP.md).

| Check | Current result |
|---|---|
| npm run lint | PASS |
| npx tsc --noEmit --pretty false --incremental false | PASS |
| npm run typecheck:be5 / typecheck:production | PASS / PASS; includes Guardian contracts |
| npm run build | PASS after permission retry for Vite temporary-file writes; existing runtime deprecation/classification notices remain |
| npm run test:frontend | **93/94 PASS, 1 FAIL**: existing Business signup headline expectation at tests/rendered-html.test.mjs:74 |
| npm run test:backend | **84/84 PASS**, exit 0; Windows isolated-cluster teardown required permission to complete its normal process termination |
| npm run test:production | **7/7 PASS** |
| git diff --check | PASS |

The frontend test expects `เริ่มต้นพื้นที่ทำงาน`; committed BusinessRegisterScreen.tsx renders `เริ่มต้นร้านในฝัน`. Both mismatch sides were verified in HEAD and neither was edited. No test was weakened and Business UI was not changed to satisfy it. Therefore this checkpoint does **not** claim a fully green suite; earlier passing counts below are dated historical evidence.

No real LINE/Supabase integration, browser/device Mini App QA, deployment or API smoke rerun in this foundation task. There are 36 current page.tsx entries and no new Guardian route. The only code addition is erased TypeScript interfaces/types, so no runtime feature is presented as working.

Supabase migration checkpoint — verified 2026-09-20. NOT PRODUCTION READY.

Cloudflare Worker/Vinext + Supabase PostgreSQL is the BE1–BE8 local architecture. Authentication is Supabase Auth; authorization is the Meawketting backend. Supabase Storage is private media.

## Local evidence

- PostgreSQL-backed backend suite: 84/84 PASS (66 BE1–BE8, 3 BE2 cache, 2 request-context, 7 Auth/Storage, 1 migration-runner, 5 registration tests).
- Production/security suite: 7/7 PASS.
- API smoke: 41 requests across 10 routes PASS, real isolated PostgreSQL and actual API handlers; external providers are simulated.
- Empty-schema migrations: all 4 PASS; repeat execution and checksum rejection PASS.
- Frontend 94/94 PASS; lint, build, whole-repository TypeScript and all BE1–BE8/production typechecks PASS. git diff --check PASS.
- Existing duplicate/retry, stale-revision, tenant/Branch isolation, capacity, payment and webhook assertions were retained. BE1 identity / Business / Branch validation remains part of the combined suite.
- Existing BE1/BE2 contracts still lack client revision/replay fields for some writes; the previously documented stale-form/retry audit remains a separate production blocker. No new claim of universal BE1/BE2 replay safety is made.

Tests start a native PostgreSQL 18.4 process on loopback, create an isolated named database and separate schemas, and use synthetic records only. No SQLite mock or real Supabase credentials are used. Run npm.cmd run test:backend, npm.cmd run test:production, npm.cmd run test:api:smoke. Run npm.cmd run build before npm.cmd run test:frontend. npm.cmd run db:check verifies the migration runner.

## Product and document checks

The existing 34 `page.tsx` route entries and frozen Business design remain the baseline. The explicitly approved 2026-09-20 `/business/register` addition brings the current count to 35; see [registration validation and external setup](./BUSINESS_REGISTRATION.md). Shared Business Intake Engine, customer/guardian separation, execution/payment separation, read-only Reports/CRM and Consumer PAUSED are preserved. Broken relative Markdown links and Stale legacy references are checked during documentation cleanup; older dated audit reports are historical and do not define current database/auth architecture.

## External verification still required

Selected real Supabase + Cloudflare environment: Google consent/callback, refresh/recovery/logout, live Storage policies and signed expiry, TLS/pooler behavior, runtime role privileges, rate limits, operational backup/restore, load and production acceptance. None has been deployed or verified. See [runbook](./PRODUCTION_RUNBOOK.md).
