import assert from "node:assert/strict";
import test from "node:test";
import { D1Be1Repository } from "../app/_backend/be1/d1Repository";
import { Be1Error } from "../app/_backend/be1/errors";
import { Be7Application } from "../app/_backend/be7/application";
import { D1Be7Repository } from "../app/_backend/be7/d1Repository";
import { PaymentProviderService } from "../app/_backend/be7/providerService";
import { MockPaymentProvider } from "../app/_backend/be7/mockProvider";
import type { Be7Operation, BillingMutationResult, ChargeBalanceView, PaymentPage, ProviderOutcome } from "../app/_backend/be7/contracts";
import { BackendConflict } from "../app/_backend/shared/errors";
import { ARI, INACTIVE, MANAGER, metadata, OUTSIDER, OWNER, seededDatabase, STAFF, THONGLOR, WHISKER } from "./backendTestKit";

const scope = { businessId: WHISKER, branchId: ARI }, accountId = "payment_account_test_001";
const failure = (code: string) => (e: unknown) => e instanceof Be1Error && e.code === code;
const conflict = (reason: string) => (e: unknown) => e instanceof BackendConflict && e.reason === reason;
async function fixture() {
  const db = seededDatabase(); let time = "2050-08-18T02:00:00.000Z"; const now = () => time;
  db.sqlite.prepare("INSERT INTO payment_provider_accounts(id,business_id,provider,external_account_id,secret_ref,source) VALUES(?,?,'mock','TEST-MERCHANT','test-secret-reference','dev-test')").run(accountId, WHISKER);
  const provider = new MockPaymentProvider("test-only-payment-secret", now), resolver = async () => provider, repo = new D1Be7Repository(db, "dev-test"), app = new Be7Application(new D1Be1Repository(db), repo, resolver, now);
  const run = async (op: Be7Operation, actor = OWNER) => app.executeBe7(await app.resolvePerson(actor), op, metadata());
  const source = db.sqlite.prepare("SELECT id FROM service_executions WHERE booking_id='booking-fixture-ari-grooming-1030'").get()!.id as string;
  const checkout = async (key = crypto.randomUUID()) => await run({ ...scope, type: "charge.checkout", executionId: source, requestKey: key }) as BillingMutationResult;
  const get = async (chargeId: string) => await run({ ...scope, type: "charge.get", chargeId }) as ChargeBalanceView;
  const pay = (b: ChargeBalanceView, amount: number, requestKey = crypto.randomUUID(), actor = OWNER) => run({ ...scope, type: "payment.record", chargeId: b.charge.chargeId, expectedRevision: b.charge.revision, amount, method: "cash", note: "", requestKey }, actor) as Promise<BillingMutationResult>;
  const attempt = (b: ChargeBalanceView, amount = b.total) => run({ ...scope, type: "attempt.create", chargeId: b.charge.chargeId, expectedRevision: b.charge.revision, amount, accountId, requestKey: crypto.randomUUID() }) as Promise<BillingMutationResult>;
  const service = new PaymentProviderService(db, resolver, "dev-test", now);
  const event = async (attemptId: string, outcome: Exclude<ProviderOutcome, { state: "unknown" }>, eventId = crypto.randomUUID(), merchant = "TEST-MERCHANT") => {
    const raw = new TextEncoder().encode(JSON.stringify([{ eventId, externalAccountId: merchant, attemptId, outcome }]));
    return service.webhook(accountId, raw, await provider.sign(raw));
  };
  return { db, repo, app, run, checkout, get, pay, attempt, provider, service, event, now, setTime: (v: string) => { time = v; } };
}

