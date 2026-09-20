import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PostgresBe1Repository } from "../app/_backend/be1/postgresRepository";
import { Be1Error } from "../app/_backend/be1/errors";
import { Be5Application } from "../app/_backend/be5/application";
import { GuardianGrantService } from "../app/_backend/be5/authority";
import { PostgresBe5Repository } from "../app/_backend/be5/postgresRepository";
import type { Be5Operation, GuardianGrantInput, IntakeResult } from "../app/_backend/be5/contracts";
import { parseBe5Operation, scanToken } from "../app/_backend/be5/validation";
import { BackendConflict } from "../app/_backend/shared/errors";
import { DevTestIdentityAdapter } from "../app/_backend/be1/identity";
import { ARI, INACTIVE, metadata, OUTSIDER, OWNER, seededDatabase, THONGLOR, WHISKER } from "./postgresFixtures";

const GUARDIAN = "prs_be5_guardian_000001", CO = "prs_be5_guardian_000002";
const scope = { businessId: WHISKER, branchId: ARI };
const input: GuardianGrantInput = { ...scope, petId: "booking-pet-mochi", scope: ["basicIdentity"], purpose: "รับน้องเข้าร้าน", durationMinutes: 120, pending: false };
const code = (value: string) => (error: unknown) => error instanceof Be1Error && error.code === value;
const conflict = (value: string) => (error: unknown) => error instanceof BackendConflict && error.reason === value;
test("a production process rejects the development identity header even when its mode is misconfigured", async () => {
  const previous = process.env.NODE_ENV;
  try {
    Reflect.set(process.env, "NODE_ENV", "production");
    await assert.rejects(new DevTestIdentityAdapter("dev-test").resolve(new Request("https://example.test/api/be5", { headers: { "x-meawketting-dev-person-id": OWNER } })), code("AUTHENTICATION_NOT_CONFIGURED"));
  } finally { if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", previous); }
});
async function fixture() {
  const db = seededDatabase(); db.inspect.exec(readFileSync("supabase/seed-be5-dev.sql", "utf8"));
  let time = "2050-08-18T02:00:00.000Z";
  const now = () => time, auth = new PostgresBe1Repository(db), repository = new PostgresBe5Repository(db, "dev-test"), guardian = new GuardianGrantService(db, "dev-test", now), app = new Be5Application(auth, repository, now), actor = await app.resolvePerson(OWNER);
  const run = (op: Be5Operation) => app.executeBe5(actor, op, metadata());
  const issue = (patch: Partial<GuardianGrantInput> = {}) => guardian.issue(GUARDIAN, { ...input, ...patch }, `issue_${crypto.randomUUID()}`);
  const start = async (token: string, executionId: string | null = null, requestKey = `start_${crypto.randomUUID()}`) => await run({ ...scope, type: "intake.start", value: token, executionId, requestKey }) as IntakeResult;
  return { db, auth, repository, guardian, app, actor, run, issue, start, setTime: (next: string) => { time = next; } };
}

test("Temporary QR uses opaque entropy, safe hashes and explicit Primary Guardian authority independent from Customer", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close());
  await assert.rejects(f.guardian.issue(OWNER, input, "business-cannot-issue"), code("FORBIDDEN"));
  await assert.rejects(f.guardian.issue(CO, input, "co-policy-closed"), code("FORBIDDEN"));
  const issued = await f.guardian.issue(GUARDIAN, input, "issue-replay-key"); assert.match(issued.token!, /^tb_[A-Za-z0-9_-]{43}$/);
  assert.equal(scanToken(`https://example.test/temporary-access/${issued.token}`), issued.token);
  const replay = await f.guardian.issue(GUARDIAN, input, "issue-replay-key"); assert.equal(replay.grantId, issued.grantId); assert.equal(replay.token, null);
  const stored = f.db.inspect.prepare("SELECT * FROM access_grants").all(); assert.equal(JSON.stringify(stored).includes(issued.token!), false);
  assert.match(String(stored[0].token_hash), /^[a-f0-9]{64}$/);
  for (const token of ["QUICK-PASSPORT-demo", "/safety/a", "/quick-passport/a", "/temporary-access/guess", "DEMO-TEMP-ACTIVE"]) assert.throws(() => scanToken(token), code("INVALID_INPUT"));
  assert.throws(() => parseBe5Operation({ ...scope, type: "guardian.issue", ...input }), code("INVALID_INPUT"));
  await assert.rejects(new GuardianGrantService(f.db).issue(GUARDIAN, input, "no-dev-in-production"), code("FORBIDDEN"));
});

