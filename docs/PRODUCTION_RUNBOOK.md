# Cloudflare D1 forward-only production runbook

The working tree uses Cloudflare Worker/Vinext → `env.DB` → D1 only. Authentication is direct Google/LINE OAuth with hashed opaque D1 sessions. Email/password was removed by the owner. No PostgreSQL fallback, dual-write, rollback adapter or manual data backup exists.

Production D1 `meawketting-production` was created in the existing account through Dashboard with Asia Pacific location hint. Its real ID is configured in `wrangler.d1.json`: `3e920509-817c-4d36-9243-7ad0afe4a874`. The reviewed schema was applied through the Dashboard on 2026-10-13 and verified remotely: 70 domain tables, all STRICT; 133 explicit indexes; 81 triggers; one view; zero foreign-key orphans. The Wrangler migration ledger records `0001_initial.sql` once. Production source records have not been transferred and the Worker has not been deployed. No commit, push or Worker deployment is authorized by this runbook.

Remote Persons, Bookings and Payments are still empty. Read-only source inspection found 37 application rows containing real identity, Business/Branch authority, service configuration and audit history; the reviewed transformation produces 38 D1 rows, including Google and LINE identities. Source Customer, Booking, Payment and media rows are zero. Preserve the existing authority/configuration records during cutover.

## Local verification

Use Node 22.13+ and `npm ci`. Run `npm run test:backend`, `npm run test:production`, `npm run test:api:smoke`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, then `npm run test:frontend`. Run build and rendered HTML serially because both use `dist/`. SQL tests execute native SQLite, including real constraints and atomic transactions; they do not simulate PostgreSQL semantics. Wrangler/Miniflare platform checks must also pass before cutover.

`npm run db:migrate` applies only local D1 migrations. `npm run db:seed:test` seeds only local D1 with synthetic fixtures; never import test seeds into the production database. Reviewed `migrations/d1/*.sql` is the schema source of truth. Drizzle generates review drafts in `migrations/generated`; those drafts do not contain the full guard/UTC checks and must not be applied as authoritative migrations.

## Runtime configuration

- Binding `DB`: the actual production D1 above; runtime uses native binding methods, never public REST.
- `MEAWKETTING_AUTH_MODE=session`, `MEAWKETTING_ENV=production`, `MEAWKETTING_FIXTURE_MODE=off`, `MEAWKETTING_PUBLIC_ORIGIN=https://meawketting.com`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LINE_LOGIN_CHANNEL_ID`, `LINE_LOGIN_CHANNEL_SECRET`: server secrets, configured by the owner. Keep `MEAWKETTING_LINE_CREDENTIALS` for Messaging API channels and existing payment-provider credentials if applicable.
- `API_RATE_LIMITER`: existing production rate-limit binding. Keep current image/assets bindings.
- Private object storage code uses `MEDIA`. R2 subscription was explicitly declined on 2026-10-13; `meawketting-private-media` has **not** been created. Desired binding remains in configuration pending provisioning. Do not deploy with a nonexistent bucket. Current source media rows are zero; media API fails closed if the binding is unavailable. Enabling paid R2 requires a separate owner approval.

See [OAuth/session/media configuration](./D1-AUTH-MEDIA.md) for exact callbacks and private object rules. Google and LINE both return to the fixed `/api/auth/google/callback` route; state identifies the verified provider. All existing Person/provider-subject links must migrate before real sign-in. Never infer linkage from email. Login issues new sessions; previous provider sessions are not transferred.

Old relational runtime passwords, Hyperdrive binding, Supabase DB/Auth/Storage keys have no application callers. Operator-only source connection has been moved out of `.dev.vars` into ignored `.env.d1-transfer`; it must never be bound into a Worker or committed. A PostgreSQL source reader may exist only in the one-time transfer tool until the source has been verified and the tool removed.

## Cutover gate and sequence

1. Finish local correctness, build, lint, typechecks and rendering checks. Resolve any failure forward in D1.
2. Confirm the already applied remote schema still matches the reviewed migration and the `0001_initial.sql` ledger entry. Recheck table/trigger/index inventory and `PRAGMA foreign_key_check`; no synthetic seeds. Add any later schema correction as a forward migration.
3. Obtain explicit deployment authorization and agree a maintenance window. Freeze production writes and provider/outbox processing for the whole transfer; do not freeze a live app indefinitely while deployment remains unauthorized.
4. Stream the frozen source into D1 in foreign-key order, preserving IDs, revisions, event sequence, receipts, audit, provider linkage and LINE dedup/outbox state. Convert only baht-valued estimates/additional price to integer satang; preserve existing `*_minor` and API JSON prices. No full dump or permanent transfer/backup file.
5. Verify every table count/hash and foreign-key orphans; check financial totals by Business/Branch, bookings/reservations, customers/pets and LINE protection state. Source has real authority/configuration data even though it has no customer/payment rows. Do not infer an empty source from old historical documentation.
6. Configure direct OAuth and required bindings, then deploy only after explicit owner instruction. Runtime is D1 only. Verify Google/LINE, Owner/Manager/Staff grants, Home, CRM, booking, operations, QR, Inbox, billing and reports on production.
7. Open writes to D1 after smoke passes. If a failure occurs, keep maintenance and fix D1 forward. Do not switch relational datasource back.
8. Delete one-time source tools/operator credentials/transfer artifacts after successful invariant verification and cutover. Keep the final migration report, migrations, tests and useful evidence.

Wrangler's connected token currently lacks `d1:write`. Browser Dashboard was used to create D1 and apply/verify its schema as the owner requested. Creating persistent API credentials requires a separate action-time confirmation; none have been created. Source transfer, OAuth/environment configuration and production provider verification remain pending until the cutover gates are met. See the [one-time operator transfer instructions](../scripts/d1-transfer.md) for safe source inspection and the deliberate transfer prerequisites.

## Performance and external retirement

`Server-Timing` reports API wall duration, native binding elapsed duration, submitted statements, batch calls, metadata coverage and available read/write row counts. Pair response diagnostics with the operation name and HTTP status in request traces; never capture raw tokens or request bodies. `d1-reported` is the sum of metadata available from `all/run/batch`; native `first()` has no metadata. These are distinct measurements. Local probes do not prove production latency. Read replication is not enabled; primary reads retain immediate write visibility.

After successful D1 cutover and provider verification, the owner can manually retire the former Supabase project/database, its old secrets and Hyperdrive configuration. Do not delete these external resources before the source data and provider subjects have been verified. Do not create restore or rollback implementation.
