import assert from "node:assert/strict";
import test from "node:test";
import { D1Be1Repository } from "../app/_backend/be1/d1Repository";
import { Be1Error } from "../app/_backend/be1/errors";
import { D1Be2Repository } from "../app/_backend/be2/d1Repository";
import { Be2Application } from "../app/_backend/be2/application";
import { D1Be3Repository } from "../app/_backend/be3/d1Repository";
import { Be3Application } from "../app/_backend/be3/application";
import type { CreateBookingInput } from "../app/_backend/be3/contracts";
import { D1Be6Repository } from "../app/_backend/be6/d1Repository";
import { Be6Application } from "../app/_backend/be6/application";
import type { ConversationView } from "../app/_backend/be6/contracts";
import { D1Be7Repository } from "../app/_backend/be7/d1Repository";
import { Be7Application } from "../app/_backend/be7/application";
import type { BillingMutationResult } from "../app/_backend/be7/contracts";
import { ARI, MANAGER, metadata, ONNUT, OWNER, PAW, seededDatabase, WHISKER } from "./d1Fixtures";

const now = () => "2026-09-07T02:00:00.000Z";
const grooming: CreateBookingInput = {
  businessId: WHISKER, branchId: ARI, serviceId: "ari-grooming-bath-groom", customerId: "booking-contact-nalin",
  petIds: ["booking-pet-mochi"], start: "2026-09-10T10:00", end: "2026-09-10T11:30",
  assignedResourceIds: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"], status: "confirmed", estimate: 850, notes: "", idempotencyKey: "d1-grooming-race",
};

function bookingApplication(db: ReturnType<typeof seededDatabase>, repository = new D1Be3Repository(db)) {
  return new Be3Application(new D1Be1Repository(db), new D1Be2Repository(db), repository, { now });
}

// Both requests finish their availability checks before either atomic batch runs.
function gateCreates(repository: D1Be3Repository) {
  const create = repository.createBooking.bind(repository);
  let arrivals = 0, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  repository.createBooking = async (...args) => {
    if (++arrivals === 2) release();
    await gate;
    return create(...args);
  };
}

for (const serviceModule of ["grooming", "hotel", "daycare"] as const) {
  test(`D1 ${serviceModule} competing creates have one winner after stale availability`, async t => {
    const db = seededDatabase(); t.after(() => db.close());
    const repository = new D1Be3Repository(db), app = bookingApplication(db, repository), actor = await app.resolvePerson(OWNER);
    const first: CreateBookingInput = serviceModule === "grooming" ? { ...grooming } : serviceModule === "hotel" ? {
      ...grooming, serviceId: "ari-hotel-stay", start: "2026-09-10", end: "2026-09-12", petIds: ["booking-pet-mochi", "booking-pet-biscuit"],
      assignedResourceIds: ["ari-hotel-capacity"], idempotencyKey: "d1-hotel-race",
    } : {
      ...grooming, businessId: PAW, branchId: ONNUT, serviceId: "onnut-daycare-full-day", customerId: "booking-contact-onnut-aom",
      petIds: ["booking-pet-pudding"], start: "2026-09-10", end: null, assignedResourceIds: ["onnut-daycare-quiet"], idempotencyKey: "d1-daycare-race",
    };
    if (serviceModule === "daycare") db.inspect.prepare("UPDATE booking_resources SET capacity=1 WHERE business_id=? AND branch_id=? AND id=?").run(PAW, ONNUT, "onnut-daycare-quiet");
    const second = { ...first, idempotencyKey: `${first.idempotencyKey}-other`, customerId: serviceModule === "daycare" ? "booking-contact-onnut-lee" : "booking-contact-pim",
      petIds: serviceModule === "hotel" ? ["booking-pet-luna", "booking-pet-tofu"] : serviceModule === "daycare" ? ["booking-pet-leo"] : ["booking-pet-luna"] };
    await app.getCatalog(actor, first.businessId, first.branchId);
    gateCreates(repository);
    const results = await Promise.all([app.createBooking(actor, first, metadata()), app.createBooking(actor, second, metadata())]);
    assert.deepEqual(results.map(r => r.outcome).sort(), ["conflict", "created"]);
    const loser = results.find(r => r.outcome === "conflict")!;
    assert.equal(loser.outcome, "conflict");
    if (loser.outcome === "conflict") assert.ok(loser.availability.conflicts.some(c => c.code === (serviceModule === "grooming" ? "TIME_CONFLICT" : "CAPACITY_CONFLICT")));
    assert.equal(db.inspect.prepare("SELECT count(*) n FROM bookings WHERE idempotency_key IN (?,?)").get(first.idempotencyKey, second.idempotencyKey)?.n, 1);
    assert.deepEqual(db.inspect.prepare("PRAGMA foreign_key_check").all(), []);
  });
}

