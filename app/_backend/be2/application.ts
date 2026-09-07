import { Be1Application } from "../be1/application";
import type { BusinessMembershipView, PersonView } from "../be1/contracts";
import { be1Error } from "../be1/errors";
import type { RequestMetadata } from "../be1/metadata";
import type { AuthorizedMutation, Be1Repository } from "../be1/repository";
import type {
  Be2ApiOperation,
  Be2OperationResult,
  CreateCustomerInput,
  CreateCustomerResult,
  CreatePetInput,
  CreatePetResult,
  CustomerListInput,
  CustomerPetRelationshipInput,
  CustomerSearchInput,
  CustomerView,
  PetDetailView,
  PetView,
  UpdateCustomerInput,
  UpdateCustomerNotesInput,
  UpdateCustomerTagsInput,
  UpdatePetInput,
} from "./contracts";
import type { Be2Repository } from "./repository";
import {
  normalizeCustomerSearchKey,
  normalizePhoneKey,
  validateCreateCustomerInput,
  validateCreatePetInput,
  validateCustomerListInput,
  validateCustomerPetRelationshipInput,
  validateCustomerSearchInput,
  validateUpdateCustomerInput,
  validateUpdateCustomerNotesInput,
  validateUpdateCustomerTagsInput,
  validateUpdatePetInput,
} from "./validation";
import { validateId } from "../be1/validation";

export type Be2ApplicationDependencies = {
  now?: () => string;
  id?: (prefix: "cus" | "pet" | "cpr") => string;
};

export class Be2Application extends Be1Application {
  private readonly customerPetRepository: Be2Repository;
  private readonly be2Now: () => string;
  private readonly be2Id: (prefix: "cus" | "pet" | "cpr") => string;

