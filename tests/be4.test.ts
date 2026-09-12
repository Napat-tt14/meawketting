import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { D1Be1Repository } from "../app/_backend/be1/d1Repository";
import { Be1Error } from "../app/_backend/be1/errors";
import { D1Be2Repository } from "../app/_backend/be2/d1Repository";
import { Be3Application } from "../app/_backend/be3/application";
import type { CreateBookingInput } from "../app/_backend/be3/contracts";
import { D1Be3Repository } from "../app/_backend/be3/d1Repository";
import { Be4Application } from "../app/_backend/be4/application";
import type { ExecutionChange, ExecutionView } from "../app/_backend/be4/contracts";
import { D1Be4Repository } from "../app/_backend/be4/d1Repository";
import { executionId } from "../app/_backend/be4/domain";
import { BackendConflict } from "../app/_backend/shared/errors";
import { businessRequest } from "../app/_backend/shared/http";
import { ARI, INACTIVE, MANAGER, metadata, ONNUT, OUTSIDER, OWNER, PAW, seededDatabase, THONGLOR, WHISKER } from "./backendTestKit";

async function fixture() {
  const db = seededDatabase(), auth = new D1Be1Repository(db), identities = new D1Be2Repository(db), bookings = new D1Be3Repository(db), operations = new D1Be4Repository(db);
  let tick = 0;
  const now = () => new Date(Date.parse("2026-08-20T04:00:00Z") + tick++ * 1000).toISOString();
  const app = new Be4Application(auth, identities, bookings, operations, now), planning = new Be3Application(auth, identities, bookings, { now });
  const actor = await app.resolvePerson(OWNER);
  const create = async (overrides: Partial<CreateBookingInput> = {}) => {
    const result = await planning.createBooking(actor, { businessId: WHISKER, branchId: ARI, serviceId: "ari-grooming-bath-groom", customerId: "booking-contact-nalin", petIds: ["booking-pet-mochi"],
      start: "2026-08-27T10:00", end: "2026-08-27T11:30", assignedResourceIds: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"], status: "confirmed", estimate: 850, notes: "", idempotencyKey: `key_${crypto.randomUUID()}`, ...overrides }, metadata());
    assert.equal(result.outcome, "created", JSON.stringify(result));
    if (result.outcome !== "created") throw new Error("Booking did not persist");
    return { booking: result.booking, executions: await operations.forBooking(result.booking.businessId, result.booking.branchId, result.booking.id) };
  };
  const change = (value: ExecutionView, change: ExecutionChange, requestKey = `key_${crypto.randomUUID()}`) => app.executeBe4(actor, { type: "operations.change", input: {
    businessId: value.record.businessId, branchId: value.record.branchId, executionId: executionId(value), expectedRevision: value.record.revision, requestKey, change } }, metadata());
  return { db, app, actor, planning, bookings, operations, create, change };
}
const reason = (expected: string) => (error: unknown) => error instanceof BackendConflict && error.reason === expected;
const code = (expected: string) => (error: unknown) => error instanceof Be1Error && error.code === expected;
const hotel = { serviceId: "ari-hotel-stay", start: "2026-08-27", end: "2026-08-30", assignedResourceIds: ["ari-hotel-capacity"] };
const daycare = { businessId: PAW, branchId: ONNUT, serviceId: "onnut-daycare-full-day", customerId: "booking-contact-onnut-aom", petIds: ["booking-pet-pudding"], start: "2026-08-27", end: null, assignedResourceIds: ["onnut-daycare-quiet"] };

test("BE3 upgrade creates durable per-Pet plans once, retains inactive planning references and never invents completion", (t) => {
  const db = new DatabaseSync(":memory:"); t.after(() => db.close()); db.exec("PRAGMA foreign_keys=ON");
  const files = readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort();
  for (const file of files.slice(0, 4)) db.exec(readFileSync(`drizzle/${file}`, "utf8"));
  for (const n of [1, 2, 3]) db.exec(readFileSync(`scripts/seed-be${n}-dev.sql`, "utf8"));
  const expected = db.prepare("SELECT count(*) n FROM booking_pets p JOIN bookings b ON b.business_id=p.business_id AND b.id=p.booking_id WHERE b.status<>'cancelled'").get()?.n;
  for (const file of files.slice(4)) db.exec(readFileSync(`drizzle/${file}`, "utf8"));
  assert.equal(db.prepare("SELECT count(*) n FROM service_executions").get()?.n, expected);
  assert.equal(db.prepare("SELECT count(*) n FROM service_executions WHERE status<>'booked'").get()?.n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM service_records").get()?.n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM execution_events WHERE json_extract(data_json,'$.reason')='inactive-at-upgrade'").get()?.n, 2);
  db.exec(readFileSync("drizzle/0006_be4_booking_execution_backfill.sql", "utf8"));
  assert.equal(db.prepare("SELECT count(*) n FROM service_executions").get()?.n, expected);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("two concurrent Hotel assignments cannot consume the same last room capacity", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close());
  const { executions } = await f.create({ ...hotel, petIds: ["booking-pet-mochi", "booking-pet-milo"] });
  const results = await Promise.allSettled(executions.map((e) => f.change(e, { type: "hotel-room", roomId: "ari-hotel-room-a01", effectiveDate: null, reason: "" })));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const failed = results.find((r) => r.status === "rejected"); assert.ok(failed?.status === "rejected" && reason("capacity")(failed.reason));
  assert.equal(f.db.sqlite.prepare("SELECT count(*) n FROM execution_assignments WHERE space_id='ari-hotel-room-a01'").get()?.n, 1);
});

test("operational staff updates generate schedulable resources, derive current names and fail on stale revisions", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close());
  const beforePersons = f.db.sqlite.prepare("SELECT count(*) n FROM persons").get()?.n;
  const input = { type: "staff.save" as const, businessId: WHISKER, branchId: ARI, expectedRevision: null, requestKey: "staff-create-retry",
    draft: { name: "ทีมทดสอบ", role: "staff" as const, capabilities: ["grooming" as const], branchIds: [ARI], active: true, availability: [] } };
  const created = await f.app.executeBe4(f.actor, input, metadata());
  assert.equal((await f.app.executeBe4(f.actor, input, metadata())).staffId, created.staffId);
  const resource = (await f.bookings.listResources(WHISKER, ARI)).find((r) => r.compatibilityStaffId === created.staffId);
  assert.ok(resource); assert.deepEqual(resource.serviceIds, ["ari-grooming-bath-groom"]);
  assert.equal(f.db.sqlite.prepare("SELECT count(*) n FROM persons").get()?.n, beforePersons);
  const update = { ...input, expectedRevision: created.revision, requestKey: "staff-update-name", draft: { ...input.draft, staffId: created.staffId, name: "ชื่อใหม่" } };
  await f.app.executeBe4(f.actor, update, metadata());
  assert.equal((await f.bookings.listResources(WHISKER, ARI)).find((r) => r.id === resource.id)?.label, "ชื่อใหม่");
  await assert.rejects(f.app.executeBe4(f.actor, { ...update, requestKey: "stale-staff-update" }, metadata()), reason("version-conflict"));
  const current = (await f.operations.staff(WHISKER, ARI)).find((s) => s.staffId === created.staffId)!;
  await f.app.executeBe4(f.actor, { ...update, expectedRevision: current.revision, requestKey: "staff-deactivate", draft: { ...update.draft, active: false } }, metadata());
  assert.equal((await f.bookings.listResources(WHISKER, ARI)).find((r) => r.id === resource.id)?.status, "inactive");
});

