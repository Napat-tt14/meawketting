import type { D1DatabaseLike } from "../be1/repository";
import type { BusinessServiceModule, ReportOptions, ReportRecentServiceItem } from "./contracts";
import { emptyReport } from "./projections";
import { ProjectionSnapshot, type ProjectionScope } from "./snapshot";
import { dateInZone } from "../shared/time";

type CountRow = { branch_id: string; module: BusinessServiceModule; status: string; n: number };
type MoneyRow = { branch_id: string; received: number; refunded: number; unallocated: number; n: number };
type CustomerRow = { id: string; display_name: string; visits: number; spent: number; is_new: number; returned: number; pets: string };
const statuses: Record<string, string> = { completed: "เสร็จแล้ว", "checked-out": "รับกลับแล้ว" };
const modules: BusinessServiceModule[] = ["grooming", "hotel", "daycare"];
const sum = <T>(rows: T[], value: (r: T) => number) => rows.reduce((n, r) => n + value(r), 0);
const count = (rows: CountRow[], module?: BusinessServiceModule, status?: string[]) => sum(rows.filter((r) => (!module || r.module === module) && (!status || status.includes(r.status))), (r) => r.n);

export async function projectReport(db: D1DatabaseLike, scope: ProjectionScope, options: ReportOptions) {
  const snapshot = new ProjectionSnapshot(db, scope);
  const result = await snapshot.read([
    { sql: "SELECT id,name,business_name,status,(SELECT json_group_array(module) FROM branch_enabled_modules m WHERE m.business_id=a.business_id AND m.branch_id=a.id) modules FROM allowed a ORDER BY name,id" },
    { sql: `SELECT a.id branch_id,coalesce((SELECT sum(amount_minor) FROM period_payments p WHERE p.branch_id=a.id),0) received,
      coalesce((SELECT sum(amount_minor) FROM period_refunds r WHERE r.branch_id=a.id),0) refunded,
      coalesce((SELECT sum(p.amount_minor-coalesce((SELECT sum(l.amount_minor) FROM payment_allocations l WHERE l.business_id=p.business_id AND l.branch_id=p.branch_id AND l.payment_id=p.id),0)) FROM period_payments p WHERE p.branch_id=a.id),0) unallocated,
      (SELECT count(*) FROM period_payments p WHERE p.branch_id=a.id) n FROM allowed a` },
    { sql: `SELECT sum(CASE WHEN cancelled_at IS NULL THEN total_minor-paid_minor+refunded_minor ELSE 0 END) remaining,
      sum(cancelled_at IS NULL AND total_minor>paid_minor-refunded_minor AND paid_minor-refunded_minor=0) unpaid,
      sum(cancelled_at IS NULL AND total_minor>paid_minor-refunded_minor AND paid_minor-refunded_minor>0) partial FROM balances` },
    { sql: "SELECT branch_id,service_module module,status,count(*) n FROM period_bookings GROUP BY branch_id,service_module,status" },
    { sql: "SELECT branch_id,module,status,count(*) n FROM period_executions GROUP BY branch_id,module,status" },
    { sql: "SELECT branch_id,module,'completed' status,count(*) n FROM period_records GROUP BY branch_id,module" },
    { sql: `SELECT module,sum(amount) amount,count(DISTINCT payment_id) n FROM (
      SELECT c.module,l.amount_minor amount,p.id payment_id FROM period_payments p JOIN payment_allocations l ON l.business_id=p.business_id AND l.branch_id=p.branch_id AND l.payment_id=p.id JOIN balances c ON c.id=l.charge_id
      UNION ALL SELECT c.module,-l.amount_minor,NULL FROM period_refunds r JOIN refund_allocations l ON l.business_id=r.business_id AND l.branch_id=r.branch_id AND l.refund_id=r.id JOIN balances c ON c.id=l.charge_id) GROUP BY module` },
    { sql: `SELECT module,label,sum(n) n,sum(amount) amount FROM (
      SELECT r.module,json_extract(r.snapshot_json,'$.serviceLabel') label,count(*) n,0 amount FROM period_records r GROUP BY r.module,label
      UNION ALL SELECT c.module,c.service_label,0,sum(l.amount_minor) FROM period_payments p JOIN payment_allocations l ON l.business_id=p.business_id AND l.branch_id=p.branch_id AND l.payment_id=p.id JOIN balances c ON c.id=l.charge_id GROUP BY c.module,c.service_label
      UNION ALL SELECT c.module,c.service_label,0,-sum(l.amount_minor) FROM period_refunds r JOIN refund_allocations l ON l.business_id=r.business_id AND l.branch_id=r.branch_id AND l.refund_id=r.id JOIN balances c ON c.id=l.charge_id GROUP BY c.module,c.service_label) GROUP BY module,label ORDER BY n DESC,amount DESC,label LIMIT 20` },
    { sql: `SELECT a.id branch_id,
      coalesce((SELECT sum(capacity) FROM hotel_spaces h WHERE h.business_id=a.business_id AND h.branch_id=a.id AND h.status='active' AND a.status='active'),0) hotel_capacity,
      (SELECT count(DISTINCT e.id) FROM scoped_executions e JOIN execution_assignments x ON x.business_id=e.business_id AND x.branch_id=e.branch_id AND x.execution_id=e.id JOIN hotel_spaces h ON h.business_id=x.business_id AND h.branch_id=x.branch_id AND h.id=x.space_id
       WHERE e.branch_id=a.id AND e.module='hotel' AND e.status IN ('checked-in','in-stay','ready-for-checkout') AND x.start_local<=a.today AND x.end_local>a.today AND h.status='active' AND a.status='active') hotel_occupied,
      coalesce((SELECT sum(capacity) FROM booking_resources r WHERE r.business_id=a.business_id AND r.branch_id=a.id AND r.kind='daycare-zone' AND r.status='active' AND a.status='active'),0) daycare_capacity,
      (SELECT count(*) FROM scoped_executions e WHERE e.branch_id=a.id AND e.module='daycare' AND e.scheduled_start=a.today AND e.status IN ('checked-in','active','ready-for-pickup') AND a.status='active') daycare_occupied FROM allowed a` },
    { sql: `SELECT strftime('%w',substr(start_local,1,10)) day,count(*) n FROM period_bookings WHERE status<>'cancelled' GROUP BY day ORDER BY n DESC,day LIMIT 1` },
    { sql: `SELECT substr(start_local,12,2)||':00' slot,count(*) n FROM period_bookings WHERE status<>'cancelled' AND time_model='appointment' GROUP BY slot ORDER BY n DESC,slot LIMIT 1` },
    { sql: `SELECT count(DISTINCT e.id) n FROM period_executions e JOIN allowed a ON a.id=e.branch_id WHERE e.status NOT IN ('completed','checked-out','cancelled','no-show') AND (substr(coalesce(e.scheduled_end,e.scheduled_start),1,10)<a.today OR EXISTS(SELECT 1 FROM execution_care_tasks t WHERE t.business_id=e.business_id AND t.branch_id=e.branch_id AND t.execution_id=e.id AND t.completed_at IS NULL AND t.scheduled_date<a.today))` },
    { sql: `SELECT c.id,c.display_name,
      (SELECT count(DISTINCT booking_id) FROM period_records r WHERE r.customer_id=c.id) visits,
      coalesce((SELECT sum(amount_minor) FROM period_payments p WHERE p.customer_id=c.id),0)-coalesce((SELECT sum(amount_minor) FROM period_refunds r WHERE r.customer_id=c.id),0) spent,
      EXISTS(SELECT 1 FROM allowed a WHERE c.created_at>=a.since AND c.created_at<a.until AND (EXISTS(SELECT 1 FROM period_bookings b WHERE b.customer_id=c.id AND b.branch_id=a.id AND b.status<>'cancelled') OR EXISTS(SELECT 1 FROM period_records r WHERE r.customer_id=c.id AND r.branch_id=a.id) OR EXISTS(SELECT 1 FROM period_payments p WHERE p.customer_id=c.id AND p.branch_id=a.id))) is_new,
      EXISTS(SELECT 1 FROM scoped_records r JOIN allowed a ON a.id=r.branch_id WHERE r.customer_id=c.id AND r.completed_at<a.since) returned,
      (SELECT json_group_array(name) FROM (SELECT DISTINCT p.name FROM business_pet_profiles p JOIN period_records r ON r.business_id=p.business_id AND r.pet_id=p.pet_id WHERE r.customer_id=c.id)) pets
      FROM customers c WHERE c.business_id IN (SELECT business_id FROM allowed) AND c.id IN (SELECT customer_id FROM period_bookings WHERE status<>'cancelled' UNION SELECT customer_id FROM period_records UNION SELECT customer_id FROM period_payments)` },
    { sql: `SELECT r.id,r.branch_id,r.module,r.completed_at,r.snapshot_json,c.display_name,p.name pet_name,a.name branch_name,e.status,
      coalesce(ch.total_minor,0) amount,CASE WHEN ch.id IS NULL THEN 'no-charge' WHEN ch.cancelled_at IS NOT NULL THEN 'cancelled' WHEN ch.total_minor=ch.paid_minor-ch.refunded_minor THEN 'paid' WHEN ch.paid_minor>ch.refunded_minor THEN 'partial' ELSE 'unpaid' END payment_status
      FROM period_records r JOIN allowed a ON a.id=r.branch_id JOIN customers c ON c.business_id=r.business_id AND c.id=r.customer_id JOIN business_pet_profiles p ON p.business_id=r.business_id AND p.pet_id=r.pet_id JOIN scoped_executions e ON e.id=r.execution_id LEFT JOIN balances ch ON ch.branch_id=r.branch_id AND ch.booking_id=r.booking_id ORDER BY r.completed_at DESC,r.id DESC LIMIT 20` },
    { sql: `SELECT e.module,sum(CASE WHEN json_extract(e.details_json,'$.actualCheckInAt')>=a.since AND json_extract(e.details_json,'$.actualCheckInAt')<a.until THEN 1 ELSE 0 END) checkins,
      sum(CASE WHEN json_extract(e.details_json,'$.actualCheckOutAt')>=a.since AND json_extract(e.details_json,'$.actualCheckOutAt')<a.until THEN 1 ELSE 0 END) checkouts FROM scoped_executions e JOIN allowed a ON a.id=e.branch_id WHERE e.module='hotel' GROUP BY e.module` },
  ]);
  const branches = result[0] as { id: string; name: string; business_name: string; modules: string; status: string }[], money = result[1] as MoneyRow[];
  const balance = result[2][0] as { remaining: number | null; unpaid: number | null; partial: number | null };
  const bookings = result[3] as CountRow[], executions = result[4] as CountRow[], records = result[5] as CountRow[], moduleMoney = result[6] as { module: BusinessServiceModule; amount: number; n: number }[];
  const occupancy = result[8] as { hotel_capacity: number; hotel_occupied: number; daycare_capacity: number; daycare_occupied: number }[], customers = result[12] as CustomerRow[];
  const report = emptyReport(options, scope.now, scope.branches[0].timezone, branches[0]?.business_name ?? "", options.branchScope === "all" ? "ทุกสาขาที่เข้าถึงได้" : branches[0]?.name ?? "");
  report.dateRange = { ...report.dateRange, startDate: scope.startDate, endDate: scope.endDate };
  report.financials = { grossReceived: sum(money, (r) => r.received) / 100, refunded: sum(money, (r) => r.refunded) / 100, netReceived: sum(money, (r) => r.received - r.refunded) / 100, unallocated: sum(money, (r) => r.unallocated) / 100 };
  const k = report.keyMetrics;
  report.waitingIntake = count(executions, undefined, ["booked", "expected-today"]);
  Object.assign(k, { revenue: report.financials.netReceived, paymentCount: sum(money, (r) => r.n), unpaidBalance: (balance.remaining ?? 0) / 100, unpaidCount: balance.unpaid ?? 0, partialCount: balance.partial ?? 0, completedServices: count(records), completedGrooming: count(records, "grooming"), completedHotel: count(records, "hotel"), completedDaycare: count(records, "daycare"), totalBookings: count(bookings), confirmedBookings: count(bookings, undefined, ["confirmed"]), arrivedBookings: count(bookings, undefined, ["arrived"]), pendingBookings: count(bookings, undefined, ["pending"]), cancelledBookings: count(bookings, undefined, ["cancelled"]), totalCustomers: customers.length, newCustomers: customers.filter((c) => c.is_new).length, returningCustomers: customers.filter((c) => c.returned).length });
  for (const m of modules) report.serviceBreakdown[m].revenue = (moduleMoney.find((r) => r.module === m)?.amount ?? 0) / 100;
  const { grooming, hotel, daycare } = report.serviceBreakdown;
  Object.assign(grooming, { jobCount: count(executions, "grooming"), completedCount: k.completedGrooming, inProgressCount: count(executions, "grooming", ["checked-in", "waiting", "in-service", "ready-for-pickup"]), popularServices: (result[7] as { module: BusinessServiceModule; label: string; n: number; amount: number }[]).filter((r) => r.module === "grooming").slice(0, 5).map((r) => ({ module: r.module, label: r.label ?? "บริการ", count: r.n, revenue: r.amount / 100 })) });
  const movements = result[14][0] as { checkins: number; checkouts: number } | undefined;
  Object.assign(hotel, { stayCount: count(executions, "hotel"), checkInCount: movements?.checkins ?? 0, checkOutCount: movements?.checkouts ?? 0, capacity: sum(occupancy, (r) => r.hotel_capacity), occupied: sum(occupancy, (r) => r.hotel_occupied) });
  hotel.available = Math.max(0, hotel.capacity - hotel.occupied); hotel.occupancyRate = hotel.capacity ? hotel.occupied * 100 / hotel.capacity : 0;
  Object.assign(daycare, { enabled: branches.some((b) => JSON.parse(b.modules).includes("daycare")) || count(bookings, "daycare") > 0 || k.completedDaycare > 0, bookingCount: count(bookings, "daycare"), attendanceCount: count(executions, "daycare"), activeCount: count(executions, "daycare", ["checked-in", "active"]), readyForPickupCount: count(executions, "daycare", ["ready-for-pickup"]), completedCount: k.completedDaycare, capacity: sum(occupancy, (r) => r.daycare_capacity), occupied: sum(occupancy, (r) => r.daycare_occupied) }); daycare.available = Math.max(0, daycare.capacity - daycare.occupied);
  const day = result[9][0] as { day: string; n: number } | undefined, slot = result[10][0] as { slot: string; n: number } | undefined;
  report.operationalInsights = { busiestDay: { dayName: day ? ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"][Number(day.day)] : "—", count: day?.n ?? 0 }, peakAppointmentTime: { timeSlot: slot?.slot ?? "—", count: slot?.n ?? 0 }, hotelOccupancyRate: hotel.occupancyRate, cancellations: { totalCancelledBookings: k.cancelledBookings, cancellationRate: k.totalBookings ? k.cancelledBookings * 100 / k.totalBookings : 0, noShowStays: count(executions, "hotel", ["no-show"]), cancelledJobs: count(executions, "grooming", ["cancelled"]) }, workStatus: { completed: k.completedServices, pendingOrInProgress: sum(executions.filter((r) => !["completed", "checked-out", "cancelled", "no-show"].includes(r.status)), (r) => r.n), delayedOrAttention: (result[11][0] as { n: number }).n } };
  report.customerInsights = { newCustomers: k.newCustomers, returningCustomers: k.returningCustomers,
    topCustomers: [...customers].sort((a, b) => b.visits - a.visits || b.spent - a.spent || a.id.localeCompare(b.id)).slice(0, 10).map((c) => ({ customerId: c.id, customerName: c.display_name, petNames: JSON.parse(c.pets), visitCount: c.visits, totalSpent: c.spent / 100 })),
    recentServices: (result[13] as { id: string; branch_id: string; module: BusinessServiceModule; completed_at: string; snapshot_json: string; display_name: string; pet_name: string; branch_name: string; status: string; amount: number; payment_status: ReportRecentServiceItem["paymentStatus"] }[]).map((r) => { const timezone = scope.branches.find((b) => b.id === r.branch_id)!.timezone; return { id: r.id, date: dateInZone(r.completed_at, timezone), time: new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(r.completed_at)), customerName: r.display_name, petName: r.pet_name, serviceLabel: JSON.parse(r.snapshot_json).serviceLabel, module: r.module, branchId: r.branch_id, branchName: r.branch_name, statusLabel: statuses[r.status] ?? "เสร็จแล้ว", statusCode: "completed", amount: r.amount / 100, paymentStatus: r.payment_status }; }) };
  report.branchComparison = branches.map((b) => ({ branchId: b.id, branchName: b.name, bookingCount: count(bookings.filter((r) => r.branch_id === b.id)), completedCount: count(records.filter((r) => r.branch_id === b.id)), revenue: sum(money.filter((r) => r.branch_id === b.id), (r) => r.received - r.refunded) / 100, enabledModules: JSON.parse(b.modules) }));
  report.revenueSummary = { revenueToday: k.revenue, paymentCountToday: k.paymentCount, unpaidBalance: k.unpaidBalance, unpaidCount: k.unpaidCount, partialCount: k.partialCount, breakdown: moduleMoney.map((r) => ({ module: r.module, revenue: r.amount / 100, paymentCount: r.n })) };
  return report;
}
