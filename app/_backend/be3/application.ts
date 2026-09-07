import { Be1Application } from "../be1/application";
import type { BranchView, BusinessMembershipView, PersonView } from "../be1/contracts";
import { be1Error } from "../be1/errors";
import type { RequestMetadata } from "../be1/metadata";
import type { AuthorizedMutation, Be1Repository } from "../be1/repository";
import type { Be2Repository } from "../be2/repository";
import type {
  Be3ApiOperation,
  Be3OperationResult,
  BookingAvailability,
  BookingAvailabilityInput,
  BookingCatalogView,
  BookingConflict,
  BookingConflictCode,
  BookingMutationResult,
  BookingResourceView,
  BookingServiceView,
  BookingView,
  CreateBookingInput,
  UpdateBookingInput,
} from "./contracts";
import { Be3WriteConflict } from "./errors";
import type { Be3Repository, BookingPersistenceWrite, BookingReservationWrite } from "./repository";
import {
  bookingInterval,
  localValueMinute,
  occupiedCalendarDates,
  validateAssignBookingResourcesInput,
  validateBookingAvailabilityInput,
  validateBookingListInput,
  validateCancelBookingInput,
  validateCreateBookingInput,
  validateRescheduleBookingInput,
  validateUpdateBookingInput,
  weekdayForLocalValue,
} from "./validation";
import { validateId } from "../be1/validation";

const DAY_MINUTES = 24 * 60;

const CONFLICT_COPY: Record<BookingConflictCode, { message: string; recovery: BookingConflict["recovery"] }> = {
  BRANCH_INACTIVE: { message: "สาขานี้ปิดรับงานใหม่อยู่ กรุณาเลือกสาขาที่เปิดใช้งาน", recovery: "return-to-edit" },
  BRANCH_CLOSED: { message: "สาขาปิดทำการในวันที่เลือก กรุณาเลือกวันอื่น", recovery: "change-date" },
  OUTSIDE_OPERATING_HOURS: { message: "เวลานี้อยู่นอกเวลาทำการของสาขา", recovery: "change-time" },
  MODULE_DISABLED: { message: "บริการนี้ยังไม่เปิดใช้ที่สาขาปัจจุบัน", recovery: "return-to-edit" },
  SERVICE_UNAVAILABLE: { message: "บริการนี้ไม่พร้อมรับการจอง", recovery: "return-to-edit" },
  CUSTOMER_UNAVAILABLE: { message: "ข้อมูลลูกค้านี้ไม่พร้อมใช้กับการจอง", recovery: "return-to-edit" },
  PET_UNAVAILABLE: { message: "ข้อมูลสัตว์เลี้ยงนี้ไม่พร้อมใช้กับการจอง", recovery: "return-to-edit" },
  CUSTOMER_PET_RELATIONSHIP_MISSING: { message: "สัตว์เลี้ยงที่เลือกไม่ได้เชื่อมเป็น contact relationship ของลูกค้ารายนี้", recovery: "return-to-edit" },
  INVALID_TIME: { message: "ช่วงวันหรือเวลาไม่ถูกต้อง", recovery: "change-time" },
  MISSING_RESOURCE: { message: "กรุณาเลือกทรัพยากรที่บริการนี้ต้องใช้", recovery: "change-resource" },
  RESOURCE_UNAVAILABLE: { message: "ตัวเลือกนี้ไม่พร้อมใช้กับบริการหรือสาขาปัจจุบัน", recovery: "change-resource" },
  STAFF_UNAVAILABLE: { message: "ช่างไม่พร้อมรับงานในช่วงเวลานี้", recovery: "change-resource" },
  TIME_CONFLICT: { message: "ทรัพยากรนี้มีงานในช่วงเวลาเดียวกัน", recovery: "change-resource" },
  CAPACITY_CONFLICT: { message: "ความจุเต็มในวันที่เลือก", recovery: "change-date" },
  DUPLICATE_BOOKING: { message: "มีการจองเดียวกันอยู่แล้ว ระบบไม่ได้สร้างรายการซ้ำ", recovery: "return-to-edit" },
  VERSION_CONFLICT: { message: "รายการนี้ถูกแก้ไขจากอีกหน้าจอ กรุณาโหลดข้อมูลล่าสุด", recovery: "reload" },
  IDEMPOTENCY_KEY_REUSED: { message: "คำขอนี้ถูกใช้กับข้อมูลการจองคนละชุดแล้ว", recovery: "return-to-edit" },
};

