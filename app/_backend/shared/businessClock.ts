import { readCachedBranches } from "../be1/configurationCache";
import { BUSINESS_FIXTURE_TEST_MODE } from "../../_prototype/fixtureRuntime";
import { dateInZone } from "./time";

export function businessToday(context: { businessId: string; branchId: string }) {
  return BUSINESS_FIXTURE_TEST_MODE ? "2026-08-18" : dateInZone(new Date(), businessTimezone(context));
}
export function businessTimezone(context: { businessId: string; branchId: string }) {
  return readCachedBranches(context.businessId).find((b) => b.id === context.branchId)?.timezone ?? "Asia/Bangkok";
}
