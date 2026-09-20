import type {
  Be1LifecycleStatus,
  Be1Role,
  Be1ServiceModule,
  Be1Weekday,
  BranchView,
  BusinessMembershipView,
  BusinessView,
  OperatingHoursView,
  PersonView,
} from "./contracts";
import { be1Error } from "./errors";
import type {
  AuthorizedMutation,
  Be1Repository,
  BranchActivationResult,
  Database,
  PreparedStatement,
  QueryResult,
} from "./repository";
import { normalizeBranchNameKey } from "./validation";

type PersonRow = {
  id: string;
  display_name: string;
  primary_email: string | null;
  status: Be1LifecycleStatus;
  created_at: string;
  updated_at: string;
};

type MembershipRow = {
  id: string;
  person_id: string;
  business_id: string;
  role: Be1Role;
  status: Be1LifecycleStatus;
  created_at: string;
  updated_at: string;
};

type BusinessRow = {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  description: string;
  address: string;
  logo_url: string | null;
  status: Be1LifecycleStatus;
  created_at: string;
  updated_at: string;
};

type BranchRow = {
  id: string;
  business_id: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  status: Be1LifecycleStatus;
  created_at: string;
  updated_at: string;
};

type ModuleRow = { branch_id: string; module: Be1ServiceModule };
type HoursRow = {
  branch_id: string;
  weekday: Be1Weekday;
  closed: number | boolean;
  opens_at: string;
  closes_at: string;
};

