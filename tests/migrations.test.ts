import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { migrate } from "../scripts/postgres-migrate.mjs";

test("empty PostgreSQL migrations apply atomically, replay unchanged, and enable private Business tables", async () => {
  const schema = `migration_${crypto.randomUUID().replaceAll("-", "")}`;
  const sql = postgres(process.env.MEAWKETTING_TEST_DATABASE_URL!, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    await sql.unsafe(`SET search_path TO ${schema}`);
    await migrate(sql);
    await migrate(sql);
    assert.equal((await sql`SELECT count(*)::int n FROM meawketting_migrations`)[0].n, 4);
    assert.equal((await sql`SELECT count(*)::int n FROM pg_tables WHERE schemaname=${schema} AND NOT rowsecurity`)[0].n, 0);
    assert.equal((await sql`SELECT count(*)::int n FROM pg_tables WHERE schemaname=${schema} AND tablename='auth_sessions'`)[0].n, 0);
    assert.ok((await sql`SELECT count(*)::int n FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname=${schema} AND c.contype='f'`)[0].n >= 161);
    // Even a role with database-wide read grants cannot bypass RLS.
    await sql`SET ROLE pg_read_all_data`;
    assert.equal((await sql`SELECT count(*)::int n FROM meawketting_migrations`)[0].n, 0);
    await assert.rejects(sql`DELETE FROM auth_person_links`, { code:"42501" });
    await sql`RESET ROLE`;
    await sql`UPDATE meawketting_migrations SET checksum='changed' WHERE name='202609180001_business.sql'`;
    await assert.rejects(migrate(sql), /Applied migration changed/);
  } finally { await sql.end(); }
});
