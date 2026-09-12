import { be1Error } from "../be1/errors";
import type { D1DatabaseLike } from "../be1/repository";
import { validateId } from "../be1/validation";
import { batch, deleteGuard, findReceipt } from "../shared/database";
import { BackendConflict, conflict } from "../shared/errors";
import { hash, opaqueId } from "../shared/validation";
import { D1Be5Repository } from "./d1Repository";
import { parseGrantInput } from "./validation";

/** Guardian channel boundary. Never exposed by the Business command router.
 * A provider must authenticate Person independently; LINE identity alone is insufficient.
 * Provisioning verified authority/Passport data is a separate, unimplemented integration.
 */
export class GuardianGrantService {
  private readonly repository: D1Be5Repository;
  constructor(private readonly db: D1DatabaseLike, private readonly mode: "dev-test" | "verified-provider" = "verified-provider", private readonly clock = () => new Date().toISOString()) {
    this.repository = new D1Be5Repository(db, mode);
  }
  private authorityGuard(id: string, personId: string, authorityId: string, petId: string) {
    return this.db.prepare(`INSERT INTO backend_guards(id,allowed) SELECT ?,EXISTS(SELECT 1 FROM pet_authorities a JOIN persons p ON p.id=a.person_id
      WHERE a.id=? AND a.pet_id=? AND a.person_id=? AND a.role='primary' AND a.status='active' AND p.status='active' AND (a.source='verified-provider' OR ?='dev-test'))`)
      .bind(id, authorityId, petId, personId, this.mode);
  }
  async issue(personId: string, raw: unknown, requestKey: string): Promise<{ grantId: string; token: string | null; replayed: boolean }> {
    personId = validateId(personId); requestKey = validateId(requestKey);
    const input = parseGrantInput(raw), now = this.clock(), digest = await hash({ personId, input });
    const authority = await this.db.prepare(`SELECT a.id FROM pet_authorities a JOIN persons p ON p.id=a.person_id JOIN passport_profiles f ON f.pet_id=a.pet_id
      WHERE a.pet_id=? AND a.person_id=? AND a.role='primary' AND a.status='active' AND p.status='active' AND (a.source='verified-provider' OR ?='dev-test')`)
      .bind(input.petId, personId, this.mode).first<{ id: string }>();
    if (!authority) throw be1Error("FORBIDDEN");
    const replay = async () => {
      const previous = await findReceipt(this.db, input.businessId, "guardian.issue", requestKey);
      if (!previous) return null;
      if (previous.branchId !== input.branchId || previous.requestHash !== digest) conflict("idempotency");
      // A lost issuance response cannot recover a plaintext credential from storage.
      return { grantId: previous.targetId, token: null, replayed: true };
    };
    const previous = await replay(); if (previous) return previous;
    const token = `tb_${btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")}`;
    const grantId = opaqueId("grant"), consentId = opaqueId("consent"), guard = opaqueId("authority");
    try {
      await batch(this.db, [this.authorityGuard(guard, personId, authority.id, input.petId),
        this.db.prepare(`INSERT INTO backend_guards(id,allowed) SELECT ?,EXISTS(SELECT 1 FROM branches br JOIN businesses b ON b.id=br.business_id WHERE br.business_id=? AND br.id=? AND b.status='active' AND br.status='active')`).bind(`${guard}-recipient`, input.businessId, input.branchId),
        this.db.prepare("INSERT INTO consents(id,business_id,branch_id,authority_id,pet_id,status,decided_at,created_at) VALUES(?,?,?,?,?,?,?,?)")
          .bind(consentId, input.businessId, input.branchId, authority.id, input.petId, input.pending ? "pending" : "approved", input.pending ? null : now, now),
        this.db.prepare("INSERT INTO access_grants(id,business_id,branch_id,consent_id,token_hash,purpose,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)")
          .bind(grantId, input.businessId, input.branchId, consentId, await hash(token), input.purpose, new Date(Date.parse(now) + input.durationMinutes * 60000).toISOString(), now),
        ...input.scope.map((scope) => this.db.prepare("INSERT INTO access_grant_scopes(grant_id,scope) VALUES(?,?)").bind(grantId, scope)),
        this.db.prepare("INSERT INTO access_events(id,business_id,branch_id,grant_id,kind,actor_person_id,metadata_json,occurred_at) VALUES(?,?,?,?,'issued',?,?,?)")
          .bind(opaqueId("event"), input.businessId, input.branchId, grantId, personId, JSON.stringify({ scope: input.scope, pending: input.pending }), now),
        this.db.prepare("INSERT INTO backend_mutations(business_id,branch_id,command,request_key,request_hash,target_id,actor_person_id,created_at) VALUES(?,?,'guardian.issue',?,?,?,?,?)")
          .bind(input.businessId, input.branchId, requestKey, digest, grantId, personId, now), deleteGuard(this.db, `${guard}-recipient`), deleteGuard(this.db, guard)]);
    } catch (error) { if (error instanceof BackendConflict && error.reason === "idempotency") { const raced = await replay(); if (raced) return raced; } throw error; }
    return { grantId, token, replayed: false };
  }
  async decide(personId: string, businessId: string, branchId: string, grantId: string, decision: "approved" | "denied" | "revoke", expectedRevision: number, requestKey: string) {
    [personId, businessId, branchId, grantId, requestKey].forEach(validateId);
    if (!["approved", "denied", "revoke"].includes(decision) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw be1Error("INVALID_INPUT");
    const grant = await this.repository.grant(businessId, branchId, grantId), now = this.clock();
    if (!grant || grant.authority_person_id !== personId) throw be1Error("NOT_FOUND");
    if (grant.authority_status !== "active" || grant.person_status !== "active" || (grant.authority_source === "dev-test" && this.mode !== "dev-test")) throw be1Error("FORBIDDEN");
    const digest = await hash({ personId, grantId, decision, expectedRevision });
    const replay = async () => {
      const previous = await findReceipt(this.db, businessId, "guardian.decide", requestKey);
      if (!previous) return false;
      if (previous.requestHash !== digest || previous.branchId !== branchId) conflict("idempotency");
      return true;
    };
    if (await replay()) return;
    if (grant.revision !== expectedRevision) conflict("version-conflict");
    if (decision !== "revoke" && (grant.consent_status !== "pending" || this.repository.gate(grant, now) !== "awaiting-owner")) conflict("invalid-transition");
    const guard = opaqueId("decision");
    try { await batch(this.db, [this.authorityGuard(guard, personId, grant.authority_id, grant.pet_id),
      ...(decision === "revoke" ? [] : [this.repository.guard(grant, now, `${guard}-expiry`, false)]),
      this.db.prepare("UPDATE access_grants SET revision=revision+1,revoked_at=CASE WHEN ?='revoke' THEN coalesce(revoked_at,?) ELSE revoked_at END WHERE business_id=? AND branch_id=? AND id=? AND revision=?")
        .bind(decision, now, businessId, branchId, grantId, expectedRevision),
      this.db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,changes()=1").bind(`${guard}-version`),
      ...(decision === "revoke" ? [] : [this.db.prepare("UPDATE consents SET status=?,decided_at=?,revision=revision+1 WHERE business_id=? AND branch_id=? AND id=? AND status='pending'").bind(decision, now, businessId, branchId, grant.consent_id)]),
      this.repository.event(grant, personId, decision, now),
      this.db.prepare("INSERT INTO backend_mutations(business_id,branch_id,command,request_key,request_hash,target_id,actor_person_id,created_at) VALUES(?,?,'guardian.decide',?,?,?,?,?)")
        .bind(businessId, branchId, requestKey, digest, grantId, personId, now),
      ...(decision === "revoke" ? [] : [deleteGuard(this.db, `${guard}-expiry`)]), deleteGuard(this.db, `${guard}-version`), deleteGuard(this.db, guard)]);
    } catch (error) {
      if (error instanceof BackendConflict && ["idempotency", "version-conflict"].includes(error.reason) && await replay()) return;
      throw error;
    }
  }
}
