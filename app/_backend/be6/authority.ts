import type { Database, PreparedStatement } from "../be1/repository";
import { be1Error } from "../be1/errors";
import { validateId } from "../be1/validation";
import { PostgresBe4Repository } from "../be4/postgresRepository";
import { approvedAddOn } from "../be4/domain";
import { batch, deleteGuard, findReceipt } from "../shared/database";
import { BackendConflict, conflict } from "../shared/errors";
import { choice, hash, integer, opaqueId } from "../shared/validation";

/** Separate authenticated Guardian boundary. A Business or channel Customer link cannot approve. */
export class GuardianApprovalService {
  constructor(private readonly db: Database, private readonly mode: "dev-test" | "verified-provider" = "verified-provider", private readonly clock = () => new Date().toISOString()) {}
  async decide(personId: string, businessId: string, branchId: string, messageId: string, decision: "approved" | "declined", expectedRevision: number, requestKey: string) {
    [personId, businessId, branchId, messageId, requestKey].forEach(validateId); choice(decision, ["approved", "declined"]); integer(expectedRevision, 1, 2147483647);
    const db = this.db, now = this.clock();
    const row = await db.prepare(`SELECT a.*,m.pet_id,m.booking_id,m.execution_id,pa.id authority_id,pa.revision authority_revision FROM message_approvals a JOIN messages m ON m.id=a.message_id
      JOIN pet_authorities pa ON pa.pet_id=m.pet_id JOIN persons p ON p.id=pa.person_id JOIN businesses b ON b.id=m.business_id JOIN branches br ON br.business_id=b.id AND br.id=m.branch_id
      WHERE a.business_id=? AND a.branch_id=? AND a.message_id=? AND pa.person_id=? AND pa.role='primary' AND pa.status='active' AND p.status='active' AND b.status='active' AND br.status='active' AND (pa.source='verified-provider' OR ?='dev-test')`)
      .bind(businessId, branchId, messageId, personId, this.mode).first<{ revision: number; status: string; pet_id: string; booking_id: string; execution_id: string | null; authority_id: string; authority_revision: number; service_name: string; additional_price: number; additional_minutes: number }>();
    if (!row) throw be1Error("NOT_FOUND");
    const digest = await hash({ personId, businessId, branchId, messageId, decision, expectedRevision });
    const replay = async () => { const old = await findReceipt(db, businessId, "guardian.approval", requestKey); if (!old) return false; if (old.branchId !== branchId || old.requestHash !== digest) conflict("idempotency"); return true; };
    if (await replay()) return;
    if (row.revision !== expectedRevision) conflict("version-conflict"); if (row.status !== "waiting") conflict("invalid-transition");
    const token = opaqueId("guardianapproval");
    const statements: PreparedStatement[] = [];
    // Build the write-time proof with the exact authority and Booking. No Membership is fabricated for the Guardian.
    statements[0] = db.prepare(`INSERT INTO backend_guards(id,allowed) SELECT ?,(EXISTS(SELECT 1 FROM pet_authorities a JOIN persons p ON p.id=a.person_id
      JOIN bookings bk ON bk.business_id=? AND bk.branch_id=? AND bk.id=? JOIN businesses b ON b.id=bk.business_id JOIN branches br ON br.business_id=b.id AND br.id=bk.branch_id
      WHERE a.id=? AND a.pet_id=? AND a.person_id=? AND a.revision=? AND a.role='primary' AND a.status='active' AND p.status='active' AND bk.status<>'cancelled' AND b.status='active' AND br.status='active' AND (a.source='verified-provider' OR ?='dev-test')))::integer`)
      .bind(token, businessId, branchId, row.booking_id, row.authority_id, row.pet_id, personId, row.authority_revision, this.mode);
    statements.push(db.prepare("UPDATE message_approvals SET status=?,responded_at=?,authority_id=?,response_source=?,revision=revision+1 WHERE business_id=? AND branch_id=? AND message_id=? AND revision=? AND status='waiting'")
      .bind(decision, now, row.authority_id, this.mode === "dev-test" ? "dev-test-guardian" : "verified-guardian", businessId, branchId, messageId, expectedRevision),
      db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(:previous_row_count::integer=1)::integer").bind(`${token}-decision`));
    if (decision === "approved" && row.execution_id) {
      const before = await new PostgresBe4Repository(db).get(businessId, branchId, row.execution_id); if (!before || before.record.petId !== row.pet_id) throw be1Error("NOT_FOUND");
      const addOn = { id: opaqueId("addon"), sourceRequestId: messageId, label: row.service_name, additionalPrice: row.additional_price, additionalMinutes: row.additional_minutes, approvedAt: now };
      const after = approvedAddOn(before, addOn, now), history = after.record.history.at(-1)!;
      // Add-ons and estimate derive from immutable execution events; this changes no planning interval, Charge or Payment.
      statements.push(db.prepare("UPDATE service_executions SET revision=revision+1,updated_at=?,write_token=? WHERE business_id=? AND branch_id=? AND id=? AND revision=? AND module='grooming' AND status<>'cancelled'").bind(now, token, businessId, branchId, row.execution_id, before.record.revision),
        db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(:previous_row_count::integer=1)::integer").bind(`${token}-execution`),
        db.prepare("INSERT INTO execution_events(id,business_id,branch_id,execution_id,kind,summary,data_json,actor_person_id,occurred_at) VALUES(?,?,?,?,'addon','บริการเพิ่มเติมที่อนุมัติแล้ว',?,?,?)").bind(addOn.id, businessId, branchId, row.execution_id, JSON.stringify(addOn), personId, now),
        db.prepare("INSERT INTO execution_events(id,business_id,branch_id,execution_id,kind,summary,data_json,actor_person_id,occurred_at) VALUES(?,?,?,?,'history:add-on',?,'{}',?,?)").bind(history.id, businessId, branchId, row.execution_id, history.summary, personId, now), deleteGuard(db, `${token}-execution`));
    }
    statements.push(db.prepare("INSERT INTO backend_mutations(business_id,branch_id,command,request_key,request_hash,target_id,actor_person_id,created_at) VALUES(?,?,'guardian.approval',?,?,?,?,?)").bind(businessId, branchId, requestKey, digest, messageId, personId, now), deleteGuard(db, `${token}-decision`), deleteGuard(db, token));
    try { await batch(db, statements); } catch (error) { if (error instanceof BackendConflict && ["idempotency", "version-conflict"].includes(error.reason) && await replay()) return; throw error; }
  }
}