test("D1 cancellation and update race preserve one revision, audit and reservation state", async t => {
  const db = seededDatabase(); t.after(() => db.close());
  const app = bookingApplication(db), actor = await app.resolvePerson(OWNER);
  const created = await app.createBooking(actor, grooming, metadata()); assert.equal(created.outcome, "created");
  if (created.outcome !== "created") return;
  const { booking } = created;
  const results = await Promise.all([
    app.cancelBooking(actor, { businessId: WHISKER, branchId: ARI, bookingId: booking.id, expectedRevision: booking.revision }, metadata()),
    app.updateBooking(actor, { ...grooming, bookingId: booking.id, expectedRevision: booking.revision, notes: "Concurrent note" }, metadata()),
  ]);
  assert.equal(results.filter(r => r.outcome === "conflict").length, 1);
  const current = await app.getBooking(actor, WHISKER, ARI, booking.id); assert.equal(current.revision, booking.revision + 1);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM booking_write_commits WHERE booking_id=?").get(booking.id)?.n, 2);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM audit_events WHERE target_id=? AND target_type='booking'").get(booking.id)?.n, 2);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM backend_guards").get()?.n, 0);
});

test("D1 rechecks revoked Business membership and Branch grant inside mutation batches", async t => {
  const db = seededDatabase(); t.after(() => db.close());
  const auth = new D1Be1Repository(db), customers = new D1Be2Repository(db), app = new Be2Application(auth, customers, { now });
  const actor = await app.resolvePerson(MANAGER), original = db.batch.bind(db);
  db.batch = async statements => {
    if (statements.some(s => /INSERT INTO customers/.test((s as unknown as { query: string }).query))) db.inspect.prepare("UPDATE business_memberships SET status='inactive' WHERE business_id=? AND person_id=?").run(WHISKER, MANAGER);
    return original(statements);
  };
  await assert.rejects(app.createCustomer(actor, { businessId: WHISKER, displayName: "Revoked writer", phone: null, email: null, businessNotes: "" }, metadata()), e => e instanceof Be1Error && e.code === "FORBIDDEN");
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM customers WHERE display_name='Revoked writer'").get()?.n, 0);
  db.inspect.prepare("UPDATE business_memberships SET status='active' WHERE business_id=? AND person_id=?").run(WHISKER, MANAGER);
  const booking = bookingApplication(db);
  db.batch = async statements => {
    if (statements.some(s => /INSERT INTO bookings/.test((s as unknown as { query: string }).query))) db.inspect.prepare("UPDATE membership_branch_access SET status='inactive' WHERE business_id=? AND branch_id=? AND membership_id=(SELECT id FROM business_memberships WHERE business_id=? AND person_id=?)").run(WHISKER, ARI, WHISKER, MANAGER);
    return original(statements);
  };
  await assert.rejects(booking.createBooking(actor, grooming, metadata()), e => e instanceof Be1Error && e.code === "FORBIDDEN");
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM bookings WHERE idempotency_key=?").get(grooming.idempotencyKey)?.n, 0);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM backend_guards").get()?.n, 0);
});

