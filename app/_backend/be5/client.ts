import { readBusinessSession } from "../be1/configurationCache";
import { ensureDurableOperations } from "../be4/client";
import { businessCommand, BusinessRequestError } from "../shared/client";
import type { AccessView, Be5Operation, Be5Scope, IntakeResult, IntakeView } from "./contracts";

const entries = new Map<string, IntakeResult>(), leases = new Map<string, number>(), queues = new Map<string, Promise<unknown>>();
const keys = new Map<string, string>();
const key = (scope: Be5Scope, id: string) => `${readBusinessSession()?.person.id ?? ""}\u0000${scope.businessId}\u0000${scope.branchId}\u0000${id}`;
const request = <T>(op: Be5Operation) => businessCommand<T>("/api/be5", op);
function enqueue<T>(id: string, task: () => Promise<T>) {
  const result = (queues.get(id) ?? Promise.resolve()).catch(() => undefined).then(task);
  const tail = result.then(() => undefined, () => undefined); queues.set(id, tail);
  void tail.finally(() => { if (queues.get(id) === tail) queues.delete(id); }); return result;
}
function install(scope: Be5Scope, result: IntakeResult, actorId: string | undefined) {
  if (actorId !== readBusinessSession()?.person.id || result.record.businessId !== scope.businessId || result.record.branchId !== scope.branchId
    || result.access.businessId !== scope.businessId || result.access.branchId !== scope.branchId || result.record.accessId !== result.access.id) throw new Error("Intake response scope changed");
  const id = key(scope, result.record.id); entries.set(id, result);
  leases.set(id, performance.now() + Math.max(0, Math.min(6000, Date.parse(result.access.expiresAt) - Date.parse(result.access.checkedAt))));
  return result;
}
export function readCachedIntake(scope: Be5Scope, intakeId: string) {
  const permitted = readBusinessSession()?.workspaces.some((w) => w.business.id === scope.businessId && w.permittedBranches.some((b) => b.id === scope.branchId));
  if (!permitted) return null;
  const id = key(scope, intakeId), result = entries.get(id);
  if (!result) return null;
  return (leases.get(id) ?? 0) > performance.now() ? result : { ...result, passport: null };
}
export function scanTemporaryAccess(scope: Be5Scope, value: string) { return request<AccessView>({ ...scope, type: "access.scan", value }); }
export async function startDurableIntake(scope: Be5Scope, value: string, executionId: string | null) {
  const actor = readBusinessSession()?.person.id, fingerprint = JSON.stringify([actor, scope, value, executionId]);
  const requestKey = keys.get(fingerprint) ?? `intake_${crypto.randomUUID()}`; keys.set(fingerprint, requestKey);
  const result = await request<IntakeResult>({ ...scope, type: "intake.start", value, executionId, requestKey });
  keys.delete(fingerprint); return install(scope, result, actor);
}
export function loadDurableIntake(scope: Be5Scope, intakeId: string) {
  const actor = readBusinessSession()?.person.id, id = key(scope, intakeId);
  return enqueue(id, async () => {
    try { return install(scope, await request<IntakeResult>({ ...scope, type: "intake.get", intakeId }), actor); }
    catch (error) { leases.delete(id); throw error; }
  });
}
type Edit = { type: "intake.update"; belongings: string[]; businessNote: string; taskState: "allowed-data" | "intake" | "review" }
  | { type: "intake.correct"; topic: "name" | "species" | "passport-reference"; suggestedValue: string; note: string }
  | { type: "intake.receive" };
export function mutateDurableIntake(scope: Be5Scope, intakeId: string, edit: Edit) {
  const actor = readBusinessSession()?.person.id, id = key(scope, intakeId);
  return enqueue(id, async () => {
    const current = entries.get(id); if (!current) throw new Error("Intake is not loaded");
    const payload = { ...scope, intakeId, ...edit, expectedRevision: current.record.revision };
    const fingerprint = JSON.stringify([actor, payload]), requestKey = keys.get(fingerprint) ?? `intake_${crypto.randomUUID()}`; keys.set(fingerprint, requestKey);
    try {
      const result = install(scope, await request<IntakeResult>({ ...payload, requestKey }), actor); keys.delete(fingerprint);
      if (edit.type === "intake.receive") try { await ensureDurableOperations(scope.businessId, scope.branchId, true); } catch { /* Intake commit remains successful. */ }
      return result;
    } catch (error) {
      leases.delete(id);
      if (error instanceof BusinessRequestError && error.code === "CONFLICT") keys.delete(fingerprint);
      throw error;
    }
  });
}
export function saveDurableIntake(record: IntakeView) {
  if (record.taskState === "complete") throw new Error("Use the receive command to complete Intake");
  return mutateDurableIntake(record, record.id, { type: "intake.update", belongings: record.belongings, businessNote: record.businessNote, taskState: record.taskState });
}
export function intakeAccessGate(access: AccessView | null, scope: Be5Scope) {
  if (!access) return "invalid";
  if (access.businessId !== scope.businessId || access.branchId !== scope.branchId) return "wrong-business";
  if (access.status === "expired" || access.status === "revoked") return access.status;
  return ["active", "awaiting-owner"].includes(access.status) ? "valid" : "invalid";
}
