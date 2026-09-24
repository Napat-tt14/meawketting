# Backend Readiness — Supabase migration

## Guardian foundation — 2026-09-22

**IMPLEMENTED:** BE1–BE8 PostgreSQL/Supabase and BE5 authority/Passport/consent/grants/Intake. **PLANNED:** Guardian Mini App with type-only `app/_backend/guardian/contracts.ts`. **PAUSED:** standalone Consumer expansion. **NOT IMPLEMENTED:** Guardian identity/onboarding/session/APIs/deployment. **PRODUCT DECISION REQUIRED:** authority establishment and disclosure. **EXTERNAL DEPENDENCY:** real LINE/Supabase/Cloudflare setup. See [Guardian handoff](./GUARDIAN_LINE_MINIAPP.md).

Reuse BE5 `GuardianGrantService.issue/decide`: production mode requires active primary authority and active Person, Branch scope, three Passport categories and 120/480/1440-minute durations. External identity tables exist; Guardian provisioning and safe Pet/Intake/history/media projections do not. No persistence, repository or schema is added by the scaffold.

Status: IMPLEMENTED / TESTED LOCALLY / EXTERNAL CONFIG REQUIRED / NOT YET DEPLOYED.

Cloudflare Worker/Vinext → API → Application/Domain → Repository → Supabase PostgreSQL is the only active Business persistence architecture. Supabase Auth supplies identity; Meawketting supplies authorization. Supabase Storage supplies private media. See [setup runbook](./PRODUCTION_RUNBOOK.md) and [validation](./VALIDATION.md).

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

Normalized identifiers, foreign keys, uniqueness, indexes, append-only histories and relational guards are retained. Native PostgreSQL triggers and SERIALIZABLE transactions replace SQLite writer serialization. Serialization/deadlock retries repeat the entire transaction; explicit affected-row parameters replace connection-local changes(). Optimistic revisions and request receipts remain in the existing domain contracts. Existing BE1/BE2 request contracts do not provide client revisions/idempotency keys for every edit; the prior cleanliness audit's wider retry/stale-form follow-up is not resolved by changing databases.

## Authentication and authorization

Google login uses Supabase PKCE, secure HttpOnly host-only cookies, verified getUser identity, explicit UUID-to-Person mapping, and provider logout. Server-side Person → active Membership → Business → Branch → target/action checks remain mandatory. No email-based Owner bootstrap, browser role authority or direct table access exists. RLS and revoked API-role grants are defense-in-depth, not application authorization.

The development identity adapter remains explicitly local/test-only and fails closed in production. Recovery/account relinking preserves Person and requires provider/operator verification.

## Media

Private business-media bucket supports Business logo, Pet photo, Grooming before/after and Hotel/Daycare media without changing UI. Authorized bounded uploads validate size/type/signature and opaque paths; metadata lives in PostgreSQL. Reads require current authorization and expire after 60 seconds. Real bucket policies/provider behavior remain staging checks.

## Scope kept frozen

Business-first; Consumer PAUSED; Customer ≠ Guardian; LINE identity ≠ Pet authority; Business never owns Pet Passport; Booking ≠ execution; Charge ≠ Payment; completed ≠ paid. Reports/CRM have no writable source tables. Branch authorization remains server-side. LINE Seed Sans TH and Business UX/UI remain unchanged. /workfiledesign is protected.

No production credentials, customer data, LINE Mini App, payment gateway choice, deployment, commit or push was introduced.
