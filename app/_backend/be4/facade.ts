import type * as Prototype from "../../_prototype/businessState";
import type { DemoBusinessContext } from "../../_prototype/businessState";
import { BusinessRequestError } from "../shared/client";
import { ensureDurableOperations, mutateOperations } from "./client";
import type { ExecutionChange } from "./contracts";
import { readExecution, readOperationStaff } from "./operationsCache";

type Failure = { ok: false; reason: string; message: string; availability?: { conflicts: { message: string }[] } };
const pendingKeys = new Map<string, string>();
function failure(error: unknown): Failure {
  const reason = error instanceof BusinessRequestError ? error.reason ?? (error.code === "NOT_FOUND" ? "missing" : error.code === "FORBIDDEN" ? "wrong-context" : "storage") : "storage";
  const message = reason === "version-conflict" ? "รายการเปลี่ยนจากอีกหน้าจอ กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก" : error instanceof Error ? error.message : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง";
  return { ok: false, reason, message, availability: { conflicts: [{ message }] } };
}
async function change(id: string, input: ExecutionChange, context: DemoBusinessContext | null | undefined) {
  if (!context) return failure(new BusinessRequestError("FORBIDDEN", "wrong-context", "กรุณาเลือกสาขาก่อนบันทึก"));
  const value = readExecution(id);
  if (!value || value.record.businessId !== context.businessId || value.record.branchId !== context.branchId) return failure(new BusinessRequestError("NOT_FOUND", "missing", "ไม่พบรายการในสาขาปัจจุบัน"));
  const payload = { businessId: context.businessId, branchId: context.branchId, executionId: id, expectedRevision: value.record.revision, change: input };
  const fingerprint = JSON.stringify(payload), requestKey = pendingKeys.get(fingerprint) ?? `be4_${crypto.randomUUID()}`;
  pendingKeys.set(fingerprint, requestKey);
  try {
    const result = await mutateOperations({ type: "operations.change", input: { ...payload, requestKey } });
    pendingKeys.delete(fingerprint);
    return { ok: true as const, value: result, duplicate: input.type === "transition" && value.record.status === input.status };
  } catch (error) {
    if (error instanceof BusinessRequestError && error.reason === "version-conflict") {
      pendingKeys.delete(fingerprint);
      try { await ensureDurableOperations(context.businessId, context.branchId, true); } catch { /* Keep the typed failure. */ }
    }
    return failure(error);
  }
}
async function grooming(id: string, input: ExecutionChange, context: DemoBusinessContext | null | undefined) {
  const result = await change(id, input, context);
  if (!result.ok) return result;
  if (result.value.kind !== "grooming") return failure(new Error("Unexpected execution type"));
  return { ok: true as const, job: result.value.record, duplicate: result.duplicate };
}
async function hotel(id: string, input: ExecutionChange, context: DemoBusinessContext | null | undefined) {
  const result = await change(id, input, context);
  if (!result.ok) return result;
  if (result.value.kind !== "hotel") return failure(new Error("Unexpected execution type"));
  return { ok: true as const, stay: result.value.record, duplicate: result.duplicate };
}
async function daycare(id: string, input: ExecutionChange, context: DemoBusinessContext) {
  const result = await change(id, input, context);
  if (!result.ok) return result;
  if (result.value.kind !== "daycare") return failure(new Error("Unexpected execution type"));
  return { ok: true as const, attendance: result.value.record, duplicate: result.duplicate };
}
export const transitionPrototypeGroomingServiceJob = async (...[id, status, context]: Parameters<typeof Prototype.transitionPrototypeGroomingServiceJob>) => grooming(id, { type: "transition", status }, context);
export const assignPrototypeGroomingServiceJobResources = async (...[id, resourceIds, context]: Parameters<typeof Prototype.assignPrototypeGroomingServiceJobResources>) => grooming(id, { type: "grooming-resources", resourceIds: [...resourceIds] }, context);
export async function updatePrototypeGroomingServiceJobNote(...[id, note, context]: Parameters<typeof Prototype.updatePrototypeGroomingServiceJobNote>) {
  const r = await grooming(id, { type: "note", note }, context); return r.ok ? r.job : null;
}
export const transitionPrototypeHotelStay = async (...[id, status, context]: Parameters<typeof Prototype.transitionPrototypeHotelStay>) => hotel(id, { type: "transition", status }, context);
export async function checkInPrototypeHotelStay(...[id, context]: Parameters<typeof Prototype.checkInPrototypeHotelStay>) {
  const value = readExecution(id);
  if (!value?.record.intakeId) return failure(new BusinessRequestError("CONFLICT", "intake-required", "ต้องทำ Intake ที่มีสิทธิ์ก่อนรับเข้า"));
  return hotel(id, { type: "transition", status: "checked-in" }, context);
}
export const assignPrototypeHotelStayRoom = async (...[id, roomId, context]: Parameters<typeof Prototype.assignPrototypeHotelStayRoom>) => hotel(id, { type: "hotel-room", roomId, effectiveDate: null, reason: "" }, context);
export const movePrototypeHotelStayRoom = async (...[id, roomId, context, reason = "", effectiveDate]: Parameters<typeof Prototype.movePrototypeHotelStayRoom>) => hotel(id, { type: "hotel-room", roomId, effectiveDate: effectiveDate ?? null, reason }, context);
export const assignPrototypeHotelCareTaskStaff = async (...[id, taskId, staffId, context]: Parameters<typeof Prototype.assignPrototypeHotelCareTaskStaff>) => hotel(id, { type: "hotel-care-staff", taskId, staffId }, context);
export async function updatePrototypeHotelStayNote(...[id, note, context]: Parameters<typeof Prototype.updatePrototypeHotelStayNote>) {
  const r = await hotel(id, { type: "note", note }, context); return r.ok ? r.stay : null;
}
export async function completePrototypeHotelCareTask(...[id, taskId, context]: Parameters<typeof Prototype.completePrototypeHotelCareTask>) {
  const r = await hotel(id, { type: "hotel-care-complete", taskId }, context); return r.ok ? r.stay : null;
}
export async function addPrototypeHotelIncidentNote(...[id, summary, context, severity = "attention"]: Parameters<typeof Prototype.addPrototypeHotelIncidentNote>) {
  const r = await hotel(id, { type: "hotel-incident", summary, severity }, context); return r.ok ? r.stay : null;
}
export async function resolvePrototypeHotelIncidentNote(...[id, incidentId, context]: Parameters<typeof Prototype.resolvePrototypeHotelIncidentNote>) {
  const r = await hotel(id, { type: "hotel-incident-resolve", incidentId }, context); return r.ok ? r.stay : null;
}
export const transitionPrototypeDaycareAttendance = async (...[id, status, context]: Parameters<typeof Prototype.transitionPrototypeDaycareAttendance>) => daycare(id, { type: "transition", status }, context);
export const assignPrototypeDaycareZone = async (...[id, zoneId, context]: Parameters<typeof Prototype.assignPrototypeDaycareZone>) => daycare(id, { type: "daycare-zone", zoneId }, context);
export const assignPrototypeDaycareStaff = async (...[id, staffId, context]: Parameters<typeof Prototype.assignPrototypeDaycareStaff>) => daycare(id, { type: "daycare-staff", staffId }, context);
export async function updatePrototypeDaycareNote(...[id, note, context]: Parameters<typeof Prototype.updatePrototypeDaycareNote>) {
  const r = await daycare(id, { type: "note", note }, context); return r.ok ? r.attendance : null;
}
export async function addPrototypeDaycareCareEvent(...[id, kind, note, context]: Parameters<typeof Prototype.addPrototypeDaycareCareEvent>) {
  const r = await daycare(id, { type: "daycare-care", kind, note }, context); return r.ok ? r.attendance : null;
}
async function saveStaff(draft: Prototype.PrototypeTeamMemberDraft, context: DemoBusinessContext) {
  const previous = draft.staffId ? readOperationStaff().find((s) => s.staffId === draft.staffId) : null;
  const payload = { type: "staff.save" as const, businessId: context.businessId, branchId: context.branchId, draft, expectedRevision: previous?.revision ?? null };
  const fingerprint = JSON.stringify(payload), requestKey = pendingKeys.get(fingerprint) ?? `be4_${crypto.randomUUID()}`; pendingKeys.set(fingerprint, requestKey);
  try {
    const member = await mutateOperations({ ...payload, requestKey }); pendingKeys.delete(fingerprint);
    return { ok: true as const, member, created: !previous };
  } catch (error) { return failure(error); }
}
export const createPrototypeTeamMember = async (...[draft, context]: Parameters<typeof Prototype.createPrototypeTeamMember>) => saveStaff({ ...draft, staffId: undefined }, context);
export const updatePrototypeTeamMember = async (...[staffId, draft, context]: Parameters<typeof Prototype.updatePrototypeTeamMember>) => saveStaff({ ...draft, staffId }, context);
export async function setPrototypeTeamMemberActive(...[staffId, active, context]: Parameters<typeof Prototype.setPrototypeTeamMemberActive>) {
  const previous = readOperationStaff().find((s) => s.staffId === staffId);
  return previous ? saveStaff({ ...previous, active }, context) : failure(new Error("ไม่พบพนักงาน"));
}
