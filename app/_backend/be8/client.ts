import { readBusinessSession, readCachedBusiness } from "../be1/configurationCache";
import { businessCommand, BusinessRequestError, invalidatesProjection } from "../shared/client";
import { businessTimezone } from "../shared/businessClock";
import { emptyCrm, emptyReport } from "./projections";
import type { BillingSummary, HomeSummary, CrmListOptions, CrmPage, CrmView, ReportOptions, ReportView } from "./contracts";

type Scope = { businessId: string; branchId: string };
const reports = new Map<string, ReportView>(), crm = new Map<string, { generatedAt: string; value: CrmView }>(), details = new Map<string, { generatedAt: string; value: CrmView }>(), pending = new Map<string, Promise<void>>();
const pendingSignals = new Map<string, AbortSignal | undefined>(), reportReads = new Map<string, { loadedAt: number; generation: number }>();
const pages = new Map<string, { value: CrmPage; loadedAt: number }>(), pageRequests = new Map<string, { promise: Promise<CrmPage>; signal?: AbortSignal }>(), generations = new Map<string, number>();
const summaries = new Map<string, { value: BillingSummary | HomeSummary; loadedAt: number; generation: number }>();
const projectionGenerations = new Map<string, number>();
const projectionGeneration = (businessId: string, projection: "reports" | "home" | "billing") => projectionGenerations.get(`${businessId}:${projection}`) ?? 0;
let eventTarget: Window | undefined;
function watchInvalidations() {
  if (typeof window === "undefined" || eventTarget === window) return;
  eventTarget = window;
  window.addEventListener("meawketting:business-data-invalidated", event => {
    const id = (event as CustomEvent<string>).detail;
    if (invalidatesProjection(event, ["crm"])) generations.set(id, (generations.get(id) ?? 0) + 1);
    for (const projection of ["reports", "home", "billing"] as const) if (invalidatesProjection(event, [projection])) projectionGenerations.set(`${id}:${projection}`, projectionGeneration(id, projection) + 1);
  });
}
function key(scope: Scope) {
  const s = readBusinessSession(), w = s?.workspaces.find((w) => w.business.id === scope.businessId);
  if (!s || !w || w.membership.status !== "active" || !w.permittedBranches.some((b) => b.id === scope.branchId)) return null;
  return JSON.stringify([s.person.id, scope.businessId, scope.branchId, w.membership.id, w.membership.role, w.membership.updatedAt, w.permittedBranches.map((b) => [b.id, b.updatedAt]).sort()]);
}
export { key as crmScopeKey };
const summaryKey = (scope: Scope, home: boolean) => `${key(scope)}:${home ? "home" : "billing"}`;
export function readHomeSummary(scope: Scope): HomeSummary | null {
  return key(scope) ? structuredClone(summaries.get(summaryKey(scope, true))?.value as HomeSummary ?? null) : null;
}
export function readBillingSummary(scope: Scope): BillingSummary | null {
  return key(scope) ? structuredClone(summaries.get(summaryKey(scope, false))?.value ?? readHomeSummary(scope)) : null;
}
export function ensureDurableSummary(scope: Scope, home: boolean, read: { force?: boolean; signal?: AbortSignal } = {}) {
  watchInvalidations(); read.signal?.throwIfAborted();
  const scopeKey = key(scope); if (!scopeKey) return Promise.reject(new BusinessRequestError("FORBIDDEN", undefined, "Summary scope unavailable", 403));
  const id = summaryKey(scope, home), cached = summaries.get(id), generation = projectionGeneration(scope.businessId, home ? "home" : "billing");
  if (read.force === false && cached && Date.now() - cached.loadedAt < 60_000 && cached.generation === generation) return Promise.resolve();
  return load(id, async () => {
    const value = await businessCommand<BillingSummary | HomeSummary>("/api/be8", { type: home ? "home.summary" : "billing.summary", ...scope }, read.signal);
    if (read.signal?.aborted || key(scope) !== scopeKey) return;
    summaries.set(id, { value, loadedAt: Date.now(), generation }); announce();
  }, read.signal);
}
function reportKey(scope: Scope, options: ReportOptions) { return `${key(scope)}:${JSON.stringify({ dateRangePreset: options.dateRangePreset ?? "today", branchScope: options.branchScope ?? "current", customStartDate: options.customStartDate ?? "", customEndDate: options.customEndDate ?? "" })}`; }
function announce() { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("meawketting:business-state")); }
function load(id: string, task: () => Promise<void>, signal?: AbortSignal) { const old = pending.get(id); if (old && !pendingSignals.get(id)?.aborted) return old; const next = task().finally(() => { if (pending.get(id) === next) { pending.delete(id); pendingSignals.delete(id); } }); pending.set(id, next); pendingSignals.set(id, signal); return next; }
export function readReport(scope: Scope, options: ReportOptions = {}): ReportView {
  const value = key(scope) ? reports.get(reportKey(scope, options)) : null;
  return structuredClone(value ?? emptyReport(options, new Date().toISOString(), businessTimezone(scope), readCachedBusiness(scope.businessId)?.name, ""));
}
export function ensureDurableReport(scope: Scope, options: ReportOptions = {}, read: { force?: boolean; signal?: AbortSignal } = {}) {
  watchInvalidations(); read.signal?.throwIfAborted();
  const scopeKey = key(scope); if (!scopeKey) return Promise.reject(new BusinessRequestError("FORBIDDEN", undefined, "Reports scope unavailable", 403)); const id = reportKey(scope, options);
  if (read.force === false && reports.has(id) && Date.now() - (reportReads.get(id)?.loadedAt ?? 0) < 60_000 && reportReads.get(id)?.generation === projectionGeneration(scope.businessId, "reports")) return Promise.resolve();
  return load(id, async () => { const generation = projectionGeneration(scope.businessId, "reports"); const value = await businessCommand<ReportView>("/api/be8", { type: "reports.get", ...scope, options }, read.signal); if (read.signal?.aborted || key(scope) !== scopeKey) return; reports.set(id, value); reportReads.set(id, { loadedAt: Date.now(), generation }); announce(); }, read.signal);
}
export function readCrm(scope: Scope | undefined, customerId: string): CrmView {
  const scopeKey = scope ? key(scope) : null, id = `${scopeKey}:${customerId}`, list = scopeKey ? crm.get(id) : null, detail = scopeKey ? details.get(id) : null;
  const latest = detail && (!list || detail.generatedAt >= list.generatedAt) ? detail : list;
  return structuredClone(latest ? { ...latest.value, timeline: detail?.value.timeline ?? [], timelineNext: detail?.value.timelineNext ?? null } : { profile: emptyCrm(customerId), upcoming: [], timeline: [], timelineNext: null });
}
function pageKey(scope: Scope, options: CrmListOptions) { return JSON.stringify([key(scope), generations.get(scope.businessId) ?? 0, options.afterId ?? "", options.offset, options.query?.trim() ?? "", options.segment ?? "all", options.limit ?? 50]); }
export function loadCrmPage(scope: Scope, options: CrmListOptions = {}, read: { force?: boolean; signal?: AbortSignal } = {}): Promise<CrmPage> {
  watchInvalidations(); read.signal?.throwIfAborted();
  const scopeKey = key(scope); if (!scopeKey) return Promise.reject(new BusinessRequestError("FORBIDDEN", undefined, "CRM scope unavailable", 403));
  const id = pageKey(scope, options), cached = pages.get(id), old = pageRequests.get(id);
  if (old && !old.signal?.aborted) return old.promise;
  if (!read.force && cached && Date.now() - cached.loadedAt < 60_000) return Promise.resolve(structuredClone(cached.value));
  const promise = (async () => {
    const page = await businessCommand<CrmPage>("/api/be8", { type: "crm.list", ...scope, ...options, limit: options.limit ?? 50 }, read.signal);
    read.signal?.throwIfAborted();
    if (key(scope) !== scopeKey || pageKey(scope, options) !== id) throw new DOMException("CRM scope changed", "AbortError");
    const after = options.afterId ?? "";
    if (page.items.length > (options.limit ?? 50) || new Set(page.items.map(v => v.profile.customerId)).size !== page.items.length
      || (options.offset === undefined && (page.items.some((v, i) => v.profile.customerId <= after || (i > 0 && v.profile.customerId <= page.items[i - 1].profile.customerId)) || (page.nextAfterId && (!page.items.length || page.nextAfterId <= after || page.nextAfterId !== page.items.at(-1)!.profile.customerId))))
      || (options.offset !== undefined && page.nextOffset != null && (!page.items.length || !Number.isSafeInteger(page.nextOffset) || page.nextOffset !== options.offset + page.items.length))) throw new Error("CRM pagination made no progress");
    if (page.customers?.some(c => c.businessId !== scope.businessId || !page.items.some(v => v.profile.customerId === c.id))) throw new Error("CRM customer scope changed");
    for (const value of page.items) crm.set(`${scopeKey}:${value.profile.customerId}`, { generatedAt: page.generatedAt, value });
    pages.set(id, { value: structuredClone(page), loadedAt: Date.now() });
    if (pages.size > 100) pages.delete(pages.keys().next().value!);
    announce(); return page;
  })().finally(() => { if (pageRequests.get(id)?.promise === promise) pageRequests.delete(id); });
  pageRequests.set(id, { promise, signal: read.signal }); return promise;
}
export function ensureDurableCrm(scope: Scope, customerId?: string, read: { signal?: AbortSignal } = {}) {
  watchInvalidations(); read.signal?.throwIfAborted();
  if (!customerId) return loadCrmPage(scope, {}, read).then(() => undefined);
  const scopeKey = key(scope); if (!scopeKey) return Promise.reject(new BusinessRequestError("FORBIDDEN", undefined, "CRM scope unavailable", 403));
  return load(`${scopeKey}:crm:${customerId ?? "list"}`, async () => {
    if (customerId) {
      const page = await businessCommand<CrmPage>("/api/be8", { type: "crm.get", ...scope, customerId }, read.signal);
      if (read.signal?.aborted || key(scope) !== scopeKey) return;
      details.set(`${scopeKey}:${customerId}`, { generatedAt: page.generatedAt, value: page.items[0] });
    }
    announce();
  }, read.signal);
}
