import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const projectRoot = resolve(import.meta.dirname, "..");
const migrationRoot = resolve(projectRoot, "drizzle");
const migrationFiles = readdirSync(migrationRoot).filter((name) => name.endsWith(".sql")).sort();
assert.ok(migrationFiles.length > 0, "BE1 needs at least one migration");

function applyFreshDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const name of migrationFiles) {
    const sql = readFileSync(resolve(migrationRoot, name), "utf8").replaceAll("--> statement-breakpoint", "");
    database.exec(sql);
  }
  return database;
}

const first = applyFreshDatabase();
const second = applyFreshDatabase();
const schemaSql = (database) => database.prepare(`
  SELECT type, name, tbl_name, sql
  FROM sqlite_schema
  WHERE name NOT LIKE 'sqlite_%'
  ORDER BY type, name
`).all();

assert.deepEqual(schemaSql(first), schemaSql(second), "fresh migration runs must produce the same schema");
const tables = new Set(first.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'").all().map((row) => row.name));
for (const table of [
  "persons",
  "businesses",
  "branches",
  "business_memberships",
  "membership_branch_access",
  "branch_enabled_modules",
  "branch_operating_hours",
  "audit_events",
]) assert.ok(tables.has(table), `missing ${table}`);

assert.deepEqual(first.prepare("PRAGMA foreign_key_check").all(), []);
assert.equal(first.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
const branchPlan = first.prepare("EXPLAIN QUERY PLAN SELECT * FROM branches WHERE business_id = ? AND status = ?").all("business-whisker-rest", "active");
assert.match(branchPlan.map((row) => row.detail).join("\n"), /idx_branches_business_status/);
const accessColumns = new Set(first.prepare("PRAGMA table_info(membership_branch_access)").all().map((row) => row.name));
for (const column of ["status", "created_at", "updated_at", "created_by_person_id", "updated_by_person_id"]) {
  assert.ok(accessColumns.has(column), `membership_branch_access missing ${column}`);
}
const accessPlan = first.prepare("EXPLAIN QUERY PLAN SELECT branch_id FROM membership_branch_access WHERE membership_id = ? AND status = ?").all("mem_test", "active");
assert.match(accessPlan.map((row) => row.detail).join("\n"), /idx_membership_branch_access_membership_status/);
first.close();
second.close();
console.log(`BE1 migrations OK (${migrationFiles.length} file${migrationFiles.length === 1 ? "" : "s"})`);
