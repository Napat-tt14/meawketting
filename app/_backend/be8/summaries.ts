import type { Database } from "../be1/repository";
import type { BillingSummary, HomeSummary } from "./contracts";
import { ProjectionSnapshot, type ProjectionScope } from "./snapshot";
import { PostgresBe6Repository } from "../be6/postgresRepository";

// These are the same canonical money calculations as Reports, in one authorized snapshot.
const financialQueries = [
  { sql: `SELECT coalesce((SELECT sum(amount_minor) FROM period_payments),0)-coalesce((SELECT sum(amount_minor) FROM period_refunds),0) revenue,
      (SELECT count(*) FROM period_payments) payments` },
  { sql: `SELECT coalesce(sum(CASE WHEN cancelled_at IS NULL THEN total_minor-paid_minor+refunded_minor ELSE 0 END),0) remaining,
      coalesce(sum((cancelled_at IS NULL AND total_minor>paid_minor-refunded_minor AND paid_minor-refunded_minor=0)::integer),0) unpaid,
      coalesce(sum((cancelled_at IS NULL AND total_minor>paid_minor-refunded_minor AND paid_minor-refunded_minor>0)::integer),0) partial FROM balances` },
  { sql: `SELECT module,sum(amount) amount,count(DISTINCT payment_id) n FROM (
      SELECT c.module,l.amount_minor amount,p.id payment_id FROM period_payments p JOIN payment_allocations l ON l.business_id=p.business_id AND l.branch_id=p.branch_id AND l.payment_id=p.id JOIN balances c ON c.id=l.charge_id
      UNION ALL SELECT c.module,-l.amount_minor,NULL FROM period_refunds r JOIN refund_allocations l ON l.business_id=r.business_id AND l.branch_id=r.branch_id AND l.refund_id=r.id JOIN balances c ON c.id=l.charge_id) GROUP BY module` },
];

