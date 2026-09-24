# Guardian LINE Mini App

Status: **FOUNDATION READY — IMPLEMENTATION NOT STARTED**, 2026-09-22.
Owner: Product / Application Architecture. Canonical Guardian handoff; preserve the locked rules in [PRODUCT](./PRODUCT.md) and [ARCHITECTURE](./ARCHITECTURE.md).

| Label | Current truth |
|---|---|
| IMPLEMENTED | Business BE1–BE8, PostgreSQL/Supabase repositories, Person/Pet, BE5 authority/Passport/consent/grants/Intake and external identity schema; locally tested, not production readiness |
| PLANNED | Guardian LINE Mini App, routes and application actions below; type-only scaffold exists |
| PAUSED | Old standalone Consumer expansion; retained prototype is historical reference |
| NOT IMPLEMENTED | Real Guardian LINE integration, onboarding/authority provisioning, Guardian session/APIs/screens, Mini App production deployment, Guardian service-history projection |
| PRODUCT DECISION REQUIRED | Authority establishment, multi-Guardian policy, editable fields, history visibility and release choices in section 19 |
| EXTERNAL DEPENDENCY | Selected Supabase/Cloudflare environment, LINE provider/channel configuration and Mini App release requirements; no credentials connected here |

Priority: **Business → production readiness/pilot → Guardian LINE Mini App → broader standalone Consumer expansion (PAUSED)**. Foundation work does not authorize implementation or deployment.

## 1. Product purpose

Let a Pet Guardian securely manage Pet identity/Passport and Business access through LINE. Entry: open from LINE → verified identity/login → Mini App → My Pets → Pet Profile/Passport → Business-linked consent/actions.

This is not Business management, a social network, marketplace, central customer chat network or consumer super-app. Business never owns Pet Passport. Customer ≠ Guardian; LINE identity ≠ Pet authority.

## 2. MVP scope

**PLANNED IN MVP:** LINE entry/login; explicit identity-to-Person link; My Pets; Add Dog/Cat; Pet profile; Passport; explicit Guardian↔Pet authority; Temporary Business QR issuance/management; consent/access Allow/Reject; revoke; minimal Business-linked Intake status where safely projected.

Add Pet and authority activation require section 19 policy approval. Service History is **conditional**: excluded from the initial release until a safe Guardian projection and visibility policy are approved. Existing Business history is not evidence of safe Guardian access.

**FUTURE:** history after that gate, social feed, marketplace, loyalty, consumer booking marketplace, free-form chat network, AI assistant, community, complex notifications, subscription plans, broader Safety/Lost tooling and structured Inbox approvals. Notifications are outside this MVP; adding them requires separate scope approval. None starts automatically.

## 3. Authority model

```text
LINE identity → server-verified external identity → explicit Person mapping
             → explicit durable Pet authority → Pet
```

A LINE account, matching phone/email, Customer record, Customer↔Pet association or Business assertion never establishes Guardian authority. Identity verification is not legal ownership verification. In particular, `source='verified-provider'` is not permission to convert any verified LINE identity into authority.

Existing `pet_authorities` supports roles `primary`/`co-guardian`, statuses `active`/`inactive`, sources `dev-test`/`verified-provider`, provider reference and revision. BE5 grant issuance/decisions and protected Passport reads enforce **active primary authority**, active Person and an eligible source. Co-guardian grant permissions are not implemented.

| Planned UX state | Actual equivalent / gap |
|---|---|
| UNLINKED PERSON | Provider verified but explicit active Person mapping absent; no Pet reads |
| VERIFIED PERSON | Verified active external mapping and active Person; no automatic Pet rights |
| PET AUTHORITY PENDING | No qualifying authority; pending workflow/storage absent |
| PET AUTHORITY ACTIVE | Qualifying durable authority, rechecked for each object/action |
| PET AUTHORITY REVOKED | Existing `inactive` denies access; schema does not distinguish revocation from other inactivity |

These are presentation concepts, not new persisted enums. Authority establishment/legal verification is **PRODUCT DECISION REQUIRED**. Do not invent a duplicate Guardian model, pending table or automatic active authority row.

## 4. LINE identity architecture

```text
Guardian UI → Guardian Application API → identity adapter → LINE/provider verification
                                      → explicit Person mapping → identity-only session
```

Repository evidence:

