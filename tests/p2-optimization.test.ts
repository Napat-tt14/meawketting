import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, writeFileSync } from "node:fs";
import { D1Be1Repository } from "../app/_backend/be1/d1Repository";
import type { PreparedStatement } from "../app/_backend/be1/repository";
import { Be3Application } from "../app/_backend/be3/application";
import { D1Be2Repository } from "../app/_backend/be2/d1Repository";
import { D1Be3Repository } from "../app/_backend/be3/d1Repository";
import { Be4Application } from "../app/_backend/be4/application";
import { D1Be4Repository } from "../app/_backend/be4/d1Repository";
import { Be7Application } from "../app/_backend/be7/application";
import { D1Be7Repository } from "../app/_backend/be7/d1Repository";
import { Be8Application } from "../app/_backend/be8/application";
import type { HomeSummary, BillingSummary, ReportView } from "../app/_backend/be8/contracts";
import type { BillingMutationResult } from "../app/_backend/be7/contracts";
import { D1DatabaseAdapter } from "../app/_backend/d1";
import { withBackend } from "../app/_backend/runtime";
import { ARI, MANAGER, ONNUT, OWNER, PAW, WHISKER, metadata, seededDatabase } from "./d1Fixtures";

const now = () => "2026-08-18T04:00:00.000Z", scope = { businessId: WHISKER, branchId: ARI };
const input = { ...scope, serviceId: "ari-grooming-bath-groom", customerId: "booking-contact-nalin", petIds: ["booking-pet-mochi"],
  start: "2026-09-10T10:00", end: "2026-09-10T11:30", assignedResourceIds: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"],
  status: "confirmed" as const, estimate: 850, notes: "", idempotencyKey: "p2-note-edit" };

test("notes/estimate edits retain children, guards, revision, write token and audit; reschedules still replace reservations", async () => {
  const db = seededDatabase(), app = new Be3Application(new D1Be1Repository(db), new D1Be2Repository(db), new D1Be3Repository(db));
  const actor = await app.resolvePerson(OWNER), created = await app.createBooking(actor, input, metadata());
  assert.equal(created.outcome, "created");
  const executionRevision = db.inspect.prepare("SELECT revision FROM service_executions WHERE booking_id=?").get(created.booking.id)?.revision;
  const queries: string[] = [];
  db.onQuery = query => queries.push(query);
  const edit = { ...input }, request = metadata();
  const result = await app.updateBooking(actor, { ...edit, bookingId: created.booking.id, expectedRevision: created.booking.revision, notes: "Only the note", estimate: 900 }, request);
  assert.equal(result.outcome, "updated");
  assert.equal(result.booking.revision, created.booking.revision + 1);
  assert.equal(result.booking.notes, "Only the note"); assert.equal(result.booking.estimate, 900);
  assert.equal(db.inspect.prepare("SELECT revision FROM service_executions WHERE booking_id=?").get(created.booking.id)?.revision, executionRevision);
  assert.equal(queries.filter(q => /^(?:\s*)(?:INSERT INTO|DELETE FROM) booking_(pets|resource_assignments|resource_reservations)\b/.test(q)).length, 0);
  assert.equal(db.inspect.prepare("SELECT write_token FROM bookings WHERE id=?").get(created.booking.id)?.write_token, request.requestId);
  assert.equal(Number(db.inspect.prepare("SELECT count(*) n FROM booking_write_commits WHERE booking_id=?").get(created.booking.id)?.n), 2);
  assert.equal(Number(db.inspect.prepare("SELECT count(*) n FROM audit_events WHERE target_id=? AND action='booking.updated'").get(created.booking.id)?.n), 1);
  const stale = await app.updateBooking(actor, { ...edit, bookingId: created.booking.id, expectedRevision: created.booking.revision, notes: "stale" }, metadata()); assert.equal(stale.outcome, "conflict");
  queries.length = 0;
  const moved = await app.rescheduleBooking(actor, { ...scope, bookingId: created.booking.id, expectedRevision: result.booking.revision, start: "2026-09-10T12:00", end: "2026-09-10T13:30" }, metadata());
  assert.equal(moved.outcome, "updated"); assert.ok(queries.some(q => /DELETE FROM booking_resource_reservations/.test(q)));
});

