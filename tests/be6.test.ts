import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PostgresBe1Repository } from "../app/_backend/be1/postgresRepository";
import { Be1Error } from "../app/_backend/be1/errors";
import { Be6Application } from "../app/_backend/be6/application";
import { PostgresBe6Repository } from "../app/_backend/be6/postgresRepository";
import { GuardianApprovalService } from "../app/_backend/be6/authority";
import { LineChannelAdapter, MockChannelAdapter, testSignature } from "../app/_backend/be6/adapters";
import { InboxTransport } from "../app/_backend/be6/transport";
import type { Be6Operation, ConversationView, InboxContext, InboxDirectory } from "../app/_backend/be6/contracts";
import { BackendConflict } from "../app/_backend/shared/errors";
import { ARI, INACTIVE, MANAGER, metadata, OUTSIDER, OWNER, seededDatabase, THONGLOR, WHISKER } from "./postgresFixtures";

const scope = { businessId: WHISKER, branchId: ARI }, GUARDIAN = "prs_be5_guardian_000001";
const value: InboxContext = { customerId: "booking-contact-nalin", petId: "booking-pet-mochi", bookingId: "booking-fixture-ari-grooming-1030", executionId: null };
const failure = (code: string) => (e: unknown) => e instanceof Be1Error && e.code === code;
const conflict = (reason: string) => (e: unknown) => e instanceof BackendConflict && e.reason === reason;
async function fixture() {
  const db = seededDatabase(); for (const n of [5, 6]) db.inspect.exec(readFileSync(`supabase/seed-be${n}-dev.sql`, "utf8"));
  let time = "2050-08-18T02:00:00.000Z"; const now = () => time, repo = new PostgresBe6Repository(db, "dev-test"), app = new Be6Application(new PostgresBe1Repository(db), repo, now), actor = await app.resolvePerson(OWNER);
  const run = async (op: Be6Operation, personId = OWNER) => app.executeBe6(await app.resolvePerson(personId), op, metadata());
  const ensure = async (patch: Partial<InboxContext> = {}, branchId = ARI) => await run({ ...scope, branchId, type: "conversation.ensure", context: { ...value, ...patch }, requestKey: `ensure_${crypto.randomUUID()}` }) as ConversationView;
  const send = async (id: string, text: string, requestKey = `send_${crypto.randomUUID()}`, context = value, branchId = ARI) => await run({ ...scope, branchId, type: "message.send", conversationId: id, context, text, requestKey }) as ConversationView;
  const adapter = new MockChannelAdapter(), transport = new InboxTransport(db, async () => adapter, "dev-test", now);
  const incoming = async (id: string, subject = "TEST-LINE-NALIN", timestamp = Date.parse(time), text = "ข้อความจากลูกค้า") => {
    const raw = new TextEncoder().encode(JSON.stringify({ destination: "TEST-WHISKER-OA", events: [{ type: "message", webhookEventId: id, timestamp, source: { type: "user", userId: subject }, message: { id: `provider-${id}`, type: "text", text } }] }));
    return transport.webhook("channel_be6_whisker_test", raw, await testSignature("fictional-test-channel-secret", raw));
  };
  return { db, repo, app, actor, run, ensure, send, adapter, transport, incoming, now, setTime: (next: string) => { time = next; } };
}

test("one Business/Customer Conversation survives concurrent creation; messages order and retry once with durable outbox", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close());
  const [one, two] = await Promise.all([f.ensure(), f.ensure()]); assert.equal(one.conversationId, two.conversationId);
  await Promise.all([f.send(one.conversationId, "สวัสดี", "same-message-key"), f.send(one.conversationId, "สวัสดี", "same-message-key")]);
  await assert.rejects(f.send(one.conversationId, "changed", "same-message-key"), conflict("idempotency"));
  await Promise.all([f.send(one.conversationId, "สอง"), f.send(one.conversationId, "สาม")]);
  const saved = await f.run({ ...scope, type: "conversation.get", conversationId: one.conversationId }) as ConversationView;
  assert.equal(saved.messages.length, 3); assert.equal(new Set(saved.messages.map((m) => m.sequence)).size, 3);
  assert.deepEqual(saved.messages.map((m) => m.sequence), saved.messages.map((m) => m.sequence).sort((a, b) => a - b));
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM message_outbox").get()?.n, 3);
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM audit_events WHERE action='message.send'").get()?.n, 3);
});

