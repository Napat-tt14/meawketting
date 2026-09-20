import type { BranchView } from "../be1/contracts";
import type { AuthorizedMutation, Database } from "../be1/repository";
import { be1Error } from "../be1/errors";
import { batch } from "../shared/database";
import { addDays, dateInZone, utcDayStart } from "../shared/time";
import { AMOUNTS } from "../be7/postgresRepository";

export type ProjectionScope = { context: AuthorizedMutation; branches: BranchView[]; now: string; startDate: string; endDate: string };
/** Every SELECT repeats authorization inside one serializable transaction. No writable projections. */
export class ProjectionSnapshot {
  readonly input: string;
  constructor(private readonly db: Database, private readonly scope: ProjectionScope) {
    this.input = JSON.stringify({ personId: scope.context.actor.id, membershipId: scope.context.membership.id, businessId: scope.context.membership.businessId, startDate: scope.startDate, endDate: scope.endDate, untilDate: addDays(scope.endDate, 1), branches: scope.branches.map((b) => ({ id: b.id, timezone: b.timezone, updatedAt: b.updatedAt, since: utcDayStart(scope.startDate, b.timezone), until: utcDayStart(addDays(scope.endDate, 1), b.timezone), today: dateInZone(scope.now, b.timezone) })) });
  }
  readonly cte = `WITH q AS (SELECT ? input), allowed AS (
    SELECT br.*,b.name business_name,((x.value)::jsonb->>'since') since,((x.value)::jsonb->>'until') until,((x.value)::jsonb->>'today') today,
      ((q.input)::jsonb->>'startDate') start_day,((q.input)::jsonb->>'endDate') end_day,((q.input)::jsonb->>'untilDate') until_day
    FROM q CROSS JOIN LATERAL jsonb_array_elements_text((q.input)::jsonb->'branches') x(value) JOIN branches br ON br.id=((x.value)::jsonb->>'id')
      JOIN businesses b ON b.id=br.business_id JOIN business_memberships m ON m.business_id=b.id JOIN persons p ON p.id=m.person_id
    WHERE b.id=((q.input)::jsonb->>'businessId') AND b.status='active' AND p.id=((q.input)::jsonb->>'personId') AND p.status='active'
      AND m.id=((q.input)::jsonb->>'membershipId') AND m.status='active'
      AND br.timezone=((x.value)::jsonb->>'timezone') AND br.updated_at=((x.value)::jsonb->>'updatedAt')
      AND (m.role='OWNER' OR (br.status='active' AND EXISTS(SELECT 1 FROM membership_branch_access g WHERE g.business_id=m.business_id AND g.membership_id=m.id AND g.branch_id=br.id AND g.status='active')))
  ), scoped_bookings AS (SELECT b.* FROM bookings b JOIN allowed a ON a.business_id=b.business_id AND a.id=b.branch_id),
  period_bookings AS (SELECT b.* FROM scoped_bookings b JOIN allowed a ON a.id=b.branch_id WHERE b.start_local<a.until_day AND (CASE WHEN b.time_model='date-range' THEN b.end_local>a.start_day ELSE substr(coalesce(b.end_local,b.start_local),1,10)>=a.start_day END)),
  scoped_records AS (SELECT r.*,e.booking_id,e.module FROM service_records r JOIN allowed a ON a.business_id=r.business_id AND a.id=r.branch_id JOIN service_executions e ON e.business_id=r.business_id AND e.branch_id=r.branch_id AND e.id=r.execution_id),
  period_records AS (SELECT r.* FROM scoped_records r JOIN allowed a ON a.id=r.branch_id WHERE r.completed_at>=a.since AND r.completed_at<a.until),
  scoped_payments AS (SELECT p.* FROM payments p JOIN allowed a ON a.business_id=p.business_id AND a.id=p.branch_id),
  period_payments AS (SELECT p.* FROM scoped_payments p JOIN allowed a ON a.id=p.branch_id WHERE p.occurred_at>=a.since AND p.occurred_at<a.until),
  scoped_refunds AS (SELECT r.*,p.customer_id FROM payment_refunds r JOIN scoped_payments p ON p.id=r.payment_id AND p.business_id=r.business_id AND p.branch_id=r.branch_id),
  period_refunds AS (SELECT r.* FROM scoped_refunds r JOIN allowed a ON a.id=r.branch_id WHERE r.recorded_at>=a.since AND r.recorded_at<a.until),
  balances AS (${AMOUNTS} JOIN allowed a ON a.business_id=c.business_id AND a.id=c.branch_id),
  scoped_executions AS (SELECT e.* FROM service_executions e JOIN allowed a ON a.business_id=e.business_id AND a.id=e.branch_id),
  period_executions AS (SELECT e.* FROM scoped_executions e JOIN allowed a ON a.id=e.branch_id WHERE e.scheduled_start<a.until_day AND substr(coalesce(e.scheduled_end,e.scheduled_start),1,10)>=a.start_day)
  `;
  async read(queries: { sql: string; values?: unknown[] }[]) {
    const result = await batch(this.db, [{ sql: "SELECT id FROM allowed" }, ...queries].map((q) => this.db.prepare(`${this.cte} ${q.sql}`).bind(this.input, ...("values" in q ? q.values ?? [] : []))));
    const visible = result[0].results as { id: string }[];
    if (visible.length !== this.scope.branches.length || this.scope.branches.some((b) => !visible.some((v) => v.id === b.id))) throw be1Error("FORBIDDEN");
    return result.slice(1).map((r) => r.results ?? []);
  }
}
