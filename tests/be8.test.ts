import assert from "node:assert/strict";
import test from "node:test";
import { D1Be1Repository } from "../app/_backend/be1/d1Repository";
import { D1Be2Repository } from "../app/_backend/be2/d1Repository";
import { Be4Application } from "../app/_backend/be4/application";
import type { ExecutionChange, ExecutionView } from "../app/_backend/be4/contracts";
import { D1Be3Repository } from "../app/_backend/be3/d1Repository";
import { D1Be4Repository } from "../app/_backend/be4/d1Repository";
import { executionId } from "../app/_backend/be4/domain";
import { Be8Application } from "../app/_backend/be8/application";
import type { CrmPage, ReportView } from "../app/_backend/be8/contracts";
import { Be7Application } from "../app/_backend/be7/application";
import { D1Be7Repository } from "../app/_backend/be7/d1Repository";
import type { BillingMutationResult, ChargeBalanceView } from "../app/_backend/be7/contracts";
import { ARI, PAW, WHISKER, ONNUT, OWNER, MANAGER, THONGLOR, OUTSIDER, metadata, seededDatabase } from "./backendTestKit";

test("Reports and CRM query canonical sources through a consistent authorized snapshot", async (t) => {
  const db = seededDatabase(); t.after(() => db.sqlite.close()); const app = new Be8Application(new D1Be1Repository(db), db, () => "2026-08-18T04:00:00.000Z"), actor = await app.resolvePerson(OWNER);
  const report = await app.executeBe8(actor, { type: "reports.get", businessId: WHISKER, branchId: ARI, options: {} }, metadata()) as ReportView;
  assert.equal(report.financials.grossReceived, 0); assert.equal(report.keyMetrics.completedServices, 0); assert.ok(report.keyMetrics.totalBookings > 0);
  const page = await app.executeBe8(actor, { type: "crm.list", businessId: WHISKER, branchId: ARI }, metadata()) as CrmPage;
  assert.ok(page.items.length > 0); assert.ok(page.items.every((i) => i.profile.visitCount === 0 && i.profile.outstandingBalance === 0));
  const detail = await app.executeBe8(actor, { type: "crm.get", businessId: WHISKER, branchId: ARI, customerId: "booking-contact-nalin" }, metadata()) as CrmPage;
  assert.ok(detail.items[0].timeline.length > 0);
});

test("all-Branch projections never grant another Branch or Business", async (t) => {
  const db = seededDatabase(); t.after(() => db.sqlite.close()); const app = new Be8Application(new D1Be1Repository(db), db);
  const report = await app.executeBe8(await app.resolvePerson(MANAGER), { type: "reports.get", businessId: WHISKER, branchId: ARI, options: { branchScope: "all" } }, metadata()) as ReportView;
  assert.ok(report.branchComparison.every((b) => b.branchId === ARI));
  await assert.rejects(app.executeBe8(await app.resolvePerson(MANAGER), { type: "reports.get", businessId: WHISKER, branchId: THONGLOR, options: {} }, metadata()));
  await assert.rejects(app.executeBe8(await app.resolvePerson(OUTSIDER), { type: "crm.list", businessId: WHISKER, branchId: ARI }, metadata()));
});

test("populated execution-to-payment projections derive Reports and CRM from canonical records", async (t) => {
  const db = seededDatabase();
  t.after(() => db.sqlite.close());
  const now = () => "2026-08-18T04:00:00.000Z";
  const auth = new D1Be1Repository(db);
  const identities = new D1Be2Repository(db);
  const operations = new D1Be4Repository(db);
  const be4 = new Be4Application(auth, identities, new D1Be3Repository(db), operations, now);
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
    const row = db.sqlite.prepare("SELECT id FROM service_executions WHERE business_id=? AND branch_id=? AND booking_id=? AND pet_id=?").get(businessId, branchId, bookingId, petId) as { id: string } | undefined;
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

  assert.equal(db.sqlite.prepare("SELECT count(*) AS n FROM service_records WHERE branch_id=?").get(ARI)?.n, 2);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS n FROM service_records WHERE branch_id=?").get(ONNUT)?.n, 1);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS n FROM service_records r JOIN service_executions e ON e.business_id=r.business_id AND e.branch_id=r.branch_id AND e.id=r.execution_id JOIN bookings b ON b.business_id=e.business_id AND b.branch_id=e.branch_id AND b.id=e.booking_id JOIN customers c ON c.business_id=r.business_id AND c.id=r.customer_id JOIN pets p ON p.id=r.pet_id").get()?.n, 3);

  const billing = new Be7Application(auth, new D1Be7Repository(db, "dev-test"), async () => null, now);
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

  const paymentId = db.sqlite.prepare("SELECT p.id FROM payments p JOIN payment_allocations a ON a.business_id=p.business_id AND a.branch_id=p.branch_id AND a.payment_id=p.id WHERE a.charge_id=?").get(groomingBalance.charge.chargeId) as { id: string };
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
  assert.equal(db.sqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND (name LIKE '%report%' OR name LIKE '%crm%')").get()?.n, 0);
});
