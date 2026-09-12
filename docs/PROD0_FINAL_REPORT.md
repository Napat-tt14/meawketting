# PROD0 FINAL REPORT

**Audit date:** 2026-09-12  
**Decision:** **NOT PRODUCTION READY.** The repository contains a substantial, locally validated Business/D1 foundation, but PROD0 exit is a decision gate—not a deployment approval.  
**Audit subject:** the current uncommitted worktree, its configuration, canonical documents, and reproducible local checks. No commit, push, provider connection, production resource, or deployment was performed.

## 1. Executive Summary

What is production-capable by design:

- BE1–BE8 have a coherent Business → Branch → target authorization shape, D1-backed records, bounded JSON parsing, typed conflicts, audit correlation, idempotency, optimistic revisions, and local concurrency guards.
- BE4–BE8 preserve useful boundaries: service execution, consent/intake, provider-neutral inbox/outbox, manual financial records, and read-only reports/CRM. LINE, payment, and media adapters are deliberately not treated as live providers.
- The Cloudflare Worker/Vinext + one D1 direction is still a sensible low-complexity choice for a small Business pilot, provided D1 is measured under the real pilot envelope. There is no evidence that a database migration is justified.

What is not production-ready:

- There is no production identity/session system. The only implemented identity adapter accepts a caller-controlled development header and intentionally fails closed outside `dev-test`.
- There is no production Cloudflare resource/deployment environment: the checked Wrangler file has a local name and placeholder D1 ID; R2 is null; no production domain, environment separation, secret rotation, or scheduled trigger is configured.
- Backup/restore, D1 load acceptance, observability/alerts, incident response, rollback, retention/deletion, and pilot-device QA are not evidenced.
- Real LINE delivery, LINE Login/Mini App, payment gateway processing, real media storage, and tax/accounting workflows are not implemented.
- The current worktree does not reproduce its canonical UI checkpoint: rendered tests are 85/91 with six failures, and `typecheck:be8` fails on the current Business Home change. The root page is currently hotel-specific while canonical docs/tests describe a general Business Operating Platform landing page.

Top blockers are production authentication, a clean pilot UI/evidence checkpoint, production environment/resource setup, D1 acceptance plus backup/restore, minimum security hardening, and explicit Product Owner decisions on pilot scope, time, money, media, and external integrations.

## 2. Repository Truth

The current worktree is heavily in progress: `git status --short` reports 128 entries, consisting of 63 modified tracked files and 65 untracked files. The current source includes BE4–BE8, shared backend code, APIs, migrations, seeds, tests, and UI changes that are not all reflected by the historical validation prose. `/workfiledesign` remains untouched.

| Area | Current evidence | Audit interpretation |
|---|---|---|
| Backend foundation | `db/schema.ts` declares 65 SQLite tables; `drizzle/` contains 15 migrations (`0000`–`0014`); BE1–BE8 tests pass independently. | Strong local foundation, not production certification. |
| Local checks | `npm run build` passes. `db:check`, Drizzle check, `git diff --check`, and BE1–BE8 test suites pass. | Build and backend correctness evidence is local only. |
| Current rendered UI | `npm test` reaches 91 rendered contracts: 85 pass, 6 fail. Failures cover the canonical landing copy/image, `/business` landing redirect content, Business Home heading, Billing copy, and Reports copy. | Current UI/docs checkpoint is stale or the current UI direction changed; resolve before pilot. |
| Scoped TypeScript | `typecheck:be1`–`be7` pass; `typecheck:be8` fails at `BusinessHome.tsx:110` because `PrototypeBooking` has `bookingId`, not `id`. | Current BE8 worktree regression; fix before pilot. |
| Root TypeScript | Root scope includes all `**/*.ts`/`**/*.tsx`, including `/workfiledesign`, frozen Consumer/shared files, tests, and current UI errors. | Do not “fix” this with a broad exclude; create a deliberate CI boundary later. |
| Authentication | `DevTestIdentityAdapter` accepts `x-meawketting-dev-person-id` only when the server is in `dev-test`; production fails with `AUTHENTICATION_NOT_CONFIGURED`. | Correct local safety boundary; production blocker. |
| Business login | The Google button uses a short client-side delay and navigation, and says Google is still being prepared. | Prototype presentation, not login or session creation. |
| Cloudflare config | `.openai/hosting.json` has `DB` and `r2: null`; `wrangler.be1.jsonc` has a local Worker name and placeholder D1 ID only. | No evidence of a usable production environment. |
| External providers | LINE credentials are expected through a server-only binding; BE7 defaults to no provider resolver; no real credentials are present. | Provider-neutral seams exist; no live integration. |

Important code/document conflicts found:

- `docs/VALIDATION.md` records historical frontend passes, while the current `npm test` run is 85/91. Its “pass” statements must not be used as current launch evidence without a fresh clean run.
- Canonical docs/tests expect the root `/` to be the general Business-first landing page. Current `app/page.tsx` renders hotel-specific metadata/copy and the six landing-related contracts fail.
- Canonical Business Home tests expect `หน้าหลัก`; current `BusinessHome.tsx` uses the changed `ภาพรวมวันนี้` heading and contains the BE8 type error.
- The documentation says a TeamOperations lint warning was observed; the current direct ESLint run did not reproduce it. Treat it as stale evidence, not as a confirmed current warning.

Primary evidence: [canonical status](./README.md), [current implementation](./CURRENT_IMPLEMENTATION.md), [backend readiness](./BACKEND_READINESS.md), [validation record](./VALIDATION.md), [identity adapter](../app/_backend/be1/identity.ts), [Worker config](../wrangler.be1.jsonc), and [hosting config](../.openai/hosting.json).

## 3. Pilot Scope

This is a recommended default for a narrow Business pilot. “MUST” means required only if the pilot promises that capability; conditional items remain Product Owner decisions.

