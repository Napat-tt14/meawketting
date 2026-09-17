# FINAL BUSINESS UX/UI + DEMO LEAKAGE AUDIT

Audit completed locally: 2026-09-14. Scope: frozen BF1–BF12, current BE1–BE8 and existing uncommitted PROD0–PROD6 work. Repository status and existing diff were inspected before edits; canonical Product, UX, design, implementation, validation, decisions and production-track documentation informed the audit. Current implementation takes precedence over historical prototype descriptions.

## 1. Final Verdict

**FAIL — CLEANUP REQUIRED BEFORE AUTH**

The Business presentation and fixture boundary are substantially cleaner, and current automated checks pass. However, Customer creation has no replay protection for a lost-response retry, and stale Customer edits can overwrite newer changes. Both were reproduced against an isolated migration-backed database. These violate this audit's explicit mutation requirements. BE1 configuration and BE2 Customer/Pet contracts need a focused correctness follow-up; passing existing tests does not cover these gaps. No Production Auth work was started.

## 2. Demo/Fixture Leakage

| Finding | User visible? | Severity | Fix | Validation |
|---|---|---|---|---|
| Compatibility selectors could fall back to static Business, Branch, Customer, Booking or catalog data without durable state | Yes, before hydration or when data was absent | High | Neutral fixture-off snapshots; static fallbacks require explicit fixture test mode | Poisoned browser-storage selector test; production SSR across active surfaces |
| Business login simulated Google success after a timer | Yes | High | Disabled unavailable login with truthful Thai explanation; removed redirect timer | Rendered login test and source review |
| Context/member UI initialized from a demo identity | Yes | Medium | Neutral context, disabled empty selector; account link describes returning to login | Production rendering and local browser |
| Failed initial data loading could resemble an empty successful shop | Yes | High | Loading/error/auth-unavailable boundary with retry; operational content waits for successful loading | Production SSR and failure-path review |
| Grooming lateness used a frozen demo clock | Yes | Medium | Current Branch-local clock outside test mode | Fixture-off real-clock assertion |
| CRM failure could show zero debt and an inaccurate next action | Yes | High | Gate CRM projections until loaded; fix local D1 compound-query failure | Actual local D1 SELECT, browser balance 660, BE8 3/3 |
| Public hero's fictional Pet/room counts | Yes, explicitly labeled | Informational | INTENTIONALLY PUBLIC; retained artwork/sample-data label | Landing browser and rendered checks |
| Fixture names, mock providers, seed scripts, test IDs and test assertions | Test/dev only | Informational | TEST-ONLY / SAFE; retained required tests and explicit seed tooling | Fixture boundary, API and production-security tests |
| Prototype names, TODO/FIXME comments, adapter names and enum identifiers in implementation | No, except intentional operational reference fields | Informational | INTERNAL / NOT USER VISIBLE; no blind source deletion | Runtime copy/source search |

**Normal production Business runtime no longer silently displays fallback demo data.** This is not a claim that the local development database contains real merchant data: the existing explicitly seeded development D1 database still displays synthetic shops, people, messages and transactions. Those records were not deleted. Production currently fails closed without authentication. Future staging must use an intentionally provisioned database, not copy development seeds.

## 3. UX/UI Findings

Fixed:

- Booking's embedded Customer/Pet editor could trap Escape handling between nested dialogs. Escape now closes the nested editor and restores focus to its launcher while retaining the Booking drawer.
- Report filter/loading state and CRM loading state no longer present invented zero metrics. Home refresh failures disclose that current data could not be refreshed.
- CRM's six-part timeline UNION exceeded the local D1 compound-SELECT limit even though Node SQLite tests passed. Financial event branches now form a nested compound query, preserving scope, sorting and pagination. Charge text says ยอดเรียกเก็บ; the Inbox timeline link uses the supported conversation query parameter.
- Settings explicitly states that logo selection is a page-only preview, avoiding a false persistence promise. Hotel incident summary uses ordinary Thai operational language.
- The mobile header Scan link has an accessible name when its visible text is hidden. The loading/error frame has a skip-link target.

Unresolved correctness blockers:

