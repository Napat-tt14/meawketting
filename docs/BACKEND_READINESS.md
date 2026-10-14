# Backend Readiness — D1 migration

## Guardian foundation — 2026-09-22

**IMPLEMENTED:** BE1–BE8 D1 and BE5 authority/Passport/consent/grants/Intake. **PLANNED:** Guardian Mini App with type-only `app/_backend/guardian/contracts.ts`. **PAUSED:** standalone Consumer expansion. **NOT IMPLEMENTED:** Guardian identity/onboarding/session/APIs/deployment. **PRODUCT DECISION REQUIRED:** authority establishment and disclosure. **EXTERNAL DEPENDENCY:** real LINE/Cloudflare setup. See [Guardian handoff](./GUARDIAN_LINE_MINIAPP.md).

Reuse BE5 `GuardianGrantService.issue/decide`: production mode requires active primary authority and active Person, Branch scope, three Passport categories and 120/480/1440-minute durations. External identity tables exist; Guardian provisioning and safe Pet/Intake/history/media projections do not. No persistence, repository or schema is added by the scaffold.

Status: IMPLEMENTED / TESTED LOCALLY / EXTERNAL CONFIG REQUIRED / NOT YET DEPLOYED.

Cloudflare Worker/Vinext → API → Application/Domain → D1 Repository → Cloudflare D1 is the only active Business persistence architecture. Direct Google/LINE OAuth with D1 sessions supplies identity; Meawketting supplies authorization. Private R2 supplies media. See [setup runbook](./PRODUCTION_RUNBOOK.md) and [validation](./VALIDATION.md).

## Domain parity

| Phase | Durable or derived behavior |
|---|---|
| BE1 | Person, Business, active Membership, explicit Branch access, modules/hours and audit |
| BE2 | Business Customer, Business-local Pet profile and contact links; Customer is not Guardian |
| BE3 | Booking/Calendar/Resources, reservations, capacity, revision checks and idempotency |
| BE4 | Grooming/Hotel/Daycare execution, staff, tasks, events, Service Records; Booking is not execution |
| BE5 | Guardian authority, Consent, scoped/expiring/revocable grants, Intake and Passport access |
| BE6 | Provider-neutral Inbox, messages, read cursors, approvals, outbox and webhook deduplication |
| BE7 | Charges, Payments, allocations/refunds, attempts/reconciliation; completed is not paid |
| BE8 | Read-only Reports/CRM projections over canonical domain records |

Normalized identifiers, foreign keys, uniqueness, indexes, append-only histories and relational guards are retained. Atomic D1 batches, SQLite triggers, guarded statements, optimistic revisions and unique receipts protect critical mutations. D1 has no D1 pool/manual transaction/advisory-lock implementation. Money persists as INTEGER minor units and timestamps as canonical UTC ISO text. Existing BE1/BE2 contracts do not provide revision/idempotency keys for every edit; the wider stale-form follow-up is not resolved by changing databases.

## Authentication and authorization

Google/LINE login uses direct authorization-code PKCE, state/nonce validation and verified provider subjects. D1 stores identity linkage and only hashes of opaque session tokens; secure HttpOnly host-only cookies carry the tokens. Logout revokes sessions. Email/password login was explicitly removed. Person → active Membership → Business → Branch → target/action checks remain mandatory in server queries and commit guards; D1 has no Supabase RLS. No email-based Owner bootstrap, browser role authority or direct table access exists.

The development identity adapter remains explicitly local/test-only and fails closed in production. Recovery/account relinking preserves Person and requires provider/operator verification.

## Media

R2 provisioning was explicitly declined. No bucket exists; the `MEDIA` binding/API is implemented and tested locally only, and cannot serve production media yet.

Private R2 supports Business logo, Pet photo, Grooming before/after and Hotel/Daycare media without adding media UI. Authorized uploads validate size/MIME/magic bytes and use scoped keys; metadata lives in D1. Reads stream through the Worker after fresh authorization with private, no-store headers. They are authenticated URLs, not public or independently signed expiring links. Real R2 transfer and provider behavior remain acceptance checks.

## Scope kept frozen

Business-first; Consumer PAUSED; Customer ≠ Guardian; LINE identity ≠ Pet authority; Business never owns Pet Passport; Booking ≠ execution; Charge ≠ Payment; completed ≠ paid. Reports/CRM have no writable source tables. Branch authorization remains server-side. LINE Seed Sans TH and Business UX/UI remain unchanged. /workfiledesign is protected.

The production D1 schema has been applied and verified through the Dashboard: 70 STRICT domain tables, 133 indexes, 81 triggers, one view, one `0001_initial.sql` migration entry and zero foreign-key orphans. Source data transfer, OAuth/environment setup, provider callbacks and performance remain pending; Wrangler credentials still lack D1 write permission. R2 provisioning was declined and no bucket exists. No LINE Mini App runtime, payment gateway choice, deployment, commit or push was introduced.