test("staff availability changes between validation and commit invalidate the execution assignment", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close());
  const { executions } = await f.create();
  const save = f.operations.save.bind(f.operations);
  f.operations.save = async (write, additional) => {
    f.db.sqlite.prepare("UPDATE operation_staff SET revision=revision+1,status='inactive' WHERE id='team-pim'").run();
    return save(write, additional);
  };
  await assert.rejects(f.change(executions[0], { type: "transition", status: "in-service" }), reason("version-conflict"));
  assert.equal((await f.operations.get(WHISKER, ARI, executionId(executions[0])))?.record.status, "booked");
});

test("multi-Pet Grooming shares a Booking reservation, completes each Pet independently and creates one canonical record", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close());
  const { booking, executions } = await f.create({ petIds: ["booking-pet-mochi", "booking-pet-milo"] });
  assert.equal(executions.length, 2);
  assert.equal(f.db.sqlite.prepare("SELECT sum(units) AS n FROM booking_resource_reservations WHERE booking_id=?").get(booking.id)?.n, 3);
  for (const original of executions) {
    let job = original;
    for (const status of ["checked-in", "in-service", "ready-for-pickup", "completed"] as const) job = await f.change(job, { type: "transition", status });
    assert.equal(job.record.status, "completed");
  }
  const records = await f.operations.records(WHISKER, ARI);
  assert.equal(records.length, 2); assert.equal(new Set(records.map((r) => r.petId)).size, 2);
  assert.equal((await f.bookings.getBooking(WHISKER, ARI, booking.id))?.status, "confirmed");
  assert.deepEqual(f.db.sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(f.db.sqlite.prepare("SELECT count(*) AS n FROM backend_guards").get()?.n, 0);
});

