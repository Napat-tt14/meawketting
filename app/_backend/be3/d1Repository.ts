import { Be1Error, be1Error } from "../be1/errors";
import type { D1DatabaseLike, D1PreparedStatementLike, D1ResultLike } from "../be1/repository";
import type { AuthorizedMutation } from "../be1/repository";
import type {
  BookingCatalogView,
  BookingResourceAvailabilityState,
  BookingResourceCapacityMode,
  BookingResourceKind,
  BookingResourceView,
  BookingServiceView,
  BookingStatus,
  BookingTimeModel,
  BookingView,
} from "./contracts";
import { Be3WriteConflict, be3WriteConflict } from "./errors";
import type {
  Be3Repository,
  BookingPersistenceWrite,
  BookingQuery,
} from "./repository";

type ServiceRow = {
  id: string;
  business_id: string;
  branch_id: string;
  module: BookingServiceView["module"];
  label: string;
  time_model: BookingTimeModel;
  default_duration_minutes: number | null;
  estimate: number | null;
  status: "active" | "inactive";
};

type ResourceRow = {
  id: string;
  business_id: string;
  branch_id: string;
  module: BookingResourceView["module"];
  kind: BookingResourceKind;
  label: string;
  capacity_mode: BookingResourceCapacityMode;
  capacity: number;
  compatibility_staff_id: string | null;
  hotel_role: "planning-capacity" | null;
  status: "active" | "inactive";
};

type BookingRow = {
  id: string;
  business_id: string;
  branch_id: string;
  customer_id: string;
  customer_name: string;
  service_id: string;
  service_label: string;
  service_module: BookingView["serviceModule"];
  time_model: BookingTimeModel;
  start_local: string;
  end_local: string | null;
  status: BookingStatus;
  estimate: number | null;
  notes: string;
  revision: number;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
};

type PetRow = { booking_id: string; pet_id: string; name: string; species: "cat" | "dog" };
type AssignmentRow = { booking_id: string; resource_id: string };
type RequirementRow = { service_id: string; resource_kind: BookingResourceKind };
type ResourceServiceRow = { resource_id: string; service_id: string };
type AvailabilityRow = { resource_id: string; id: string; state: BookingResourceAvailabilityState; start_local: string; end_local: string };

function assertSuccess(result: D1ResultLike | undefined) {
  if (!result || result.success === false) throw be1Error("PERSISTENCE_ERROR");
}

function auditJson(value: unknown) {
  const serialized = JSON.stringify(value);
  return serialized.length <= 32_000 ? serialized : JSON.stringify({ truncated: true });
}

function bookingAuditShape(booking: BookingView) {
  return {
    bookingId: booking.id,
    customerId: booking.customerId,
    petIds: booking.pets.map((pet) => pet.id),
    serviceId: booking.serviceId,
    module: booking.serviceModule,
    timeModel: booking.timeModel,
    start: booking.start,
    end: booking.end,
    resourceIds: booking.assignedResourceIds,
    status: booking.status,
    revision: booking.revision,
  };
}