test("Business-wide identity preserves per-message Branch privacy and rejects forged context, inactive members and foreign Customers", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close()); const c = await f.ensure(); await f.send(c.conversationId, "อารีย์");
  const neutral = { customerId: value.customerId, petId: null, bookingId: null, executionId: null };
  const other = await f.ensure(neutral, THONGLOR); assert.equal(c.conversationId, other.conversationId);
  await f.send(c.conversationId, "ข้อความเฉพาะทองหล่อ", undefined, neutral, THONGLOR);
  const owner = await f.run({ ...scope, type: "conversation.get", conversationId: c.conversationId }) as ConversationView; assert.equal(owner.messages.length, 2);
  const restricted = await f.run({ ...scope, type: "conversation.get", conversationId: c.conversationId }, MANAGER) as ConversationView;
  assert.equal(restricted.messages.length, 1); assert.equal(JSON.stringify(restricted).includes("ข้อความเฉพาะทองหล่อ"), false);
  for (const id of [OUTSIDER, INACTIVE]) await assert.rejects(f.run({ ...scope, type: "conversation.get", conversationId: c.conversationId }, id), (e) => e instanceof Be1Error);
  await assert.rejects(f.send(c.conversationId, "spoof", undefined, value, THONGLOR), failure("NOT_FOUND"));
  await assert.rejects(f.ensure({ customerId: "foreign-customer" }), failure("NOT_FOUND"));
  const write = f.repo.write.bind(f.repo); f.repo.write = async (...args) => { f.db.inspect.prepare("UPDATE business_memberships SET status='inactive' WHERE person_id=? AND business_id=?").run(OWNER, WHISKER); return write(...args); };
  await assert.rejects(f.send(c.conversationId, "revoked during write"), failure("FORBIDDEN"));
});

test("signed incoming events deduplicate, retain unknown contacts without inferring identity, and derive per-Person unread cursors", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close());
  await Promise.all([f.incoming("event-one"), f.incoming("event-one")]);
  let directory = await f.run({ ...scope, type: "inbox.list" }) as InboxDirectory; assert.equal(directory.conversations.length, 1); const c = directory.conversations[0]; assert.equal(c.unreadCount, 1);
  await f.incoming("event-two");
  await f.run({ ...scope, type: "conversation.read", conversationId: c.conversationId, throughSequence: c.messages[0].sequence, requestKey: "read-visible-only" });
  directory = await f.run({ ...scope, type: "inbox.list" }) as InboxDirectory; assert.equal(directory.conversations[0].unreadCount, 1);
  const manager = await f.run({ ...scope, type: "inbox.list" }, MANAGER) as InboxDirectory; assert.equal(manager.conversations[0].unreadCount, 2);
  await f.incoming("event-unknown", "UNLINKED-LINE-SUBJECT");
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM channel_webhook_events WHERE state='unlinked'").get()?.n, 1);
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM conversations").get()?.n, 1);
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM person_external_identities").get()?.n, 0);
  await assert.rejects(f.transport.webhook("channel_be6_whisker_test", new TextEncoder().encode("{}"), "forged-signature"), failure("UNAUTHENTICATED"));
  await assert.rejects(new InboxTransport(f.db, async () => f.adapter).webhook("channel_be6_whisker_test", new Uint8Array(), ""), failure("NOT_FOUND"));
});

test("outbox lease prevents double dispatch, retries unchanged provider intent and exposes missing channels honestly", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close()); const c = await f.ensure(); await f.send(c.conversationId, "รับกลับได้แล้ว");
  f.adapter.failures.push({ state: "retry", code: "test-network" }); await f.transport.drain();
  const row = f.db.inspect.prepare("SELECT * FROM message_outbox").get()!; assert.equal(row.state, "retry"); assert.equal(row.attempts, 1);
  f.setTime("2050-08-18T02:02:00.000Z"); await Promise.all([f.transport.drain(), f.transport.drain()]);
  assert.equal(f.adapter.accepted.size, 1); assert.equal(f.db.inspect.prepare("SELECT state FROM message_outbox").get()?.state, "sent");
  assert.deepEqual(f.db.inspect.prepare("SELECT outcome FROM outbox_attempts ORDER BY started_at").all().map((r) => r.outcome), ["retry", "accepted"]);
  const view = await f.run({ ...scope, type: "conversation.get", conversationId: c.conversationId }) as ConversationView;
  assert.equal(view.messages[0].kind === "text" && view.messages[0].deliveryState, "test-sent");
  f.db.inspect.prepare("UPDATE business_channels SET state='disconnected' WHERE business_id=?").run(WHISKER);
  await f.send(c.conversationId, "รอเชื่อมช่องทาง");
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM message_outbox WHERE state='blocked'").get()?.n, 1);
});

