import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import { D1DatabaseAdapter } from "../app/_backend/d1";
import { batch } from "../app/_backend/shared/database";
import { D1Be1Repository } from "../app/_backend/be1/d1Repository";
import { D1Be2Repository } from "../app/_backend/be2/d1Repository";
import { D1Be3Repository } from "../app/_backend/be3/d1Repository";
import { D1Be7Repository } from "../app/_backend/be7/d1Repository";
import { Be3Application } from "../app/_backend/be3/application";
import { Be7Application } from "../app/_backend/be7/application";
import { Be8Application } from "../app/_backend/be8/application";
import type { CrmPage } from "../app/_backend/be8/contracts";
import type { BillingMutationResult } from "../app/_backend/be7/contracts";
import type { PreparedStatement } from "../app/_backend/be1/repository";
import { OWNER, WHISKER, ARI, metadata } from "./d1Fixtures";

function seedStatements(sql: string) {
  const statements: string[] = []; let start = 0, quote = "", lineComment = false, blockComment = false;
  for (let i = 0; i < sql.length; i++) {
    const character = sql[i], next = sql[i + 1];
    if (lineComment) { if (character === "\n") lineComment = false; continue; }
    if (blockComment) { if (character === "*" && next === "/") { blockComment = false; i++; } continue; }
    if (quote) { if (character === quote) { if (next === quote) i++; else quote = ""; } continue; }
    if (["'", '"', "`"].includes(character)) quote = character;
    else if (character === "-" && next === "-") { lineComment = true; i++; }
    else if (character === "/" && next === "*") { blockComment = true; i++; }
    else if (character === ";") { statements.push(sql.slice(start, i + 1)); start = i + 1; }
  }
  assert.equal(quote, ""); assert.equal(blockComment, false);
  assert.match(sql.slice(start), /^(\s|--[^\n]*(\n|$))*$/);
  return statements;
}

