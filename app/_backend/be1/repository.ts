import type {
  BranchView,
  BusinessMembershipView,
  BusinessView,
  PersonView,
} from "./contracts";
import type { RequestMetadata } from "./metadata";

export type AuthorizedMutation = {
  actor: PersonView;
  membership: BusinessMembershipView;
  metadata: RequestMetadata;
  occurredAt: string;
};

export type BranchActivationResult = "updated" | "last-active-branch";

export interface Be1Repository {
  findPersonById(personId: string): Promise<PersonView | null>;
  listMembershipsForPerson(personId: string): Promise<BusinessMembershipView[]>;
  findMembership(personId: string, businessId: string): Promise<BusinessMembershipView | null>;
  getBusiness(businessId: string): Promise<BusinessView | null>;
  updateBusiness(before: BusinessView, after: BusinessView, context: AuthorizedMutation): Promise<BusinessView>;
  listBranchesForBusiness(businessId: string, includeInactive: boolean): Promise<BranchView[]>;
  listBranchesForMembership(membership: BusinessMembershipView, includeInactive: boolean): Promise<BranchView[]>;
  getBranch(businessId: string, branchId: string): Promise<BranchView | null>;
  hasBranchAccess(membershipId: string, businessId: string, branchId: string): Promise<boolean>;
  createBranch(branch: BranchView, context: AuthorizedMutation): Promise<BranchView>;
  updateBranch(before: BranchView, after: BranchView, action: string, context: AuthorizedMutation): Promise<BranchView>;
  setBranchActive(before: BranchView, active: boolean, context: AuthorizedMutation): Promise<BranchActivationResult>;
}

export type D1ResultLike<T = Record<string, unknown>> = {
  success?: boolean;
  results?: T[];
  meta?: {
    changes?: number;
  };
};

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1ResultLike<T>>;
  run<T = Record<string, unknown>>(): Promise<D1ResultLike<T>>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<D1ResultLike[]>;
}
