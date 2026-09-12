import type { PersonView } from "../be1/contracts";
import type { RequestMetadata } from "../be1/metadata";
import type { Be1Repository, D1PreparedStatementLike } from "../be1/repository";
import { be1Error } from "../be1/errors";
import { BusinessApplication } from "../shared/application";
import { findReceipt } from "../shared/database";
import { BackendConflict, conflict } from "../shared/errors";
import { hash, opaqueId } from "../shared/validation";
import type { Be7Operation, BillingMutationResult, ChargeBalanceView, FinancialPage, PaymentPage, PaymentProviderResolver } from "./contracts";
import { D1Be7Repository } from "./d1Repository";
import { parseBe7Operation } from "./validation";

export class Be7Application extends BusinessApplication {
  constructor(auth: Be1Repository, private readonly billing: D1Be7Repository, private readonly resolveProvider: PaymentProviderResolver = async () => null, private readonly clock = () => new Date().toISOString()) { super(auth); }
  executeBe7(actor: PersonView, raw: Be7Operation, metadata: RequestMetadata): Promise<FinancialPage | PaymentPage | ChargeBalanceView | BillingMutationResult> { return this.executeAttempt(actor, raw, metadata, 0); }
  private async executeAttempt(actor: PersonView, raw: Be7Operation, metadata: RequestMetadata, attempt: number): Promise<FinancialPage | PaymentPage | ChargeBalanceView | BillingMutationResult> {
    const op = parseBe7Operation(raw), repo = this.billing, db = repo.database, now = this.clock();
    const context = await this.scope(actor, op.businessId, op.branchId, metadata, now, !["charges.list", "payments.list", "charge.get"].includes(op.type));
    if (op.type === "charges.list") return repo.list(context, op.branchId, op.afterId ?? "", op.limit ?? 50, op.customerId);
    if (op.type === "payments.list") return repo.paymentPage(context, op.branchId, op.afterId ?? "", op.limit ?? 50, op.customerId);
    if (op.type === "charge.get") return repo.get(context, op.branchId, op.chargeId);
    const privileged = ["charge.adjust", "charge.cancel", "refund.record"].includes(op.type);
    if (privileged && !["OWNER", "MANAGER"].includes(context.membership.role)) throw be1Error("FORBIDDEN");
    const digest = await hash({ actorId: actor.id, op }), replay = async (): Promise<BillingMutationResult | null> => {
      const receipt = await findReceipt(db, op.businessId, op.type, op.requestKey); if (!receipt) return null;
      if (receipt.requestHash !== digest || receipt.branchId !== op.branchId) conflict("idempotency");
      return { balance: await repo.get(context, op.branchId, receipt.targetId), created: false, reconciled: false, replayed: true };
    };
    const previous = await replay(); if (previous) return previous;
    let chargeId: string, created = false, reconciled = false;
    const statements: D1PreparedStatementLike[] = [], token = opaqueId("chargecas");
    try {
      if (op.type === "charge.checkout") {
        const source = await db.prepare(`SELECT e.id,e.pet_id,e.module,e.status,b.id booking_id,b.customer_id,b.status booking_status,b.estimate,b.revision booking_revision,s.label,
          (SELECT count(*) FROM booking_pets p WHERE p.business_id=b.business_id AND p.branch_id=b.branch_id AND p.booking_id=b.id) pet_count
          FROM service_executions e JOIN bookings b ON b.business_id=e.business_id AND b.branch_id=e.branch_id AND b.id=e.booking_id
          JOIN booking_services s ON s.business_id=b.business_id AND s.branch_id=b.branch_id AND s.id=b.service_id WHERE e.business_id=? AND e.branch_id=? AND e.id=?`)
          .bind(op.businessId, op.branchId, op.executionId).first<{ id: string; pet_id: string; module: string; status: string; booking_id: string; customer_id: string; booking_status: string; estimate: number | null; booking_revision: number; label: string; pet_count: number }>();
        if (!source) throw be1Error("NOT_FOUND");
        if (["cancelled", "no-show"].includes(source.status) || source.booking_status === "cancelled") conflict("unavailable");
        if (!Number.isSafeInteger(source.estimate) || source.estimate! < 0 || source.estimate! > 10000000) throw be1Error("INVALID_INPUT");
        const existing = await repo.forBooking(op.businessId, op.branchId, source.booking_id); chargeId = existing?.id ?? opaqueId("charge"); created = !existing;
        if (!existing) {
          statements.push(db.prepare("INSERT INTO charges(id,business_id,branch_id,booking_id,customer_id,pet_id,execution_id,module,service_label,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
            .bind(chargeId, op.businessId, op.branchId, source.booking_id, source.customer_id, source.pet_count === 1 ? source.pet_id : null, source.pet_count === 1 ? source.id : null, source.module, source.label, actor.id, now, now));
          statements.push(db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,EXISTS(SELECT 1 FROM bookings WHERE business_id=? AND branch_id=? AND id=? AND revision=? AND status<>'cancelled')").bind(token, op.businessId, op.branchId, source.booking_id, source.booking_revision), db.prepare("DELETE FROM backend_guards WHERE id=?").bind(token));
          statements.push(db.prepare("INSERT INTO charge_items(id,business_id,branch_id,charge_id,kind,label,amount_minor,execution_id,created_at) VALUES(?,?,?,?,'base-service',?,?,?,?)")
            .bind(opaqueId("item"), op.businessId, op.branchId, chargeId, source.label, source.estimate! * 100, source.pet_count === 1 ? source.id : null, now), repo.event(context, op.branchId, chargeId, "created", "สร้างยอดจากรายการบริการ"));
        }
        const addOns = source.module === "grooming" && !existing?.cancelled_at ? await repo.rows<{ id: string; summary: string; data_json: string }>(`SELECT e.id,e.summary,e.data_json FROM execution_events e WHERE e.business_id=? AND e.branch_id=? AND e.execution_id=? AND e.kind='addon' AND NOT EXISTS(SELECT 1 FROM charge_items i WHERE i.charge_id=? AND i.source_event_id=e.id) ORDER BY e.occurred_at,e.id`, op.businessId, op.branchId, source.id, chargeId) : [];
        if (existing && addOns.length) statements.push(...repo.version((await repo.get(context, op.branchId, existing.id)).charge, now, token));
        for (const e of addOns) {
          const value = JSON.parse(e.data_json) as { label: string; additionalPrice: number };
          if (!Number.isSafeInteger(value.additionalPrice) || value.additionalPrice < 0 || value.additionalPrice > 10000000) throw be1Error("INVALID_INPUT");
          statements.push(db.prepare("INSERT INTO charge_items(id,business_id,branch_id,charge_id,kind,label,amount_minor,reason,source_event_id,execution_id,created_at) VALUES(?,?,?,?,'add-on',?,?,'บริการเพิ่มเติมที่อนุมัติแล้ว',?,?,?)").bind(opaqueId("item"), op.businessId, op.branchId, chargeId, value.label, value.additionalPrice * 100, e.id, source.id, now));
        }
        reconciled = addOns.length > 0;
        if (reconciled) statements.push(repo.event(context, op.branchId, chargeId, "adjusted", "เพิ่มบริการเพิ่มเติมที่อนุมัติแล้วในยอด"));
      } else {
        chargeId = op.chargeId;
        const balance = await repo.get(context, op.branchId, chargeId), charge = balance.charge;
        if (charge.revision !== op.expectedRevision) conflict("version-conflict");
        if (charge.cancelledAt) conflict("cancelled");
        statements.push(...repo.version(charge, now, token));
        if (op.type === "charge.adjust") {
          const delta = (op.kind === "discount" ? -1 : 1) * op.amount;
          if (balance.total + delta < balance.paid + balance.reserved || balance.total + delta < 0) conflict("invalid-total");
          statements.push(db.prepare("INSERT INTO charge_items(id,business_id,branch_id,charge_id,kind,label,amount_minor,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(opaqueId("item"), op.businessId, op.branchId, chargeId, op.kind, op.label, delta * 100, op.reason, now), repo.event(context, op.branchId, chargeId, "adjusted", op.kind === "discount" ? "เพิ่มส่วนลดในยอด" : "ปรับยอดด้วยเหตุผล"));
        } else if (op.type === "charge.cancel") {
          // Even fully refunded payments remain financial history, not an unpaid cancellation.
          if (balance.paymentCount > 0 || balance.reserved > 0) conflict("has-payments");
          statements.push(db.prepare("UPDATE charges SET cancelled_at=?,cancellation_reason=? WHERE business_id=? AND branch_id=? AND id=?").bind(now, op.reason, op.businessId, op.branchId, chargeId), repo.event(context, op.branchId, chargeId, "cancelled", "ยกเลิกยอดพร้อมเหตุผล"));
        } else if (op.type === "refund.record") {
          const payment = await repo.payment(context, op.branchId, op.paymentId);
          if (payment.customer_id !== charge.customerId) throw be1Error("NOT_FOUND");
          const allocation = await db.prepare(`SELECT a.amount_minor-coalesce((SELECT sum(r.amount_minor) FROM refund_allocations r WHERE r.business_id=a.business_id AND r.branch_id=a.branch_id AND r.payment_id=a.payment_id AND r.charge_id=a.charge_id),0) remaining FROM payment_allocations a WHERE a.business_id=? AND a.branch_id=? AND a.payment_id=? AND a.charge_id=?`).bind(op.businessId, op.branchId, op.paymentId, chargeId).first<{ remaining: number }>();
          if (!allocation) throw be1Error("NOT_FOUND");
          if (op.amount * 100 > allocation.remaining) conflict("over-refund");
          const id = opaqueId("refund");
          statements.push(db.prepare("INSERT INTO payment_refunds(id,business_id,branch_id,payment_id,amount_minor,reason,recorded_by,recorded_at) VALUES(?,?,?,?,?,?,?,?)").bind(id, op.businessId, op.branchId, payment.id, op.amount * 100, op.reason, actor.id, now),
            db.prepare("INSERT INTO refund_allocations(business_id,branch_id,refund_id,payment_id,charge_id,amount_minor) VALUES(?,?,?,?,?,?)").bind(op.businessId, op.branchId, id, payment.id, chargeId, op.amount * 100));
        } else {
          if (op.amount > balance.availableToCollect) conflict("overpayment");
          if (op.type === "payment.record") {
            const id = opaqueId("payment");
            statements.push(db.prepare("INSERT INTO payments(id,business_id,branch_id,customer_id,amount_minor,method,source,note,recorded_by,recorded_at,occurred_at) VALUES(?,?,?,?,?,?,'manual',?,?,?,?)").bind(id, op.businessId, op.branchId, charge.customerId, op.amount * 100, op.method, op.note, actor.id, now, now),
              db.prepare("INSERT INTO payment_allocations(business_id,branch_id,payment_id,charge_id,amount_minor) VALUES(?,?,?,?,?)").bind(op.businessId, op.branchId, id, chargeId, op.amount * 100));
          } else {
            const account = await repo.account(op.businessId, op.accountId); if (!account) throw be1Error("NOT_FOUND");
            const provider = await this.resolveProvider(account); if (!provider || provider.provider !== account.provider) conflict("not-connected");
            // Creating an Attempt reserves collectible capacity; no provider call or money is asserted here.
            const id = opaqueId("attempt");
            statements.push(db.prepare("INSERT INTO payment_attempts(id,business_id,branch_id,charge_id,account_id,amount_minor,idempotency_key,next_attempt_at,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
              .bind(id, op.businessId, op.branchId, chargeId, account.id, op.amount * 100, crypto.randomUUID(), now, actor.id, now, now));
          }
        }
      }
      await repo.write(context, op.branchId, { command: op.type, requestKey: op.requestKey, requestHash: digest, targetId: chargeId }, statements, privileged);
      return { balance: await repo.get(context, op.branchId, chargeId), created, reconciled, replayed: false };
    } catch (error) {
      if (error instanceof BackendConflict && ["idempotency", "version-conflict"].includes(error.reason)) {
        const raced = await replay(); if (raced) return raced;
        if (op.type === "charge.checkout" && attempt < 2) return this.executeAttempt(actor, op, metadata, attempt + 1);
      }
      throw error;
    }
  }
}