test("native D1 binding applies schema, reports metadata and atomically enforces guards", async () => {
  const runtime = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('test'); } };", compatibilityDate: "2026-05-15", d1Databases: ["DB"], d1Persist: false });
  try {
    const binding = await runtime.getD1Database("DB"), db = new D1DatabaseAdapter(binding as unknown as D1Database);
    // Each reviewed baseline DDL starts on its own line; trigger bodies stay in the same statement.
    const statements = readFileSync("migrations/d1/0001_initial.sql", "utf8").split(/(?=^CREATE\b)/m).filter(sql => /^CREATE\b/.test(sql));
    await binding.batch(statements.map(sql => binding.prepare(sql)));
    assert.equal(await db.prepare("SELECT count(*) n FROM sqlite_schema WHERE type='trigger'").first("n"), 81);
    assert.equal((await db.prepare("PRAGMA foreign_key_check").all()).results?.length, 0);
    const now = "2026-10-13T00:00:00.000Z";
    const insert = db.prepare("INSERT INTO persons(id,display_name,created_at,updated_at) VALUES(?,?,?,?)");
    await assert.rejects(batch(db, [insert.bind("person-native-test-01", "Native", now, now), db.prepare("INSERT INTO backend_guards(id,allowed) VALUES('native-denied',0)")]), { code: "FORBIDDEN" });
    assert.equal(await db.prepare("SELECT count(*) n FROM persons").first("n"), 0);
    await assert.rejects(insert.bind("person-native-test-01", "Native", "invalid", now).run(), /ck_persons_created_at_utc/);
    const result = await db.batch([insert.bind("person-native-test-01", "Native", now, now), db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) VALUES('native-version',1,changes())")]);
    assert.equal(result[0].meta?.changes, 1);
    assert.equal(await db.prepare("SELECT allowed FROM backend_guards WHERE id=?").bind("native-version").first("allowed"), 1);
    assert.ok(db.metrics.reportedStatements > 0); assert.ok(db.metrics.rpcDuration > 0);
    await assert.rejects(db.prepare("UPDATE persons SET status='invalid' WHERE id=?").bind("person-native-test-01").run(), /ck_status_lifecycle/);

    const seedFiles = ["seed-be1-dev.sql", "seed-be2-dev.sql", "seed-be3-dev.sql", "seed-execution-plans.sql", "seed-be4-dev.sql", "seed-be5-dev.sql", "seed-be6-dev.sql", "seed-be7-dev.sql"];
    const seeds = seedFiles.flatMap(file => seedStatements(readFileSync(`tests/fixtures/d1/${file}`, "utf8")));
    await binding.batch(seeds.map(sql => binding.prepare(sql)));
    const auth = new D1Be1Repository(db), planning = new Be3Application(auth, new D1Be2Repository(db), new D1Be3Repository(db)), actor = await planning.resolvePerson(OWNER);
    const input = { businessId: WHISKER, branchId: ARI, serviceId: "ari-grooming-bath-groom", customerId: "booking-contact-nalin", petIds: ["booking-pet-mochi"],
      start: "2026-09-10T10:00", end: "2026-09-10T11:30", assignedResourceIds: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"], status: "confirmed" as const, estimate: 850, notes: "" };
    const original = db.batch.bind(db); let commits = 0, release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    db.batch = async statements => {
      if (statements.some(statement => /^\s*INSERT INTO bookings/.test((statement as PreparedStatement & { query: string }).query))) {
        if (++commits === 2) release();
        await gate;
      }
      return original(statements);
    };
    const raced = await Promise.all(["native-race-one", "native-race-two"].map(idempotencyKey => planning.createBooking(actor, { ...input, idempotencyKey }, metadata())));
    db.batch = original;
    assert.equal(raced.filter(result => result.outcome === "created").length, 1);
    assert.equal(raced.filter(result => result.outcome === "conflict").length, 1);
    const winner = raced.find(result => result.outcome === "created")!;
    if (winner.outcome !== "created") throw new Error("Missing native D1 race winner");
    const executionId = await db.prepare("SELECT id FROM service_executions WHERE booking_id=?").bind(winner.booking.id).first<string>("id");
    assert.ok(executionId);
    const billing = new Be7Application(auth, new D1Be7Repository(db, "dev-test"));
    const scope = { businessId: WHISKER, branchId: ARI };
    const charge = await billing.executeBe7(actor, { ...scope, type: "charge.checkout", executionId, requestKey: "native-checkout" }, metadata()) as BillingMutationResult;
    const payment = { ...scope, type: "payment.record" as const, chargeId: charge.balance.charge.chargeId, expectedRevision: charge.balance.charge.revision, requestKey: "native-payment", amount: 100, method: "cash" as const, note: "" };
    await Promise.all([billing.executeBe7(actor, payment, metadata()), billing.executeBe7(actor, payment, metadata())]);
    assert.equal(await db.prepare("SELECT count(*) n FROM payments").first("n"), 1);
    assert.equal(await db.prepare("SELECT sum(amount_minor) n FROM payment_allocations").first("n"), 10000);
    const projections = new Be8Application(auth, db, () => "2026-09-10T04:00:00.000Z");
    const directory = await projections.executeBe8(actor, { ...scope, type: "crm.list", offset: 0, limit: 1 }, metadata()) as CrmPage;
    assert.equal(directory.customers?.length, 1);
    assert.equal(directory.nextOffset, 1);
    const detail = await projections.executeBe8(actor, { ...scope, type: "crm.get", customerId: input.customerId }, metadata()) as CrmPage;
    assert.ok(detail.items[0].timeline.some(event => event.kind === "payment"));
    for (const operation of [{ ...scope, type: "home.summary" }, { ...scope, type: "billing.summary" }, { ...scope, type: "reports.get", options: {} }] as const) {
      assert.ok(await projections.executeBe8(actor, operation, metadata()));
    }
    assert.equal((await db.prepare("PRAGMA foreign_key_check").all()).results?.length, 0);
  } finally { await runtime.dispose(); }
});
