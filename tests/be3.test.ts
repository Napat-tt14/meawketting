import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { D1Be1Repository } from "../app/_backend/be1/d1Repository.ts";
import { Be1Error } from "../app/_backend/be1/errors.ts";
import type { RequestMetadata } from "../app/_backend/be1/metadata.ts";
import type { AuthorizedMutation, D1DatabaseLike, D1PreparedStatementLike, D1ResultLike } from "../app/_backend/be1/repository.ts";
import { D1Be2Repository } from "../app/_backend/be2/d1Repository.ts";
import { Be3Application } from "../app/_backend/be3/application.ts";
import type { BookingAvailabilityInput, BookingConflictCode, BookingMutationResult, CreateBookingInput } from "../app/_backend/be3/contracts.ts";
import { D1Be3Repository } from "../app/_backend/be3/d1Repository.ts";
import type { Be3Repository, BookingPersistenceWrite } from "../app/_backend/be3/repository.ts";

const projectRoot = resolve(import.meta.dirname, "..");
const migrations = readdirSync(resolve(projectRoot, "drizzle")).filter((name) => name.endsWith(".sql")).sort();
const be1Seed = readFileSync(resolve(projectRoot, "scripts", "seed-be1-dev.sql"), "utf8");
const be2Seed = readFileSync(resolve(projectRoot, "scripts", "seed-be2-dev.sql"), "utf8");
const be3Seed = readFileSync(resolve(projectRoot, "scripts", "seed-be3-dev.sql"), "utf8");
const be4Seed = readFileSync(resolve(projectRoot, "scripts", "seed-be4-dev.sql"), "utf8");

const OWNER = "prs_01k47meawketting000000001";
const MANAGER = "prs_01k47meawketting000000002";
const STAFF = "prs_01k47meawketting000000003";
const INACTIVE_MEMBER = "prs_01k47meawketting000000004";
const OUTSIDER = "prs_01k47meawketting000000005";
const WHISKER = "business-whisker-rest";
const PAW = "business-paw-partner";
const ARI = "whisker-ari";
const THONGLOR = "whisker-thonglor";
const ONNUT = "partner-onnut";

class NodeD1Statement implements D1PreparedStatementLike {
  private values: SQLInputValue[] = [];
  constructor(readonly database: DatabaseSync, readonly query: string) {}

  bind(...values: unknown[]) {
    const next = new NodeD1Statement(this.database, this.query);
    next.values = values as SQLInputValue[];
    return next;
  }

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const row = this.database.prepare(this.query).get(...this.values) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async all<T = Record<string, unknown>>(): Promise<D1ResultLike<T>> {
    return { success: true, results: this.database.prepare(this.query).all(...this.values) as T[] };
  }

  async run<T = Record<string, unknown>>(): Promise<D1ResultLike<T>> {
    const result = this.database.prepare(this.query).run(...this.values);
    return { success: true, results: [], meta: { changes: Number(result.changes) } };
  }
}

class NodeD1Database implements D1DatabaseLike {
  constructor(readonly sqlite: DatabaseSync) {}

  prepare(query: string) {
    return new NodeD1Statement(this.sqlite, query);
  }

