import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const projectRoot = resolve(import.meta.dirname, "..");
const migrationRoot = resolve(projectRoot, "drizzle");
const migrationFiles = readdirSync(migrationRoot).filter((name) => name.endsWith(".sql")).sort();
const be1Seed = readFileSync(resolve(projectRoot, "scripts", "seed-be1-dev.sql"), "utf8");
const be2Seed = readFileSync(resolve(projectRoot, "scripts", "seed-be2-dev.sql"), "utf8");
const be3Seed = readFileSync(resolve(projectRoot, "scripts", "seed-be3-dev.sql"), "utf8");
assert.ok(migrationFiles.length >= 4, "BE3 expects the BE1/BE2 migrations plus a BE3 migration");

function migrationSql(name) {
  return readFileSync(resolve(migrationRoot, name), "utf8").replaceAll("--> statement-breakpoint", "");
}

function applyMigrations(lastIndex = migrationFiles.length - 1) {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const [index, name] of migrationFiles.entries()) {
    if (index > lastIndex) break;
    database.exec(migrationSql(name));
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

const first = applyMigrations();
const second = applyMigrations();
const upgraded = applyMigrations(migrationFiles.length - 2);

try {
  assert.deepEqual(schemaRows(first), schemaRows(second), "fresh BE3 migration runs must produce the same schema");

  const tables = new Set(first.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'").all().map((row) => row.name));
  for (const table of [
    "booking_services",
    "booking_service_resource_requirements",
    "booking_resources",
    "booking_resource_service_links",
    "booking_resource_availability_windows",
    "bookings",
    "booking_pets",
    "booking_resource_assignments",
    "booking_resource_reservations",
    "booking_write_commits",
  ]) assert.ok(tables.has(table), `missing ${table}`);

  const triggers = new Set(first.prepare("SELECT name FROM sqlite_schema WHERE type = 'trigger'").all().map((row) => row.name));
  for (const trigger of [
    "trg_be3_reservation_exclusive_conflict",
    "trg_be3_reservation_capacity_conflict",
    "trg_be3_booking_commit_guard",
  ]) assert.ok(triggers.has(trigger), `missing concurrency guard ${trigger}`);

  for (const table of ["bookings", "booking_pets", "booking_resources", "booking_resource_assignments", "booking_resource_reservations"]) {
    const columns = first.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name).join(" ");
    assert.doesNotMatch(columns, /guardian|passport|consent|owner|access_grant|qr/i, `${table} must not encode Guardian/Passport authority`);
  }

  first.exec(be1Seed);
  first.exec(be2Seed);
  first.exec(be3Seed);
  const expectedCounts = { booking_services: 5, booking_resources: 13, bookings: 13, booking_pets: 15 };
  for (const [table, expected] of Object.entries(expectedCounts)) {
    assert.equal(first.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count, expected, `${table} fixture count`);
  }
  assert.deepEqual(first.prepare("SELECT DISTINCT time_model FROM bookings ORDER BY time_model").all().map((row) => row.time_model), ["appointment", "date-range", "day"]);
  assert.equal(first.prepare("SELECT COUNT(*) AS count FROM bookings WHERE id = 'booking-fixture-ari-hotel-nalin-pair'").get().count, 1);
  assert.equal(first.prepare("SELECT COUNT(*) AS count FROM booking_pets WHERE booking_id = 'booking-fixture-ari-hotel-nalin-pair'").get().count, 2);
  assert.deepEqual(first.prepare(`
    SELECT reservation_date, units FROM booking_resource_reservations
    WHERE booking_id = 'booking-fixture-ari-hotel-nalin-pair'
    ORDER BY reservation_date
  `).all().map((row) => ({ reservation_date: row.reservation_date, units: row.units })), [
    { reservation_date: "2026-08-24", units: 2 },
    { reservation_date: "2026-08-25", units: 2 },
  ]);

  assert.match(
    queryPlan(first, "SELECT id FROM bookings WHERE business_id = ? AND branch_id = ? AND start_minute < ? AND end_minute > ? ORDER BY start_minute, id", "business-whisker-rest", "whisker-ari", 29_800_000, 29_700_000),
    /idx_bookings_branch_range/,
  );
  assert.match(
    queryPlan(first, "SELECT id FROM bookings WHERE business_id = ? AND customer_id = ? AND start_minute >= ? ORDER BY start_minute, id", "business-whisker-rest", "booking-contact-pim", 0),
    /idx_bookings_business_customer_range/,
  );
  assert.match(
    queryPlan(first, "SELECT booking_id FROM booking_resource_reservations WHERE business_id = ? AND branch_id = ? AND resource_id = ? AND start_minute < ? AND end_minute > ?", "business-whisker-rest", "whisker-ari", "ari-groomer-pim", 29_800_000, 29_700_000),
    /idx_booking_reservations_resource_interval/,
  );
  assert.match(
    queryPlan(first, "SELECT booking_id, units FROM booking_resource_reservations WHERE business_id = ? AND branch_id = ? AND resource_id = ? AND reservation_date = ?", "business-whisker-rest", "whisker-ari", "ari-hotel-capacity", "2026-08-19"),
    /idx_booking_reservations_resource_date/,
  );

  const beforeReplay = Object.fromEntries(Object.keys(expectedCounts).map((table) => [table, first.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]));
  first.exec(be1Seed);
  first.exec(be2Seed);
  first.exec(be3Seed);
  const afterReplay = Object.fromEntries(Object.keys(expectedCounts).map((table) => [table, first.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]));
  assert.deepEqual(afterReplay, beforeReplay, "deterministic DEV/TEST seeds are replay-safe");

  upgraded.exec(be1Seed);
  upgraded.exec(be2Seed);
  upgraded.prepare("UPDATE customers SET business_notes = ? WHERE business_id = ? AND id = ?").run("pre-BE3 durable value", "business-whisker-rest", "booking-contact-nalin");
  upgraded.exec(migrationSql(migrationFiles.at(-1)));
  upgraded.exec(be3Seed);
  assert.equal(
    upgraded.prepare("SELECT business_notes FROM customers WHERE business_id = ? AND id = ?").get("business-whisker-rest", "booking-contact-nalin").business_notes,
    "pre-BE3 durable value",
    "BE3 migration preserves BE2 records",
  );
  assert.equal(upgraded.prepare("SELECT COUNT(*) AS count FROM bookings").get().count, 13);

  for (const database of [first, second, upgraded]) {
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(database.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  }

  assert.throws(() => first.prepare("UPDATE bookings SET status = 'completed' WHERE id = ?").run("booking-fixture-ari-grooming-1030"), /CHECK constraint/i);
  assert.throws(() => first.prepare(`
    INSERT INTO booking_pets (business_id, branch_id, booking_id, pet_id, position, created_at, created_by_person_id)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run("business-whisker-rest", "whisker-ari", "booking-fixture-ari-grooming-1030", "booking-pet-pudding", "2026-09-07T00:00:00.000Z", "prs_01k47meawketting000000001"), /FOREIGN KEY constraint/i);
} finally {
  first.close();
  second.close();
  upgraded.close();
}

console.log(`BE3 migration replay, fixtures, constraints, concurrency guards, and query indexes OK (${migrationFiles.length} files)`);