test("request authorization is reused only inside one request and a commit still rejects a revoked grant", async () => {
  const db = seededDatabase(), auth = new D1Be1Repository(db), app = new Be4Application(auth, new D1Be2Repository(db), new D1Be3Repository(db), new D1Be4Repository(db), now);
  const queries: string[] = [];
  db.onQuery = query => queries.push(query);
  await withBackend(new Request("https://test.invalid/api/be4"), {}, async () => {
    const actor = await app.resolvePerson(MANAGER); await app.executeBe4(actor, { ...scope, type: "operations.metadata" }, metadata());
    assert.equal(queries.filter(q => /FROM persons\s+WHERE/i.test(q)).length, 1);
    assert.equal(queries.filter(q => /FROM business_memberships\s+WHERE/i.test(q)).length, 1);
    assert.equal(queries.filter(q => /FROM businesses\s+WHERE/i.test(q)).length, 1);
    db.inspect.prepare("UPDATE membership_branch_access SET status='inactive' WHERE branch_id=? AND membership_id IN (SELECT id FROM business_memberships WHERE person_id=?)").run(ARI, MANAGER);
    await assert.rejects(app.executeBe4(actor, { ...scope, type: "staff.save", draft: { businessId: WHISKER, branchIds: [ARI], name: "Denied", role: "staff", capabilities: ["front-desk"] }, expectedRevision: null, requestKey: "p2-revoked" }, metadata()));
    return new Response(null);
  });
  await withBackend(new Request("https://test.invalid/api/be4"), {}, async () => {
    await assert.rejects(app.executeBe4(await app.resolvePerson(MANAGER), { ...scope, type: "operations.metadata" }, metadata())); return new Response(null);
  });
});

test("notes-only commit rechecks capacity if it changes after availability; rejection is atomic", async () => {
  const db = seededDatabase(), app = new Be3Application(new D1Be1Repository(db), new D1Be2Repository(db), new D1Be3Repository(db));
  const actor = await app.resolvePerson(OWNER);
  const hotel = { ...input, serviceId: "ari-hotel-stay", petIds: ["booking-pet-mochi", "booking-pet-biscuit"], start: "2026-09-10", end: "2026-09-12", assignedResourceIds: ["ari-hotel-capacity"], idempotencyKey: "p2-capacity-race" };
  const created = await app.createBooking(actor, hotel, metadata()); if (created.outcome === "conflict") throw new Error("Fixture unavailable");
  const original = db.batch.bind(db); let raced = false;
  db.batch = async statements => {
    if (!raced && statements.some(s => /^\s*UPDATE bookings/.test((s as PreparedStatement & { query: string }).query))) {
      raced = true; db.inspect.prepare("UPDATE booking_resources SET capacity=1 WHERE business_id=? AND branch_id=? AND id=?").run(WHISKER, ARI, "ari-hotel-capacity");
    }
    return original(statements);
  };
  const result = await app.updateBooking(actor, { ...hotel, bookingId: created.booking.id, expectedRevision: created.booking.revision, notes: "Must roll back" }, metadata());
  assert.equal(result.outcome, "conflict"); if (result.outcome !== "conflict") throw new Error("Capacity conflict missing");
  assert.ok(result.availability.conflicts.some(c => c.code === "CAPACITY_CONFLICT"));
  const row = db.inspect.prepare("SELECT notes,revision FROM bookings WHERE id=?").get(created.booking.id)!;
  assert.equal(row.notes, ""); assert.equal(row.revision, created.booking.revision);
  assert.equal(Number(db.inspect.prepare("SELECT count(*) n FROM booking_write_commits WHERE booking_id=?").get(created.booking.id)?.n), 1);
});