  async batch(statements: D1PreparedStatementLike[]) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results: D1ResultLike[] = [];
      for (const statement of statements) results.push(await statement.run());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

function migrate(database: DatabaseSync) {
  database.exec("PRAGMA foreign_keys = ON");
  for (const migration of migrations) {
    database.exec(readFileSync(resolve(projectRoot, "drizzle", migration), "utf8").replaceAll("--> statement-breakpoint", ""));
  }
}

function applicationFor(database: NodeD1Database, idNamespace = "main", bookingRepository?: Be3Repository) {
  const authorizationRepository = new D1Be1Repository(database);
  const customerPetRepository = new D1Be2Repository(database);
  const durableBookingRepository = bookingRepository ?? new D1Be3Repository(database);
  let timeSequence = 0;
  let idSequence = 0;
  const application = new Be3Application(authorizationRepository, customerPetRepository, durableBookingRepository, {
    now: () => `2026-09-07T02:${String(timeSequence++).padStart(2, "0")}:00.000Z`,
    id: (prefix) => `${prefix}_01k47be3${idNamespace}${String(idSequence++).padStart(10, "0")}`,
  });
  return { authorizationRepository, customerPetRepository, bookingRepository: durableBookingRepository, application };
}

function fixture(file?: string) {
  const sqlite = new DatabaseSync(file ?? ":memory:");
  migrate(sqlite);
  sqlite.exec(be1Seed);
  sqlite.exec(be2Seed);
  sqlite.exec(be3Seed);
  sqlite.exec(be4Seed);
  const database = new NodeD1Database(sqlite);
  return { sqlite, database, ...applicationFor(database) };
}

function metadata(correlationId = "corr-be3-test-0001"): RequestMetadata {
  return { requestId: `req-${correlationId}`, correlationId, receivedAt: "2026-09-07T01:59:59.000Z" };
}

async function actor(application: Be3Application, personId = OWNER) {
  return application.resolvePerson(personId);
}

function hasCode(code: Be1Error["code"]) {
  return (error: unknown) => error instanceof Be1Error && error.code === code;
}

function conflictCodes(result: BookingMutationResult) {
  return result.outcome === "conflict" ? result.availability.conflicts.map((entry) => entry.code) : [];
}

function availabilityCodes(result: { conflicts: { code: BookingConflictCode }[] }) {
  return result.conflicts.map((entry) => entry.code);
}

function groomingInput(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    businessId: WHISKER,
    branchId: ARI,
    serviceId: "ari-grooming-bath-groom",
    customerId: "booking-contact-nalin",
    petIds: ["booking-pet-mochi"],
    start: "2026-08-20T10:00",
    end: "2026-08-20T11:30",
    assignedResourceIds: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"],
    status: "confirmed",
    estimate: 850,
    notes: "",
    idempotencyKey: "be3-test-grooming-0001",
    ...overrides,
  };
}

function hotelInput(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    businessId: WHISKER,
    branchId: ARI,
    serviceId: "ari-hotel-stay",
    customerId: "booking-contact-nalin",
    petIds: ["booking-pet-mochi", "booking-pet-biscuit"],
    start: "2026-08-27",
    end: "2026-08-29",
    assignedResourceIds: ["ari-hotel-capacity"],
    status: "confirmed",
    estimate: 4800,
    notes: "สองตัว สองคืน",
    idempotencyKey: "be3-test-hotel-0001",
    ...overrides,
  };
}

function daycareInput(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    businessId: PAW,
    branchId: ONNUT,
    serviceId: "onnut-daycare-full-day",
    customerId: "booking-contact-onnut-aom",
    petIds: ["booking-pet-pudding"],
    start: "2026-08-20",
    end: null,
    assignedResourceIds: ["onnut-daycare-quiet"],
    status: "pending",
    estimate: 450,
    notes: "day model",
    idempotencyKey: "be3-test-daycare-0001",
    ...overrides,
  };
}

