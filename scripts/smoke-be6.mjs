import assert from "node:assert/strict";
const base = new URL(process.argv[2] ?? "http://localhost:5173");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) throw new Error("This fictional fixture smoke is local-only");
const owner = "prs_01k47meawketting000000001", guardian = "prs_be5_guardian_000001", scope = { businessId: "business-whisker-rest", branchId: "whisker-ari" };
const key = () => crypto.randomUUID();
async function post(path, op, actor = owner, status = 200) {
  const r = await fetch(new URL(path, base), { method: "POST", headers: { "content-type": "application/json", ...(actor ? { "x-meawketting-dev-person-id": actor } : {}) }, body: JSON.stringify(op) });
  const body = await r.json(); assert.equal(r.status, status, `${op.type}: ${body.error?.code ?? r.status}`); assert.equal(r.headers.get("cache-control"), "no-store"); return body.data;
}
await post("/api/be6", { ...scope, type: "inbox.list" }, null, 401);
const context = { customerId: "booking-contact-nalin", petId: "booking-pet-mochi", bookingId: "booking-fixture-ari-grooming-1030", executionId: null };
const c = await post("/api/be6", { ...scope, type: "conversation.ensure", context, requestKey: key() });
const text = `BE6 local smoke ${key()}`, send = { ...scope, type: "message.send", conversationId: c.conversationId, context, text, requestKey: key() };
await Promise.all([post("/api/be6", send), post("/api/be6", send)]);
const saved = await post("/api/be6", { ...scope, type: "conversation.get", conversationId: c.conversationId });
const matching = saved.messages.filter((m) => m.kind === "text" && m.text === text); assert.equal(matching.length, 1); assert.equal(matching[0].deliveryState, "queued");
await post("/api/be6", { ...send, branchId: "whisker-thonglor", requestKey: key() }, owner, 404);
const name = `ทดสอบอนุมัติ ${key().slice(0, 8)}`;
const requested = await post("/api/be6", { ...scope, type: "approval.request", conversationId: c.conversationId, context, serviceName: name, additionalPrice: 10, additionalMinutes: 5, note: "DEV/TEST ONLY", requestKey: key() });
const request = requested.messages.find((m) => m.kind === "add-service-request" && m.serviceName === name); assert.ok(request);
const decision = { ...scope, type: "approval", messageId: request.messageId, decision: "approved", expectedRevision: 1, requestKey: key() };
await post("/api/dev/guardian", decision, owner, 404);
await post("/api/dev/guardian", decision, guardian); await post("/api/dev/guardian", decision, guardian);
const result = await post("/api/be6", { ...scope, type: "conversation.get", conversationId: c.conversationId });
assert.equal(result.messages.find((m) => m.messageId === request.messageId)?.requestStatus, "approved");
console.log("BE6 local API smoke PASS: durable contextual message/replay, Branch denial, Guardian-only approval; provider delivery remains queued");
