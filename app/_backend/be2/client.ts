import {
  BE1_DEV_ACTOR_HEADER,
  BE1_DEV_OWNER_PERSON_ID,
  type Be1ApiResponse,
} from "../be1/contracts";
import { Be1ClientError } from "../be1/client";
import { invalidateBusinessData } from "../shared/client";
import { clearBusinessSession, readBusinessSession } from "../be1/configurationCache";
import {
  BE2_API_PATH,
  type Be2ApiOperation,
  type Be2OperationResult,
  type CreateCustomerInput,
  type CreatePetInput,
  type CustomerPetRelationshipInput,
  type UpdateCustomerInput,
  type UpdateCustomerNotesInput,
  type UpdateCustomerTagsInput,
  type UpdatePetInput,
} from "./contracts";
import {
  installBe2Directory,
  markBe2DirectoryError,
  markBe2DirectoryLoading,
  patchBe2Customer,
  patchBe2Pet,
  readBe2DirectoryStatus,
  readBe2Customer,
  be2ScopeKey,
} from "./customerPetCache";

const generations = new Map<string, number>();

async function requestBe2<T extends Be2ApiOperation>(operation: T, signal?: AbortSignal): Promise<Be2OperationResult<T>> {
  signal?.throwIfAborted();
  const session = readBusinessSession();
  const businessId = "input" in operation ? operation.input.businessId : operation.businessId;
  const scope = be2ScopeKey(businessId), generation = generations.get(scope) ?? 0;
  const read = ["customer.list", "customer.search", "customer.get", "pet.get"].includes(operation.type);
  const headers = new Headers({
    "content-type": "application/json",
    "x-correlation-id": crypto.randomUUID(),
  });
  // Explicit local adapter only. The server accepts this identity solely when
  // its own environment is configured as `dev-test`.
  if (process.env.NODE_ENV !== "production") headers.set(BE1_DEV_ACTOR_HEADER, BE1_DEV_OWNER_PERSON_ID);
  const response = await fetch(BE2_API_PATH, {
    method: "POST",
    headers,
    body: JSON.stringify(operation),
    cache: "no-store",
    credentials: "same-origin",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
  });
  const payload = await response.json() as Be1ApiResponse<Be2OperationResult<T>>;
  if (!payload.ok) throw new Be1ClientError(payload.error.code, payload.error.message);
  signal?.throwIfAborted();
  if (read && (session !== readBusinessSession() || generation !== (generations.get(scope) ?? 0))) throw new DOMException("Customer read became stale", "AbortError");
  const actor = response.headers.get("x-meawketting-person-id");
  if (read && actor && actor !== session?.person.id) { clearBusinessSession(); throw new Be1ClientError("FORBIDDEN", "กรุณายืนยันบัญชีอีกครั้ง"); }
  if (!read) { generations.set(scope, generation + 1); invalidateBusinessData(businessId); }
  return payload.data;
}

const directoryRequests = new Map<string, Promise<void>>();
const businessRequestQueues = new Map<string, Promise<void>>();

/**
 * Keep full-directory hydration and mutations ordered per Business. Independent
 * search/detail reads discard results superseded by an acknowledged mutation.
 */
function enqueueBusinessRequest<T>(businessId: string, task: () => Promise<T>): Promise<T> {
  const previous = businessRequestQueues.get(businessId) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(task);
  const tail = result.then(() => undefined, () => undefined);
  businessRequestQueues.set(businessId, tail);
  void tail.finally(() => {
    if (businessRequestQueues.get(businessId) === tail) businessRequestQueues.delete(businessId);
  });
  return result;
}

export function ensureDurableCustomerDirectory(businessId: string, force = false) {
  if (!force && readBe2DirectoryStatus(businessId) === "ready") return Promise.resolve();
  const scope = be2ScopeKey(businessId);
  const pending = directoryRequests.get(scope);
  if (pending) return pending;
  markBe2DirectoryLoading(businessId);
  const request = enqueueBusinessRequest(businessId, async () => {
    const customers = [];
    const seen = new Set<string>();
    let offset = 0;
    let total = 0;
    let pageCount = 0;
    do {
      const page = await requestBe2({
        type: "customer.list",
        input: { businessId, limit: 100, offset },
      });
      if (page.offset !== offset || (page.items.length === 0 && offset < page.total) || !Number.isSafeInteger(page.total) || page.total < 0
        || page.items.length > 100 || page.items.some(c => c.businessId !== businessId || seen.has(c.id)) || new Set(page.items.map(c => c.id)).size !== page.items.length || ++pageCount > 10_000) throw new Error("Customer pagination made no progress");
      page.items.forEach(c => seen.add(c.id)); customers.push(...page.items);
      total = page.total;
      offset += page.items.length;
    } while (offset < total);
    installBe2Directory(businessId, customers);
  })
    .catch((error) => {
      if (scope === be2ScopeKey(businessId)) markBe2DirectoryError(businessId, error);
      throw error;
    })
    .finally(() => {
      directoryRequests.delete(scope);
    });
  directoryRequests.set(scope, request);
  return request;
}

