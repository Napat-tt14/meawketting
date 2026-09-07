import assert from "node:assert/strict";
import test from "node:test";
import type { CustomerView, PetDetailView } from "../app/_backend/be2/contracts";
import { ensureDurableCustomerDirectory, updateDurableCustomer } from "../app/_backend/be2/client";
import {
  installBe2Directory,
  patchBe2Customer,
  patchBe2Pet,
  readAllReadyBe2Directories,
  readBe2Customer,
  readBe2CustomerByStableId,
  readBe2Customers,
  readBe2DirectoryStatus,
  resetBe2DirectoryForTests,
} from "../app/_backend/be2/customerPetCache";

const timestamp = "2026-09-07T00:00:00.000Z";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function successResponse(data: unknown) {
  return new Response(JSON.stringify({
    ok: true,
    data,
    meta: { requestId: "req_cache_ordering", correlationId: "cor_cache_ordering" },
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function customer(overrides: Partial<CustomerView> = {}): CustomerView {
  return {
    id: "cus_cache_customer_000001",
    businessId: "business-whisker-rest",
    displayName: "คุณแคช",
    phone: null,
    email: null,
    businessNotes: "",
    tags: [],
    pets: [],
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

test("BE2 compatibility cache stays Business-scoped and excludes inactive Customers from lists", () => {
  resetBe2DirectoryForTests();
  const active = customer();
  const otherBusiness = customer({ id: "cus_cache_customer_000002", businessId: "business-paw-partner" });
  patchBe2Customer(active);
  assert.equal(readBe2DirectoryStatus(active.businessId), "partial");
  assert.equal(readBe2Customers(active.businessId), null);
  assert.equal(readBe2Customer(active.businessId, active.id)?.id, active.id);

  installBe2Directory(active.businessId, [active]);
  installBe2Directory(otherBusiness.businessId, [otherBusiness]);

  assert.deepEqual(readBe2Customers(active.businessId)?.map((entry) => entry.id), [active.id]);
  assert.equal(readBe2Customer(otherBusiness.businessId, active.id), null);
  assert.equal(readBe2CustomerByStableId(active.id)?.businessId, active.businessId);

  patchBe2Customer({ ...active, status: "inactive" });
  assert.deepEqual(readBe2Customers(active.businessId), []);
  assert.equal(readBe2Customer(active.businessId, active.id)?.status, "inactive");
  assert.equal(readAllReadyBe2Directories().find((entry) => entry.businessId === active.businessId)?.customers.length, 0);
});

test("Pet lifecycle patches remove and restore the same stable relationship identity", () => {
  resetBe2DirectoryForTests();
  const pet: PetDetailView = {
    id: "pet_cache_pet_0000000001",
    businessId: "business-whisker-rest",
    name: "Nova",
    species: "cat",
    profileSource: "business-local",
    businessNotes: "",
    status: "active",
    customerIds: ["cus_cache_customer_000001"],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  installBe2Directory(pet.businessId, [customer()]);

  patchBe2Pet(pet);
  assert.deepEqual(readBe2Customer(pet.businessId, "cus_cache_customer_000001")?.pets.map((entry) => entry.id), [pet.id]);

  patchBe2Pet({ ...pet, status: "inactive" });
  assert.deepEqual(readBe2Customer(pet.businessId, "cus_cache_customer_000001")?.pets, []);

  patchBe2Pet({ ...pet, status: "active", name: "Nova Stable" });
  assert.deepEqual(readBe2Customer(pet.businessId, "cus_cache_customer_000001")?.pets.map((entry) => [entry.id, entry.name]), [[pet.id, "Nova Stable"]]);
});

test("full hydration cannot overtake a later mutation for the same Business", async () => {
  resetBe2DirectoryForTests();
  const businessId = "business-cache-ordering";
  const original = customer({
    id: "cus_cache_ordering_000001",
    businessId,
    displayName: "ก่อนแก้ไข",
  });
  const updated = customer({
    ...original,
    displayName: "หลังแก้ไข",
    updatedAt: "2026-09-07T00:01:00.000Z",
  });
  const hydrationStarted = deferred<void>();
  const hydrationResponse = deferred<Response>();
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const operation = JSON.parse(String(init?.body)) as { type: string };
    calls.push(operation.type);
    if (operation.type === "customer.list") {
      hydrationStarted.resolve();
      return hydrationResponse.promise;
    }
    if (operation.type === "customer.update") return successResponse(updated);
    throw new Error(`Unexpected BE2 operation: ${operation.type}`);
  }) as typeof fetch;

  try {
    const hydration = ensureDurableCustomerDirectory(businessId, true);
    await hydrationStarted.promise;
    const mutation = updateDurableCustomer({
      businessId,
      customerId: original.id,
      displayName: updated.displayName,
      phone: null,
      email: null,
      businessNotes: "",
    });

    await Promise.resolve();
    assert.deepEqual(calls, ["customer.list"]);

    hydrationResponse.resolve(successResponse({ items: [original], total: 1, limit: 100, offset: 0 }));
    await hydration;
    await mutation;

    assert.deepEqual(calls, ["customer.list", "customer.update"]);
    assert.equal(readBe2DirectoryStatus(businessId), "ready");
    assert.equal(readBe2Customer(businessId, original.id)?.displayName, updated.displayName);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