| Item | MUST / SHOULD / CAN WAIT | Reason | PO decision needed? |
|---|---|---|---|
| Business/Branch workspace plus only the selected pilot services | MUST | The pilot must test one clear operational outcome, not every module. | Yes — choose merchants, branches, and modules. |
| Production authentication and secure sessions | MUST | Without it, Business data cannot be exposed to real users. | Yes — choose auth category and allowed methods. |
| Business account onboarding/invitations | MUST for multi-person use | Existing memberships do not provide a usable invite/onboarding flow. | Yes — owner-only versus staff/manager pilot. |
| Password/recovery or equivalent recovery | MUST | Every production account needs recovery; magic link is an acceptable equivalent. | Yes — password, magic link, or both. |
| Google login | SHOULD | Reduces pilot friction, but email/magic-link auth can launch without it. | Yes — required at launch or later. |
| Manual payment recording | MUST if Billing is in scope | It tests the existing financial model without gateway risk. | Yes — who may record and what proof is required. |
| Refunds UI/process | SHOULD if real money is recorded | A live manual payment process needs a controlled correction/refund path. | Yes — refund authority and off-platform policy. |
| Payment gateway | CAN WAIT | No provider, webhook, settlement, tax, or reconciliation operation is live. | Yes — only promote if online conversion is a pilot success metric. |
| Business-owned LINE OA messaging | CAN WAIT by default | Real OA onboarding, secrets, webhook configuration, delivery support, and cost are still external work. | Yes — MUST if customer messaging is the pilot metric. |
| LINE Login | CAN WAIT | It belongs to the future Guardian/LINE-first direction, not the narrow Business pilot. | Yes — only if Guardian entry is included. |
| Guardian Mini App | CAN WAIT | Consumer is paused and no production Guardian authority/linking exists. | Yes — defer or expand pilot scope. |
| Business logo | SHOULD | Useful tenant identity; text/initial fallback is acceptable for a small pilot. | Yes — branded launch or fallback. |
| Pet photos | CAN WAIT by default | Current Passport/photo field is metadata-only; storage and access policy are not implemented. | Yes — make photos operationally required or not. |
| Grooming before/after media | CAN WAIT | It creates R2, upload, access, retention, and deletion scope. | Yes — only if it is a selling point. |
| Hotel/Daycare media | CAN WAIT | Same media and retention burden; not needed to prove core operations. | Yes — only if essential to the selected service. |
| Email/SMS product notifications | CAN WAIT | Product notifications are separate from the transactional email needed by the chosen auth method. | Yes — notification promise and channel budget. |
| Public Passport flows | CAN WAIT | Consumer is paused; public Passport authority is not production-ready. | Yes — keep out of first pilot or fund Guardian track. |
| Receipts/invoices | CAN WAIT for tax invoices; SHOULD for an internal payment record | Do not call a manual record a tax invoice until policy/legal decisions are made. | Yes — receipt, tax invoice, VAT, and accounting promise. |
| Backup, restore drill, health checks, and incident ownership | MUST | Live business data requires recoverability and an accountable operator. | Yes — RPO/RTO and support owner. |
| D1 load/correctness acceptance | MUST | Local tests do not prove production concurrency or query behavior. | Yes — confirm pilot volume envelope. |

## 4. Production Blockers

| Blocker | Severity | Current state | Required next action |
|---|---|---|---|
| Production authentication/session | P0 | Only dev-test header identity exists; Business login is a navigation prototype. | Select an auth category, implement the production adapter and secure session lifecycle in PROD1. |
| Real-user onboarding/recovery | P0 for a multi-user pilot | No verified owner onboarding, invite, recovery, or revocation flow is evidenced. | Define and implement owner, manager, staff, Branch grant, invite expiry, and recovery behavior. |
| Production Cloudflare environment | P0 | Local Worker config, placeholder D1 ID, no production domain/resource/secret separation. | Create separate staging/production resources, bindings, domain, secrets, deployment and rollback records. |
| Current UI/evidence checkpoint | P1 | 85/91 rendered tests and one BE8 scoped type error; root landing/product copy conflicts with canonical docs. | Reconcile Product/UI intent, then restore a reproducible clean validation checkpoint. |
| D1 acceptance and operational recovery | P0 | No measured pilot load, production database, restore drill, or migration runbook. | Run the acceptance gate in section 8 and complete a restore drill before real data. |
| Security hardening | P0/P1 | Auth, cookies, rate limits, CSRF policy, security headers, secrets rotation, and environment controls are incomplete. | Complete the security matrix in PROD2 before public access. |
| Time semantics | P1; P0 for multi-timezone | Branch timezone exists, but BE3 stores local ISO-like values and derives minutes with UTC-suffixed parsing; DST is not certified. | Confirm Thailand-only scope or implement/test UTC instant plus Branch-local display semantics. |
| Observability/incident/rollback | P0 | Request/correlation IDs exist for most Business APIs, but no configured production alert path, health endpoint, or runbook is evidenced. | Configure minimal redacted logs, alerts, health, ownership, rollback, and incident procedures. |
| Payments | Conditional P0 | Manual financial records are local and tested; no gateway, settlement, tax, or accounting workflow exists. | Keep manual-only or select a hosted gateway and complete provider/reconciliation policy. |
| LINE | Conditional P0 | Provider-neutral adapter/outbox/webhook foundation exists; no OA, credentials, trigger, or support operation exists. | Keep out of the first pilot unless the PO makes messaging a MUST and funds PROD4. |
| Media/R2 | Conditional P0 | R2 is explicitly unbound; only metadata references exist. | Defer media or approve the private-object design and add R2 as a separate launch dependency. |

## 5. Production Auth Recommendation

Authentication must remain separate from authorization: the provider establishes who the Person is; BE1 resolves that Person to Business memberships, Branch grants, and role policy.

