import type { AuthorizedMutation, Database, PreparedStatement } from "../be1/repository";
import { be1Error } from "../be1/errors";
import { authorizationGuard, auditStatement, batch, deleteGuard, receiptStatement, type MutationReceipt } from "../shared/database";
import { opaqueId } from "../shared/validation";
import type { ConversationView, InboxContext, MessageView } from "./contracts";

export type MessageRow = { sequence: number; id: string; business_id: string; branch_id: string; conversation_id: string; kind: "text" | "add-service-request"; direction: "business" | "customer"; body: string;
  pet_id: string | null; booking_id: string | null; execution_id: string | null; occurred_at: string; created_at: string;
  service_name: string | null; additional_price: number | null; additional_minutes: number | null; note: string | null; status: "waiting" | "approved" | "declined" | "cancelled" | "expired" | null;
  revision: number | null; responded_at: string | null; response_source: "verified-guardian" | "dev-test-guardian" | null; outbox_state: string | null; provider: string | null };
const MESSAGE = `SELECT m.*,a.service_name,a.additional_price,a.additional_minutes,a.note,a.status,a.revision,a.responded_at,a.response_source,o.state outbox_state,ch.provider
  FROM messages m LEFT JOIN message_approvals a ON a.message_id=m.id LEFT JOIN message_outbox o ON o.business_id=m.business_id AND o.branch_id=m.branch_id AND o.message_id=m.id LEFT JOIN business_channels ch ON ch.id=o.channel_id`;