function conflict(code: BookingConflictCode, details: Omit<BookingConflict, "code" | "message" | "recovery"> = {}): BookingConflict {
  return { code, ...CONFLICT_COPY[code], ...details };
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort();
}

function bookingFingerprint(booking: Pick<BookingView, "businessId" | "branchId" | "serviceId" | "customerId" | "pets" | "start" | "end" | "assignedResourceIds">) {
  return [
    booking.businessId,
    booking.branchId,
    booking.serviceId,
    booking.customerId,
    uniqueSorted(booking.pets.map((pet) => pet.id)).join(","),
    booking.start,
    booking.end ?? "",
    uniqueSorted(booking.assignedResourceIds).join(","),
  ].join("|");
}

function intervalOverlaps(first: { startMinute: number; endMinute: number }, second: { startMinute: number; endMinute: number }) {
  return first.startMinute < second.endMinute && second.startMinute < first.endMinute;
}

function defaultService(branch: BranchView, module: BranchView["enabledModules"][number]): BookingServiceView {
  return {
    id: `${branch.id}-${module}-service`,
    businessId: branch.businessId,
    branchId: branch.id,
    module,
    label: module === "grooming" ? "อาบน้ำ / ตัดขน" : module === "hotel" ? "เข้าพักโรงแรม" : "Daycare เต็มวัน",
    timeModel: module === "grooming" ? "appointment" : module === "hotel" ? "date-range" : "day",
    defaultDurationMinutes: module === "grooming" ? 90 : null,
    estimate: null,
    requiredResourceKinds: module === "grooming"
      ? ["groomer", "grooming-station", "dryer"]
      : module === "hotel" ? ["hotel-room-type"] : ["daycare-zone"],
    status: "active",
  };
}

function defaultResources(service: BookingServiceView): BookingResourceView[] {
  const base = {
    businessId: service.businessId,
    branchId: service.branchId,
    module: service.module,
    serviceIds: [service.id],
    compatibilityStaffId: null,
    availability: [],
    status: "active" as const,
  };
  if (service.module === "grooming") {
    // Team/HR remains outside BE3, so a new Branch receives physical planning
    // Resources only. A groomer Resource must be configured explicitly later.
    return [
      { ...base, id: `${service.branchId}-grooming-station`, kind: "grooming-station", label: "จุดบริการหลัก", capacityMode: "exclusive", capacity: 1, hotelRole: null },
      { ...base, id: `${service.branchId}-dryer`, kind: "dryer", label: "เครื่องเป่าหลัก", capacityMode: "exclusive", capacity: 1, hotelRole: null },
    ];
  }
  if (service.module === "hotel") {
    return [{ ...base, id: `${service.branchId}-hotel-capacity`, kind: "hotel-room-type", label: "พื้นที่พักตามเงื่อนไข", capacityMode: "capacity", capacity: 4, hotelRole: "planning-capacity" }];
  }
  return [{ ...base, id: `${service.branchId}-daycare-zone`, kind: "daycare-zone", label: "โซนทั่วไป", capacityMode: "capacity", capacity: 12, hotelRole: null }];
}

