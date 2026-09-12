import assert from "node:assert/strict";
const base = new URL(process.argv[2] ?? "http://localhost:5173");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) throw new Error("DEV/TEST local-only smoke");
const owner = "prs_01k47meawketting000000001", scope = { businessId: "business-whisker-rest", branchId: "whisker-ari" };
async function post(path, op, actor = owner, status = 200) {
  const r = await fetch(new URL(path, base), { method: "POST", headers: { "content-type": "application/json", ...(actor ? { "x-meawketting-dev-person-id": actor } : {}) }, body: JSON.stringify(op) });
  const body = await r.json(); assert.equal(r.status, status, `${op.type}: ${body.error?.code ?? r.status}`); assert.equal(r.headers.get("cache-control"), "no-store"); return body.data;
}
await post("/api/be7", { ...scope, type: "charges.list" }, null, 401);
const operations = await post("/api/be4", { ...scope, type: "operations.list", limit: 100 });
const source = operations.executions.find((e) => e.kind === "grooming" && e.record.bookingId === "booking-fixture-ari-grooming-1030"); assert.ok(source);
const checkout = { ...scope, type: "charge.checkout", executionId: source.record.serviceJobId, requestKey: crypto.randomUUID() };
const [one, two] = await Promise.all([post("/api/be7", checkout), post("/api/be7", checkout)]);
assert.equal(one.balance.charge.chargeId, two.balance.charge.chargeId);
const b = one.balance, amount = Math.min(100, b.availableToCollect);
if (amount > 0) {
  const op = { ...scope, type: "payment.record", chargeId: b.charge.chargeId, expectedRevision: b.charge.revision, amount, method: "cash", note: "DEV/TEST local API smoke", requestKey: crypto.randomUUID() };
  await Promise.all([post("/api/be7", op), post("/api/be7", op)]);
  await post("/api/be7", { ...op, amount: amount + 1 }, owner, 409);
  const fresh = await post("/api/be7", { ...scope, type: "charge.get", chargeId: b.charge.chargeId }); assert.equal(fresh.paid, b.paid + amount);
}
await post("/api/be7", { ...scope, branchId: "whisker-thonglor", type: "charge.get", chargeId: b.charge.chargeId }, owner, 404);
const page = await post("/api/be7", { ...scope, type: "payments.list" }); assert.ok(page.payments.some((p) => p.allocations.some((a) => a.chargeId === b.charge.chargeId)));
console.log(`BE7 local API smoke PASS: durable checkout, partial payment, replay and Branch isolation. Charge ${b.charge.chargeId}; execution ${source.record.serviceJobId}. No external provider connected.`);