export class PostgresBe6Repository {
  constructor(readonly database: Database, readonly mode: "dev-test" | "verified-provider" = "verified-provider") {}
  async rows<T>(sql: string, ...bindings: unknown[]) { const result = await this.database.prepare(sql).bind(...bindings).all<T>(); if (result.success === false) throw be1Error("PERSISTENCE_ERROR"); return result.results ?? []; }
  // Re-evaluated by each read, not a stale list of Branch IDs from an earlier request.
  visibility(alias: string) { return `EXISTS(SELECT 1 FROM persons vp JOIN business_memberships vm ON vm.person_id=vp.id JOIN businesses vb ON vb.id=vm.business_id
    WHERE vp.id=? AND vm.id=? AND vp.status='active' AND vm.status='active' AND vb.status='active' AND vm.business_id=${alias}.business_id
    AND (vm.role='OWNER' OR EXISTS(SELECT 1 FROM membership_branch_access va WHERE va.business_id=vm.business_id AND va.membership_id=vm.id AND va.branch_id=${alias}.branch_id AND va.status='active')))`; }
  bindings(context: AuthorizedMutation) { return [context.actor.id, context.membership.id]; }
  conversation(businessId: string, id: string) { return this.database.prepare("SELECT id,customer_id,created_at FROM conversations WHERE business_id=? AND id=?").bind(businessId, id).first<{ id: string; customer_id: string; created_at: string }>(); }
  forCustomer(businessId: string, customerId: string) { return this.database.prepare("SELECT id FROM conversations WHERE business_id=? AND customer_id=?").bind(businessId, customerId).first<{ id: string }>(); }
  async requireContext(businessId: string, branchId: string, input: InboxContext): Promise<InboxContext> {
    const customer = await this.database.prepare("SELECT id FROM customers WHERE business_id=? AND id=? AND status='active'").bind(businessId, input.customerId).first();
    if (!customer) throw be1Error("NOT_FOUND");
    let { petId, bookingId, executionId } = input;
    if (executionId) {
      const e = await this.database.prepare("SELECT pet_id,booking_id FROM service_executions WHERE business_id=? AND branch_id=? AND id=? AND customer_id=?").bind(businessId, branchId, executionId, input.customerId).first<{ pet_id: string; booking_id: string }>();
      if (!e || (petId && e.pet_id !== petId) || (bookingId && e.booking_id !== bookingId)) throw be1Error("NOT_FOUND");
      petId = e.pet_id; bookingId = e.booking_id;
    }
    if (bookingId) {
      const b = await this.database.prepare("SELECT id FROM bookings WHERE business_id=? AND branch_id=? AND id=? AND customer_id=?").bind(businessId, branchId, bookingId, input.customerId).first();
      if (!b) throw be1Error("NOT_FOUND");
      const pets = await this.rows<{ pet_id: string }>("SELECT pet_id FROM booking_pets WHERE business_id=? AND booking_id=? ORDER BY position", businessId, bookingId);
      if (petId && !pets.some((p) => p.pet_id === petId)) throw be1Error("NOT_FOUND");
      petId ??= pets[0]?.pet_id ?? null;
      if (!executionId && petId) {
        const e = await this.database.prepare("SELECT id FROM service_executions WHERE business_id=? AND branch_id=? AND booking_id=? AND pet_id=? AND module='grooming'").bind(businessId, branchId, bookingId, petId).first<{ id: string }>();
        executionId = e?.id ?? null;
      }
    }
    if (petId && !await this.database.prepare(`SELECT 1 FROM customer_pet_relationships r JOIN business_pet_profiles p ON p.business_id=r.business_id AND p.pet_id=r.pet_id WHERE r.business_id=? AND r.customer_id=? AND r.pet_id=? AND r.status='active' AND p.status='active'`).bind(businessId, input.customerId, petId).first()) throw be1Error("NOT_FOUND");
    return { customerId: input.customerId, petId, bookingId, executionId };
  }
  contextStatement(businessId: string, branchId: string, conversationId: string, value: InboxContext, now: string) {
    return this.database.prepare(`INSERT INTO conversation_contexts(business_id,branch_id,conversation_id,pet_id,booking_id,execution_id,updated_at) VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(business_id,branch_id,conversation_id) DO UPDATE SET pet_id=excluded.pet_id,booking_id=excluded.booking_id,execution_id=excluded.execution_id,updated_at=excluded.updated_at,revision=conversation_contexts.revision+1`)
      .bind(businessId, branchId, conversationId, value.petId, value.bookingId, value.executionId, now);
  }
  async message(context: AuthorizedMutation, branchId: string, conversationId: string, id: string) {
    return this.database.prepare(`${MESSAGE} WHERE m.business_id=? AND m.branch_id=? AND m.conversation_id=? AND m.id=? AND ${this.visibility("m")}`)
      .bind(context.membership.businessId, branchId, conversationId, id, ...this.bindings(context)).first<MessageRow>();
  }
  messageView(m: MessageRow): MessageView {
    const base = { messageId: m.id, conversationId: m.conversation_id, sentAt: m.occurred_at, sequence: m.sequence, branchId: m.branch_id, revision: m.revision ?? 1 };
    if (m.kind === "add-service-request") return { ...base, kind: "add-service-request", direction: "business", bookingId: m.booking_id!, serviceJobId: m.execution_id,
      serviceName: m.service_name!, additionalPrice: m.additional_price!, additionalMinutes: m.additional_minutes!, note: m.note!, requestStatus: m.status!, respondedAt: m.responded_at, responseSource: m.response_source };
    return { ...base, kind: "text", direction: m.direction, text: m.body, deliveryState: m.direction === "customer" ? null : m.outbox_state === "sent" ? m.provider === "mock" ? "test-sent" : "sent"
      : m.outbox_state === "failed" ? "failed" : m.outbox_state === "blocked" || !m.outbox_state ? "not-connected" : "queued" };
  }
  async views(context: AuthorizedMutation, branchId: string, ids: string[], messageLimit: number, beforeSequence = Number.MAX_SAFE_INTEGER): Promise<ConversationView[]> {
    if (!ids.length) return [];
    const biz = context.membership.businessId, marks = ids.map(() => "?").join(",");
    const contexts = await this.rows<{ id: string; customer_id: string; created_at: string; pet_id: string | null; booking_id: string | null; execution_id: string | null; branch_id: string; revision: number; updated_at: string }>(
      `SELECT * FROM (SELECT c.id,c.customer_id,c.created_at,x.pet_id,x.booking_id,x.execution_id,x.branch_id,x.revision,x.updated_at,
      row_number() OVER(PARTITION BY c.id ORDER BY x.branch_id=? DESC,x.updated_at DESC,x.branch_id) rn
      FROM conversations c JOIN conversation_contexts x ON x.business_id=c.business_id AND x.conversation_id=c.id WHERE c.business_id=? AND c.id IN (${marks}) AND ${this.visibility("x")}) WHERE rn=1`, branchId, biz, ...ids, ...this.bindings(context));
    const messages = await this.rows<MessageRow>(`SELECT * FROM (SELECT q.*,row_number() OVER(PARTITION BY q.conversation_id ORDER BY q.sequence DESC) rn FROM (${MESSAGE} WHERE m.business_id=? AND m.conversation_id IN (${marks}) AND m.sequence<? AND ${this.visibility("m")}) q) WHERE rn<=? ORDER BY sequence`, biz, ...ids, beforeSequence, ...this.bindings(context), messageLimit + 1);
    const totals = await this.rows<{ conversation_id: string; unread: number; updated_at: string; read_at: string | null }>(`SELECT m.conversation_id,sum(CASE WHEN m.direction='customer' AND m.sequence>coalesce(r.through_sequence,0) THEN 1 ELSE 0 END) unread,max(coalesce(a.responded_at,m.created_at)) updated_at,max(r.read_at) read_at
      FROM messages m LEFT JOIN conversation_reads r ON r.business_id=m.business_id AND r.branch_id=m.branch_id AND r.conversation_id=m.conversation_id AND r.person_id=? LEFT JOIN message_approvals a ON a.message_id=m.id
      WHERE m.business_id=? AND m.conversation_id IN (${marks}) AND ${this.visibility("m")} GROUP BY m.conversation_id`, context.actor.id, biz, ...ids, ...this.bindings(context));
    return contexts.map((x) => {
      const all = messages.filter((m) => m.conversation_id === x.id), total = totals.find((t) => t.conversation_id === x.id);
      return { conversationId: x.id, businessId: biz, customerId: x.customer_id, branchId: x.branch_id, petId: x.pet_id, bookingId: x.booking_id, serviceJobId: x.execution_id,
        messages: all.slice(-messageLimit).map((m) => this.messageView(m)), hasOlderMessages: all.length > messageLimit, unreadCount: total?.unread ?? 0,
        lastReadAt: total?.read_at ?? null, createdAt: x.created_at, updatedAt: total?.updated_at && total.updated_at > x.updated_at ? total.updated_at : x.updated_at, contextRevision: x.revision };
    });
  }
  async get(context: AuthorizedMutation, branchId: string, id: string, beforeSequence?: number) {
    const view = (await this.views(context, branchId, [id], 100, beforeSequence))[0];
    if (!view) throw be1Error("NOT_FOUND"); return view;
  }
  async list(context: AuthorizedMutation, branchId: string, afterId: string, limit: number) {
    const ids = await this.rows<{ id: string }>(`SELECT c.id FROM conversations c WHERE c.business_id=? AND c.id>? AND EXISTS(SELECT 1 FROM conversation_contexts x WHERE x.business_id=c.business_id AND x.conversation_id=c.id AND ${this.visibility("x")}) ORDER BY c.id LIMIT ?`, context.membership.businessId, afterId, ...this.bindings(context), limit + 1);
    return { conversations: await this.views(context, branchId, ids.slice(0, limit).map((x) => x.id), 1), nextAfterId: ids.length > limit ? ids[limit - 1].id : null };
  }
  outboxStatement(context: AuthorizedMutation, branchId: string, conversationId: string, messageId: string) {
    const biz = context.membership.businessId, now = context.occurredAt;
    return this.database.prepare(`INSERT INTO message_outbox(id,business_id,branch_id,message_id,channel_id,link_id,recipient,retry_key,state,available_at,created_at,updated_at)
      SELECT ?,?,?,?,ch.id,l.id,l.external_subject,?,CASE WHEN l.id IS NOT NULL AND ch.state='active' THEN 'queued' ELSE 'blocked' END,?,?,?
      FROM conversations c LEFT JOIN business_channels ch ON ch.business_id=c.business_id AND (ch.provider='line' OR ?='dev-test')
      LEFT JOIN customer_channel_links l ON l.business_id=c.business_id AND l.channel_id=ch.id AND l.customer_id=c.customer_id AND l.status='active' AND (l.verification_source='verified-provider' OR ?='dev-test')
      WHERE c.business_id=? AND c.id=? ORDER BY ch.provider='line' DESC LIMIT 1`)
      .bind(opaqueId("outbox"), biz, branchId, messageId, crypto.randomUUID(), now, now, now, this.mode, this.mode, biz, conversationId);
  }
  async write(context: AuthorizedMutation, branchId: string, receipt: MutationReceipt, statements: PreparedStatement[]) {
    const token = opaqueId("inboxwrite"), db = this.database;
    await batch(db, [authorizationGuard(db, context, branchId, token), ...statements, receiptStatement(db, context, branchId, receipt),
      auditStatement(db, context, branchId, receipt.command, "conversation", receipt.targetId, null, { command: receipt.command }), deleteGuard(db, token)]);
  }
}