async function sha256(value: unknown) {
  const input = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type Be3ApplicationDependencies = {
  now?: () => string;
  id?: (prefix: "bok") => string;
};

export class Be3Application extends Be1Application {
  private readonly customerPetRepository: Be2Repository;
  private readonly bookingRepository: Be3Repository;
  private readonly be3Now: () => string;
  private readonly be3Id: (prefix: "bok") => string;

  constructor(
    authorizationRepository: Be1Repository,
    customerPetRepository: Be2Repository,
    bookingRepository: Be3Repository,
    dependencies: Be3ApplicationDependencies = {},
  ) {
    super(authorizationRepository);
    this.customerPetRepository = customerPetRepository;
    this.bookingRepository = bookingRepository;
    this.be3Now = dependencies.now ?? (() => new Date().toISOString());
    this.be3Id = dependencies.id ?? ((prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`);
  }

  async getCatalog(actor: PersonView, businessId: string, branchId: string) {
    const branch = await this.getBranch(actor, validateId(businessId), validateId(branchId));
    await this.ensurePlanningCatalog(branch, actor);
    const [services, resources] = await Promise.all([
      this.bookingRepository.listServices(branch.businessId, branch.id),
      this.bookingRepository.listResources(branch.businessId, branch.id),
    ]);
    return {
      businessId: branch.businessId,
      branchId: branch.id,
      services: services.filter((service) => branch.enabledModules.includes(service.module)),
      resources: resources.filter((resource) => branch.enabledModules.includes(resource.module)),
    } satisfies BookingCatalogView;
  }

  async listBookings(actor: PersonView, rawInput: unknown) {
    const input = validateBookingListInput(rawInput);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    const branches = input.branchId
      ? [await this.getBranch(actor, input.businessId, input.branchId)]
      : await this.listPermittedBranches(actor, input.businessId, membership.role === "OWNER");
    if (input.customerId && !await this.customerPetRepository.getCustomer(input.businessId, input.customerId)) {
      throw be1Error("NOT_FOUND");
    }
    if (input.resourceId) {
      const visible = (await Promise.all(branches.map((branch) => this.bookingRepository.listResources(input.businessId, branch.id))))
        .flat()
        .some((resource) => resource.id === input.resourceId);
      if (!visible) throw be1Error("NOT_FOUND");
    }
    return this.bookingRepository.listBookings({
      businessId: input.businessId,
      branchIds: branches.map((branch) => branch.id),
      customerId: input.customerId ?? null,
      rangeStartMinute: input.rangeStart ? localValueMinute(input.rangeStart) : null,
      rangeEndMinute: input.rangeEnd ? localValueMinute(input.rangeEnd) : null,
      modules: input.modules,
      statuses: input.statuses,
      resourceId: input.resourceId ?? null,
      includeCancelled: input.includeCancelled,
      limit: input.limit,
      offset: input.offset,
    });
  }

  async getBooking(actor: PersonView, businessId: string, branchId: string, bookingId: string) {
    await this.getBranch(actor, validateId(businessId), validateId(branchId));
    return this.requireBooking(businessId, branchId, validateId(bookingId));
  }

  async checkAvailability(actor: PersonView, rawInput: unknown) {
    const input = validateBookingAvailabilityInput(rawInput);
    const branch = await this.getBranch(actor, input.businessId, input.branchId);
    await this.ensurePlanningCatalog(branch, actor);
    const existing = input.bookingId ? await this.requireBooking(input.businessId, input.branchId, input.bookingId) : null;
    const previewedAt = this.be3Now();
    const candidate = await this.buildCandidate(input, existing, existing?.revision ?? 0, existing?.createdAt ?? previewedAt, existing?.updatedAt ?? previewedAt);
    return this.evaluateCandidate(branch, candidate);
  }

  async createBooking(actor: PersonView, rawInput: unknown, metadata: RequestMetadata): Promise<BookingMutationResult> {
    const input = validateCreateBookingInput(rawInput);
    if (input.status === "cancelled") throw be1Error("INVALID_INPUT");
    const branch = await this.getBranch(actor, input.businessId, input.branchId);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    await this.ensurePlanningCatalog(branch, actor);
    const requestHash = await sha256({ ...input, petIds: uniqueSorted(input.petIds), assignedResourceIds: uniqueSorted(input.assignedResourceIds) });
    const replay = await this.bookingRepository.findIdempotency(input.businessId, input.idempotencyKey);
    if (replay) return this.resolveIdempotentReplay(input, requestHash, replay.requestHash, replay.bookingId);

    const occurredAt = this.be3Now();
    const candidate = await this.buildCandidate(
      input,
      null,
      1,
      occurredAt,
      occurredAt,
      input.estimate,
      input.notes,
    );
    const availability = await this.evaluateCandidate(branch, candidate);
    if (!availability.available) return { outcome: "conflict", availability, current: null };
    const write = await this.persistenceWrite(candidate, input.idempotencyKey, requestHash);
    try {
      await this.bookingRepository.createBooking(write, this.authorizedMutation(actor, membership, metadata, occurredAt));
    } catch (error) {
      if (error instanceof Be3WriteConflict && error.code === "IDEMPOTENCY_KEY_REUSED") {
        const raced = await this.bookingRepository.findIdempotency(input.businessId, input.idempotencyKey);
        if (raced) return this.resolveIdempotentReplay(input, requestHash, raced.requestHash, raced.bookingId);
      }
      return this.writeConflictResult(branch, candidate, error, null);
    }
    return { outcome: "created", booking: await this.requireBooking(candidate.businessId, candidate.branchId, candidate.id) };
  }

  async updateBooking(actor: PersonView, rawInput: unknown, metadata: RequestMetadata): Promise<BookingMutationResult> {
    const input = validateUpdateBookingInput(rawInput);
    return this.replaceFromInput(actor, input, metadata, "booking.updated");
  }

  async rescheduleBooking(actor: PersonView, rawInput: unknown, metadata: RequestMetadata): Promise<BookingMutationResult> {
    const input = validateRescheduleBookingInput(rawInput);
    const existing = await this.authorizedExisting(actor, input.businessId, input.branchId, input.bookingId);
    const candidateInput: BookingAvailabilityInput = {
      businessId: existing.businessId,
      branchId: existing.branchId,
      bookingId: existing.id,
      serviceId: existing.serviceId,
      customerId: existing.customerId,
      petIds: existing.pets.map((pet) => pet.id),
      start: input.start,
      end: input.end,
      assignedResourceIds: existing.assignedResourceIds,
      status: existing.status,
    };
    return this.replaceCandidate(actor, candidateInput, existing, input.expectedRevision, existing.estimate, existing.notes, metadata, "booking.rescheduled");
  }

  async assignResources(actor: PersonView, rawInput: unknown, metadata: RequestMetadata): Promise<BookingMutationResult> {
    const input = validateAssignBookingResourcesInput(rawInput);
    const existing = await this.authorizedExisting(actor, input.businessId, input.branchId, input.bookingId);
    const candidateInput: BookingAvailabilityInput = {
      businessId: existing.businessId,
      branchId: existing.branchId,
      bookingId: existing.id,
      serviceId: existing.serviceId,
      customerId: existing.customerId,
      petIds: existing.pets.map((pet) => pet.id),
      start: existing.start,
      end: existing.end,
      assignedResourceIds: input.assignedResourceIds,
      status: existing.status,
    };
    return this.replaceCandidate(actor, candidateInput, existing, input.expectedRevision, existing.estimate, existing.notes, metadata, "booking.resources.changed");
  }

  async cancelBooking(actor: PersonView, rawInput: unknown, metadata: RequestMetadata): Promise<BookingMutationResult> {
    const input = validateCancelBookingInput(rawInput);
    const branch = await this.getBranch(actor, input.businessId, input.branchId);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    const existing = await this.requireBooking(input.businessId, input.branchId, input.bookingId);
    if (existing.status === "cancelled") return { outcome: "replayed", booking: existing };
    if (existing.revision !== input.expectedRevision) return this.versionConflict(existing);
    const occurredAt = this.be3Now();
    const candidate: BookingView = { ...existing, status: "cancelled", cancelledAt: occurredAt, updatedAt: occurredAt, revision: existing.revision + 1 };
    const write = await this.persistenceWrite(candidate, null, null);
    try {
      const result = await this.bookingRepository.replaceBooking(existing, write, "booking.cancelled", this.authorizedMutation(actor, membership, metadata, occurredAt));
      if (result === "version-conflict") return this.versionConflict(await this.bookingRepository.getBooking(input.businessId, input.branchId, input.bookingId));
    } catch (error) {
      return this.writeConflictResult(branch, candidate, error, existing);
    }
    return { outcome: "cancelled", booking: await this.requireBooking(input.businessId, input.branchId, input.bookingId) };
  }

  async executeBe3<T extends Be3ApiOperation>(actor: PersonView, operation: T, metadata: RequestMetadata): Promise<Be3OperationResult<T>> {
    let result: unknown;
    switch (operation.type) {
      case "booking.catalog": result = await this.getCatalog(actor, operation.businessId, operation.branchId); break;
      case "booking.list": result = await this.listBookings(actor, operation.input); break;
      case "booking.get": result = await this.getBooking(actor, operation.businessId, operation.branchId, operation.bookingId); break;
      case "booking.availability": result = await this.checkAvailability(actor, operation.input); break;
      case "booking.create": result = await this.createBooking(actor, operation.input, metadata); break;
      case "booking.update": result = await this.updateBooking(actor, operation.input, metadata); break;
      case "booking.reschedule": result = await this.rescheduleBooking(actor, operation.input, metadata); break;
      case "booking.assign-resources": result = await this.assignResources(actor, operation.input, metadata); break;
      case "booking.cancel": result = await this.cancelBooking(actor, operation.input, metadata); break;
    }
    return result as Be3OperationResult<T>;
  }

  private async replaceFromInput(actor: PersonView, input: UpdateBookingInput, metadata: RequestMetadata, action: string) {
    const existing = await this.authorizedExisting(actor, input.businessId, input.branchId, input.bookingId);
    return this.replaceCandidate(actor, input, existing, input.expectedRevision, input.estimate, input.notes, metadata, action);
  }

  private async replaceCandidate(
    actor: PersonView,
    input: BookingAvailabilityInput,
    existing: BookingView,
    expectedRevision: number,
    estimate: number | null,
    notes: string,
    metadata: RequestMetadata,
    action: string,
  ): Promise<BookingMutationResult> {
    const branch = await this.getBranch(actor, input.businessId, input.branchId);
    const { membership } = await this.resolveMembership(actor, input.businessId);
    await this.ensurePlanningCatalog(branch, actor);
    if (existing.revision !== expectedRevision) return this.versionConflict(existing);
    const occurredAt = this.be3Now();
    const candidate = await this.buildCandidate(input, existing, existing.revision + 1, existing.createdAt, occurredAt, estimate, notes);
    const availability = await this.evaluateCandidate(branch, candidate);
    if (!availability.available) return { outcome: "conflict", availability, current: existing };
    const write = await this.persistenceWrite(candidate, null, null);
    try {
      const result = await this.bookingRepository.replaceBooking(existing, write, action, this.authorizedMutation(actor, membership, metadata, occurredAt));
      if (result === "version-conflict") return this.versionConflict(await this.bookingRepository.getBooking(input.businessId, input.branchId, existing.id));
    } catch (error) {
      return this.writeConflictResult(branch, candidate, error, existing);
    }
    return { outcome: "updated", booking: await this.requireBooking(candidate.businessId, candidate.branchId, candidate.id) };
  }

  private async authorizedExisting(actor: PersonView, businessId: string, branchId: string, bookingId: string) {
    await this.getBranch(actor, businessId, branchId);
    return this.requireBooking(businessId, branchId, bookingId);
  }

  private async buildCandidate(
    input: BookingAvailabilityInput,
    existing: BookingView | null,
    revision: number,
    createdAt: string,
    updatedAt: string,
    estimate = existing?.estimate ?? null,
    notes = existing?.notes ?? "",
  ): Promise<BookingView> {
    const service = await this.bookingRepository.getService(input.businessId, input.branchId, input.serviceId);
    if (!service) throw be1Error("NOT_FOUND");
    const customer = await this.customerPetRepository.getCustomer(input.businessId, input.customerId);
    if (!customer) throw be1Error("NOT_FOUND");
    const petProfiles = await this.customerPetRepository.listPetsByIds(input.businessId, input.petIds);
    const petById = new Map(petProfiles.map((pet) => [pet.id, pet]));
    const pets = input.petIds.map((petId) => {
      const pet = petById.get(petId);
      if (!pet) throw be1Error("NOT_FOUND");
      return { id: pet.id, name: pet.name, species: pet.species };
    });
    return {
      id: existing?.id ?? this.be3Id("bok"),
      businessId: input.businessId,
      branchId: input.branchId,
      customerId: customer.id,
      customerName: customer.displayName,
      pets,
      serviceId: service.id,
      serviceLabel: service.label,
      serviceModule: service.module,
      timeModel: service.timeModel,
      start: input.start,
      end: service.timeModel === "day" ? null : input.end,
      requiredResourceKinds: service.requiredResourceKinds,
      assignedResourceIds: uniqueSorted(input.assignedResourceIds),
      status: input.status,
      estimate,
      notes: notes.trim(),
      revision,
      createdAt,
      updatedAt,
      cancelledAt: input.status === "cancelled" ? existing?.cancelledAt ?? updatedAt : null,
    };
  }

  private async evaluateCandidate(branch: BranchView, candidate: BookingView): Promise<BookingAvailability> {
    const conflicts: BookingConflict[] = [];
    if (candidate.status === "cancelled") return { available: true, conflicts };
    if (branch.status !== "active") conflicts.push(conflict("BRANCH_INACTIVE"));
    if (!branch.enabledModules.includes(candidate.serviceModule)) conflicts.push(conflict("MODULE_DISABLED"));
    const service = await this.bookingRepository.getService(candidate.businessId, candidate.branchId, candidate.serviceId);
    if (!service || service.status !== "active") conflicts.push(conflict("SERVICE_UNAVAILABLE"));

    const interval = bookingInterval(candidate.timeModel, candidate.start, candidate.end);
    if (!interval) conflicts.push(conflict("INVALID_TIME"));
    const customer = await this.customerPetRepository.getCustomer(candidate.businessId, candidate.customerId);
    if (!customer) throw be1Error("NOT_FOUND");
    if (customer.status !== "active") conflicts.push(conflict("CUSTOMER_UNAVAILABLE"));
    if (candidate.pets.length === 0) conflicts.push(conflict("PET_UNAVAILABLE"));
    const candidatePetIds = candidate.pets.map((pet) => pet.id);
    const profiles = await this.customerPetRepository.listPetsByIds(candidate.businessId, candidatePetIds);
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const linkedPetIds = new Set(await this.customerPetRepository.listActiveRelationshipPetIds(
      candidate.businessId,
      candidate.customerId,
      candidatePetIds,
    ));
    for (const pet of candidate.pets) {
      const profile = profileById.get(pet.id);
      if (!profile) throw be1Error("NOT_FOUND");
      if (profile.status !== "active") conflicts.push(conflict("PET_UNAVAILABLE"));
      if (!linkedPetIds.has(pet.id)) {
        conflicts.push(conflict("CUSTOMER_PET_RELATIONSHIP_MISSING"));
      }
    }

    const allResources = await this.bookingRepository.listResources(candidate.businessId, candidate.branchId, candidate.serviceId);
    const selected: BookingResourceView[] = [];
    for (const resourceId of candidate.assignedResourceIds) {
      const resource = allResources.find((item) => item.id === resourceId);
      if (!resource) throw be1Error("NOT_FOUND");
      selected.push(resource);
      if (resource.status !== "active" || resource.module !== candidate.serviceModule) {
        conflicts.push(conflict("RESOURCE_UNAVAILABLE", { resourceId: resource.id, resourceKind: resource.kind }));
      }
    }
    for (const kind of candidate.requiredResourceKinds) {
      if (!selected.some((resource) => resource.kind === kind)) conflicts.push(conflict("MISSING_RESOURCE", { resourceKind: kind }));
    }

    if (interval) {
      const weekday = weekdayForLocalValue(candidate.start);
      const hours = weekday ? branch.operatingHours.find((entry) => entry.day === weekday) : null;
      if (hours?.closed) conflicts.push(conflict("BRANCH_CLOSED"));
      if (hours && !hours.closed && candidate.timeModel === "appointment") {
        const startTime = candidate.start.slice(11, 16);
        const endTime = candidate.end?.slice(11, 16) ?? "";
        if (startTime < hours.open || endTime > hours.close) conflicts.push(conflict("OUTSIDE_OPERATING_HOURS"));
      }
      for (const resource of selected) {
        if (this.staffResourceUnavailable(resource, interval)) {
          conflicts.push(conflict("STAFF_UNAVAILABLE", { resourceId: resource.id, resourceKind: resource.kind }));
        }
      }
    }

    if (!interval || conflicts.length > 0) return { available: false, conflicts: this.uniqueConflicts(conflicts) };
    const overlaps = await this.bookingRepository.listOverlappingBookings(
      candidate.businessId,
      candidate.branchId,
      interval.startMinute,
      interval.endMinute,
      candidate.id,
    );
    if (overlaps.some((booking) => bookingFingerprint(booking) === bookingFingerprint(candidate))) {
      conflicts.push(conflict("DUPLICATE_BOOKING"));
    }
    for (const resource of selected) {
      const occupants = overlaps.filter((booking) => booking.assignedResourceIds.includes(resource.id));
      if (resource.capacityMode === "exclusive" && occupants.length > 0) {
        conflicts.push(conflict("TIME_CONFLICT", { resourceId: resource.id, resourceKind: resource.kind, bookingIds: occupants.map((booking) => booking.id) }));
      } else if (resource.capacityMode === "capacity") {
        const fullDates: string[] = [];
        const bookingIds = new Set<string>();
        for (const date of occupiedCalendarDates(interval.startMinute, interval.endMinute)) {
          const dayStart = localValueMinute(date);
          if (dayStart === null) continue;
          const dayInterval = { startMinute: dayStart, endMinute: dayStart + DAY_MINUTES };
          const onDate = occupants.filter((booking) => {
            const other = bookingInterval(booking.timeModel, booking.start, booking.end);
            return other ? intervalOverlaps(dayInterval, other) : false;
          });
          const used = onDate.reduce((total, booking) => total + Math.max(1, booking.pets.length), 0);
          if (used + Math.max(1, candidate.pets.length) > resource.capacity) {
            fullDates.push(date);
            onDate.forEach((booking) => bookingIds.add(booking.id));
          }
        }
        if (fullDates.length) conflicts.push(conflict("CAPACITY_CONFLICT", {
          resourceId: resource.id,
          resourceKind: resource.kind,
          bookingIds: [...bookingIds],
          dates: fullDates,
        }));
      }
    }
    return { available: conflicts.length === 0, conflicts: this.uniqueConflicts(conflicts) };
  }

  private staffResourceUnavailable(resource: BookingResourceView, interval: { startMinute: number; endMinute: number }) {
    if (!resource.compatibilityStaffId) return false;
    const windows = resource.availability.flatMap((window) => {
      const startMinute = localValueMinute(window.start);
      const endMinute = localValueMinute(window.end);
      return startMinute !== null && endMinute !== null && endMinute > startMinute ? [{ ...window, startMinute, endMinute }] : [];
    });
    const relevant = windows.filter((window) => intervalOverlaps(interval, window));
    const working = relevant.filter((window) => window.state === "working");
    if (working.length > 0 && !working.some((window) => interval.startMinute >= window.startMinute && interval.endMinute <= window.endMinute)) return true;
    return relevant.some((window) => window.state !== "working");
  }

  private async persistenceWrite(booking: BookingView, idempotencyKey: string | null, requestHash: string | null): Promise<BookingPersistenceWrite> {
    const interval = bookingInterval(booking.timeModel, booking.start, booking.end);
    const startWeekday = weekdayForLocalValue(booking.start);
    if (!interval || !startWeekday) throw be1Error("INVALID_INPUT");
    const resources = await this.bookingRepository.listResources(booking.businessId, booking.branchId, booking.serviceId);
    const selected = booking.assignedResourceIds.map((resourceId) => {
      const resource = resources.find((item) => item.id === resourceId);
      if (!resource) throw be1Error("NOT_FOUND");
      return resource;
    });
    const units = Math.max(1, booking.pets.length);
    const reservations = selected.flatMap<BookingReservationWrite>((resource) => resource.capacityMode === "exclusive"
      ? [{ resourceId: resource.id, reservationKey: "interval", reservationDate: null, startMinute: interval.startMinute, endMinute: interval.endMinute, units: 1 }]
      : occupiedCalendarDates(interval.startMinute, interval.endMinute).map((date) => {
        const startMinute = localValueMinute(date)!;
        return { resourceId: resource.id, reservationKey: date, reservationDate: date, startMinute, endMinute: startMinute + DAY_MINUTES, units };
      }));
    return { booking, startMinute: interval.startMinute, endMinute: interval.endMinute, startWeekday, idempotencyKey, requestHash, reservations };
  }

  private async writeConflictResult(branch: BranchView, candidate: BookingView, error: unknown, current: BookingView | null): Promise<BookingMutationResult> {
    if (!(error instanceof Be3WriteConflict)) throw error;
    const availability = await this.evaluateCandidate(branch, candidate);
    if (availability.available) availability.conflicts.push(conflict(error.code));
    availability.available = false;
    return { outcome: "conflict", availability, current };
  }

  private async resolveIdempotentReplay(input: CreateBookingInput, requestHash: string, storedHash: string, bookingId: string): Promise<BookingMutationResult> {
    if (requestHash !== storedHash) return { outcome: "conflict", availability: { available: false, conflicts: [conflict("IDEMPOTENCY_KEY_REUSED")] }, current: null };
    return { outcome: "replayed", booking: await this.requireBooking(input.businessId, input.branchId, bookingId) };
  }

  private versionConflict(current: BookingView | null): BookingMutationResult {
    return { outcome: "conflict", availability: { available: false, conflicts: [conflict("VERSION_CONFLICT")] }, current };
  }

  private uniqueConflicts(conflicts: BookingConflict[]) {
    const seen = new Set<string>();
    return conflicts.filter((entry) => {
      const key = `${entry.code}:${entry.resourceId ?? ""}:${entry.resourceKind ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async ensurePlanningCatalog(branch: BranchView, actor: PersonView) {
    const existing = await this.bookingRepository.listServices(branch.businessId, branch.id);
    const missing = branch.enabledModules.filter((module) => !existing.some((service) => service.module === module));
    if (!missing.length) return;
    const services = missing.map((module) => defaultService(branch, module));
    await this.bookingRepository.ensureDefaultCatalog({
      businessId: branch.businessId,
      branchId: branch.id,
      services,
      resources: services.flatMap(defaultResources),
    }, this.be3Now(), actor.id);
  }

  private async requireBooking(businessId: string, branchId: string, bookingId: string) {
    const booking = await this.bookingRepository.getBooking(businessId, branchId, bookingId);
    if (!booking) throw be1Error("NOT_FOUND");
    return booking;
  }

  private authorizedMutation(actor: PersonView, membership: BusinessMembershipView, metadata: RequestMetadata, occurredAt: string): AuthorizedMutation {
    return { actor, membership, metadata, occurredAt };
  }
}
