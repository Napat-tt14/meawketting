import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const projectRoot = resolve(import.meta.dirname, "..");
const migrationRoot = resolve(projectRoot, "drizzle");
const migrationFiles = readdirSync(migrationRoot).filter((name) => name.endsWith(".sql")).sort();
assert.ok(migrationFiles.length >= 3, "BE2 expects the BE1 migrations plus a BE2 migration");

function applyFreshDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const name of migrationFiles) {
    const sql = readFileSync(resolve(migrationRoot, name), "utf8").replaceAll("--> statement-breakpoint", "");
    database.exec(sql);
  }
  return database;
}

function schemaRows(database) {
  return database.prepare(`
    SELECT type, name, tbl_name, sql
    FROM sqlite_schema
    WHERE name NOT LIKE 'sqlite_%'
    ORDER BY type, name
  `).all();
}

function queryPlan(database, sql, ...values) {
  return database.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...values).map((row) => row.detail).join("\n");
}

const first = applyFreshDatabase();
const second = applyFreshDatabase();

try {
  assert.deepEqual(schemaRows(first), schemaRows(second), "fresh BE2 migration runs must produce the same schema");

  const tables = new Set(first.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'").all().map((row) => row.name));
  for (const table of [
    "customers",
    "pets",
    "business_pet_profiles",
    "customer_tags",
    "customer_pet_relationships",
  ]) assert.ok(tables.has(table), `missing ${table}`);

  const petColumns = first.prepare("PRAGMA table_info(pets)").all().map((row) => row.name).sort();
  assert.deepEqual(petColumns, ["created_at", "created_by_person_id", "id"], "global Pet anchor must stay identity-only");

  for (const table of ["customers", "pets", "business_pet_profiles", "customer_pet_relationships"]) {
    const columns = first.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name).join(" ");
    assert.doesNotMatch(columns, /guardian|passport|consent|owner|access_grant|qr/i, `${table} must not encode authority`);
  }

  first.exec(readFileSync(resolve(projectRoot, "scripts", "seed-be1-dev.sql"), "utf8"));
  first.exec(readFileSync(resolve(projectRoot, "scripts", "seed-be2-dev.sql"), "utf8"));

  assert.equal(first.prepare("SELECT count(*) AS count FROM customers").get().count, 4);
  assert.equal(first.prepare("SELECT count(*) AS count FROM pets").get().count, 8);
  assert.equal(first.prepare("SELECT count(*) AS count FROM business_pet_profiles").get().count, 8);
  assert.equal(first.prepare("SELECT count(*) AS count FROM customer_pet_relationships").get().count, 8);

  assert.match(
    queryPlan(first, "SELECT id FROM customers WHERE business_id = ? AND status = ? ORDER BY display_name_key, id LIMIT ? OFFSET ?", "business-whisker-rest", "active", 50, 0),
    /idx_customers_business_status_name/,
  );
  assert.match(
    queryPlan(first, "SELECT id FROM customers WHERE business_id = ? AND phone_key = ?", "business-whisker-rest", "0815550142"),
    /idx_customers_business_phone_key/,
  );
  assert.match(
    queryPlan(first, "SELECT pet_id FROM business_pet_profiles WHERE business_id = ? AND status = ? ORDER BY name_key, pet_id", "business-whisker-rest", "active"),
    /idx_business_pet_profiles_business_status_name/,
  );
  assert.match(
    queryPlan(first, "SELECT pet_id FROM business_pet_profiles WHERE business_id = ? AND name_key = ? AND species = ?", "business-whisker-rest", "mochi", "cat"),
    /idx_business_pet_profiles_business_name_species/,
  );
  assert.match(
    queryPlan(first, "SELECT pet_id FROM customer_pet_relationships WHERE business_id = ? AND customer_id = ? AND status = ?", "business-whisker-rest", "booking-contact-nalin", "active"),
    /idx_customer_pet_relationships_customer_status/,
  );
  assert.match(
    queryPlan(first, "SELECT customer_id FROM customer_pet_relationships WHERE business_id = ? AND pet_id = ? AND status = ?", "business-whisker-rest", "booking-pet-mochi", "active"),
    /idx_customer_pet_relationships_pet_status/,
  );

  assert.deepEqual(first.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(first.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
} finally {
  first.close();
  second.close();
}

console.log(`BE2 migrations, fixtures, constraints, and query indexes OK (${migrationFiles.length} files)`);