| Approach | Pilot cost shape | Complexity/security | Cloudflare fit and product fit | Verdict |
|---|---|---|---|---|
| Managed OIDC/auth service with app-owned session | Recurring MAU/seat or feature cost; exact provider pricing requires current quotation. | Medium implementation; strongest option for recovery, email verification, MFA, and secure credential handling. | Good if the service supports OIDC/PKCE or verifiable tokens from Workers. App still owns Business invitations and Branch grants. | **Recommended.** |
| Self-operated auth in Worker/D1 | Lower vendor bill but more engineering and support cost. | High security and operational burden: password storage, recovery, abuse, email delivery, session rotation, breach response. | Technically possible, but poor fit for a non-backend Product Owner. | Reasonable only with a dedicated security owner; not recommended. |
| Temporary workspace SSO/Cloudflare Access-style gate | Potentially low incremental cost for a closed internal pilot; current account pricing/eligibility must be verified. | Low product work, but does not solve consumer identity, public recovery, merchant onboarding, or future LINE linking. | Useful for internal QA or one controlled operator group, not a product auth system. | Reasonable temporary alternative only if the pilot is explicitly closed. |

Recommended architecture:

1. Use a managed OIDC-compatible provider; do not select the vendor in PROD0.
2. Verify the provider subject, issuer, audience, nonce/PKCE state, and email/verification claims at the callback/token boundary.
3. Map `issuer + subject` to the existing Person/external-identity foundation, then resolve BE1 membership server-side.
4. Issue a short-lived, rotated, revocable `HttpOnly; Secure; SameSite=Lax` or stricter application session cookie. Keep authorization out of client storage.
5. Let the application own owner onboarding, invitations, Branch grants, displayed role labels, suspension, and audit. Do not let an auth-provider role silently grant Business access.
6. Keep LINE identity separate from Pet authority. A future LINE identity link must be an explicit verified relationship, not an inferred owner/Guardian link.

Architectural impact is bounded: replace `DevTestIdentityAdapter` with a production adapter, add callback/session/logout/recovery/invite endpoints, map external subjects to Person, and keep BE1–BE8 authorization and D1 schemas conceptually intact.

## 6. Security Readiness

| Area | Status | Evidence | Action |
|---|---|---|---|
| Authentication/session handling | PRODUCTION BLOCKER | `DevTestIdentityAdapter` accepts a caller-controlled header only in `dev-test` and fails closed otherwise. | Implement and test a production identity/session adapter. |
| Server-side authorization | READY BY DESIGN | BE1 resolves Person → membership → Business/Branch; D1 guards repeat authorization. | Re-run the same matrix through the production session boundary. |
| Tenant isolation | READY BY DESIGN | BE1–BE8 negative tests reject foreign Business IDs. | Add black-box production probes and alert on denials/spikes. |
| Branch isolation | READY BY DESIGN | Branch grants and target predicates are tested across BE1–BE8. | Verify inactive Branch and multi-Branch policy with real roles. |
| Target/object authorization | READY BY DESIGN | Repository queries scope target Business/Branch before reads/writes. | Add route-by-route regression probes after auth integration. |
| Input validation | READY BY DESIGN | JSON bodies are bounded at 64 KiB; typed validators bound strings, IDs, dates, and choices. | Fuzz malformed JSON, oversized bodies, and boundary values in CI. |
| ID enumeration | READY BY DESIGN | IDs use opaque/random values and APIs use typed/generic failures. | Check timing/status consistency for public webhook, QR, and future recovery routes. |
| Rate limiting | NEEDS HARDENING | No application or visible Wrangler rate-limit policy is present. | Add edge/app limits for login, recovery, scan/intake, webhook, and provider callbacks. |
| Abuse/bot protection | NEEDS HARDENING | No bot challenge or abuse-control integration is present. | Start with rate limits and lockout; add challenge only where traffic evidence requires it. |
| CORS | READY BY DESIGN | Browser clients use same-origin fetch and no permissive CORS headers are emitted. | Keep same-origin by default; explicitly allow only required auth callback origins. |
| CSRF | NEEDS HARDENING | There is no session-cookie mutation path yet; browser cookies currently represent UI preferences. | Add Origin/SameSite/CSRF protection when production cookie mutations arrive. |
| Security headers | NEEDS HARDENING | API responses set `no-store` and `nosniff`, but no CSP, HSTS, frame, referrer, or permissions policy is visible. | Set a tested production header baseline at Worker/app edge. |
| Cookies/session flags | PRODUCTION BLOCKER | No real authentication cookie or revocation path exists. | Define secure flags, expiry, rotation, revocation, logout, and device/session policy. |
| Secret management | PRODUCTION BLOCKER | Server-only LINE binding is modeled, but no production secrets or rotation runbook exists. | Provision environment-specific secrets; never put provider credentials in D1 or browser code. |
| Environment separation | PRODUCTION BLOCKER | Visible config is local-only with a placeholder D1 ID and no staging/prod sections. | Create named environments, distinct resources, deploy approvals, and secret scopes. |
| Webhook verification | READY BY DESIGN | LINE adapter verifies the raw body with HMAC-SHA256 and checks destination/signature. | Add provider-specific endpoint tests, secret rotation, and deployment verification. |
| Webhook replay/dedup | READY BY DESIGN | Webhook ledger, event/provider IDs, outbox attempts, leases, and retry keys exist. | Add retention, failure visibility, and replay/reconciliation operations. |
| QR/token entropy | READY BY DESIGN | Temporary tokens are format-bounded and generated as opaque values; tests cover token behavior. | Retain expiry/revocation and public endpoint rate limits; never log raw tokens. |
| Token hashing | READY BY DESIGN | BE5 persists a SHA-256 token hash rather than the raw temporary QR value. | Add black-box assurance that raw values never enter logs/analytics. |
| Consent expiry/revoke | READY BY DESIGN | BE5 applies active/expiry/revocation gates and records access activity. | Decide retention/deletion and test clock-skew/expiry boundaries. |
| Protected Passport filtering | READY BY DESIGN | BE5 scopes protected fields; medication requires explicit Intake authorization. | Do not include Guardian/Passport pilot flows until production authority/linking exists. |
| Financial idempotency | READY BY DESIGN | BE7 request keys, receipts, balance guards, revisions, and refund allocation checks are local-tested. | Add provider settlement/reconciliation tests before online money. |
| Payment replay protection | NEEDS HARDENING | Provider contracts model idempotency/reconcile, but no real signed provider webhook route is configured. | Implement provider signature/event ledger and ambiguous-response reconciliation only if gateway is selected. |
| Stale writes | READY BY DESIGN | BE3/BE4/BE7 use revisions and typed conflicts. | Measure under concurrent real HTTP requests. |
| Concurrency | READY BY DESIGN | D1 batches, reservation guards, capacity checks, leases, and tests exist. | Pass the load gate with pilot-shaped contention. |
| Sensitive logs | NEEDS HARDENING | Source comments avoid logging credentials/notes/tokens, but no production log schema/redaction policy is configured. | Log only route/status/duration/IDs/outcome; exclude payloads, PII, QR, secrets, and payment details. |
| Audit/event metadata | READY BY DESIGN | Audit records carry actor/scope/request/correlation/target and bounded before/after structures. | Define who may view/export audit data and its retention. |
| PII exposure | NEEDS HARDENING | Protected Business routes render a pre-hydration client snapshot and keep the shell renderable when session hydration fails. | Make production unauthenticated navigation server-safe; verify fixtures contain no real PII and never become authority. |
| Production error responses | NEEDS HARDENING | Generic API errors are useful, but auth returns a deployment-state 501 and LINE responses lack request/correlation IDs. | Normalize safe status/body/IDs and alertable error categories. |
| Dependency/security posture | NEEDS HARDENING | A lockfile exists, but no dependency audit/SCA result is part of this evidence. | Run lockfile install, dependency audit, and CI security checks before PROD1 exit. |
| R2/private-object access | NOT APPLICABLE now | R2 is null and the schema holds only a `photo_object_key` reference. | If media becomes MUST, implement private upload/read authorization, short-lived URLs, limits, and deletion policy. |