test("Hotel enforces per-day room capacity, preserves room moves, and requires care before checkout", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close());
  const { executions } = await f.create({ ...hotel, petIds: ["booking-pet-mochi", "booking-pet-milo"] });
  let stay = await f.change(executions[0], { type: "hotel-room", roomId: "ari-hotel-room-a01", effectiveDate: null, reason: "" });
  await assert.rejects(f.change(executions[1], { type: "hotel-room", roomId: "ari-hotel-room-a01", effectiveDate: null, reason: "" }), reason("capacity"));
  stay = await f.change(stay, { type: "hotel-room", roomId: "ari-hotel-room-a02", effectiveDate: "2026-08-28", reason: "ย้ายโซน" });
  stay = await f.change(stay, { type: "transition", status: "checked-in" });
  stay = await f.change(stay, { type: "transition", status: "in-stay" });
  stay = await f.change(stay, { type: "transition", status: "ready-for-checkout" });
  await assert.rejects(f.change(stay, { type: "transition", status: "checked-out" }), reason("care-incomplete"));
  assert.equal(stay.kind, "hotel"); if (stay.kind !== "hotel") throw new Error();
  for (const task of stay.record.dailyCareTasks) stay = await f.change(stay, { type: "hotel-care-complete", taskId: task.id });
  stay = await f.change(stay, { type: "transition", status: "checked-out" });
  await f.change(stay, { type: "transition", status: "completed" });
  const records = await f.operations.records(WHISKER, ARI); assert.equal(records.length, 1);
  const reloaded = await f.operations.get(WHISKER, ARI, executionId(stay));
  assert.equal(reloaded?.kind, "hotel"); if (reloaded?.kind === "hotel") assert.equal(reloaded.record.roomMoveHistory.length, 1);
});

test("Daycare counts active Pets, enforces zone capacity and stores care/staff through completion", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close());
  const pair = await f.create({ ...daycare, petIds: ["booking-pet-pudding", "booking-pet-maple"] });
  const third = await f.create({ ...daycare, customerId: "booking-contact-onnut-lee", petIds: ["booking-pet-leo"] });
  for (const original of pair.executions) {
    let day = await f.change(original, { type: "daycare-zone", zoneId: "onnut-daycare-social" });
    day = await f.change(day, { type: "daycare-staff", staffId: "team-mint" });
    await f.change(day, { type: "transition", status: "checked-in" });
  }
  let day = await f.change(third.executions[0], { type: "daycare-zone", zoneId: "onnut-daycare-social" });
  await assert.rejects(f.change(day, { type: "transition", status: "checked-in" }), reason("capacity"));
  day = await f.change(day, { type: "daycare-zone", zoneId: "onnut-daycare-quiet" });
  day = await f.change(day, { type: "transition", status: "checked-in" });
  day = await f.change(day, { type: "transition", status: "active" });
  day = await f.change(day, { type: "daycare-care", kind: "water", note: "เติมน้ำ" });
  for (const status of ["ready-for-pickup", "checked-out", "completed"] as const) day = await f.change(day, { type: "transition", status });
  assert.equal((await f.operations.records(PAW, ONNUT)).length, 1);
});

test("authorization denies inaccessible Branch, foreign targets, inactive membership and spoofed resource/staff", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { executions } = await f.create(); const job = executions[0];
  for (const personId of [OUTSIDER, INACTIVE]) await assert.rejects(f.app.executeBe4(await f.app.resolvePerson(personId), { type: "operations.get", businessId: WHISKER, branchId: ARI, executionId: executionId(job) }, metadata()), code("FORBIDDEN"));
  await assert.rejects(f.app.executeBe4(await f.app.resolvePerson(MANAGER), { type: "operations.list", businessId: WHISKER, branchId: THONGLOR }, metadata()), code("NOT_FOUND"));
  await assert.rejects(f.app.executeBe4(f.actor, { type: "operations.get", businessId: PAW, branchId: ONNUT, executionId: executionId(job) }, metadata()), code("NOT_FOUND"));
  await assert.rejects(f.change(job, { type: "grooming-resources", resourceIds: ["thonglor-groomer-nok"] }), reason("invalid-resource"));
  await assert.rejects(f.change(job, { type: "grooming-resources", resourceIds: ["ari-groomer-joy"] }), reason("invalid-resource"));
  f.db.sqlite.exec("UPDATE operation_staff SET status='inactive' WHERE id='team-pim'");
  await assert.rejects(f.change(job, { type: "grooming-resources", resourceIds: ["ari-groomer-pim"] }), reason("invalid-resource"));
});