test("seeded catalog and Calendar queries preserve all time models, one Hotel range, and Branch grants", async () => {
  const { sqlite, application } = fixture();
  try {
    const owner = await actor(application);
    const catalog = await application.getCatalog(owner, WHISKER, ARI);
    assert.deepEqual(catalog.services.map((service) => service.timeModel), ["appointment", "date-range"]);
    assert.ok(catalog.resources.some((resource) => resource.id === "ari-hotel-capacity" && resource.hotelRole === "planning-capacity"));

    const hotel = await application.getBooking(owner, WHISKER, ARI, "booking-fixture-ari-hotel-nalin-pair");
    assert.equal(hotel.timeModel, "date-range");
    assert.equal(hotel.end, "2026-08-26", "Hotel checkout is the exclusive range end");
    assert.deepEqual(hotel.pets.map((pet) => pet.id), ["booking-pet-mochi", "booking-pet-biscuit"]);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM bookings WHERE id = ?").get(hotel.id)?.count, 1);

    const day = await application.getBooking(owner, PAW, ONNUT, "booking-fixture-onnut-daycare-full");
    assert.equal(day.timeModel, "day");
    assert.equal(day.end, null);

    const dayRange = await application.listBookings(owner, {
      businessId: WHISKER,
      branchId: ARI,
      rangeStart: "2026-08-18",
      rangeEnd: "2026-08-19",
      limit: 100,
    });
    assert.equal(dayRange.total, 6);
    assert.equal(dayRange.items.some((booking) => booking.id === "booking-fixture-ari-hotel-biscuit-checkout"), false);

    const month = await application.listBookings(owner, {
      businessId: WHISKER,
      branchId: ARI,
      rangeStart: "2026-08-01",
      rangeEnd: "2026-08-29",
      modules: ["hotel"],
      limit: 2,
      offset: 1,
    });
    assert.equal(month.total, 4);
    assert.equal(month.items.length, 2);
    assert.ok(month.items.every((booking) => booking.serviceModule === "hotel"));

    const customerAcrossBranches = await application.listBookings(owner, {
      businessId: WHISKER,
      customerId: "booking-contact-pim",
      rangeStart: "2026-08-01",
      rangeEnd: "2026-09-12",
      limit: 100,
    });
    assert.deepEqual(new Set(customerAcrossBranches.items.map((booking) => booking.branchId)), new Set([ARI, THONGLOR]));

    const managerPage = await application.listBookings(await actor(application, MANAGER), { businessId: WHISKER, limit: 100 });
    assert.ok(managerPage.items.length > 0);
    assert.ok(managerPage.items.every((booking) => booking.branchId === ARI));
    const staffPage = await application.listBookings(await actor(application, STAFF), { businessId: WHISKER, limit: 100 });
    assert.deepEqual(new Set(staffPage.items.map((booking) => booking.branchId)), new Set([THONGLOR]));

    sqlite.prepare("UPDATE customers SET display_name = 'ชื่อใหม่จาก BE2' WHERE business_id = ? AND id = ?").run(WHISKER, "booking-contact-nalin");
    sqlite.prepare("UPDATE business_pet_profiles SET name = 'Mochi Canonical' WHERE business_id = ? AND pet_id = ?").run(WHISKER, "booking-pet-mochi");
    const recomposed = await application.getBooking(owner, WHISKER, ARI, hotel.id);
    assert.equal(recomposed.customerName, "ชื่อใหม่จาก BE2");
    assert.equal(recomposed.pets[0]?.name, "Mochi Canonical");
  } finally {
    sqlite.close();
  }
});

test("appointment, date-range, and day aggregates persist with durable Pet and Resource links", async () => {
  const { sqlite, application } = fixture();
  try {
    const owner = await actor(application);
    const appointment = await application.createBooking(owner, groomingInput(), metadata("corr-create-appointment"));
    const hotel = await application.createBooking(owner, hotelInput(), metadata("corr-create-hotel"));
    const daycare = await application.createBooking(owner, daycareInput(), metadata("corr-create-daycare"));
    assert.equal(appointment.outcome, "created");
    assert.equal(hotel.outcome, "created");
    assert.equal(daycare.outcome, "created");
    if (appointment.outcome !== "created" || hotel.outcome !== "created" || daycare.outcome !== "created") return;

    assert.equal(appointment.booking.timeModel, "appointment");
    assert.equal(hotel.booking.timeModel, "date-range");
    assert.equal(daycare.booking.timeModel, "day");
    assert.equal(daycare.booking.end, null);
    assert.deepEqual(hotel.booking.pets.map((pet) => pet.id), ["booking-pet-mochi", "booking-pet-biscuit"]);

    const hotelPets = sqlite.prepare("SELECT pet_id, position FROM booking_pets WHERE booking_id = ? ORDER BY position").all(hotel.booking.id);
    assert.deepEqual(hotelPets.map((row) => row.pet_id), ["booking-pet-mochi", "booking-pet-biscuit"]);
    const reservations = sqlite.prepare("SELECT reservation_date, units FROM booking_resource_reservations WHERE booking_id = ? ORDER BY reservation_date").all(hotel.booking.id)
      .map((row) => ({ reservation_date: row.reservation_date, units: row.units }));
    assert.deepEqual(reservations, [
      { reservation_date: "2026-08-27", units: 2 },
      { reservation_date: "2026-08-28", units: 2 },
    ]);
    assert.equal(sqlite.prepare("SELECT end_minute - start_minute AS duration FROM bookings WHERE id = ?").get(daycare.booking.id)?.duration, 1440);
    assert.equal(sqlite.prepare("SELECT reservation_key FROM booking_resource_reservations WHERE booking_id = ? AND resource_id = ?").get(appointment.booking.id, "ari-groomer-pim")?.reservation_key, "interval");
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    sqlite.close();
  }
});