test("checkout creates one canonical Booking Charge; concurrent same-payment retries allocate once and completion is independent", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close());
  const [one, two] = await Promise.all([f.checkout(), f.checkout()]); assert.equal(one.balance.charge.chargeId, two.balance.charge.chargeId);
  assert.equal(one.balance.status, "unpaid"); assert.equal(f.db.sqlite.prepare("SELECT count(*) n FROM payments").get()?.n, 0);
  const before = f.db.sqlite.prepare("SELECT * FROM service_executions").all();
  await Promise.all([f.pay(one.balance, 200, "same-payment-key"), f.pay(one.balance, 200, "same-payment-key")]);
  const b = await f.get(one.balance.charge.chargeId); assert.equal(b.paid, 200); assert.equal(b.status, "partial"); assert.equal(b.paymentCount, 1);
  await assert.rejects(f.pay(one.balance, 201, "same-payment-key"), conflict("idempotency"));
  await f.pay(b, b.remaining); assert.equal((await f.get(b.charge.chargeId)).status, "paid");
  assert.deepEqual(f.db.sqlite.prepare("SELECT * FROM service_executions").all(), before); assert.deepEqual(f.db.sqlite.prepare("PRAGMA foreign_key_check").all(), []);
});
test("competing payment, discount, and cancellation respect revision and debt constraints atomically", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { balance: b } = await f.checkout();
  const outcomes = await Promise.allSettled([f.pay(b, b.total), f.pay(b, b.total)]); assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
  const current = await f.get(b.charge.chargeId);
  await assert.rejects(f.pay(current, 1), conflict("overpayment"));
  await assert.rejects(f.run({ ...scope, type: "charge.adjust", chargeId: b.charge.chargeId, expectedRevision: current.charge.revision, kind: "discount", amount: 1, label: "ส่วนลด", reason: "ทดสอบ", requestKey: crypto.randomUUID() }), conflict("invalid-total"));
  await assert.rejects(f.run({ ...scope, type: "charge.cancel", chargeId: b.charge.chargeId, expectedRevision: current.charge.revision, reason: "ทดสอบ", requestKey: crypto.randomUUID() }), conflict("has-payments"));
  assert.equal(f.db.sqlite.prepare("SELECT count(*) n FROM payments").get()?.n, 1);
});
test("financial policy enforces Staff collection, Manager adjustment/refund, Branch access and write-time role changes", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { balance: b } = await f.checkout();
  // The seeded Staff is authorized at Thonglor only. Explicitly grant Ari in this test setup.
  const membership = f.db.sqlite.prepare("SELECT id FROM business_memberships WHERE person_id=? AND business_id=?").get(STAFF, WHISKER)!.id;
  f.db.sqlite.prepare("INSERT INTO membership_branch_access(membership_id,business_id,branch_id,status,created_at,updated_at) VALUES(?,?,?,'active',?,?)").run(membership!, WHISKER, ARI, f.now(), f.now());
  const adjusted = { ...scope, type: "charge.adjust" as const, chargeId: b.charge.chargeId, expectedRevision: b.charge.revision, kind: "discount" as const, amount: 10, label: "ส่วนลด", reason: "เจ้าของร้านอนุมัติ", requestKey: crypto.randomUUID() };
  await assert.rejects(f.run(adjusted, STAFF), failure("FORBIDDEN"));
  await f.pay(b, 100, crypto.randomUUID(), STAFF);
  const current = await f.get(b.charge.chargeId); await f.run({ ...adjusted, expectedRevision: current.charge.revision }, MANAGER);
  for (const actor of [OUTSIDER, INACTIVE]) await assert.rejects(f.run({ ...scope, type: "charge.get", chargeId: b.charge.chargeId }, actor), (e) => e instanceof Be1Error);
  await assert.rejects(f.run({ ...scope, branchId: THONGLOR, type: "charge.get", chargeId: b.charge.chargeId }, MANAGER), failure("NOT_FOUND"));
  const write = f.repo.write.bind(f.repo); f.repo.write = async (...args) => { f.db.sqlite.prepare("UPDATE business_memberships SET role='STAFF' WHERE person_id=? AND business_id=?").run(MANAGER, WHISKER); return write(...args); };
  await assert.rejects(f.run({ ...adjusted, expectedRevision: (await f.get(b.charge.chargeId)).charge.revision, requestKey: crypto.randomUUID() }, MANAGER), failure("FORBIDDEN"));
});
test("partial and full refunds are immutable, idempotent and do not cancel debt or completed work", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { balance: b } = await f.checkout(); await f.pay(b, b.total);
  const paymentId = f.db.sqlite.prepare("SELECT id FROM payments").get()!.id as string, paid = await f.get(b.charge.chargeId);
  const op = { ...scope, type: "refund.record" as const, chargeId: b.charge.chargeId, expectedRevision: paid.charge.revision, paymentId, amount: 100, reason: "คืนเงินที่รับไว้", requestKey: crypto.randomUUID() };
  await Promise.all([f.run(op, MANAGER), f.run(op, MANAGER)]);
  let view = await f.get(b.charge.chargeId); assert.equal(view.refunded, 100); assert.equal(view.remaining, 100);
  await f.run({ ...op, amount: b.total - 100, expectedRevision: view.charge.revision, requestKey: crypto.randomUUID() }, MANAGER);
  view = await f.get(b.charge.chargeId); assert.equal(view.status, "unpaid"); assert.equal(view.charge.cancelledAt, null);
  const page = await f.run({ ...scope, type: "payments.list" }) as PaymentPage; assert.equal(page.payments[0].status, "refunded");
  await assert.rejects(f.run({ ...op, expectedRevision: view.charge.revision, requestKey: crypto.randomUUID() }), conflict("over-refund"));
  assert.throws(() => f.db.sqlite.exec("DELETE FROM payments"), /BE7_SCOPE/);
});
test("persistence failure rolls back Payment, allocation, audit, receipt and revision before safe retry", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { balance: b } = await f.checkout();
  f.db.sqlite.exec("CREATE TRIGGER test_payment_failure BEFORE INSERT ON payment_allocations BEGIN SELECT RAISE(ABORT,'test-payment-failure'); END");
  await assert.rejects(f.pay(b, 100, "payment-rollback-key"), failure("PERSISTENCE_ERROR"));
  assert.equal(f.db.sqlite.prepare("SELECT count(*) n FROM payments").get()?.n, 0); assert.equal((await f.get(b.charge.chargeId)).charge.revision, b.charge.revision);
  f.db.sqlite.exec("DROP TRIGGER test_payment_failure"); await f.pay(b, 100, "payment-rollback-key");
});
test("provider-neutral Attempt reserves outstanding money, deduplicates signed webhooks and separates provider success from service status", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { balance: b } = await f.checkout(); const reserved = await f.attempt(b);
  assert.equal(reserved.balance.status, "unpaid"); assert.equal(reserved.balance.availableToCollect, 0);
  await assert.rejects(f.pay(reserved.balance, 100), conflict("overpayment"));
  const attemptId = reserved.balance.attempts[0].attemptId, outcome = { state: "succeeded" as const, providerReference: "mock-webhook-payment", amountMinor: b.total * 100, currency: "THB" as const, occurredAt: f.now() };
  await Promise.all([f.event(attemptId, outcome, "same-event"), f.event(attemptId, outcome, "same-event")]);
  await f.event(attemptId, outcome, "redelivery-another-id");
  assert.equal((await f.get(b.charge.chargeId)).status, "paid"); assert.equal(f.db.sqlite.prepare("SELECT count(*) n FROM payments").get()?.n, 1);
  await assert.rejects(f.event(attemptId, { ...outcome, amountMinor: 100 }, "same-event"), conflict("idempotency"));
  await assert.rejects(f.event(attemptId, outcome, "foreign-destination", "OTHER-MERCHANT"), failure("INVALID_INPUT"));
  await assert.rejects(f.service.webhook(accountId, new TextEncoder().encode("[]"), "forged"), failure("UNAUTHENTICATED"));
  assert.deepEqual(f.db.sqlite.prepare("PRAGMA foreign_key_check").all(), []);
});
test("an ambiguous provider result reconciles the original intent and concurrent workers cannot collect twice", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { balance: b } = await f.checkout(); const a = (await f.attempt(b)).balance.attempts[0];
  f.provider.outcomes.push({ state: "unknown", code: "mock-timeout" }); await Promise.all([f.service.drain(), f.service.drain()]); assert.equal(f.provider.createCalls, 1);
  assert.equal((await f.get(b.charge.chargeId)).status, "unpaid"); f.setTime("2050-08-18T02:02:00.000Z");
  f.provider.outcomes.push({ state: "succeeded", providerReference: "mock-reconciled-payment", amountMinor: b.total * 100, currency: "THB", occurredAt: f.now() }); await f.service.drain();
  assert.equal(f.provider.createCalls, 1); assert.equal(f.provider.reconcileCalls, 1); assert.equal((await f.get(b.charge.chargeId)).attempts.find((v) => v.attemptId === a.attemptId)?.state, "succeeded");
});
test("late provider receipt after terminal failure preserves actual money as unallocated reconciliation", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { balance: b } = await f.checkout(); const a = (await f.attempt(b)).balance.attempts[0];
  await f.event(a.attemptId, { state: "failed", code: "provider-declined" }); await f.pay(await f.get(b.charge.chargeId), b.total);
  await f.event(a.attemptId, { state: "succeeded", providerReference: "late-provider-money", amountMinor: b.total * 100, currency: "THB", occurredAt: f.now() });
  const page = await f.run({ ...scope, type: "payments.list" }) as PaymentPage;
  assert.equal(page.payments.reduce((sum, p) => sum + p.unallocated, 0), b.total); assert.equal((await f.get(b.charge.chargeId)).paid, b.total);
  assert.equal(f.db.sqlite.prepare("SELECT count(*) n FROM payment_webhook_events WHERE failure_code='unallocated-payment'").get()?.n, 1);
});