test("pending Consent reveals no Pet, then only approved fields; correction retains source and receive links canonical Grooming", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close());
  const issued = await f.issue({ pending: true });
  let result = await f.start(issued.token!); assert.equal(result.passport, null); assert.equal(result.record.customerId, null); assert.equal(result.access.status, "awaiting-owner");
  await assert.rejects(f.run({ ...scope, type: "intake.receive", intakeId: result.record.id, expectedRevision: 1, requestKey: "pending-receive" }), conflict("intake-required"));
  await f.guardian.decide(GUARDIAN, WHISKER, ARI, issued.grantId, "approved", 1, "approve-original-scope");
  result = await f.run({ ...scope, type: "intake.get", intakeId: result.record.id }) as IntakeResult;
  assert.deepEqual(result.passport, { name: "Mochi Passport", species: "cat", photoSrc: null }); assert.equal(result.record.customerId, "booking-contact-nalin");
  await assert.rejects(f.run({ ...scope, type: "intake.correct", intakeId: result.record.id, expectedRevision: 1, requestKey: "forbidden-reference", topic: "passport-reference", suggestedValue: "guess", note: "" }), code("FORBIDDEN"));
  result = await f.run({ ...scope, type: "intake.correct", intakeId: result.record.id, expectedRevision: 1, requestKey: "suggestion-name", topic: "name", suggestedValue: "ชื่อที่เสนอ", note: "ตรวจตัวสะกด" }) as IntakeResult;
  assert.equal(f.db.inspect.prepare("SELECT name FROM passport_profiles WHERE pet_id=?").get(input.petId)?.name, "Mochi Passport");
  const op: Be5Operation = { ...scope, type: "intake.receive", intakeId: result.record.id, expectedRevision: result.record.revision, requestKey: "receive-once" };
  result = await f.run(op) as IntakeResult; const replay = await f.run(op) as IntakeResult;
  assert.equal(result.record.checkInState, "checked-in"); assert.equal(result.record.id, replay.record.id); assert.ok(result.record.serviceJobId);
  const execution = f.db.inspect.prepare("SELECT * FROM service_executions WHERE id=?").get(result.record.serviceJobId!);
  assert.equal(execution?.intake_id, result.record.id); assert.equal(execution?.status, "checked-in");
  assert.equal(f.db.inspect.prepare("SELECT status FROM bookings WHERE id=?").get(execution!.booking_id)?.status, "confirmed");
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM service_records").get()?.n, 0);
  assert.deepEqual(f.db.inspect.prepare("SELECT conname FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND contype='f' AND NOT convalidated").all(), []);
});

test("revoke and expiry hide fields while retaining the Business draft, and deny replayed receives", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close());
  const issued = await f.issue({ scope: ["basicIdentity", "passportReference"] });
  let result = await f.start(issued.token!); assert.equal(result.passport?.passportLabel, "TEST-PASSPORT-MOCHI");
  result = await f.run({ ...scope, type: "intake.update", intakeId: result.record.id, expectedRevision: 1, requestKey: "save-draft", belongings: ["กระเป๋าหรือกรง"], businessNote: "ฝากไว้หน้าร้าน", taskState: "review" }) as IntakeResult;
  await f.guardian.decide(GUARDIAN, WHISKER, ARI, issued.grantId, "revoke", 1, "revoke-grant");
  const hidden = await f.run({ ...scope, type: "intake.get", intakeId: result.record.id }) as IntakeResult;
  assert.equal(hidden.passport, null); assert.equal(hidden.record.petRelationshipId, null); assert.equal(hidden.record.businessNote, "ฝากไว้หน้าร้าน");
  await assert.rejects(f.run({ ...scope, type: "intake.receive", intakeId: result.record.id, expectedRevision: result.record.revision, requestKey: "after-revoke" }), conflict("revoked"));
  const another = await f.issue(); result = await f.start(another.token!);
  f.setTime("2050-08-18T04:00:00.000Z");
  assert.equal((await f.run({ ...scope, type: "intake.get", intakeId: result.record.id }) as IntakeResult).access.status, "expired");
  await assert.rejects(f.start(another.token!), conflict("expired"));
});