  constructor(
    authorizationRepository: Be1Repository,
    customerPetRepository: Be2Repository,
    dependencies: Be2ApplicationDependencies = {},
  ) {
    super(authorizationRepository);
    this.customerPetRepository = customerPetRepository;
    this.be2Now = dependencies.now ?? (() => new Date().toISOString());
    this.be2Id = dependencies.id ?? ((prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`);
  }

  async listCustomers(actor: PersonView, rawInput: CustomerListInput) {
    const input = validateCustomerListInput(rawInput);
    await this.resolveMembership(actor, input.businessId);
    return this.customerPetRepository.listCustomers({
      ...input,
      queryKey: null,
      phoneKey: null,
    });
  }

  async searchCustomers(actor: PersonView, rawInput: CustomerSearchInput) {
    const input = validateCustomerSearchInput(rawInput);
    await this.resolveMembership(actor, input.businessId);
    return this.customerPetRepository.listCustomers({
      businessId: input.businessId,
      queryKey: normalizeCustomerSearchKey(input.query),
      phoneKey: normalizePhoneKey(input.query),
      includeInactive: input.includeInactive,
      limit: input.limit,
      offset: input.offset,
    });
  }

  async getCustomer(actor: PersonView, businessId: string, customerId: string) {
    await this.resolveMembership(actor, validateId(businessId));
    return this.requireCustomer(businessId, validateId(customerId));
  }

  async createCustomer(
    actor: PersonView,
    rawInput: CreateCustomerInput,
    metadata: RequestMetadata,
  ): Promise<CreateCustomerResult> {
    const input = validateCreateCustomerInput(rawInput);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    const phoneKey = normalizePhoneKey(input.phone);
    const duplicate = phoneKey
      ? await this.customerPetRepository.findCustomerByPhoneKey(input.businessId, phoneKey)
      : null;
    if (duplicate && !input.allowPotentialDuplicate) {
      return { outcome: "duplicate-warning", warning: { kind: "customer-phone", duplicate } };
    }
    const occurredAt = this.be2Now();
    const customer: CustomerView = {
      id: this.be2Id("cus"),
      businessId: input.businessId,
      displayName: input.displayName,
      phone: input.phone,
      email: input.email,
      businessNotes: input.businessNotes,
      tags: input.tags,
      pets: [],
      status: "active",
      createdAt: occurredAt,
      updatedAt: occurredAt,
    };
    await this.customerPetRepository.createCustomer(
      customer,
      this.authorizedMutation(actor, membership, metadata, occurredAt),
    );
    return {
      outcome: "created",
      customer: await this.requireCustomer(customer.businessId, customer.id),
      potentialDuplicate: duplicate,
    };
  }

  async updateCustomer(
    actor: PersonView,
    rawInput: UpdateCustomerInput,
    metadata: RequestMetadata,
  ) {
    const input = validateUpdateCustomerInput(rawInput);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    const before = await this.requireCustomer(input.businessId, input.customerId);
    const occurredAt = this.be2Now();
    const after: CustomerView = {
      ...before,
      displayName: input.displayName,
      phone: input.phone,
      email: input.email,
      businessNotes: input.businessNotes,
      updatedAt: occurredAt,
    };
    await this.customerPetRepository.updateCustomer(
      before,
      after,
      "customer.updated",
      this.authorizedMutation(actor, membership, metadata, occurredAt),
    );
    return this.requireCustomer(input.businessId, input.customerId);
  }

  async updateCustomerNotes(
    actor: PersonView,
    rawInput: UpdateCustomerNotesInput,
    metadata: RequestMetadata,
  ) {
    const input = validateUpdateCustomerNotesInput(rawInput);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    const before = await this.requireCustomer(input.businessId, input.customerId);
    const occurredAt = this.be2Now();
    const after = { ...before, businessNotes: input.businessNotes, updatedAt: occurredAt };
    await this.customerPetRepository.updateCustomer(
      before,
      after,
      "customer.notes.updated",
      this.authorizedMutation(actor, membership, metadata, occurredAt),
    );
    return this.requireCustomer(input.businessId, input.customerId);
  }

  async updateCustomerTags(
    actor: PersonView,
    rawInput: UpdateCustomerTagsInput,
    metadata: RequestMetadata,
  ) {
    const input = validateUpdateCustomerTagsInput(rawInput);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    const before = await this.requireCustomer(input.businessId, input.customerId);
    const occurredAt = this.be2Now();
    const after = { ...before, tags: input.tags, updatedAt: occurredAt };
    await this.customerPetRepository.replaceCustomerTags(
      before,
      after,
      this.authorizedMutation(actor, membership, metadata, occurredAt),
    );
    return this.requireCustomer(input.businessId, input.customerId);
  }

  async setCustomerActive(
    actor: PersonView,
    businessId: string,
    customerId: string,
    active: boolean,
    metadata: RequestMetadata,
  ) {
    const normalizedBusinessId = validateId(businessId);
    const { membership } = await this.resolveMembership(actor, normalizedBusinessId);
    const before = await this.requireCustomer(normalizedBusinessId, validateId(customerId));
    const status = active ? "active" : "inactive";
    if (before.status === status) return before;
    const occurredAt = this.be2Now();
    const after: CustomerView = { ...before, status, updatedAt: occurredAt };
    await this.customerPetRepository.setCustomerActive(
      before,
      after,
      this.authorizedMutation(actor, membership, metadata, occurredAt),
    );
    return this.requireCustomer(normalizedBusinessId, before.id);
  }

  async getPet(actor: PersonView, businessId: string, petId: string) {
    await this.resolveMembership(actor, validateId(businessId));
    return this.requirePet(businessId, validateId(petId));
  }

  async createPet(
    actor: PersonView,
    rawInput: CreatePetInput,
    metadata: RequestMetadata,
  ): Promise<CreatePetResult> {
    const input = validateCreatePetInput(rawInput);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    const customer = await this.requireCustomer(input.businessId, input.customerId);
    if (customer.status !== "active") throw be1Error("NOT_FOUND");
    const nameKey = normalizeCustomerSearchKey(input.name);
    const duplicate = await this.customerPetRepository.findPetByNameKey(input.businessId, nameKey, input.species);
    if (duplicate && !input.allowPotentialDuplicate) {
      return { outcome: "duplicate-warning", warning: { kind: "pet-name", duplicate } };
    }
    const occurredAt = this.be2Now();
    const pet: PetView = {
      id: this.be2Id("pet"),
      businessId: input.businessId,
      name: input.name,
      species: input.species,
      profileSource: "business-local",
      businessNotes: input.businessNotes,
      status: "active",
      createdAt: occurredAt,
      updatedAt: occurredAt,
    };
    await this.customerPetRepository.createPetWithRelationship(
      pet,
      customer,
      this.be2Id("cpr"),
      this.authorizedMutation(actor, membership, metadata, occurredAt),
    );
    return {
      outcome: "created",
      customer: await this.requireCustomer(input.businessId, input.customerId),
      pet: await this.requirePet(input.businessId, pet.id),
      potentialDuplicate: duplicate,
    };
  }

  async updatePet(
    actor: PersonView,
    rawInput: UpdatePetInput,
    metadata: RequestMetadata,
  ) {
    const input = validateUpdatePetInput(rawInput);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    const before = await this.requirePet(input.businessId, input.petId);
    const occurredAt = this.be2Now();
    const after: PetDetailView = {
      ...before,
      name: input.name,
      species: input.species,
      businessNotes: input.businessNotes,
      updatedAt: occurredAt,
    };
    await this.customerPetRepository.updatePet(
      before,
      after,
      this.authorizedMutation(actor, membership, metadata, occurredAt),
    );
    return this.requirePet(input.businessId, input.petId);
  }

  async setPetActive(
    actor: PersonView,
    businessId: string,
    petId: string,
    active: boolean,
    metadata: RequestMetadata,
  ) {
    const normalizedBusinessId = validateId(businessId);
    const { membership } = await this.resolveMembership(actor, normalizedBusinessId);
    const before = await this.requirePet(normalizedBusinessId, validateId(petId));
    const status = active ? "active" : "inactive";
    if (before.status === status) return before;
    const occurredAt = this.be2Now();
    const after: PetDetailView = { ...before, status, updatedAt: occurredAt };
    await this.customerPetRepository.setPetActive(
      before,
      after,
      this.authorizedMutation(actor, membership, metadata, occurredAt),
    );
    return this.requirePet(normalizedBusinessId, petId);
  }

  async linkCustomerPet(
    actor: PersonView,
    rawInput: CustomerPetRelationshipInput,
    metadata: RequestMetadata,
  ) {
    const input = validateCustomerPetRelationshipInput(rawInput);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    const [customer, pet] = await Promise.all([
      this.requireCustomer(input.businessId, input.customerId),
      this.requirePet(input.businessId, input.petId),
    ]);
    if (customer.status !== "active" || pet.status !== "active") throw be1Error("NOT_FOUND");
    if (!await this.customerPetRepository.hasActiveRelationship(input.businessId, input.customerId, input.petId)) {
      const occurredAt = this.be2Now();
      await this.customerPetRepository.linkCustomerPet(
        customer,
        pet,
        this.be2Id("cpr"),
        this.authorizedMutation(actor, membership, metadata, occurredAt),
      );
    }
    return this.requireCustomer(input.businessId, input.customerId);
  }

  async unlinkCustomerPet(
    actor: PersonView,
    rawInput: CustomerPetRelationshipInput,
    metadata: RequestMetadata,
  ) {
    const input = validateCustomerPetRelationshipInput(rawInput);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    const [customer, pet] = await Promise.all([
      this.requireCustomer(input.businessId, input.customerId),
      this.requirePet(input.businessId, input.petId),
    ]);
    if (!await this.customerPetRepository.hasActiveRelationship(input.businessId, input.customerId, input.petId)) {
      throw be1Error("NOT_FOUND");
    }
    const occurredAt = this.be2Now();
    await this.customerPetRepository.unlinkCustomerPet(
      customer,
      pet,
      this.authorizedMutation(actor, membership, metadata, occurredAt),
    );
    return this.requireCustomer(input.businessId, input.customerId);
  }

  async executeBe2<T extends Be2ApiOperation>(
    actor: PersonView,
    operation: T,
    metadata: RequestMetadata,
  ): Promise<Be2OperationResult<T>> {
    let result: unknown;
    switch (operation.type) {
      case "customer.list":
        result = await this.listCustomers(actor, operation.input);
        break;
      case "customer.search":
        result = await this.searchCustomers(actor, operation.input);
        break;
      case "customer.get":
        result = await this.getCustomer(actor, operation.businessId, operation.customerId);
        break;
      case "customer.create":
        result = await this.createCustomer(actor, operation.input, metadata);
        break;
      case "customer.update":
        result = await this.updateCustomer(actor, operation.input, metadata);
        break;
      case "customer.set-active":
        result = await this.setCustomerActive(actor, operation.businessId, operation.customerId, operation.active, metadata);
        break;
      case "customer.update-notes":
        result = await this.updateCustomerNotes(actor, operation.input, metadata);
        break;
      case "customer.update-tags":
        result = await this.updateCustomerTags(actor, operation.input, metadata);
        break;
      case "pet.get":
        result = await this.getPet(actor, operation.businessId, operation.petId);
        break;
      case "pet.create":
        result = await this.createPet(actor, operation.input, metadata);
        break;
      case "pet.update":
        result = await this.updatePet(actor, operation.input, metadata);
        break;
      case "pet.set-active":
        result = await this.setPetActive(actor, operation.businessId, operation.petId, operation.active, metadata);
        break;
      case "pet.link-customer":
        result = await this.linkCustomerPet(actor, operation.input, metadata);
        break;
      case "pet.unlink-customer":
        result = await this.unlinkCustomerPet(actor, operation.input, metadata);
        break;
    }
    return result as Be2OperationResult<T>;
  }

  private async requireCustomer(businessId: string, customerId: string) {
    const customer = await this.customerPetRepository.getCustomer(businessId, customerId);
    if (!customer) throw be1Error("NOT_FOUND");
    return customer;
  }

  private async requirePet(businessId: string, petId: string) {
    const pet = await this.customerPetRepository.getPet(businessId, petId);
    if (!pet) throw be1Error("NOT_FOUND");
    return pet;
  }

  private authorizedMutation(
    actor: PersonView,
    membership: BusinessMembershipView,
    metadata: RequestMetadata,
    occurredAt: string,
  ): AuthorizedMutation {
    return { actor, membership, metadata, occurredAt };
  }
}