test("concurrent retries replay the same command; stale different writes cannot replace notes or append receipts", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { executions } = await f.create(); const job = executions[0];
  const copies = await Promise.all([f.change(job, { type: "note", note: "สำคัญ" }, "same-request"), f.change(job, { type: "note", note: "สำคัญ" }, "same-request")]);
  assert.equal(copies[0].record.revision, copies[1].record.revision);
  await assert.rejects(f.change(job, { type: "note", note: "changed" }, "same-request"), reason("idempotency"));
  const results = await Promise.allSettled([f.change(copies[0], { type: "note", note: "first" }, "first-window"), f.change(copies[0], { type: "note", note: "second" }, "second-window")]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(f.db.sqlite.prepare("SELECT count(*) AS n FROM backend_mutations").get()?.n, 2);
  const audits = JSON.stringify(f.db.sqlite.prepare("SELECT before_json,after_json FROM audit_events WHERE target_type='execution'").all());
  assert.doesNotMatch(audits, /สำคัญ|first|second/);
});

test("Service Record failure rolls back completion, audit and idempotency; retry can succeed", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { executions } = await f.create(); const job = executions[0];
  f.db.sqlite.exec("CREATE TRIGGER test_storage_failure BEFORE INSERT ON service_records BEGIN SELECT RAISE(ABORT,'simulated outage'); END");
  await assert.rejects(f.change(job, { type: "transition", status: "completed" }, "completion-retry"), code("PERSISTENCE_ERROR"));
  assert.equal((await f.operations.get(WHISKER, ARI, executionId(job)))?.record.status, "booked");
  assert.equal(f.db.sqlite.prepare("SELECT count(*) AS n FROM backend_mutations").get()?.n, 0);
  f.db.sqlite.exec("DROP TRIGGER test_storage_failure");
  await f.change(job, { type: "transition", status: "completed" }, "completion-retry");
  assert.equal((await f.operations.records(WHISKER, ARI)).length, 1);
});

test("correction is audited and recompletion preserves one record and its previous snapshot", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { executions } = await f.create();
  let job = await f.change(executions[0], { type: "transition", status: "completed" });
  const record = (await f.operations.records(WHISKER, ARI))[0];
  const corrected = await f.app.executeBe4(f.actor, { type: "record.correct", businessId: WHISKER, branchId: ARI, recordId: record.serviceRecordId, field: "summary", value: "แก้ไขสรุป", reason: "ข้อมูลตกหล่น", requestKey: "correct-summary", expectedRevision: record.revision }, metadata());
  assert.equal(corrected.corrections.length, 1);
  job = await f.change(job, { type: "transition", status: "in-service" });
  await f.change(job, { type: "transition", status: "completed" });
  const records = await f.operations.records(WHISKER, ARI);
  assert.equal(records.length, 1); assert.equal(records[0].serviceRecordId, record.serviceRecordId);
  assert.equal(records[0].sourceRevisions[0].summary, "แก้ไขสรุป"); assert.equal(records[0].corrections.length, 1);
});

test("write-time authorization catches membership revocation after application validation", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { executions } = await f.create();
  const original = f.operations.save.bind(f.operations);
  f.operations.save = async (write) => {
    f.db.sqlite.prepare("UPDATE business_memberships SET status='inactive' WHERE id=?").run(write.context.membership.id);
    return original(write);
  };
  await assert.rejects(f.change(executions[0], { type: "note", note: "forbidden" }), code("FORBIDDEN"));
  assert.equal((await f.operations.get(WHISKER, ARI, executionId(executions[0])))?.record.revision, 1);
});

test("HTTP fails closed without an identity provider and rejects oversized input without invoking commands", async () => {
  let invoked = false;
  const execute = async () => { invoked = true; return {}; };
  const response = await businessRequest(new Request("https://local/api/be4", { method: "POST", body: "{}" }), undefined, execute);
  assert.equal(response.status, 501); assert.equal((await response.json() as { error: { code: string } }).error.code, "AUTHENTICATION_NOT_CONFIGURED"); assert.equal(invoked, false); assert.equal(response.headers.get("cache-control"), "no-store");
  const large = await businessRequest(new Request("https://local/api/be4", { method: "POST", headers: { "content-type": "application/json", "x-meawketting-dev-person-id": OWNER }, body: `{"note":"${"x".repeat(65537)}"}` }), "dev-test", execute);
  assert.equal(large.status, 400); assert.equal(invoked, false);
});