## 7. Cloudflare Pilot Architecture

Smallest recommended shape:

```text
Business users
    │ HTTPS / custom domain
    ▼
One Cloudflare Worker + Vinext
    ├── D1: one production database, forward-only migrations
    ├── Secret bindings: auth, and only selected provider credentials
    ├── Workers Logs / alert path: redacted request and job signals
    ├── Cron Trigger: only when outbox/reconciliation/cleanup needs it
    └── Optional private R2: only if the PO makes media a pilot requirement
```

The current Worker already has a `scheduled` handler for LINE outbox draining, but the visible local Wrangler file has no `triggers.crons`; a scheduled handler alone is not a production schedule. The Worker also references an `IMAGES` binding for image optimization, while the visible local binding config does not declare it. Verify that binding or make image optimization a deliberate deployment dependency.

| Concern | Required for pilot? | Correctness evidence | Performance/operations gate |
|---|---|---|---|
| Booking concurrency | YES if Booking is in pilot | BE3 interval/revision/idempotency tests pass locally. | Contention test at 1.5× expected peak; zero double-bookings or lost updates. |
| Resource reservation contention | YES for resource-backed services | D1 reservation guards and typed conflicts are local-tested. | p95 mutation target ≤1 s; zero over-allocation. |
| Grooming writes | YES if Grooming is selected | BE4 writes, completion, service records, and idempotency are local-tested. | No 5xx/persistence errors; p95 mutation ≤1 s. |
| Hotel capacity/write contention | YES if Hotel is selected | Date-range/capacity guards are local-tested. | Zero capacity violations under concurrent check-in/update. |
| Daycare capacity/write contention | YES if Daycare is selected | BE4 capacity/Branch scoping is local-tested. | Zero over-capacity writes; measure peak-day latency. |
| Staff availability conflicts | YES when assignment is used | Capability/availability guards are local-tested. | Zero invalid assignments under concurrent edits. |
| Intake/Consent activity | YES if QR/intake is selected | BE5 expiry/revoke/scope activity is local-tested. | No protected-field response before valid authority; audit write succeeds. |
| Inbox/message activity | CAN WAIT unless messaging is the metric | BE6 outbox/webhook/dedup foundation is local-tested. | If enabled: no stuck outbox beyond agreed SLA; webhook failures visible. |
| Payment/financial writes | YES for manual Billing | BE7 allocation/overpayment/refund/idempotency tests pass locally. | Zero overpayment/over-refund; reconciliation failures page. |
| Reports query latency | YES for operator reports | BE8 is read-only and derived from BE1–BE7. | p95 report ≤2 s on the agreed 90-day pilot-shaped dataset; paginate all large lists. |
| Database growth | YES | 65-table schema and 15 migration replay pass locally. | Test at ≥2× projected first-pilot data; monitor storage/row-read/write limits. |
| Multi-Branch usage | Only if pilot uses it | Cross-Branch authorization and projections are locally tested. | Per-Branch query latency and zero cross-Branch leakage. |
| Expected pilot-store count | PO must set it | No production volume is currently known. | Use the PO envelope in section 8; do not call D1 accepted without it. |

Cloudflare services unnecessary for the first narrow pilot: Durable Objects, KV, Hyperdrive, a second database, a separate queueing system, a third-party observability suite, Workers Analytics Engine, and R2 when media is deferred. Add Queues or Workflows only when measured outbox/reconciliation requirements justify them; the current D1 outbox plus a Cron Trigger is the smaller starting point for low volume.

Current Cloudflare documentation describes D1 as single-threaded per database and gives a 30-second query limit; this is why throughput must be measured rather than assumed. See [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) and [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/).

## 8. D1 Production Acceptance Gate

The following are recommended targets, not results already achieved. The PO must confirm or replace the provisional load envelope: **3–5 pilot Business accounts, up to 2 Branches per Business, up to 10 concurrently active staff sessions per Business, and 100–200 Booking/service/payment operations per Business per day**. The test must use the actual selected modules and a synthetic dataset at least twice the projected first 90 days.

