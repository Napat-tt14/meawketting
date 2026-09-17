# Production operations and acceptance runbook

Status: **PREPARED / NOT DEPLOYED** — 2026-09-12. Read [the production report](./PRODUCTION_TRACK_REPORT.md) for measured results. This runbook does not authorize remote migration, data restore or deployment.

## Environment and architecture

Frontend → Application → Repository → Persistence remains the boundary. Use one Worker plus static assets and one D1 per environment. Local uses the placeholder DB only with `--local`; tests create disposable SQLite/D1-compatible databases and explicitly opt into fixtures. Staging and production each need different Worker names, D1 IDs, rate namespaces, origins, auth client IDs and secrets. Never copy real data into test fixtures.

`wrangler.pilot.example.json` is a **non-deployable preparation template**, not the Vite build configuration. It points at built `dist/server/index.js` and `dist/client`, uses the actual generated compatibility date, and packages migrations from `drizzle`. Before remote use, reconcile it with the generated `dist/server/wrangler.json`, replace placeholders, use a distinct rate namespace, bind a real origin and validate the complete asset/SSR routing in staging. Do not deploy the generated default: it contains a placeholder DB. No auth adapter is wired; changing an auth-mode string cannot enable login.

Required: Worker/static assets, D1, server Secrets for the selected auth integration, TLS/domain or explicitly controlled staging hostname, rate binding, error visibility, operator access with MFA. Optional: Cron **only when LINE is connected**, private R2 **only when pilot media is approved**, Turnstile for a future public auth/onboarding abuse surface. Not needed now: Queues, Durable Objects, KV, separate microservices, enterprise monitoring, Postgres migration. Current public images are static assets; R2 is not necessary for them. The image optimizer requires the IMAGES binding if used; current explicit unoptimized landing art does not justify adding a paid image service. Verify every actual image path before launch; add IMAGES or bypass optimization safely if a requested path needs it.