- [`be1/identity.ts`](../app/_backend/be1/identity.ts) defines the Business identity boundary. [`supabaseAuth.ts`](../app/_backend/supabaseAuth.ts) verifies `getUser()` and resolves `auth_person_links`. Its callback routes to Business signup/home and checks Business membership; it is not a Guardian callback.
- `/api/auth/line/start` selects Supabase `custom:line` for **Business** login. [Business registration](./BUSINESS_REGISTRATION.md) documents external configuration. Code existence does not mean a connected LINE provider or Mini App session.
- `person_external_identities` maps unique `(provider, issuer, subject)` to Person, with verified timestamp and active/inactive status. `auth_person_links` separately maps a unique Supabase UUID to a unique Person. Reuse these foundations, without merging Persons by contact details.
- `business_channel_customer_links` maps Business OA contacts; it is not the Guardian mapping. Never copy OA subjects into central identity without verified provider/issuer/channel context.

**PLANNED adapter choice, not selected implementation:** evaluate the existing Supabase custom OAuth2 path with a Guardian-specific callback/session flow. Supabase supports custom OAuth2/OIDC providers, but this repo has no demonstrated Mini App/LIFF-token-to-Supabase-session bridge. Do not assume direct token exchange works. If incompatible, keep server LINE verification behind the neutral adapter and design session persistence/revocation before integration. Do not force unsupported auth or reuse Business registration to provision Guardians.

Verify provider proof server-side: issuer, audience/channel, signature/provider validation, expiry and nonce/state/request binding where applicable. Browser user IDs, decoded claims and profile objects are untrusted. Link conflicts fail closed with private recovery; no silent relink or phone/email match. Linking an existing Person requires control of the existing account and verified new identity.

Sessions require secure HttpOnly host-only HTTPS cookies, bounded expiry, verified refresh/rotation, same-origin mutation protection and explicit logout/server invalidation. Disconnected/deleted LINE accounts or inactive mappings/Persons must lose access; define detection/revalidation and recovery before launch. Do not promise immediate provider-disconnect detection without an implemented signal. No Pet permissions in token/session claims, secrets in browser bundles or provider tokens in logs. Missing configuration, failed verification and unresolved mapping expose no Pet data.

