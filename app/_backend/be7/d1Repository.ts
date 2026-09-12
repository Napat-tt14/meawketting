import type { AuthorizedMutation, D1DatabaseLike, D1PreparedStatementLike } from "../be1/repository";
import { be1Error } from "../be1/errors";
import { authorizationGuard, auditStatement, batch, deleteGuard, receiptStatement, type MutationReceipt } from "../shared/database";
import { opaqueId } from "../shared/validation";
import type { AttemptView, ChargeBalanceView, ChargeView, FinancialPage, PaymentPage, PaymentView, ProviderAccount, RefundView } from "./contracts";

export type ChargeRow = { id: string; business_id: string; branch_id: string; booking_id: string; customer_id: string; pet_id: string | null; execution_id: string | null; module: ChargeView["serviceModule"]; service_label: string; cancelled_at: string | null; cancellation_reason: string | null; revision: number; created_at: string; updated_at: string };
type AmountRow = ChargeRow & { total_minor: number; paid_minor: number; refunded_minor: number; reserved_minor: number; payment_count: number };
type ItemRow = { id: string; charge_id: string; kind: ChargeView["lineItems"][number]["kind"]; label: string; amount_minor: number; reason: string | null; source_event_id: string | null; execution_id: string | null; created_at: string };
type EventRow = { id: string; charge_id: string; kind: ChargeView["history"][number]["type"]; summary: string; occurred_at: string };
export type PaymentRow = { id: string; business_id: string; branch_id: string; customer_id: string; method: PaymentView["method"]; amount_minor: number; source: PaymentView["source"]; note: string; occurred_at: string; recorded_at: string; recorded_by: string };

// Totals are correlated, indexed reads of canonical rows, never writable columns.
export const AMOUNTS = `SELECT c.*,
  coalesce((SELECT sum(i.amount_minor) FROM charge_items i WHERE i.business_id=c.business_id AND i.branch_id=c.branch_id AND i.charge_id=c.id),0) total_minor,
  coalesce((SELECT sum(a.amount_minor) FROM payment_allocations a WHERE a.business_id=c.business_id AND a.branch_id=c.branch_id AND a.charge_id=c.id),0) paid_minor,
  coalesce((SELECT sum(r.amount_minor) FROM refund_allocations r WHERE r.business_id=c.business_id AND r.branch_id=c.branch_id AND r.charge_id=c.id),0) refunded_minor,
  coalesce((SELECT sum(t.amount_minor) FROM payment_attempts t WHERE t.business_id=c.business_id AND t.branch_id=c.branch_id AND t.charge_id=c.id AND t.state IN ('created','pending','retry','reconciliation')),0) reserved_minor,
  (SELECT count(*) FROM payment_allocations a WHERE a.business_id=c.business_id AND a.branch_id=c.branch_id AND a.charge_id=c.id) payment_count FROM charges c`;