function constraintAware(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const markers: [RegExp, Parameters<typeof be3WriteConflict>[0]][] = [
    [/BE3_TIME_CONFLICT/i, "TIME_CONFLICT"],
    [/BE3_CAPACITY_CONFLICT/i, "CAPACITY_CONFLICT"],
    [/BE3_BRANCH_INACTIVE/i, "BRANCH_INACTIVE"],
    [/BE3_BRANCH_CLOSED/i, "BRANCH_CLOSED"],
    [/BE3_OUTSIDE_OPERATING_HOURS/i, "OUTSIDE_OPERATING_HOURS"],
    [/BE3_MODULE_DISABLED/i, "MODULE_DISABLED"],
    [/BE3_SERVICE_UNAVAILABLE/i, "SERVICE_UNAVAILABLE"],
    [/BE3_CUSTOMER_UNAVAILABLE/i, "CUSTOMER_UNAVAILABLE"],
    [/BE3_PET_UNAVAILABLE/i, "PET_UNAVAILABLE"],
    [/BE3_RELATIONSHIP_MISSING/i, "CUSTOMER_PET_RELATIONSHIP_MISSING"],
    [/BE3_MISSING_RESOURCE/i, "MISSING_RESOURCE"],
    [/BE3_RESOURCE_UNAVAILABLE|BE3_RESERVATION_INTEGRITY/i, "RESOURCE_UNAVAILABLE"],
    [/BE3_STAFF_UNAVAILABLE/i, "STAFF_UNAVAILABLE"],
    [/uq_bookings_business_idempotency|bookings\.business_id, bookings\.idempotency_key|UNIQUE constraint failed: bookings\.business_id, bookings\.idempotency_key/i, "IDEMPOTENCY_KEY_REUSED"],
  ];
  for (const [pattern, code] of markers) if (pattern.test(message)) throw be3WriteConflict(code, error);
  if (/foreign key constraint/i.test(message)) throw be1Error("NOT_FOUND", error);
  throw be1Error("PERSISTENCE_ERROR", error);
}

function serviceView(row: ServiceRow, requirements: BookingResourceKind[]): BookingServiceView {
  return {
    id: row.id,
    businessId: row.business_id,
    branchId: row.branch_id,
    module: row.module,
    label: row.label,
    timeModel: row.time_model,
    defaultDurationMinutes: row.default_duration_minutes,
    estimate: row.estimate,
    requiredResourceKinds: requirements,
    status: row.status,
  };
}

export class D1Be3Repository implements Be3Repository {
  private readonly database: D1DatabaseLike;

  constructor(database: D1DatabaseLike) {
    this.database = database;
  }

