# Business registration

The 2026-10-13 Product Owner decision removes email/password login and keeps direct Google/LINE authentication. Existing Persons and memberships must be preserved. Signup and Business setup remain separate flows: provider identity → verified account → explicit shop details/declaration → first workspace → Home. OAuth alone creates no Owner authority.

`/business/login` and `/business/register` share the existing Thai branded page with Google and LINE links. They have no password fields or email-confirmation flow. Server account routing sends new, unlinked verified accounts to `/business/setup`, active linked members to `/business/home`, and rejects inactive or revoked linked access. Browser role/profile claims never authorize actions.

Setup retains the centered four steps: shop name → caretaker/contact → service selection → review/declaration. Back and review edits preserve values; reduced-motion users retain immediate transitions. The seven-field payload, first Branch default `สาขาหลัก`, optional contact email and closed initial weekly hours are preserved. Phone/email are contact information, not proof of ownership. Configure hours before accepting bookings.

`/api/business/register` validates a bounded same-origin request and the current D1 session. One atomic D1 batch creates Person, Business, Branch, Owner membership, selected modules, weekly hours, identity/session linkage, receipt and audit. A guard checks that this exact session is still live and the identity remains unlinked. A unique identity receipt and canonical request hash make identical concurrent retries return the same workspace; changed retries conflict. Any failure leaves no partial authority. Linked identities cannot create another Owner workspace or regain revoked membership through signup.

Google and LINE use state, nonce and S256 PKCE with the existing `/api/auth/google/callback` route. The Worker verifies tokens before creating an opaque D1 session. LINE does not need email. See [direct-provider configuration and session/media details](./D1-AUTH-MEDIA.md) and [production runbook](./PRODUCTION_RUNBOOK.md).

Migrate existing Google/LINE linkage using verified provider subjects, never by matching email or client claims. Former email-only Persons need an explicitly verified provider link before returning login; removing password auth must not create another Person. Provider linking/recovery requires deliberate operator verification. Business LINE login is not a Guardian Mini App or Pet authority.

The public pages intentionally check `GET /api/business/register`; a guest 401 remains quiet while failed writes and permission failures retain bounded diagnostics. OAuth start errors expose only safe allowlisted configuration reasons. A 302 verifies redirect construction only; it does not prove completed consent or callback.

Native SQLite tests verify registration concurrency, idempotency, changed retries, batch rollback, no-email LINE accounts, linked-account denial, validation, CSRF, absent/revoked sessions and duplicate provider subjects. Live provider accounts, transferred identity data and deployed callbacks remain untested; actual whole-project validation is recorded in [validation](./VALIDATION.md) and the migration report.
