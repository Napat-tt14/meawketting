# MEAWKETTING PROD0–PROD6 FINAL REPORT

Date: 2026-09-12 · Starting revision: `b75b843` (`ui final`) · Scope: local repository hardening and launch preparation. This is the main production handoff. [Runbook](./PRODUCTION_RUNBOOK.md) contains concrete operations/auth/D1 procedures; [Pilot QA](./PILOT_QA.md) contains the non-engineer behavior checklist.

## 1. Final Status

**NOT PRODUCTION READY.** The local baseline is repaired and technical hardening/preparation across PROD0–PROD6 is complete to the extent evidenced below. Real authentication, owner onboarding, invitations/recovery/logout integration, provisioned staging/production environments, remote D1 load acceptance, Cloudflare restore/alert rehearsals and real-shop QA are still missing. Selecting credentials alone does not complete that engineering work. No launch certification is implied by green local tests.

Cloudflare Workers + D1 remains the direction. Business-first, Customer ≠ Guardian, LINE identity ≠ Pet authority, Booking ≠ execution, Charge ≠ Payment and completed ≠ paid remain intact. No BE9, product redesign, Consumer revival, private media service or extra infrastructure was added.

## 2. Baseline Repair

The initial worktree was **clean**, not the 128-entry uncommitted tree described by PROD0. The committed `ui final` implementation and its artwork record were authoritative under the user's truth ordering. Reproduction returned **85/91 rendered tests** and the BE8 type error; backend suites already passed **69/69**.

| Failure | Root cause / classification | Smallest correction |
|---|---|---|
| Index landing | Stale test expected general photographic hero copy/preview after committed clay/hotel landing | Assert current hero, three services, Business CTA, Guardian secondary links, sharing control and explicit sample-art labels |
| Landing imagery | Stale expected photographic path; current artwork records seven clay assets | Assert actual paths, dimensions and image-loading contract while retaining legacy asset inventory and sticker independence |
| `/business` redirect | Redirect still worked; downstream expected old hero copy | Keep 307/location checks and validate the current hero |
| Business Home | Heading, work-list and spotlight markup changed in committed UI | Assert current heading/work list, accessible previous/next/swipe controls and one active image; retain Branch/revenue/domain contracts |
| Billing | Stale literal copy (`Charge…`) after Thai label cleanup | Assert current charge-list/balance copy; retain Payment separation/idempotency/checkout coverage |
| Reports | Test expected loaded KPI labels in production SSR; component intentionally waits for browser state | Assert explicit SSR loading/no fixture money, then render a simulated browser-ready view in an isolated module graph and retain all six KPI/section checks |
| BE8 TypeScript | Real regression: `PrototypeBooking` has `bookingId`, not `id` | Use `booking.bookingId` for the next-work key; no cast or behavior redesign |

An intermediate Reports harness used a shared Vite cache and then tried to inline CommonJS `react-dom/server`; both were isolated test-harness errors, fixed with a unique temp cache and normal Node imports. No application hydration guard was removed. Final **91/91 rendered**, **69/69 backend**, **8/8 BE scoped typechecks** pass. Tests were not skipped, strict mode remains enabled and assertions were not broadly weakened.

## 3. PROD0 — Current Delta

Still true: only dev/test identity is selected; production auth fails closed; no live LINE/payment/media integration; local Worker/D1 default uses a placeholder DB; repositories own writes and Reports/CRM derive read-only data; migrations are 0000–0014 and schema has 65 application tables.

Changed: clean committed starting tree; frozen landing is clay/hotel-oriented, Home spotlight renders one image at a time; stale UI tests and actual booking-key error are repaired. New hardening covers JSON limits on early APIs, same-origin commands, session primitives, remote config/rate boundary, Business security headers, safe failure categories, webhook probe normalization and `.dev.vars` ignore rules. Current React/RSC/Vite patch vulnerabilities were fixed.

Newly confirmed gaps: build metadata is not deployable production configuration, root TypeScript has five frozen Consumer diagnostics, operational alert delivery is unconfigured, and npm full audit still reports development-tool findings. Historical broad “all green” claims cannot substitute for these scoped results.

## 4. PROD1 — Authentication

