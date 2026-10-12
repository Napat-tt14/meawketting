import { readBusinessSession } from "../be1/configurationCache";
import { businessCommand, invalidateBusinessData } from "../shared/client";
import type { Be4Operation, Be4Result, ExecutionView, OperationDirectory, ServiceRecordView, StaffView } from "./contracts";
import { executionId, isCompleted } from "./domain";
import { invalidateBe3Catalog } from "../be3/bookingCache";
import { installOperations, operationsComplete, operationScopeKey, patchOperationPage, patchExecution, patchServiceRecord, patchStaff, readOperationDirectory, readOperationDirectories } from "./operationsCache";

const queues = new Map<string, Promise<unknown>>(), loading = new Map<string, Promise<void>>();
const filteredReads = new Map<string, number>(), filteredRequests = new Map<string, { promise: Promise<void>; signal?: AbortSignal }>();
const generations = new Map<string, number>();
const key = operationScopeKey;
function enqueue<T>(scope: string, task: () => Promise<T>) {
  const result = (queues.get(scope) ?? Promise.resolve()).catch(() => undefined).then(task);
  const tail = result.then(() => undefined, () => undefined); queues.set(scope, tail);
  void tail.finally(() => { if (queues.get(scope) === tail) queues.delete(scope); });
  return result;
}
const request = <T extends Be4Operation>(operation: T, signal?: AbortSignal) => businessCommand<Be4Result<T>>("/api/be4", operation, signal, false);
export async function ensureOperationMetadata(businessId: string, branchId: string) {
  if (readOperationDirectory(businessId, branchId)) return;
  const scope = key(businessId, branchId), generation = generations.get(scope) ?? 0;
  const result = await request({ type: "operations.metadata", businessId, branchId });
  if (scope === key(businessId, branchId) && generation === (generations.get(scope) ?? 0)) patchOperationPage(businessId, branchId, result);
}
export function loadFilteredOperations(businessId: string, branchId: string, filter: { date?: string; customerId?: string; module?: ExecutionView["kind"] }, signal?: AbortSignal) {
  const id = JSON.stringify([key(businessId, branchId), filter]);
  signal?.throwIfAborted();
  const pending = filteredRequests.get(id); if (pending && !pending.signal?.aborted) return pending.promise;
  if (Date.now() - (filteredReads.get(id) ?? 0) < 60_000) return Promise.resolve();
  const task = (async () => {
  const scope = key(businessId, branchId), generation = generations.get(scope) ?? 0;
  let afterId = "";
  for (let page = 0; page < 10_000; page++) {
    const data = await request({ type: "operations.list", businessId, branchId, ...filter, afterId, limit: 100 }, signal);
    signal?.throwIfAborted();
    if (scope !== key(businessId, branchId) || generation !== (generations.get(scope) ?? 0)) throw new DOMException("Operations read became stale", "AbortError");
    if (data.executions.length > 100 || data.executions.some((e, i) => executionId(e) <= afterId || (i > 0 && executionId(e) <= executionId(data.executions[i - 1])))) throw new Error("Operations pagination made no progress");
    patchOperationPage(businessId, branchId, data);
    if (data.executions.length < 100) { filteredReads.set(id, Date.now()); return; }
    const next = executionId(data.executions.at(-1)!); if (next <= afterId) throw new Error("Operations pagination made no progress"); afterId = next;
  }
  throw new Error("Operations directory is too large");
  })().finally(() => { if (filteredRequests.get(id)?.promise === task) filteredRequests.delete(id); });
  filteredRequests.set(id, { promise: task, signal }); return task;
}
export async function refreshExecution(businessId: string, branchId: string, executionId: string) { const value = await request({ type: "operations.get", businessId, branchId, executionId }); patchExecution(value); return value; }
export async function refreshBookingOperations(businessId: string, branchId: string, bookingId: string, signal?: AbortSignal) {
  if (!readOperationDirectory(businessId, branchId)) return;
  const value = await request({ type: "operations.list", businessId, branchId, bookingId, limit: 200 }, signal);
  patchOperationPage(businessId, branchId, value);
}
async function hydrate(businessId: string, branchId: string) {
  const actorId = readBusinessSession()?.person.id;
  let afterId = "";
  const data: OperationDirectory = { executions: [], records: [], staff: [], rooms: [] };
  for (let page = 0; page < 10000; page++) {
    const next = await request({ type: "operations.list", businessId, branchId, afterId, limit: 100 });
    if (next.executions.length > 100 || next.executions.some((e, i) => executionId(e) <= afterId || (i > 0 && executionId(e) <= executionId(next.executions[i - 1])))) throw new Error("Operations pagination made no progress");
    data.executions.push(...next.executions); data.records.push(...next.records); data.staff = next.staff; data.rooms = next.rooms;
    if (next.executions.length < 100) {
      if (actorId !== readBusinessSession()?.person.id) throw new Error("Identity changed during load");
      installOperations(businessId, branchId, data); return;
    }
    const cursor = executionId(next.executions.at(-1)!);
    if (cursor <= afterId) throw new Error("Operations pagination made no progress");
    afterId = cursor;
  }
  throw new Error("Operations directory is too large");
}
export function ensureDurableOperations(businessId: string, branchId: string, force = false) {
  const scope = key(businessId, branchId);
  if (!force && operationsComplete(businessId, branchId)) return Promise.resolve();
  const pending = loading.get(scope); if (pending) return pending;
  const result = enqueue(scope, () => hydrate(businessId, branchId)).finally(() => loading.delete(scope)); loading.set(scope, result); return result;
}
export function mutateOperations<T extends Exclude<Be4Operation, { type: "operations.get" | "operations.list" | "operations.metadata" }>>(operation: T) {
  const value: Exclude<Be4Operation, { type: "operations.get" | "operations.list" | "operations.metadata" }> = operation;
  const input = value.type === "operations.change" ? value.input : value;
  const scope = key(input.businessId, input.branchId);
  return enqueue(scope, async () => {
    const previousBranches = value.type === "staff.save" ? readOperationDirectories().flatMap(d => d.staff)
      .filter(s => s.businessId === value.businessId && s.staffId === value.draft.staffId).flatMap(s => s.branchIds) : [];
    const result = await request(operation);
    generations.set(scope, (generations.get(scope) ?? 0) + 1);
    if (scope !== key(input.businessId, input.branchId)) return result;
    if (value.type === "operations.change") patchExecution(result as ExecutionView);
    else if (value.type === "staff.save") {
      const staff = result as StaffView; patchStaff(staff);
      for (const branchId of new Set([...previousBranches, ...staff.branchIds])) {
        const affected = key(staff.businessId, branchId);
        if (affected !== scope) generations.set(affected, (generations.get(affected) ?? 0) + 1);
        invalidateBe3Catalog(staff.businessId, branchId);
      }
    }
    else patchServiceRecord(result as ServiceRecordView);
    if (value.type === "operations.change" && isCompleted(result as ExecutionView)) {
      try { patchOperationPage(input.businessId, input.branchId, await request({ type: "operations.list", businessId: input.businessId, branchId: input.branchId, executionId: value.input.executionId, limit: 1 })); } catch { /* Keep the acknowledged execution. */ }
    }
    invalidateBusinessData(input.businessId, value.type === "staff.save" ? ["operations", "catalog"]
      : value.type === "record.correct" || (value.type === "operations.change" && value.input.change.type === "note") ? ["operations", "crm"] : ["operations", "home", "crm", "reports"]);
    return result;
  });
}
