import { readBusinessSession, readCachedBusiness } from "../be1/configurationCache";
import { businessCommand } from "../shared/client";
import { businessTimezone } from "../shared/businessClock";
import { emptyCrm, emptyReport } from "./projections";
import type { CrmPage, CrmView, ReportOptions, ReportView } from "./contracts";

type Scope = { businessId: string; branchId: string };
const reports = new Map<string, ReportView>(), crm = new Map<string, { generatedAt: string; value: CrmView }>(), details = new Map<string, { generatedAt: string; value: CrmView }>(), pending = new Map<string, Promise<void>>();
function key(scope: Scope) {
  const s = readBusinessSession(), w = s?.workspaces.find((w) => w.business.id === scope.businessId);
  if (!s || !w || w.membership.status !== "active" || !w.permittedBranches.some((b) => b.id === scope.branchId)) return null;
  return JSON.stringify([s.person.id, scope.businessId, scope.branchId, w.membership.id, w.membership.role, w.permittedBranches.map((b) => [b.id, b.updatedAt]).sort()]);
}
function reportKey(scope: Scope, options: ReportOptions) { return `${key(scope)}:${JSON.stringify({ dateRangePreset: options.dateRangePreset ?? "today", branchScope: options.branchScope ?? "current", customStartDate: options.customStartDate ?? "", customEndDate: options.customEndDate ?? "" })}`; }
function announce() { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("meawketting:business-state")); }
function load(id: string, task: () => Promise<void>) { const old = pending.get(id); if (old) return old; const next = task().finally(() => pending.delete(id)); pending.set(id, next); return next; }
export function readReport(scope: Scope, options: ReportOptions = {}): ReportView {
  const value = key(scope) ? reports.get(reportKey(scope, options)) : null;
  return structuredClone(value ?? emptyReport(options, new Date().toISOString(), businessTimezone(scope), readCachedBusiness(scope.businessId)?.name, ""));
}
export function ensureDurableReport(scope: Scope, options: ReportOptions = {}) {
  const scopeKey = key(scope); if (!scopeKey) return Promise.reject(new Error("Reports scope unavailable")); const id = reportKey(scope, options);
  return load(id, async () => { const value = await businessCommand<ReportView>("/api/be8", { type: "reports.get", ...scope, options }); if (key(scope) !== scopeKey) return; reports.set(id, value); announce(); });
}
export function readCrm(scope: Scope | undefined, customerId: string): CrmView {
  const scopeKey = scope ? key(scope) : null, id = `${scopeKey}:${customerId}`, list = scopeKey ? crm.get(id) : null, detail = scopeKey ? details.get(id) : null;
  const latest = detail && (!list || detail.generatedAt >= list.generatedAt) ? detail : list;
  return structuredClone(latest ? { ...latest.value, timeline: detail?.value.timeline ?? [], timelineNext: detail?.value.timelineNext ?? null } : { profile: emptyCrm(customerId), upcoming: [], timeline: [], timelineNext: null });
}
export function ensureDurableCrm(scope: Scope, customerId?: string) {
  const scopeKey = key(scope); if (!scopeKey) return Promise.reject(new Error("CRM scope unavailable"));
  return load(`${scopeKey}:crm:${customerId ?? "list"}`, async () => {
    if (customerId) {
      const page = await businessCommand<CrmPage>("/api/be8", { type: "crm.get", ...scope, customerId });
      if (key(scope) !== scopeKey) return;
      details.set(`${scopeKey}:${customerId}`, { generatedAt: page.generatedAt, value: page.items[0] });
    } else {
      let afterId = ""; const items: { generatedAt: string; value: CrmView }[] = [];
      for (let n = 0; n < 10000; n++) {
        const page = await businessCommand<CrmPage>("/api/be8", { type: "crm.list", ...scope, afterId, limit: 50 });
        items.push(...page.items.map((value) => ({ generatedAt: page.generatedAt, value })));
        if (!page.nextAfterId) break;
        if (page.nextAfterId <= afterId || n === 9999) throw new Error("CRM pagination failed"); afterId = page.nextAfterId;
      }
      if (key(scope) !== scopeKey) return;
      for (const id of crm.keys()) if (id.startsWith(`${scopeKey}:`)) crm.delete(id);
      for (const item of items) crm.set(`${scopeKey}:${item.value.profile.customerId}`, item);
    }
    announce();
  });
}

/** Invalidate by refreshing the default summaries after an acknowledged financial mutation. */
export async function refreshFinancialReport(scope: Scope) { await ensureDurableReport(scope); }
