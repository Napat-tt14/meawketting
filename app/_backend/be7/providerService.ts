import type { Database, PreparedStatement } from "../be1/repository";
import { be1Error } from "../be1/errors";
import { validateId } from "../be1/validation";
import { batch, deleteGuard } from "../shared/database";
import { BackendConflict, conflict } from "../shared/errors";
import { choice, hash, integer, object, opaqueId, string } from "../shared/validation";
import { AMOUNTS, PostgresBe7Repository } from "./postgresRepository";
import type { AttemptState, PaymentIntent, PaymentProviderEvent, PaymentProviderResolver, ProviderAccount, ProviderOutcome } from "./contracts";

type AttemptRow = { id: string; business_id: string; branch_id: string; charge_id: string; account_id: string; amount_minor: number; currency: "THB"; idempotency_key: string; state: AttemptState; provider_reference: string | null; revision: number; attempts: number; lease_token: string | null; created_by: string };
export function parseProviderEvent(raw: unknown): PaymentProviderEvent {
  const v = object(raw), o = object(v.outcome), state = choice(o.state, ["succeeded", "pending", "failed"] as const);
  let outcome: PaymentProviderEvent["outcome"];
  if (state === "failed") outcome = { state, code: safeFailureCode(o.code) };
  else if (state === "pending") outcome = { state, providerReference: string(o.providerReference, 160, true) };
  else {
    const occurredAt = string(o.occurredAt, 30, true); if (!Number.isFinite(Date.parse(occurredAt))) throw be1Error("INVALID_INPUT");
    const amountMinor = integer(o.amountMinor, 100, 1000000000); if (amountMinor % 100) throw be1Error("INVALID_INPUT");
    outcome = { state, amountMinor, currency: choice(o.currency, ["THB"] as const), providerReference: string(o.providerReference, 160, true), occurredAt: new Date(occurredAt).toISOString() };
  }
  return { eventId: string(v.eventId, 160, true), externalAccountId: string(v.externalAccountId, 160, true), attemptId: validateId(v.attemptId), outcome };
}
function safeFailureCode(value: unknown) { return typeof value === "string" && /^[a-z0-9-]{1,80}$/.test(value) ? value : "provider-error"; }

