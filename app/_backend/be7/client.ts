import { readBusinessSession, readCachedMembership } from "../be1/configurationCache";
import { refreshFinancialReport } from "../be8/client";
import { businessCommand, BusinessRequestError } from "../shared/client";
import type { DemoBusinessContext, PrototypePaymentMethod } from "../../_prototype/businessState";
import type { Be7Operation, BillingMutationResult, ChargeBalanceView, FinancialPage, PaymentPage, PaymentView, RefundView } from "./contracts";

type Directory = { balances: ChargeBalanceView[]; payments: PaymentView[]; refunds: RefundView[] };
const cache = new Map<string, Directory>(), queues = new Map<string, Promise<unknown>>(), loading = new Map<string, Promise<void>>(), pending = new Map<string, string>();
function scopeKey(businessId: string, branchId: string) {
  const s = readBusinessSession(), w = s?.workspaces.find((w) => w.business.id === businessId);
  if (!s || !w || w.membership.status !== "active" || !w.permittedBranches.some((b) => b.id === branchId)) return null;
  return JSON.stringify([s.person.id, businessId, branchId, w.membership.id, w.membership.role, w.permittedBranches.map((b) => b.id).sort()]);
}
function announce() { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("meawketting:business-state")); }
function enqueue<T>(key: string, task: () => Promise<T>) {
  const result = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(task), tail = result.then(() => undefined, () => undefined); queues.set(key, tail);
  void tail.finally(() => { if (queues.get(key) === tail) queues.delete(key); }); return result;
}
export function readFinancialDirectory(businessId: string, branchId: string): Directory | null {
  const key = scopeKey(businessId, branchId); return key ? structuredClone(cache.get(key) ?? null) : null;
}
export function readAllFinancialDirectories(): Directory[] {
  return (readBusinessSession()?.workspaces ?? []).flatMap((w) => w.permittedBranches.flatMap((b) => { const d = readFinancialDirectory(w.business.id, b.id); return d ? [d] : []; }));
}
export function canManageFinance(businessId: string) { return ["OWNER", "MANAGER"].includes(readCachedMembership(businessId)?.role ?? ""); }
const request = <T>(op: Be7Operation) => businessCommand<T>("/api/be7", op);
function install(businessId: string, branchId: string, key: string, directory: Directory) {
  if (key !== scopeKey(businessId, branchId) || directory.balances.some((v) => v.charge.businessId !== businessId || v.charge.branchId !== branchId) || directory.payments.some((p) => p.businessId !== businessId || p.branchId !== branchId)) throw new Error("Financial scope changed");
  cache.set(key, structuredClone(directory)); announce();
}
async function hydrate(businessId: string, branchId: string, key: string) {
  const directory: Directory = { balances: [], payments: [], refunds: [] };
  for (const type of ["charges.list", "payments.list"] as const) {
    let afterId = "";
    for (let page = 0; page < 10000; page++) {
      const value = await request<FinancialPage | PaymentPage>({ type, businessId, branchId, afterId, limit: 50 });
      if ("balances" in value) directory.balances.push(...value.balances); else { directory.payments.push(...value.payments); directory.refunds.push(...value.refunds); }
      if (!value.nextAfterId) break;
      if (value.nextAfterId <= afterId || page === 9999) throw new Error("Financial pagination failed"); afterId = value.nextAfterId;
    }
  }
  install(businessId, branchId, key, directory);
}
export function ensureDurableBilling(businessId: string, branchId: string, force = false) {
  const key = scopeKey(businessId, branchId); if (!key) return Promise.reject(new Error("Financial scope unavailable"));
  if (!force && cache.has(key)) return Promise.resolve(); const old = loading.get(key); if (old) return old;
  const task = enqueue(key, () => hydrate(businessId, branchId, key)).finally(() => loading.delete(key)); loading.set(key, task); return task;
}
async function mutate(op: Exclude<Be7Operation, { type: "charges.list" | "payments.list" | "charge.get" }>) {
  const key = scopeKey(op.businessId, op.branchId); if (!key) throw new Error("Financial scope unavailable");
  return enqueue(key, async () => {
    const fingerprint = JSON.stringify([key, { ...op, requestKey: null }]), requestKey = pending.get(fingerprint) ?? op.requestKey; pending.set(fingerprint, requestKey);
    try {
      const result = await request<BillingMutationResult>({ ...op, requestKey }); pending.delete(fingerprint);
      const current = readFinancialDirectory(op.businessId, op.branchId) ?? { balances: [], payments: [], refunds: [] };
      current.balances = [...current.balances.filter((b) => b.charge.chargeId !== result.balance.charge.chargeId), result.balance]; install(op.businessId, op.branchId, key, current);
      // A committed payment remains a success if refreshing the history temporarily fails.
      try { await hydrate(op.businessId, op.branchId, key); await refreshFinancialReport(op); } catch { /* The normal read poll retries. */ }
      return result;
    } catch (error) {
      if (error instanceof BusinessRequestError && ["CONFLICT", "FORBIDDEN", "NOT_FOUND", "INVALID_INPUT"].includes(error.code)) {
        pending.delete(fingerprint); try { await hydrate(op.businessId, op.branchId, key); } catch { /* Preserve the last acknowledged view. */ }
      }
      throw error;
    }
  });
}
const failure = (error: unknown) => ({ ok: false as const, reason: error instanceof BusinessRequestError ? error.reason ?? error.code : "storage" });
function version(context: DemoBusinessContext, chargeId: string, expectedRevision?: number) {
  const b = readFinancialDirectory(context.businessId, context.branchId)?.balances.find((b) => b.charge.chargeId === chargeId);
  if (!b) throw new Error("Charge not loaded"); return { businessId: context.businessId, branchId: context.branchId, chargeId, expectedRevision: expectedRevision ?? b.charge.revision };
}
export async function checkoutDurableCharge(executionId: string, context: Pick<DemoBusinessContext, "businessId" | "branchId">) {
  try { const result = await mutate({ type: "charge.checkout", businessId: context.businessId, branchId: context.branchId, executionId, requestKey: crypto.randomUUID() }); return { ok: true as const, charge: result.balance.charge, created: result.created, reconciled: result.reconciled }; }
  catch (error) { return failure(error); }
}
export async function recordDurablePayment(input: { context: DemoBusinessContext; chargeId: string; amount: number; method: PrototypePaymentMethod; note: string; requestKey: string; expectedRevision?: number }) {
  try { const result = await mutate({ ...version(input.context, input.chargeId, input.expectedRevision), type: "payment.record", amount: input.amount, method: input.method, note: input.note, requestKey: input.requestKey }); return { ok: true as const, duplicate: result.replayed }; } catch (error) { return failure(error); }
}
export async function adjustDurableCharge(input: { context: DemoBusinessContext; chargeId: string; kind: "discount" | "manual-adjustment"; label: string; amount: number; reason: string; expectedRevision?: number }) {
  try { await mutate({ ...version(input.context, input.chargeId, input.expectedRevision), type: "charge.adjust", kind: input.kind, label: input.label, amount: input.amount, reason: input.reason, requestKey: crypto.randomUUID() }); return { ok: true as const }; } catch (error) { return failure(error); }
}
export async function cancelDurableCharge(chargeId: string, reason: string, context: DemoBusinessContext, expectedRevision?: number) {
  try { const result = await mutate({ ...version(context, chargeId, expectedRevision), type: "charge.cancel", reason, requestKey: crypto.randomUUID() }); return { ok: true as const, duplicate: result.replayed }; } catch (error) { return failure(error); }
}
