import type { CustomerView, PetDetailView, PetView } from "./contracts";

export type Be2DirectoryStatus = "idle" | "partial" | "loading" | "ready" | "error";

type Directory = {
  status: Be2DirectoryStatus;
  customers: Map<string, CustomerView>;
  error: string | null;
};

const directories = new Map<string, Directory>();
const listeners = new Set<() => void>();
let revision = 0;

function directory(businessId: string) {
  const current = directories.get(businessId);
  if (current) return current;
  const created: Directory = { status: "idle", customers: new Map(), error: null };
  directories.set(businessId, created);
  return created;
}

function emit() {
  revision += 1;
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("meawketting:business-state"));
  }
}

export function markBe2DirectoryLoading(businessId: string) {
  const current = directory(businessId);
  current.status = "loading";
  current.error = null;
  emit();
}

export function installBe2Directory(businessId: string, customers: readonly CustomerView[]) {
  directories.set(businessId, {
    status: "ready",
    customers: new Map(customers.map((customer) => [customer.id, customer])),
    error: null,
  });
  emit();
}

export function markBe2DirectoryError(businessId: string, error: unknown) {
  const current = directory(businessId);
  current.status = "error";
  current.error = error instanceof Error ? error.message : String(error);
  emit();
}

export function patchBe2Customer(customer: CustomerView) {
  const current = directory(customer.businessId);
  current.customers.set(customer.id, customer);
  // A detail, search, or mutation response proves only that this Customer is
  // current; it does not prove that the whole Business directory was loaded.
  // Keep an in-flight full hydration as loading and otherwise mark the cache
  // partial so ensureDurableCustomerDirectory still fetches every page.
  if (current.status !== "ready" && current.status !== "loading") current.status = "partial";
  current.error = null;
  emit();
}

function petView(pet: PetView | PetDetailView): PetView {
  return {
    id: pet.id,
    businessId: pet.businessId,
    name: pet.name,
    species: pet.species,
    profileSource: pet.profileSource,
    businessNotes: pet.businessNotes,
    status: pet.status,
    createdAt: pet.createdAt,
    updatedAt: pet.updatedAt,
  };
}

export function patchBe2Pet(pet: PetView | PetDetailView) {
  const current = directory(pet.businessId);
  const projected = petView(pet);
  for (const [customerId, customer] of current.customers) {
    const linked = customer.pets.some((entry) => entry.id === pet.id);
    const relationshipIsActive = "customerIds" in pet && pet.customerIds.includes(customerId);
    if (!linked && !relationshipIsActive) continue;
    current.customers.set(customerId, {
      ...customer,
      pets: pet.status === "active"
        ? linked
          ? customer.pets.map((entry) => entry.id === pet.id ? projected : entry)
          : [...customer.pets, projected]
        : customer.pets.filter((entry) => entry.id !== pet.id),
    });
  }
  emit();
}

export function readBe2DirectoryStatus(businessId: string) {
  const current = directories.get(businessId);
  return current?.status ?? "idle";
}

export function readBe2DirectoryError(businessId: string) {
  return directories.get(businessId)?.error ?? null;
}

/** Returns null until server truth has been installed. */
export function readBe2Customers(businessId: string): CustomerView[] | null {
  const current = directories.get(businessId);
  if (current?.status !== "ready") return null;
  return [...current.customers.values()].filter((customer) => customer.status === "active");
}

export function readBe2Customer(businessId: string, customerId: string) {
  return directories.get(businessId)?.customers.get(customerId) ?? null;
}

/**
 * Compatibility-only global lookup for frozen local records that carry a
 * stable BE2 ID but predate Business-aware selectors. Never used for server
 * authorization.
 */
export function readBe2CustomerByStableId(customerId: string) {
  for (const current of directories.values()) {
    const customer = current.customers.get(customerId);
    if (customer) return customer;
  }
  return null;
}

export function readAllReadyBe2Directories() {
  return [...directories.entries()]
    .filter(([, current]) => current.status === "ready")
    .map(([businessId, current]) => ({
      businessId,
      customers: [...current.customers.values()].filter((customer) => customer.status === "active"),
    }));
}

export function subscribeBe2Directory(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBe2DirectoryRevision() {
  return revision;
}

export function resetBe2DirectoryForTests() {
  directories.clear();
  emit();
}
