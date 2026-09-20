import type { AuthorizedMutation, Database, PreparedStatement } from "../be1/repository";
import { Be1Error, be1Error } from "../be1/errors";
import { BackendConflict, conflict } from "./errors";
import { opaqueId } from "./validation";

export type MutationReceipt = { command: string; requestKey: string; requestHash: string; targetId: string };

export function authorizationGuard(db: Database, context: AuthorizedMutation, branchId: string, token: string, ownerOnly = false) {
  return db.prepare(`INSERT INTO backend_guards(id, allowed)
    SELECT ?, CAST(EXISTS(SELECT 1 FROM persons p JOIN business_memberships m ON m.person_id=p.id
      JOIN businesses b ON b.id=m.business_id JOIN branches br ON br.business_id=b.id
      WHERE p.id=? AND p.status='active' AND m.id=? AND m.business_id=? AND m.status='active'
        AND b.status='active' AND br.id=? AND br.status='active'
        AND (?=0 OR m.role='OWNER')
        AND (m.role='OWNER' OR EXISTS(SELECT 1 FROM membership_branch_access a
          WHERE a.business_id=m.business_id AND a.membership_id=m.id AND a.branch_id=br.id AND a.status='active'))) AS integer)`)
    .bind(token, context.actor.id, context.membership.id, context.membership.businessId, branchId, ownerOnly ? 1 : 0);
}

export async function findReceipt(db: Database, businessId: string, command: string, requestKey: string) {
  return db.prepare('SELECT branch_id AS "branchId", request_hash AS "requestHash", target_id AS "targetId" FROM backend_mutations WHERE business_id=? AND command=? AND request_key=?')
    .bind(businessId, command, requestKey).first<{ branchId: string; requestHash: string; targetId: string }>();
}

export function receiptStatement(db: Database, context: AuthorizedMutation, branchId: string, receipt: MutationReceipt, predicate = "TRUE", bindings: unknown[] = []) {
  return db.prepare(`INSERT INTO backend_mutations(business_id,branch_id,command,request_key,request_hash,target_id,actor_person_id,created_at)
    SELECT ?,?,?,?,?,?,?,? WHERE (${predicate})`)
    .bind(context.membership.businessId, branchId, receipt.command, receipt.requestKey, receipt.requestHash, receipt.targetId, context.actor.id, context.occurredAt, ...bindings);
}

export function auditStatement(db: Database, context: AuthorizedMutation, branchId: string, action: string, targetType: string, targetId: string, before: unknown, after: unknown, predicate = "TRUE", bindings: unknown[] = []) {
  return db.prepare(`INSERT INTO audit_events(id,actor_person_id,actor_membership_id,business_id,branch_id,request_id,correlation_id,action,target_type,target_id,before_json,after_json,occurred_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE (${predicate})`)
    .bind(opaqueId("aud"), context.actor.id, context.membership.id, context.membership.businessId, branchId, context.metadata.requestId,
      context.metadata.correlationId, action, targetType, targetId, before === null ? null : JSON.stringify(before), after === null ? null : JSON.stringify(after), context.occurredAt, ...bindings);
}

export function deleteGuard(db: Database, token: string) { return db.prepare("DELETE FROM backend_guards WHERE id=?").bind(token); }

export async function batch(db: Database, statements: PreparedStatement[]) {
  try {
    const results = await db.batch(statements);
    if (results.some((r) => r.success === false)) throw be1Error("PERSISTENCE_ERROR");
    return results;
  } catch (error) {
    if (error instanceof Be1Error || error instanceof BackendConflict) throw error;
    const message = String(error);
    const pg = error as { code?: string; table_name?: string };
    if (pg.code === "23505") {
      if (["business_intakes", "conversations", "charges", "charge_items"].includes(pg.table_name ?? "")) conflict("version-conflict");
      if (["channel_webhook_events", "payment_webhook_events", "payments", "payment_attempts", "backend_mutations"].includes(pg.table_name ?? "")) conflict("idempotency");
    }
    if (message.includes("ck_backend_authorization")) throw be1Error("FORBIDDEN");
    if (message.includes("ck_backend_version")) conflict("version-conflict");
    if (message.includes("BE6_SCOPE")) throw be1Error("FORBIDDEN");
    if (message.includes("BE6_VERSION")) conflict("version-conflict");
    if (message.includes("BE7_SCOPE")) throw be1Error("FORBIDDEN");
    if (message.includes("BE7_VERSION")) conflict("version-conflict");
    if (message.includes("BE7_AMOUNT")) conflict("invalid-total");
    if (message.includes("BE5_SCOPE")) throw be1Error("FORBIDDEN");
    if (message.includes("BE4_CAPACITY")) conflict("capacity");
    if (message.includes("BE4_SCOPE")) throw be1Error("FORBIDDEN");
    if (message.includes("BE4_RESOURCE")) conflict("invalid-resource");
    if (message.includes("BE4_STAFF")) conflict("invalid-staff");
    if (message.includes("BE4_VERSION")) conflict("version-conflict");
    throw be1Error("PERSISTENCE_ERROR", error);
  }
}
