import assert from "node:assert/strict";
import test from "node:test";
import { PostgresBe1Repository } from "../app/_backend/be1/postgresRepository";
import { PostgresBe2Repository } from "../app/_backend/be2/postgresRepository";
import { Be4Application } from "../app/_backend/be4/application";
import type { ExecutionChange, ExecutionView } from "../app/_backend/be4/contracts";
import { PostgresBe3Repository } from "../app/_backend/be3/postgresRepository";
import { PostgresBe4Repository } from "../app/_backend/be4/postgresRepository";
import { executionId } from "../app/_backend/be4/domain";
import { Be8Application } from "../app/_backend/be8/application";
import type { CrmPage, ReportView } from "../app/_backend/be8/contracts";
import { Be7Application } from "../app/_backend/be7/application";
import { PostgresBe7Repository } from "../app/_backend/be7/postgresRepository";
import type { BillingMutationResult, ChargeBalanceView } from "../app/_backend/be7/contracts";
import { ARI, PAW, WHISKER, ONNUT, OWNER, MANAGER, THONGLOR, OUTSIDER, metadata, seededDatabase } from "./postgresFixtures";

test("CRM pages/search/segments retain whole-Business counts and hydrate only selected Customers", async () => {
  const db = seededDatabase(), app = new Be8Application(new PostgresBe1Repository(db), db, () => "2026-08-18T04:00:00.000Z"), actor = await app.resolvePerson(OWNER);
  db.inspect.exec(`INSERT INTO customers(id,business_id,display_name,display_name_key,business_notes,status,created_at,updated_at,created_by_person_id,updated_by_person_id)
    SELECT 'audit_customer_'||lpad(n::text,4,'0'),'${WHISKER}','Cost Customer '||n,'cost customer '||n,'','active','2026-08-17T03:00:00.000Z','2026-08-17T03:00:00.000Z','${OWNER}','${OWNER}' FROM generate_series(0,999) n`);
  const expected = db.inspect.prepare("SELECT id FROM customers WHERE business_id=? AND status='active' ORDER BY id").all(WHISKER).map(c => c.id);
  const ids: string[] = []; let afterId = "";
  for (let count = 0; count < 30; count++) {
    const page = await app.executeBe8(actor, { type: "crm.list", businessId: WHISKER, branchId: ARI, afterId, limit: 50 }, metadata()) as CrmPage;
    assert.equal(page.total, expected.length); assert.equal(page.segments?.all, expected.length);
    assert.equal(page.customers?.length, page.items.length); assert.ok(page.customers?.every(c => c.businessId === WHISKER));
    assert.ok(page.items.length <= 50); ids.push(...page.items.map(c => c.profile.customerId));
    if (!page.nextAfterId) break;
    assert.ok(page.nextAfterId > afterId); afterId = page.nextAfterId;
  }
  assert.deepEqual(ids, expected);
  const names = db.inspect.prepare("SELECT id,display_name FROM customers WHERE business_id=? AND status='active'").all(WHISKER).sort((a, b) => String(a.display_name).localeCompare(String(b.display_name), "th") || String(a.id).localeCompare(String(b.id)));
  for (const offset of [0, 50, 1000]) {
    const page = await app.executeBe8(actor, { type: "crm.list", businessId: WHISKER, branchId: ARI, offset, limit: 50 }, metadata()) as CrmPage;
    assert.deepEqual(page.customers?.map(c => c.id), names.slice(offset, offset + 50).map(c => c.id));
    assert.equal(page.nextOffset, names.length > offset + 50 ? offset + 50 : null);
  }
  const search = await app.executeBe8(actor, { type: "crm.list", businessId: WHISKER, branchId: ARI, query: "Ｃｏｓｔ Ｃｕｓｔｏｍｅｒ ９９９" }, metadata()) as CrmPage;
  assert.deepEqual(search.customers?.map(c => c.id), ["audit_customer_0999"]); assert.equal(search.total, 1); assert.equal(search.segments?.all, expected.length);
  const pet = db.inspect.prepare("SELECT p.name,r.customer_id FROM business_pet_profiles p JOIN customer_pet_relationships r ON r.business_id=p.business_id AND r.pet_id=p.pet_id WHERE p.business_id=? AND p.status='active' AND r.status='active' ORDER BY p.pet_id LIMIT 1").get(WHISKER)!;
  const petSearch = await app.executeBe8(actor, { type: "crm.list", businessId: WHISKER, branchId: ARI, query: String(pet.name) }, metadata()) as CrmPage;
  assert.ok(petSearch.customers?.some(c => c.id === pet.customer_id)); assert.ok(petSearch.customers?.some(c => c.pets.some(p => p.name === pet.name)));
  const empty = await app.executeBe8(actor, { type: "crm.list", businessId: WHISKER, branchId: ARI, query: "%_" }, metadata()) as CrmPage;
  assert.equal(empty.items.length, 0); assert.equal(empty.total, 0);
  const noNext = await app.executeBe8(actor, { type: "crm.list", businessId: WHISKER, branchId: ARI, segment: "no-next-booking", limit: 1 }, metadata()) as CrmPage;
  assert.equal(noNext.items.length, 1); assert.equal(noNext.total, noNext.segments?.["no-next-booking"]); assert.ok(noNext.total! >= 1000); assert.equal(noNext.items[0].profile.nextBooking, null);
  const manager = await app.executeBe8(await app.resolvePerson(MANAGER), { type: "crm.list", businessId: WHISKER, branchId: ARI }, metadata()) as CrmPage;
  assert.ok(manager.items.every(c => c.upcoming.every(b => b.branchId === ARI)));
  await assert.rejects(app.executeBe8(actor, { type: "crm.list", businessId: WHISKER, branchId: ARI, limit: 51 }, metadata()));
  await assert.rejects(app.executeBe8(await app.resolvePerson(MANAGER), { type: "crm.list", businessId: PAW, branchId: ONNUT }, metadata()));
});

