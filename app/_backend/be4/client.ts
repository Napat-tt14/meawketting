import { readBusinessSession } from "../be1/configurationCache";
import { businessCommand } from "../shared/client";
import type { Be4Operation, Be4Result, ExecutionView, OperationDirectory, ServiceRecordView, StaffView } from "./contracts";
import { executionId } from "./domain";
import { installOperations, patchExecution, patchServiceRecord, patchStaff, readOperationDirectory } from "./operationsCache";

const queues = new Map<string, Promise<unknown>>(), loading = new Map<string, Promise<void>>();
const key = (businessId: string, branchId: string) => `${readBusinessSession()?.person.id ?? ""}\u0000${businessId}\u0000${branchId}`;
function enqueue<T>(scope: string, task: () => Promise<T>) {
  const result = (queues.get(scope) ?? Promise.resolve()).catch(() => undefined).then(task);
  const tail = result.then(() => undefined, () => undefined); queues.set(scope, tail);
  void tail.finally(() => { if (queues.get(scope) === tail) queues.delete(scope); });
  return result;
}
const request = <T extends Be4Operation>(operation: T) => businessCommand<Be4Result<T>>("/api/be4", operation);
async function hydrate(businessId: string, branchId: string) {
  const actorId = readBusinessSession()?.person.id;
  let afterId = "";
  const data: OperationDirectory = { executions: [], records: [], staff: [], rooms: [] };
  for (let page = 0; page < 10000; page++) {
    const next = await request({ type: "operations.list", businessId, branchId, afterId, limit: 100 });
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
  if (!force && readOperationDirectory(businessId, branchId)) return Promise.resolve();
  const pending = loading.get(scope); if (pending) return pending;
  const result = enqueue(scope, () => hydrate(businessId, branchId)).finally(() => loading.delete(scope)); loading.set(scope, result); return result;
}
export function mutateOperations<T extends Exclude<Be4Operation, { type: "operations.get" | "operations.list" }>>(operation: T) {
  const value: Exclude<Be4Operation, { type: "operations.get" | "operations.list" }> = operation;
  const input = value.type === "operations.change" ? value.input : value;
  return enqueue(key(input.businessId, input.branchId), async () => {
    const result = await request(operation);
    if (value.type === "operations.change") patchExecution(result as ExecutionView);
    else if (value.type === "staff.save") patchStaff(result as StaffView);
    else patchServiceRecord(result as ServiceRecordView);
    // Commit success remains success if the subsequent projection refresh fails.
    try { await hydrate(input.businessId, input.branchId); } catch { /* A later reload retries the read. */ }
    return result;
  });
}
