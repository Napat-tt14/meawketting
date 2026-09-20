import postgres from "postgres";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function migrate(sql, directory = resolve("supabase/migrations")) {
  return sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(608731902)`;
    await tx`CREATE TABLE IF NOT EXISTS meawketting_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
    for (const name of readdirSync(directory).filter(f => /^\d+_[a-z_]+\.sql$/.test(f)).sort()) {
      const source = readFileSync(resolve(directory, name), "utf8"), checksum = createHash("sha256").update(source).digest("hex");
      const [old] = await tx`SELECT checksum FROM meawketting_migrations WHERE name=${name}`;
      if (old) { if (old.checksum !== checksum) throw Error(`Applied migration changed: ${name}`); continue; }
      await tx.unsafe(source).simple();
      await tx`INSERT INTO meawketting_migrations(name,checksum) VALUES(${name},${checksum})`;
      console.log(`Applied ${name}`);
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const migrationUrl = process.env.DATABASE_MIGRATION_URL;
  if (!migrationUrl) throw Error("DATABASE_MIGRATION_URL is required; use a direct or session-pooler migration connection.");
  const parsed = new URL(migrationUrl);
  if (parsed.port === "6543") throw Error("DATABASE_MIGRATION_URL must not use the Supabase transaction pooler on port 6543.");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  const sql = postgres(migrationUrl, { max: 1, prepare: false, ssl: local ? false : "verify-full", onnotice: () => {} });
  try { await migrate(sql); console.log("PostgreSQL migrations complete"); }
  finally { await sql.end(); }
}
