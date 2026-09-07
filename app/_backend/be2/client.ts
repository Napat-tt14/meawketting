import {
  BE1_DEV_ACTOR_HEADER,
  BE1_DEV_OWNER_PERSON_ID,
  type Be1ApiResponse,
} from "../be1/contracts";
import { Be1ClientError } from "../be1/client";
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
} from "./customerPetCache";

async function requestBe2<T extends Be2ApiOperation>(operation: T): Promise<Be2OperationResult<T>> {
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
  });
  const payload = await response.json() as Be1ApiResponse<Be2OperationResult<T>>;
  if (!payload.ok) throw new Be1ClientError(payload.error.code, payload.error.message);
  return payload.data;
}

const directoryRequests = new Map<string, Promise<void>>();
const businessRequestQueues = new Map<string, Promise<void>>();

/**
 * Keep reads, full-directory hydration, and mutations ordered per Business.
 * This prevents an older list/detail/search response from overwriting a newer
 * mutation in the synchronous compatibility cache. Separate Businesses still
 * execute independently.
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
  const pending = directoryRequests.get(businessId);
  if (pending) return pending;
  markBe2DirectoryLoading(businessId);
  const request = enqueueBusinessRequest(businessId, async () => {
    const customers = [];
    let offset = 0;
    let total = 0;
    do {
      const page = await requestBe2({
        type: "customer.list",
        input: { businessId, limit: 100, offset },
      });
      customers.push(...page.items);
      total = page.total;
      offset += page.items.length;
    } while (offset < total);
    installBe2Directory(businessId, customers);
  })
    .catch((error) => {
      markBe2DirectoryError(businessId, error);
      throw error;
    })
    .finally(() => {
      directoryRequests.delete(businessId);
    });
  directoryRequests.set(businessId, request);
  return request;
}

export async function searchDurableCustomers(businessId: string, query: string, limit = 100, offset = 0) {
  return enqueueBusinessRequest(businessId, async () => {
    const page = await requestBe2({ type: "customer.search", input: { businessId, query, limit, offset } });
    page.items.forEach(patchBe2Customer);
    return page;
  });
}

export async function getDurableCustomer(businessId: string, customerId: string) {
  return enqueueBusinessRequest(businessId, async () => {
    const customer = await requestBe2({ type: "customer.get", businessId, customerId });
    patchBe2Customer(customer);
    return customer;
  });
}

export async function createDurableCustomer(input: CreateCustomerInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const result = await requestBe2({ type: "customer.create", input });
    if (result.outcome === "created") patchBe2Customer(result.customer);
    return result;
  });
}

export async function updateDurableCustomer(input: UpdateCustomerInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const customer = await requestBe2({ type: "customer.update", input });
    patchBe2Customer(customer);
    return customer;
  });
}

export async function updateDurableCustomerNotes(input: UpdateCustomerNotesInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const customer = await requestBe2({ type: "customer.update-notes", input });
    patchBe2Customer(customer);
    return customer;
  });
}

export async function updateDurableCustomerTags(input: UpdateCustomerTagsInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const customer = await requestBe2({ type: "customer.update-tags", input });
    patchBe2Customer(customer);
    return customer;
  });
}

export async function setDurableCustomerActive(businessId: string, customerId: string, active: boolean) {
  return enqueueBusinessRequest(businessId, async () => {
    const customer = await requestBe2({ type: "customer.set-active", businessId, customerId, active });
    patchBe2Customer(customer);
    return customer;
  });
}

export async function createDurablePet(input: CreatePetInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const result = await requestBe2({ type: "pet.create", input });
    if (result.outcome === "created") patchBe2Customer(result.customer);
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
    const pet = await requestBe2({ type: "pet.update", input });
    patchBe2Pet(pet);
    return pet;
  });
}

export async function setDurablePetActive(businessId: string, petId: string, active: boolean) {
  return enqueueBusinessRequest(businessId, async () => {
    const pet = await requestBe2({ type: "pet.set-active", businessId, petId, active });
    patchBe2Pet(pet);
    return pet;
  });
}

export async function linkDurableCustomerPet(input: CustomerPetRelationshipInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const customer = await requestBe2({ type: "pet.link-customer", input });
    patchBe2Customer(customer);
    return customer;
  });
}

export async function unlinkDurableCustomerPet(input: CustomerPetRelationshipInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const customer = await requestBe2({ type: "pet.unlink-customer", input });
    patchBe2Customer(customer);
    return customer;
  });
}
