import type { AuthorizedMutation } from "../be1/repository";
import type { CustomerPage, CustomerView, PetDetailView, PetView } from "./contracts";

export type CustomerQuery = {
  businessId: string;
  queryKey: string | null;
  phoneKey: string | null;
  includeInactive: boolean;
  limit: number;
  offset: number;
};

export interface Be2Repository {
  listCustomers(query: CustomerQuery): Promise<CustomerPage>;
  getCustomer(businessId: string, customerId: string): Promise<CustomerView | null>;
  findCustomerByPhoneKey(businessId: string, phoneKey: string, excludeCustomerId?: string): Promise<CustomerView | null>;
  createCustomer(customer: CustomerView, context: AuthorizedMutation): Promise<void>;
  updateCustomer(before: CustomerView, after: CustomerView, action: string, context: AuthorizedMutation): Promise<void>;
  replaceCustomerTags(before: CustomerView, after: CustomerView, context: AuthorizedMutation): Promise<void>;
  setCustomerActive(before: CustomerView, after: CustomerView, context: AuthorizedMutation): Promise<void>;

  getPet(businessId: string, petId: string): Promise<PetDetailView | null>;
  listPetsByIds(businessId: string, petIds: string[]): Promise<PetView[]>;
  listActiveRelationshipPetIds(businessId: string, customerId: string, petIds: string[]): Promise<string[]>;
  findPetByNameKey(businessId: string, nameKey: string, species: PetView["species"], excludePetId?: string): Promise<PetView | null>;
  createPetWithRelationship(pet: PetView, customer: CustomerView, relationshipId: string, context: AuthorizedMutation): Promise<void>;
  updatePet(before: PetDetailView, after: PetDetailView, context: AuthorizedMutation): Promise<void>;
  setPetActive(before: PetDetailView, after: PetDetailView, context: AuthorizedMutation): Promise<void>;
  hasActiveRelationship(businessId: string, customerId: string, petId: string): Promise<boolean>;
  linkCustomerPet(customer: CustomerView, pet: PetDetailView, relationshipId: string, context: AuthorizedMutation): Promise<void>;
  unlinkCustomerPet(customer: CustomerView, pet: PetDetailView, context: AuthorizedMutation): Promise<void>;
}