- **BE2 Customer create replay:** two identical no-phone create requests with identical request metadata create two different Customers. A lost response followed by retry is unsafe. Reproduction output: `sameRequestCreatedTwoCustomers: true`.
- **BE2 stale Customer edit:** submit a newer name, then submit an older form snapshot; the older snapshot is accepted and replaces the newer value. Reproduction output: `staleCustomerEditAccepted: true`.
- BE1 profile/Branch and BE2 Customer/Pet contracts lack the expected-revision/replay guarantees used in later domains. Settings also lacks an in-flight submit guard. The two Customer cases above were experimentally reproduced; the wider contract finding is source review, not a claim that every operation was separately reproduced. Branch creation already rejects duplicate names; it is not classified as an unguarded duplicate-create case.

These require a scoped API concurrency/retry contract change, rather than an unrelated UI refactor. No domain redesign or migration was attempted during this audit.

Product decision required:

- Public acquisition still links to Consumer login/Passport/my-pets despite Consumer being paused. Existing positioning is deliberate enough that removal would be a Product/navigation decision. Leave it unchanged until Product confirms the prelaunch exposure policy.
- Logo persistence remains unavailable. Decide its intended release timing with future media work; this audit only makes the current limitation truthful.

## 4. Route Coverage

All active Business page implementations were inspected. Browser checks use the existing seeded local D1 development mode; production rendering is separately tested without fixtures.

| Surface | Coverage / status |
|---|---|
| `/business/home` | Loaded browser, nine widths, spotlight/font/assets, refresh feedback; fixed |
| `/business/calendar` | Loaded browser, nine widths, create drawer and nested editor; edit/cancel/drag/resize source and BE3 tests |
| `/business/customers` | Loaded browser, nine widths, empty/CRM/source states; fixed projection gating; mutation blockers above |
| `/business/customers/[customerId]` | Loaded browser, nine widths, wrong-context/not-found, real CRM query; fixed |
| Pet detail/context | Embedded Customer/Booking surfaces and Service Record/permission presentation; rendered and source coverage |
| `/business/inbox` | Loaded browser, nine widths, empty fixture-off render, send/retry/outbox source and BE6 tests |
| `/business/scan` | Loaded browser, nine widths, labels and failure recovery; QR taxonomy/BE5 tests |
| `/business/intake/[intakeId]` | Browser missing-draft recovery and focused alert; consent/receive/idempotency via rendered/source/BE5 tests |
| `/business/grooming` | Loaded browser, nine widths, transition/source tests and current clock fix |
| `/business/hotel` | Loaded browser, nine widths, room/transition states and BE4 tests |
| `/business/daycare` | Disabled-module state and enabled Branch browser; nine-width shell/state check; populated operations in rendered/BE4 tests |
| `/business/billing` | Loaded browser, nine widths, actual ledger values, mutation guards/BE7 tests |
| `/business/reports` | Loaded browser, nine widths, filters/loading/failure gating and BE8 tests |
| `/business/team` | Loaded browser, nine widths, Branch/team scope and BE4 tests |
| `/business/settings` | Loaded browser, nine widths, profile and logo limitation; save contract gap reported |
| Branch management | Actual Settings panel, nine widths, service/team/contact context; no separate active Branch route |
| Navigation/header/mobile More | Branch-enabled services compared, More opened at 390px; planned items retained; no app marketing footer |
| `/business/login` | Disabled auth placeholder and no simulated success, rendered/source checks |
| `/business` and shared root landing | Source/rendered coverage; Business landing loaded browser and nine widths |

This was not an exhaustive live mutation exercise: no real message send, payment, provider connection, camera authorization, or Guardian consent ceremony was performed. Tests cover those local domain boundaries; provider/staging acceptance remains future work.

## 5. Empty/Loading/Error States

Production SSR renders neutral shop loading rather than fixture identity or operational zero totals. Initial API failures expose Thai recovery; auth absence is distinct from an empty shop. CRM and Reports wait for their requested projection before presenting metrics. Missing Intake and inaccessible Customer context show recovery/not-found states without revealing Pet data.

The local CRM 500 was reproduced and fixed at the real D1 boundary, not masked with fallback totals. No raw JSON, stack traces, `undefined`, `NaN`, or object-string content was observed in inspected loaded pages. Operational references explicitly labeled for tracking are intentional, not automatically removed as test IDs.

Booking, execution, Intake, Inbox and financial paths were reviewed alongside their request keys, revisions, rollback/error handling and existing tests. The BE1/BE2 exceptions prevent a blanket claim that every mutation is retry/conflict safe.

## 6. Responsive/Accessibility

Tested viewport widths: **320, 375, 390, 430, 768, 820, 1024, 1200, 1440**. Loaded primary operational surfaces, Customer context, Settings/Branch panel and landing had no document-level horizontal overflow in the measured states. Booking drawer fit at 320px (304px drawer); long Thai/English Customer draft text was exercised without saving. Mobile form text was at least 16px in inspected inputs. Calendar retains mobile edit alternatives; planned navigation remains disabled rather than becoming fake links.

