import { readBusinessSession } from "../../_backend/be1/configurationCache";
import { Be1ClientError } from "../../_backend/be1/client";
import { BUSINESS_CHAT_ENABLED } from "./businessFeatures";
import { ensureKnownCustomers, getDurableCustomer } from "../../_backend/be2/client";
import { ensureDurableBookingCatalog, queryDurableBookings } from "../../_backend/be3/client";
import { loadFilteredOperations } from "../../_backend/be4/client";
import { readOperationDirectory } from "../../_backend/be4/operationsCache";
import { ensureDurableInbox, loadCustomerInbox, readInboxDirectory } from "../../_backend/be6/client";
import { ensureDurableBilling, loadCustomerBilling, readFinancialDirectory } from "../../_backend/be7/client";
import { crmScopeKey, ensureDurableReport, ensureDurableSummary, loadCrmPage } from "../../_backend/be8/client";
import { BusinessRequestError } from "../../_backend/shared/client";
import { businessToday } from "../../_backend/shared/businessClock";
import { addDays } from "../../_backend/shared/time";
import type { BookingListInput } from "../../_backend/be3/contracts";
import type { DemoBusinessContext } from "../../_prototype/businessState";
import { BUSINESS_NAVIGATION_HREFS } from "./businessNavigationModel";

const preparedPages = new Map<string, Set<string>>();
export function isBusinessPagePrepared(pathname: string, context: DemoBusinessContext) {
  const scope = crmScopeKey(context);
  return Boolean(scope && preparedPages.get(scope)?.has(pathname));
}
export function isBusinessWorkspacePrepared(context: DemoBusinessContext) {
  const scope = crmScopeKey(context);
  return Boolean(scope && preparedPages.get(scope)?.size);
}

export function businessStartupPages(context: DemoBusinessContext) {
  const branch = readBusinessSession()?.workspaces.find(w => w.business.id === context.businessId)?.permittedBranches.find(b => b.id === context.branchId);
  if (!crmScopeKey(context) || !branch) throw new Be1ClientError("FORBIDDEN", "ไม่สามารถเปิดสาขานี้ได้");
  return BUSINESS_NAVIGATION_HREFS.filter(href => !["grooming", "hotel", "daycare"].includes(href.split("/")[2]) || branch.enabledModules.some(module => href === `/business/${module}`));
}

/** Warm the current branch once; CRM stays paged and conversation history stays lazy. */
export async function prepareBusinessWorkspace(context: DemoBusinessContext, signal: AbortSignal, onPrepared: (pathname: string) => void = () => {}) {
  const scope = crmScopeKey(context);
  let failed: unknown;
  for (const pathname of businessStartupPages(context)) {
    signal.throwIfAborted();
    if (crmScopeKey(context) !== scope) throw new DOMException("Workspace scope changed", "AbortError");
    if (isBusinessPagePrepared(pathname, context)) continue;
    try {
      if (pathname === "/business/customers") await loadCrmPage(context, { offset: 0, query: "", segment: "all" }, { signal });
      if (pathname === "/business/reports") {
        const today = businessToday(context);
        await ensureDurableReport(context, { dateRangePreset: "today", branchScope: "current", customStartDate: addDays(today, -6), customEndDate: today }, { force: false, signal });
      }
      await ensureBusinessPageData(pathname, context, signal);
      onPrepared(pathname);
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof Error && error.name === "AbortError") throw error;
      if (error instanceof Be1ClientError && error.status === 429) throw new BusinessRequestError("RATE_LIMITED", undefined, error.message, 429, error.retryAfterMs);
      if ((error instanceof Be1ClientError || error instanceof BusinessRequestError) && ["UNAUTHENTICATED", "FORBIDDEN", "RATE_LIMITED"].includes(error.code)) throw error;
      failed ??= error;
    }
  }
  if (failed) throw failed;
}

export async function ensureBusinessPageData(pathname: string, context: DemoBusinessContext, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const scope = crmScopeKey(context);
  if (!scope) throw new Be1ClientError("FORBIDDEN", "ไม่สามารถเปิดสาขานี้ได้");
  await loadBusinessPageData(pathname, context, signal);
  signal?.throwIfAborted();
  if (crmScopeKey(context) !== scope) throw new DOMException("Page scope changed", "AbortError");
  const pages = preparedPages.get(scope) ?? new Set<string>();
  pages.add(pathname); preparedPages.set(scope, pages);
}

async function loadBookingSelection(input: BookingListInput, signal?: AbortSignal) {
  let offset = 0;
  for (let page = 0; page < 10_000; page++) {
    const result = await queryDurableBookings({ ...input, offset, limit: 100 }, signal);
    offset += result.items.length;
    if (offset >= result.total) return;
  }
  throw new Error("Booking selection too large");
}

/** A filtered projection never marks a complete Business directory as loaded. */
async function loadBusinessPageData(pathname: string, context: DemoBusinessContext, signal?: AbortSignal) {
  const { businessId, branchId } = context;
  const workspace = readBusinessSession()?.workspaces.find(item => item.business.id === businessId);
  if (!workspace?.permittedBranches.some(branch => branch.id === branchId)) throw new Be1ClientError("FORBIDDEN", "ไม่สามารถเปิดสาขานี้ได้");

  const [, , route, customerId] = pathname.split("/");
  if (route === "home") return ensureDurableSummary(context, true, { force: false, signal });
  if (route === "calendar") return ensureDurableBookingCatalog(businessId, branchId);
  if (route === "billing") {
    await Promise.all([ensureDurableBilling(businessId, branchId, false, signal, false), ensureDurableSummary(context, false, { force: false, signal })]);
    return ensureKnownCustomers(businessId, readFinancialDirectory(businessId, branchId)?.balances.map(b => b.charge.customerId) ?? [], signal);
  }
  if (route === "inbox") {
    if (!BUSINESS_CHAT_ENABLED) return;
    await ensureDurableInbox(businessId, branchId, false, signal);
    return ensureKnownCustomers(businessId, readInboxDirectory(businessId, branchId).map(c => c.customerId), signal);
  }
  if (route === "team") {
    const today = businessToday(context);
    await Promise.all([ensureDurableBookingCatalog(businessId, branchId), loadFilteredOperations(businessId, branchId, { date: today }, signal),
      loadBookingSelection({ businessId, branchId, rangeStart: today, rangeEnd: addDays(today, 1) }, signal)]);
    return ensureKnownCustomers(businessId, readOperationDirectory(businessId, branchId)?.executions.map(e => e.record.customerId) ?? [], signal);
  }
  if (route === "customers" && customerId) {
    await Promise.all([getDurableCustomer(businessId, customerId, signal), loadBookingSelection({ businessId, customerId, includeCancelled: true }, signal),
      ...workspace.permittedBranches.flatMap(branch => [loadFilteredOperations(businessId, branch.id, { customerId }, signal), loadCustomerBilling(businessId, branch.id, customerId, signal)]),
      ...(BUSINESS_CHAT_ENABLED ? [loadCustomerInbox(businessId, branchId, customerId, signal)] : [])]);
    return;
  }
  if (route === "grooming" || route === "hotel" || route === "daycare") {
    await Promise.all([ensureDurableBookingCatalog(businessId, branchId), loadFilteredOperations(businessId, branchId, { module: route, ...(route === "hotel" ? {} : { date: businessToday(context) }) }, signal)]);
    return ensureKnownCustomers(businessId, readOperationDirectory(businessId, branchId)?.executions.map(e => e.record.customerId) ?? [], signal);
  }
  // Settings sections, QR/Intake and Reports own their reads when they are opened.
}