  async ensureDefaultCatalog(catalog: BookingCatalogView, occurredAt: string, actorPersonId: string) {
    const statements: D1PreparedStatementLike[] = [];
    for (const service of catalog.services) {
      statements.push(this.database.prepare(`
        INSERT OR IGNORE INTO booking_services (
          id, business_id, branch_id, module, label, time_model, default_duration_minutes,
          estimate, status, created_at, updated_at, created_by_person_id, updated_by_person_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        service.id, service.businessId, service.branchId, service.module, service.label, service.timeModel,
        service.defaultDurationMinutes, service.estimate, service.status, occurredAt, occurredAt, actorPersonId, actorPersonId,
      ));
      for (const kind of service.requiredResourceKinds) {
        statements.push(this.database.prepare(`
          INSERT OR IGNORE INTO booking_service_resource_requirements (
            business_id, branch_id, service_id, resource_kind, created_at, created_by_person_id
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(service.businessId, service.branchId, service.id, kind, occurredAt, actorPersonId));
      }
    }
    for (const resource of catalog.resources) {
      statements.push(this.database.prepare(`
        INSERT OR IGNORE INTO booking_resources (
          id, business_id, branch_id, module, kind, label, capacity_mode, capacity,
          compatibility_staff_id, hotel_role, status, created_at, updated_at,
          created_by_person_id, updated_by_person_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        resource.id, resource.businessId, resource.branchId, resource.module, resource.kind, resource.label,
        resource.capacityMode, resource.capacity, resource.compatibilityStaffId, resource.hotelRole,
        resource.status, occurredAt, occurredAt, actorPersonId, actorPersonId,
      ));
      for (const serviceId of resource.serviceIds) {
        statements.push(this.database.prepare(`
          INSERT OR IGNORE INTO booking_resource_service_links (
            business_id, branch_id, resource_id, service_id, created_at, created_by_person_id
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(resource.businessId, resource.branchId, resource.id, serviceId, occurredAt, actorPersonId));
      }
      for (const window of resource.availability) {
        statements.push(this.database.prepare(`
          INSERT OR IGNORE INTO booking_resource_availability_windows (
            id, business_id, branch_id, resource_id, state, start_local, end_local,
            start_minute, end_minute, created_at, updated_at, created_by_person_id, updated_by_person_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          window.id, resource.businessId, resource.branchId, resource.id, window.state, window.start, window.end,
          this.minute(window.start), this.minute(window.end), occurredAt, occurredAt, actorPersonId, actorPersonId,
        ));
      }
    }
    if (!statements.length) return;
    try {
      const results = await this.database.batch(statements);
      results.forEach(assertSuccess);
    } catch (error) {
      constraintAware(error);
    }
  }

  async listServices(businessId: string, branchId: string) {
    const result = await this.database.prepare(`
      SELECT id, business_id, branch_id, module, label, time_model, default_duration_minutes, estimate, status
      FROM booking_services
      WHERE business_id = ? AND branch_id = ?
      ORDER BY CASE module WHEN 'grooming' THEN 1 WHEN 'hotel' THEN 2 ELSE 3 END, created_at, id
    `).bind(businessId, branchId).all<ServiceRow>();
    assertSuccess(result);
    return this.hydrateServices(businessId, branchId, result.results ?? []);
  }

  async getService(businessId: string, branchId: string, serviceId: string) {
    const row = await this.database.prepare(`
      SELECT id, business_id, branch_id, module, label, time_model, default_duration_minutes, estimate, status
      FROM booking_services
      WHERE business_id = ? AND branch_id = ? AND id = ?
    `).bind(businessId, branchId, serviceId).first<ServiceRow>();
    if (!row) return null;
    return (await this.hydrateServices(businessId, branchId, [row]))[0] ?? null;
  }

  async listResources(businessId: string, branchId: string, serviceId?: string) {
    const result = await this.database.prepare(`
      SELECT resource.id, resource.business_id, resource.branch_id, resource.module, resource.kind,
             resource.label, resource.capacity_mode, resource.capacity, resource.compatibility_staff_id,
             resource.hotel_role, resource.status
      FROM booking_resources resource
      WHERE resource.business_id = ? AND resource.branch_id = ?
        AND (? IS NULL OR EXISTS (
          SELECT 1 FROM booking_resource_service_links link
          WHERE link.business_id = resource.business_id AND link.branch_id = resource.branch_id
            AND link.resource_id = resource.id AND link.service_id = ?
        ))
      ORDER BY resource.kind, resource.label, resource.id
    `).bind(businessId, branchId, serviceId ?? null, serviceId ?? null).all<ResourceRow>();
    assertSuccess(result);
    return this.hydrateResources(businessId, branchId, result.results ?? []);
  }

  async getBooking(businessId: string, branchId: string, bookingId: string) {
    const row = await this.database.prepare(`${this.bookingSelect()}
      WHERE booking.business_id = ? AND booking.branch_id = ? AND booking.id = ?
    `).bind(businessId, branchId, bookingId).first<BookingRow>();
    if (!row) return null;
    return (await this.hydrateBookings(businessId, [row]))[0] ?? null;
  }

  async listBookings(query: BookingQuery) {
    if (!query.branchIds.length) return { items: [], total: 0, limit: query.limit, offset: query.offset };
    const where = this.bookingWhere(query);
    const count = await this.database.prepare(`
      SELECT COUNT(*) AS total
      FROM bookings booking
      WHERE ${where.sql}
    `).bind(...where.bindings).first<{ total: number }>();
    const rows = await this.database.prepare(`${this.bookingSelect()}
      WHERE ${where.sql}
      ORDER BY booking.start_minute, booking.id
      LIMIT ? OFFSET ?
    `).bind(...where.bindings, query.limit, query.offset).all<BookingRow>();
    assertSuccess(rows);
    return {
      items: await this.hydrateBookings(query.businessId, rows.results ?? []),
      total: Number(count?.total ?? 0),
      limit: query.limit,
      offset: query.offset,
    };
  }

  async listOverlappingBookings(businessId: string, branchId: string, startMinute: number, endMinute: number, excludeBookingId?: string) {
    const rows = await this.database.prepare(`${this.bookingSelect()}
      WHERE booking.business_id = ? AND booking.branch_id = ?
        AND booking.status <> 'cancelled'
        AND booking.start_minute < ? AND booking.end_minute > ?
        AND (? IS NULL OR booking.id <> ?)
      ORDER BY booking.start_minute, booking.id
    `).bind(businessId, branchId, endMinute, startMinute, excludeBookingId ?? null, excludeBookingId ?? null).all<BookingRow>();
    assertSuccess(rows);
    return this.hydrateBookings(businessId, rows.results ?? []);
  }

  async findIdempotency(businessId: string, idempotencyKey: string) {
    return this.database.prepare(`
      SELECT create_request_hash AS requestHash, id AS bookingId
      FROM bookings
      WHERE business_id = ? AND idempotency_key = ?
    `).bind(businessId, idempotencyKey).first<{ requestHash: string; bookingId: string }>();
  }

  async createBooking(write: BookingPersistenceWrite, context: AuthorizedMutation) {
    const booking = write.booking;
    const statements: D1PreparedStatementLike[] = [
      this.database.prepare(`
        INSERT INTO bookings (
          id, business_id, branch_id, customer_id, service_id, service_module, time_model,
          start_local, end_local, start_minute, end_minute, start_weekday, status, estimate,
          notes, revision, write_token, idempotency_key, create_request_hash, created_at, updated_at,
          cancelled_at, created_by_person_id, updated_by_person_id, cancelled_by_person_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        booking.id, booking.businessId, booking.branchId, booking.customerId, booking.serviceId,
        booking.serviceModule, booking.timeModel, booking.start, booking.end, write.startMinute, write.endMinute,
        write.startWeekday, booking.status, booking.estimate, booking.notes, booking.revision,
        context.metadata.requestId, write.idempotencyKey, write.requestHash, booking.createdAt, booking.updatedAt,
        booking.cancelledAt, context.actor.id, context.actor.id, booking.cancelledAt ? context.actor.id : null,
      ),
      ...this.petStatements(write, context, false),
      ...this.assignmentStatements(write, context, false),
      ...this.reservationStatements(write, false),
      this.commitStatement(write, context, false),
      this.auditStatement("booking.created", null, booking, context, false),
    ];
    try {
      const results = await this.database.batch(statements);
      results.forEach(assertSuccess);
      if ((results[0]?.meta?.changes ?? 0) !== 1) throw be1Error("PERSISTENCE_ERROR");
    } catch (error) {
      if (error instanceof Be1Error || error instanceof Be3WriteConflict) throw error;
      constraintAware(error);
    }
  }

  async replaceBooking(before: BookingView, write: BookingPersistenceWrite, action: string, context: AuthorizedMutation) {
    const booking = write.booking;
    const update = this.database.prepare(`
      UPDATE bookings
      SET customer_id = ?, service_id = ?, service_module = ?, time_model = ?, start_local = ?, end_local = ?,
          start_minute = ?, end_minute = ?, start_weekday = ?, status = ?, estimate = ?, notes = ?,
          revision = ?, write_token = ?, updated_at = ?, cancelled_at = ?, updated_by_person_id = ?, cancelled_by_person_id = ?
      WHERE business_id = ? AND branch_id = ? AND id = ? AND revision = ?
    `).bind(
      booking.customerId, booking.serviceId, booking.serviceModule, booking.timeModel, booking.start, booking.end,
      write.startMinute, write.endMinute, write.startWeekday, booking.status, booking.estimate, booking.notes,
      booking.revision, context.metadata.requestId, booking.updatedAt, booking.cancelledAt, context.actor.id,
      booking.cancelledAt ? context.actor.id : null, booking.businessId, booking.branchId, booking.id, before.revision,
    );
    const scoped = `EXISTS (SELECT 1 FROM bookings current WHERE current.business_id = ? AND current.branch_id = ? AND current.id = ? AND current.write_token = ?)`;
    const scopeBindings = [booking.businessId, booking.branchId, booking.id, context.metadata.requestId] as const;
    const statements: D1PreparedStatementLike[] = [
      update,
      this.database.prepare(`DELETE FROM booking_resource_reservations WHERE business_id = ? AND branch_id = ? AND booking_id = ? AND ${scoped}`).bind(booking.businessId, booking.branchId, booking.id, ...scopeBindings),
      this.database.prepare(`DELETE FROM booking_resource_assignments WHERE business_id = ? AND branch_id = ? AND booking_id = ? AND ${scoped}`).bind(booking.businessId, booking.branchId, booking.id, ...scopeBindings),
      this.database.prepare(`DELETE FROM booking_pets WHERE business_id = ? AND branch_id = ? AND booking_id = ? AND ${scoped}`).bind(booking.businessId, booking.branchId, booking.id, ...scopeBindings),
      ...this.petStatements(write, context, true),
      ...this.assignmentStatements(write, context, true),
      ...this.reservationStatements(write, true, context.metadata.requestId),
      this.commitStatement(write, context, true),
      this.auditStatement(action, before, booking, context, true),
    ];
    try {
      const results = await this.database.batch(statements);
      results.forEach(assertSuccess);
      return (results[0]?.meta?.changes ?? 0) === 1 ? "updated" : "version-conflict";
    } catch (error) {
      if (error instanceof Be1Error || error instanceof Be3WriteConflict) throw error;
      constraintAware(error);
    }
  }

  private bookingSelect() {
    return `
      SELECT booking.id, booking.business_id, booking.branch_id, booking.customer_id,
             customer.display_name AS customer_name, booking.service_id, service.label AS service_label,
             booking.service_module, booking.time_model, booking.start_local, booking.end_local,
             booking.status, booking.estimate, booking.notes, booking.revision,
             booking.created_at, booking.updated_at, booking.cancelled_at
      FROM bookings booking
      INNER JOIN customers customer
        ON customer.business_id = booking.business_id AND customer.id = booking.customer_id
      INNER JOIN booking_services service
        ON service.business_id = booking.business_id AND service.branch_id = booking.branch_id AND service.id = booking.service_id
    `;
  }

  private bookingWhere(query: BookingQuery) {
    const conditions = ["booking.business_id = ?"];
    const bindings: unknown[] = [query.businessId];
    conditions.push("booking.branch_id IN (SELECT value FROM json_each(?))");
    bindings.push(JSON.stringify(query.branchIds));
    if (query.customerId) {
      conditions.push("booking.customer_id = ?");
      bindings.push(query.customerId);
    }
    if (query.rangeStartMinute !== null && query.rangeEndMinute !== null) {
      conditions.push("booking.start_minute < ? AND booking.end_minute > ?");
      bindings.push(query.rangeEndMinute, query.rangeStartMinute);
    }
    if (query.modules.length) {
      conditions.push("booking.service_module IN (SELECT value FROM json_each(?))");
      bindings.push(JSON.stringify(query.modules));
    }
    if (query.statuses.length) {
      conditions.push("booking.status IN (SELECT value FROM json_each(?))");
      bindings.push(JSON.stringify(query.statuses));
    } else if (!query.includeCancelled) {
      conditions.push("booking.status <> 'cancelled'");
    }
    if (query.resourceId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM booking_resource_assignments assignment
        WHERE assignment.business_id = booking.business_id AND assignment.branch_id = booking.branch_id
          AND assignment.booking_id = booking.id AND assignment.resource_id = ?
      )`);
      bindings.push(query.resourceId);
    }
    return { sql: conditions.join(" AND "), bindings };
  }

  private async hydrateServices(businessId: string, branchId: string, rows: ServiceRow[]) {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const requirements = await this.database.prepare(`
      SELECT service_id, resource_kind
      FROM booking_service_resource_requirements
      WHERE business_id = ? AND branch_id = ?
        AND service_id IN (SELECT value FROM json_each(?))
      ORDER BY service_id, position, resource_kind
    `).bind(businessId, branchId, JSON.stringify(ids)).all<RequirementRow>();
    assertSuccess(requirements);
    const byService = new Map<string, BookingResourceKind[]>();
    for (const row of requirements.results ?? []) {
      const current = byService.get(row.service_id) ?? [];
      current.push(row.resource_kind);
      byService.set(row.service_id, current);
    }
    return rows.map((row) => serviceView(row, byService.get(row.id) ?? []));
  }

  private async hydrateResources(businessId: string, branchId: string, rows: ResourceRow[]) {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const [links, windows] = await Promise.all([
      this.database.prepare(`
        SELECT resource_id, service_id FROM booking_resource_service_links
        WHERE business_id = ? AND branch_id = ?
          AND resource_id IN (SELECT value FROM json_each(?))
        ORDER BY resource_id, service_id
      `).bind(businessId, branchId, JSON.stringify(ids)).all<ResourceServiceRow>(),
      this.database.prepare(`
        SELECT resource_id, id, state, start_local, end_local FROM booking_resource_availability_windows
        WHERE business_id = ? AND branch_id = ?
          AND resource_id IN (SELECT value FROM json_each(?))
        ORDER BY resource_id, start_minute, id
      `).bind(businessId, branchId, JSON.stringify(ids)).all<AvailabilityRow>(),
    ]);
    assertSuccess(links);
    assertSuccess(windows);
    const services = new Map<string, string[]>();
    for (const row of links.results ?? []) {
      const current = services.get(row.resource_id) ?? [];
      current.push(row.service_id);
      services.set(row.resource_id, current);
    }
    const availability = new Map<string, BookingResourceView["availability"]>();
    for (const row of windows.results ?? []) {
      const current = availability.get(row.resource_id) ?? [];
      current.push({ id: row.id, state: row.state, start: row.start_local, end: row.end_local });
      availability.set(row.resource_id, current);
    }
    return rows.map((row): BookingResourceView => ({
      id: row.id,
      businessId: row.business_id,
      branchId: row.branch_id,
      module: row.module,
      kind: row.kind,
      label: row.label,
      capacityMode: row.capacity_mode,
      capacity: row.capacity,
      serviceIds: services.get(row.id) ?? [],
      compatibilityStaffId: row.compatibility_staff_id,
      hotelRole: row.hotel_role,
      availability: availability.get(row.id) ?? [],
      status: row.status,
    }));
  }

  private async hydrateBookings(businessId: string, rows: BookingRow[]) {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const serviceIds = [...new Set(rows.map((row) => row.service_id))];
    const [pets, assignments, requirements] = await Promise.all([
      this.database.prepare(`
        SELECT link.booking_id, profile.pet_id, profile.name, profile.species
        FROM booking_pets link
        INNER JOIN business_pet_profiles profile
          ON profile.business_id = link.business_id AND profile.pet_id = link.pet_id
        WHERE link.business_id = ?
          AND link.booking_id IN (SELECT value FROM json_each(?))
        ORDER BY link.booking_id, link.position, link.pet_id
      `).bind(businessId, JSON.stringify(ids)).all<PetRow>(),
      this.database.prepare(`
        SELECT booking_id, resource_id FROM booking_resource_assignments
        WHERE business_id = ?
          AND booking_id IN (SELECT value FROM json_each(?))
        ORDER BY booking_id, position, resource_id
      `).bind(businessId, JSON.stringify(ids)).all<AssignmentRow>(),
      this.database.prepare(`
        SELECT service_id, resource_kind FROM booking_service_resource_requirements
        WHERE business_id = ?
          AND service_id IN (SELECT value FROM json_each(?))
        ORDER BY service_id, position, resource_kind
      `).bind(businessId, JSON.stringify(serviceIds)).all<RequirementRow>(),
    ]);
    assertSuccess(pets);
    assertSuccess(assignments);
    assertSuccess(requirements);
    const petsByBooking = new Map<string, BookingView["pets"]>();
    for (const row of pets.results ?? []) {
      const current = petsByBooking.get(row.booking_id) ?? [];
      current.push({ id: row.pet_id, name: row.name, species: row.species });
      petsByBooking.set(row.booking_id, current);
    }
    const resourcesByBooking = new Map<string, string[]>();
    for (const row of assignments.results ?? []) {
      const current = resourcesByBooking.get(row.booking_id) ?? [];
      current.push(row.resource_id);
      resourcesByBooking.set(row.booking_id, current);
    }
    const requirementsByService = new Map<string, BookingResourceKind[]>();
    for (const row of requirements.results ?? []) {
      const current = requirementsByService.get(row.service_id) ?? [];
      current.push(row.resource_kind);
      requirementsByService.set(row.service_id, current);
    }
    return rows.map((row): BookingView => ({
      id: row.id,
      businessId: row.business_id,
      branchId: row.branch_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      pets: petsByBooking.get(row.id) ?? [],
      serviceId: row.service_id,
      serviceLabel: row.service_label,
      serviceModule: row.service_module,
      timeModel: row.time_model,
      start: row.start_local,
      end: row.end_local,
      requiredResourceKinds: requirementsByService.get(row.service_id) ?? [],
      assignedResourceIds: resourcesByBooking.get(row.id) ?? [],
      status: row.status,
      estimate: row.estimate,
      notes: row.notes,
      revision: row.revision,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      cancelledAt: row.cancelled_at,
    }));
  }

  private petStatements(write: BookingPersistenceWrite, context: AuthorizedMutation, conditional: boolean) {
    if (!write.booking.pets.length) return [];
    const petsJson = JSON.stringify(write.booking.pets.map((pet, position) => ({ id: pet.id, position })));
    const insert = `
      INSERT INTO booking_pets (business_id, branch_id, booking_id, pet_id, position, created_at, created_by_person_id)
      SELECT ?, ?, ?, json_extract(value, '$.id'), json_extract(value, '$.position'), ?, ?
      FROM json_each(?)
    `;
    return [conditional
      ? this.database.prepare(`${insert}
          WHERE EXISTS (
            SELECT 1 FROM bookings current
            WHERE current.business_id = ? AND current.branch_id = ?
              AND current.id = ? AND current.write_token = ?
          )
        `).bind(
          write.booking.businessId, write.booking.branchId, write.booking.id,
          context.occurredAt, context.actor.id, petsJson,
          write.booking.businessId, write.booking.branchId, write.booking.id, context.metadata.requestId,
        )
      : this.database.prepare(insert).bind(
          write.booking.businessId, write.booking.branchId, write.booking.id,
          context.occurredAt, context.actor.id, petsJson,
        )];
  }

  private assignmentStatements(write: BookingPersistenceWrite, context: AuthorizedMutation, conditional: boolean) {
    if (!write.booking.assignedResourceIds.length) return [];
    const resourcesJson = JSON.stringify(write.booking.assignedResourceIds.map((id, position) => ({ id, position })));
    const insert = `
      INSERT INTO booking_resource_assignments (business_id, branch_id, booking_id, resource_id, position, created_at, created_by_person_id)
      SELECT ?, ?, ?, json_extract(value, '$.id'), json_extract(value, '$.position'), ?, ?
      FROM json_each(?)
    `;
    return [conditional
      ? this.database.prepare(`${insert}
          WHERE EXISTS (
            SELECT 1 FROM bookings current
            WHERE current.business_id = ? AND current.branch_id = ?
              AND current.id = ? AND current.write_token = ?
          )
        `).bind(
          write.booking.businessId, write.booking.branchId, write.booking.id,
          context.occurredAt, context.actor.id, resourcesJson,
          write.booking.businessId, write.booking.branchId, write.booking.id, context.metadata.requestId,
        )
      : this.database.prepare(insert).bind(
          write.booking.businessId, write.booking.branchId, write.booking.id,
          context.occurredAt, context.actor.id, resourcesJson,
        )];
  }

  private reservationStatements(write: BookingPersistenceWrite, conditional: boolean, writeToken?: string) {
    if (!write.reservations.length) return [];
    // One json_each statement keeps long Hotel ranges inside D1's per-request
    // query and bound-parameter limits while each produced row still runs the
    // SQLite reservation conflict triggers in this transactional batch.
    const reservationJson = JSON.stringify(write.reservations);
    const insert = `
      INSERT INTO booking_resource_reservations (
        business_id, branch_id, booking_id, resource_id, reservation_key, reservation_date,
        start_minute, end_minute, units
      )
      SELECT ?, ?, ?,
        json_extract(value, '$.resourceId'),
        json_extract(value, '$.reservationKey'),
        json_extract(value, '$.reservationDate'),
        json_extract(value, '$.startMinute'),
        json_extract(value, '$.endMinute'),
        json_extract(value, '$.units')
      FROM json_each(?)
    `;
    return [conditional
      ? this.database.prepare(`${insert}
          WHERE EXISTS (
            SELECT 1 FROM bookings current
            WHERE current.business_id = ? AND current.branch_id = ?
              AND current.id = ? AND current.write_token = ?
          )
        `).bind(
          write.booking.businessId, write.booking.branchId, write.booking.id, reservationJson,
          write.booking.businessId, write.booking.branchId, write.booking.id, writeToken ?? "",
        )
      : this.database.prepare(insert).bind(
          write.booking.businessId, write.booking.branchId, write.booking.id, reservationJson,
        )];
  }

  private commitStatement(write: BookingPersistenceWrite, context: AuthorizedMutation, conditional: boolean) {
    const values = [write.booking.businessId, write.booking.branchId, write.booking.id, write.booking.revision, context.metadata.requestId, context.occurredAt];
    return conditional
      ? this.database.prepare(`
          INSERT INTO booking_write_commits (business_id, branch_id, booking_id, revision, write_token, committed_at)
          SELECT ?, ?, ?, ?, ?, ?
          WHERE EXISTS (SELECT 1 FROM bookings current WHERE current.business_id = ? AND current.branch_id = ? AND current.id = ? AND current.write_token = ?)
        `).bind(...values, write.booking.businessId, write.booking.branchId, write.booking.id, context.metadata.requestId)
      : this.database.prepare(`
          INSERT INTO booking_write_commits (business_id, branch_id, booking_id, revision, write_token, committed_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(...values);
  }

  private auditStatement(action: string, before: BookingView | null, after: BookingView, context: AuthorizedMutation, conditional: boolean) {
    const values = [
      this.auditId(), context.actor.id, context.membership.id, after.businessId, after.branchId,
      context.metadata.requestId, context.metadata.correlationId, action, after.id,
      before ? auditJson(bookingAuditShape(before)) : null, auditJson(bookingAuditShape(after)), context.occurredAt,
    ];
    return conditional
      ? this.database.prepare(`
          INSERT INTO audit_events (
            id, actor_person_id, actor_membership_id, business_id, branch_id, request_id,
            correlation_id, action, target_type, target_id, before_json, after_json, occurred_at
          )
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'booking', ?, ?, ?, ?
          WHERE EXISTS (SELECT 1 FROM bookings current WHERE current.business_id = ? AND current.branch_id = ? AND current.id = ? AND current.write_token = ?)
        `).bind(...values, after.businessId, after.branchId, after.id, context.metadata.requestId)
      : this.database.prepare(`
          INSERT INTO audit_events (
            id, actor_person_id, actor_membership_id, business_id, branch_id, request_id,
            correlation_id, action, target_type, target_id, before_json, after_json, occurred_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'booking', ?, ?, ?, ?)
        `).bind(...values);
  }

  private minute(value: string) {
    const date = new Date(`${value}:00Z`);
    return Math.floor(date.getTime() / 60_000);
  }

  private auditId() {
    return `aud_${crypto.randomUUID().replaceAll("-", "")}`;
  }
}
