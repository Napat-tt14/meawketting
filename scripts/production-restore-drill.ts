import assert from "node:assert/strict";
import { DatabaseSync, backup } from "node:sqlite";
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { migrate } from "../tests/backendTestKit";

// No supplied DB path, remote binding, credentials or production data accepted.
if (process.argv.length > 2) throw Error("This drill only creates disposable local databases; no arguments accepted");
const directory = mkdtempSync(join(tmpdir(), "meawketting-prod-restore-"));
const source = new DatabaseSync(join(directory, "source.sqlite"));
migrate(source);
for (const phase of [1, 2, 3, 4, 5, 6, 7]) source.exec(readFileSync(resolve(`scripts/seed-be${phase}-dev.sql`), "utf8"));
function snapshot(db: DatabaseSync) {
  const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const facts = tables.map(row => {
    const name = String(row.name), identifier = '"' + name.replaceAll('"', '""') + '"';
    const rows = db.prepare(`SELECT * FROM ${identifier}`).all().map(row => JSON.stringify(row)).sort();
    return { name, count: rows.length, sha256: createHash("sha256").update(JSON.stringify(rows)).digest("hex") };
  });
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(db.prepare("PRAGMA integrity_check").get()?.integrity_check, "ok");
  return facts;
}
const before = snapshot(source);
source.exec(readFileSync("scripts/production-operations.sql", "utf8"));
const backupPath = join(directory, "backup.sqlite");
await backup(source, backupPath);
source.exec("UPDATE customers SET display_name='LOCAL DRILL CORRUPTION'");
assert.notDeepEqual(snapshot(source), before);
source.close();
const restored = new DatabaseSync(backupPath);
assert.deepEqual(snapshot(restored), before);
// Simulated failed migration is rolled back, including its first successful write.
restored.exec("BEGIN IMMEDIATE");
let migrationFailed = false;
try { restored.exec("UPDATE customers SET display_name='FAILED MIGRATION'; INSERT INTO no_such_table VALUES(1)"); }
catch { migrationFailed = true; }
finally { restored.exec("ROLLBACK"); }
assert.equal(migrationFailed, true, "the injected migration must fail");
assert.deepEqual(snapshot(restored), before);
const schemaTables = (readFileSync("db/schema.ts", "utf8").match(/sqliteTable\(/g) ?? []).length;
assert.equal(before.length, schemaTables);
restored.close();
console.log(JSON.stringify({ status: "PASS", environment: "LOCAL SQLITE SIMULATION", migrations: readdirSync("drizzle").filter(f => f.endsWith(".sql")).length, tables: before.length, rows: before.reduce((sum, t) => sum + t.count, 0), backupBytes: statSync(backupPath).size, verified: ["all-table content hashes", "foreign keys", "integrity", "reopen backup", "failed migration rollback"], retainedDrillDirectory: directory }, null, 2));