test("edit, resource change, drag, both resize directions, revision conflict, and cancel are authoritative", async () => {
  const { sqlite, application } = fixture();
  try {
    const owner = await actor(application);
    const created = await application.createBooking(owner, groomingInput({
      customerId: "booking-contact-pim",
      petIds: ["booking-pet-luna"],
      start: "2026-08-21T10:00",
      end: "2026-08-21T11:30",
      idempotencyKey: "be3-edit-flow-0001",
      notes: "SENSITIVE BOOKING NOTE",
    }), metadata("corr-edit-create"));
    assert.equal(created.outcome, "created");
    if (created.outcome !== "created") return;

    const updated = await application.updateBooking(owner, {
      ...groomingInput({
        customerId: "booking-contact-pim",
        petIds: ["booking-pet-tofu"],
        start: created.booking.start,
        end: created.booking.end,
        status: "arrived",
        estimate: 975,
        notes: "SENSITIVE UPDATED NOTE",
      }),
      bookingId: created.booking.id,
      expectedRevision: 1,
    }, metadata("corr-edit-update"));
    assert.equal(updated.outcome, "updated");
    if (updated.outcome !== "updated") return;
    assert.equal(updated.booking.revision, 2);
    assert.deepEqual(updated.booking.pets.map((pet) => pet.id), ["booking-pet-tofu"]);

    const reassigned = await application.assignResources(owner, {
      businessId: WHISKER,
      branchId: ARI,
      bookingId: updated.booking.id,
      expectedRevision: 2,
      assignedResourceIds: ["ari-groomer-pim", "ari-station-b", "ari-dryer-2"],
    }, metadata("corr-edit-resource"));
    assert.equal(reassigned.outcome, "updated");
    if (reassigned.outcome !== "updated") return;

    const moved = await application.rescheduleBooking(owner, {
      businessId: WHISKER,
      branchId: ARI,
      bookingId: reassigned.booking.id,
      expectedRevision: 3,
      start: "2026-08-21T15:00",
      end: "2026-08-21T16:30",
    }, metadata("corr-edit-drag"));
    assert.equal(moved.outcome, "updated");
    if (moved.outcome !== "updated") return;

    const resized = await application.rescheduleBooking(owner, {
      businessId: WHISKER,
      branchId: ARI,
      bookingId: moved.booking.id,
      expectedRevision: 4,
      start: "2026-08-21T15:00",
      end: "2026-08-21T17:00",
    }, metadata("corr-edit-resize-increase"));
    assert.equal(resized.outcome, "updated");
    if (resized.outcome !== "updated") return;

    const shrunk = await application.rescheduleBooking(owner, {
      businessId: WHISKER,
      branchId: ARI,
      bookingId: resized.booking.id,
      expectedRevision: 5,
      start: "2026-08-21T15:15",
      end: "2026-08-21T16:45",
    }, metadata("corr-edit-resize-decrease"));
    assert.equal(shrunk.outcome, "updated");
    if (shrunk.outcome !== "updated") return;

    const stale = await application.rescheduleBooking(owner, {
      businessId: WHISKER,
      branchId: ARI,
      bookingId: shrunk.booking.id,
      expectedRevision: 1,
      start: "2026-08-21T18:00",
      end: "2026-08-21T19:00",
    }, metadata("corr-edit-stale"));
    assert.deepEqual(conflictCodes(stale), ["VERSION_CONFLICT"]);
    assert.equal(stale.outcome === "conflict" ? stale.current?.revision : null, 6);

    const cancelled = await application.cancelBooking(owner, {
      businessId: WHISKER,
      branchId: ARI,
      bookingId: shrunk.booking.id,
      expectedRevision: 6,
    }, metadata("corr-edit-cancel"));
    assert.equal(cancelled.outcome, "cancelled");
    if (cancelled.outcome !== "cancelled") return;
    assert.equal(cancelled.booking.status, "cancelled");
    assert.equal(cancelled.booking.revision, 7);

    const replay = await application.cancelBooking(owner, {
      businessId: WHISKER,
      branchId: ARI,
      bookingId: cancelled.booking.id,
      expectedRevision: 6,
    }, metadata("corr-edit-cancel-retry"));
    assert.equal(replay.outcome, "replayed");

    const actions = sqlite.prepare("SELECT action FROM audit_events WHERE target_type = 'booking' AND target_id = ? ORDER BY occurred_at").all(created.booking.id).map((row) => row.action);
    assert.deepEqual(actions, [
      "booking.created",
      "booking.updated",
      "booking.resources.changed",
      "booking.rescheduled",
      "booking.rescheduled",
      "booking.rescheduled",
      "booking.cancelled",
    ]);
    const audit = JSON.stringify(sqlite.prepare("SELECT before_json, after_json FROM audit_events WHERE target_type = 'booking' AND target_id = ?").all(created.booking.id));
    assert.equal(audit.includes("SENSITIVE BOOKING NOTE"), false);
    assert.equal(audit.includes("SENSITIVE UPDATED NOTE"), false);
  } finally {
    sqlite.close();
  }
});