test("Guardian-only structured approval updates one Job atomically and never the Booking or financial state", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close()); const c = await f.ensure();
  const response = await f.run({ ...scope, type: "approval.request", conversationId: c.conversationId, context: value, serviceName: "แกะสางขน", additionalPrice: 150, additionalMinutes: 20, note: "ขออนุญาต", requestKey: "request-addon-one" }) as ConversationView;
  const m = response.messages[0]; const guardian = new GuardianApprovalService(f.db, "dev-test", f.now);
  await assert.rejects(guardian.decide(OWNER, WHISKER, ARI, m.messageId, "approved", 1, "business-cannot-approve"), failure("NOT_FOUND"));
  await assert.rejects(guardian.decide("prs_be5_guardian_000002", WHISKER, ARI, m.messageId, "approved", 1, "contact-is-not-guardian"), failure("NOT_FOUND"));
  const booking = f.db.inspect.prepare("SELECT * FROM bookings WHERE id=?").get(value.bookingId!);
  await Promise.all([1, 2].map(() => guardian.decide(GUARDIAN, WHISKER, ARI, m.messageId, "approved", 1, "guardian-decision-key")));
  assert.equal(f.db.inspect.prepare("SELECT count(*) n FROM execution_events WHERE execution_id=? AND kind='addon'").get(response.serviceJobId!)?.n, 1);
  assert.deepEqual(f.db.inspect.prepare("SELECT * FROM bookings WHERE id=?").get(value.bookingId!), booking);
  await assert.rejects(f.run({ ...scope, type: "approval.cancel", conversationId: c.conversationId, messageId: m.messageId, expectedRevision: 1, requestKey: "cancel-stale-request" }), conflict("version-conflict"));
  assert.deepEqual(f.db.inspect.prepare("SELECT conname FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND contype='f' AND NOT convalidated").all(), []);
});

test("failed approval side effects roll back the decision and a safe retry commits once", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close()); const c = await f.ensure();
  const response = await f.run({ ...scope, type: "approval.request", conversationId: c.conversationId, context: value, serviceName: "บริการทดสอบ", additionalPrice: 90, additionalMinutes: 10, note: "", requestKey: "request-rollback-case" }) as ConversationView;
  const m = response.messages[0], guardian = new GuardianApprovalService(f.db, "dev-test", f.now);
  f.db.inspect.exec("CREATE FUNCTION test_approval_rollback_fn() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test-unavailable'; END $$; CREATE TRIGGER test_approval_rollback BEFORE INSERT ON execution_events FOR EACH ROW WHEN (NEW.kind='addon') EXECUTE FUNCTION test_approval_rollback_fn()");
  await assert.rejects(guardian.decide(GUARDIAN, WHISKER, ARI, m.messageId, "approved", 1, "retry-approval-atomic"), failure("PERSISTENCE_ERROR"));
  assert.equal(f.db.inspect.prepare("SELECT status FROM message_approvals WHERE message_id=?").get(m.messageId)?.status, "waiting");
  f.db.inspect.exec("DROP TRIGGER test_approval_rollback ON execution_events");
  await guardian.decide(GUARDIAN, WHISKER, ARI, m.messageId, "approved", 1, "retry-approval-atomic");
  assert.equal(f.db.inspect.prepare("SELECT status FROM message_approvals WHERE message_id=?").get(m.messageId)?.status, "approved");
});

test("ambiguous delivery stops for reconciliation when provider retry protection has expired", async (t) => {
  const f = await fixture(); t.after(() => f.db.inspect.close()); const c = await f.ensure(); await f.send(c.conversationId, "retry protection");
  f.adapter.failures.push({ state: "retry", code: "test-timeout" }); await f.transport.drain();
  f.setTime("2050-08-19T02:00:00.000Z"); await f.transport.drain();
  assert.equal(f.adapter.accepted.size, 0);
  assert.equal(f.db.inspect.prepare("SELECT failure_code FROM message_outbox").get()?.failure_code, "reconciliation-required");
});

test("LINE boundary verifies exact raw bytes and destination and preserves retry key across network ambiguity", async () => {
  const raw = new TextEncoder().encode('{"destination":"business-owned-oa","events":[]}'), secret = "test-only-channel-secret";
  const calls: RequestInit[] = [], adapter = new LineChannelAdapter(secret, "test-only-token", async (_url, init) => { calls.push(init!); return new Response(JSON.stringify({ sentMessages: [{ id: "provider-message-1" }] }), { status: 409, headers: { "x-line-accepted-request-id": "accepted-request-1", "content-type": "application/json" } }); });
  const signature = await testSignature(secret, raw); assert.equal(await adapter.verify(raw, signature), true);
  assert.equal(await adapter.verify(new TextEncoder().encode('{ "destination":"business-owned-oa","events":[]}'), signature), false);
  assert.throws(() => adapter.decode(raw, "other-oa"), failure("INVALID_INPUT"));
  const result = await adapter.send({ recipient: "test-subject", retryKey: "8e3e692f-0a1e-49e5-b73e-5ddc6770cc00", text: "hello" }); assert.equal(result.state, "accepted");
  assert.equal(new Headers(calls[0].headers).get("X-Line-Retry-Key"), "8e3e692f-0a1e-49e5-b73e-5ddc6770cc00");
});
