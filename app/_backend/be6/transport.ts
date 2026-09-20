import type { Database, PreparedStatement } from "../be1/repository";
import { be1Error } from "../be1/errors";
import { batch, deleteGuard } from "../shared/database";
import { BackendConflict, conflict } from "../shared/errors";
import { hash, opaqueId } from "../shared/validation";
import type { Channel, ChannelAdapter, IncomingMessage, SendOutcome } from "./contracts";
import { PostgresBe6Repository } from "./postgresRepository";

export type ChannelResolver = (channel: Channel) => Promise<ChannelAdapter | null>;
type ChannelRow = { id: string; business_id: string; branch_id: string; provider: "line" | "mock"; state: "active" | "disconnected"; external_account_id: string; secret_ref: string };
type OutboxRow = { id: string; business_id: string; branch_id: string; message_id: string; channel_id: string; link_id: string; recipient: string; retry_key: string; state: string; attempts: number; first_attempt_at: string | null; body: string; actor_person_id: string | null };

/** Internal worker boundary. There is no unauthenticated HTTP "drain" command. */
export class InboxTransport {
  private readonly repo: PostgresBe6Repository;
  constructor(private readonly db: Database, private readonly resolveAdapter: ChannelResolver, private readonly mode: "dev-test" | "verified-provider" = "verified-provider", private readonly clock = () => new Date().toISOString()) { this.repo = new PostgresBe6Repository(db, mode); }
  async channel(id: string): Promise<Channel | null> {
    const c = await this.db.prepare(`SELECT ch.* FROM business_channels ch JOIN businesses b ON b.id=ch.business_id JOIN branches br ON br.business_id=ch.business_id AND br.id=ch.branch_id WHERE ch.id=? AND ch.state='active' AND b.status='active' AND br.status='active' AND (ch.provider='line' OR ?='dev-test')`).bind(id, this.mode).first<ChannelRow>();
    return c ? { id: c.id, businessId: c.business_id, branchId: c.branch_id, provider: c.provider, state: c.state, externalAccountId: c.external_account_id, secretRef: c.secret_ref } : null;
  }
  async webhook(channelId: string, raw: Uint8Array, signature: string) {
    if (raw.length > 65536) throw be1Error("INVALID_INPUT");
    const channel = await this.channel(channelId); if (!channel) throw be1Error("NOT_FOUND");
    const adapter = await this.resolveAdapter(channel); if (!adapter || adapter.provider !== channel.provider) throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
    if (!await adapter.verify(raw, signature)) throw be1Error("UNAUTHENTICATED");
    const events = adapter.decode(raw, channel.externalAccountId);
    for (const event of events) await this.receive(channel, event);
    return { accepted: events.length };
  }
  private async receive(channel: Channel, event: IncomingMessage, attempt = 0): Promise<void> {
    const db = this.db, digest = await hash(event), now = this.clock();
    const replay = async () => {
      const old = await db.prepare("SELECT event_hash FROM channel_webhook_events WHERE channel_id=? AND (event_id=? OR provider_message_id=?)").bind(channel.id, event.eventId, event.providerMessageId).first<{ event_hash: string }>();
      if (!old) return false;
      if (old.event_hash !== digest) conflict("idempotency"); return true;
    };
    if (await replay()) return;
    const link = await db.prepare(`SELECT l.id,l.customer_id,l.revision FROM customer_channel_links l JOIN customers c ON c.business_id=l.business_id AND c.id=l.customer_id WHERE l.business_id=? AND l.channel_id=? AND l.external_subject=? AND l.status='active' AND c.status='active' AND (l.verification_source='verified-provider' OR ?='dev-test')`).bind(channel.businessId, channel.id, event.externalSubject, this.mode).first<{ id: string; customer_id: string; revision: number }>();
    const token = opaqueId("incoming"), statements: PreparedStatement[] = [this.channelGuard(channel, token)];
    let messageId: string | null = null;
    if (link) {
      const conversation = await this.repo.forCustomer(channel.businessId, link.customer_id), id = conversation?.id ?? opaqueId("conversation");
      statements.push(db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(EXISTS(SELECT 1 FROM customer_channel_links WHERE business_id=? AND channel_id=? AND id=? AND revision=? AND status='active'))::integer").bind(`${token}-link`, channel.businessId, channel.id, link.id, link.revision));
      if (!conversation) statements.push(db.prepare("INSERT INTO conversations(id,business_id,customer_id,created_at) VALUES(?,?,?,?)").bind(id, channel.businessId, link.customer_id, now));
      // Incoming text cannot assert a Pet, Booking, Person or Guardian relationship.
      statements.push(db.prepare("INSERT INTO conversation_contexts(business_id,branch_id,conversation_id,updated_at) VALUES(?,?,?,?) ON CONFLICT(business_id,branch_id,conversation_id) DO NOTHING").bind(channel.businessId, channel.branchId, id, now));
      messageId = opaqueId("message");
      statements.push(db.prepare("INSERT INTO messages(id,business_id,branch_id,conversation_id,kind,direction,body,occurred_at,created_at) VALUES(?,?,?,?,'text','customer',?,?,?)").bind(messageId, channel.businessId, channel.branchId, id, event.text, event.occurredAt, now), deleteGuard(db, `${token}-link`));
    }
    statements.push(db.prepare("INSERT INTO channel_webhook_events(channel_id,event_id,business_id,branch_id,event_hash,provider_message_id,external_subject,message_id,state,pending_body,occurred_at,received_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(channel.id, event.eventId, channel.businessId, channel.branchId, digest, event.providerMessageId, event.externalSubject, messageId, link ? "received" : "unlinked", link ? null : event.text, event.occurredAt, now), deleteGuard(db, token));
    try { await batch(db, statements); }
    catch (error) {
      if (error instanceof BackendConflict) {
        if (await replay()) return;
        if (attempt < 2 && error.reason === "version-conflict" && link && await this.repo.forCustomer(channel.businessId, link.customer_id)) return this.receive(channel, event, attempt + 1);
      }
      throw error;
    }
  }
  private channelGuard(channel: Channel, token: string) {
    return this.db.prepare(`INSERT INTO backend_guards(id,allowed) SELECT ?,(EXISTS(SELECT 1 FROM business_channels ch JOIN businesses b ON b.id=ch.business_id JOIN branches br ON br.business_id=ch.business_id AND br.id=ch.branch_id
      WHERE ch.id=? AND ch.business_id=? AND ch.branch_id=? AND ch.provider=? AND ch.external_account_id=? AND ch.state='active' AND b.status='active' AND br.status='active'))::integer`).bind(token, channel.id, channel.businessId, channel.branchId, channel.provider, channel.externalAccountId);
  }
  async drain(limit = 20) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw be1Error("INVALID_INPUT");
    const now = this.clock(), candidates = await this.repo.rows<{ id: string }>(`SELECT id FROM message_outbox WHERE (state IN ('queued','retry') AND available_at<=?) OR (state='sending' AND lease_until<=?) ORDER BY available_at,id LIMIT ?`, now, now, limit);
    for (const candidate of candidates) await this.dispatch(candidate.id);
    return { examined: candidates.length };
  }
  private async dispatch(id: string) {
    const now = this.clock(), db = this.db, lease = opaqueId("lease"), leaseUntil = new Date(Date.parse(now) + 60000).toISOString();
    const claimed = await batch(db, [db.prepare(`UPDATE message_outbox SET state='sending',lease_token=?,lease_until=?,first_attempt_at=coalesce(first_attempt_at,?),attempts=attempts+1,updated_at=?
      WHERE id=? AND ((state IN ('queued','retry') AND available_at<=?) OR (state='sending' AND lease_until<=?))`).bind(lease, leaseUntil, now, now, id, now, now),
      db.prepare("INSERT INTO outbox_attempts(id,outbox_id,started_at) SELECT ?,id,? FROM message_outbox WHERE id=? AND lease_token=?").bind(lease, now, id, lease)]);
    if ((claimed[0].meta?.changes ?? 0) !== 1) return;
    const row = await db.prepare("SELECT o.*,m.body,m.actor_person_id FROM message_outbox o JOIN messages m ON m.business_id=o.business_id AND m.branch_id=o.branch_id AND m.id=o.message_id WHERE o.id=? AND o.lease_token=?").bind(id, lease).first<OutboxRow>(); if (!row) return;
    const channel = await this.channel(row.channel_id);
    let outcome: SendOutcome = { state: "not-connected", code: "channel-unavailable" };
    // Provider retry keys are valid for 24h. Never resend an uncertain old attempt with a new key.
    if (row.first_attempt_at && Date.parse(now) - Date.parse(row.first_attempt_at) >= 23 * 3600000) outcome = { state: "failed", code: "reconciliation-required" };
    else if (channel) {
      const linked = await db.prepare(`SELECT 1 FROM customer_channel_links l JOIN customers c ON c.business_id=l.business_id AND c.id=l.customer_id
        JOIN conversations cv ON cv.business_id=c.business_id AND cv.customer_id=c.id JOIN messages m ON m.business_id=cv.business_id AND m.conversation_id=cv.id
        JOIN persons p ON p.id=m.actor_person_id JOIN business_memberships mb ON mb.business_id=m.business_id AND mb.person_id=p.id
        JOIN branches br ON br.business_id=m.business_id AND br.id=m.branch_id
        WHERE l.business_id=? AND l.channel_id=? AND l.id=? AND l.external_subject=? AND l.status='active' AND (l.verification_source='verified-provider' OR ?='dev-test')
        AND c.status='active' AND m.id=? AND p.status='active' AND mb.status='active' AND br.status='active'
        AND (mb.role='OWNER' OR EXISTS(SELECT 1 FROM membership_branch_access ba WHERE ba.business_id=mb.business_id AND ba.membership_id=mb.id AND ba.branch_id=m.branch_id AND ba.status='active'))`)
        .bind(row.business_id, channel.id, row.link_id, row.recipient, this.mode, row.message_id).first();
      const adapter = linked ? await this.resolveAdapter(channel) : null;
      if (adapter && adapter.provider === channel.provider) {
        try { outcome = await adapter.send({ retryKey: row.retry_key, recipient: row.recipient, text: row.body }); }
        catch { outcome = { state: "retry", code: "provider-network" }; }
      } else outcome = { state: "not-connected", code: linked ? "credentials-unavailable" : "recipient-or-authority-unavailable" };
    }
    const state = outcome.state === "accepted" ? "sent" : outcome.state === "not-connected" ? "blocked" : outcome.state === "retry" && row.attempts >= 8 ? "failed" : outcome.state;
    const next = new Date(Date.parse(now) + Math.min(3600, 2 ** row.attempts * 15) * 1000).toISOString();
    await batch(db, [db.prepare("UPDATE message_outbox SET state=?,available_at=?,lease_token=NULL,lease_until=NULL,provider_message_id=?,provider_request_id=?,failure_code=?,updated_at=? WHERE id=? AND lease_token=?")
      .bind(state, next, outcome.state === "accepted" ? outcome.providerMessageId : null, outcome.state === "accepted" ? outcome.providerRequestId : null, outcome.state === "accepted" ? null : outcome.code, this.clock(), id, lease),
      db.prepare("UPDATE outbox_attempts SET finished_at=?,outcome=?,failure_code=?,provider_request_id=? WHERE id=? AND outcome='sending'")
        .bind(this.clock(), outcome.state, outcome.state === "accepted" ? null : outcome.code, outcome.state === "accepted" ? outcome.providerRequestId : null, lease)]);
  }
}
