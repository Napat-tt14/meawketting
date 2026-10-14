# D1 schema

`0001_initial.sql` is the authoritative empty-database baseline for Cloudflare D1. Apply later changes as forward migrations in this directory. The SQLite model in `db/schema.ts` describes columns, foreign keys, indexes and basic checks; retain the SQL-only UTC checks, view and mutation guards when generating a later migration.

All money columns, including `estimate` and `additional_price`, contain integer satang. API presentation remains baht with the existing whole-baht precision. Strict tables reject fractional values in integer columns.

Instant columns ending in `_at` use UTC `YYYY-MM-DDTHH:mm:ss.sssZ`. `opens_at`, `closes_at`, fields ending in `_local`, and scheduled service dates/times are business civil times, not UTC instants.

The ordering columns `sequence` and `event_sequence` are SQLite autoincrement primary keys. Stable domain `id` values remain unique and serve as references; an import can insert explicit sequence values to preserve historical order.

The fixtures in `tests/fixtures/d1` are synthetic development/test data and must never be seeded into production. They grant only fictional identities, channels and provider accounts.