test("notes-only commit rechecks Grooming execution assignments that move after availability; rejection is atomic", async () => {
  const db = seededDatabase(), app = new Be3Application(new D1Be1Repository(db), new D1Be2Repository(db), new D1Be3Repository(db));
  const actor = await app.resolvePerson(OWNER), created = await app.createBooking(actor, input, metadata());
  if (created.outcome === "conflict") throw new Error("Fixture unavailable");
  const other = await app.createBooking(actor, { ...input, start: "2026-09-10T12:00", end: "2026-09-10T13:30", idempotencyKey: "p2-other-execution" }, metadata());
  if (other.outcome === "conflict") throw new Error("Fixture unavailable");
  const original = db.batch.bind(db); let raced = false;
  db.batch = async statements => {
    if (!raced && statements.some(s => /^\s*UPDATE bookings/.test((s as PreparedStatement & { query: string }).query))) {
      raced = true; db.inspect.prepare(`UPDATE execution_assignments SET start_local=?,end_local=? WHERE business_id=? AND branch_id=?
        AND execution_id IN (SELECT id FROM service_executions WHERE business_id=? AND branch_id=? AND booking_id=?)`).run(input.start, input.end, WHISKER, ARI, WHISKER, ARI, other.booking.id);
    }
    try { return await original(statements); }
    catch (error) { Reflect.deleteProperty(error as object, "detail"); throw error; }
  };
  const result = await app.updateBooking(actor, { ...input, bookingId: created.booking.id, expectedRevision: created.booking.revision, notes: "Must roll back" }, metadata());
  assert.equal(result.outcome, "conflict"); if (result.outcome !== "conflict") throw new Error("Execution conflict missing");
  assert.ok(result.availability.conflicts.some(c => c.code === "TIME_CONFLICT"), JSON.stringify(result.availability));
  const row = db.inspect.prepare("SELECT notes,revision FROM bookings WHERE id=?").get(created.booking.id)!;
  assert.equal(row.notes, ""); assert.equal(row.revision, created.booking.revision);
});

test("notes-only commit rechecks Daycare occupancy outside Booking reservations; rejection is atomic", async () => {
  const db = seededDatabase(), app = new Be3Application(new D1Be1Repository(db), new D1Be2Repository(db), new D1Be3Repository(db));
  const actor = await app.resolvePerson(OWNER);
  db.inspect.prepare("UPDATE booking_resources SET capacity=1 WHERE business_id=? AND branch_id=? AND id=?").run(PAW, ONNUT, "onnut-daycare-social");
  const daycare = { ...input, businessId: PAW, branchId: ONNUT, serviceId: "onnut-daycare-full-day", customerId: "booking-contact-onnut-aom", petIds: ["booking-pet-pudding"],
    start: "2026-09-10", end: null, assignedResourceIds: ["onnut-daycare-social"], idempotencyKey: "p2-daycare-occupancy" };
  const created = await app.createBooking(actor, daycare, metadata()); if (created.outcome === "conflict") throw new Error("Fixture unavailable");
  const other = await app.createBooking(actor, { ...daycare, start: "2026-09-09", assignedResourceIds: ["onnut-daycare-quiet"], idempotencyKey: "p2-other-daycare" }, metadata());
  if (other.outcome === "conflict") throw new Error("Fixture unavailable");
  const original = db.batch.bind(db); let raced = false;
  db.batch = async statements => {
    if (!raced && statements.some(s => /^\s*UPDATE bookings/.test((s as PreparedStatement & { query: string }).query))) {
      raced = true;
      db.inspect.prepare("UPDATE service_executions SET status='active' WHERE business_id=? AND branch_id=? AND booking_id=?").run(PAW, ONNUT, other.booking.id);
      db.inspect.prepare(`UPDATE execution_assignments SET resource_id=?,start_local=?,end_local=? WHERE business_id=? AND branch_id=?
        AND execution_id IN (SELECT id FROM service_executions WHERE business_id=? AND branch_id=? AND booking_id=?)`).run("onnut-daycare-social", daycare.start, "2026-09-11", PAW, ONNUT, PAW, ONNUT, other.booking.id);
    }
    return original(statements);
  };
  const result = await app.updateBooking(actor, { ...daycare, bookingId: created.booking.id, expectedRevision: created.booking.revision, notes: "Must roll back" }, metadata());
  assert.equal(result.outcome, "conflict"); if (result.outcome !== "conflict") throw new Error("Daycare conflict missing");
  assert.ok(result.availability.conflicts.some(c => c.code === "CAPACITY_CONFLICT"), JSON.stringify(result.availability));
  const row = db.inspect.prepare("SELECT notes,revision FROM bookings WHERE id=?").get(created.booking.id)!;
  assert.equal(row.notes, ""); assert.equal(row.revision, created.booking.revision);
});