**IMPLEMENTED:** `session.ts` creates 32-byte opaque random tokens, hashes them for repository lookup, rejects malformed/duplicate cookies and expired/future/revoked records, constructs `__Host-` Secure/HttpOnly/SameSite=Lax cookies, and invalidates storage before returning cookie deletion. No Person/Business/Branch claim from a browser cookie is trusted.

**PROVIDER-NEUTRAL / NOT WIRED:** session repository and adapter interfaces. No production DB session store, callback, signup, invitation, recovery, refresh-token storage, owner verification, logout route or production login UI has been implemented. The helper's in-memory test double is not production storage. The integration design in the runbook specifies verified issuer/subject mapping, PKCE/state/nonce, fresh tokens on login, old-session revocation, invitation scope and recovery revocation. Future Google/LINE linking requires proof and never grants Pet authority.

**Fail-closed proof:** production bundle tests send the dev identity header with a misconfigured `dev-test` binding to BE1–BE8; each returns 501 before querying D1. Guardian dev route returns 404. Missing production identity never invokes the command callback. Explicit staging/production config with fixtures/dev authority or no required limiter returns 503 at the Worker boundary. Changing a config string does not activate a session adapter.

**PRODUCT DECISION REQUIRED:** select the identity provider/login method and first-owner onboarding approach. Existing Person → active membership → active Business → authorized Branch → target/action checks remain mandatory after authentication.

## 5. PROD2 — Security

| Area | Finding | Severity | Fix / current treatment | Validation | Remaining risk |
|---|---|---|---|---|---|
| Authentication | No real provider/session integration | BLOCKER | Fail closed; provider-neutral primitives and integration requirements | Production bundle plus session negative tests | Login, storage, onboarding, recovery and end-to-end revocation still absent |
| JSON/input | BE1–BE3 used unbounded `request.json()`; shared MIME accepted JSON-prefix lookalikes | HIGH | Stream-limited 64 KiB parser everywhere; exact JSON media type | Oversized body without Content-Length, malformed JSON and JSONP rejection; route smoke | Unknown fields are discarded by explicit parsers rather than assigned; not globally rejected. Operation enum/ID/date/list bounds remain enforced |
| CSRF/CORS | No uniform browser command origin check | HIGH before cookie auth | Same-origin/Fetch Metadata enforcement; cookie without Origin rejected; no permissive CORS | Direct origin tests and actual BE1–BE3 HTTP handler 403s | Future auth callbacks require separate state/nonce validation |
| Authorization | Tenant/Branch/object and role boundaries must survive mutations | HIGH | Existing application and repository guards retained | BE1–BE8 tests cover foreign Business/Branch/Customer/Pet, inactive actor/member, revoked grants, spoofed assignments and write-time changes | Real IdP and device flows untested |
| Session integrity | No reusable production session boundary | HIGH | Opaque/hash lookup, expiry/revoke, duplicate-cookie rejection, secure cookie helpers | 256-bit token shape, tamper, expiry, revoke, invalidation tests | Strongly consistent repository and fixation/recovery integration still required |
| Enumeration | LINE route disclosed missing versus unconfigured channel | MEDIUM | Missing/invalid signature or absent secret rejected before D1; 401/404/501 authentication failures normalized to 401 | Two probe paths return identical empty 401; signature/destination tests retained | Timing across validly signed provider requests not certified |
| Abuse | No provisioned rate limiter | HIGH before public access | Cloudflare-compatible boundary plus example config, 429/Retry-After and fail-closed binding failures | Allowed/denied/missing/throwing binding tests | Not provisioned; coarse IP ingress is not per-user protection or an exact quota; auth-specific limits pending |
| Headers | Worker lacked common response policy | MEDIUM | nosniff/referrer; Business-only frame/object/base CSP and permissions with camera self | Wrapper streaming/header tests, full rendered regression suite | Full script nonce CSP and real browser headers/device QA pending |
| QR/Passport | Need opaque grants and explicit authority | HIGH | Existing 32-byte tokens/hash-only storage, scope/expiry/revoke/filtering/guarded intake retained | BE5 7 tests plus issue → intake → receive/retry → revoke smoke | Verified Guardian onboarding remains absent; fixtures never imply real authority |
| Webhooks/outbox | No live provider credentials; replay and ambiguity must be controlled | HIGH | Raw HMAC, destination binding, event hash/dedup, durable lease/backoff/retry-key and reconciliation retained | BE6 8 tests plus raw-signature/retry tests and handler smoke | OA connection, schedule, quota handling and live delivery not tested |
| Financial | Duplicate/late success/refund and cross-tenant risk | HIGH | Immutable Payment/refund, idempotency, revisions, merchant binding and reconciliation retained | BE7 10 tests plus duplicate payment/checkout smoke | Manual record ≠ bank confirmation; gateway and policy absent |
| Logs/PII | Unstructured Worker failure boundary | MEDIUM | Log only route category/status/request-correlation ID/duration; no URL/body/IP/exception text; no-store API errors | Error redaction and stream tests | Platform invocation log configuration, cost/sampling and notification delivery need staging rehearsal |
| Secrets/fixtures | Wrangler `.dev.vars` was not explicitly ignored | MEDIUM | Ignore `.dev.vars*`; no tracked env/key files found; remote fixture gate | Git inventory and bundle fail-closed tests | Real secret creation/rotation and production seed inspection still external |
| Dependencies | RSC DoS and Vite local-server vulnerabilities | HIGH | React/react-dom/RSC 19.2.6 → 19.2.8; Vite 8.0.13 → 8.0.16, pinned lockfile | Rebuilt and reran rendered/backend suites; updated npm audit | 17 full-audit findings remain, classified below |

