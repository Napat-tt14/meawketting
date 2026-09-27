import { randomBytes } from "node:crypto";
import postgres from "postgres";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const projectUrl = process.env.SUPABASE_URL;
if (!migrationUrl || !projectUrl) throw Error("Migration connection and Supabase project URL are required.");

const projectRef = new URL(projectUrl).hostname.split(".")[0];
const role = "meawketting_runtime";
const password = randomBytes(32).toString("base64url");
const sql = postgres(migrationUrl, { max: 1, prepare: false, ssl: "verify-full", onnotice: () => {} });
let stage = "connecting to the migration pooler";

try {
  stage = "checking the database account";
  const [session] = await sql`SELECT current_user AS role, current_database() AS database`;
  if (session.role !== "postgres" || session.database !== "postgres") throw Error("Unexpected migration database account.");

  await sql.begin(async tx => {
    stage = "creating the restricted login role";
    const [existing] = await tx`SELECT 1 FROM pg_roles WHERE rolname=${role}`;
    if (!existing) {
      await tx.unsafe(`CREATE ROLE ${role} WITH LOGIN PASSWORD '${password}' NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`);
    } else {
      stage = "rotating the restricted login password";
      await tx.unsafe(`ALTER ROLE ${role} WITH PASSWORD '${password}'`);
    }

    stage = "granting access to application tables";
    await tx.unsafe(`GRANT CONNECT ON DATABASE postgres TO ${role}`);
    await tx.unsafe(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await tx.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await tx.unsafe(`REVOKE ALL ON TABLE public.meawketting_migrations FROM ${role}`);
    await tx.unsafe(`REVOKE INSERT, UPDATE, DELETE ON TABLE public.be4_staff_slots FROM ${role}`);
    await tx.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    await tx.unsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`);
    await tx.unsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${role}`);

    stage = "granting row policies only to the Worker role";
    const tables = await tx`
      SELECT tablename FROM pg_tables
      WHERE schemaname='public' AND rowsecurity AND tablename <> 'meawketting_migrations'
      ORDER BY tablename`;
    for (const { tablename } of tables) {
      const table = `"${tablename.replaceAll('"', '""')}"`;
      await tx.unsafe(`DROP POLICY IF EXISTS meawketting_worker_access ON public.${table}`);
      await tx.unsafe(`CREATE POLICY meawketting_worker_access ON public.${table} FOR ALL TO ${role} USING (true) WITH CHECK (true)`);
    }
  });
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : "unknown";
  const reasons = {
    "28P01": "database password authentication failed",
    "42501": "the migration role lacks a required database privilege",
    "42P01": "an expected application table was not found",
    "42704": "an expected database object was not found",
    "42710": "the role already exists in a conflicting state",
    "08001": "could not connect to the database",
    "08004": "the database rejected the connection",
    "08006": "the database connection was lost",
    "25001": "the database rejected an operation inside a transaction",
  };
  const reason = reasons[code] ?? (code === "unknown" ? "unexpected setup error" : "database rejected a setup operation");
  throw Error(`Runtime role setup failed while ${stage} (SQLSTATE ${code}): ${reason}. No connection string or password was logged.`);
} finally {
  await sql.end();
}

const runtimeUrl = new URL(migrationUrl);
runtimeUrl.username = `${role}.${projectRef}`;
runtimeUrl.password = password;
runtimeUrl.port = "6543";
runtimeUrl.searchParams.set("sslmode", "require");
let verified = false;
for (let attempt = 0; attempt < 20 && !verified; attempt++) {
  const runtimeSql = postgres(runtimeUrl.toString(), { max: 1, prepare: false, ssl: "verify-full", onnotice: () => {} });
  try {
    const [check] = await runtimeSql`
      SELECT current_user AS role,
        (SELECT NOT rolbypassrls AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS restricted,
        has_table_privilege(current_user, 'public.persons', 'SELECT') AS can_read_business,
        has_table_privilege(current_user, 'public.meawketting_migrations', 'SELECT') AS can_read_migration_ledger,
        EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='persons' AND policyname='meawketting_worker_access' AND roles @> ARRAY[current_user]) AS has_worker_policy`;
    if (check.role !== role || !check.restricted || !check.can_read_business || check.can_read_migration_ledger || !check.has_worker_policy) throw Error("Runtime role privilege verification failed.");
    verified = true;
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "unknown";
    if (code !== "28P01" || attempt === 19) throw Error(`Runtime pooler verification failed (SQLSTATE ${code}). No connection string or password was logged.`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  } finally {
    await runtimeSql.end();
  }
}
console.log(JSON.stringify({ databaseUrl: runtimeUrl.toString() }));