test("availability returns typed hours, resource, staff, duplicate, and capacity conflicts", async () => {
  const { sqlite, application } = fixture();
  try {
    const owner = await actor(application);
    const exact: BookingAvailabilityInput = {
      businessId: WHISKER,
      branchId: ARI,
      serviceId: "ari-grooming-bath-groom",
      customerId: "booking-contact-nalin",
      petIds: ["booking-pet-mochi"],
      start: "2026-08-18T10:30",
      end: "2026-08-18T12:00",
      assignedResourceIds: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"],
      status: "confirmed",
    };
    const duplicate = await application.checkAvailability(owner, exact);
    assert.ok(availabilityCodes(duplicate).includes("DUPLICATE_BOOKING"));
    assert.ok(availabilityCodes(duplicate).includes("TIME_CONFLICT"));

    const missing = await application.checkAvailability(owner, { ...exact, start: "2026-08-20T10:00", end: "2026-08-20T11:30", assignedResourceIds: ["ari-groomer-pim"] });
    assert.ok(availabilityCodes(missing).includes("MISSING_RESOURCE"));

    const outside = await application.checkAvailability(owner, { ...exact, start: "2026-08-20T08:00", end: "2026-08-20T09:00" });
    assert.ok(availabilityCodes(outside).includes("OUTSIDE_OPERATING_HOURS"));

    const breakTime = await application.checkAvailability(owner, { ...exact, start: "2026-08-18T12:00", end: "2026-08-18T12:30" });
    assert.ok(availabilityCodes(breakTime).includes("STAFF_UNAVAILABLE"));

    const capacity = await application.checkAvailability(owner, {
      businessId: WHISKER,
      branchId: ARI,
      serviceId: "ari-hotel-stay",
      customerId: "booking-contact-pim",
      petIds: ["booking-pet-luna"],
      start: "2026-08-19",
      end: "2026-08-20",
      assignedResourceIds: ["ari-hotel-capacity"],
      status: "confirmed",
    });
    assert.deepEqual(availabilityCodes(capacity), ["CAPACITY_CONFLICT"]);
    assert.deepEqual(capacity.conflicts[0]?.dates, ["2026-08-19"]);

    sqlite.prepare("UPDATE booking_resources SET status = 'inactive' WHERE id = 'ari-dryer-1'").run();
    const inactiveResource = await application.checkAvailability(owner, { ...exact, start: "2026-08-20T10:00", end: "2026-08-20T11:30" });
    assert.ok(availabilityCodes(inactiveResource).includes("RESOURCE_UNAVAILABLE"));
    sqlite.prepare("UPDATE booking_resources SET status = 'active' WHERE id = 'ari-dryer-1'").run();

    sqlite.prepare("DELETE FROM branch_enabled_modules WHERE business_id = ? AND branch_id = ? AND module = 'hotel'").run(WHISKER, ARI);
    const disabledInput: BookingAvailabilityInput = { ...hotelInput() };
    const disabled = await application.checkAvailability(owner, disabledInput);
    assert.ok(availabilityCodes(disabled).includes("MODULE_DISABLED"));
    sqlite.prepare("INSERT INTO branch_enabled_modules (business_id, branch_id, module, created_at, created_by_person_id) VALUES (?, ?, 'hotel', ?, ?)").run(WHISKER, ARI, "2026-09-07T00:00:00.000Z", OWNER);

    sqlite.prepare("UPDATE branch_operating_hours SET closed = 1 WHERE business_id = ? AND branch_id = ? AND weekday = 'thursday'").run(WHISKER, ARI);
    const closed = await application.checkAvailability(owner, { ...exact, start: "2026-08-20T10:00", end: "2026-08-20T11:30" });
    assert.ok(availabilityCodes(closed).includes("BRANCH_CLOSED"));
    sqlite.prepare("UPDATE branch_operating_hours SET closed = 0, opens_at = '09:00', closes_at = '20:00' WHERE business_id = ? AND branch_id = ? AND weekday = 'thursday'").run(WHISKER, ARI);

    sqlite.prepare("UPDATE branches SET status = 'inactive' WHERE business_id = ? AND id = ?").run(WHISKER, ARI);
    const inactiveBranch = await application.checkAvailability(owner, { ...exact, start: "2026-08-20T10:00", end: "2026-08-20T11:30" });
    assert.ok(availabilityCodes(inactiveBranch).includes("BRANCH_INACTIVE"));
  } finally {
    sqlite.close();
  }
});