test("summary projections match Reports money and waiting intake without analytical queries or cross-scope data", async () => {
  const db = seededDatabase(); for (const phase of [5, 6, 7]) db.inspect.exec(readFileSync(`tests/fixtures/d1/seed-be${phase}-dev.sql`, "utf8"));
  const auth = new D1Be1Repository(db), billing = new Be7Application(auth, new D1Be7Repository(db, "dev-test"), undefined, now), app = new Be8Application(auth, db, now);
  const actor = await app.resolvePerson(OWNER), executionId = db.inspect.prepare("SELECT id FROM service_executions WHERE business_id=? AND branch_id=? AND module='grooming' LIMIT 1").get(WHISKER, ARI)!.id as string;
  const checkout = await billing.executeBe7(actor, { ...scope, type: "charge.checkout", executionId, requestKey: "p2-money" }, metadata()) as BillingMutationResult;
  await billing.executeBe7(actor, { ...scope, type: "payment.record", chargeId: checkout.balance.charge.chargeId, expectedRevision: checkout.balance.charge.revision, requestKey: "p2-payment", amount: 100, method: "cash", note: "" }, metadata());
  const report = await app.executeBe8(actor, { ...scope, type: "reports.get", options: {} }, metadata()) as ReportView;
  const summary = await app.executeBe8(actor, { ...scope, type: "billing.summary" }, metadata()) as BillingSummary;
  const home = await app.executeBe8(actor, { ...scope, type: "home.summary" }, metadata()) as HomeSummary;
  assert.deepEqual(summary.revenueSummary, report.revenueSummary); assert.deepEqual(home.revenueSummary, report.revenueSummary);
  assert.equal(home.waitingIntake, report.waitingIntake); assert.ok(home.bookings.every(b => b.businessId === WHISKER && b.branchId === ARI && b.status !== "cancelled"));
  assert.equal(home.bookingTrend.length, 7);
  for (const day of home.bookingTrend) {
    const expected = db.inspect.prepare(`SELECT count(*) n FROM bookings b WHERE b.business_id=? AND b.branch_id=? AND b.status<>'cancelled'
      AND EXISTS(SELECT 1 FROM branch_enabled_modules m WHERE m.business_id=b.business_id AND m.branch_id=b.branch_id AND m.module=b.service_module)
      AND CASE WHEN b.time_model='date-range' THEN b.start_local<=? AND b.end_local>? ELSE substr(b.start_local,1,10)=? END`).get(WHISKER, ARI, day.date, day.date, day.date);
    assert.equal(day.count, Number(expected?.n));
  }
  assert.ok(home.bookings.every(b => !("notes" in b) && !("assignedResourceIds" in b)));
  assert.equal("customerInsights" in summary, false); assert.equal("operationalInsights" in home, false);
  await assert.rejects(app.executeBe8(await app.resolvePerson(MANAGER), { businessId: PAW, branchId: ARI, type: "billing.summary" }, metadata()));
});

