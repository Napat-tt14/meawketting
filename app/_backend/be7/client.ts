import { readBusinessSession, readCachedMembership } from "../be1/configurationCache";
import { businessCommand, BusinessRequestError, invalidateBusinessData } from "../shared/client";
import type { DemoBusinessContext, PrototypePaymentMethod } from "../../_prototype/businessState";
import type { Be7Operation, BillingMutationResult, ChargeBalanceView, FinancialPage, PaymentPage, PaymentView, RefundView } from "./contracts";

type Directory = { balances: ChargeBalanceView[]; payments: PaymentView[]; refunds: RefundView[] };
const cache = new Map<string, Directory>(), queues = new Map<string, Promise<unknown>>(), loading = new Map<string, Promise<void>>(), pending = new Map<string, string>();
const loadedAt = new Map<string, number>(), loadingSignals = new Map<string, AbortSignal | undefined>();
const balancesLoaded = new Set<string>(), paymentsLoadedAt = new Map<string, number>(), chargePaymentReads = new Map<string, { loadedAt: number; stamp: string }>(), chargePaymentRequests = new Map<string, { promise: Promise<void>; generation: number; stamp: string }>(), generations = new Map<string, number>();
function paymentStamp(businessId: string, branchId: string, chargeId: string) {
  const balance = readFinancialDirectory(businessId, branchId)?.balances.find(b => b.charge.chargeId === chargeId);
  return JSON.stringify([balance?.paymentCount, balance?.refunded]);
}
export function chargePaymentsReady(businessId: string, branchId: string, chargeId: string) {
  const key = scopeKey(businessId, branchId); return key !== null && chargePaymentReads.get(`${key}:${chargeId}`)?.stamp === paymentStamp(businessId, branchId, chargeId);
}
function scopeKey(businessId: string, branchId: string) {
  const s = readBusinessSession(), w = s?.workspaces.find((w) => w.business.id === businessId);
  if (!s || !w || w.membership.status !== "active" || !w.permittedBranches.some((b) => b.id === branchId)) return null;
  return JSON.stringify([s.person.id, businessId, branchId, w.membership.id, w.membership.role, w.membership.updatedAt, w.permittedBranches.map((b) => [b.id, b.updatedAt]).sort()]);
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
export function billingBalancesLoaded(businessId: string, branchId: string) { const key = scopeKey(businessId, branchId); return key !== null && balancesLoaded.has(key); }
const request = <T>(op: Be7Operation) => businessCommand<T>("/api/be7", op, undefined, false);
function install(businessId: string, branchId: string, key: string, directory: Directory) {
  if (key !== scopeKey(businessId, branchId) || directory.balances.some((v) => v.charge.businessId !== businessId || v.charge.branchId !== branchId) || directory.payments.some((p) => p.businessId !== businessId || p.branchId !== branchId)) throw new Error("Financial scope changed");
  cache.set(key, structuredClone(directory)); announce();
}
async function hydrate(businessId: string, branchId: string, key: string, signal?: AbortSignal, includePayments = true, customerId?: string) {
  const generation = generations.get(key) ?? 0, current = readFinancialDirectory(businessId, branchId);
  const directory: Directory = { balances: [], payments: includePayments ? [] : current?.payments ?? [], refunds: includePayments ? [] : current?.refunds ?? [] };
  for (const type of (includePayments ? ["charges.list", "payments.list"] : ["charges.list"]) as ("charges.list" | "payments.list")[]) {
    let afterId = "";
    for (let page = 0; page < 10000; page++) {
      const value = await businessCommand<FinancialPage | PaymentPage>("/api/be7", { type, businessId, branchId, customerId, afterId, limit: 50 }, signal);
      signal?.throwIfAborted();
      const rows = "balances" in value ? value.balances.map(b => b.charge.chargeId) : value.payments.map(p => p.paymentId);
      if (rows.length > 50 || new Set(rows).size !== rows.length || rows.some((id, i) => id <= afterId || (i > 0 && id <= rows[i - 1]))
        || (value.nextAfterId && (!rows.length || value.nextAfterId !== rows.at(-1)))) throw new Error("Financial pagination made no progress");
      if ("balances" in value) directory.balances.push(...value.balances); else { directory.payments.push(...value.payments); directory.refunds.push(...value.refunds); }
      if (!value.nextAfterId) break;
      if (value.nextAfterId <= afterId || page === 9999) throw new Error("Financial pagination failed"); afterId = value.nextAfterId;
    }
  }
  if ((generations.get(key) ?? 0) !== generation) return;
  if (customerId) {
    const old = readFinancialDirectory(businessId, branchId);
    const paymentIds = new Set(old?.payments.filter(p => p.customerId === customerId).map(p => p.paymentId));
    directory.balances = [...old?.balances.filter(b => b.charge.customerId !== customerId) ?? [], ...directory.balances];
    directory.payments = [...old?.payments.filter(p => p.customerId !== customerId) ?? [], ...directory.payments];
    directory.refunds = [...old?.refunds.filter(r => !paymentIds.has(r.paymentId)) ?? [], ...directory.refunds];
  } else { balancesLoaded.add(key); loadedAt.set(key, Date.now()); if (includePayments) paymentsLoadedAt.set(key, Date.now()); }
  install(businessId, branchId, key, directory);
  if (includePayments) for (const balance of directory.balances) {
    if (!customerId || balance.charge.customerId === customerId) chargePaymentReads.set(`${key}:${balance.charge.chargeId}`, { loadedAt: Date.now(), stamp: paymentStamp(businessId, branchId, balance.charge.chargeId) });
  }
}
export function loadCustomerBilling(businessId: string, branchId: string, customerId: string, signal?: AbortSignal) {
  const key = scopeKey(businessId, branchId); if (!key) return Promise.reject(new BusinessRequestError("FORBIDDEN", undefined, "Financial scope unavailable", 403));
  return hydrate(businessId, branchId, key, signal, true, customerId);
}
export function ensureDurableBilling(businessId: string, branchId: string, force = false, signal?: AbortSignal, includePayments = true) {
  signal?.throwIfAborted();
  const key = scopeKey(businessId, branchId); if (!key) return Promise.reject(new BusinessRequestError("FORBIDDEN", undefined, "Financial scope unavailable", 403));
  const loadKey = `${key}:${includePayments}`;
  if (!force && balancesLoaded.has(key) && (!includePayments || Date.now() - (paymentsLoadedAt.get(key) ?? 0) < 60_000) && Date.now() - (loadedAt.get(key) ?? 0) < 60_000) return Promise.resolve(); const old = loading.get(loadKey); if (old && !loadingSignals.get(loadKey)?.aborted) return old;
  const task = hydrate(businessId, branchId, key, signal, includePayments).finally(() => { if (loading.get(loadKey) === task) { loading.delete(loadKey); loadingSignals.delete(loadKey); } }); loading.set(loadKey, task); loadingSignals.set(loadKey, signal); return task;
}
export function loadChargePayments(businessId: string, branchId: string, chargeId: string, force = false) {
  const key = scopeKey(businessId, branchId); if (!key) return Promise.reject(new BusinessRequestError("FORBIDDEN", undefined, "Financial scope unavailable", 403));
  const id = `${key}:${chargeId}`, generation = generations.get(key) ?? 0, stamp = paymentStamp(businessId, branchId, chargeId), old = chargePaymentRequests.get(id); if (old && old.generation === generation && old.stamp === stamp) return old.promise;
  const cached = chargePaymentReads.get(id);
  if (!force && cached?.stamp === stamp && Date.now() - cached.loadedAt < 60_000) return Promise.resolve();
  const task = (async () => {
    const payments: PaymentView[] = [], refunds: RefundView[] = []; let afterId = "";
    for (let page = 0; page < 10_000; page++) {
      const value = await request<PaymentPage>({ type: "payments.list", businessId, branchId, chargeId, afterId, limit: 50 });
      if (value.payments.length > 50 || value.payments.some((p, i) => p.paymentId <= afterId || (i > 0 && p.paymentId <= value.payments[i - 1].paymentId))
        || (value.nextAfterId && (!value.payments.length || value.nextAfterId !== value.payments.at(-1)!.paymentId))) throw new Error("Payment pagination made no progress");
      payments.push(...value.payments); refunds.push(...value.refunds);
      if (!value.nextAfterId) break; if (page === 9999) throw new Error("Payment directory too large"); afterId = value.nextAfterId;
    }
    const current = readFinancialDirectory(businessId, branchId); if (!current || key !== scopeKey(businessId, branchId) || (generations.get(key) ?? 0) !== generation || paymentStamp(businessId, branchId, chargeId) !== stamp) return;
    const ids = new Set(payments.map(p => p.paymentId));
    current.payments = [...current.payments.filter(p => !ids.has(p.paymentId) && !p.allocations.some(a => a.chargeId === chargeId)), ...payments];
    current.refunds = [...current.refunds.filter(r => !ids.has(r.paymentId)), ...refunds];
    chargePaymentReads.set(id, { loadedAt: Date.now(), stamp }); install(businessId, branchId, key, current);
  })().finally(() => { if (chargePaymentRequests.get(id)?.promise === task) chargePaymentRequests.delete(id); }); chargePaymentRequests.set(id, { promise: task, generation, stamp }); return task;
}
async function mutate(op: Exclude<Be7Operation, { type: "charges.list" | "payments.list" | "charge.get" }>) {
  const key = scopeKey(op.businessId, op.branchId); if (!key) throw new Error("Financial scope unavailable");
  return enqueue(key, async () => {
    const fingerprint = JSON.stringify([key, { ...op, requestKey: null }]), requestKey = pending.get(fingerprint) ?? op.requestKey; pending.set(fingerprint, requestKey);
    try {
      const result = await request<BillingMutationResult>({ ...op, requestKey }); pending.delete(fingerprint);
      generations.set(key, (generations.get(key) ?? 0) + 1);
      const current = readFinancialDirectory(op.businessId, op.branchId) ?? { balances: [], payments: [], refunds: [] };
      current.balances = [...current.balances.filter((b) => b.charge.chargeId !== result.balance.charge.chargeId), result.balance];
      if (key === scopeKey(op.businessId, op.branchId)) install(op.businessId, op.branchId, key, current);
      if (key === scopeKey(op.businessId, op.branchId) && (op.type === "payment.record" || op.type === "refund.record")) {
        try { await loadChargePayments(op.businessId, op.branchId, result.balance.charge.chargeId, true); } catch { /* Keep the acknowledged balance. */ }
      }
      invalidateBusinessData(op.businessId, ["billing", "home", "crm", "reports"]);
      return result;
    } catch (error) {
      if (error instanceof BusinessRequestError && ["CONFLICT", "FORBIDDEN", "NOT_FOUND", "INVALID_INPUT"].includes(error.code)) {
        pending.delete(fingerprint);
        if ("chargeId" in op) try {
          const balance = await request<ChargeBalanceView>({ type: "charge.get", businessId: op.businessId, branchId: op.branchId, chargeId: op.chargeId });
          const current = readFinancialDirectory(op.businessId, op.branchId); if (current && key === scopeKey(op.businessId, op.branchId)) {
            current.balances = [...current.balances.filter(b => b.charge.chargeId !== op.chargeId), balance]; install(op.businessId, op.branchId, key, current);
          }
        } catch { /* Preserve the last acknowledged view. */ }
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