export async function projectSummary(db: Database, scope: ProjectionScope, home: boolean): Promise<BillingSummary | HomeSummary> {
  const result = await new ProjectionSnapshot(db, scope).read([...financialQueries, ...(home ? [
    { sql: `SELECT jsonb_build_object('id',b.id,'businessId',b.business_id,'branchId',b.branch_id,'customerId',b.customer_id,'customerName',c.display_name,
        'serviceId',b.service_id,'serviceLabel',s.label,'serviceModule',b.service_module,'timeModel',b.time_model,'start',b.start_local,'end',b.end_local,
        'status',b.status,
        'pets',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.pet_id,'name',p.name,'species',p.species) ORDER BY x.position,x.pet_id) FROM booking_pets x JOIN business_pet_profiles p ON p.business_id=x.business_id AND p.pet_id=x.pet_id WHERE x.business_id=b.business_id AND x.branch_id=b.branch_id AND x.booking_id=b.id),'[]')) value
      FROM period_bookings b JOIN customers c ON c.business_id=b.business_id AND c.id=b.customer_id
      JOIN booking_services s ON s.business_id=b.business_id AND s.branch_id=b.branch_id AND s.id=b.service_id WHERE b.status<>'cancelled' ORDER BY b.start_minute,b.id` },
    { sql: `, home_executions AS (
        SELECT e.*,a.today,
          EXISTS(SELECT 1 FROM execution_assignments x WHERE x.business_id=e.business_id AND x.branch_id=e.branch_id AND x.execution_id=e.id AND x.space_id IS NOT NULL
            AND ((x.start_local<=a.today AND x.end_local>a.today) OR (e.status='ready-for-checkout' AND e.scheduled_end=a.today))) assigned,
          e.status IN ('checked-in','in-stay','ready-for-checkout') AND e.scheduled_start<=a.today AND e.scheduled_end>=a.today current
        FROM scoped_executions e JOIN allowed a ON a.id=e.branch_id
      ), hotel_open AS (SELECT * FROM home_executions WHERE module='hotel' AND status NOT IN ('checked-out','completed','cancelled','no-show'))
      SELECT
        (SELECT count(*) FROM period_executions WHERE status IN ('booked','expected-today')) waiting,
        (SELECT count(*) FROM home_executions WHERE module='grooming' AND substr(scheduled_start,1,10)=today AND status<>'cancelled') grooming_total,
        (SELECT count(*) FROM home_executions WHERE module='grooming' AND substr(scheduled_start,1,10)=today AND status='ready-for-pickup') grooming_ready,
        (SELECT count(*) FROM hotel_open WHERE current AND assigned) hotel_occupied,
        (SELECT count(*) FROM hotel_open WHERE status IN ('booked','expected-today') AND scheduled_start<=today AND scheduled_end>today AND assigned) hotel_reserved,
        (SELECT coalesce(sum(h.capacity),0) FROM hotel_spaces h JOIN allowed a ON a.business_id=h.business_id AND a.id=h.branch_id WHERE h.status='active') hotel_capacity,
        (SELECT count(*) FROM hotel_open WHERE status='ready-for-checkout') hotel_ready,
        (SELECT count(*) FROM hotel_open WHERE scheduled_start=today AND NOT assigned) unassigned,
        (SELECT count(*) FROM home_executions WHERE module='hotel' AND status NOT IN ('cancelled','no-show') AND scheduled_end=today) departures,
        (SELECT count(*) FROM hotel_open WHERE (scheduled_end=today AND status<>'checked-out') OR (status='ready-for-checkout' AND scheduled_end<>today)) actionable,
        (SELECT count(*) FROM execution_care_tasks t JOIN hotel_open e ON e.business_id=t.business_id AND e.branch_id=t.branch_id AND e.id=t.execution_id WHERE e.current AND t.scheduled_date=e.today AND t.completed_at IS NULL) care,
        (SELECT count(*) FROM execution_events v JOIN hotel_open e ON e.business_id=v.business_id AND e.branch_id=v.branch_id AND e.id=v.execution_id WHERE e.current AND v.kind='incident' AND (v.data_json::jsonb->>'severity')='attention' AND (v.data_json::jsonb->>'resolvedAt') IS NULL
          AND NOT EXISTS(SELECT 1 FROM execution_events r WHERE r.business_id=v.business_id AND r.branch_id=v.branch_id AND r.execution_id=v.execution_id AND r.kind='incident-resolved' AND (r.data_json::jsonb->>'id')=(v.data_json::jsonb->>'id'))) incidents,
        (SELECT count(*) FROM home_executions WHERE module='daycare' AND scheduled_start=today AND status='booked') daycare_booked,
        (SELECT count(*) FROM home_executions WHERE module='daycare' AND scheduled_start=today AND status='ready-for-pickup') daycare_ready,
        (SELECT count(*) FROM home_executions e WHERE module='daycare' AND scheduled_start=today AND status IN ('checked-in','active','ready-for-pickup')) daycare_occupied,
        (SELECT coalesce(sum(r.capacity),0) FROM booking_resources r JOIN allowed a ON a.business_id=r.business_id AND a.id=r.branch_id WHERE r.module='daycare' AND r.kind='daycare-zone' AND r.status='active') daycare_capacity,
        (SELECT count(*) FROM execution_events v JOIN home_executions e ON e.business_id=v.business_id AND e.branch_id=v.branch_id AND e.id=v.execution_id WHERE e.module='daycare' AND e.scheduled_start=e.today AND v.kind='daycare-care') daycare_care` },
    { sql: `SELECT count(*) n FROM messages m WHERE m.business_id=(SELECT business_id FROM allowed LIMIT 1) AND m.direction='customer'
      AND ${new PostgresBe6Repository(db).visibility("m")}
      AND m.sequence>coalesce((SELECT r.through_sequence FROM conversation_reads r WHERE r.business_id=m.business_id AND r.branch_id=m.branch_id AND r.conversation_id=m.conversation_id AND r.person_id=(SELECT input::jsonb->>'personId' FROM q)),0)`, values: [scope.context.actor.id, scope.context.membership.id] },
    { sql: `SELECT (a.today::date-days.n)::text date,count(b.id) count FROM allowed a CROSS JOIN generate_series(0,6) days(n)
      LEFT JOIN scoped_bookings b ON b.branch_id=a.id AND b.status<>'cancelled'
        AND EXISTS(SELECT 1 FROM branch_enabled_modules m WHERE m.business_id=b.business_id AND m.branch_id=b.branch_id AND m.module=b.service_module)
        AND CASE WHEN b.time_model='date-range' THEN b.start_local<=(a.today::date-days.n)::text AND b.end_local>(a.today::date-days.n)::text ELSE substr(b.start_local,1,10)=(a.today::date-days.n)::text END
      GROUP BY a.today,days.n ORDER BY date` },
  ] : [])]);
  const money = result[0][0] as { revenue: number; payments: number }, balance = result[1][0] as { remaining: number; unpaid: number; partial: number };
  const summary: BillingSummary = { generatedAt: scope.now, revenueSummary: { revenueToday: money.revenue / 100, paymentCountToday: money.payments,
    unpaidBalance: balance.remaining / 100, unpaidCount: balance.unpaid, partialCount: balance.partial,
    breakdown: (result[2] as { module: "grooming" | "hotel" | "daycare"; amount: number; n: number }[]).map(row => ({ module: row.module, revenue: row.amount / 100, paymentCount: row.n })) } };
  if (!home) return summary;
  const counts = result[4][0] as Record<string, number>;
  return { ...summary, waitingIntake: counts.waiting, unreadMessages: (result[5][0] as { n: number }).n, bookingTrend: result[6] as HomeSummary["bookingTrend"],
    bookings: (result[3] as { value: HomeSummary["bookings"][number] }[]).map(row => row.value),
    grooming: { total: counts.grooming_total, readyForPickup: counts.grooming_ready },
    hotel: { occupied: counts.hotel_occupied, reserved: counts.hotel_reserved, capacity: counts.hotel_capacity,
      available: Math.max(0, counts.hotel_capacity - counts.hotel_occupied - counts.hotel_reserved), readyForPickup: counts.hotel_ready,
      attention: counts.unassigned + counts.actionable + counts.care + counts.incidents, unassignedArrivals: counts.unassigned, careDue: counts.care, departures: counts.departures },
    daycare: { booked: counts.daycare_booked, readyForPickup: counts.daycare_ready, occupied: counts.daycare_occupied, capacity: counts.daycare_capacity,
      available: Math.max(0, counts.daycare_capacity - counts.daycare_occupied), careEvents: counts.daycare_care } };
}