The dependency audit was fetched from npm on this run: initial **21** (14 high, 6 moderate, 1 low), final **17** (10 high, 6 moderate, 1 low), zero critical. `--omit=dev` reports zero, but this alone is insufficient because RSC was declared in devDependencies while used by the built runtime. The RSC advisory was therefore patched. [RSC advisory](https://github.com/advisories/GHSA-wx67-qw84-cm4g).

Remaining audit groups: Cloudflare Vite plugin/Miniflare/Wrangler/undici/ws/esbuild are local tooling/dev-server exposure; keep dev servers loopback and upgrade the toolchain before any shared preview. Babel, baseline-browser-mapping, brace-expansion, browserslist, fast-uri, js-yaml and fflate process trusted build/config inputs in this repository; defer compatible toolchain updates to a dedicated measured change. Drizzle-kit/esbuild-kit suggested a breaking/downgrade path: do not apply `audit fix --force`. Sharp relates to Node-side image tooling; the Cloudflare Worker uses its IMAGES binding, not a Sharp transform. If deployment switches to the Node server or accepts untrusted images, reassess/patch Sharp first. These are **not globally waived** and none are described as false positives. No bulk dependency upgrade was performed.

## 6. PROD3 — Cloudflare/D1

**PREPARED:** concrete, intentionally non-deployable `wrangler.pilot.example.json`, environment model, migration/rollback runbook and D1 acceptance/exit gate. The template points to compiled Worker/static files; it is separate from the current Vite local build config and must be reconciled with generated output before staging. No placeholder DB was presented as real infrastructure.

Required pilot architecture: one Worker/static asset deployment and D1 per environment, selected-auth Secrets, HTTPS/domain, coarse rate binding, logs and named operations. Cron only if LINE is live; R2 only if actual private media is required. Queues, Durable Objects, KV, microservices and database migration are unnecessary now.

Migration evidence: 15 files replay, fixture/constraint/index/concurrency checks and Drizzle metadata check pass. Local restore compares 65 schema tables. No migration SQL or real DB was changed. The runbook requires backup/bookmark before risk, ordered staging rehearsal, ledger/schema verification, writes held on failure and forward fixes. It never assumes an entire multi-file migration set is atomic.

D1 acceptance proposes a realistic initial 3-shop/6-branch/12-operator envelope and 100 collision pairs, with zero correctness violations and explicit p95/p99/error/retry/growth targets. Booking/staff/resource, Grooming, Hotel, Daycare, Consent, Inbox, finance and Reports/CRM are all included. **Only local correctness simulations were run; no remote latency/load figures exist.** Exit review requires measured contention/latency/size/operational cost after tuning, not speculation.

## 7. PROD4 — External Providers

| Integration | Backend foundation / work completed | External dependency and PO decision | Credentials still required |
|---|---|---|---|
| LINE | **PROVIDER-NEUTRAL:** Business-owned channels, signed raw-body boundary, durable outbox/leases/retry keys, provider IDs/dedup, unknown contacts and disconnected state; public probe normalization added | Decide if messaging is essential to first pilot; OA onboarding, verified links, webhook verification, reconnect/rotation, schedule and live acceptance | Each Business OA's channel secret/access token and verified destination/account |
| Payment | **PROVIDER-NEUTRAL:** attempts, immutable manual receipts/refunds, provider references, webhook ledger, reserved debt and reconciliation; existing security tests retained | Recommended narrow pilot: manual recording under agreed policy. Gateway selection/settlement/refund/legal accounting integration still absent | None for local/manual model; merchant gateway credentials if gateway chosen |
| R2/media | **NOT IMPLEMENTED / DEFERRED:** private upload/read architecture documented; public assets remain static | Decide whether first pilot truly needs private Pet/service photos. No automatic R2 provisioning | Bucket/binding and access implementation only if scope approved |

No real LINE connection, Guardian Mini App, Google link or payment gateway was claimed. No central Meawketting chat proxy was created. VAT, invoice/receipt legality, refund policy and retention periods were not invented.

## 8. PROD5 — Operations

**IMPLEMENTED LOCALLY:** safe Worker failure envelope/correlation, security categories, aggregate read-only operations SQL and a reproducible disposable restore drill. Drill result: 15 migrations, 65 tables, 299 synthetic rows, 1,220,608-byte backup; all-table hashes/counts, foreign keys, integrity, reopened backup and failed-migration rollback pass. It also executes the operations SQL against the local schema.

**DOCUMENTED:** Time Travel/export expectations, verified target IDs, pre-risk bookmark/export, stage restore, code rollback versus data restore, secret compromise, outage, D1 failure, LINE/webhook outage and payment reconciliation response. Dispatch remains stopped after restore until provider effects in the lost interval are reconciled; restored D1 must never automatically resend/collect.

**NOT IMPLEMENTED / EXTERNAL:** remote backup/restore drill, measured RPO/RTO, real log/alert destination, notification receipt test, named incident owner/support hours and operational dashboards. Cloudflare built-ins plus an operator checklist are sufficient starting architecture; no enterprise monitoring was added. Stated thresholds are proposals, not measured SLAs.

## 9. PROD6 — Pilot QA

**TESTED LOCALLY:** 91 rendered/source/state contracts, 69 backend tests and seven production tests. Existing executable tests prove last-capacity Hotel contention, Daycare capacity, Booking reservation conflicts, write-time staff/member changes, failed completion/payment transaction rollback, QR revoke races, duplicate webhooks, late payment reconciliation and Branch-scoped Reports/CRM.

**SIMULATED:** Reports browser-ready rendering; 41 Request/Response calls through ten real HTTP route handlers with isolated D1-compatible SQLite and virtual Worker bindings; provider mocks; backup/corruption/rollback. The smoke invokes existing BE5, BE6 and BE7 workflows plus BE1/2/3/8 reads, origin rejection and unauthenticated LINE probes. It does not open a network listener or prove Cloudflare runtime behavior.

**NOT YET TESTED WITH REAL SHOP:** real authenticated multi-browser activity, actual desktop/mobile/camera hardware, slow network UI recovery, remote D1 load, live OA/gateway, shop close/open/timezone and staging restore sign-off. `PILOT_QA.md` supplies 28 behavior rows plus the six requested Thai failure questions and clear PASS/BLOCKED criteria. No blank checklist was represented as completed QA.

## 10. Performance / Technical Debt

| Item | Classification | Current evidence / action |
|---|---|---|
| Real auth/environment/restore/alert acceptance | BLOCKER | Listed above; local tests cannot close these |
| Root scans protected design source | FIXED NOW | Exclude only `workfiledesign` as documented reference material; no source files inside modified |
| `.ts` import diagnostics | FIXED NOW | `allowImportingTsExtensions` matches existing no-emit/tsx contract |
| Five Consumer root TS diagnostics | SAFE TO DEFER for Business-only pilot | Two icon `weight` props, one SafetyStatus widening, two PublicFieldKey mismatches remain visible; no Consumer edit or broad exclusion |
| Team exhaustive-deps warning | EXPECTED / historical finding not reproduced | Final lint has no warnings |
| Home hero slides | BEFORE PUBLIC LAUNCH performance review | Current committed spotlight renders only the active image, not all three. Its source assets are still 1.80–2.11 MB; measure slow/mobile first, then resize/re-encode with visual QA |
| Four `.png` files actually JPEG | SAFE TO DEFER while legacy landing files are unused | Old photo/hero/services/workflow files verified by magic bytes; current clay landing uses genuine PNG assets. Correct path/MIME before reusing legacy photos |
| Oversized avatar | SAFE TO DEFER / not reproduced as current avatar dependency | Current UserMenu uses icon avatar; large unrelated local media remains ignored |
| Global CSS | BEFORE PUBLIC LAUNCH | Layout imports globals, Business design system and workspace CSS globally; measure coverage before separating to avoid frozen-UI regressions |
| Toolchain audit findings | BEFORE SHARED PREVIEW; trusted local build use only | Full audit 17; runtime RSC and Vite security patches applied; details in section 5 |
| Branch-local time / multi-day hours | BEFORE PILOT scope acceptance | Thailand-only proposed; DST/multi-timezone and full multi-day policy not certified |
| tmp/dist/cache/log artifacts | EXPECTED / IGNORE | Generated artifacts and old caches preserved; no unknown-file cleanup. npm reported a locked old native cache during patch install; subsequent build passed |

No image was re-encoded or path silently changed. No new performance claim is based on screenshots or device tests that were not run.

## 11. Cost / Complexity

First pilot needs Worker/static hosting, D1, identity service suited to chosen login/recovery, HTTPS, rate binding and basic operational ownership. Use provider/platform built-ins before buying another service. Auth/provider/account plan fees require actual selection; no fixed monthly price is promised here. D1 backup window and capacity vary by plan and are linked in the runbook.

Deferred: R2/private media, gateways, LINE delivery if not essential, Queues, Durable Objects, KV, enterprise telemetry and DB migration. Provider-neutral primitives add no vendor commitment. No resource was provisioned and no new recurring automation/subscription was created.

## 12. Product Owner Decisions

| Question | Recommended default | Impact |
|---|---|---|
| Which auth provider/login method and first Owner onboarding? Is Google required now? | Managed OIDC-compatible provider with recovery; verified first Owner, Google only if needed | Enables real integration; self-managed auth adds security/support work; vendor choice still yours |
| Which first shops/branches/modules; Thailand-only; must LINE or private photos be live? | 1–3 controlled shops, Thailand-only, selected existing modules; defer LINE/media unless essential | Defines staging load and device QA; broader scope requires additional integrations/time validation |
| Manual payments or gateway; what refund/receipt/retention policy is authorized? | Manual records only, explicit authorized corrections/refunds; no tax-invoice promise; obtain legal retention requirements | Gateway adds settlement/refund engineering; financial/legal policy cannot be guessed |
| Who owns domain, incident response and recovery objectives? | Named engineer + shop verifier; approve/revise proposed recovery objectives before real data | Determines provisioning, support and restore sign-off; no operator means no safe pilot |

## 13. External Actions Required

Select/create auth account, then implement and test verified callback/session repository/invitations/recovery/logout. Provision separate Cloudflare staging and production resources with verified IDs, domain/TLS, required bindings and secret values. Reconcile example config with the actual build; validate images/static/SSR routing. Run remote D1 load and restore drills; configure alerts and confirm receipt. Perform signed-off shop QA. Obtain per-Business LINE OA or gateway credentials only if those integrations enter pilot scope. None of these actions was performed.

## 14. Final Validation

| Command / check | Current result | Limit |
|---|---|---|
| `npm run lint` | PASS — 0 errors, 0 warnings | Scoped repository lint |
| `node --test tests/rendered-html.test.mjs` after build | PASS — **91/91**, 0 skipped | Includes production BE1–BE8 fail-closed and simulated loaded Reports |
| `npm run test:be1` … `test:be8` | PASS — **8 + 11 + 9 + 13 + 7 + 8 + 10 + 3 = 69** | SQLite/D1-compatible local suites |
| `npm run test:production` | PASS — **7/7** | Session/security/rate/PII/provider boundary tests |
| `npm run typecheck:be1` … `typecheck:be8` | PASS — **8/8** | No strict weakening |
| `npm run typecheck:production` | PASS | New production tests/Worker/backend/Business scope |
| `npx tsc --noEmit --incremental false --pretty false` | FAIL — **5 pre-existing Consumer diagnostics** | Explicitly not a full-root green claim |
| `npm run build` | PASS | Vinext beta emits an existing route-classification notice; not deployment evidence |
| `npm run db:check` | PASS — **15 migrations**, replay/constraints/indexes/concurrency | Local only |
| `npx drizzle-kit check` | PASS | Migration metadata |
| `npm run db:restore:drill` | PASS — **65 tables / 299 rows** | Local SQLite backup, not Time Travel |
| `npm run test:api:smoke` | PASS — **41 requests / 10 routes** | Real route functions, simulated binding; no HTTP network/provider |
| `npm audit --json` | **17 findings** — 10 high, 6 moderate, 1 low | Classified; not a clean audit |
| `git diff --check` | PASS | No whitespace errors |

Reproduction environment: Windows/PowerShell, Node v26.2.0. Initial sandbox runs could not write certain Vite/package cache files; build succeeded with authorized cache access. The ordinary npm audit initially could not reach the registry; a permitted registry query succeeded. These were environment limitations, not ignored test failures. npm install lifecycle scripts were blocked by its existing allowScripts policy; no blanket bypass was made, and the final build/tests still passed. No automatic approval rejection left work blocked.

Raw local run logs are under ignored `tmp/prod-*.log` and `tmp/prod-audit-*.json`; this report preserves meaningful counts for handoff.

## 15. Files Changed

- `app/business/home/BusinessHome.tsx`: correct durable Booking identifier only.
- `app/_backend/be1/identity.ts`, new `session.ts`: provider-neutral verified-session identity type/primitives; no selected production adapter.
- `app/_backend/shared/http.ts`, new `requestSecurity.ts`, `app/api/be1..be3/route.ts`: shared bounded JSON and same-origin protection.
- `app/api/channels/line/[channelId]/route.ts`: uniform unauthenticated probe response before D1.
- `worker/index.ts`, new `worker/security.ts`, `worker-configuration.d.ts`: response hardening, safe failure logs, remote fixture/rate boundary.
- `package.json` / lockfile: React/RSC/Vite security patches and explicit production check scripts.
- `tests/rendered-html.test.mjs`, new `tests/production.test.ts`, `tsconfig.production.json`: repaired current contracts and targeted production tests.
- `tsconfig.json`: protected reference exclusion and valid no-emit `.ts` import contract only.
- `.gitignore`: local Wrangler secret file patterns.
- New `scripts/production-api-smoke.mjs`, `production-restore-drill.ts`, `production-operations.sql`: isolated HTTP behavior, recovery and aggregate operations checks.
- New `wrangler.pilot.example.json`: non-deployable environment preparation template.
- `docs/README.md`, `CURRENT_IMPLEMENTATION.md`, `VALIDATION.md`, `BACKEND_READINESS.md` plus this report/runbook/QA: current facts and launch procedures. Historical PROD0 and derived HTML manual were not rewritten.

**Confirmed:** `/workfiledesign` untouched. Consumer source/UI untouched and PAUSED; shared React runtime security patch validated by existing rendered tests. No reset/checkout/clean, no unknown-file deletion, no commit, no push and no production deployment.

## 16. Manual Product Owner QA

Use [Pilot QA](./PILOT_QA.md): two operators try the last room/slot together; only one can succeed. Add/edit a Customer/Pet and Booking, refresh and verify from the second browser. Complete a service and confirm it does not pay the Charge. Record partial/final payment twice and confirm money is counted once. Try foreign shop IDs, restricted Staff, revoked/expired QR and invalid opening hours. Turn the network off before save and verify the UI does not claim success. Finally verify records after the staging restore drill. Record PASS/FAIL/BLOCKED rather than assuming missing providers work.

## 17. Exact Next Action

**Select the Business authentication provider and allowed login method so the verified session/onboarding/recovery integration can be implemented and exercised in staging.**