export class D1Be7Repository {
  constructor(readonly database: D1DatabaseLike, readonly mode: "dev-test" | "verified-provider" = "verified-provider") {}
  async rows<T>(sql: string, ...values: unknown[]): Promise<T[]> {
    const result = await this.database.prepare(sql).bind(...values).all<T>(); if (result.success === false) throw be1Error("PERSISTENCE_ERROR"); return result.results ?? [];
  }
  visible(alias: string) { return `EXISTS(SELECT 1 FROM persons p JOIN business_memberships m ON m.person_id=p.id JOIN businesses b ON b.id=m.business_id WHERE p.id=? AND p.status='active' AND m.id=? AND m.business_id=${alias}.business_id AND m.status='active' AND b.status='active' AND (m.role='OWNER' OR EXISTS(SELECT 1 FROM membership_branch_access a WHERE a.business_id=m.business_id AND a.membership_id=m.id AND a.branch_id=${alias}.branch_id AND a.status='active')))`; }
  bindings(c: AuthorizedMutation) { return [c.actor.id, c.membership.id]; }
  async row(businessId: string, branchId: string, id: string) { return this.database.prepare("SELECT * FROM charges WHERE business_id=? AND branch_id=? AND id=?").bind(businessId, branchId, id).first<ChargeRow>(); }
  async forBooking(businessId: string, branchId: string, id: string) { return this.database.prepare("SELECT * FROM charges WHERE business_id=? AND branch_id=? AND booking_id=?").bind(businessId, branchId, id).first<ChargeRow>(); }
  async get(context: AuthorizedMutation, branchId: string, id: string) {
    const rows = await this.rows<AmountRow>(`${AMOUNTS} WHERE c.business_id=? AND c.branch_id=? AND c.id=? AND ${this.visible("c")}`, context.membership.businessId, branchId, id, ...this.bindings(context));
    if (!rows.length) throw be1Error("NOT_FOUND"); return (await this.hydrate(rows, context))[0];
  }
  async list(context: AuthorizedMutation, branchId: string, afterId: string, limit: number, customerId?: string): Promise<FinancialPage> {
    const rows = await this.rows<AmountRow>(`${AMOUNTS} WHERE c.business_id=? AND c.branch_id=? AND c.id>? AND (? IS NULL OR c.customer_id=?) AND ${this.visible("c")} ORDER BY c.id LIMIT ?`, context.membership.businessId, branchId, afterId, customerId ?? null, customerId ?? null, ...this.bindings(context), limit + 1);
    return { balances: await this.hydrate(rows.slice(0, limit), context), nextAfterId: rows.length > limit ? rows[limit - 1].id : null };
  }
  private async hydrate(rows: AmountRow[], context: AuthorizedMutation): Promise<ChargeBalanceView[]> {
    if (!rows.length) return [];
    const ids = JSON.stringify(rows.map((r) => r.id)), bindings = [rows[0].business_id, rows[0].branch_id, ids], scope = "business_id=? AND branch_id=? AND charge_id IN (SELECT value FROM json_each(?))";
    const snapshot = await batch(this.database, [
      this.database.prepare(`${AMOUNTS} WHERE c.business_id=? AND c.branch_id=? AND c.id IN (SELECT value FROM json_each(?)) AND ${this.visible("c")} ORDER BY c.id`).bind(...bindings, ...this.bindings(context)),
      this.database.prepare(`SELECT * FROM charge_items WHERE ${scope} ORDER BY created_at,rowid`).bind(...bindings),
      this.database.prepare(`SELECT * FROM charge_events WHERE ${scope} ORDER BY occurred_at,rowid`).bind(...bindings),
      this.database.prepare(`SELECT * FROM payment_attempts WHERE ${scope} ORDER BY created_at,id`).bind(...bindings),
    ]);
    rows = (snapshot[0].results ?? []) as AmountRow[];
    if (!rows.length) throw be1Error("FORBIDDEN");
    const items = (snapshot[1].results ?? []) as ItemRow[], events = (snapshot[2].results ?? []) as EventRow[];
    const attempts = (snapshot[3].results ?? []) as { id: string; charge_id: string; amount_minor: number; state: AttemptView["state"]; attempts: number; failure_code: string | null; revision: number; created_at: string; updated_at: string }[];
    return rows.map((r) => {
      const total = r.total_minor / 100, paid = (r.paid_minor - r.refunded_minor) / 100, reserved = r.reserved_minor / 100, remaining = r.cancelled_at ? 0 : total - paid;
      const source = (id: string | null) => ({ serviceJobId: r.module === "grooming" ? id : null, hotelStayId: r.module === "hotel" ? id : null, daycareAttendanceId: r.module === "daycare" ? id : null });
      return { charge: { chargeId: r.id, businessId: r.business_id, branchId: r.branch_id, bookingId: r.booking_id, customerId: r.customer_id, petId: r.pet_id, ...source(r.execution_id), serviceModule: r.module, serviceLabel: r.service_label,
        lineItems: items.filter((i) => i.charge_id === r.id).map((i) => ({ id: i.id, kind: i.kind, label: i.label, amount: i.amount_minor / 100, reason: i.reason, sourceRequestId: i.source_event_id, ...source(i.execution_id), createdAt: i.created_at })),
        history: events.filter((e) => e.charge_id === r.id).map((e) => ({ id: e.id, type: e.kind, summary: e.summary, at: e.occurred_at })), cancelledAt: r.cancelled_at, cancellationReason: r.cancellation_reason, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at },
        total, paid, remaining, status: r.cancelled_at ? "cancelled" : remaining === 0 ? "paid" : paid > 0 ? "partial" : "unpaid", paymentCount: r.payment_count, refunded: r.refunded_minor / 100, reserved, availableToCollect: Math.max(0, remaining - reserved),
        attempts: attempts.filter((a) => a.charge_id === r.id).map((a) => ({ attemptId: a.id, chargeId: a.charge_id, amount: a.amount_minor / 100, state: a.state, attempts: a.attempts, failureCode: a.failure_code, revision: a.revision, createdAt: a.created_at, updatedAt: a.updated_at })) };
    });
  }
  async payment(context: AuthorizedMutation, branchId: string, id: string) {
    const row = await this.database.prepare(`SELECT p.* FROM payments p WHERE p.business_id=? AND p.branch_id=? AND p.id=? AND ${this.visible("p")}`).bind(context.membership.businessId, branchId, id, ...this.bindings(context)).first<PaymentRow>();
    if (!row) throw be1Error("NOT_FOUND"); return row;
  }
  async paymentPage(context: AuthorizedMutation, branchId: string, afterId: string, limit: number, customerId?: string): Promise<PaymentPage> {
    const rows = await this.rows<PaymentRow>(`SELECT p.* FROM payments p WHERE p.business_id=? AND p.branch_id=? AND p.id>? AND (? IS NULL OR p.customer_id=?) AND ${this.visible("p")} ORDER BY p.id LIMIT ?`, context.membership.businessId, branchId, afterId, customerId ?? null, customerId ?? null, ...this.bindings(context), limit + 1);
    const page = rows.slice(0, limit), args = [context.membership.businessId, branchId, JSON.stringify(page.map((p) => p.id))], scope = "business_id=? AND branch_id=? AND payment_id IN (SELECT value FROM json_each(?))";
    const snapshot = await batch(this.database, [
      this.database.prepare(`SELECT p.id FROM payments p WHERE p.business_id=? AND p.branch_id=? AND p.id IN (SELECT value FROM json_each(?)) AND ${this.visible("p")}`).bind(...args, ...this.bindings(context)),
      this.database.prepare(`SELECT * FROM payment_allocations WHERE ${scope}`).bind(...args),
      this.database.prepare(`SELECT * FROM payment_refunds WHERE ${scope} ORDER BY recorded_at,id`).bind(...args),
      this.database.prepare(`SELECT * FROM refund_allocations WHERE ${scope}`).bind(...args),
    ]);
    if (snapshot[0].results?.length !== page.length) throw be1Error("FORBIDDEN");
    const allocations = (snapshot[1].results ?? []) as { payment_id: string; charge_id: string; amount_minor: number }[];
    const refunds = (snapshot[2].results ?? []) as { id: string; business_id: string; branch_id: string; payment_id: string; amount_minor: number; reason: string; recorded_at: string }[];
    const refundLinks = (snapshot[3].results ?? []) as { refund_id: string; charge_id: string; amount_minor: number }[];
    const values: RefundView[] = refunds.map((r) => ({ refundId: r.id, businessId: r.business_id, branchId: r.branch_id, paymentId: r.payment_id, amount: r.amount_minor / 100, reason: r.reason, recordedAt: r.recorded_at, allocations: refundLinks.filter((a) => a.refund_id === r.id).map((a) => ({ chargeId: a.charge_id, amount: a.amount_minor / 100 })) }));
    return { payments: page.map((p) => {
      const links = allocations.filter((a) => a.payment_id === p.id), refunded = values.filter((r) => r.paymentId === p.id).reduce((s, r) => s + r.amount, 0), amount = p.amount_minor / 100;
      return { paymentId: p.id, businessId: p.business_id, branchId: p.branch_id, customerId: p.customer_id, method: p.method, source: p.source, amount, refunded, unallocated: amount - links.reduce((s, a) => s + a.amount_minor / 100, 0), status: refunded === amount ? "refunded" : refunded ? "partial-refunded" : "recorded",
        allocations: links.map((a) => ({ chargeId: a.charge_id, amount: a.amount_minor / 100 })), note: p.note, requestKey: p.id, recordedAt: p.occurred_at };
    }), refunds: values, nextAfterId: rows.length > limit ? page.at(-1)!.id : null };
  }
  async account(businessId: string, id: string): Promise<ProviderAccount | null> {
    const r = await this.database.prepare("SELECT * FROM payment_provider_accounts WHERE business_id=? AND id=? AND status='active' AND (source='verified-provider' OR ?='dev-test')").bind(businessId, id, this.mode).first<{ id: string; business_id: string; provider: string; external_account_id: string; secret_ref: string; source: ProviderAccount["source"]; revision: number }>();
    return r ? { id: r.id, businessId: r.business_id, provider: r.provider, externalAccountId: r.external_account_id, secretRef: r.secret_ref, source: r.source, revision: r.revision } : null;
  }
  version(charge: ChargeView, now: string, token: string) {
    return [this.database.prepare("UPDATE charges SET revision=revision+1,updated_at=? WHERE business_id=? AND branch_id=? AND id=? AND revision=?").bind(now, charge.businessId, charge.branchId, charge.chargeId, charge.revision),
      this.database.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,changes()=1").bind(token), deleteGuard(this.database, token)];
  }
  event(context: AuthorizedMutation, branchId: string, chargeId: string, kind: EventRow["kind"], summary: string) {
    return this.database.prepare("INSERT INTO charge_events(id,business_id,branch_id,charge_id,kind,summary,actor_person_id,occurred_at) VALUES(?,?,?,?,?,?,?,?)").bind(opaqueId("che"), context.membership.businessId, branchId, chargeId, kind, summary, context.actor.id, context.occurredAt);
  }
  async write(context: AuthorizedMutation, branchId: string, receipt: MutationReceipt, statements: D1PreparedStatementLike[], privileged = false) {
    const db = this.database, token = opaqueId("finance"), guards = [authorizationGuard(db, context, branchId, token)];
    if (privileged) guards.push(db.prepare("INSERT INTO backend_guards(id,allowed) SELECT ?,EXISTS(SELECT 1 FROM business_memberships WHERE id=? AND business_id=? AND person_id=? AND status='active' AND role IN ('OWNER','MANAGER'))").bind(`${token}-role`, context.membership.id, context.membership.businessId, context.actor.id));
    await batch(db, [...guards, ...statements, receiptStatement(db, context, branchId, receipt), auditStatement(db, context, branchId, receipt.command, "charge", receipt.targetId, null, { command: receipt.command }), deleteGuard(db, token), ...(privileged ? [deleteGuard(db, `${token}-role`)] : [])]);
  }
}