test("authorization rejects wrong Business, Branch, Customer, Pet, Resource, Booking, and inactive access", async () => {
  const { sqlite, application } = fixture();
  try {
    const owner = await actor(application);
    const manager = await actor(application, MANAGER);
    const staff = await actor(application, STAFF);
    await assert.rejects(application.getBooking(manager, WHISKER, THONGLOR, "booking-fixture-thonglor-grooming"), hasCode("NOT_FOUND"));
    await assert.rejects(application.getBooking(staff, WHISKER, ARI, "booking-fixture-ari-grooming-1030"), hasCode("NOT_FOUND"));
    await assert.rejects(application.getBooking(owner, PAW, ONNUT, "booking-fixture-ari-grooming-1030"), hasCode("NOT_FOUND"));
    await assert.rejects(application.getBooking(owner, WHISKER, ARI, "booking-spoofed-0001"), hasCode("NOT_FOUND"));
    await assert.rejects(application.listBookings(owner, { businessId: WHISKER, customerId: "booking-contact-onnut-aom" }), hasCode("NOT_FOUND"));
    await assert.rejects(application.createBooking(owner, groomingInput({ customerId: "booking-contact-onnut-aom", idempotencyKey: "be3-foreign-customer" }), metadata()), hasCode("NOT_FOUND"));
    await assert.rejects(application.createBooking(owner, groomingInput({ petIds: ["booking-pet-pudding"], idempotencyKey: "be3-foreign-pet-0001" }), metadata()), hasCode("NOT_FOUND"));
    await assert.rejects(application.createBooking(owner, groomingInput({ serviceId: "thonglor-grooming-bath", idempotencyKey: "be3-foreign-service-01" }), metadata()), hasCode("NOT_FOUND"));
    await assert.rejects(application.createBooking(owner, groomingInput({ assignedResourceIds: ["thonglor-groomer-nok"], idempotencyKey: "be3-foreign-resource-1" }), metadata()), hasCode("NOT_FOUND"));
    await assert.rejects(application.listBookings(await actor(application, INACTIVE_MEMBER), { businessId: PAW }), hasCode("MEMBERSHIP_INACTIVE"));
    await assert.rejects(application.listBookings(await actor(application, OUTSIDER), { businessId: WHISKER }), hasCode("FORBIDDEN"));

    const managerCreated = await application.createBooking(manager, groomingInput({
      start: "2026-08-22T10:00",
      end: "2026-08-22T11:30",
      idempotencyKey: "be3-manager-create-001",
    }), metadata("corr-manager-booking"));
    assert.equal(managerCreated.outcome, "created");

    const staffCreated = await application.createBooking(staff, {
      ...groomingInput(),
      branchId: THONGLOR,
      serviceId: "thonglor-grooming-bath",
      customerId: "booking-contact-pim",
      petIds: ["booking-pet-tofu"],
      start: "2026-08-22T12:00",
      end: "2026-08-22T13:00",
      assignedResourceIds: ["thonglor-groomer-nok", "thonglor-station-a", "thonglor-dryer-1"],
      idempotencyKey: "be3-staff-create-0001",
    }, metadata("corr-staff-booking"));
    assert.equal(staffCreated.outcome, "created");
  } finally {
    sqlite.close();
  }
});