test("D1 ignores disconnects after a write starts and discards cancelled reads", async () => {
  const db = seededDatabase();
  db.inspect.exec("CREATE TABLE disconnects(id INTEGER PRIMARY KEY,value INTEGER); INSERT INTO disconnects VALUES(1,0)");
  const readController = new AbortController(), readDb = new D1DatabaseAdapter(db.binding, readController.signal);
  readController.abort();
  await assert.rejects(readDb.prepare("SELECT value FROM disconnects").all(), { name: "AbortError" });
  const writeController = new AbortController(), writeDb = new D1DatabaseAdapter(db.binding, writeController.signal);
  const pending = writeDb.batch([writeDb.prepare("UPDATE disconnects SET value=2 WHERE id=1")]);
  writeController.abort(); await pending;
  assert.equal(await writeDb.prepare("SELECT value FROM disconnects WHERE id=1").first("value"), 2);
  assert.equal(await db.prepare("SELECT 42 value").first("value"), 42);
});
test("P2 cost probe measures canonical reads, catalog reuse and notes-only writes", async () => {
  const db = seededDatabase(); for (const phase of [5, 6, 7]) db.inspect.exec(readFileSync(`tests/fixtures/d1/seed-be${phase}-dev.sql`, "utf8"));
  const auth = new D1Be1Repository(db), identities = new D1Be2Repository(db), bookings = new D1Be3Repository(db);
  const be3 = new Be3Application(auth, identities, bookings), be4 = new Be4Application(auth, identities, bookings, new D1Be4Repository(db), now);
  const be7 = new Be7Application(auth, new D1Be7Repository(db, "dev-test"), undefined, now), be8 = new Be8Application(auth, db, now);
  const actor = await be3.resolvePerson(OWNER), created = await be3.createBooking(actor, input, metadata()); if (created.outcome === "conflict") throw new Error("Fixture unavailable");
  const executionId = db.inspect.prepare("SELECT id FROM service_executions WHERE business_id=? AND branch_id=? AND module='grooming' LIMIT 1").get(WHISKER, ARI)!.id as string;
  await be7.executeBe7(actor, { ...scope, type: "charge.checkout", executionId, requestKey: "p2-probe" }, metadata());
  const original = db.batch.bind(db); let queries: string[] = [], transactions = 0; const results: Record<string, unknown>[] = [];
  db.onQuery = query => queries.push(query);
  db.batch = async statements => { transactions++; return original(statements); };
  async function measure(label: string, task: () => Promise<unknown>) {
    queries = []; transactions = 0;
    await withBackend(new Request("https://test.invalid/api/probe"), {}, async () => { await task(); return new Response(null); });
    results.push({ label, apiCalls: 1, logicalStatements: queries.length, transactions, writes: queries.filter(q => /^\s*(INSERT|UPDATE|DELETE)\b/i.test(q)).length,
      childWrites: queries.filter(q => /^\s*(INSERT INTO|DELETE FROM) booking_(pets|resource_assignments|resource_reservations)\b/.test(q)).length });
  }
  await measure("reports.get", async () => be8.executeBe8(await be8.resolvePerson(OWNER), { ...scope, type: "reports.get", options: {} }, metadata()));
  await measure("home.summary", async () => be8.executeBe8(await be8.resolvePerson(OWNER), { ...scope, type: "home.summary" }, metadata()));
  await measure("billing.summary", async () => be8.executeBe8(await be8.resolvePerson(OWNER), { ...scope, type: "billing.summary" }, metadata()));
  await measure("operations.list.owner", async () => be4.executeBe4(await be4.resolvePerson(OWNER), { ...scope, type: "operations.list", limit: 100 }, metadata()));
  await measure("crm.list", async () => be8.executeBe8(await be8.resolvePerson(OWNER), { ...scope, type: "crm.list", limit: 50 }, metadata()));
  await measure("booking.catalog", async () => be3.getCatalog(await be3.resolvePerson(OWNER), WHISKER, ARI));
  await measure("charges.list", async () => be7.executeBe7(await be7.resolvePerson(OWNER), { ...scope, type: "charges.list", limit: 50 }, metadata()));
  assert.equal(queries.filter(q => q.includes(" total_minor,")).length, 1);
  await measure("payments.list.empty", async () => be7.executeBe7(await be7.resolvePerson(OWNER), { ...scope, type: "payments.list", limit: 50 }, metadata()));
  const edit = { ...input };
  await measure("booking.update.notes-only", async () => {
    const updated = await be3.updateBooking(actor, { ...edit, bookingId: created.booking.id, expectedRevision: created.booking.revision, notes: "Only the note changed" }, metadata()); assert.equal(updated.outcome, "updated");
  });
  assert.equal(results.at(-1)!.childWrites, 0);
  console.log(JSON.stringify({ results }));
  writeFileSync("work/d1-query-counts.json", JSON.stringify({ note: "Measured against local SQLite/D1, request-scoped context; excludes auth network/link lookup, transaction-control SQL and trigger-internal work.", results }, null, 2));
  assert.ok((results.find(r => r.label === "home.summary")!.logicalStatements as number) < (results[0].logicalStatements as number));
});