| Test class | Measurement approach | Recommended pass target | Current status |
|---|---|---|---|
| Migration replay | Apply all 15 migrations to an empty D1-compatible database twice; compare schema/table/index/check constraints. | 0 migration errors; deterministic schema; no demo seed in production path. | Local replay/check passes; production not tested. |
| Authorization matrix | Exercise every BE1–BE8 read/write with valid, foreign, inactive, wrong-Branch, wrong-role, and missing-target identities. | 0 unauthorized successes; generic failure; audit only for permitted mutations. | Local tests pass; production session not tested. |
| Idempotency/replay | Repeat Booking, execution, consent, message, payment, refund, and webhook requests with same and changed payloads. | Same request returns one durable result; changed payload is rejected; no duplicate financial effect. | Local foundation passes; real HTTP/load path not tested. |
| Contention | Run concurrent Booking/resource/capacity/staff/payment/refund/outbox operations against the same Branch. | Exactly one valid winner where exclusive; zero over-allocation, overpayment, or lost update. | Local concurrency tests exist; pilot-shaped load not measured. |
| Failure recovery | Interrupt/retry after provider ambiguity, D1 conflict, lease expiry, and Worker restart simulation. | No stuck mutation; retry/reconcile path is visible and safe. | Provider/production failure path not exercised. |
| Time | Test Branch-local midnight, date-range boundaries, UTC offsets, and any planned non-Thai timezone. | Calendar date and instant are unambiguous; no DST or midnight drift for supported zones. | Not production-certified; current BE3 model needs explicit decision. |
| Query performance | Record Worker and D1 duration for reads, mutations, and Reports at 1.5× expected peak for 30 minutes plus a 2-hour soak. | Recommended p95 reads ≤750 ms, p95 mutations ≤1 s, p99 ≤2 s, 5xx/D1 overload <0.5%. | Not measured. |
| Growth/limits | Load 2× projected first 90-day rows; inspect rows read/written, storage, query count, statement size, and list pagination. | No limit breach; no unbounded list/report; plan quota headroom remains. | Not measured. |
| Backup/restore | Restore a production-like D1 state to a safe target, run smoke/row-count/authorization checks, and time it. | Restore succeeds without corrupting or exposing data; RPO/RTO meet PO-approved targets. | Not evidenced. |
| Monitoring | Inject one error in each critical path and verify signal, alert, and runbook. | Every P0 failure produces an actionable signal with correlation ID. | Not evidenced. |

Recommended operational thresholds: alert on any backup failure, migration failure, payment reconciliation mismatch, or stuck critical outbox; alert on health failure twice consecutively, 5xx above 1% for 5 minutes, D1 errors/overload above 0.5% for 5 minutes, or authorization denials above 3× baseline. Tune after baseline data; these are starting thresholds, not observed rates.

**D1 Exit Gate:** remain on D1 when the correctness suite is clean, the agreed load meets the targets with headroom, restore and monitoring are proven, and no quota/feature gap is present. Only evaluate Postgres/Supabase/another database after a repeatable measured failure at ≥1.5× expected peak, a hard D1 quota/restore/operational limitation, a required database feature D1 cannot safely provide, or a measured total-cost/operational advantage. Do not migrate speculatively.

## 9. LINE Readiness

Existing foundation:

- The product boundary is correct: **Customer → Business-owned LINE OA → LINE Messaging API → Meawketting Business Inbox**. Meawketting is not modeled as a central chat proxy.
- BE6 has a `line` adapter, raw-body HMAC verification, destination checking, text-event decoding, provider message IDs, external subject storage, Business/Branch channel records, durable messages, outbox leases/attempts, retry keys, webhook deduplication, and explicit disconnected/mock state.
- `lineSecretResolver` expects a server-only JSON secret binding keyed by an opaque `secretRef` tied to the Business and external account. No credential is present.

Still required for production:

- Business OA onboarding, channel ownership verification, credential provisioning/rotation/revocation, and reconnect/disconnect UI/process.
- Webhook URL configuration, signature/destination verification in the deployed environment, duplicate/replay operations, and a scheduled drain/retry trigger.
- Delivery failure visibility, retry exhaustion support, rate/cost monitoring, provider status handling, and customer support runbook.
- Explicit external-identity linking policy. LINE identity must not become Pet ownership or Guardian authority by inference.
- Message retention/deletion, privacy copy, attachment policy, and any notification/read-state promise.

**Recommendation:** LINE is **CAN WAIT** for the default first pilot. It becomes **MUST HAVE only by Product Owner decision** if customer messaging is the primary adoption or revenue hypothesis. Do not connect real LINE in PROD0.

## 10. Payment Readiness

The financial foundation is useful and deliberately provider-neutral:

- BE7 stores Charge, Charge Items, Payment, allocation, refund, attempt, event, and reconciliation-shaped records in D1.
- Manual payment recording is separate from service completion and supports whole-THB values, Branch scope, idempotency, overpayment prevention, refund allocation, and role checks.
- Provider contracts model create/reconcile/verify/decode, but the API explicitly constructs BE7 with no selected provider resolver. No provider call or real money movement is asserted.

**Recommended first-pilot policy:** use manual payment records only; keep online gateway processing out unless checkout conversion is the success metric. If manual money is accepted, decide who can record/refund, required reference/proof, correction rules, reconciliation cadence, and customer-facing receipt language.

If a gateway is later selected, prefer a hosted checkout/tokenization path to reduce card-data scope. Add signed provider webhooks, event deduplication, idempotent attempts, ambiguous-response reconciliation, settlement/refund/chargeback handling, and Thai tax/accounting policy. Do not promise a tax invoice from the current Billing foundation.

## 11. Media/R2 Decision

**Default:** defer R2 for the first narrow pilot. R2 is required only if the PO makes Pet photos, grooming before/after, Hotel/Daycare media, or Guardian-facing Passport media part of the pilot promise.

