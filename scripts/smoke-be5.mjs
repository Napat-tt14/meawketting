import assert from "node:assert/strict";

const base = new URL(process.argv[2] ?? "http://localhost:5173");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) throw new Error("This fixture smoke is local-only");
const owner = "prs_01k47meawketting000000001", guardian = "prs_be5_guardian_000001";
const scope = { businessId: "business-whisker-rest", branchId: "whisker-ari" };
const key = () => `smoke_${crypto.randomUUID()}`;
async function post(path, operation, actor = owner, expected = 200) {
  const response = await fetch(new URL(path, base), { method: "POST", headers: { "content-type": "application/json", ...(actor ? { "x-meawketting-dev-person-id": actor } : {}) }, body: JSON.stringify(operation) });
  const body = await response.json();
  assert.equal(response.status, expected, `${path} ${operation.type}: ${body.error?.code ?? "unexpected status"}`);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return body.data;
}
const issued = await post("/api/dev/guardian", { type: "issue", input: { ...scope, petId: "booking-pet-mochi", scope: ["basicIdentity"], purpose: "BE5 local smoke", durationMinutes: 120, pending: false }, requestKey: key() }, guardian);
assert.match(issued.token, /^tb_[A-Za-z0-9_-]{43}$/);
await post("/api/be5", { ...scope, type: "access.scan", value: issued.token }, null, 401);
await post("/api/be5", { ...scope, branchId: "whisker-thonglor", type: "access.scan", value: issued.token }, owner, 404);
const scan = await post("/api/be5", { ...scope, type: "access.scan", value: issued.token });
assert.equal(scan.status, "active"); assert.equal("petId" in scan, false);
let result = await post("/api/be5", { ...scope, type: "intake.start", value: issued.token, executionId: null, requestKey: key() });
assert.equal(result.passport.name, "Mochi Passport"); assert.equal("passportLabel" in result.passport, false);
result = await post("/api/be5", { ...scope, type: "intake.update", intakeId: result.record.id, expectedRevision: result.record.revision, requestKey: key(), belongings: [], businessNote: "Local API smoke draft", taskState: "review" });
const receive = { ...scope, type: "intake.receive", intakeId: result.record.id, expectedRevision: result.record.revision, requestKey: key() };
result = await post("/api/be5", receive); const replay = await post("/api/be5", receive);
assert.equal(result.record.checkInState, "checked-in"); assert.equal(replay.record.revision, result.record.revision);
await post("/api/dev/guardian", { ...scope, type: "decide", grantId: issued.grantId, decision: "revoke", expectedRevision: 1, requestKey: key() }, guardian);
const hidden = await post("/api/be5", { ...scope, type: "intake.get", intakeId: result.record.id });
assert.equal(hidden.passport, null); assert.equal(hidden.record.businessNote, "Local API smoke draft");
await post("/api/be5", receive, owner, 409);
console.log("BE5 local API smoke PASS: scoped QR → Intake → receive/retry → revoke; no credential printed");
