import { be1Error } from "../be1/errors";
import { validateId } from "../be1/validation";
import { choice, integer, object, string } from "../shared/validation";
import type { Be8Operation } from "./contracts";

function date(value: unknown) {
  if (value === undefined || value === "") return undefined;
  const d = string(value, 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(`${d}T00:00:00Z`)) || new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) !== d) throw be1Error("INVALID_INPUT"); return d;
}
export function parseBe8Operation(raw: unknown): Be8Operation {
  const v = object(raw), scope = { businessId: validateId(v.businessId), branchId: validateId(v.branchId) }, type = choice(v.type, ["reports.get", "crm.list", "crm.get"] as const);
  if (type === "reports.get") {
    const o = v.options === undefined ? {} : object(v.options), customStartDate = date(o.customStartDate), customEndDate = date(o.customEndDate);
    if (customStartDate && customEndDate && Math.abs(Date.parse(customStartDate) - Date.parse(customEndDate)) > 366 * 86400000) throw be1Error("INVALID_INPUT");
    return { ...scope, type, options: { dateRangePreset: choice(o.dateRangePreset ?? "today", ["today", "7d", "30d", "custom"] as const), branchScope: choice(o.branchScope ?? "current", ["current", "all"] as const), customStartDate, customEndDate } };
  }
  if (type === "crm.list") return { ...scope, type, afterId: v.afterId ? validateId(v.afterId) : "", limit: v.limit === undefined ? 50 : integer(v.limit, 1, 50) };
  let before: { at: string; id: string } | undefined;
  if (v.before !== undefined) { const b = object(v.before); before = { at: string(b.at, 40, true), id: string(b.id, 240, true) }; if (!Number.isFinite(Date.parse(before.at))) throw be1Error("INVALID_INPUT"); }
  return { ...scope, type, customerId: validateId(v.customerId), before };
}
