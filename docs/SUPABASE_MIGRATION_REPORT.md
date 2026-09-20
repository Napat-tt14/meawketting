# Supabase migration report — verified 2026-09-20

## 1. Final status

Code migration IMPLEMENTED; PostgreSQL-backed checks TESTED LOCALLY; real Supabase/Cloudflare configuration EXTERNAL CONFIG REQUIRED; NOT YET DEPLOYED. NOT PRODUCTION READY.

## 2. What migrated

Cloudflare remains the frontend/API/Worker host. Business API handlers use PostgreSQL repositories through existing application/domain authorization. Supabase PostgreSQL is the only active Business database; there is no fallback. Business UX/UI, domain boundaries and LINE Seed Sans TH are preserved. Consumer remains PAUSED; three existing Consumer/shared-file TypeScript issues received annotation-only corrections with no runtime/UI changes. /workfiledesign was not edited.

## 3. Schema and migrations

Three clean PostgreSQL migrations apply from an empty database. The domain baseline contains 65 tables, 118 explicit indexes, 161 foreign keys, 76 triggers and one view. Auth/media add two tables; the migration runner maintains a separate checksum ledger. IDs and domain history remain stable. Explicit identity sequences preserve event order. Native SQL replaces SQLite functions and connection-local row-count assumptions. Transactions use SERIALIZABLE isolation with bounded whole-transaction retry; existing revision and idempotency contracts remain intact.

Empty migration, repeat application, applied-checksum rejection and RLS denial to a non-bypass read role pass. Only synthetic records were used. No production data transfer is required.

## 4. Supabase Auth

Google PKCE, secure HttpOnly host-only cookies, server getUser verification, callback, explicit UUID-to-Person linkage and logout are implemented. Duplicate cookie names fail closed before parsing/network access. Auth clients are request-scoped. Verified identity does not confer authority: active Person → Membership → Business → Branch → target/action checks still execute server-side. Unmapped/inactive users are denied; arbitrary Google accounts cannot create Owners. Recovery/account relinking is provider/operator based and must preserve the stable Person mapping.

## 5. Supabase Storage

Private business-media bucket setup and authorized upload/read APIs support Business logos, Pet photos, Grooming before/after and Hotel/Daycare. Opaque paths, 10 MiB limit, JPEG/PNG/WebP MIME/signature checks, scoped PostgreSQL metadata, non-overwriting uploads and 60-second authorized signed reads are implemented. Database failure attempts Storage cleanup and is tested. No image bytes live in PostgreSQL and no media UI was added. Full image decoding/transcoding and live bucket policy verification are not claimed.

## 6. BE1–BE8 parity

All 66 existing domain tests pass on native PostgreSQL. Coverage retains tenant/Branch denial, Booking/capacity conflicts, duplicate retries, stale revisions, execution/Consent/Inbox/payment correctness, webhook deduplication and read-only Reports/CRM. Three BE2 cache tests also pass.

The pre-existing BE1/BE2 stale-form/retry issue documented in the cleanliness audit remains: some request contracts lack client revisions/replay keys. This migration preserves those contracts and does not claim to resolve that broader production blocker. Customer ≠ Guardian; LINE identity ≠ Pet authority; Business never owns Pet Passport; Booking ≠ execution; Charge ≠ Payment; completed ≠ paid.

## 7. Removed legacy implementation

Removed seven D1 repositories, custom Google/session implementation, D1 bindings/configuration, SQLite test helpers/checkers/restore tooling, old seed scripts, 16 SQLite migrations and their Drizzle snapshots. Replaced obsolete deployment instructions; historical decisions/audit evidence are explicitly superseded or retained in Git. No competing persistence implementation remains active.

## 8. Validation

| Check | Result |
|---|---|
| PostgreSQL backend suite | 79/79 PASS: 66 domain + 3 cache + 2 runtime + 7 Auth/Storage + 1 migration |
| Production/security | 7/7 PASS |
| API smoke | 41 requests across 10 routes PASS; one test file |
| Three empty-database migrations | PASS; repeat/checksum/RLS assertions PASS |
| Frontend | 93/93 PASS in the complete final npm test run; assertions and timeouts unchanged |
| Whole-repo TypeScript + BE1–BE8/production scopes | PASS |
| Lint / build / git diff --check | PASS |

Tests use native PostgreSQL 18.4 in an isolated database/schema. Supabase HTTP responses are mocked locally; real provider/Cloudflare staging behavior is not asserted. Native test-server cleanup required permission outside the desktop sandbox; completed test servers were identified by their task-owned work/pg-* paths. No unrelated database was stopped.

The final npm test command passed build and all four suites (180 tests total). A Vite module-load timeout was resolved by disabling unnecessary immutable-fixture watchers that crawled generated PostgreSQL directories; local development ignores work/tmp. No assertions were removed, relaxed or skipped. Relative Markdown links were checked: zero broken links.

## 9. External setup

Create a separate Supabase staging project, configure Google in Supabase Auth, exact callback/site URLs, private bucket, Cloudflare staging origin/rate binding and server Secrets: DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY. Google secret stays in Supabase provider settings. Use the operator auth:link command only for a verified user and explicitly provisioned active Person/membership; never turn synthetic Owners into production onboarding.

Runtime DB privileges require staging review. An optional script proposing broad role grants was rejected by automatic approval review and was not created or executed. No database grants were expanded remotely. Follow the [runbook](./PRODUCTION_RUNBOOK.md); Product Owner does not need to edit source code.

## 10. Files changed

See [complete changed-file inventory](./SUPABASE_MIGRATION_FILES.md). Changes cover repositories/runtime/routes, PostgreSQL schema/migrations/seeds, Auth/Storage, test/CLI/configuration, canonical docs and annotation-only legacy type fixes.

## 11. Exact next action

Configure separate Supabase + Cloudflare staging using the runbook and test real Google/session/Storage/pooler behavior and operational privileges. Close the documented BE1/BE2 stale-form/retry follow-up before production acceptance. No production deploy, commit or push was performed or authorized.