export async function searchDurableCustomers(businessId: string, query: string, limit = 100, offset = 0, signal?: AbortSignal) {
    const page = await requestBe2(query.trim() ? { type: "customer.search", input: { businessId, query, limit, offset } } : { type: "customer.list", input: { businessId, limit, offset } }, signal);
    if (page.offset !== offset || (page.items.length === 0 && offset < page.total) || !Number.isSafeInteger(page.total) || page.total < 0 || page.items.length > limit
      || page.items.some(c => c.businessId !== businessId) || new Set(page.items.map(c => c.id)).size !== page.items.length) throw new Error("Customer pagination made no progress");
    page.items.forEach(patchBe2Customer);
    return page;
}

export async function getDurableCustomer(businessId: string, customerId: string, signal?: AbortSignal) {
    const customer = await requestBe2({ type: "customer.get", businessId, customerId }, signal);
    patchBe2Customer(customer);
    return customer;
}
export async function ensureKnownCustomers(businessId: string, ids: string[], signal?: AbortSignal) {
  const missing = [...new Set(ids)].filter(id => !readBe2Customer(businessId, id));
  for (let start = 0; start < missing.length; start += 100) {
    const selected = missing.slice(start, start + 100);
    const page = await requestBe2({ type: "customer.list", input: { businessId, customerIds: selected, includeInactive: true, limit: 100, offset: 0 } }, signal);
    if (page.offset !== 0 || page.items.some(c => c.businessId !== businessId || !selected.includes(c.id)) || page.total !== page.items.length) throw new Error("Customer selection returned an invalid page");
    page.items.forEach(patchBe2Customer);
  }
}

export async function createDurableCustomer(input: CreateCustomerInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const scope = be2ScopeKey(input.businessId);
    const result = await requestBe2({ type: "customer.create", input });
    if (scope === be2ScopeKey(input.businessId) && result.outcome === "created") patchBe2Customer(result.customer);
    return result;
  });
}

export async function updateDurableCustomer(input: UpdateCustomerInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const scope = be2ScopeKey(input.businessId);
    const customer = await requestBe2({ type: "customer.update", input });
    if (scope === be2ScopeKey(input.businessId)) patchBe2Customer(customer);
    return customer;
  });
}

export async function updateDurableCustomerNotes(input: UpdateCustomerNotesInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const scope = be2ScopeKey(input.businessId);
    const customer = await requestBe2({ type: "customer.update-notes", input });
    if (scope === be2ScopeKey(input.businessId)) patchBe2Customer(customer);
    return customer;
  });
}

export async function updateDurableCustomerTags(input: UpdateCustomerTagsInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const scope = be2ScopeKey(input.businessId);
    const customer = await requestBe2({ type: "customer.update-tags", input });
    if (scope === be2ScopeKey(input.businessId)) patchBe2Customer(customer);
    return customer;
  });
}

export async function setDurableCustomerActive(businessId: string, customerId: string, active: boolean) {
  return enqueueBusinessRequest(businessId, async () => {
    const scope = be2ScopeKey(businessId);
    const customer = await requestBe2({ type: "customer.set-active", businessId, customerId, active });
    if (scope === be2ScopeKey(businessId)) patchBe2Customer(customer);
    return customer;
  });
}

export async function createDurablePet(input: CreatePetInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const scope = be2ScopeKey(input.businessId);
    const result = await requestBe2({ type: "pet.create", input });
    if (scope === be2ScopeKey(input.businessId) && result.outcome === "created") patchBe2Customer(result.customer);
    return result;
  });
}

export async function getDurablePet(businessId: string, petId: string) {
  return enqueueBusinessRequest(businessId, async () => {
    const pet = await requestBe2({ type: "pet.get", businessId, petId });
    patchBe2Pet(pet);
    return pet;
  });
}

export async function updateDurablePet(input: UpdatePetInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const scope = be2ScopeKey(input.businessId);
    const pet = await requestBe2({ type: "pet.update", input });
    if (scope === be2ScopeKey(input.businessId)) patchBe2Pet(pet);
    return pet;
  });
}

export async function setDurablePetActive(businessId: string, petId: string, active: boolean) {
  return enqueueBusinessRequest(businessId, async () => {
    const scope = be2ScopeKey(businessId);
    const pet = await requestBe2({ type: "pet.set-active", businessId, petId, active });
    if (scope === be2ScopeKey(businessId)) patchBe2Pet(pet);
    return pet;
  });
}

export async function linkDurableCustomerPet(input: CustomerPetRelationshipInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const scope = be2ScopeKey(input.businessId);
    const customer = await requestBe2({ type: "pet.link-customer", input });
    if (scope === be2ScopeKey(input.businessId)) patchBe2Customer(customer);
    return customer;
  });
}

export async function unlinkDurableCustomerPet(input: CustomerPetRelationshipInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const scope = be2ScopeKey(input.businessId);
    const customer = await requestBe2({ type: "pet.unlink-customer", input });
    if (scope === be2ScopeKey(input.businessId)) patchBe2Customer(customer);
    return customer;
  });
}
