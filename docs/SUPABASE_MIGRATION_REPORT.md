# Superseded Supabase checkpoint

The 2026-09-19 to 2026-09-20 Supabase architecture is **SUPERSEDED** by the user's 2026-10-13 forward-only Cloudflare D1 decision. This historical checkpoint exists only to explain that transition; it is not an operator guide or executable migration source.

The former implementation used Supabase PostgreSQL, Auth and private Storage. Its dated local checkpoint reported 84 backend, 7 production/security and 94 frontend passing tests, plus a 41-request synthetic API smoke suite. Those results do not validate the current D1 implementation or the production cutover.

Current architecture and commands are in [architecture](./ARCHITECTURE.md), [validation](./VALIDATION.md), [runbook](./PRODUCTION_RUNBOOK.md) and [D1 auth/media](./D1-AUTH-MEDIA.md). `migrations/d1` is the only active migration directory. Product boundaries, Person IDs, permissions, booking/payment invariants and histories must be preserved; the retired provider/runtime is not retained for fallback or restore.