External evidence checked 2026-09-22: [Supabase custom providers](https://supabase.com/docs/guides/auth/custom-oauth-providers), [LINE server ID-token verification](https://developers.line.biz/en/docs/line-login/verify-id-token/), [LIFF user data on servers](https://developers.line.biz/en/docs/liff/using-user-profile/). These support the boundary, not an end-to-end compatibility or deployment claim.

## 5. Core data relationships

Schema authority: [`db/schema.ts`](../db/schema.ts), mirrored by `supabase/migrations`. No migration is introduced.

| Existing domain/table | Guardian reuse | Boundary / gap |
|---|---|---|
| `persons` | Global human identity | Active Person required; Guardian onboarding absent |
| `pets` | Global opaque shared Pet identity | BE2 anchor; no Guardian create command |
| `pet_authorities` | Explicit Person↔Pet authority | BE5 active primary enforcement; provisioning/disputes absent |
| `passport_profiles` | Shared name, species, reference, private photo key | No Guardian read/edit API |
| `consents` | Authority/Pet and Business/Branch decision | `pending`, `approved`, `denied`; no blanket consent |
| `access_grants` | Purpose, token hash, expiry, revoke, revision | Temporary Business access only |
| `access_grant_scopes` | Selected Passport categories | Three scopes today |
| `access_events` | Issuance/decisions/access history | Guardian-safe projection absent; raw metadata stays private |
| `business_intakes`, `intake_corrections` | Minimal Business-linked status | Notes/belongings/staff/correction text not automatically visible |
| `service_records`, `service_record_revisions` | Shared Pet service-history source | Business/Branch-authored private fields; Guardian projection absent |
| `person_external_identities` | Verified provider/issuer/subject → Person | Schema exists; real Guardian verifier/linking absent |
| `auth_person_links` | Supabase UUID → Person if compatible | Existing Business bridge; no Pet permission |
| `customers`, `business_pet_profiles`, `customer_pet_relationships` | Business-local operational context only | Never Guardian authority/canonical Passport; notes/tags/CRM remain private |

Global/shared does not mean public. Bookings, staffing, conversations, payments, CRM, resource assignments and raw Service Record snapshots are Business-local/private. Guardian APIs must construct allowlisted DTOs, never serialize Business responses or repository rows wholesale.

## 6. Pet creation

**PLANNED, policy-gated:** Add Dog/Cat validates bounded input, resolves Person server-side, creates a shared Pet anchor/Passport profile and establishes authority only under approved rules. Creating a draft does not establish authority. If policy permits immediate activation, write Pet/profile/authority atomically with an idempotency key; otherwise define the pending workflow before enabling submission.

No automatic Customer, BusinessPetProfile, membership or Business ownership. One Pet may interact with multiple Businesses through separate scoped grants and neutral relationships. Business-local profiles never silently overwrite canonical Passport identity. Duplicate warnings/review preserve records; no silent destructive merge, fuzzy identity matching or Customer-based claim. Advanced merging is deferred.

## 7. Pet Passport

| BE5 field category | Actual current behavior | Guardian plan |
|---|---|---|
| `basicIdentity` | Name/species (`cat`/`dog`); required for issuance/read | Human labels; edit policy required |
| `passportReference` | Optional `passportLabel` from reference | Authorized display, not raw DB ID |
| `photo` | Private photo key; BE5 returns `photoSrc: null` | Approved private-media adapter needed; no public URL fallback |

No medical/vaccine/behavior document support is claimed. Revisions, provider/authority IDs and audit metadata are not Passport content. Shared Guardian-controlled information stays separate from private Business records. Business reads require current scope/consent/expiry/authority; Guardian reads/edits require their own object authorization, not an outbound Business grant.

## 8. Temporary Business QR

Locked taxonomy: **Quick Passport QR**, **Public Safety QR**, **Temporary Business QR**. Only the last may authorize Business Intake; other identifiers never inherit its permission.

Reuse [`GuardianGrantService`](../app/_backend/be5/authority.ts): 32 random bytes in an opaque `tb_` token; hashed server storage; active named Business and Branch, purpose, fields, expiry, revoke, consent, revisions and access events. Current validation **requires Branch and basicIdentity**, permits only the three BE5 scopes and **120/480/1440 minutes**. Branch-optional grants and arbitrary durations do not exist. These limits are current code, not a newly approved production-duration policy.

Future UI issues/displays/manages grants through the API. Plaintext is returned only on first issuance; idempotent replay returns `token: null`. Never synthesize QR from a grant ID or claim hash recovery. Explain a lost issuance response and offer explicit revoke/new issuance. No personal data in QR, token logging or Quick/Public Safety fallback.

## 9. Consent UX

**PLANNED:** Business request/use → Guardian sees Business display identity, Branch, purpose, requested field labels and duration/expiry → **Allow / Reject** → active access → **Revoke anytime**, subject to still-valid authority. No vague blanket consent or technical enums in UI.

BE5 can issue with an explicit approved decision or pending consent. Pending Intake can start but cannot reveal Passport fields or complete protected transitions. Use existing `decide` with `approved`, `denied` or `revoke`, revision and request key. Approval does not renew expiry. Creating a QR, starting Intake and approving access are distinct. Refresh conflicts; never optimistic success. Revoked authority already denies grant access and cannot mutate it.

## 10. Service history

BE4 creates one source-keyed Service Record from completed Grooming or checked-out/completed Hotel/Daycare execution; BE8 derives Business history. It is shared Pet service history, never a separate CareProof product/module.

**NOT IMPLEMENTED for Guardian:** no safe cross-Business query/detail DTO. `ServiceRecordView`, `snapshot_json` and revisions include private notes, staff/resource labels and correction history. Even editable summary text is not automatically public-safe.

**Recommendation, PRODUCT DECISION REQUIRED:** later allowlist Business/Branch display names, service module/label and completion time from existing data. The fields exist but their Guardian disclosure is not approved. Exclude notes, CRM, staffing, resources, internal activities/corrections, photos, operational instructions and finances. Define visibility/correction/retention before enabling list/detail; until then omit the feature, not a fake successful empty history.

## 11. UI / UX direction

Mobile-first for LINE webview/mobile browser, Thai-first, visual-first and lightweight. Pet image/name anchors the screen; one primary action, minimal text, touch targets at least 44px, accessible labels/status and simple back navigation. No Business dashboard/CRM shell or giant tab system.

Provisional IA: Home/My Pets → Pet Detail → Passport / Share Temporary QR; Access/Consent and Profile/Account as lightweight destinations. History appears only after its gate. Use an honest neutral image placeholder when needed, never fixture Pets.

## 12. Initial route map

**PLANNED only; none registered by this task:**

| Route | Purpose |
|---|---|
| `/guardian` | Entry/session/onboarding gate → My Pets |
| `/guardian/pets` | Authorized list; Add Pet is a task, not necessarily another route |
| `/guardian/pets/[petId]` | Authorized Pet detail |
| `/guardian/pets/[petId]/passport` | Passport |
| `/guardian/pets/[petId]/share` | Temporary Business QR |
| `/guardian/access` | Consent and grant management |
| `/guardian/account` | Linked identity/session/logout |
| `/guardian/pets/[petId]/history` | Conditional future list/detail |

Repo uses App Router `page.tsx`/`layout.tsx`, BusinessPortalFrame and ConsumerShell. Root layout injects SiteHeader/RouteFooter/global styles: a route group alone does not escape this chrome. A future Guardian shell must handle it deliberately while preserving Business rendering. No page/layout/redirect is added now. Old `/my-pets`, `/create-passport`, `/temporary-access` and safety surfaces remain frozen references, not production Guardian contracts.

## 13. API boundary

```text
Guardian UI → Cloudflare Application/API → identity + Person resolution
            → per-Pet domain authorization → existing domain services
            → repository → Supabase PostgreSQL
```

All actions below are **PLANNED**, not callable endpoints:

| Conceptual action | Reuse / work required |
|---|---|
| `getGuardianSession` | Verify session, explicit identity mapping, active Person; no Pet claims |
| `listGuardianPets`, `getGuardianPet` | Existing Pet/Passport/authority; object checks, never Customer lookup |
| `createGuardianPet`, `updateGuardianPet` | Policy-gated orchestration of existing entities; no duplicate store |
| `getPetPassport` | New authorized Guardian projection; BE5 recipient read is not Guardian auth |
| `issueTemporaryBusinessGrant` | Existing BE5 `GuardianGrantService.issue`, server Person, verified-provider mode |
| `decideAccessGrant`, `revokeAccessGrant` | Existing BE5 `decide`, preserving revisions/request keys |
| `listAccessGrants` | New authorized projection of existing grant/consent/events |
| `getGuardianIntakeStatus` | Minimal Pet-authorized projection; never raw `IntakeResult` |
| `listGuardianServiceRecords`, `getGuardianServiceRecord` | Conditional safe history projection after policy approval |
| `logoutGuardianSession` | Invalidate session/refresh path; provider disconnect is a separate lifecycle |

`POST /api/be5` is Business membership-authorized scan/Intake; it exposes no Guardian issue/decide. `/api/dev/guardian` is development/test-only (404 otherwise), not a production API. Never repurpose it or accept its actor header/dev-test mode in production.

Type-only [`guardian/contracts.ts`](../app/_backend/guardian/contracts.ts) defines neutral verification/session contracts and aliases BE5 grant signatures. No runtime auth is implemented. Types are not proof: future API validates input, resolves identity and checks current object authority; BE5 repeats persistence guards. No direct browser DB/Data API, duplicate persistence, successful runtime stub or new schema.

## 14. Security model

Production requirements, **not implemented Guardian claims**:

- Verified LINE identity, explicit active Person mapping and per-object Pet authorization for lists, deep links, writes and media; no Customer inference or ID enumeration.
- Scope/Business/Branch filtering, expiry/revoke enforcement and existing BE5 transactional checks, revisions and idempotency.
- Rate limiting, bounded inputs, secure sessions, CSRF/same-origin checks, state/nonce/PKCE where applicable and managed server secrets.
- No provider/QR tokens in logs; no sensitive fields in errors; private/no-store responses and clearing protected caches on logout/account switch.
- Audit/access history with safe presentation; fail closed on provider, database or authorization failure; no fake retry success.
- Before release test forged subjects, conflicting mappings, inactive identities/Persons, missing/revoked/co-guardian authority, cross-Pet/Business/Branch access, expiry during writes, replays and private-field leakage.

## 15. Supabase boundary

**IMPLEMENTED direction:** frontend → Cloudflare → Application/API → PostgreSQL/Supabase. D1 is superseded.

PostgreSQL stores canonical domain data. Auth is relevant only if compatible with the chosen Guardian LINE flow. Storage may hold approved private Pet/avatar/media, but current `media.ts`/`media_objects` authorize **Business** scope, not shared Guardian Passport media. Document that ownership/policy gap before schema or adapter work; do not reuse Business membership for Guardian photos.

Supabase Data API/RLS does not replace server domain authorization. Service-role keys and raw DB credentials never enter the browser. No live configuration/migration/deployment here.

## 16. Business integration

```text
Guardian Pet → Temporary Business access → Business Intake
             → Grooming / Hotel / Daycare execution → Service Record
             → Guardian-safe history (conditional future)

Customer → Business-owned LINE OA → Messaging API → Business Inbox (BE6)
```

The two flows are separate. Central Meawketting LINE/Mini App supports entry, identity linking, Pet/Passport, consent and system/Business-linked actions; it never proxies every Business's free-form chat. OA contact mapping/webhook does not authenticate central Guardian sessions.

Revoking Passport access does not erase legitimately created Business service/accounting records. They retain existing tenant permissions/retention. Their shared Pet reference never makes them automatically Guardian-visible. No Business ownership or Business-shell reuse.

## 17. MVP user flows

All Guardian steps are **PLANNED**; existing domain/Business steps are mapped above.

- **A:** first LINE entry → server verification → explicit Person mapping → session → home. Unlinked identity gets safe onboarding, never Business signup as a shortcut.
- **B:** Add Dog/Cat → validated profile → approved explicit authority establishment → My Pets. **PRODUCT DECISION REQUIRED**; a pending claim never reveals an existing Pet.
- **C:** existing authorized Pet → Passport → Business/Branch/purpose/fields/expiry → Temporary QR → Intake → consent if pending → access → revoke/expire. Issuance may record explicit approval; pending QR grants no fields.
- **D:** completed service → existing BE4 Service Record → safe Guardian history only after visibility approval. No Guardian output exists today.
- **E:** unknown/unlinked identity → safe onboarding/recovery → no Pet data. Contact matching skips neither mapping nor authority.
- **F:** revoked/invalid authority → current check denies access. Planned list omits Pet; stale detail/deep link gets generic unavailable state. BE5 already gates derived grant access; stale session claims cannot preserve it.

## 18. Failure states

| Failure | Planned recovery |
|---|---|
| LINE auth unavailable | Sign-in unavailable/retry; no fabricated login |
| Session expired | Clear protected cache; reauthenticate and reauthorize |
| Person unlinked / conflict | Safe onboarding/verified recovery; no auto-merge |
| No Pets | Empty list; Add only when policy enables it |
| Pet missing / authority missing or revoked | Same privacy-preserving unavailable view; remove stale data |
| Consent expired/denied/revoked | No fields; explain access ended; new request only if permitted |
| QR expired / lost issuance response | No false QR success; explicit revoke/new issuance, no hash recovery |
| Business/Branch unavailable | Block issuance/use; refresh recipient selection |
| Network failure | Preserve safe draft; reconcile unknown writes through idempotent retry |
| Duplicate submission / revision conflict | Same key for same command; refresh conflicts, no duplicate grant/authority |

## 19. Product decisions required

Recommendations are **not implemented policy** and do not choose legal ownership rules.

| Decision | Conservative recommendation |
|---|---|
| How is first authority established; may a Guardian create without Business verification; how are existing Pets claimed/recovered? | Approve explicit evidence/activation/recovery policy before create/claim; never infer from LINE/Customer or Business assertion |
| Multiple Guardians, role permissions, disagreements/transfer (OQ-07/OQ-04) | Preserve BE5 primary-only grant actions; defer additional rights to approved rules |
| Guardian-editable Passport fields and required/optional photo | Recommend name/species with validation, server-managed reference and optional photo pending private media support |
| Guardian Service Record fields, correction/visibility/retention (OQ-BF23/24) | Defer history; later section 10 allowlist, no private notes/staff/financial text |
| Is Mini App required for first Business pilot? | Keep Business production/pilot first; explicitly decide any dependency |
| Production QR duration/one-time policy (OQ-02) | Retain current 2/8/24-hour validation limits; no new duration or single-use promise |

Separate technical/external gates: demonstrate provider/session compatibility, conflict-safe linking and disconnect handling; configure approved LINE/Supabase/Cloudflare environments; document pending-authority/media schema needs only after policy. No new table is needed for this scaffold.

**Exact next Guardian phase (not started):** identity/session boundary implementation with server verification and explicit Person mapping, testing unlinked/conflict/expiry/logout failures; no Pet creation or authority activation. Demonstrate provider compatibility before connecting a real environment.
