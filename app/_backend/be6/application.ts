import type { PersonView } from "../be1/contracts";
import type { RequestMetadata } from "../be1/metadata";
import type { Be1Repository, D1PreparedStatementLike } from "../be1/repository";
import { be1Error } from "../be1/errors";
import { BusinessApplication } from "../shared/application";
import { deleteGuard, findReceipt } from "../shared/database";
import { BackendConflict, conflict } from "../shared/errors";
import { hash, opaqueId } from "../shared/validation";
import type { Be6Operation, ConversationView, InboxDirectory } from "./contracts";
import { D1Be6Repository } from "./d1Repository";
import { parseBe6Operation } from "./validation";

export class Be6Application extends BusinessApplication {
  constructor(auth: Be1Repository, private readonly inbox: D1Be6Repository, private readonly clock = () => new Date().toISOString()) { super(auth); }
  async executeBe6(actor: PersonView, raw: Be6Operation, metadata: RequestMetadata): Promise<ConversationView | InboxDirectory> {
    return this.executeAttempt(actor, raw, metadata, 0);
  }
  private async executeAttempt(actor: PersonView, raw: Be6Operation, metadata: RequestMetadata, attempt: number): Promise<ConversationView | InboxDirectory> {
    const op = parseBe6Operation(raw), now = this.clock(), repo = this.inbox, db = repo.database;
    const context = await this.scope(actor, op.businessId, op.branchId, metadata, now, !["inbox.list", "conversation.get"].includes(op.type));
    if (op.type === "inbox.list") return repo.list(context, op.branchId, op.afterId ?? "", op.limit ?? 50);
    if (op.type === "conversation.get") return repo.get(context, op.branchId, op.conversationId, op.beforeSequence);
    const digest = await hash({ actorId: actor.id, op });
    const replay = async () => {
      const previous = await findReceipt(db, op.businessId, op.type, op.requestKey); if (!previous) return null;
      if (previous.requestHash !== digest || previous.branchId !== op.branchId) conflict("idempotency");
      return repo.get(context, op.branchId, previous.targetId);
    };
    const previous = await replay(); if (previous) return previous;
    let id: string;
    const statements: D1PreparedStatementLike[] = [];
    try {
      if (op.type === "conversation.ensure") {
        const value = await repo.requireContext(op.businessId, op.branchId, op.context), existing = await repo.forCustomer(op.businessId, value.customerId);
        id = existing?.id ?? opaqueId("conversation");
        if (!existing) statements.push(db.prepare("INSERT INTO conversations(id,business_id,customer_id,created_at) VALUES(?,?,?,?)").bind(id, op.businessId, value.customerId, now));
        statements.push(repo.contextStatement(op.businessId, op.branchId, id, value, now));
      } else {
        id = op.conversationId;
        await repo.get(context, op.branchId, id);
        const conversation = await repo.conversation(op.businessId, id); if (!conversation) throw be1Error("NOT_FOUND");
        if (op.type === "conversation.read") {
          // Cursor advances only to messages actually present in each currently readable Branch.
          statements.push(db.prepare(`INSERT INTO conversation_reads(business_id,branch_id,conversation_id,person_id,through_sequence,read_at)
            SELECT m.business_id,m.branch_id,m.conversation_id,?,max(m.sequence),? FROM messages m WHERE m.business_id=? AND m.conversation_id=? AND m.sequence<=? AND ${repo.visibility("m")} GROUP BY m.branch_id
            ON CONFLICT(business_id,branch_id,conversation_id,person_id) DO UPDATE SET through_sequence=max(conversation_reads.through_sequence,excluded.through_sequence),read_at=excluded.read_at`)
            .bind(actor.id, now, op.businessId, id, op.throughSequence, ...repo.bindings(context)));
        } else if (op.type === "approval.cancel") {
          const m = await repo.message(context, op.branchId, id, op.messageId); if (!m || m.kind !== "add-service-request") throw be1Error("NOT_FOUND");
          if (m.revision !== op.expectedRevision) conflict("version-conflict");
          if (m.status !== "waiting") conflict("invalid-transition");
          const guard = opaqueId("approval");
          statements.push(db.prepare("UPDATE message_approvals SET status='cancelled',responded_at=?,revision=revision+1 WHERE business_id=? AND branch_id=? AND message_id=? AND revision=? AND status='waiting'").bind(now, op.businessId, op.branchId, m.id, op.expectedRevision),
            db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,changes()=1").bind(guard), deleteGuard(db, guard));
          statements.push(db.prepare("UPDATE message_outbox SET state='failed',failure_code='request-cancelled',updated_at=? WHERE business_id=? AND branch_id=? AND message_id=? AND state IN ('blocked','queued') AND attempts=0").bind(now, op.businessId, op.branchId, m.id));
        } else {
          if (op.context.customerId !== conversation.customer_id) throw be1Error("NOT_FOUND");
          const value = await repo.requireContext(op.businessId, op.branchId, op.context), messageId = opaqueId("message");
          if (op.type === "approval.request") {
            const booking = await db.prepare("SELECT status FROM bookings WHERE business_id=? AND branch_id=? AND id=?").bind(op.businessId, op.branchId, value.bookingId).first<{ status: string }>();
            if (!booking || booking.status === "cancelled") conflict("unavailable");
          }
          const body = op.type === "message.send" ? op.text : `${op.serviceName} (+${op.additionalPrice} บาท, +${op.additionalMinutes} นาที)${op.note ? `\n${op.note}` : ""}`;
          statements.push(repo.contextStatement(op.businessId, op.branchId, id, value, now),
            db.prepare("INSERT INTO messages(id,business_id,branch_id,conversation_id,kind,direction,body,pet_id,booking_id,execution_id,actor_person_id,occurred_at,created_at) VALUES(?,?,?,?,?,'business',?,?,?,?,?,?,?)")
              .bind(messageId, op.businessId, op.branchId, id, op.type === "message.send" ? "text" : "add-service-request", body, value.petId, value.bookingId, value.executionId, actor.id, now, now));
          if (op.type === "approval.request") statements.push(db.prepare("INSERT INTO message_approvals(message_id,business_id,branch_id,service_name,additional_price,additional_minutes,note) VALUES(?,?,?,?,?,?,?)").bind(messageId, op.businessId, op.branchId, op.serviceName, op.additionalPrice, op.additionalMinutes, op.note));
          statements.push(repo.outboxStatement(context, op.branchId, id, messageId));
        }
      }
      await repo.write(context, op.branchId, { command: op.type, requestKey: op.requestKey, requestHash: digest, targetId: id }, statements);
      return repo.get(context, op.branchId, id);
    } catch (error) {
      if (error instanceof BackendConflict && ["idempotency", "version-conflict"].includes(error.reason)) {
        const raced = await replay(); if (raced) return raced;
        if (attempt < 2 && op.type === "conversation.ensure" && await repo.forCustomer(op.businessId, op.context.customerId)) return this.executeAttempt(actor, op, metadata, attempt + 1);
      }
      throw error;
    }
  }
}