test("Reports and CRM query canonical sources through a consistent authorized snapshot", async (t) => {
  const db = seededDatabase(); t.after(() => db.inspect.close()); const app = new Be8Application(new PostgresBe1Repository(db), db, () => "2026-08-18T04:00:00.000Z"), actor = await app.resolvePerson(OWNER);
  const report = await app.executeBe8(actor, { type: "reports.get", businessId: WHISKER, branchId: ARI, options: {} }, metadata()) as ReportView;
  assert.equal(report.financials.grossReceived, 0); assert.equal(report.keyMetrics.completedServices, 0); assert.ok(report.keyMetrics.totalBookings > 0);
  const page = await app.executeBe8(actor, { type: "crm.list", businessId: WHISKER, branchId: ARI }, metadata()) as CrmPage;
  assert.ok(page.items.length > 0); assert.ok(page.items.every((i) => i.profile.visitCount === 0 && i.profile.outstandingBalance === 0));
  const detail = await app.executeBe8(actor, { type: "crm.get", businessId: WHISKER, branchId: ARI, customerId: "booking-contact-nalin" }, metadata()) as CrmPage;
  assert.ok(detail.items[0].timeline.length > 0);
});

test("all-Branch projections never grant another Branch or Business", async (t) => {
  const db = seededDatabase(); t.after(() => db.inspect.close()); const app = new Be8Application(new PostgresBe1Repository(db), db);
  const report = await app.executeBe8(await app.resolvePerson(MANAGER), { type: "reports.get", businessId: WHISKER, branchId: ARI, options: { branchScope: "all" } }, metadata()) as ReportView;
  assert.ok(report.branchComparison.every((b) => b.branchId === ARI));
  await assert.rejects(app.executeBe8(await app.resolvePerson(MANAGER), { type: "reports.get", businessId: WHISKER, branchId: THONGLOR, options: {} }, metadata()));
  await assert.rejects(app.executeBe8(await app.resolvePerson(OUTSIDER), { type: "crm.list", businessId: WHISKER, branchId: ARI }, metadata()));
});