test("idempotency replays equal creates and rejects reuse with a different payload", async () => {
  const { sqlite, application } = fixture();
  try {
    const owner = await actor(application);
    const input = groomingInput({
      start: "2026-08-23T10:00",
      end: "2026-08-23T11:30",
      idempotencyKey: "be3-idempotency-0001",
    });
    const created = await application.createBooking(owner, input, metadata("corr-idempotency-create"));
    const replay = await application.createBooking(owner, input, metadata("corr-idempotency-retry"));
    assert.equal(created.outcome, "created");
    assert.equal(replay.outcome, "replayed");
    if (created.outcome !== "created" || replay.outcome !== "replayed") return;
    assert.equal(replay.booking.id, created.booking.id);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM bookings WHERE business_id = ? AND idempotency_key = ?").get(WHISKER, input.idempotencyKey)?.count, 1);

    const reused = await application.createBooking(owner, { ...input, notes: "different request" }, metadata("corr-idempotency-reuse"));
    assert.deepEqual(conflictCodes(reused), ["IDEMPOTENCY_KEY_REUSED"]);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE target_type = 'booking' AND target_id = ? AND action = 'booking.created'").get(created.booking.id)?.count, 1);
  } finally {
    sqlite.close();
  }
});

function gatedCreateRepository(delegate: Be3Repository, parties: number): Be3Repository {
  let arrivals = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolveGate) => { release = resolveGate; });
  let writeTail: Promise<void> = Promise.resolve();

  return new Proxy(delegate, {
    get(target, property, receiver) {
      if (property === "createBooking") {
        return async (write: BookingPersistenceWrite, context: AuthorizedMutation) => {
          arrivals += 1;
          if (arrivals === parties) release();
          await gate;
          const writeResult = writeTail.then(() => target.createBooking(write, context));
          writeTail = writeResult.then(() => undefined, () => undefined);
          return writeResult;
        };
      }
      const value = Reflect.get(target, property, receiver) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

test("two stale-available competing creates commit one winner and return a deterministic conflict", async () => {
  const { sqlite, database, bookingRepository } = fixture();
  try {
    const gated = gatedCreateRepository(bookingRepository, 2);
    const firstApplication = applicationFor(database, "racea", gated).application;
    const secondApplication = applicationFor(database, "raceb", gated).application;
    const firstInput = groomingInput({
      start: "2026-08-24T10:00",
      end: "2026-08-24T11:30",
      idempotencyKey: "be3-race-first-0001",
    });
    const secondInput = groomingInput({
      customerId: "booking-contact-pim",
      petIds: ["booking-pet-luna"],
      start: "2026-08-24T10:00",
      end: "2026-08-24T11:30",
      idempotencyKey: "be3-race-second-0001",
    });

    const [first, second] = await Promise.all([
      firstApplication.createBooking(await actor(firstApplication), firstInput, metadata("corr-race-first")),
      secondApplication.createBooking(await actor(secondApplication), secondInput, metadata("corr-race-second")),
    ]);
    assert.deepEqual([first.outcome, second.outcome].sort(), ["conflict", "created"]);
    const loser = first.outcome === "conflict" ? first : second;
    assert.ok(conflictCodes(loser).includes("TIME_CONFLICT"));
    assert.equal(sqlite.prepare(`
      SELECT COUNT(*) AS count FROM bookings
      WHERE business_id = ? AND branch_id = ? AND start_local = ? AND idempotency_key IN (?, ?)
    `).get(WHISKER, ARI, "2026-08-24T10:00", firstInput.idempotencyKey, secondInput.idempotencyKey)?.count, 1);
    assert.equal(sqlite.prepare(`
      SELECT COUNT(*) AS count FROM booking_write_commits commit_row
      INNER JOIN bookings booking ON booking.business_id = commit_row.business_id AND booking.branch_id = commit_row.branch_id AND booking.id = commit_row.booking_id
      WHERE booking.idempotency_key IN (?, ?)
    `).get(firstInput.idempotencyKey, secondInput.idempotencyKey)?.count, 1);
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    sqlite.close();
  }
});

test("cancellation releases exclusive Resources without deleting planning history", async () => {
  const { sqlite, application } = fixture();
  try {
    const owner = await actor(application);
    const first = await application.createBooking(owner, groomingInput({
      start: "2026-08-25T10:00",
      end: "2026-08-25T11:30",
      idempotencyKey: "be3-cancel-release-001",
    }), metadata("corr-release-create"));
    assert.equal(first.outcome, "created");
    if (first.outcome !== "created") return;
    const cancelled = await application.cancelBooking(owner, {
      businessId: WHISKER,
      branchId: ARI,
      bookingId: first.booking.id,
      expectedRevision: first.booking.revision,
    }, metadata("corr-release-cancel"));
    assert.equal(cancelled.outcome, "cancelled");

    const replacement = await application.createBooking(owner, groomingInput({
      customerId: "booking-contact-pim",
      petIds: ["booking-pet-luna"],
      start: "2026-08-25T10:00",
      end: "2026-08-25T11:30",
      idempotencyKey: "be3-cancel-release-002",
    }), metadata("corr-release-replacement"));
    assert.equal(replacement.outcome, "created");
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM bookings WHERE id = ? AND status = 'cancelled'").get(first.booking.id)?.count, 1);
    const retained = Number(sqlite.prepare("SELECT COUNT(*) AS count FROM booking_resource_reservations WHERE booking_id = ?").get(first.booking.id)?.count ?? 0);
    assert.ok(retained > 0);
  } finally {
    sqlite.close();
  }
});

test("Booking audit metadata is bounded and durable rows survive a database reopen", async () => {
  // Keep the file-backed durability probe inside the workspace. On Windows,
  // deleting a freshly closed SQLite file from the system temp directory can
  // intermittently fail with EPERM while the temp-volume scanner still has a
  // transient handle. The workspace-local directory remains isolated and is
  // removed by the parent runner after this SQLite process exits.
  const directory = mkdtempSync(join(projectRoot, ".be3-test-"));
  const databasePath = join(directory, "be3.sqlite");
  const first = fixture(databasePath);
  const owner = await actor(first.application);
  const result = await first.application.createBooking(owner, groomingInput({
    start: "2026-08-26T10:00",
    end: "2026-08-26T11:30",
    notes: "PRIVATE NOTE THAT MUST NOT BE COPIED TO AUDIT",
    idempotencyKey: "be3-durable-reopen-01",
  }), metadata("corr-durable-booking"));
  assert.equal(result.outcome, "created");
  if (result.outcome !== "created") return;
  const bookingId = result.booking.id;
  const audit = first.sqlite.prepare(`
    SELECT actor_person_id, actor_membership_id, business_id, branch_id, request_id,
           correlation_id, target_type, target_id, after_json
    FROM audit_events WHERE correlation_id = ?
  `).get("corr-durable-booking");
  assert.equal(audit?.actor_person_id, OWNER);
  assert.equal(audit?.business_id, WHISKER);
  assert.equal(audit?.branch_id, ARI);
  assert.equal(audit?.target_type, "booking");
  assert.equal(audit?.target_id, bookingId);
  assert.ok(String(audit?.after_json).length < 32_000);
  assert.equal(String(audit?.after_json).includes("PRIVATE NOTE"), false);
  first.sqlite.close();

  const reopened = new DatabaseSync(databasePath);
  reopened.exec("PRAGMA foreign_keys = ON");
  const database = new NodeD1Database(reopened);
  const reopenedApplication = applicationFor(database, "reopen").application;
  const durable = await reopenedApplication.getBooking(await actor(reopenedApplication), WHISKER, ARI, bookingId);
  assert.equal(durable.notes, "PRIVATE NOTE THAT MUST NOT BE COPIED TO AUDIT");
  assert.equal(durable.revision, 1);
  assert.deepEqual(durable.pets.map((pet) => pet.id), ["booking-pet-mochi"]);
  reopened.close();
});