Nested dialog Escape/focus restoration was browser-verified. Mobile Scan labeling and loading/error skip-target were corrected. Focus styles, dialog handlers, reduced-motion rules, service text/icon identity and disabled semantics received source/rendered sanity checks. This is not a complete WCAG certification, contrast measurement, every-control touch-size measurement, or persisted long-name matrix. Fully populated long-name rows and every modal/error combination remain manual QA items.

The final local Home browser console query returned no warning/error entries. A localhost production-preview browser navigation was blocked by the browser client; production assurance here therefore relies on the actual build, fixture-off SSR/API assertions and security tests, not a claimed hydrated production-browser session.

## 7. Public/Landing Findings

The current clay-art landing looks intentional and finished, with zero broken loaded images and no document overflow at the nine tested widths. Fictional room occupancy and Pet labels are attached to an explicitly labeled illustration. They are not merchant statistics or testimonials. No fake customer adoption claims were found in the active landing.

Copy no longer promises photo sending or outward Service Record sharing that the current Business surface does not provide. Consumer CTAs remain a Product decision as described above. The disabled Business login now tells visitors the feature is not available, rather than simulating authentication.

## 8. Fixture/Test Boundary

| Data/storage class | Classification | Boundary |
|---|---|---|
| Selected Business/Branch, view/filter/draft state | PRESENTATION ONLY | Server membership/Branch authorization remains authoritative |
| Durable client projection caches | PRESENTATION ONLY | Filled from server reads/mutations; no storage fixture fallback when normal mode is off |
| Static compatibility arrays and browser fixture persistence | TEST ONLY | `BUSINESS_FIXTURE_TEST_MODE`; isolated explicit `MEAWKETTING_FIXTURE_MODE=test` harness |
| Prototype-named compatibility adapters | LEGACY BUT SAFE after fixes | Normal selectors return durable projections or neutral absent data |
| Earlier missing-data/static pre-hydration fallback | PRODUCTION AUTHORITY LEAK — FIXED | Neutral fixture-off initial state and session/data frame |
| SQL seeds and mock providers | TEST ONLY | Explicit local seed/test scripts; no normal runtime auto-seed |

`vite.config.ts` forces fixture mode **off** for application builds (also normal Vite serve); the rendered fixture harness deliberately overrides it in a separate module graph. Local Vite serve explicitly opts into `dev-test` identity. Production identity rejects that mode, and remote Worker security rejects dev/test configuration. Tests and fixture source remain because deterministic populated workflows need them. They cannot silently supply the normal production UI through the audited selectors.

## 9. Auth Placeholder Findings

There is no longer a fake successful **Business** login experience. Google sign-in is unavailable, no timer redirects to Home, and absent session context does not invent an Owner or shop. Returning to login is labeled as navigation, not a logout that never happened. Dev-test identity is a local development boundary, not real authentication. Production APIs fail closed; login, onboarding, recovery and real session integration remain expected future work. This statement does not certify paused Consumer authentication flows.

## 10. Deferred Performance Items

- Profile currently-used landing/spotlight image transfer sizes and loading under staging network conditions. No images were re-encoded or replaced.
- Portal bootstrap currently loads multiple permitted Branch/domain projections. Assess latency with realistic data later; this audit preserved that existing loading architecture.

These are performance follow-ups, not substitutes for the correctness blockers.

## 11. Validation

| Check | Exact result |
|---|---|
| `npm run lint` | PASS, 0 errors / 0 warnings |
| `node --test tests/rendered-html.test.mjs` after build | PASS, **93/93**, 0 failed / skipped / cancelled |
| `test:be1` | PASS, **8/8** |
| `test:be2` | PASS, **11/11** |
| `test:be3` | PASS, **9/9** |
| `test:be4` | PASS, **13/13** |
| `test:be5` | PASS, **7/7** |
| `test:be6` | PASS, **8/8** |
| `test:be7` | PASS, **10/10** |
| `test:be8` | PASS, **3/3** |
| Backend total | **69/69** |
| `test:production` | PASS, **7/7** |
| `typecheck:be1` through `typecheck:be8` | All eight PASS, exit 0 |
| `typecheck:production` | PASS, exit 0 |
| `npm run build` | PASS; existing vinext beta route-classification advisory remains |
| `git diff --check` | PASS; Git line-ending notices are not whitespace errors |
| Local D1 CRM query | PASS after fix; previously failed with compound SELECT limit |
| Isolated Customer retry/stale-edit probes | Both defects reproduced; unresolved blockers, not passing guarantees |

