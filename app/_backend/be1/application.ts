import type {
  Be1ApiOperation,
  Be1OperationResult,
  BranchConfigurationInput,
  BranchView,
  BusinessMembershipView,
  BusinessSessionView,
  BusinessView,
  OperatingHoursView,
  PersonView,
  UpdateBusinessProfileInput,
} from "./contracts";
import { be1Error } from "./errors";
import type { RequestMetadata } from "./metadata";
import type { AuthorizedMutation, Be1Repository } from "./repository";
import {
  normalizeBranchNameKey,
  validateBranchConfigurationInput,
  validateBusinessProfileInput,
  validateEnabledModules,
  validateId,
  validateOperatingHours,
} from "./validation";

export type Be1ApplicationDependencies = {
  now?: () => string;
  id?: (prefix: "brn") => string;
};

export class Be1Application {
  private readonly repository: Be1Repository;
  private readonly now: () => string;
  private readonly id: (prefix: "brn") => string;

  constructor(
    repository: Be1Repository,
    dependencies: Be1ApplicationDependencies = {},
  ) {
    this.repository = repository;
    this.now = dependencies.now ?? (() => new Date().toISOString());
    this.id = dependencies.id ?? ((prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`);
  }

  async resolvePerson(personId: string) {
    const actor = await this.repository.findPersonById(validateId(personId));
    if (!actor) throw be1Error("UNAUTHENTICATED");
    if (actor.status !== "active") throw be1Error("PERSON_INACTIVE");
    return actor;
  }

  async resolveMembership(actor: PersonView, businessId: string) {
    const membership = await this.repository.findMembership(actor.id, validateId(businessId));
    if (!membership) throw be1Error("FORBIDDEN");
    if (membership.status !== "active") throw be1Error("MEMBERSHIP_INACTIVE");
    const business = await this.repository.getBusiness(membership.businessId);
    if (!business || business.status !== "active") throw be1Error("FORBIDDEN");
    return { membership, business };
  }

  async resolveSession(actor: PersonView): Promise<BusinessSessionView> {
    const memberships = await this.repository.listMembershipsForPerson(actor.id);
    const workspaces: BusinessSessionView["workspaces"] = [];
    for (const membership of memberships) {
      if (membership.status !== "active") continue;
      const business = await this.repository.getBusiness(membership.businessId);
      if (!business || business.status !== "active") continue;
      const permittedBranches = await this.listPermittedBranchesForMembership(membership, membership.role === "OWNER");
      workspaces.push({ membership, business, permittedBranches });
    }
    if (!workspaces.length) throw be1Error("FORBIDDEN");
    return { person: actor, workspaces };
  }

  async getBusiness(actor: PersonView, businessId: string) {
    return (await this.resolveMembership(actor, businessId)).business;
  }

  async updateBusiness(
    actor: PersonView,
    rawInput: UpdateBusinessProfileInput,
    metadata: RequestMetadata,
  ) {
    const input = validateBusinessProfileInput(rawInput);
    const { membership, business } = await this.resolveMembership(actor, input.businessId);
    this.requireOwner(membership);
    const occurredAt = this.now();
    const after: BusinessView = {
      ...business,
      name: input.name,
      contactName: input.contactName,
      phone: input.phone,
      email: input.email,
      description: input.description,
      address: input.address,
      updatedAt: occurredAt,
    };
    return this.repository.updateBusiness(business, after, this.mutation(actor, membership, metadata, occurredAt));
  }

  async listPermittedBranches(actor: PersonView, businessId: string, includeInactive = false) {
    const { membership } = await this.resolveMembership(actor, businessId);
    if (includeInactive && membership.role !== "OWNER") throw be1Error("FORBIDDEN");
    return this.listPermittedBranchesForMembership(membership, includeInactive);
  }

  async getBranch(actor: PersonView, businessId: string, branchId: string) {
    const { membership } = await this.resolveMembership(actor, businessId);
    return this.authorizeBranch(membership, validateId(branchId));
  }

  async createBranch(
    actor: PersonView,
    rawInput: BranchConfigurationInput,
    metadata: RequestMetadata,
  ) {
    const input = validateBranchConfigurationInput(rawInput);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    this.requireOwner(membership);
    await this.assertUniqueBranchName(input.businessId, input.name);
    const occurredAt = this.now();
    const branch: BranchView = {
      id: this.id("brn"),
      businessId: input.businessId,
      name: input.name,
      area: input.area,
      address: input.address,
      phone: input.phone,
      email: input.email,
      timezone: input.timezone,
      status: "active",
      enabledModules: input.enabledModules,
      operatingHours: input.operatingHours,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    };
    return this.repository.createBranch(branch, this.mutation(actor, membership, metadata, occurredAt));
  }

  async updateBranch(
    actor: PersonView,
    rawInput: BranchConfigurationInput & { branchId: string },
    metadata: RequestMetadata,
  ) {
    const input = validateBranchConfigurationInput(rawInput, true) as BranchConfigurationInput & { branchId: string };
    const { membership } = await this.resolveMembership(actor, input.businessId);
    this.requireOwner(membership);
    const before = await this.authorizeBranch(membership, input.branchId);
    await this.assertUniqueBranchName(input.businessId, input.name, input.branchId);
    const occurredAt = this.now();
    const after: BranchView = {
      ...before,
      name: input.name,
      area: input.area,
      address: input.address,
      phone: input.phone,
      email: input.email,
      timezone: input.timezone,
      enabledModules: input.enabledModules,
      operatingHours: input.operatingHours,
      updatedAt: occurredAt,
    };
    return this.repository.updateBranch(before, after, "branch.configuration.updated", this.mutation(actor, membership, metadata, occurredAt));
  }

  async setBranchActive(
    actor: PersonView,
    businessId: string,
    branchId: string,
    active: boolean,
    metadata: RequestMetadata,
  ) {
    const { membership } = await this.resolveMembership(actor, validateId(businessId));
    this.requireOwner(membership);
    const before = await this.authorizeBranch(membership, validateId(branchId));
    const status = active ? "active" : "inactive";
    if (before.status === status) return before;
    const occurredAt = this.now();
    const result = await this.repository.setBranchActive(before, active, this.mutation(actor, membership, metadata, occurredAt));
    if (result === "last-active-branch") throw be1Error("LAST_ACTIVE_BRANCH");
    return { ...before, status, updatedAt: occurredAt } as BranchView;
  }

  async updateOperatingHours(
    actor: PersonView,
    businessId: string,
    branchId: string,
    rawHours: OperatingHoursView[],
    metadata: RequestMetadata,
  ) {
    const { membership } = await this.resolveMembership(actor, validateId(businessId));
    this.requireOwner(membership);
    const before = await this.authorizeBranch(membership, validateId(branchId));
    const occurredAt = this.now();
    const after = { ...before, operatingHours: validateOperatingHours(rawHours), updatedAt: occurredAt };
    return this.repository.updateBranch(before, after, "branch.operating-hours.updated", this.mutation(actor, membership, metadata, occurredAt));
  }

  async updateEnabledModules(
    actor: PersonView,
    businessId: string,
    branchId: string,
    rawModules: BranchView["enabledModules"],
    metadata: RequestMetadata,
  ) {
    const { membership } = await this.resolveMembership(actor, validateId(businessId));
    this.requireOwner(membership);
    const before = await this.authorizeBranch(membership, validateId(branchId));
    const occurredAt = this.now();
    const after = { ...before, enabledModules: validateEnabledModules(rawModules), updatedAt: occurredAt };
    return this.repository.updateBranch(before, after, "branch.enabled-modules.updated", this.mutation(actor, membership, metadata, occurredAt));
  }

  async execute<T extends Be1ApiOperation>(
    actor: PersonView,
    operation: T,
    metadata: RequestMetadata,
  ): Promise<Be1OperationResult<T>> {
    let result: unknown;
    switch (operation.type) {
      case "session.resolve":
        result = await this.resolveSession(actor);
        break;
      case "membership.resolve":
        result = (await this.resolveMembership(actor, operation.businessId)).membership;
        break;
      case "business.get":
        result = await this.getBusiness(actor, operation.businessId);
        break;
      case "business.update":
        result = await this.updateBusiness(actor, operation.input, metadata);
        break;
      case "branch.list":
        result = await this.listPermittedBranches(actor, operation.businessId, operation.includeInactive);
        break;
      case "branch.get":
        result = await this.getBranch(actor, operation.businessId, operation.branchId);
        break;
      case "branch.create":
        result = await this.createBranch(actor, operation.input, metadata);
        break;
      case "branch.update":
        result = await this.updateBranch(actor, operation.input, metadata);
        break;
      case "branch.set-active":
        result = await this.setBranchActive(actor, operation.businessId, operation.branchId, operation.active, metadata);
        break;
      case "branch.update-hours":
        result = await this.updateOperatingHours(actor, operation.businessId, operation.branchId, operation.operatingHours, metadata);
        break;
      case "branch.update-modules":
        result = await this.updateEnabledModules(actor, operation.businessId, operation.branchId, operation.enabledModules, metadata);
        break;
    }
    return result as Be1OperationResult<T>;
  }

  private async listPermittedBranchesForMembership(membership: BusinessMembershipView, includeInactive: boolean) {
    if (membership.role === "OWNER") {
      return this.repository.listBranchesForBusiness(membership.businessId, includeInactive);
    }
    return this.repository.listBranchesForMembership(membership, false);
  }

  private async authorizeBranch(membership: BusinessMembershipView, branchId: string) {
    const branch = await this.repository.getBranch(membership.businessId, branchId);
    if (!branch) throw be1Error("NOT_FOUND");
    if (membership.role !== "OWNER") {
      if (branch.status !== "active") throw be1Error("NOT_FOUND");
      const permitted = await this.repository.hasBranchAccess(membership.id, membership.businessId, branch.id);
      if (!permitted) throw be1Error("NOT_FOUND");
    }
    return branch;
  }

  private requireOwner(membership: BusinessMembershipView) {
    if (membership.role !== "OWNER") throw be1Error("FORBIDDEN");
  }

  private async assertUniqueBranchName(businessId: string, name: string, exceptBranchId?: string) {
    const key = normalizeBranchNameKey(name);
    const branches = await this.repository.listBranchesForBusiness(businessId, true);
    if (branches.some((branch) => branch.id !== exceptBranchId && normalizeBranchNameKey(branch.name) === key)) {
      throw be1Error("CONFLICT");
    }
  }

  private mutation(
    actor: PersonView,
    membership: BusinessMembershipView,
    metadata: RequestMetadata,
    occurredAt: string,
  ): AuthorizedMutation {
    return { actor, membership, metadata, occurredAt };
  }
}