test("Business and Branch isolation, forged targets, and unknown Pet receipt never manufacture a relationship or service", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close()); const issued = await f.issue();
  await assert.rejects(f.run({ ...scope, branchId: THONGLOR, type: "access.scan", value: issued.token! }), code("NOT_FOUND"));
  for (const id of [OUTSIDER, INACTIVE]) await assert.rejects((async () => f.app.executeBe5(await f.app.resolvePerson(id), { ...scope, type: "access.scan", value: issued.token! }, metadata()))(), (e) => e instanceof Be1Error);
  const foreign = f.db.inspect.prepare("SELECT id FROM service_executions WHERE branch_id=? LIMIT 1").get(THONGLOR);
  await assert.rejects(f.start(issued.token!, String(foreign!.id)), code("NOT_FOUND"));
  const unlinked = await f.issue({ petId: "pet_be5_unlinked_000001" }); let result = await f.start(unlinked.token!);
  assert.equal(result.record.customerId, null); assert.equal(result.record.petRelationshipId, null);
  result = await f.run({ ...scope, type: "intake.receive", intakeId: result.record.id, expectedRevision: 1, requestKey: "unlinked-receive" }) as IntakeResult;
  assert.equal(result.record.serviceJobId, null); assert.equal(result.record.hotelStayId, null); assert.equal(result.record.daycareAttendanceId, null);
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM business_pet_profiles WHERE pet_id='pet_be5_unlinked_000001'").get()?.n, 0);
});

test("concurrent starts converge on one Intake and stale edits conflict; revocation during receive rolls back the whole handoff", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close()); const issued = await f.issue();
  const [one, two] = await Promise.all([f.start(issued.token!), f.start(issued.token!)]); assert.equal(one.record.id, two.record.id);
  await f.run({ ...scope, type: "intake.update", intakeId: one.record.id, expectedRevision: 1, requestKey: "edit-winner", belongings: [], businessNote: "saved", taskState: "review" });
  await assert.rejects(f.run({ ...scope, type: "intake.update", intakeId: one.record.id, expectedRevision: 1, requestKey: "stale-edit", belongings: [], businessNote: "stale", taskState: "review" }), conflict("version-conflict"));
  const write = f.repository.write.bind(f.repository);
  f.repository.write = async (...args) => {
    f.db.inspect.prepare("UPDATE access_grants SET revoked_at=?,revision=revision+1 WHERE id=?").run("2050-08-18T02:01:00.000Z", issued.grantId);
    return write(...args);
  };
  await assert.rejects(f.run({ ...scope, type: "intake.receive", intakeId: one.record.id, expectedRevision: 2, requestKey: "revoke-race" }), (e) => e instanceof BackendConflict);
  assert.equal(f.db.inspect.prepare("SELECT checked_in_at FROM business_intakes WHERE id=?").get(one.record.id)?.checked_in_at, null);
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM service_executions WHERE intake_id=?").get(one.record.id)?.n, 0);
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM backend_guards").get()?.n, 0);
});

test("Guardian decisions replay concurrent identical requests, reject changed payloads and recheck expiry at commit", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close()); const issued = await f.issue({ pending: true });
  await Promise.all([1, 2].map(() => f.guardian.decide(GUARDIAN, WHISKER, ARI, issued.grantId, "approved", 1, "same-approval")));
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM access_events WHERE grant_id=? AND kind='approved'").get(issued.grantId)?.n, 1);
  await assert.rejects(f.guardian.decide(GUARDIAN, WHISKER, ARI, issued.grantId, "denied", 1, "same-approval"), conflict("idempotency"));
  f.setTime("2020-08-18T02:00:00.000Z");
  const expired = await f.issue({ pending: true });
  await assert.rejects(f.guardian.decide(GUARDIAN, WHISKER, ARI, expired.grantId, "approved", 1, "expired-at-database"), conflict("version-conflict"));
  assert.equal(f.db.inspect.prepare("SELECT status FROM consents WHERE id=(SELECT consent_id FROM access_grants WHERE id=?)").get(expired.grantId)?.status, "pending");
});
