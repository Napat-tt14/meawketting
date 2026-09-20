import type { AuthorizedMutation, Database, PreparedStatement } from "../be1/repository";
import { be1Error } from "../be1/errors";
import { authorizationGuard, auditStatement, batch, deleteGuard, receiptStatement, type MutationReceipt } from "../shared/database";
import { opaqueId } from "../shared/validation";
import type { ShareableScopeKey } from "../../_prototype/sharingState";
import type { AccessView, GrantedPassport, IntakeResult, IntakeView } from "./contracts";

export type GrantRow = { id: string; business_id: string; branch_id: string; consent_id: string; token_hash: string; purpose: string; expires_at: string; revoked_at: string | null;
  revision: number; created_at: string; pet_id: string; authority_id: string; authority_person_id: string; authority_status: string; authority_source: string; person_status: string;
  consent_status: string; decided_at: string | null; scope: ShareableScopeKey[] };
export type IntakeRow = { id: string; business_id: string; branch_id: string; grant_id: string; target_key: string; customer_id: string | null; pet_id: string | null;
  execution_id: string | null; belongings_json: string; business_note: string; task_state: IntakeView["taskState"]; checked_in_at: string | null;
  created_by: string; revision: number; created_at: string; updated_at: string; staff_name: string; module: string | null };
const GRANT = `SELECT g.*,c.pet_id,c.authority_id,c.status consent_status,c.decided_at,a.person_id authority_person_id,CASE WHEN a.role='primary' THEN a.status ELSE 'inactive' END authority_status,a.source authority_source,p.status person_status
  FROM access_grants g JOIN consents c ON c.business_id=g.business_id AND c.branch_id=g.branch_id AND c.id=g.consent_id
  JOIN pet_authorities a ON a.id=c.authority_id AND a.pet_id=c.pet_id JOIN persons p ON p.id=a.person_id`;
const INTAKE = `SELECT i.*,p.display_name staff_name,e.module FROM business_intakes i JOIN persons p ON p.id=i.created_by
  LEFT JOIN service_executions e ON e.business_id=i.business_id AND e.branch_id=i.branch_id AND e.id=i.execution_id`;

