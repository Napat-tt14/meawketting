# One-time forward transfer

`d1-transfer.mjs` is an operator tool while production cutover is pending. It is never part of the Worker. Remove it, its tests, the PostgreSQL development dependency, the source CA certificate and the ignored operator environment after a successful transfer and production validation.

Source inspection is read-only and requires no write freeze or Cloudflare token:

```powershell
$env:D1_SOURCE_CA_FILE = "F:\Meawketting\scripts\certs\supabase-prod-ca-2021.crt"
node --env-file=.env.d1-transfer scripts/d1-transfer.mjs --inspect-source
```

The ignored operator environment contains `D1_SOURCE_URL`. `D1_SOURCE_SCHEMA` defaults to `public`. TLS certificate verification remains enabled. Inspection returns only per-table counts, and imports neither customer rows nor credential values into files.

Run an actual transfer only during the deliberate cutover window after all local tests pass, the remote D1 schema has been applied, the source app has an active write freeze, and deployment has been authorized. Supply `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` with D1 write access, and `D1_DATABASE_ID` matching the actual Wrangler database. Then attest the prerequisites:

```powershell
$env:D1_TESTS_PASSED_CONFIRMED = "yes"
$env:D1_WRITE_FREEZE_CONFIRMED = "yes"
node --env-file=.env.d1-transfer scripts/d1-transfer.mjs
```

The tool streams a repeatable-read source snapshot through bounded D1 batches. It preserves stable IDs, sequences, revision and request/receipt keys; converts whole-baht estimates to integer satang; and normalizes instant timestamps to UTC. It maps verified Google and `custom:line` subjects using provider identities and existing Person links. It never grants authority from an email match. Email-only historical Person and registration receipts remain intact with a nullable provider identity.

Historical rows can have terminal states that creation-time triggers intentionally reject. During this undeployed, frozen target import, the tool temporarily suspends those triggers while retaining strict types, checks and foreign keys, then restores every trigger in `finally`. A partial transfer can resume only when its source/schema hash matches the existing `d1_transfer_progress` marker. Failures require a forward fix while maintenance remains active.

Verification compares every transformed table's row count and SHA-256 content hash, checks zero foreign-key orphans, and compares scoped customer/pet, booking/reservation/hotel, financial totals/outstanding amounts and LINE state aggregates. It leaves a `verified` marker for the operator. Remove that temporary marker after production validation; do not remove the source or source credentials before verification.

Source media count is currently zero. If this changes, transfer refuses without a private R2 bucket and the one-time `D1_SOURCE_STORAGE_URL`, `D1_SOURCE_STORAGE_KEY`, and `D1_R2_BUCKET` configuration. Media bytes stream directly to R2 and are checked by size and content hash. No local media file or database dump is written. R2 has not been provisioned because the user declined its subscription.
