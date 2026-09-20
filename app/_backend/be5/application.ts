import type { PersonView } from "../be1/contracts";
import type { RequestMetadata } from "../be1/metadata";
import type { Be1Repository } from "../be1/repository";
import { be1Error } from "../be1/errors";
import { PostgresBe2Repository } from "../be2/postgresRepository";
import { PostgresBe3Repository } from "../be3/postgresRepository";
import { Be4Application } from "../be4/application";
import { PostgresBe4Repository } from "../be4/postgresRepository";
import { changeExecution } from "../be4/domain";
import { BusinessApplication } from "../shared/application";
import { authorizationGuard, batch, deleteGuard, findReceipt } from "../shared/database";
import { BackendConflict, conflict } from "../shared/errors";
import { hash, opaqueId } from "../shared/validation";
import type { Be5Operation, IntakeResult, AccessView } from "./contracts";
import { PostgresBe5Repository, type GrantRow } from "./postgresRepository";
import { parseBe5Operation } from "./validation";

export class Be5Application extends BusinessApplication {
  constructor(private readonly auth: Be1Repository, private readonly intakes: PostgresBe5Repository, private readonly clock = () => new Date().toISOString()) { super(auth); }
  async executeBe5(actor: PersonView, raw: Be5Operation, metadata: RequestMetadata): Promise<IntakeResult | AccessView> {
    const op = parseBe5Operation(raw), now = this.clock(), repo = this.intakes, db = repo.database;
    const context = await this.scope(actor, op.businessId, op.branchId, metadata, now, !["intake.get", "access.scan"].includes(op.type));
    const active = (grant: GrantRow, allowPending = false) => {
      const state = repo.gate(grant, now);
      if (state === "expired" || state === "revoked") conflict(state);
      if (state !== "active" && !(allowPending && state === "awaiting-owner")) conflict("intake-required");
    };
    const get = async (id: string) => {
      const row = await repo.intake(op.businessId, op.branchId, id); if (!row) throw be1Error("NOT_FOUND");
      const grant = await repo.grant(op.businessId, op.branchId, row.grant_id); if (!grant) throw be1Error("NOT_FOUND");
      return { row, grant };
    };
    if (op.type === "access.scan") {
      const grant = await repo.grant(op.businessId, op.branchId, await hash(op.value), true); if (!grant) throw be1Error("NOT_FOUND");
      // Scan exposes recipient/consent metadata, never Passport fields or Pet IDs.
      return repo.access(grant, now);
    }
    if (op.type === "intake.get") {
      const { row, grant } = await get(op.intakeId), result = await repo.result(row, grant, now);
      if (result.passport) {
        const token = opaqueId("view");
        await batch(db, [authorizationGuard(db, context, op.branchId, token), repo.guard(grant, now, `${token}-grant`),
          repo.event(grant, context.actor.id, "passport.viewed", now, { intakeId: row.id, scope: grant.scope }), deleteGuard(db, `${token}-grant`), deleteGuard(db, token)]);
      }
      return result;
    }
    const digest = await hash({ actorId: context.actor.id, op }), receipt = (id: string) => ({ command: op.type, requestKey: op.requestKey, requestHash: digest, targetId: id });
    const replay = async () => {
      const prior = await findReceipt(db, op.businessId, op.type, op.requestKey); if (!prior) return null;
      if (prior.branchId !== op.branchId || prior.requestHash !== digest) conflict("idempotency");
      const { row, grant } = await get(prior.targetId); active(grant, op.type === "intake.start"); return repo.result(row, grant, now);
    };
    const previous = await replay(); if (previous) return previous;
    let targetId: string;
    try {
      if (op.type === "intake.start") {
        const grant = await repo.grant(op.businessId, op.branchId, await hash(op.value), true); if (!grant) throw be1Error("NOT_FOUND"); active(grant, true);
        const targetKey = op.executionId ?? "general", existing = await repo.existing(grant, targetKey);
        if (existing) {
          await repo.write(grant, context, receipt(existing.id), [], false, "intake.resumed");
          return repo.result(existing, grant, now);
        }
        const operations = new PostgresBe4Repository(db);
        const execution = op.executionId ? await operations.get(op.businessId, op.branchId, op.executionId) : null;
        if (op.executionId && (!execution || execution.record.petId !== grant.pet_id || ["cancelled", "no-show", "completed", "checked-out"].includes(execution.record.status))) throw be1Error("NOT_FOUND");
        // Only explicit neutral relationships match known Business records. Ambiguous contacts stay unlinked.
        const links = await repo.rows<{ customer_id: string }>(`SELECT r.customer_id FROM customer_pet_relationships r JOIN customers c ON c.business_id=r.business_id AND c.id=r.customer_id
          JOIN business_pet_profiles p ON p.business_id=r.business_id AND p.pet_id=r.pet_id WHERE r.business_id=? AND r.pet_id=? AND r.status='active' AND c.status='active' AND p.status='active' ORDER BY r.customer_id LIMIT 2`, op.businessId, grant.pet_id);
        const customerId = execution?.record.customerId ?? (links.length === 1 ? links[0].customer_id : null);
        const petId = customerId ? grant.pet_id : null;
        targetId = opaqueId("intake");
        await repo.write(grant, context, receipt(targetId), [db.prepare(`INSERT INTO business_intakes(id,business_id,branch_id,grant_id,target_key,customer_id,pet_id,execution_id,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(targetId, op.businessId, op.branchId, grant.id, targetKey, customerId, petId, op.executionId, context.actor.id, now, now)], false);
      } else {
        const { row, grant } = await get(op.intakeId); active(grant);
        if (row.revision !== op.expectedRevision) conflict("version-conflict");
        if (row.checked_in_at && op.type !== "intake.receive") conflict("invalid-transition");
        if (row.checked_in_at) return repo.result(row, grant, now);
        const statements = [], token = opaqueId("intakerevision"); targetId = row.id;
        let executionIdValue = row.execution_id;
        const operations = new PostgresBe4Repository(db);
        let executionWrite;
        if (op.type === "intake.receive") {
          if (!executionIdValue && row.customer_id && row.pet_id && context.branch.enabledModules.includes("grooming")) {
            const candidate = await db.prepare(`SELECT id FROM service_executions WHERE business_id=? AND branch_id=? AND customer_id=? AND pet_id=? AND module='grooming' AND status='booked' ORDER BY scheduled_start,id LIMIT 1`)
              .bind(op.businessId, op.branchId, row.customer_id, row.pet_id).first<{ id: string }>(); executionIdValue = candidate?.id ?? null;
          }
          if (executionIdValue) {
            const before = await operations.get(op.businessId, op.branchId, executionIdValue);
            if (!before || before.record.petId !== grant.pet_id || before.record.customerId !== row.customer_id || !context.branch.enabledModules.includes(before.kind)
              || ["cancelled", "no-show", "completed", "checked-out"].includes(before.record.status)) conflict("invalid-transition");
            const after = before.kind !== "hotel" && before.record.status === "booked" ? changeExecution(before, { type: "transition", status: "checked-in" }, now, context.actor.id) : structuredClone(before);
            if (after.record.revision === before.record.revision) { after.record.revision++; after.record.updatedAt = now; }
            after.record.intakeId = row.id;
            after.record.history.push({ id: opaqueId("event"), at: now, type: "intake", summary: "เชื่อมการรับเข้าที่ได้รับอนุญาตแล้ว" } as never);
            const planning = new PostgresBe3Repository(db), booking = await planning.getBooking(op.businessId, op.branchId, before.record.bookingId);
            if (!booking || booking.status === "cancelled") conflict("invalid-transition");
            const application = new Be4Application(this.auth, new PostgresBe2Repository(db), planning, operations, this.clock);
            const checkedStaff = await application.validateAssignments(after, booking);
            executionWrite = { before, after, context, receipt: null, checkedStaff, requireActiveSource: true };
          }
        }
        const fields = op.type === "intake.update" ? [JSON.stringify(op.belongings), op.businessNote, op.taskState, null]
          : [row.belongings_json, row.business_note, op.type === "intake.receive" ? "complete" : row.task_state, op.type === "intake.receive" ? now : null];
        statements.push(db.prepare(`UPDATE business_intakes SET belongings_json=?,business_note=?,task_state=?,checked_in_at=?,execution_id=?,revision=revision+1,updated_at=? WHERE business_id=? AND branch_id=? AND id=? AND revision=?`)
          .bind(...fields, executionIdValue, now, op.businessId, op.branchId, row.id, row.revision), db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(:previous_row_count::integer=1)::integer").bind(token));
        if (op.type === "intake.correct") {
          const passport = await repo.passport(grant, now); if (!passport) conflict("intake-required");
          if (op.topic === "passport-reference" && !grant.scope.includes("passportReference")) throw be1Error("FORBIDDEN");
          const current = op.topic === "name" ? passport.name : op.topic === "species" ? (passport.species === "cat" ? "แมว" : "สุนัข") : passport.passportLabel ?? "";
          statements.push(db.prepare("INSERT INTO intake_corrections(id,business_id,branch_id,intake_id,topic,current_value,suggested_value,note,actor_person_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
            .bind(opaqueId("suggestion"), op.businessId, op.branchId, row.id, op.topic, current, op.suggestedValue, op.note, context.actor.id, now));
        }
        if (executionWrite) statements.push(...operations.statements(executionWrite, opaqueId("receive")));
        statements.push(deleteGuard(db, token));
        await repo.write(grant, context, receipt(targetId), statements);
      }
    } catch (error) {
      if (error instanceof BackendConflict && ["version-conflict", "idempotency"].includes(error.reason)) { const raced = await replay(); if (raced) return raced; }
      if (op.type === "intake.start" && error instanceof BackendConflict && error.reason === "version-conflict") {
        const grant = await repo.grant(op.businessId, op.branchId, await hash(op.value), true);
        const existing = grant ? await repo.existing(grant, op.executionId ?? "general") : null;
        if (grant && existing) {
          active(grant, true); await repo.write(grant, context, receipt(existing.id), [], false, "intake.resumed"); return repo.result(existing, grant, now);
        }
      }
      throw error;
    }
    const { row, grant } = await get(targetId); return repo.result(row, grant, now);
  }
}
