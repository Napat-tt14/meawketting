import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { migrate, projectRoot, TestSql } from "./d1TestKit";

const now = "2026-10-13T00:00:00.000Z";
const business = "business-whisker-rest", branch = "whisker-ari", person = "prs_01k47meawketting000000001";
function database() { const db = new TestSql(); migrate(db); return db; }
function seed(db: TestSql) {
  for (let phase = 1; phase <= 7; phase++) db.exec(readFileSync(resolve(projectRoot, "tests/fixtures/d1", `seed-be${phase}-dev.sql`), "utf8"));
}

test("empty D1 migration creates strict relational tables, scoped foreign keys and native mutation guards", t => {
  const db = database(); t.after(() => db.close());
  const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  assert.equal(tables.length, 70);
  assert.ok(tables.some(t => t.name === "auth_sessions"));
  assert.ok(!tables.some(t => t.name === "auth_person_links"));
  assert.equal(db.prepare("SELECT count(*) n FROM pragma_table_list WHERE schema='main' AND name NOT LIKE 'sqlite_%' AND type='table' AND strict<>1").get()?.n, 0);
  const foreignKeys = tables.reduce((total, table) => total + new Set(db.prepare(`PRAGMA foreign_key_list(${table.name})`).all().map(row => row.id)).size, 0);
  assert.ok(foreignKeys >= 161);
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_schema WHERE type='trigger'").get()?.n, 81);
  seed(db);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("D1 synthetic seeds replay without duplicate identities, bookings or history", t => {
  const db = database(); t.after(() => db.close()); seed(db);
  const query = "SELECT (SELECT count(*) FROM persons) persons,(SELECT count(*) FROM bookings) bookings,(SELECT count(*) FROM service_executions) executions,(SELECT count(*) FROM execution_events) events";
  const counts = db.prepare(query).get(); seed(db);
  assert.deepEqual(db.prepare(query).get(), counts);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("D1 stores money as integer satang and rejects malformed JSON and noncanonical UTC instants", t => {
  const db = database(); t.after(() => db.close()); seed(db);
  assert.equal(db.prepare("SELECT estimate FROM booking_services WHERE id=?").get("ari-grooming-bath-groom")?.estimate, 85000);
  assert.equal(db.prepare("SELECT estimate FROM bookings WHERE id=?").get("booking-fixture-ari-grooming-1030")?.estimate, 85000);
  assert.throws(() => db.prepare("UPDATE booking_services SET estimate=? WHERE id=?").run(85000.5, "ari-grooming-bath-groom"), /cannot store REAL/);
  for (const invalid of ["2026-10-13 00:00:00", "2026-xx-13T00:00:00.000Z", "2026-13-13T00:00:00.000Z", "2026-02-30T00:00:00.000Z", "2026-10-13T00:00:00Z", "2026-10-13T00:00:00.000+07:00"]) {
    assert.throws(() => db.prepare("UPDATE customers SET updated_at=? WHERE id=?").run(invalid, "booking-contact-nalin"), /ck_customers_updated_at_utc/);
  }
  assert.throws(() => db.prepare("UPDATE service_executions SET details_json=? WHERE id=(SELECT id FROM service_executions LIMIT 1)").run("{broken"), /ck_executions_details/);
  db.prepare("UPDATE customers SET updated_at=? WHERE id=?").run(now, "booking-contact-nalin");
});

test("D1 foreign keys reject cross-Business and cross-Branch child references", t => {
  const db = database(); t.after(() => db.close()); seed(db);
  assert.throws(() => db.prepare("INSERT INTO customer_tags(business_id,customer_id,tag_key,label,position,created_at,updated_at) VALUES(?,?,?,?,?,?,?)")
    .run("business-paw-partner", "booking-contact-nalin", "foreign", "Foreign", 0, now, now), /FOREIGN KEY/);
  assert.throws(() => db.prepare("INSERT INTO booking_resource_assignments(business_id,branch_id,booking_id,resource_id,position,created_at) VALUES(?,?,?,?,?,?)")
    .run(business, "whisker-thonglor", "booking-fixture-ari-grooming-1030", "thonglor-station-a", 0, now), /FOREIGN KEY/);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("D1 identity subjects are unique and session Person links cannot cross identities", t => {
  const db = database(); t.after(() => db.close()); seed(db);
  db.prepare("INSERT INTO auth_identities(id,person_id,provider,provider_subject,created_at,updated_at) VALUES(?,?,?,?,?,?)").run("identity-one", person, "google", "verified-subject", now, now);
  assert.throws(() => db.prepare("INSERT INTO auth_identities(id,provider,provider_subject,created_at,updated_at) VALUES(?,?,?,?,?)").run("identity-two", "google", "verified-subject", now, now), /UNIQUE/);
  assert.throws(() => db.prepare("INSERT INTO auth_sessions(id,identity_id,person_id,token_hash,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?,?)")
    .run("session-one", "identity-one", "prs_01k47meawketting000000002", "a".repeat(64), "2026-10-14T00:00:00.000Z", now, now), /AUTH_SESSION_SCOPE/);
  assert.throws(() => db.prepare("UPDATE auth_identities SET person_id=? WHERE id=?").run("prs_01k47meawketting000000002", "identity-one"), /AUTH_IDENTITY_SCOPE/);
  db.prepare("INSERT INTO auth_sessions(id,identity_id,person_id,token_hash,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?,?)")
    .run("session-one", "identity-one", person, "a".repeat(64), "2026-10-14T00:00:00.000Z", now, now);
  // A historical email-only receipt preserves its Person without inventing a provider subject.
  db.prepare("INSERT INTO business_registrations(person_id,identity_id,business_id,branch_id,request_hash,confirmed_at) VALUES(?,NULL,?,?,?,?)")
    .run(person, business, branch, "b".repeat(64), now);
  assert.equal(db.prepare("SELECT identity_id FROM business_registrations WHERE person_id=?").get(person)?.identity_id, null);
});

test("D1 preserves explicit event order and rejects immutable history changes", t => {
  const db = database(); t.after(() => db.close()); seed(db);
  const execution = db.prepare("SELECT id FROM service_executions WHERE business_id=? LIMIT 1").get(business)?.id;
  db.prepare("INSERT INTO execution_events(sequence,id,business_id,branch_id,execution_id,kind,summary,occurred_at) SELECT ?,?,business_id,branch_id,id,?,?,? FROM service_executions WHERE id=?")
    .run(10000, "imported-event", "history:imported", "Imported chronology", now, execution);
  db.prepare("INSERT INTO execution_events(id,business_id,branch_id,execution_id,kind,summary,occurred_at) SELECT ?,business_id,branch_id,id,?,?,? FROM service_executions WHERE id=?")
    .run("next-event", "history:next", "Later history", now, execution);
  assert.equal(db.prepare("SELECT sequence FROM execution_events WHERE id=?").get("next-event")?.sequence, 10001);
  assert.throws(() => db.prepare("UPDATE execution_events SET summary=? WHERE id=?").run("Changed", "imported-event"), /BE4_IMMUTABLE_EVENT/);
  assert.throws(() => db.prepare("DELETE FROM execution_events WHERE id=?").run("imported-event"), /BE4_IMMUTABLE_EVENT/);
});

test("critical D1 list/range/outbox queries use indexes without full table scans", t => {
  const db = database(); t.after(() => db.close()); seed(db);
  const queries: [string, unknown[]][] = [
    ["SELECT id FROM bookings WHERE business_id=? AND branch_id=? AND start_minute<? AND end_minute>? ORDER BY start_minute,id", [business, branch, 29800000, 29780000]],
    ["SELECT id FROM customers WHERE business_id=? AND status=? AND display_name_key>? ORDER BY display_name_key,id LIMIT 51", [business, "active", ""]],
    ["SELECT id FROM charges WHERE business_id=? AND branch_id=? AND id>? ORDER BY id LIMIT 51", [business, branch, ""]],
    ["SELECT id FROM messages WHERE business_id=? AND conversation_id=? AND branch_id=? AND sequence<? ORDER BY sequence DESC LIMIT 101", [business, "conversation", branch, 1000]],
    ["SELECT branch_id FROM conversation_contexts WHERE business_id=? AND conversation_id=?", [business, "conversation"]],
    ["SELECT id FROM message_outbox WHERE state IN ('queued','retry') AND available_at<=? AND (lease_until IS NULL OR lease_until<=?)", [now, now]],
  ];
  for (const [query, bindings] of queries) {
    const plans = db.prepare(`EXPLAIN QUERY PLAN ${query}`).all(...bindings).map(row => String(row.detail));
    assert.ok(plans.some(plan => plan.startsWith("SEARCH ")), `${query}: ${plans.join("; ")}`);
    assert.ok(plans.every(plan => !plan.startsWith("SCAN ") && !plan.startsWith("USE TEMP B-TREE")), `${query}: ${plans.join("; ")}`);
  }
});