test("populated execution-to-payment projections derive Reports and CRM from canonical records", async (t) => {
  const db = seededDatabase();
  t.after(() => db.inspect.close());
  const now = () => "2026-08-18T04:00:00.000Z";
  const auth = new PostgresBe1Repository(db);
  const identities = new PostgresBe2Repository(db);
  const operations = new PostgresBe4Repository(db);
  const be4 = new Be4Application(auth, identities, new PostgresBe3Repository(db), operations, now);
  const owner = await be4.resolvePerson(OWNER);

  const transition = async (value: ExecutionView, changeValue: ExecutionChange): Promise<ExecutionView> => {
    const result = await be4.executeBe4(owner, { type: "operations.change", input: {
      businessId: value.record.businessId,
      branchId: value.record.branchId,
      executionId: executionId(value),
      expectedRevision: value.record.revision,
      requestKey: `be8-populated-${crypto.randomUUID()}`,
      change: changeValue,
    } }, metadata());
    return result as ExecutionView;
  };

  const loadExecution = async (businessId: string, branchId: string, bookingId: string, petId: string) => {
    const row = db.inspect.prepare("SELECT id FROM service_executions WHERE business_id=? AND branch_id=? AND booking_id=? AND pet_id=?").get(businessId, branchId, bookingId, petId) as { id: string } | undefined;
    assert.ok(row, `execution missing for ${bookingId}/${petId}`);
    const value = await operations.get(businessId, branchId, row.id);
    assert.ok(value);
    return value;
  };

  let grooming = await loadExecution(WHISKER, ARI, "booking-fixture-ari-grooming-biscuit", "booking-pet-biscuit");
  for (const status of ["checked-in", "in-service", "ready-for-pickup", "completed"] as const) grooming = await transition(grooming, { type: "transition", status });

  let hotel = await loadExecution(WHISKER, ARI, "booking-fixture-ari-hotel-biscuit-checkout", "booking-pet-biscuit");
  hotel = await transition(hotel, { type: "hotel-room", roomId: "ari-hotel-room-a01", effectiveDate: null, reason: "ตรวจสอบรายงาน" });
  hotel = await transition(hotel, { type: "transition", status: "checked-in" });
  hotel = await transition(hotel, { type: "transition", status: "in-stay" });
  assert.equal(hotel.kind, "hotel");
  if (hotel.kind === "hotel") for (const task of hotel.record.dailyCareTasks) hotel = await transition(hotel, { type: "hotel-care-complete", taskId: task.id });
  hotel = await transition(hotel, { type: "transition", status: "ready-for-checkout" });
  hotel = await transition(hotel, { type: "transition", status: "checked-out" });
  hotel = await transition(hotel, { type: "transition", status: "completed" });

  let daycare = await loadExecution(PAW, ONNUT, "booking-fixture-onnut-daycare-full", "booking-pet-pudding");
  daycare = await transition(daycare, { type: "transition", status: "checked-in" });
  daycare = await transition(daycare, { type: "transition", status: "active" });
  daycare = await transition(daycare, { type: "daycare-care", kind: "water", note: "เติมน้ำ" });
  for (const status of ["ready-for-pickup", "checked-out", "completed"] as const) daycare = await transition(daycare, { type: "transition", status });

  assert.equal(db.inspect.prepare("SELECT count(*) AS n FROM service_records WHERE branch_id=?").get(ARI)?.n, 2);
  assert.equal(db.inspect.prepare("SELECT count(*) AS n FROM service_records WHERE branch_id=?").get(ONNUT)?.n, 1);
  assert.equal(db.inspect.prepare("SELECT count(*) AS n FROM service_records r JOIN service_executions e ON e.business_id=r.business_id AND e.branch_id=r.branch_id AND e.id=r.execution_id JOIN bookings b ON b.business_id=e.business_id AND b.branch_id=e.branch_id AND b.id=e.booking_id JOIN customers c ON c.business_id=r.business_id AND c.id=r.customer_id JOIN pets p ON p.id=r.pet_id").get()?.n, 3);

  const billing = new Be7Application(auth, new PostgresBe7Repository(db, "dev-test"), async () => null, now);
  const checkoutAndPay = async (actor: typeof owner, businessId: string, branchId: string, value: ExecutionView, key: string) => {
    const checkout = await billing.executeBe7(actor, { type: "charge.checkout", businessId, branchId, executionId: executionId(value), requestKey: `${key}-checkout` }, metadata()) as BillingMutationResult;
    assert.ok(checkout.created);
    const payment = await billing.executeBe7(actor, { type: "payment.record", businessId, branchId, chargeId: checkout.balance.charge.chargeId, expectedRevision: checkout.balance.charge.revision, amount: checkout.balance.remaining, method: "cash", note: "BE8 integration", requestKey: `${key}-payment` }, metadata()) as BillingMutationResult;
    assert.equal(payment.balance.status, "paid");
    return payment.balance;
  };
  const groomingBalance = await checkoutAndPay(owner, WHISKER, ARI, grooming, "grooming");
  await checkoutAndPay(owner, WHISKER, ARI, hotel, "hotel");
  await checkoutAndPay(owner, PAW, ONNUT, daycare, "daycare");

  const paymentId = db.inspect.prepare("SELECT p.id FROM payments p JOIN payment_allocations a ON a.business_id=p.business_id AND a.branch_id=p.branch_id AND a.payment_id=p.id WHERE a.charge_id=?").get(groomingBalance.charge.chargeId) as { id: string };
  const paidGrooming = await billing.executeBe7(owner, { type: "charge.get", businessId: WHISKER, branchId: ARI, chargeId: groomingBalance.charge.chargeId }, metadata()) as ChargeBalanceView;
  const refunded = await billing.executeBe7(await billing.resolvePerson(MANAGER), { type: "refund.record", businessId: WHISKER, branchId: ARI, chargeId: groomingBalance.charge.chargeId, paymentId: paymentId.id, amount: 100, reason: "คืนเงินทดสอบรายงาน", expectedRevision: paidGrooming.charge.revision, requestKey: "grooming-refund" }, metadata()) as BillingMutationResult;
  assert.equal(refunded.balance.refunded, 100);

  const reports = new Be8Application(auth, db, now);
  const ariReport = await reports.executeBe8(await reports.resolvePerson(OWNER), { type: "reports.get", businessId: WHISKER, branchId: ARI, options: { dateRangePreset: "custom", customStartDate: "2026-08-18", customEndDate: "2026-08-18" } }, metadata()) as ReportView;
  assert.equal(ariReport.keyMetrics.completedServices, 2);
  assert.equal(ariReport.keyMetrics.completedGrooming, 1);
  assert.equal(ariReport.keyMetrics.completedHotel, 1);
  assert.ok(ariReport.financials.grossReceived > 0);
  assert.equal(ariReport.financials.refunded, 100);
  assert.equal(ariReport.financials.netReceived, ariReport.financials.grossReceived - 100);
  assert.ok(ariReport.keyMetrics.totalBookings > 0);
  assert.ok(ariReport.keyMetrics.totalCustomers > 0);
  assert.ok(ariReport.serviceBreakdown.grooming.jobCount > 0);
  assert.ok(ariReport.serviceBreakdown.hotel.stayCount > 0);
  assert.ok(ariReport.customerInsights.recentServices.length >= 2);
  assert.equal(ariReport.branchComparison.length, 1);
  assert.equal(ariReport.branchComparison[0].branchId, ARI);

  const beforeWork = await reports.executeBe8(await reports.resolvePerson(OWNER), { type: "reports.get", businessId: WHISKER, branchId: ARI, options: { dateRangePreset: "custom", customStartDate: "2026-08-17", customEndDate: "2026-08-17" } }, metadata()) as ReportView;
  assert.equal(beforeWork.keyMetrics.completedServices, 0);
  assert.equal(beforeWork.financials.grossReceived, 0);
  const allBranches = await reports.executeBe8(await reports.resolvePerson(OWNER), { type: "reports.get", businessId: WHISKER, branchId: ARI, options: { branchScope: "all", dateRangePreset: "custom", customStartDate: "2026-08-18", customEndDate: "2026-08-18" } }, metadata()) as ReportView;
  assert.equal(allBranches.branchComparison.length, 2);

  const pawReport = await reports.executeBe8(await reports.resolvePerson(OWNER), { type: "reports.get", businessId: PAW, branchId: ONNUT, options: { dateRangePreset: "custom", customStartDate: "2026-08-18", customEndDate: "2026-08-18" } }, metadata()) as ReportView;
  assert.equal(pawReport.keyMetrics.completedDaycare, 1);
  assert.ok(pawReport.serviceBreakdown.daycare.attendanceCount > 0);
  assert.ok(pawReport.serviceBreakdown.daycare.revenue > 0);

  const crm = await reports.executeBe8(await reports.resolvePerson(OWNER), { type: "crm.get", businessId: WHISKER, branchId: ARI, customerId: "booking-contact-nalin" }, metadata()) as CrmPage;
  const profile = crm.items[0].profile;
  assert.equal(profile.visitCount, 2);
  assert.ok(profile.lastVisitAt);
  assert.ok(profile.nextBooking);
  assert.deepEqual(new Set(profile.servicesUsed), new Set(["grooming", "hotel"]));
  assert.equal(profile.outstandingBalance, 100);
  assert.ok(crm.items[0].timeline.some((item) => item.kind === "service"));
  assert.ok(crm.items[0].timeline.some((item) => item.kind === "payment"));
  assert.ok(crm.items[0].timeline.every((item, index, items) => index === 0 || items[index - 1].at >= item.at));
  assert.equal(db.inspect.prepare("SELECT count(*) AS n FROM pg_tables WHERE schemaname=current_schema() AND (tablename LIKE '%report%' OR tablename LIKE '%crm%')").get()?.n, 0);
});
