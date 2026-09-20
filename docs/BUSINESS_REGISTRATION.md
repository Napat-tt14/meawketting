# Business registration

Product Owner decision, 2026-09-20: verified new users may create a store after completing and confirming its details. This supersedes invitation-only onboarding for new store owners. It does not permit OAuth callbacks or client claims to assign Business authority.

## Implemented

- `/business/register`: responsive Thai registration page using existing Warm White/Pastel Yellow tokens and LINE Seed Sans TH. Google and LINE identity → shop details → explicit confirmation → Branch settings.
- `/api/auth/line/start` selects Supabase `custom:line`; Google retains its existing route. Both use Supabase PKCE and the existing `/api/auth/google/callback` server callback. The callback sends unlinked identities to registration without creating domain records. Linked inactive accounts still fail closed.
- `/api/business/register` verifies the user server-side, validates bounded same-origin input, and atomically creates Person, Business, first Branch, Owner membership, selected service modules, closed initial weekly hours, identity link, confirmation receipt and audit event. No customer, guardian or passport authority is created.
- PostgreSQL migration `202609200004_business_registration.sql` adds the private receipt table. Per-account transaction locks and a canonical request hash make identical concurrent retries return one store; changed retries conflict. Existing linked accounts cannot self-promote through signup. Failed transactions leave no partial authority.
- Phone and optional email are contact information, not verified phone/email ownership or legal-business checks. The checkbox confirms the applicant's declaration. Opening hours must be configured before accepting bookings.

## External configuration required — not yet deployed

1. Apply migrations with `npm run db:migrate` using the staging administrator connection. Keep Worker database credentials server-side and authorize its runtime role for the new receipt table as part of the existing privilege review.
2. Enable Google in Supabase Auth and configure Google client ID/secret there. Copy the Supabase callback shown in the dashboard into Google's authorized redirect URIs.
3. Create a **LINE Login** channel (web app), separate from any messaging channel. In Supabase Authentication → Sign In / Providers → Custom Providers, add identifier `line`, type **OAuth2**, with the LINE channel ID and channel secret. Configure:
   - Authorization URL: `https://access.line.me/oauth2/v2.1/authorize`
   - Token URL: `https://api.line.me/oauth2/v2.1/token`
   - Userinfo URL: `https://api.line.me/oauth2/v2.1/userinfo`
   - Scopes: `openid profile`; enable PKCE and `email_optional`. Userinfo subject/name/picture are `sub`, `name`, `picture`.
   - Copy the callback URL displayed by Supabase into the LINE channel callback settings. Enable appropriate test users while the channel is developing. Do not put the LINE secret in frontend code or Cloudflare browser bindings.
4. Set Supabase Site URL to the staging origin and allow exactly `https://STAGING_HOST/api/auth/google/callback`. The callback name is retained for compatibility and serves both providers. Configure the Cloudflare values listed in [the runbook](./PRODUCTION_RUNBOOK.md); no source edits are required.
5. Test both real provider redirects, cancellation, expired sessions, logout, fresh signup, repeated submission, revoked membership and Branch isolation with synthetic target accounts. LINE web ID tokens can use HS256, so this integration uses custom OAuth2 with userinfo, not an assumed JWKS-only custom OIDC configuration.

Sources: [Supabase custom providers](https://supabase.com/docs/guides/auth/custom-oauth-providers), [LINE Login API](https://developers.line.biz/en/reference/line-login/), [LINE ID-token verification](https://developers.line.biz/en/docs/line-login/verify-id-token/).

Use the same login provider for returning access. This feature does not implement manual cross-provider account linking or merge stores by contact email. Account recovery/relink remains an operator-verified process described in the runbook. LINE Login is authentication only, not a LINE Mini App or Pet authority.

## Validation

Local synthetic PostgreSQL tests cover concurrent duplicate registration, changed retries, rollback, no-email LINE users, existing identity denial, input validation, CSRF, missing authentication and provider PKCE. Real Supabase/LINE/Google and Cloudflare target configuration remain unconfigured and untested; this is not a production-readiness claim.

Local validation on 2026-09-20: frontend 94, backend 84 (including 5 registration tests), security/production 7, API smoke 1 suite with 41 requests across 10 routes: **186 passing tests**. Empty-database migrations and replay passed with all 4 migrations. Root typecheck, lint, build and diff whitespace checks passed. Browser QA used synthetic API responses: identity and details layouts at 375/768/1024/1440 pixels, no horizontal overflow, required inputs, failed-submit preservation, successful retry and existing-account state. Screenshots and run logs are local ignored files in `work/`.