test("merchant rotation during signature verification fails closed before settlement", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { balance: b } = await f.checkout(); const a = (await f.attempt(b)).balance.attempts[0];
  const verify = f.provider.verify.bind(f.provider);
  f.provider.verify = async (...args) => { const valid = await verify(...args); f.db.sqlite.prepare("UPDATE payment_provider_accounts SET secret_ref='rotated-secret',revision=revision+1 WHERE id=?").run(accountId); return valid; };
  await assert.rejects(f.event(a.attemptId, { state: "succeeded", providerReference: "old-secret-receipt", amountMinor: b.total * 100, currency: "THB", occurredAt: f.now() }), failure("FORBIDDEN"));
  assert.equal(f.db.sqlite.prepare("SELECT count(*) n FROM payments").get()?.n, 0);
  assert.equal(f.db.sqlite.prepare("SELECT count(*) n FROM payment_webhook_events").get()?.n, 0);
});

test("duplicate provider reference and mismatched late event create review evidence without duplicate money or renewed reservation", async (t) => {
  const f = await fixture(); t.after(() => f.db.sqlite.close()); const { balance: b } = await f.checkout(); const first = (await f.attempt(b, 100)).balance.attempts[0];
  const outcome = { state: "succeeded" as const, providerReference: "one-real-receipt", amountMinor: 10000, currency: "THB" as const, occurredAt: f.now() };
  await f.event(first.attemptId, outcome);
  const next = await f.attempt(await f.get(b.charge.chargeId), 100), second = next.balance.attempts.find((a) => a.attemptId !== first.attemptId)!;
  await f.event(second.attemptId, outcome);
  assert.equal((await f.get(b.charge.chargeId)).paid, 100);
  assert.equal(f.db.sqlite.prepare("SELECT count(*) n FROM payment_webhook_events WHERE failure_code='duplicate-provider-reference'").get()?.n, 1);
  await f.event(second.attemptId, { state: "failed", code: "declined" });
  const current = await f.get(b.charge.chargeId); await f.pay(current, current.remaining);
  await f.event(second.attemptId, { ...outcome, providerReference: "incorrect-receipt", amountMinor: 20000 });
  const final = await f.get(b.charge.chargeId); assert.equal(final.reserved, 0); assert.equal(final.remaining, 0);
  assert.throws(() => f.db.sqlite.prepare("UPDATE payment_attempts SET state='reconciliation' WHERE id=?").run(second.attemptId), /BE7_AMOUNT/);
});
