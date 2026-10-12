import { BE1_DEV_ACTOR_HEADER, BE1_DEV_OWNER_PERSON_ID } from "../be1/contracts";
import { clearBusinessSession, readBusinessSession } from "../be1/configurationCache";
import type { BusinessReadScope } from "./readScope";

export class BusinessRequestError extends Error {
  constructor(readonly code: string, readonly reason: string | undefined, message: string, readonly status?: number, readonly retryAfterMs?: number) { super(message); }
}
export type ProjectionTarget = "booking" | "operations" | "catalog" | "crm" | "reports" | "home" | "billing" | "inbox";
export type BusinessInvalidationEvent = CustomEvent<string> & { targets?: readonly ProjectionTarget[] };
export function invalidatesProjection(event: Event, targets?: readonly ProjectionTarget[]) {
  const affected = (event as BusinessInvalidationEvent).targets; return !affected || !targets || targets.some(target => affected.includes(target));
}
export function invalidateBusinessData(businessId: string, targets?: readonly ProjectionTarget[]) {
  if (typeof window !== "undefined") window.dispatchEvent(Object.assign(new CustomEvent("meawketting:business-data-invalidated", { detail: businessId }), { targets }));
}
const readFailures = new Map<string, BusinessRequestError>(), cooldowns = new Map<string, number>();
export function clearBusinessReadFailures() { readFailures.clear(); }
export function matchesBusinessReadScope(businessId: string, permission: BusinessReadScope) {
  const session = readBusinessSession(), workspace = session?.workspaces.find(w => w.business.id === businessId);
  return Boolean(session && workspace && permission.personId === session.person.id && permission.membershipId === workspace.membership.id
    && permission.role === workspace.membership.role && permission.membershipUpdatedAt === workspace.membership.updatedAt
    && permission.branches.every(branch => workspace.permittedBranches.some(b => b.id === branch.id && b.updatedAt === branch.updatedAt)));
}
export async function businessCommand<T>(path: string, operation: unknown, signal?: AbortSignal, notifyMutation = true): Promise<T> {
  signal?.throwIfAborted();
  const op = operation as { type?: string; businessId?: string; branchId?: string; input?: { businessId?: string } };
  const read = Boolean(op.type?.endsWith(".get") || op.type?.endsWith(".list") || op.type?.endsWith(".summary") || op.type === "operations.metadata");
  const requestSession = readBusinessSession();
  const transportKey = `${requestSession?.person.id ?? ""}:${path}`;
  const scope = `${transportKey}:${op.businessId ?? ""}:${op.branchId ?? ""}`;
  if (read && readFailures.has(scope)) throw readFailures.get(scope)!;
  if (read && (cooldowns.get(transportKey) ?? 0) > Date.now()) throw new BusinessRequestError("RATE_LIMITED", undefined, "กรุณารอก่อนโหลดใหม่", 429, cooldowns.get(transportKey)! - Date.now());
  const headers = new Headers({ "content-type": "application/json", "x-correlation-id": crypto.randomUUID() });
  if (process.env.NODE_ENV !== "production") headers.set(BE1_DEV_ACTOR_HEADER, BE1_DEV_OWNER_PERSON_ID);
  const deadline = AbortSignal.timeout(20_000);
  const response = await fetch(path, { method: "POST", headers, body: JSON.stringify(operation), credentials: "same-origin", cache: "no-store", signal: signal ? AbortSignal.any([signal, deadline]) : deadline });
  const retryAfter = response.headers.get("retry-after");
  const retryAfterMs = retryAfter === null ? undefined : Math.max(0, /^\d+(\.\d+)?$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now());
  const body = await response.json() as { ok: true; data: T } | { ok: false; error: { code: string; reason?: string; message: string } };
  if (!body.ok) {
    const error = new BusinessRequestError(body.error.code, body.error.reason, body.error.message, response.status, Number.isFinite(retryAfterMs) ? retryAfterMs : undefined);
    if (read && [401, 403].includes(response.status)) readFailures.set(scope, error);
    if (response.status === 429) cooldowns.set(transportKey, Date.now() + (error.retryAfterMs ?? 60_000));
    throw error;
  }
  if (!response.ok) throw new BusinessRequestError("TRANSPORT_ERROR", undefined, "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
  if (read) {
    const session = readBusinessSession(), actor = response.headers.get("x-meawketting-person-id");
    if (session !== requestSession) throw new DOMException("Session changed during read", "AbortError");
    const permission = (body.data as { readScope?: BusinessReadScope } | null)?.readScope;
    if ((actor && actor !== session?.person.id) || (permission && !matchesBusinessReadScope(op.businessId ?? "", permission))) {
      clearBusinessSession(); throw new BusinessRequestError("FORBIDDEN", undefined, "สิทธิ์มีการเปลี่ยนแปลง กรุณายืนยันบัญชีอีกครั้ง", 403);
    }
  }
  if (notifyMutation && !read && op.type !== "conversation.read" && (op.businessId || op.input?.businessId)) invalidateBusinessData(op.businessId ?? op.input!.businessId!);
  return body.data;
}
