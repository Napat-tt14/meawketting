import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { insertStatement, normalizeRow, transfer } from "../scripts/d1-transfer.mjs";

const column = (name, type = "TEXT", pk = 0, notnull = 1) => ({ name, type, pk, notnull });
test("one-time transfer converts whole-baht money and preserves exact integer ledger amounts", () => {
  assert.deepEqual(normalizeRow("bookings", [column("estimate", "INTEGER")], { estimate: 850 }), { estimate: 85000 });
  assert.deepEqual(normalizeRow("message_approvals", [column("additional_price", "INTEGER")], { additional_price: "200" }), { additional_price: 20000 });
  assert.deepEqual(normalizeRow("payments", [column("amount_minor", "INTEGER")], { amount_minor: "20000" }), { amount_minor: 20000 });
  assert.throws(() => normalizeRow("bookings", [column("estimate", "INTEGER")], { estimate: 850.5 }), /integer.*precision/i);
  assert.throws(() => normalizeRow("payments", [column("amount_minor", "INTEGER")], { amount_minor: "9007199254740993" }), /safe precision/);
});
test("one-time transfer normalizes instants while preserving civil dates, JSON and stable IDs", () => {
  const fields = [column("id", "TEXT", 1), column("created_at"), column("start_local"), column("data_json")];
  const source = { id: "stable-domain-id", created_at: new Date("2026-10-13T07:00:00+07:00"), start_local: "2026-10-13T10:00", data_json: '{"label":"แมว"}' };
  assert.deepEqual(normalizeRow("bookings", fields, source), { ...source, created_at: "2026-10-13T00:00:00.000Z" });
  assert.throws(() => normalizeRow("bookings", fields, { ...source, created_at: "invalid" }), /Invalid source instant/);
  assert.throws(() => normalizeRow("bookings", fields, { ...source, id: null }), /Null required/);
});
test("one-time transfer upserts primary keys without SQL interpolation or excessive bindings", () => {
  const fields = [column("id", "TEXT", 1), column("value", "INTEGER")], db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE transfer_fixture(id TEXT PRIMARY KEY NOT NULL,value INTEGER NOT NULL) STRICT");
    for (const value of [1, 2]) {
      const statement = insertStatement("transfer_fixture", fields, { id: "quoted';DROP TABLE transfer_fixture;--", value });
      db.prepare(statement.sql).run(...statement.params);
    }
    assert.equal(db.prepare("SELECT count(*) n FROM transfer_fixture").get().n, 1);
    assert.equal(db.prepare("SELECT value FROM transfer_fixture").get().value, 2);
    assert.throws(() => insertStatement("invalid-name", fields, { id: "id", value: 1 }), /SQL identifier/);
    assert.throws(() => insertStatement("transfer_fixture", Array.from({ length: 91 }, (_, i) => column(`value_${i}`, "INTEGER", i === 0 ? 1 : 0)), {}), /parameter ceiling/);
  } finally { db.close(); }
});
test("one-time transfer refuses remote actions without tests and an active cutover write freeze", async () => {
  await assert.rejects(transfer({}), /active write freeze/);
  await assert.rejects(transfer({ D1_WRITE_FREEZE_CONFIRMED: "yes" }), /successful local tests/);
  await assert.rejects(transfer({ D1_WRITE_FREEZE_CONFIRMED: "yes", D1_TESTS_PASSED_CONFIRMED: "yes" }), /D1_SOURCE_URL is required/);
});