Full-root TypeScript was not rerun in this audit; the prior production checkpoint's five frozen Consumer diagnostics are historical evidence, not a fresh result. No broad exclusions or weakened financial/privacy tests were introduced. Populated rendered tests now explicitly request isolated fixtures; separate normal-production assertions verify neutral states. Local logs/probes are under ignored `tmp/ux-audit/` and are not committed artifacts.

## 12. Files Changed

Audit edits only (other dirty files were pre-existing and preserved):

- `app/_prototype/businessState.ts`: fixture-off selector boundaries and neutral session context.
- `app/business/_components/useBusinessContext.ts`, `BusinessContextSwitcher.tsx`, `BusinessUserMenu.tsx`: neutral initialization, disabled empty selector, truthful login navigation.
- `app/business/_components/BusinessPortalFrame.tsx`: initial loading/error/auth recovery and skip target.
- `app/business/_components/BusinessHeader.tsx`: mobile Scan accessible name.
- `app/business/login/BusinessLoginScreen.tsx`: remove simulated authentication.
- `app/business/calendar/BookingEditor.tsx`: nested dialog Escape/focus fix.
- `app/business/grooming/groomingPresentation.ts`: real current clock outside tests.
- `app/business/home/BusinessHome.tsx`: refresh failure feedback; preserved the pre-existing Booking ID fix.
- `app/business/reports/ReportsScreen.tsx`: requested-query loading/error gating.
- `app/business/customers/CustomersScreen.tsx`, `CustomerDetailScreen.tsx`: CRM loading and failure presentation.
- `app/_backend/be8/crm.ts`: D1-compatible timeline query, Charge wording and Inbox deep link.
- `app/business/hotel/HotelOperations.tsx`: ordinary operational Thai label.
- `app/business/settings/SettingsScreen.tsx`: truthful logo preview limitation.
- `app/_components/business-landing/HomeVisualSections.tsx`: remove unsupported acquisition promises.
- `tests/business-render-fixture.mjs`, `tests/rendered-html.test.mjs`: explicit fixture rendering plus normal production/poisoned-storage regressions; preserved existing assertions/work.
- `docs/CURRENT_IMPLEMENTATION.md`, `docs/VALIDATION.md`, this report: latest audit evidence and blockers.

**`/workfiledesign` untouched. Consumer source untouched and PAUSED. No Product redesign, navigation restructuring, domain-policy change, commit, push or deploy.** No authentication/provider credentials, LINE connection, Payment provider or R2 integration was added. Existing uncommitted work was not reset, reverted, cleaned or deleted.

## 13. Product Owner Manual QA

1. Open an empty provisioned shop once the environment supports it: Home, Calendar, Customers, Inbox, Billing and Reports must show honest empty states without sample people or revenue.
2. Open the explicitly seeded local shop: follow a Booking through its Customer/Pet context, execution and financial records; verify Branch switching changes permitted services.
3. Interrupt the API connection and retry: verify understandable failure, no success claim and no invented zero balance. Do not approve Customer retry/stale-edit behavior until the blocker fix is validated.
4. On a narrow phone, open Booking, then Add Customer; enter a long Thai/English name, close the nested editor, and confirm focus and the parent drawer remain usable.
5. On desktop, check Calendar, tables, Reports filters and Settings; use keyboard Tab/Escape and the Scan shortcut.
6. Refresh after a successfully saved ordinary record; compare with a second tab. Verify current server data survives refresh and older forms cannot overwrite it after the correctness follow-up.
7. Open the production-mode login and direct Business URL: there must be no fake signed-in identity, debug selector or operational demo data. Landing sample art must remain clearly labeled.

## 14. Exact Next Action

**FIX AND VALIDATE BE1/BE2 RETRY AND STALE-EDIT CORRECTNESS BEFORE PRODUCTION AUTH INTEGRATION.**

Define and implement the smallest server-backed replay/concurrency contract for affected Customer/Pet and Business/Branch writes, add meaningful duplicate-retry and stale-edit tests, and close the Settings pending-submit gap. Re-run affected UI/backend/security checks and this audit's blocked cases. Resolve public Consumer CTA exposure with Product before staging acquisition. Do not start Auth as part of this audit.
