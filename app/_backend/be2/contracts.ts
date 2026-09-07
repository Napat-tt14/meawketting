import type { Be1LifecycleStatus } from "../be1/contracts";

export const BE2_API_PATH = "/api/be2" as const;

export type PetSpecies = "cat" | "dog";
export type PetProfileSource = "business-local" | "customer-reported";

export type PetView = {
  id: string;
  businessId: string;
  name: string;
  species: PetSpecies;
  profileSource: PetProfileSource;
  /** Business-owned operational notes. Never a Passport field. */
  businessNotes: string;
  status: Be1LifecycleStatus;
  createdAt: string;
  updatedAt: string;
};

export type PetDetailView = PetView & {
  /** Business contact relationships only; this is not Guardian authority or ownership. */
  customerIds: string[];
};

export type CustomerView = {
  id: string;
  businessId: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  /** Business-owned internal notes. Not visible to a Guardian by default. */
  businessNotes: string;
  tags: string[];
  pets: PetView[];
  status: Be1LifecycleStatus;
  createdAt: string;
  updatedAt: string;
};

export type CustomerPage = {
  items: CustomerView[];
  total: number;
  limit: number;
  offset: number;
};

export type DuplicateCustomerWarning = {
  kind: "customer-phone";
  duplicate: CustomerView;
};

export type DuplicatePetWarning = {
  kind: "pet-name";
  duplicate: PetView;
};

export type CreateCustomerResult =
  | { outcome: "duplicate-warning"; warning: DuplicateCustomerWarning }
  | { outcome: "created"; customer: CustomerView; potentialDuplicate: CustomerView | null };

export type CreatePetResult =
  | { outcome: "duplicate-warning"; warning: DuplicatePetWarning }
  | { outcome: "created"; customer: CustomerView; pet: PetView; potentialDuplicate: PetView | null };

export type CustomerListInput = {
  businessId: string;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
};

export type CustomerSearchInput = CustomerListInput & {
  query: string;
};

export type CreateCustomerInput = {
  businessId: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  businessNotes: string;
  tags?: string[];
  allowPotentialDuplicate?: boolean;
};

export type UpdateCustomerInput = Omit<CreateCustomerInput, "tags" | "allowPotentialDuplicate"> & {
  customerId: string;
};

export type UpdateCustomerNotesInput = {
  businessId: string;
  customerId: string;
  businessNotes: string;
};

export type UpdateCustomerTagsInput = {
  businessId: string;
  customerId: string;
  tags: string[];
};

export type CreatePetInput = {
  businessId: string;
  customerId: string;
  name: string;
  species: PetSpecies;
  businessNotes: string;
  allowPotentialDuplicate?: boolean;
};

export type UpdatePetInput = {
  businessId: string;
  petId: string;
  name: string;
  species: PetSpecies;
  businessNotes: string;
};

export type CustomerPetRelationshipInput = {
  businessId: string;
  customerId: string;
  petId: string;
};

export type Be2ApiOperation =
  | { type: "customer.list"; input: CustomerListInput }
  | { type: "customer.search"; input: CustomerSearchInput }
  | { type: "customer.get"; businessId: string; customerId: string }
  | { type: "customer.create"; input: CreateCustomerInput }
  | { type: "customer.update"; input: UpdateCustomerInput }
  | { type: "customer.set-active"; businessId: string; customerId: string; active: boolean }
  | { type: "customer.update-notes"; input: UpdateCustomerNotesInput }
  | { type: "customer.update-tags"; input: UpdateCustomerTagsInput }
  | { type: "pet.get"; businessId: string; petId: string }
  | { type: "pet.create"; input: CreatePetInput }
  | { type: "pet.update"; input: UpdatePetInput }
  | { type: "pet.set-active"; businessId: string; petId: string; active: boolean }
  | { type: "pet.link-customer"; input: CustomerPetRelationshipInput }
  | { type: "pet.unlink-customer"; input: CustomerPetRelationshipInput };

export type Be2OperationResult<T extends Be2ApiOperation> =
  T["type"] extends "customer.list" | "customer.search" ? CustomerPage
    : T["type"] extends "customer.get" | "customer.update" | "customer.set-active" | "customer.update-notes" | "customer.update-tags" | "pet.link-customer" | "pet.unlink-customer" ? CustomerView
      : T["type"] extends "customer.create" ? CreateCustomerResult
        : T["type"] extends "pet.get" | "pet.update" | "pet.set-active" ? PetDetailView
          : T["type"] extends "pet.create" ? CreatePetResult
            : never;