export class PostgresBe5Repository {
  constructor(readonly database: Database, readonly authorityMode: "dev-test" | "verified-provider" = "verified-provider") {}
  async rows<T>(sql: string, ...bindings: unknown[]) { const r = await this.database.prepare(sql).bind(...bindings).all<T>(); if (r.success === false) throw be1Error("PERSISTENCE_ERROR"); return r.results ?? []; }
  async grant(businessId: string, branchId: string, value: string, byHash = false): Promise<GrantRow | null> {
    const row = await this.database.prepare(`${GRANT} WHERE g.business_id=? AND g.branch_id=? AND g.${byHash ? "token_hash" : "id"}=?`).bind(businessId, branchId, value).first<Omit<GrantRow, "scope">>();
    if (!row) return null;
    const scopes = await this.rows<{ scope: ShareableScopeKey }>("SELECT scope FROM access_grant_scopes WHERE grant_id=? ORDER BY scope", row.id);
    return { ...row, scope: scopes.map((s) => s.scope) };
  }
  gate(grant: GrantRow, now: string): AccessView["status"] {
    if (grant.revoked_at || grant.authority_status !== "active" || grant.person_status !== "active" || (grant.authority_source === "dev-test" && this.authorityMode !== "dev-test")) return "revoked";
    if (grant.expires_at <= now) return "expired";
    return grant.consent_status === "approved" ? "active" : grant.consent_status === "pending" ? "awaiting-owner" : "denied";
  }
  async access(grant: GrantRow, now: string): Promise<AccessView> {
    const events = await this.rows<{ id: string; kind: string; occurred_at: string; actor_person_id: string }>(
      "SELECT id,kind,occurred_at,actor_person_id FROM access_events WHERE business_id=? AND branch_id=? AND grant_id=? ORDER BY occurred_at DESC,sequence DESC LIMIT 100", grant.business_id, grant.branch_id, grant.id);
    return { id: grant.id, businessId: grant.business_id, branchId: grant.branch_id, purpose: grant.purpose, scope: grant.scope,
      createdAt: grant.created_at, expiresAt: grant.expires_at, status: this.gate(grant, now), consentStatus: grant.consent_status === "approved" ? "approved" : grant.consent_status === "pending" ? "additional-decision-needed" : "denied",
      requester: null, decisionAt: grant.decided_at, revokedAt: grant.revoked_at,
      events: events.map((e) => ({ id: e.id, kind: e.kind, occurredAt: e.occurred_at, actor: e.actor_person_id === grant.authority_person_id ? "guardian" : "business" })), revision: grant.revision, checkedAt: now };
  }
  intake(businessId: string, branchId: string, id: string) { return this.database.prepare(`${INTAKE} WHERE i.business_id=? AND i.branch_id=? AND i.id=?`).bind(businessId, branchId, id).first<IntakeRow>(); }
  existing(grant: GrantRow, targetKey: string) { return this.database.prepare(`${INTAKE} WHERE i.business_id=? AND i.branch_id=? AND i.grant_id=? AND i.target_key=?`).bind(grant.business_id, grant.branch_id, grant.id, targetKey).first<IntakeRow>(); }
  /** A second scoped, current-authority predicate protects the field read itself. */
  async passport(grant: GrantRow, now: string): Promise<GrantedPassport | null> {
    const row = await this.database.prepare(`SELECT p.name,p.species,p.reference FROM passport_profiles p WHERE p.pet_id=? AND ${this.grantPredicate(true)}`)
      .bind(grant.pet_id, ...this.grantBindings(grant, now)).first<{ name: string; species: "cat" | "dog"; reference: string }>();
    if (!row || !grant.scope.includes("basicIdentity")) return null;
    // Private photo bytes require an authorized media adapter; no public URL fallback.
    return { name: row.name, species: row.species, photoSrc: null, ...(grant.scope.includes("passportReference") ? { passportLabel: row.reference } : {}) };
  }
  private grantPredicate(active: boolean) {
    return `EXISTS(SELECT 1 FROM access_grants g JOIN consents c ON c.id=g.consent_id AND c.business_id=g.business_id AND c.branch_id=g.branch_id
      JOIN pet_authorities a ON a.id=c.authority_id AND a.pet_id=c.pet_id JOIN persons p ON p.id=a.person_id
      WHERE g.business_id=? AND g.branch_id=? AND g.id=? AND g.revision=? AND g.revoked_at IS NULL AND g.expires_at>greatest(?,to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
      AND c.status ${active ? "='approved'" : "IN ('pending','approved')"} AND a.role='primary' AND a.status='active' AND p.status='active' AND (a.source='verified-provider' OR ?='dev-test'))`;
  }
  private grantBindings(grant: GrantRow, now: string) { return [grant.business_id, grant.branch_id, grant.id, grant.revision, now, this.authorityMode]; }
  guard(grant: GrantRow, now: string, id: string, active = true) { return this.database.prepare(`INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(${this.grantPredicate(active)})::integer`).bind(id, ...this.grantBindings(grant, now)); }
  event(grant: GrantRow, personId: string, kind: string, now: string, metadata: Record<string, unknown> = {}) { return this.database.prepare("INSERT INTO access_events(id,business_id,branch_id,grant_id,kind,actor_person_id,metadata_json,occurred_at) VALUES(?,?,?,?,?,?,?,?)")
    .bind(opaqueId("access-event"), grant.business_id, grant.branch_id, grant.id, kind, personId, JSON.stringify(metadata), now); }
  async result(row: IntakeRow, grant: GrantRow, now: string): Promise<IntakeResult> {
    const active = this.gate(grant, now) === "active", passport = active ? await this.passport(grant, now) : null;
    const corrections = passport ? await this.rows<{ id: string; topic: "name" | "species" | "passport-reference"; current_value: string; suggested_value: string; note: string; created_at: string }>(
      "SELECT * FROM intake_corrections WHERE business_id=? AND branch_id=? AND intake_id=? ORDER BY created_at DESC,sequence DESC LIMIT 1", row.business_id, row.branch_id, row.id) : [];
    const c = corrections[0];
    return { access: await this.access(grant, now), passport, record: {
      id: row.id, businessId: row.business_id, branchId: row.branch_id, accessId: row.grant_id,
      customerId: passport ? row.customer_id : null, petRelationshipId: passport ? row.pet_id : null, serviceJobId: passport && row.module === "grooming" ? row.execution_id : null,
      hotelStayId: passport && row.module === "hotel" ? row.execution_id : null, daycareAttendanceId: passport && row.module === "daycare" ? row.execution_id : null,
      role: "พนักงานรับเข้า", staffLabel: row.staff_name, servicePurpose: grant.purpose, sharedScope: grant.scope,
      belongings: JSON.parse(row.belongings_json), businessNote: row.business_note, taskState: row.task_state, checkInState: row.checked_in_at ? "checked-in" : "draft",
      checkedInAt: row.checked_in_at, createdAt: row.created_at, updatedAt: row.updated_at, prototypeSessionReference: row.checked_in_at ? row.id : null, revision: row.revision,
      correctionSuggestion: c ? { id: c.id, topic: c.topic, currentValue: c.current_value, suggestedValue: c.suggested_value, note: c.note, submittedAt: c.created_at, status: "submitted" } : null,
    } };
  }
  async write(grant: GrantRow, context: AuthorizedMutation, receipt: MutationReceipt, statements: PreparedStatement[], active = true, action = receipt.command) {
    const token = opaqueId("intakewrite"), db = this.database;
    await batch(db, [authorizationGuard(db, context, grant.branch_id, token), this.guard(grant, context.occurredAt, `${token}-grant`, active), ...statements,
      receiptStatement(db, context, grant.branch_id, receipt), this.event(grant, context.actor.id, action, context.occurredAt, { targetId: receipt.targetId }),
      auditStatement(db, context, grant.branch_id, action, "intake", receipt.targetId, null, { grantId: grant.id }), deleteGuard(db, `${token}-grant`), deleteGuard(db, token)]);
  }
}
