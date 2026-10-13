import {
  BE1_API_PATH,
  BE1_DEV_ACTOR_HEADER,
  BE1_DEV_OWNER_PERSON_ID,
  type Be1ApiErrorCode,
  type Be1ApiOperation,
  type Be1ApiResponse,
  type Be1OperationResult,
  type BranchConfigurationInput,
  type BranchView,
  type BusinessSessionView,
  type UpdateBusinessProfileInput,
} from "./contracts";
import { installBusinessSession, patchCachedBranch, patchCachedBusiness, readBusinessSession } from "./configurationCache";
import { clearBusinessReadFailures, invalidateBusinessData } from "../shared/client";

export class Be1ClientError extends Error {
  readonly code: Be1ApiErrorCode;

  constructor(code: Be1ApiErrorCode, message: string, readonly status?: number, readonly retryAfterMs?: number) {
    super(message);
    this.name = "Be1ClientError";
    this.code = code;
  }
}

async function requestBe1<T extends Be1ApiOperation>(operation: T): Promise<Be1OperationResult<T>> {
  const headers = new Headers({
    "content-type": "application/json",
    "x-correlation-id": crypto.randomUUID(),
  });
  // Explicit local adapter only. The server ignores this caller-controlled
  // identity unless its own environment is configured as `dev-test`.
  if (process.env.NODE_ENV !== "production") headers.set(BE1_DEV_ACTOR_HEADER, BE1_DEV_OWNER_PERSON_ID);
  const response = await fetch(BE1_API_PATH, {
    method: "POST",
    headers,
    body: JSON.stringify(operation),
    cache: "no-store",
    credentials: "same-origin",
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json() as Be1ApiResponse<Be1OperationResult<T>>;
  if (!payload.ok) throw new Be1ClientError(payload.error.code, payload.error.message);
  return payload.data;
}

let sessionRequest: Promise<BusinessSessionView> | null = null;

export function ensureBusinessSession(force = false) {
  if (!force && readBusinessSession()) return Promise.resolve(readBusinessSession()!);
  if (!sessionRequest) {
    sessionRequest = requestBe1({ type: "session.resolve" })
      .then((next) => {
        installBusinessSession(next);
        clearBusinessReadFailures();
        if (typeof window !== "undefined") window.dispatchEvent(new Event("meawketting:business-session-verified"));
        return next;
      })
      .finally(() => {
        sessionRequest = null;
      });
  }
  return sessionRequest;
}

export async function updateDurableBusiness(input: UpdateBusinessProfileInput) {
  const business = await requestBe1({ type: "business.update", input });
  patchCachedBusiness(business);
  invalidateBusinessData(business.id);
  return business;
}

export async function saveDurableBranch(input: BranchConfigurationInput) {
  const branch = input.branchId
    ? await requestBe1({ type: "branch.update", input: input as BranchConfigurationInput & { branchId: string } })
    : await requestBe1({ type: "branch.create", input });
  patchCachedBranch(branch);
  invalidateBusinessData(branch.businessId);
  return branch;
}

export async function setDurableBranchActive(businessId: string, branchId: string, active: boolean) {
  const branch = await requestBe1({ type: "branch.set-active", businessId, branchId, active });
  patchCachedBranch(branch);
  invalidateBusinessData(branch.businessId);
  return branch;
}

export async function updateDurableOperatingHours(businessId: string, branchId: string, operatingHours: BranchView["operatingHours"]) {
  const branch = await requestBe1({ type: "branch.update-hours", businessId, branchId, operatingHours });
  patchCachedBranch(branch);
  invalidateBusinessData(branch.businessId);
  return branch;
}

export async function updateDurableEnabledModules(businessId: string, branchId: string, enabledModules: BranchView["enabledModules"]) {
  const branch = await requestBe1({ type: "branch.update-modules", businessId, branchId, enabledModules });
  patchCachedBranch(branch);
  invalidateBusinessData(branch.businessId);
  return branch;
}
