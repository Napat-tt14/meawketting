import type { Be1LifecycleStatus } from "../be1/contracts";
import { Be1Error, be1Error } from "../be1/errors";
import type {
  AuthorizedMutation,
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
} from "../be1/repository";
import type { CustomerPage, CustomerView, PetDetailView, PetProfileSource, PetSpecies, PetView } from "./contracts";
import type { Be2Repository, CustomerQuery } from "./repository";
import { normalizeCustomerSearchKey, normalizePhoneKey } from "./validation";

type CustomerRow = {
  id: string;
  business_id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  business_notes: string;
  status: Be1LifecycleStatus;
  created_at: string;
  updated_at: string;
};

type PetProfileRow = {
  business_id: string;
  pet_id: string;
  name: string;
  species: PetSpecies;
  profile_source: PetProfileSource;
  business_notes: string;
  status: Be1LifecycleStatus;
  created_at: string;
  updated_at: string;
};

type CustomerPetRow = PetProfileRow & { customer_id: string };
type TagRow = { customer_id: string; label: string };
type RelationshipRow = { id: string; customer_id: string; pet_id: string; status: Be1LifecycleStatus };

function assertSuccess(result: D1ResultLike | undefined) {
  if (!result || result.success === false) throw be1Error("PERSISTENCE_ERROR");
}

function constraintAware(error: unknown): never {
  if (error instanceof Be1Error) throw error;
  const message = error instanceof Error ? error.message : String(error);
  if (/unique constraint|uq_customers|uq_customer_pet_relationships|primary key/i.test(message)) {
    throw be1Error("CONFLICT", error);
  }
  throw be1Error("PERSISTENCE_ERROR", error);
}