test("D1 hydrates over 100 Customer IDs with bounded bindings and tenant isolation", async t => {
  const db = seededDatabase(); t.after(() => db.close());
  const auth = new D1Be1Repository(db), repo = new D1Be2Repository(db), app = new Be2Application(auth, repo, { now });
  const actor = await app.resolvePerson(OWNER);
  for (let i = 0; i < 140; i++) await app.createCustomer(actor, { businessId: WHISKER, displayName: `D1 bulk ${String(i).padStart(3, "0")}`, phone: null, email: null, businessNotes: "", tags: ["bulk"] }, metadata());
  const page = await repo.listCustomers({ businessId: WHISKER, includeInactive: false, queryKey: "d1 bulk", phoneKey: null, limit: 200, offset: 0 });
  assert.equal(page.items.length, 140); assert.ok(page.items.every(c => c.tags[0] === "bulk" && c.businessId === WHISKER));
  assert.equal(await repo.getCustomer(PAW, page.items[0].id), null);
  assert.deepEqual(db.inspect.prepare("PRAGMA foreign_key_check").all(), []);
});

test("D1 money stays in integer minor units and inactive Branch reads recheck current scope", async t => {
  const db = seededDatabase(); t.after(() => db.close());
  const auth = new D1Be1Repository(db), booking = bookingApplication(db), owner = await auth.findPersonById(OWNER), manager = await auth.findPersonById(MANAGER);
  assert.ok(owner && manager);
  const created = await booking.createBooking(owner, grooming, metadata()); assert.equal(created.outcome, "created");
  if (created.outcome !== "created") return;
  assert.equal(created.booking.estimate, 850);
  assert.equal(db.inspect.prepare("SELECT estimate FROM bookings WHERE id=?").get(created.booking.id)?.estimate, 85000);
  const inbox = new D1Be6Repository(db), inboxApp = new Be6Application(auth, inbox, now), billing = new D1Be7Repository(db), billingApp = new Be7Application(auth, billing, undefined, now);
  const scope = { businessId: WHISKER, branchId: ARI }, context = { customerId: grooming.customerId, petId: grooming.petIds[0], bookingId: created.booking.id, executionId: null };
  const conversation = await inboxApp.executeBe6(owner, { ...scope, type: "conversation.ensure", context, requestKey: "d1-money-conversation" }, metadata()) as ConversationView;
  const approved = await inboxApp.executeBe6(owner, { ...scope, type: "approval.request", conversationId: conversation.conversationId, context, serviceName: "Add-on", additionalPrice: 99, additionalMinutes: 10, note: "", requestKey: "d1-money-approval" }, metadata()) as ConversationView;
  const message = approved.messages.find(m => m.kind === "add-service-request"); assert.ok(message && message.kind === "add-service-request");
  assert.equal(message.additionalPrice, 99);
  assert.equal(db.inspect.prepare("SELECT additional_price FROM message_approvals WHERE message_id=?").get(message.messageId)?.additional_price, 9900);
  const executionId = db.inspect.prepare("SELECT id FROM service_executions WHERE booking_id=?").get(created.booking.id)!.id as string;
  const checkout = await billingApp.executeBe7(owner, { ...scope, type: "charge.checkout", executionId, requestKey: "d1-money-charge" }, metadata()) as BillingMutationResult;
  assert.equal(checkout.balance.total, 850);
  assert.equal(db.inspect.prepare("SELECT amount_minor FROM charge_items WHERE charge_id=?").get(checkout.balance.charge.chargeId)?.amount_minor, 85000);
  const managerScope = await inboxApp.scope(manager, WHISKER, ARI, metadata(), now()), ownerScope = await inboxApp.scope(owner, WHISKER, ARI, metadata(), now());
  db.inspect.prepare("UPDATE branches SET status='inactive' WHERE business_id=? AND id=?").run(WHISKER, ARI);
  await assert.rejects(inbox.get(managerScope, ARI, conversation.conversationId), e => e instanceof Be1Error);
  await assert.rejects(billing.get(managerScope, ARI, checkout.balance.charge.chargeId), e => e instanceof Be1Error);
  assert.equal((await inbox.get(ownerScope, ARI, conversation.conversationId)).conversationId, conversation.conversationId);
  assert.equal((await billing.get(ownerScope, ARI, checkout.balance.charge.chargeId)).total, 850);
});