Current truth: `.openai/hosting.json` has `r2: null`; the schema stores photo metadata/object keys but no bytes; public marketing assets are static files. Therefore R2 is not an accidental missing dependency for the current local foundation.

If media becomes MUST, the minimum design is:

- private R2 bucket, opaque object keys scoped to Business/Branch/Pet/service record;
- authenticated upload endpoint with server-side authorization, allowlisted content types, size/pixel limits, and no client-chosen executable path;
- metadata in D1 only, never image bytes;
- short-lived signed reads after the same Business/Branch/Guardian authorization check;
- delete/revoke behavior, retention, backup/export, and abuse/malware policy before launch.

The current large public image findings are a separate frontend performance issue, not an R2 requirement. Current source images include several 1.8–2.1 MiB banners, and `BusinessIdentityAvatar` reuses large banner sources as avatars; optimize these before public launch.

## 12. Data Operations / Backup / Recovery

Minimum launch requirements:

- **Migration workflow:** review schema diff; apply forward-only migration to staging; replay from empty; run authorization/correctness smoke; obtain approval; apply production; record migration ID and result.
- **Schema safety:** no destructive down migrations. Deploy backward-compatible code before schema removal. Use feature flags or provider disconnects for rollback.
- **Environment separation:** distinct dev/staging/production D1 IDs, Worker environments, domains, secret bindings, logs, and access controls. Production must never set `MEAWKETTING_AUTH_MODE=dev-test` or run demo seeds.
- **Backup:** use the selected D1 plan’s recovery capability and an independent export strategy if the PO/legal retention requirement exceeds the platform window. Current Cloudflare documentation describes D1 Time Travel as always-on point-in-time recovery, with plan-dependent windows; verify the account plan and operational commands before relying on it. See [D1 Time Travel and backups](https://developers.cloudflare.com/d1/reference/time-travel/) and [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).
- **Recommended frequency:** at least daily recoverable export/snapshot for a low-volume pilot plus a pre-migration recovery point; the PO/legal owner must set retention, not engineering invent a legal period.
- **Restore testing:** before pilot, restore a production-like copy to a safe target and verify row counts, migrations, authorization, reports, payments, and no secret/PII leakage. Repeat monthly during pilot or after any backup-system change.
- **RPO/RTO:** recommend starting targets of RPO ≤24 hours and RTO ≤4 hours for a small pilot; the PO must approve or replace them.
- **Retention/deletion:** decide separate policies for customer contact data, Passport/Consent/Intake data, messages, audit events, payment/refund records, media, and backups. Do not claim legal compliance or deletion until Product/legal sets the policy.
- **Timezone/DST:** for a Thailand-only pilot, explicitly set Branch timezone to `Asia/Bangkok` and test local date/midnight boundaries. Before supporting zones with DST, store real instants in UTC and render Branch-local civil times; current BE3 local-value arithmetic is not a general DST proof.
- **Incident/rollback:** keep the previous Worker version deployable, never roll back schema destructively, disconnect failed providers safely, preserve audit evidence, and document owner/on-call/escalation paths.

## 13. Observability

Smallest viable system:

1. Enable native Workers Logs/Observability for the production Worker and retain only structured, redacted fields: request ID, correlation ID, route, method, status, duration, outcome/error code, Business/Branch opaque IDs where safe, and job/provider event IDs.
2. Keep request/correlation IDs on all Business APIs and add them consistently to the LINE webhook path. Never log request bodies, QR values, auth tokens, customer contact details, Passport fields, message bodies, or payment credentials.
3. Add a no-PII health/readiness check that distinguishes Worker liveness, D1 reachability, migration version, and provider/outbox readiness without exposing records.
4. Alert on application/Worker exceptions, D1 errors/overload, unexpected authorization denials, failed webhook verification, stuck/failed outbox attempts, LINE delivery failures when enabled, payment reconciliation mismatches, migration failures, backup failures, and unusual conflict rates.
5. Give the operator one low-cost view or daily report for last successful deploy/migration/backup, health, failed outbox/reconciliation, and recent critical errors. A full analytics platform is unnecessary for the first pilot.

Cloudflare’s current documentation supports native Workers Logs, sampling, and optional export; the visible local Wrangler file does not configure observability. Verify the production setting and retention/plan behavior. See [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) and [Workers observability](https://developers.cloudflare.com/workers/observability/).

## 14. Technical Debt Priority

| Finding | Pilot impact | Classification | Rationale/action |
|---|---|---|---|
| Root TypeScript glob includes `/workfiledesign` | Does not directly affect the built Worker, but obscures CI signal. | FIX BEFORE PUBLIC LAUNCH | Create an intentional CI/typecheck boundary; do not modify or broadly exclude the design source in this audit. |
| Frozen Consumer/shared diagnostics | Consumer is paused; root tsc is noisy. | SAFE TO DEFER | Keep isolated and unchanged; repair only in a Consumer maintenance track or when root CI becomes a launch gate. |
| Test `.ts` import diagnostics under root tsc | Test runner works, but root evidence is not clean. | FIX BEFORE PILOT | Make the test/CI compiler boundary explicit so a failed gate cannot be mistaken for a product pass. |
| Current BE8 scoped type error at `BusinessHome.tsx:110` | Directly affects current Business route validation. | FIX BEFORE PILOT | Reconcile `bookingId` versus `id` in the current worktree and rerun scoped checks. |
| Current UI/docs/product drift; six rendered failures | Public landing and Business Home/Billing/Reports contracts are not at one known checkpoint. | FIX BEFORE PILOT | Confirm PO intent, then update the current UI or canonical evidence; do not weaken tests. |
| TeamOperations lint warning in historical docs | Not reproduced by current direct ESLint run. | IGNORE / EXPECTED | Refresh the evidence record; do not spend pilot scope on an unconfirmed warning. |
| Large public images (roughly 1.8–2.1 MiB banners) | Slower first load and higher transfer, especially on mobile. | FIX BEFORE PUBLIC LAUNCH | Optimize/resize/compress and retain responsive sources; safe to defer only if pilot performance measurements pass. |
| Business Home image loading/carousel | Multiple large variants can be requested as users navigate. | FIX BEFORE PUBLIC LAUNCH | Measure and reduce eager/duplicate loads; not a core D1 blocker. |
| Oversized avatar source | Large banner assets are reused for identity avatars. | FIX BEFORE PUBLIC LAUNCH | Add small purpose-built avatar crops/placeholders; safe to defer for a controlled pilot. |
| Globally imported CSS | Source CSS is about 1.07 MiB across global/business files; built client CSS is about 871 KiB. | FIX BEFORE PUBLIC LAUNCH | Split or reduce route-global CSS after pilot behavior is stable; confirm first-load performance. |
| Suspicious PNG/JPEG mismatch | Source `public/images` signatures matched their extensions in this audit. | IGNORE / EXPECTED | Do not treat generated `dist/tmp/workfiledesign` artifacts as source; retain the binary check in CI if desired. |
| `tmp`, `dist`, `.next`, `.vinext`, `.wrangler`, logs, build metadata | Local/generated artifacts are visible but ignored. | IGNORE / EXPECTED | Keep them out of commits and deployment packages; do not delete user artifacts during PROD0. |

## 15. Cost Risks

This is a cost-driver model, not a forecast. Auth, LINE, payment, domain, and tax costs cannot be priced responsibly until the PO selects providers, region, plan, volume, and legal/accounting posture.

| Cost bucket | Type | Main driver | Keep cost low |
|---|---|---|---|
| Worker/Vinext | Fixed + usage | Account plan, dynamic requests, CPU duration, Cron/queue invocations. | One Worker; set CPU limits; avoid unnecessary dynamic requests. |
| D1 | Usage + storage | Rows read/written, storage, query shape, reports, repeated hydration, database plan. | One D1; index/paginate; avoid full-table reports and duplicate reads. |
| R2 | Usage-based | GB-month, Class A/B operations, retrieval class, media volume. | Defer media; use private Standard storage and bounded thumbnails if later required. |
| Auth provider | Per merchant/seat/MAU/feature | Login volume, recovery email, MFA, enterprise features, support tier. | Select a provider with pilot-sized pricing and no unnecessary enterprise tier; verify current quote. |
| LINE | Per Business OA and usage | OA/account setup, destination/message rules, message volume, rich media, country/plan. | Make LINE conditional; do not create an OA per pilot store before the messaging hypothesis is approved. |
| Payment | Transaction-dependent | Gateway fee, payment method, settlement, refunds, chargebacks, tax/accounting. | Manual payment first; if gateway is required, use hosted checkout and model worst-case refund/chargeback cost. |
| Logs/monitoring | Fixed + usage | Log events, retention, export volume, alert destination. | Native Workers Logs plus one alert sink; redact and sample low-value success logs. |
| Backups/storage | Operational | Export frequency, retention, restore copies, media/data retention. | Daily recovery point and periodic drill; avoid indefinite duplicate copies. |
| Domain/operations | Fixed | Domain, transactional email, support/on-call, device testing, legal/accounting. | One domain/environment pattern and a named operator; avoid paid SaaS until it removes a real pilot burden. |

Current Cloudflare public references describe a Workers Paid minimum account charge of $5/month, D1 row/storage usage pricing, Workers Logs included quotas/retention, and R2 storage/operation pricing; these are plan documentation, not a Meawketting forecast, and must be rechecked at purchase time. See [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Workers Logs pricing](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), and [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

Unnecessary fixed-cost architecture for now: Postgres/Supabase, Durable Objects, KV, Hyperdrive, a third-party observability suite, R2 before media scope, a queueing platform before measured need, a central chat proxy, and a full accounting/HR stack.

## 16. Product Owner Decisions Required

1. **What is the pilot envelope?** Recommended default: 3–5 Business accounts, up to 2 Branches each, one or two selected service modules, and a named success metric. A smaller envelope reduces QA and support cost; a larger one changes the D1 load gate and staffing plan.
2. **Which auth category and login methods are approved?** Recommended default: managed OIDC with email recovery plus Google if it removes pilot friction. Self-operated auth lowers vendor spend but adds security/operations burden; closed workspace SSO is cheaper only for a deliberately private pilot.
3. **Is the pilot owner-only or multi-person?** Recommended default: owner plus invite-only Manager/Staff with Branch grants. Owner-only is simpler but cannot validate team workflows and is not a substitute for invitations.
4. **Is LINE OA messaging a first-pilot success metric?** Recommended default: no—defer it. Making it MUST adds OA onboarding, secrets, webhooks, scheduled delivery, support, and message costs.
5. **Are Guardian/Passport/QR flows in the pilot?** Recommended default: no—use manual verified intake if needed. Including them requires production Guardian authority, identity linking, Consent policy, and a privacy/legal review.
6. **Is money manual-only or gateway-enabled?** Recommended default: manual records only. A gateway adds provider selection, fees, signed webhooks, reconciliation, refunds/chargebacks, and accounting/tax decisions.
7. **What is the refund and receipt promise?** Recommended default: controlled manual refund records and an internal payment acknowledgement, not a tax invoice. A tax/VAT invoice promise requires legal/accounting policy and document delivery.
8. **Are photos/media required to prove pilot value?** Recommended default: no; keep logo as text/initial fallback and defer Pet/grooming/Hotel/Daycare media. If yes, approve R2/private access, retention, deletion, and storage cost.
9. **What data retention/deletion policy and recovery target apply?** Recommended default: PO/legal sets categories; engineering proposes RPO ≤24h/RTO ≤4h for the pilot. Longer retention or deletion exceptions affect backups, audit, payments, messages, and media.
10. **Is the pilot Thailand-only?** Recommended default: yes, with Branch timezone `Asia/Bangkok`. Supporting other timezones/DST expands the time model and acceptance matrix.
11. **Who owns support and incident decisions?** Recommended default: one named operator with a backup, agreed support hours, and a stop/rollback authority. Without an owner, health alerts do not create recoverability.

## 17. Recommended Production Roadmap

No BE9 is created. This is a production track over the existing BE1–BE8 foundation.

### PROD1 Production Authentication

- **Objective:** make Business identity real and fail closed safely.
- **Major scope:** selected managed OIDC/auth integration, callback/token verification, secure session cookie, logout/revocation, owner onboarding, invite/recovery flows, external subject → Person mapping, audit, removal of dev-test from production.
- **Dependencies:** decisions 1–3 and a staging domain/resource.
- **PO decision before start:** auth category, login methods, owner-only versus invited staff, session/MFA policy.
- **Definition of Done:** no caller-controlled identity in production; login/recovery/logout/invite/revoke tests pass; BE1–BE8 cross-tenant tests run through the production adapter; no secret/token in browser storage or logs.
- **Manual QA:** create owner; sign in/out; recover account; invite Manager/Staff; accept expired/valid invite; switch Branch; revoke/suspend; verify a foreign Business URL/API returns no data.

### PROD2 Security & Privacy Hardening

- **Objective:** close the public attack and data-exposure gaps around the authenticated foundation.
- **Major scope:** security headers, rate limits, abuse/lockout policy, CSRF/origin rules, cookie flags, error normalization, secret handling/rotation, PII/log redaction, QR/Consent/Passport boundary tests, dependency/SCA check, timezone policy.
- **Dependencies:** PROD1 and decisions 5, 8–10.
- **PO decision before start:** public versus closed pilot, supported timezone, data categories and deletion/recovery policy.
- **Definition of Done:** black-box security matrix has zero unauthorized data successes; redacted logs and headers are verified; production error and rate-limit behavior is documented.
- **Manual QA:** use two Businesses and two Branches; attempt direct URL/API/object substitution; replay QR/webhook; use expired/revoked Consent; inspect response headers and confirm no sensitive data appears in logs/support screenshots.

### PROD3 Cloudflare Production Infrastructure

- **Objective:** create a reproducible, separated Cloudflare deployment.
- **Major scope:** staging/prod Worker environments, real D1 resource IDs, forward-only migration pipeline, custom domain/DNS/TLS, secret bindings, CPU limits, image binding decision, optional Cron trigger, deployment version/rollback record, no production seed path.
- **Dependencies:** PROD1/PROD2 security contract; approved Cloudflare account/budget.
- **PO decision before start:** pilot domain, region/account ownership, operating budget, and whether scheduled provider jobs are in scope.
- **Definition of Done:** staging and production are distinct; deployment from a clean checkout succeeds; production uses real auth and no fixture mode; migration and rollback runbooks are rehearsed.
- **Manual QA:** open the staging/prod domain; verify TLS/domain; sign in; run one Booking and one selected service flow; confirm a staging change cannot appear in production; confirm Cron/image behavior only when configured.

### PROD4 Required External Integrations

- **Objective:** add only the external capabilities the PO made MUST.
- **Major scope:** selected LINE OA onboarding/delivery or hosted payment gateway or private R2 media; credentials/rotation; signed webhooks; event dedup/replay; retry/reconciliation; provider disconnect/failure state; cost counters and support path.
- **Dependencies:** explicit decisions 4, 6, and 7–8; PROD3 secret/environment controls.
- **PO decision before start:** exact provider, contract/fees, account ownership, customer-facing promise, refund/media/message policy.
- **Definition of Done:** provider sandbox/live smoke passes; ambiguous and duplicate events are safe; failed delivery/payment/upload is visible and recoverable; no central chat proxy or inferred Guardian authority is introduced.
- **Manual QA:** connect/disconnect/reconnect; send/receive a test message if LINE is approved; repeat a webhook; complete/refund a sandbox payment; upload/read/delete an authorized media object; verify a foreign Business cannot access it.

### PROD5 Operations / Backup / Recovery / Observability

- **Objective:** make live data supportable and recoverable.
- **Major scope:** Workers Logs/alerts, health/readiness, D1/Worker error dashboards, backup/export, restore drill, migration/rollback runbooks, retention/deletion operations, incident/on-call ownership, RPO/RTO measurement.
- **Dependencies:** PROD3 and any selected PROD4 integration.
- **PO decision before start:** recovery targets, retention/legal owner, support hours, escalation and stop/rollback authority.
- **Definition of Done:** restore drill meets target; injected failures create actionable alerts; a named operator can diagnose correlation ID → audit/job/provider state; rollback does not require destructive schema reversal.
- **Manual QA:** trigger/observe a health failure; inspect a request by correlation ID; run a safe restore drill; confirm backup/migration timestamps; follow the incident checklist from alert to recovery.

### PROD6 Pilot Store / Launch QA

- **Objective:** prove the selected Business workflow with real pilot operators and controlled data.
- **Major scope:** pilot account setup, staff/device/browser matrix, selected service journeys, manual payment/refund process, consent/QR only if approved, accessibility/mobile checks, D1 load gate, support rehearsal, go/no-go review.
- **Dependencies:** PROD1–PROD5 complete; pilot envelope and success metric approved.
- **PO decision before start:** final pilot stores/Branches, launch date/window, go/no-go owner, and which conditional features are explicitly excluded.
- **Definition of Done:** all launch blockers closed; zero critical security/data defects; D1 exit gate passes; restore/alerts/support are proven; Product Owner signs the scope and “not included” list.
- **Manual QA:** each pilot role completes sign-in/recovery, Branch switch, Booking, selected service execution, customer/pet lookup, manual payment/refund if approved, report review, and failure recovery on the actual device/browser set.

## 18. Immediate Next Action

Run one Product Owner decision gate to lock the pilot envelope, auth category, LINE/payment/media scope, timezone, recovery targets, and support owner; record those decisions before starting **PROD1 Production Authentication**. Until that gate is complete, keep the repository in audit/local-validation mode and do not deploy or connect providers.