function customerBase(row: CustomerRow): CustomerView {
  return {
    id: row.id,
    businessId: row.business_id,
    displayName: row.display_name,
    phone: row.phone,
    email: row.email,
    businessNotes: row.business_notes,
    tags: [],
    pets: [],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function petView(row: PetProfileRow): PetView {
  return {
    id: row.pet_id,
    businessId: row.business_id,
    name: row.name,
    species: row.species,
    profileSource: row.profile_source,
    businessNotes: row.business_notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function auditJson(value: unknown) {
  const serialized = JSON.stringify(value);
  return serialized.length <= 4_000 ? serialized : JSON.stringify({ truncated: true });
}

function customerAuditShape(customer: CustomerView) {
  return {
    id: customer.id,
    status: customer.status,
    hasPhone: customer.phone !== null,
    hasEmail: customer.email !== null,
    hasNotes: customer.businessNotes.length > 0,
    tagCount: customer.tags.length,
    petRelationshipCount: customer.pets.length,
  };
}

function petAuditShape(pet: PetView | PetDetailView) {
  return {
    id: pet.id,
    status: pet.status,
    species: pet.species,
    profileSource: pet.profileSource,
    hasNotes: pet.businessNotes.length > 0,
    relationshipCount: "customerIds" in pet ? pet.customerIds.length : undefined,
  };
}

export class D1Be2Repository implements Be2Repository {
  private readonly database: D1DatabaseLike;

  constructor(database: D1DatabaseLike) {
    this.database = database;
  }

  async listCustomers(query: CustomerQuery): Promise<CustomerPage> {
    const searchClause = query.queryKey ? `
      AND (
        c.display_name_key LIKE ? ESCAPE '\\'
        OR COALESCE(c.phone_key, '') LIKE ? ESCAPE '\\'
        OR EXISTS (
          SELECT 1
          FROM customer_pet_relationships relationship
          INNER JOIN business_pet_profiles profile
            ON profile.business_id = relationship.business_id AND profile.pet_id = relationship.pet_id
          WHERE relationship.business_id = c.business_id
            AND relationship.customer_id = c.id
            AND relationship.status = 'active'
            AND profile.status = 'active'
            AND profile.name_key LIKE ? ESCAPE '\\'
        )
      )
    ` : "";
    const searchValues = query.queryKey
      ? [
          `%${escapeLike(query.queryKey)}%`,
          query.phoneKey ? `%${escapeLike(query.phoneKey)}%` : "__no_phone_match__",
          `%${escapeLike(query.queryKey)}%`,
        ]
      : [];
    const whereValues = [query.businessId, query.includeInactive ? 1 : 0, ...searchValues];
    const count = await this.database.prepare(`
      SELECT COUNT(*) AS total
      FROM customers c
      WHERE c.business_id = ?
        AND (? = 1 OR c.status = 'active')
        ${searchClause}
    `).bind(...whereValues).first<{ total: number }>();
    const result = await this.database.prepare(`
      SELECT c.id, c.business_id, c.display_name, c.phone, c.email, c.business_notes,
             c.status, c.created_at, c.updated_at
      FROM customers c
      WHERE c.business_id = ?
        AND (? = 1 OR c.status = 'active')
        ${searchClause}
      ORDER BY c.display_name_key, c.id
      LIMIT ? OFFSET ?
    `).bind(...whereValues, query.limit, query.offset).all<CustomerRow>();
    assertSuccess(result);
    return {
      items: await this.hydrateCustomers(query.businessId, result.results ?? []),
      total: Number(count?.total ?? 0),
      limit: query.limit,
      offset: query.offset,
    };
  }

  async getCustomer(businessId: string, customerId: string) {
    const row = await this.database.prepare(`
      SELECT id, business_id, display_name, phone, email, business_notes, status, created_at, updated_at
      FROM customers
      WHERE business_id = ? AND id = ?
    `).bind(businessId, customerId).first<CustomerRow>();
    return row ? (await this.hydrateCustomers(businessId, [row]))[0] ?? null : null;
  }

  async findCustomerByPhoneKey(businessId: string, phoneKey: string, excludeCustomerId?: string) {
    const row = await this.database.prepare(`
      SELECT id, business_id, display_name, phone, email, business_notes, status, created_at, updated_at
      FROM customers
      WHERE business_id = ? AND phone_key = ?
        AND (? IS NULL OR id <> ?)
      ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at, id
      LIMIT 1
    `).bind(businessId, phoneKey, excludeCustomerId ?? null, excludeCustomerId ?? null).first<CustomerRow>();
    return row ? (await this.hydrateCustomers(businessId, [row]))[0] ?? null : null;
  }

  async createCustomer(customer: CustomerView, context: AuthorizedMutation) {
    const statements: D1PreparedStatementLike[] = [
      this.database.prepare(`
        INSERT INTO customers (
          id, business_id, display_name, display_name_key, phone, phone_key, email, business_notes,
          status, created_at, updated_at, created_by_person_id, updated_by_person_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        customer.id,
        customer.businessId,
        customer.displayName,
        normalizeCustomerSearchKey(customer.displayName),
        customer.phone,
        normalizePhoneKey(customer.phone),
        customer.email,
        customer.businessNotes,
        customer.status,
        customer.createdAt,
        customer.updatedAt,
        context.actor.id,
        context.actor.id,
      ),
      ...this.tagInsertStatements(customer, context),
      this.auditStatement("customer.created", "customer", customer.id, null, customerAuditShape(customer), context),
    ];
    try {
      const results = await this.database.batch(statements);
      results.forEach(assertSuccess);
      if ((results[0]?.meta?.changes ?? 0) !== 1) throw be1Error("PERSISTENCE_ERROR");
    } catch (error) {
      constraintAware(error);
    }
  }

  async updateCustomer(before: CustomerView, after: CustomerView, action: string, context: AuthorizedMutation) {
    try {
      const results = await this.database.batch([
        this.database.prepare(`
          UPDATE customers
          SET display_name = ?, display_name_key = ?, phone = ?, phone_key = ?, email = ?, business_notes = ?,
              updated_at = ?, updated_by_person_id = ?
          WHERE business_id = ? AND id = ?
        `).bind(
          after.displayName,
          normalizeCustomerSearchKey(after.displayName),
          after.phone,
          normalizePhoneKey(after.phone),
          after.email,
          after.businessNotes,
          after.updatedAt,
          context.actor.id,
          after.businessId,
          after.id,
        ),
        this.auditStatement(action, "customer", after.id, customerAuditShape(before), customerAuditShape(after), context),
      ]);
      results.forEach(assertSuccess);
      if ((results[0]?.meta?.changes ?? 0) !== 1) throw be1Error("NOT_FOUND");
    } catch (error) {
      constraintAware(error);
    }
  }

  async replaceCustomerTags(before: CustomerView, after: CustomerView, context: AuthorizedMutation) {
    const statements: D1PreparedStatementLike[] = [
      this.database.prepare("DELETE FROM customer_tags WHERE business_id = ? AND customer_id = ?").bind(after.businessId, after.id),
      ...this.tagInsertStatements(after, context),
      this.database.prepare(`
        UPDATE customers
        SET updated_at = ?, updated_by_person_id = ?
        WHERE business_id = ? AND id = ?
      `).bind(after.updatedAt, context.actor.id, after.businessId, after.id),
      this.auditStatement("customer.tags.updated", "customer", after.id, customerAuditShape(before), customerAuditShape(after), context),
    ];
    try {
      const results = await this.database.batch(statements);
      results.forEach(assertSuccess);
      const updateResult = results[1 + after.tags.length];
      if ((updateResult?.meta?.changes ?? 0) !== 1) throw be1Error("NOT_FOUND");
    } catch (error) {
      constraintAware(error);
    }
  }

  async setCustomerActive(before: CustomerView, after: CustomerView, context: AuthorizedMutation) {
    try {
      const results = await this.database.batch([
        this.database.prepare(`
          UPDATE customers
          SET status = ?, updated_at = ?, updated_by_person_id = ?
          WHERE business_id = ? AND id = ?
        `).bind(after.status, after.updatedAt, context.actor.id, after.businessId, after.id),
        this.auditStatement(
          after.status === "active" ? "customer.activated" : "customer.deactivated",
          "customer",
          after.id,
          customerAuditShape(before),
          customerAuditShape(after),
          context,
        ),
      ]);
      results.forEach(assertSuccess);
      if ((results[0]?.meta?.changes ?? 0) !== 1) throw be1Error("NOT_FOUND");
    } catch (error) {
      constraintAware(error);
    }
  }

  async getPet(businessId: string, petId: string): Promise<PetDetailView | null> {
    const row = await this.database.prepare(`
      SELECT business_id, pet_id, name, species, profile_source, business_notes, status, created_at, updated_at
      FROM business_pet_profiles
      WHERE business_id = ? AND pet_id = ?
    `).bind(businessId, petId).first<PetProfileRow>();
    if (!row) return null;
    const relationships = await this.database.prepare(`
      SELECT relationship.customer_id
      FROM customer_pet_relationships relationship
      INNER JOIN customers customer
        ON customer.business_id = relationship.business_id AND customer.id = relationship.customer_id
      WHERE relationship.business_id = ? AND relationship.pet_id = ?
        AND relationship.status = 'active' AND customer.status = 'active'
      ORDER BY relationship.created_at, relationship.customer_id
    `).bind(businessId, petId).all<{ customer_id: string }>();
    assertSuccess(relationships);
    return { ...petView(row), customerIds: (relationships.results ?? []).map((entry) => entry.customer_id) };
  }

  async listPetsByIds(businessId: string, petIds: string[]) {
    if (!petIds.length) return [];
    const result = await this.database.prepare(`
      SELECT business_id, pet_id, name, species, profile_source, business_notes, status, created_at, updated_at
      FROM business_pet_profiles
      WHERE business_id = ? AND pet_id IN (SELECT value FROM json_each(?))
      ORDER BY pet_id
    `).bind(businessId, JSON.stringify(petIds)).all<PetProfileRow>();
    assertSuccess(result);
    return (result.results ?? []).map(petView);
  }

  async listActiveRelationshipPetIds(businessId: string, customerId: string, petIds: string[]) {
    if (!petIds.length) return [];
    const result = await this.database.prepare(`
      SELECT pet_id
      FROM customer_pet_relationships
      WHERE business_id = ? AND customer_id = ? AND status = 'active'
        AND pet_id IN (SELECT value FROM json_each(?))
      ORDER BY pet_id
    `).bind(businessId, customerId, JSON.stringify(petIds)).all<{ pet_id: string }>();
    assertSuccess(result);
    return (result.results ?? []).map((row) => row.pet_id);
  }

  async findPetByNameKey(businessId: string, nameKey: string, species: PetSpecies, excludePetId?: string) {
    const row = await this.database.prepare(`
      SELECT business_id, pet_id, name, species, profile_source, business_notes, status, created_at, updated_at
      FROM business_pet_profiles
      WHERE business_id = ? AND name_key = ? AND species = ?
        AND (? IS NULL OR pet_id <> ?)
      ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at, pet_id
      LIMIT 1
    `).bind(businessId, nameKey, species, excludePetId ?? null, excludePetId ?? null).first<PetProfileRow>();
    return row ? petView(row) : null;
  }

  async createPetWithRelationship(
    pet: PetView,
    customer: CustomerView,
    relationshipId: string,
    context: AuthorizedMutation,
  ) {
    const relationship = { id: relationshipId, customerId: customer.id, petId: pet.id, status: "active" };
    const customerAfter = {
      ...customer,
      pets: [...customer.pets, pet],
      updatedAt: context.occurredAt,
    };
    try {
      const results = await this.database.batch([
        this.database.prepare(`
          INSERT INTO pets (id, created_at, created_by_person_id)
          VALUES (?, ?, ?)
        `).bind(pet.id, pet.createdAt, context.actor.id),
        this.database.prepare(`
          INSERT INTO business_pet_profiles (
            business_id, pet_id, name, name_key, species, profile_source, business_notes, status,
            created_at, updated_at, created_by_person_id, updated_by_person_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          pet.businessId,
          pet.id,
          pet.name,
          normalizeCustomerSearchKey(pet.name),
          pet.species,
          pet.profileSource,
          pet.businessNotes,
          pet.status,
          pet.createdAt,
          pet.updatedAt,
          context.actor.id,
          context.actor.id,
        ),
        this.database.prepare(`
          INSERT INTO customer_pet_relationships (
            id, business_id, customer_id, pet_id, status, created_at, updated_at,
            created_by_person_id, updated_by_person_id
          ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
        `).bind(
          relationshipId,
          pet.businessId,
          customer.id,
          pet.id,
          context.occurredAt,
          context.occurredAt,
          context.actor.id,
          context.actor.id,
        ),
        this.database.prepare(`
          UPDATE customers SET updated_at = ?, updated_by_person_id = ?
          WHERE business_id = ? AND id = ?
        `).bind(context.occurredAt, context.actor.id, pet.businessId, customer.id),
        this.auditStatement("pet.created", "pet", pet.id, null, petAuditShape(pet), context),
        this.auditStatement("customer-pet.linked", "customer_pet_relationship", relationshipId, null, relationship, context),
        this.auditStatement("customer.relationships.updated", "customer", customer.id, customerAuditShape(customer), customerAuditShape(customerAfter), context),
      ]);
      results.forEach(assertSuccess);
      if ((results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1 || (results[2]?.meta?.changes ?? 0) !== 1) {
        throw be1Error("PERSISTENCE_ERROR");
      }
    } catch (error) {
      constraintAware(error);
    }
  }

  async updatePet(before: PetDetailView, after: PetDetailView, context: AuthorizedMutation) {
    try {
      const results = await this.database.batch([
        this.database.prepare(`
          UPDATE business_pet_profiles
          SET name = ?, name_key = ?, species = ?, business_notes = ?, updated_at = ?, updated_by_person_id = ?
          WHERE business_id = ? AND pet_id = ?
        `).bind(
          after.name,
          normalizeCustomerSearchKey(after.name),
          after.species,
          after.businessNotes,
          after.updatedAt,
          context.actor.id,
          after.businessId,
          after.id,
        ),
        this.auditStatement("pet.updated", "pet", after.id, petAuditShape(before), petAuditShape(after), context),
      ]);
      results.forEach(assertSuccess);
      if ((results[0]?.meta?.changes ?? 0) !== 1) throw be1Error("NOT_FOUND");
    } catch (error) {
      constraintAware(error);
    }
  }

  async setPetActive(before: PetDetailView, after: PetDetailView, context: AuthorizedMutation) {
    try {
      const results = await this.database.batch([
        this.database.prepare(`
          UPDATE business_pet_profiles
          SET status = ?, updated_at = ?, updated_by_person_id = ?
          WHERE business_id = ? AND pet_id = ?
        `).bind(after.status, after.updatedAt, context.actor.id, after.businessId, after.id),
        this.auditStatement(
          after.status === "active" ? "pet.activated" : "pet.deactivated",
          "pet",
          after.id,
          petAuditShape(before),
          petAuditShape(after),
          context,
        ),
      ]);
      results.forEach(assertSuccess);
      if ((results[0]?.meta?.changes ?? 0) !== 1) throw be1Error("NOT_FOUND");
    } catch (error) {
      constraintAware(error);
    }
  }

  async hasActiveRelationship(businessId: string, customerId: string, petId: string) {
    const row = await this.database.prepare(`
      SELECT 1 AS linked
      FROM customer_pet_relationships
      WHERE business_id = ? AND customer_id = ? AND pet_id = ? AND status = 'active'
    `).bind(businessId, customerId, petId).first<{ linked: number }>();
    return row?.linked === 1;
  }

  async linkCustomerPet(
    customer: CustomerView,
    pet: PetDetailView,
    relationshipId: string,
    context: AuthorizedMutation,
  ) {
    const existing = await this.findRelationship(customer.businessId, customer.id, pet.id);
    const stableRelationshipId = existing?.id ?? relationshipId;
    const before = existing ? { id: existing.id, customerId: customer.id, petId: pet.id, status: existing.status } : null;
    const after = { id: stableRelationshipId, customerId: customer.id, petId: pet.id, status: "active" };
    const customerAfter = { ...customer, pets: [...customer.pets, pet], updatedAt: context.occurredAt };
    try {
      const results = await this.database.batch([
        this.database.prepare(`
          INSERT INTO customer_pet_relationships (
            id, business_id, customer_id, pet_id, status, created_at, updated_at,
            created_by_person_id, updated_by_person_id
          ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
          ON CONFLICT(business_id, customer_id, pet_id) DO UPDATE SET
            status = 'active', updated_at = excluded.updated_at, updated_by_person_id = excluded.updated_by_person_id
        `).bind(
          relationshipId,
          customer.businessId,
          customer.id,
          pet.id,
          context.occurredAt,
          context.occurredAt,
          context.actor.id,
          context.actor.id,
        ),
        this.database.prepare(`
          UPDATE customers SET updated_at = ?, updated_by_person_id = ?
          WHERE business_id = ? AND id = ?
        `).bind(context.occurredAt, context.actor.id, customer.businessId, customer.id),
        this.auditStatement("customer-pet.linked", "customer_pet_relationship", stableRelationshipId, before, after, context),
        this.auditStatement("customer.relationships.updated", "customer", customer.id, customerAuditShape(customer), customerAuditShape(customerAfter), context),
      ]);
      results.forEach(assertSuccess);
      if ((results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1) throw be1Error("NOT_FOUND");
    } catch (error) {
      constraintAware(error);
    }
  }

  async unlinkCustomerPet(customer: CustomerView, pet: PetDetailView, context: AuthorizedMutation) {
    const existing = await this.findRelationship(customer.businessId, customer.id, pet.id);
    if (!existing || existing.status !== "active") throw be1Error("NOT_FOUND");
    const before = { id: existing.id, customerId: customer.id, petId: pet.id, status: "active" };
    const after = { ...before, status: "inactive" };
    const customerAfter = {
      ...customer,
      pets: customer.pets.filter((entry) => entry.id !== pet.id),
      updatedAt: context.occurredAt,
    };
    try {
      const results = await this.database.batch([
        this.database.prepare(`
          UPDATE customer_pet_relationships
          SET status = 'inactive', updated_at = ?, updated_by_person_id = ?
          WHERE business_id = ? AND customer_id = ? AND pet_id = ? AND status = 'active'
        `).bind(context.occurredAt, context.actor.id, customer.businessId, customer.id, pet.id),
        this.database.prepare(`
          UPDATE customers SET updated_at = ?, updated_by_person_id = ?
          WHERE business_id = ? AND id = ?
        `).bind(context.occurredAt, context.actor.id, customer.businessId, customer.id),
        this.auditStatement("customer-pet.unlinked", "customer_pet_relationship", existing.id, before, after, context),
        this.auditStatement("customer.relationships.updated", "customer", customer.id, customerAuditShape(customer), customerAuditShape(customerAfter), context),
      ]);
      results.forEach(assertSuccess);
      if ((results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1) throw be1Error("NOT_FOUND");
    } catch (error) {
      constraintAware(error);
    }
  }

  private async hydrateCustomers(businessId: string, rows: CustomerRow[]) {
    if (!rows.length) return [];
    const placeholders = rows.map(() => "?").join(", ");
    const ids = rows.map((row) => row.id);
    const [tags, pets] = await Promise.all([
      this.database.prepare(`
        SELECT customer_id, label
        FROM customer_tags
        WHERE business_id = ? AND customer_id IN (${placeholders})
        ORDER BY customer_id, position, tag_key
      `).bind(businessId, ...ids).all<TagRow>(),
      this.database.prepare(`
        SELECT relationship.customer_id, profile.business_id, profile.pet_id, profile.name,
               profile.species, profile.profile_source, profile.business_notes, profile.status,
               profile.created_at, profile.updated_at
        FROM customer_pet_relationships relationship
        INNER JOIN business_pet_profiles profile
          ON profile.business_id = relationship.business_id AND profile.pet_id = relationship.pet_id
        WHERE relationship.business_id = ? AND relationship.customer_id IN (${placeholders})
          AND relationship.status = 'active' AND profile.status = 'active'
        ORDER BY relationship.customer_id, relationship.created_at, profile.name_key, profile.pet_id
      `).bind(businessId, ...ids).all<CustomerPetRow>(),
    ]);
    assertSuccess(tags);
    assertSuccess(pets);
    const tagsByCustomer = new Map<string, string[]>();
    for (const row of tags.results ?? []) {
      const current = tagsByCustomer.get(row.customer_id) ?? [];
      current.push(row.label);
      tagsByCustomer.set(row.customer_id, current);
    }
    const petsByCustomer = new Map<string, PetView[]>();
    for (const row of pets.results ?? []) {
      const current = petsByCustomer.get(row.customer_id) ?? [];
      current.push(petView(row));
      petsByCustomer.set(row.customer_id, current);
    }
    return rows.map((row) => ({
      ...customerBase(row),
      tags: tagsByCustomer.get(row.id) ?? [],
      pets: petsByCustomer.get(row.id) ?? [],
    }));
  }

  private tagInsertStatements(customer: CustomerView, context: AuthorizedMutation) {
    return customer.tags.map((label, position) => this.database.prepare(`
      INSERT INTO customer_tags (
        business_id, customer_id, tag_key, label, position, created_at, updated_at,
        created_by_person_id, updated_by_person_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      customer.businessId,
      customer.id,
      normalizeCustomerSearchKey(label),
      label,
      position,
      context.occurredAt,
      context.occurredAt,
      context.actor.id,
      context.actor.id,
    ));
  }

  private async findRelationship(businessId: string, customerId: string, petId: string) {
    return this.database.prepare(`
      SELECT id, customer_id, pet_id, status
      FROM customer_pet_relationships
      WHERE business_id = ? AND customer_id = ? AND pet_id = ?
    `).bind(businessId, customerId, petId).first<RelationshipRow>();
  }

  private auditStatement(
    action: string,
    targetType: string,
    targetId: string,
    before: unknown,
    after: unknown,
    context: AuthorizedMutation,
  ) {
    return this.database.prepare(`
      INSERT INTO audit_events (
        id, actor_person_id, actor_membership_id, business_id, branch_id, request_id,
        correlation_id, action, target_type, target_id, before_json, after_json, occurred_at
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      this.auditId(),
      context.actor.id,
      context.membership.id,
      context.membership.businessId,
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