/** Provider-neutral server boundary. No gateway is selected and no public mock route exists. */
export class PaymentProviderService {
  private readonly repo: PostgresBe7Repository;
  constructor(private readonly db: Database, private readonly resolve: PaymentProviderResolver, mode: "dev-test" | "verified-provider" = "verified-provider", private readonly clock = () => new Date().toISOString()) { this.repo = new PostgresBe7Repository(db, mode); }
  private intent(a: AttemptRow): PaymentIntent { return { attemptId: a.id, idempotencyKey: a.idempotency_key, accountId: a.account_id, amountMinor: a.amount_minor, currency: a.currency }; }
  private async account(id: string) {
    const r = await this.db.prepare("SELECT business_id FROM payment_provider_accounts WHERE id=?").bind(id).first<{ business_id: string }>();
    const account = r ? await this.repo.account(r.business_id, id) : null; if (!account) throw be1Error("NOT_FOUND"); return account;
  }
  async webhook(accountId: string, raw: Uint8Array, signature: string) {
    if (raw.length > 65536) throw be1Error("INVALID_INPUT");
    const account = await this.account(validateId(accountId)), adapter = await this.resolve(account);
    if (!adapter || adapter.provider !== account.provider) conflict("not-connected");
    if (!await adapter.verify(raw, signature)) throw be1Error("UNAUTHENTICATED");
    const events = adapter.decode(raw).map(parseProviderEvent); if (events.length > 100) throw be1Error("INVALID_INPUT");
    for (const event of events) {
      if (event.externalAccountId !== account.externalAccountId) throw be1Error("INVALID_INPUT");
      await this.apply(account, event, await hash(event));
    }
    return { accepted: events.length };
  }
  private async apply(account: ProviderAccount, event: PaymentProviderEvent, digest: string, retries = 0): Promise<void> {
    const db = this.db, now = this.clock(), oldEvent = await db.prepare("SELECT event_hash FROM payment_webhook_events WHERE account_id=? AND event_id=?").bind(account.id, event.eventId).first<{ event_hash: string }>();
    if (oldEvent) { if (oldEvent.event_hash !== digest) conflict("idempotency"); return; }
    const a = await db.prepare("SELECT * FROM payment_attempts WHERE business_id=? AND account_id=? AND id=?").bind(account.businessId, account.id, event.attemptId).first<AttemptRow>();
    const statements: PreparedStatement[] = [], token = opaqueId("settlement");
    // Bind settlement to the merchant configuration whose signature was verified.
    statements.push(db.prepare("INSERT INTO backend_guards(id,allowed) SELECT ?,(EXISTS(SELECT 1 FROM payment_provider_accounts WHERE id=? AND business_id=? AND status='active' AND provider=? AND external_account_id=? AND secret_ref=? AND source=? AND revision=?))::integer")
      .bind(token, account.id, account.businessId, account.provider, account.externalAccountId, account.secretRef, account.source, account.revision), deleteGuard(db, token));
    let ledger: "applied" | "ignored" | "reconciliation" = "applied", code: string | null = null;
    if (!a) { ledger = "reconciliation"; code = "unknown-attempt"; }
    else if (a.state === "succeeded") {
      ledger = "ignored";
      if (event.outcome.state === "succeeded" && (event.outcome.providerReference !== a.provider_reference || event.outcome.amountMinor !== a.amount_minor)) { ledger = "reconciliation"; code = "settlement-mismatch"; }
    } else {
      let state: AttemptState = event.outcome.state;
      const outcome = event.outcome;
      let reference = outcome.state === "failed" ? a.provider_reference : outcome.providerReference;
      if (a.provider_reference && reference !== a.provider_reference) { state = "reconciliation"; code = "reference-mismatch"; }
      if (outcome.state === "succeeded" && (outcome.amountMinor !== a.amount_minor || outcome.currency !== a.currency)) { state = "reconciliation"; code = "amount-mismatch"; }
      if (reference && await db.prepare("SELECT 1 FROM payment_attempts WHERE account_id=? AND provider_reference=? AND id<>?").bind(account.id, reference, a.id).first()) {
        state = "reconciliation"; code = "duplicate-provider-reference"; reference = a.provider_reference;
      }
      if (state === "reconciliation") ledger = "reconciliation";
      // A released reservation cannot be resurrected by a mismatched event.
      if (a.state === "failed" && state === "reconciliation") state = "failed";
      if (a.state === "failed" && outcome.state === "pending") { ledger = "ignored"; state = "failed"; }
      if (outcome.state === "failed") code = outcome.code;
      statements.push(db.prepare("UPDATE payment_attempts SET state=?,provider_reference=coalesce(provider_reference,?),failure_code=?,revision=revision+1,lease_token=NULL,lease_until=NULL,next_attempt_at=?,updated_at=? WHERE business_id=? AND branch_id=? AND id=? AND revision=?")
        .bind(state, a.provider_reference ?? reference, code, new Date(Date.parse(now) + 60000).toISOString(), now, a.business_id, a.branch_id, a.id, a.revision),
        db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(:previous_row_count::integer=1)::integer").bind(token), deleteGuard(db, token));
      if (state === "succeeded" && outcome.state === "succeeded") {
        const c = await db.prepare(`${AMOUNTS} WHERE c.business_id=? AND c.branch_id=? AND c.id=?`).bind(a.business_id, a.branch_id, a.charge_id).first<{ customer_id: string; cancelled_at: string | null; total_minor: number; paid_minor: number; refunded_minor: number; reserved_minor: number; revision: number }>();
        if (!c) throw be1Error("NOT_FOUND");
        const id = opaqueId("payment"), ownReservation = ["created", "pending", "retry", "reconciliation"].includes(a.state) ? a.amount_minor : 0;
        const canAllocate = !c.cancelled_at && c.total_minor - c.paid_minor + c.refunded_minor - c.reserved_minor + ownReservation >= a.amount_minor;
        statements.push(db.prepare("INSERT INTO payments(id,business_id,branch_id,customer_id,amount_minor,method,source,attempt_id,account_id,provider_reference,recorded_by,recorded_at,occurred_at) VALUES(?,?,?,?,?,'other','provider',?,?,?,?,?,?)")
          .bind(id, a.business_id, a.branch_id, c.customer_id, a.amount_minor, a.id, a.account_id, outcome.providerReference, a.created_by, now, outcome.occurredAt));
        if (canAllocate) statements.push(db.prepare("INSERT INTO payment_allocations(business_id,branch_id,payment_id,charge_id,amount_minor) VALUES(?,?,?,?,?)").bind(a.business_id, a.branch_id, id, a.charge_id, a.amount_minor));
        else { ledger = "reconciliation"; code = "unallocated-payment"; }
        // A late valid success is still received money. An unallocatable receipt is held for review.
        statements.push(db.prepare("UPDATE charges SET revision=revision+1,updated_at=? WHERE business_id=? AND branch_id=? AND id=? AND revision=?").bind(now, a.business_id, a.branch_id, a.charge_id, c.revision),
          db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(:previous_row_count::integer=1)::integer").bind(token), deleteGuard(db, token));
      } else if (state !== a.state) statements.push(db.prepare("UPDATE charges SET revision=revision+1,updated_at=? WHERE business_id=? AND branch_id=? AND id=?").bind(now, a.business_id, a.branch_id, a.charge_id));
      statements.push(db.prepare("INSERT INTO payment_attempt_events(id,business_id,branch_id,attempt_id,kind,failure_code,occurred_at) VALUES(?,?,?,?,?,?,?)").bind(opaqueId("pae"), a.business_id, a.branch_id, a.id, state, code, now));
    }
    statements.push(db.prepare("INSERT INTO payment_webhook_events(account_id,event_id,business_id,event_hash,attempt_id,state,normalized_event_json,failure_code,received_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(account.id, event.eventId, account.businessId, digest, a?.id ?? null, ledger, JSON.stringify(event), code, now));
    try { await batch(db, statements); }
    catch (error) {
      if (error instanceof BackendConflict && ["idempotency", "version-conflict"].includes(error.reason) && retries < 2) return this.apply(account, event, digest, retries + 1);
      throw error;
    }
  }
  async drain(limit = 10) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw be1Error("INVALID_INPUT");
    const now = this.clock(), ids = await this.repo.rows<{ id: string }>("SELECT id FROM payment_attempts WHERE state IN ('created','pending','retry') AND next_attempt_at<=? AND (lease_until IS NULL OR lease_until<=?) ORDER BY next_attempt_at,id LIMIT ?", now, now, limit);
    for (const { id } of ids) await this.dispatch(id); return { examined: ids.length };
  }
  private async dispatch(id: string) {
    const now = this.clock(), db = this.db, lease = opaqueId("paylease");
    const claimed = await batch(db, [db.prepare("UPDATE payment_attempts SET state='retry',lease_token=?,lease_until=?,attempts=attempts+1,revision=revision+1,updated_at=? WHERE id=? AND state IN ('created','pending','retry') AND next_attempt_at<=? AND (lease_until IS NULL OR lease_until<=?)")
      .bind(lease, new Date(Date.parse(now) + 60000).toISOString(), now, id, now, now)]);
    if (claimed[0].meta?.changes !== 1) return;
    const a = await db.prepare("SELECT * FROM payment_attempts WHERE id=? AND lease_token=?").bind(id, lease).first<AttemptRow>(); if (!a) return;
    let outcome: ProviderOutcome = { state: "unknown", code: "provider-unavailable" }, account: ProviderAccount | null = null;
    try {
      account = await this.account(a.account_id); const adapter = await this.resolve(account);
      if (adapter && adapter.provider === account.provider) {
        if (a.attempts === 1) {
          const allowed = await db.prepare(`SELECT 1 FROM persons p JOIN business_memberships m ON m.person_id=p.id JOIN businesses b ON b.id=m.business_id JOIN branches br ON br.business_id=b.id WHERE p.id=? AND p.status='active' AND m.business_id=? AND m.status='active' AND b.status='active' AND br.id=? AND br.status='active' AND (m.role='OWNER' OR EXISTS(SELECT 1 FROM membership_branch_access g WHERE g.business_id=m.business_id AND g.membership_id=m.id AND g.branch_id=br.id AND g.status='active'))`).bind(a.created_by, a.business_id, a.branch_id).first();
          outcome = allowed ? await adapter.create(this.intent(a)) : { state: "failed", code: "authorization-revoked" };
        } else outcome = await adapter.reconcile(this.intent(a), a.provider_reference);
      }
    } catch { outcome = { state: "unknown", code: "provider-unavailable" }; }
    if (outcome.state !== "unknown" && account) {
      const event = parseProviderEvent({ eventId: `worker-${lease}`, externalAccountId: account.externalAccountId, attemptId: a.id, outcome });
      // A webhook may have settled during the network call; apply() rechecks revision and terminal state.
      await this.apply(account, event, await hash(event)); return;
    }
    const code = safeFailureCode(outcome.state === "unknown" ? outcome.code : "provider-unavailable"), state = a.attempts >= 8 ? "reconciliation" : "retry";
    await batch(db, [db.prepare("UPDATE payment_attempts SET state=?,failure_code=?,lease_token=NULL,lease_until=NULL,next_attempt_at=?,revision=revision+1,updated_at=? WHERE id=? AND lease_token=? AND revision=? AND state='retry'")
      .bind(state, code, new Date(Date.parse(now) + Math.min(3600000, 15000 * 2 ** a.attempts)).toISOString(), now, a.id, lease, a.revision),
      db.prepare("INSERT INTO payment_attempt_events(id,business_id,branch_id,attempt_id,kind,failure_code,occurred_at) SELECT ?,?,?,?,?,?,? WHERE :previous_row_count::integer=1").bind(opaqueId("pae"), a.business_id, a.branch_id, a.id, state, code, now)]);
  }
}
