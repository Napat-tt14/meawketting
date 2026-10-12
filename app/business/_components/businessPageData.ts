import { readBusinessSession } from "../../_backend/be1/configurationCache";
import { Be1ClientError } from "../../_backend/be1/client";
import { ensureKnownCustomers, getDurableCustomer } from "../../_backend/be2/client";
import { ensureDurableBookingCatalog, queryDurableBookings } from "../../_backend/be3/client";
import { loadFilteredOperations } from "../../_backend/be4/client";
import { readOperationDirectory } from "../../_backend/be4/operationsCache";
import { ensureDurableInbox, loadCustomerInbox, readInboxDirectory } from "../../_backend/be6/client";
import { ensureDurableBilling, loadCustomerBilling, readFinancialDirectory } from "../../_backend/be7/client";
import { ensureDurableSummary } from "../../_backend/be8/client";
import { businessToday } from "../../_backend/shared/businessClock";
import { addDays } from "../../_backend/shared/time";
import type { BookingListInput } from "../../_backend/be3/contracts";
import type { DemoBusinessContext } from "../../_prototype/businessState";

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
export async function ensureBusinessPageData(pathname: string, context: DemoBusinessContext, signal?: AbortSignal) {
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
      loadCustomerInbox(businessId, branchId, customerId, signal)]);
    return;
  }
  if (route === "grooming" || route === "hotel" || route === "daycare") {
    await Promise.all([ensureDurableBookingCatalog(businessId, branchId), loadFilteredOperations(businessId, branchId, { module: route, ...(route === "hotel" ? {} : { date: businessToday(context) }) }, signal)]);
    return ensureKnownCustomers(businessId, readOperationDirectory(businessId, branchId)?.executions.map(e => e.record.customerId) ?? [], signal);
  }
  // Settings sections, QR/Intake and Reports own their reads when they are opened.
}
