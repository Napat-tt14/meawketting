import { readBusinessSession } from "../be1/configurationCache";
import type { ExecutionView, OperationDirectory, ServiceRecordView, StaffView } from "./contracts";
import { executionId } from "./domain";

// Authorized response cache only. No storage, fixtures, inferred grants or writes.
const entries = new Map<string, OperationDirectory>();
const key = (businessId: string, branchId: string) => `${readBusinessSession()?.person.id ?? ""}\u0000${businessId}\u0000${branchId}`;
function emit() { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("meawketting:business-state")); }
export function installOperations(businessId: string, branchId: string, data: OperationDirectory) {
  if ([...data.executions.map((e) => e.record), ...data.records, ...data.rooms].some((r) => r.businessId !== businessId || r.branchId !== branchId)
    || data.staff.some((s) => s.businessId !== businessId || !s.branchIds.includes(branchId))) throw new Error("Operations response scope mismatch");
  entries.set(key(businessId, branchId), structuredClone(data)); emit();
}
export function readOperationDirectory(businessId: string, branchId: string) { return entries.get(key(businessId, branchId)) ?? null; }
export function readOperationDirectories() {
  return (readBusinessSession()?.workspaces ?? []).flatMap((w) => w.permittedBranches.flatMap((b) => {
    const entry = readOperationDirectory(w.business.id, b.id); return entry ? [entry] : [];
  }));
}
export function readExecutions() { return readOperationDirectories().flatMap((d) => d.executions); }
export function readExecution(id: string) { return readExecutions().find((e) => executionId(e) === id) ?? null; }
export function readOperationStaff() {
  const result = new Map<string, StaffView>();
  for (const staff of readOperationDirectories().flatMap((d) => d.staff)) {
    const previous = result.get(staff.staffId);
    result.set(staff.staffId, { ...staff, branchIds: [...new Set([...(previous?.branchIds ?? []), ...staff.branchIds])] });
  }
  return [...result.values()];
}
export function readServiceRecords(): ServiceRecordView[] { return readOperationDirectories().flatMap((d) => d.records); }
export function patchExecution(value: ExecutionView) {
  const r = value.record, current = readOperationDirectory(r.businessId, r.branchId);
  if (!current) return;
  const found = current.executions.findIndex((e) => executionId(e) === executionId(value));
  if (found < 0) current.executions.push(value);
  else if (current.executions[found].record.revision <= r.revision) current.executions[found] = value;
  emit();
}
export function patchStaff(value: StaffView) {
  for (const workspace of readBusinessSession()?.workspaces ?? []) for (const branch of workspace.permittedBranches) {
    const entry = readOperationDirectory(workspace.business.id, branch.id);
    if (!entry || workspace.business.id !== value.businessId) continue;
    entry.staff = entry.staff.flatMap((s) => s.staffId !== value.staffId || s.revision > value.revision ? [s]
      : value.branchIds.includes(branch.id) ? [structuredClone(value)] : []);
  }
  for (const branchId of value.branchIds) {
    const entry = readOperationDirectory(value.businessId, branchId);
    if (entry && !entry.staff.some((s) => s.staffId === value.staffId)) entry.staff.push(value);
  }
  emit();
}
export function patchServiceRecord(value: ServiceRecordView) {
  const entry = readOperationDirectory(value.businessId, value.branchId);
  if (!entry) return;
  entry.records = entry.records.filter((r) => r.serviceRecordId !== value.serviceRecordId).concat(value); emit();
}
export function clearOperationsCache() { entries.clear(); emit(); }