Rate binding is initial coarse unauthenticated ingress protection: 300 requests/minute per route group and trusted Cloudflare source IP. Shared shop/NAT users can share a bucket; tune against actual polling and two-operator use. Before enabling auth, add tighter **verified Person/action** limits for auth, token validation, finance and expensive reports; never key by a browser-supplied Person ID. Auth callback and recovery endpoints must include their own abuse protection. This is not a precise quota or financial control: Cloudflare counters are local to a location and eventually consistent. Missing binding or test authority in an explicitly remote environment fails closed. [Cloudflare rate binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

Do not store credentials in vars, browser code, SQL seeds, config examples or logs. `.env*` and `.dev.vars*` are ignored. Use secret references tied to each Business/OA. Build pins fixture mode off and rejects dev identity in production. Startup contains no seed invocation. Only local seed scripts may populate synthetic data. Before first pilot query counts and verify no `business-whisker-rest`, `business-paw-partner` or dev-test authority exists remotely.

## Authentication integration requirements

**PROVIDER-NEUTRAL:** `session.ts` provides 256-bit opaque tokens, hashed lookup, explicit expiry/revocation and secure host-only cookie helpers. It is deliberately not selected by the HTTP routes; production login remains **NOT IMPLEMENTED**. A future verified callback must use issuer/subject mapping, issuer/audience/signature/expiry validation, single-use state and nonce, PKCE, exact redirect origins and no email-only account linking. Google/LINE identities may link only with fresh proof from both sides. They confer no Pet authority.

Choose a provider first; implement a strongly consistent session repository and callback, then inject the verified adapter into **all** BE routes. Create a fresh token after authentication and privilege change; revoke old sessions atomically, never reuse a supplied token. Enforce absolute and idle expiry server-side and align cookie lifetime. Logout must invalidate the stored hash before clearing the cookie; a repository error must not be reported as successful invalidation. Recovery revokes all sessions and provider refresh tokens; do not log tokens. Existing Person/membership/Business/Branch/action checks continue on every operation after session resolution. No roles or tenant grants in cookies.

Invitations: an authorized Owner requests an expiring single-use hashed invitation scoped to Business, role and Branch grants; the verified intended recipient accepts it transactionally. Do not let arbitrary first login create an Owner. Provide operator-reviewed first Owner onboarding. Recovery belongs to the selected provider; account linking/recovery must not alter Customer or Guardian/Pet authority. An initial staff pilot requires real invitation and recovery flows, not seed editing.

Current JSON commands enforce exact same Origin when present, reject cross-site Fetch Metadata and reject cookie-bearing mutations without Origin. No permissive CORS responses. Webhooks use raw-body signatures instead of CSRF tokens. Future auth callback GETs need state/nonce validation separately; cookie SameSite does not replace that. Session fixation, recovery, login UX and end-to-end logout still require integration tests after provider selection.

## Migrations and backup

1. Engineer records source revision, artifact checksum, target account/DB IDs and migration ledger. Verify staging and production IDs differ. Run baseline suites, schema checks and local restore drill.
2. Rehearse the exact ordered `drizzle/0000…0014` migration set against staging with representative synthetic data. Compare `sqlite_schema`, `PRAGMA foreign_key_check`, `PRAGMA quick_check`, expected indexes and migration ledger. Do not modify historical migration SQL already applied remotely.
3. Before a risky change: stop application writes and outbox/payment dispatch; export the current DB to restricted storage, record checksum/size and capture a Time Travel bookmark. Confirm a tested restore path. Never automatically seed after migration.
4. Apply one reviewed forward migration set with the named environment. For operator reference: `npx wrangler d1 migrations list DB --remote --config <reviewed-config>` then `npx wrangler d1 migrations apply DB --remote --config <reviewed-config>`. These are **not executed in this run**. Never use `--local` evidence to claim remote success.
5. Check ledger, integrity, schema, key tenant counts, representative reads and mutations. If migration fails, hold writes, inspect ledger and schema before retry; do not assume a multi-file command rolled back all previously successful files. Prefer a forward fix. No automatic destructive down migration.

D1 Time Travel is automatic; documented history is 7 days Free / 30 days Paid. It is recovery history, not an application/legal retention policy. Verify the account plan and bookmark availability at onboarding. A restore overwrites the DB in place and cancels in-flight work. Capture the pre-restore bookmark and preserve an export before acting. [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).

Export reference: `npx wrangler d1 export DB --remote --output <restricted-backup.sql> --config <reviewed-config>`. Store credentials separately; record checksum and access owner. Staging restore: import a sanitized export into a **different disposable staging DB**, then check schema, row counts/content hashes, foreign keys and workflows. Production in-place Time Travel restore requires explicit incident approval of the affected time window; `d1 time-travel info` and `d1 time-travel restore --bookmark <recorded-bookmark>` must name the verified database. Never blindly copy an example bookmark. Record the undo bookmark.

Local reproducible drill: `npm run db:restore:drill`. It creates its own temp database, applies all migrations and synthetic seeds, takes a SQLite backup, corrupts only the disposable source, opens the backup, compares every table's content hash/count, and proves transaction rollback. It preserves evidence in the printed temp directory. **SIMULATED:** this is not a Cloudflare Time Travel drill, remote export rehearsal or measured recovery-time promise.

Application rollback: restore the prior reviewed Worker artifact only if it is compatible with the current schema. Database rollback is a separate operation. After any data restore, hold message/payment dispatch: compare external delivery and settlement ledgers from the lost time window before replay. A provider may already have accepted a message or money even if restored D1 no longer records it. Reconcile manually; never collect or send blindly.

Technical starting objective for PO approval: daily checked recovery evidence; recovery point within 15 minutes and recovery within 2 hours for the small pilot. These are proposed objectives, **not achieved guarantees**. Legal retention, deletion/export rights and backup retention remain decisions. A named engineer owns restore execution; PO verifies shop records and approves reopening.

## D1 pilot acceptance and exit gate

Proposed synthetic envelope pending store-count confirmation: 3 Businesses × 2 Branches, 2 concurrent operators per Branch, 1,000 Customers per Business, 10,000 historical Bookings per Business; 30 minutes at normal 1 command/second overall, bursts of 12 simultaneous mutations. Warm-up 5 minutes; include at least 100 collision pairs. Do not compare local SQLite wall time with production D1 latency.

Run through the authenticated staging APIs with authorized test accounts and recorded request keys. Measure client total and server/D1 duration, p50/p95/p99, successful/expected-conflict/unexpected-error counts, retry attempts and before/after row/page counts. Store only IDs of synthetic records and aggregate evidence. Capture region, artifact hash, account plan and load generator version.

| Scenario | Correctness acceptance |
|---|---|
| Booking/resource/staff collision, same time and final capacity unit | Exactly one success and one conflict for each incompatible pair; no overlap rows |
| Hotel multi-day / Daycare capacity | Never exceed capacity; cancelled/shortened reservations release only intended slots |
| Grooming, care log and completion | Revision conflicts return current truth; one source Service Record; completion never pays |
| Consent/Intake | Expired/revoked/non-Temporary QR always rejected; repeat check-in creates one Intake/execution |
| Inbox | One message/outbox per idempotency key; one normalized event per provider event ID; disconnect visible |
| Financial mutation/refund | Exactly one allocation/refund; stale competing payment conflicts; totals reconcile |
| Reports/CRM and multi-Branch | Read-only derived sums match canonical fixtures; forbidden Branch/Business never leaks |

Thresholds: **zero** isolation breaches, double bookings, duplicate financial effect or false success after failure. Initial performance target p95 reads <1 second, writes <1.5 seconds, p99 <3 seconds; unexpected failures <0.1% excluding deliberate conflicts and injected faults. Retry at most twice for transient failures with the **same** key; version conflicts require reload/review. Hold launch on any correctness failure, repeated timeout, growing stuck work or unreconciled amount. These latency targets remain **NOT MEASURED IN STAGING**.

Run `scripts/production-operations.sql` for aggregate backlog and DB page growth; record rows read/written and D1 metrics as well. D1 exit review only after query/index/batch tuning fails: repeated peak-window p95 misses, unacceptable serialized-write contention, projected DB size >70% of the actual account DB limit within six months, or operational effort that defeats pilot cost goals. The currently documented per-DB maxima differ by plan (500 MB Free, 10 GB Paid); verify before provisioning. No migration is justified by local tests alone. [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

## Providers and media

LINE: each Business owns its OA. Provision a Messaging API channel, verify external account/destination, store its secret/access token in the Business-bound secret reference, configure HTTPS webhook, verify raw-body signature with test redelivery, then create verified Customer channel links with explicit proof. Unknown contacts remain unknown. Test disconnect/reconnect, revoked credential, quota exhaustion, duplicate delivery and ambiguous timeout. Existing outbox leases/backoff keep retry keys stable and stop uncertain old delivery for reconciliation. Enable a bounded Cron only after this is proven. Show blocked/failed deliveries to the operator. Never infer Guardian/Pet authority from LINE. Provider 4xx are terminal by default; review quota/rate failures and deliberately retry only under documented provider semantics. [LINE retry guidance](https://developers.line.biz/en/docs/messaging-api/retrying-api-request/).

Payments: manual cash/bank-transfer records are a possible pilot path, not proof of bank settlement. Provider attempts, signature interface, dedup ledger and reconciliation are implemented provider-neutrally; no real public gateway callback/account exists. Before adding one verify signatures/timestamps according to that provider, merchant/amount/currency/reference binding, redelivery and late-success reconciliation; independently test refund settlement. Select provider and accounting/refund policy explicitly. Do not call an internal Charge or record a legal invoice.

R2: deferred by default. If real media is required, authorize upload/read against Business/Pet scope, generate opaque object keys server-side, keep bucket private, limit bytes and decoded dimensions, validate magic bytes and allowed types, return short-lived authorized reads, record ownership/retention metadata and delete objects through an audited process. Store no binary in D1. Local previews/public PNG optimization are not this architecture.

## Visibility and incidents

Worker logs emit only route category, status, generated request ID, bounded correlation ID and duration. No request URL/query, object IDs, IP, headers, payloads or exception messages. Built-in invocation logs are disabled in the template because they may retain full URLs; inspect platform logs separately before enabling them. Business headers implement frame/base/object restrictions, nosniff, referrer policy and camera self permission. Full script CSP with nonces is **not implemented**; do not introduce unsafe inline exceptions as a claim of XSS protection.

Engineer checks Worker availability, 5xx and D1 metrics at open/close, and runs aggregate operations SQL while LINE/payments are enabled. Initial action thresholds: two failed availability checks one minute apart, >1% unexpected 5xx for 5 minutes, any reconciliation item, expired lease/backlog >5 minutes or failed migration/restore. Route authentication 501/503 means **unconfigured**, never healthy. Configure actual notification delivery and test receipt before pilot; no alert service/account was connected here. Successful requests do not create application logs; limiter denials and unexpected failures are visible. Under attack, platform sampling/retention must bound cost.

| Incident | First check and response |
|---|---|
| Outage / D1 failure | Engineer checks Worker status and D1 dashboard, correlates generated request ID; hold writes if integrity uncertain; PO uses offline notes and reconciles later |
| Bad deployment | Compare artifact/config to last known good; roll back code only with schema compatibility; smoke before reopening |
| Failed migration / corruption | Stop writes and dispatch, preserve export/bookmarks/ledger, rehearse chosen restore, obtain data-loss-window approval |
| Compromised secret | Revoke/rotate at provider and Worker, revoke affected sessions/links, inspect scoped audit records, verify old credential fails |
| Webhook / LINE outage | Verify signature secret, destination/channel state and provider status; keep durable backlog; do not change retry keys |
| Payment reconciliation | Freeze collection for affected Charge/attempt, compare provider statement to immutable local ledger; never infer payment from UI success or retry as new money |
| Backup / restore failure | Keep writes paused, preserve evidence, escalate to engineer/platform support; PO verifies recovered records before launch |

Operator names, support hours, notification destination and staging drill evidence are still **EXTERNAL DEPENDENCIES**.
