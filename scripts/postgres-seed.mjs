import postgres from "postgres";
import { readFileSync } from "node:fs";
if (!process.env.DATABASE_URL || process.env.MEAWKETTING_ENV !== "test") throw Error("Synthetic seeding requires DATABASE_URL and MEAWKETTING_ENV=test. Never run on production.");
const parsed = new URL(process.env.DATABASE_URL), local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
if (!local) throw Error("Synthetic seeding is limited to local PostgreSQL; remote databases are refused.");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, ssl: local ? false : "verify-full", onnotice: () => {} });
try {
  await sql.begin(async tx => { for (let phase = 1; phase <= 7; phase++) await tx.unsafe(readFileSync(`supabase/seed-be${phase}-dev.sql`, "utf8")).simple(); });
  console.log("Synthetic BE1–BE7 fixtures seeded.");
} finally { await sql.end(); }