function personView(row: PersonRow): PersonView {
  return {
    id: row.id,
    displayName: row.display_name,
    primaryEmail: row.primary_email,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function membershipView(row: MembershipRow): BusinessMembershipView {
  return {
    id: row.id,
    personId: row.person_id,
    businessId: row.business_id,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function businessView(row: BusinessRow): BusinessView {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    description: row.description,
    address: row.address,
    logoUrl: row.logo_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function auditJson(value: unknown) {
  const serialized = JSON.stringify(value);
  return serialized.length <= 32_000 ? serialized : JSON.stringify({ truncated: true });
}

function assertSuccess(result: QueryResult | undefined) {
  if (!result || result.success === false) throw be1Error("PERSISTENCE_ERROR");
}

function constraintAware(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/unique constraint|uq_branches_business_name_key/i.test(message)) throw be1Error("CONFLICT", error);
  throw be1Error("PERSISTENCE_ERROR", error);
}

export class PostgresBe1Repository implements Be1Repository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async findPersonById(personId: string) {
    const row = await this.database.prepare(`
      SELECT id, display_name, primary_email, status, created_at, updated_at
      FROM persons
      WHERE id = ?
    `).bind(personId).first<PersonRow>();
    return row ? personView(row) : null;
  }

  async listMembershipsForPerson(personId: string) {
    const result = await this.database.prepare(`
      SELECT id, person_id, business_id, role, status, created_at, updated_at
      FROM business_memberships
      WHERE person_id = ?
      ORDER BY created_at, id
    `).bind(personId).all<MembershipRow>();
    assertSuccess(result);
    return (result.results ?? []).map(membershipView);
  }

  async findMembership(personId: string, businessId: string) {
    const row = await this.database.prepare(`
      SELECT id, person_id, business_id, role, status, created_at, updated_at
      FROM business_memberships
      WHERE person_id = ? AND business_id = ?
    `).bind(personId, businessId).first<MembershipRow>();
    return row ? membershipView(row) : null;
  }

  async getBusiness(businessId: string) {
    const row = await this.database.prepare(`
      SELECT id, name, contact_name, phone, email, description, address, logo_url,
             status, created_at, updated_at
      FROM businesses
      WHERE id = ?
    `).bind(businessId).first<BusinessRow>();
    return row ? businessView(row) : null;
  }

  async updateBusiness(before: BusinessView, after: BusinessView, context: AuthorizedMutation) {
    try {
      const results = await this.database.batch([
        this.database.prepare(`
          UPDATE businesses
          SET name = ?, contact_name = ?, phone = ?, email = ?, description = ?, address = ?,
              updated_at = ?, updated_by_person_id = ?
          WHERE id = ?
        `).bind(
          after.name,
          after.contactName,
          after.phone,
          after.email,
          after.description,
          after.address,
          after.updatedAt,
          context.actor.id,
          after.id,
        ),
        this.auditStatement("business.profile.updated", "business", after.id, null, before, after, context),
      ]);
      results.forEach(assertSuccess);
      if ((results[0]?.meta?.changes ?? 0) !== 1) throw be1Error("NOT_FOUND");
      return after;
    } catch (error) {
      if (error instanceof Error && "code" in error) throw error;
      return constraintAware(error);
    }
  }

  async listBranchesForBusiness(businessId: string, includeInactive: boolean) {
    const result = await this.database.prepare(`
      SELECT id, business_id, name, area, address, phone, email, timezone, status, created_at, updated_at
      FROM branches
      WHERE business_id = ? AND (? = 1 OR status = 'active')
      ORDER BY created_at, name, id
    `).bind(businessId, includeInactive ? 1 : 0).all<BranchRow>();
    assertSuccess(result);
    return this.hydrateBranches(businessId, result.results ?? []);
  }

  async listBranchesForMembership(membership: BusinessMembershipView, includeInactive: boolean) {
    const result = await this.database.prepare(`
      SELECT b.id, b.business_id, b.name, b.area, b.address, b.phone, b.email, b.timezone,
             b.status, b.created_at, b.updated_at
      FROM branches b
      INNER JOIN membership_branch_access access
        ON access.business_id = b.business_id AND access.branch_id = b.id
      WHERE access.membership_id = ?
        AND access.business_id = ?
        AND access.status = 'active'
        AND (? = 1 OR b.status = 'active')
      ORDER BY b.created_at, b.name, b.id
    `).bind(membership.id, membership.businessId, includeInactive ? 1 : 0).all<BranchRow>();
    assertSuccess(result);
    return this.hydrateBranches(membership.businessId, result.results ?? []);
  }

  async getBranch(businessId: string, branchId: string) {
    const row = await this.database.prepare(`
      SELECT id, business_id, name, area, address, phone, email, timezone, status, created_at, updated_at
      FROM branches
      WHERE business_id = ? AND id = ?
    `).bind(businessId, branchId).first<BranchRow>();
    if (!row) return null;
    return (await this.hydrateBranches(businessId, [row]))[0] ?? null;
  }

  async hasBranchAccess(membershipId: string, businessId: string, branchId: string) {
    const row = await this.database.prepare(`
      SELECT 1 AS permitted
      FROM membership_branch_access
      WHERE membership_id = ? AND business_id = ? AND branch_id = ? AND status = 'active'
    `).bind(membershipId, businessId, branchId).first<{ permitted: number }>();
    return row?.permitted === 1;
  }

  async createBranch(branch: BranchView, context: AuthorizedMutation) {
    const statements: PreparedStatement[] = [
      this.database.prepare(`
        INSERT INTO branches (
          id, business_id, name, name_key, area, address, phone, email, timezone, status,
          created_at, updated_at, created_by_person_id, updated_by_person_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        branch.id,
        branch.businessId,
        branch.name,
        normalizeBranchNameKey(branch.name),
        branch.area,
        branch.address,
        branch.phone,
        branch.email,
        branch.timezone,
        branch.status,
        branch.createdAt,
        branch.updatedAt,
        context.actor.id,
        context.actor.id,
      ),
      ...this.moduleInsertStatements(branch, context),
      ...this.hoursInsertStatements(branch, context),
      this.auditStatement("branch.created", "branch", branch.id, branch.id, null, branch, context),
    ];
    try {
      const results = await this.database.batch(statements);
      results.forEach(assertSuccess);
      return branch;
    } catch (error) {
      return constraintAware(error);
    }
  }

  async updateBranch(before: BranchView, after: BranchView, action: string, context: AuthorizedMutation) {
    const statements: PreparedStatement[] = [
      this.database.prepare(`
        UPDATE branches
        SET name = ?, name_key = ?, area = ?, address = ?, phone = ?, email = ?, timezone = ?,
            updated_at = ?, updated_by_person_id = ?
        WHERE business_id = ? AND id = ?
      `).bind(
        after.name,
        normalizeBranchNameKey(after.name),
        after.area,
        after.address,
        after.phone,
        after.email,
        after.timezone,
        after.updatedAt,
        context.actor.id,
        after.businessId,
        after.id,
      ),
      this.database.prepare("DELETE FROM branch_enabled_modules WHERE business_id = ? AND branch_id = ?").bind(after.businessId, after.id),
      ...this.moduleInsertStatements(after, context),
      this.database.prepare("DELETE FROM branch_operating_hours WHERE business_id = ? AND branch_id = ?").bind(after.businessId, after.id),
      ...this.hoursInsertStatements(after, context),
      this.auditStatement(action, "branch", after.id, after.id, before, after, context),
    ];
    try {
      const results = await this.database.batch(statements);
      results.forEach(assertSuccess);
      if ((results[0]?.meta?.changes ?? 0) !== 1) throw be1Error("NOT_FOUND");
      return after;
    } catch (error) {
      if (error instanceof Error && "code" in error) throw error;
      return constraintAware(error);
    }
  }

  async setBranchActive(before: BranchView, active: boolean, context: AuthorizedMutation): Promise<BranchActivationResult> {
    const status: Be1LifecycleStatus = active ? "active" : "inactive";
    const after = { ...before, status, updatedAt: context.occurredAt };
    const results = await this.database.batch([
      this.database.prepare(`
        UPDATE branches
        SET status = ?, updated_at = ?, updated_by_person_id = ?
        WHERE business_id = ? AND id = ?
          AND (
            ? = 'active'
            OR status = 'inactive'
            OR EXISTS (
              SELECT 1 FROM branches sibling
              WHERE sibling.business_id = ? AND sibling.id <> ? AND sibling.status = 'active'
            )
          )
      `).bind(
        status,
        context.occurredAt,
        context.actor.id,
        before.businessId,
        before.id,
        status,
        before.businessId,
        before.id,
      ),
      this.database.prepare(`
        INSERT INTO audit_events (
          id, actor_person_id, actor_membership_id, business_id, branch_id, request_id,
          correlation_id, action, target_type, target_id, before_json, after_json, occurred_at
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'branch', ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM branches
          WHERE business_id = ? AND id = ? AND status = ? AND updated_at = ?
        )
      `).bind(
        this.auditId(),
        context.actor.id,
        context.membership.id,
        before.businessId,
        before.id,
        context.metadata.requestId,
        context.metadata.correlationId,
        active ? "branch.activated" : "branch.deactivated",
        before.id,
        auditJson(before),
        auditJson(after),
        context.occurredAt,
        before.businessId,
        before.id,
        status,
        context.occurredAt,
      ),
    ]);
    results.forEach(assertSuccess);
    return (results[0]?.meta?.changes ?? 0) === 1 ? "updated" : "last-active-branch";
  }

  private async hydrateBranches(businessId: string, rows: BranchRow[]): Promise<BranchView[]> {
    if (!rows.length) return [];
    const [modulesResult, hoursResult] = await Promise.all([
      this.database.prepare(`
        SELECT branch_id, module
        FROM branch_enabled_modules
        WHERE business_id = ?
        ORDER BY branch_id, CASE module WHEN 'grooming' THEN 1 WHEN 'hotel' THEN 2 ELSE 3 END
      `).bind(businessId).all<ModuleRow>(),
      this.database.prepare(`
        SELECT branch_id, weekday, closed, opens_at, closes_at
        FROM branch_operating_hours
        WHERE business_id = ?
        ORDER BY branch_id, CASE weekday
          WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6 ELSE 7 END
      `).bind(businessId).all<HoursRow>(),
    ]);
    assertSuccess(modulesResult);
    assertSuccess(hoursResult);
    const modulesByBranch = new Map<string, Be1ServiceModule[]>();
    for (const row of modulesResult.results ?? []) {
      const modules = modulesByBranch.get(row.branch_id) ?? [];
      modules.push(row.module);
      modulesByBranch.set(row.branch_id, modules);
    }
    const hoursByBranch = new Map<string, OperatingHoursView[]>();
    for (const row of hoursResult.results ?? []) {
      const hours = hoursByBranch.get(row.branch_id) ?? [];
      hours.push({ day: row.weekday, closed: row.closed === 1 || row.closed === true, open: row.opens_at, close: row.closes_at });
      hoursByBranch.set(row.branch_id, hours);
    }
    return rows.map((row) => ({
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      area: row.area,
      address: row.address,
      phone: row.phone,
      email: row.email,
      timezone: row.timezone,
      status: row.status,
      enabledModules: modulesByBranch.get(row.id) ?? [],
      operatingHours: hoursByBranch.get(row.id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  private moduleInsertStatements(branch: BranchView, context: AuthorizedMutation) {
    return branch.enabledModules.map((module) => this.database.prepare(`
      INSERT INTO branch_enabled_modules (business_id, branch_id, module, created_at, created_by_person_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(branch.businessId, branch.id, module, context.occurredAt, context.actor.id));
  }

  private hoursInsertStatements(branch: BranchView, context: AuthorizedMutation) {
    return branch.operatingHours.map((entry) => this.database.prepare(`
      INSERT INTO branch_operating_hours (
        business_id, branch_id, weekday, closed, opens_at, closes_at, updated_at, updated_by_person_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      branch.businessId,
      branch.id,
      entry.day,
      entry.closed ? 1 : 0,
      entry.open,
      entry.close,
      context.occurredAt,
      context.actor.id,
    ));
  }

  private auditStatement(
    action: string,
    targetType: string,
    targetId: string,
    branchId: string | null,
    before: unknown,
    after: unknown,
    context: AuthorizedMutation,
  ) {
    return this.database.prepare(`
      INSERT INTO audit_events (
        id, actor_person_id, actor_membership_id, business_id, branch_id, request_id,
        correlation_id, action, target_type, target_id, before_json, after_json, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      this.auditId(),
      context.actor.id,
      context.membership.id,
      context.membership.businessId,
      branchId,
      context.metadata.requestId,
      context.metadata.correlationId,
      action,
      targetType,
      targetId,
      before === null ? null : auditJson(before),
      after === null ? null : auditJson(after),
      context.occurredAt,
    );
  }

  private auditId() {
    return `aud_${crypto.randomUUID().replaceAll("-", "")}`;
  }
}

