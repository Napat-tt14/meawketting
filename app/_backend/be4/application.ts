import type { PersonView } from "../be1/contracts";
import { be1Error } from "../be1/errors";
import type { RequestMetadata } from "../be1/metadata";
import type { Be1Repository } from "../be1/repository";
import type { Be2Repository } from "../be2/repository";
import type { BookingView } from "../be3/contracts";
import type { Be3Repository } from "../be3/repository";
import { BusinessApplication } from "../shared/application";
import { BackendConflict, conflict } from "../shared/errors";
import { hash, opaqueId } from "../shared/validation";
import type { Be4Operation, Be4Result, ExecutionView, StaffView } from "./contracts";
import { changeExecution, executionId, isCompleted, serviceRecordFor } from "./domain";
import type { Be4Repository } from "./repository";
import { parseBe4Operation } from "./validation";

// Civil time agrees with BE3. A date-only same-day window covers that day.
function minutes(value: string) { return Date.parse(`${value.length === 10 ? `${value}T00:00` : value}:00Z`) / 60000; }
function assertStaff(staff: StaffView[], id: string | null, capability: StaffView["capabilities"][number], start: string, end: string) {
  if (!id) return;
  const member = staff.find((s) => s.staffId === id);
  if (!member?.active || !member.capabilities.includes(capability)) conflict("invalid-staff");
  const from = minutes(start), to = minutes(end);
  const windows = member.availability.map((w) => ({ ...w, from: minutes(w.start), to: minutes(w.end) + (w.start === w.end && w.end.length === 10 ? 1440 : 0) }))
    .filter((w) => Math.floor(w.from / 1440) <= Math.floor((to - 1) / 1440) && Math.floor((w.to - 1) / 1440) >= Math.floor(from / 1440));
  const working = windows.filter((w) => w.state === "working");
  if ((working.length && !working.some((w) => w.from <= from && w.to >= to)) || windows.some((w) => w.state !== "working" && w.from < to && from < w.to)) conflict("unavailable");
  return { id: member.staffId, revision: member.revision };
}

export class Be4Application extends BusinessApplication {
  constructor(auth: Be1Repository, private readonly identities: Be2Repository, private readonly bookings: Be3Repository,
    private readonly operations: Be4Repository, private readonly clock: () => string = () => new Date().toISOString()) { super(auth); }

  async executeBe4<T extends Be4Operation>(actor: PersonView, raw: T, metadata: RequestMetadata): Promise<Be4Result<T>> {
    const operation = parseBe4Operation(raw), input = operation.type === "operations.change" ? operation.input : operation;
    const now = this.clock();
    const context = await this.scope(actor, input.businessId, input.branchId, metadata, now, !["operations.list", "operations.get"].includes(operation.type));
    const permitted = new Set((await this.listPermittedBranches(context.actor, input.businessId, true)).map((b) => b.id));
    const visibleStaff = (staff: StaffView) => ({ ...staff, branchIds: staff.branchIds.filter((id) => permitted.has(id)) });
    const required = async (id: string) => {
      const found = await this.operations.get(input.businessId, input.branchId, id);
      if (!found) throw be1Error("NOT_FOUND");
      return found;
    };
    const target = async (id: string): Promise<unknown> => {
      if (operation.type === "staff.save") {
        const staff = (await this.operations.staff(input.businessId, input.branchId)).find((s) => s.staffId === id);
        if (!staff) throw be1Error("NOT_FOUND");
        return visibleStaff(staff);
      }
      if (operation.type === "record.correct") {
        const record = (await this.operations.records(input.businessId, input.branchId)).find((s) => s.serviceRecordId === id);
        if (!record) throw be1Error("NOT_FOUND");
        return record;
      }
      return required(id);
    };
    if (operation.type === "operations.get") return await required(operation.executionId) as Be4Result<T>;
    if (operation.type === "operations.list") {
      const executions = await this.operations.list(input.businessId, input.branchId, operation.afterId ?? "", operation.limit ?? 100);
      const [records, staff, rooms] = await Promise.all([this.operations.records(input.businessId, input.branchId, executions.map(executionId)),
        this.operations.staff(input.businessId, input.branchId), this.operations.rooms(input.businessId, input.branchId)]);
      return { executions, records, staff: staff.map(visibleStaff), rooms } as Be4Result<T>;
    }
    const requestKey = operation.type === "operations.change" ? operation.input.requestKey : operation.requestKey;
    const requestHash = await hash({ actorId: context.actor.id, operation });
    const replay = async () => {
      const saved = await this.operations.receipt(input.businessId, operation.type, requestKey);
      if (!saved) return null;
      if (saved.branchId !== input.branchId || saved.requestHash !== requestHash) conflict("idempotency");
      return target(saved.targetId);
    };
    const previous = await replay();
    if (previous) return previous as Be4Result<T>;
    const receipt = (targetId: string) => ({ command: operation.type, requestKey, requestHash, targetId });
    let targetId: string;
    try {
      if (operation.type === "staff.save") {
        const d = operation.draft;
        const before = d.staffId ? (await this.operations.staff(input.businessId, input.branchId)).find((s) => s.staffId === d.staffId) ?? null : null;
        if (d.staffId && !before) throw be1Error("NOT_FOUND");
        if ((before?.revision ?? null) !== operation.expectedRevision) conflict("version-conflict");
        if (!d.branchIds.length || !d.branchIds.includes(input.branchId)) throw be1Error("INVALID_INPUT");
        for (const id of new Set([...(before?.branchIds ?? []), ...d.branchIds])) await this.scope(context.actor, input.businessId, id, metadata, now, true);
        const after: StaffView = { staffId: before?.staffId ?? opaqueId("staff"), businessId: input.businessId, branchIds: d.branchIds,
          name: d.name, avatarSeed: d.avatarSeed ?? before?.avatarSeed ?? d.name, role: d.role, capabilities: d.capabilities,
          active: d.active ?? true, availability: d.availability ?? before?.availability ?? [], createdAt: before?.createdAt ?? now, updatedAt: now, revision: (before?.revision ?? 0) + 1 };
        targetId = after.staffId;
        await this.operations.saveStaff(before, after, context, input.branchId, receipt(targetId));
      } else if (operation.type === "record.correct") {
        const before = (await this.operations.records(input.businessId, input.branchId)).find((r) => r.serviceRecordId === operation.recordId);
        if (!before) throw be1Error("NOT_FOUND");
        if (before.revision !== operation.expectedRevision) conflict("version-conflict");
        const after = structuredClone(before), field = operation.field === "summary" ? "summary" : "businessNote";
        after.corrections.push({ id: opaqueId("correction"), at: now, field: operation.field, previousValue: before[field], nextValue: operation.value,
          reason: operation.reason, correctedBy: context.actor.id, requestKey });
        after[field] = operation.value; after.revision++; after.updatedAt = now; targetId = after.serviceRecordId;
        await this.operations.correctRecord(before, after, context, receipt(targetId));
      } else {
        const i = operation.input, before = await required(i.executionId), change = i.change;
        if (before.record.revision !== i.expectedRevision) conflict("version-conflict");
        if (!context.branch.enabledModules.includes(before.kind)) conflict("unavailable");
        const [booking, customer, pet] = await Promise.all([this.bookings.getBooking(input.businessId, input.branchId, before.record.bookingId),
          this.identities.getCustomer(input.businessId, before.record.customerId), this.identities.getPet(input.businessId, before.record.petId)]);
        if (!booking || !customer || !pet) throw be1Error("NOT_FOUND");
        if (change.type === "transition" && change.status !== "cancelled" && (booking.status === "cancelled" || customer.status !== "active" || pet.status !== "active")) conflict("unavailable");
        // Medication needs a verified, scoped Intake instruction from BE5.
        if (change.type === "hotel-care-complete" && before.kind === "hotel" && before.record.dailyCareTasks.find((t) => t.id === change.taskId)?.kind === "medication") conflict("intake-required");
        const after = changeExecution(before, change, now, context.actor.id);
        const assignmentChange = ["grooming-resources", "hotel-room", "hotel-care-staff", "daycare-zone", "daycare-staff"].includes(change.type);
        const checkedStaff = assignmentChange || (change.type === "transition" && !["cancelled", "no-show", "checked-out", "completed"].includes(change.status)) ? await this.validateAssignments(after, booking) : [];
        let serviceRecord;
        if (isCompleted(after) && !isCompleted(before)) {
          const [resources, rooms, staff] = await Promise.all([this.bookings.listResources(input.businessId, input.branchId), this.operations.rooms(input.businessId, input.branchId), this.operations.staff(input.businessId, input.branchId)]);
          const ids = after.kind === "grooming" ? after.record.assignedResourceIds : after.kind === "hotel" ? after.record.roomAssignments.map((a) => a.roomId) : [after.record.zoneId, after.record.responsibleStaffId].filter((id): id is string => !!id);
          const labels = [...resources, ...rooms].filter((r) => ids.includes(r.id)).map((r) => r.label).concat(staff.filter((s) => ids.includes(s.staffId)).map((s) => s.name));
          serviceRecord = serviceRecordFor(after, [...new Set(labels)], now);
        }
        targetId = executionId(after);
        await this.operations.save({ before, after, context, receipt: receipt(targetId), serviceRecord, checkedStaff, requireActiveSource: change.type === "transition" && change.status !== "cancelled" });
      }
    } catch (error) {
      if (error instanceof BackendConflict && ["idempotency", "version-conflict"].includes(error.reason)) {
        const raced = await replay(); if (raced) return raced as Be4Result<T>;
      }
      throw error;
    }
    return await target(targetId) as Be4Result<T>;
  }

  /** Also used by BE5 when preparing an atomic receive/execution handoff. */
  async validateAssignments(value: ExecutionView, booking: BookingView) {
    const r = value.record;
    const checked: { id: string; revision: number }[] = [];
    const [staff, resources] = await Promise.all([this.operations.staff(r.businessId, r.branchId), this.bookings.listResources(r.businessId, r.branchId)]);
    const resource = (id: string) => {
      const found = resources.find((entry) => entry.id === id && entry.status === "active" && entry.module === value.kind && entry.serviceIds.includes(booking.serviceId));
      if (!found) conflict("invalid-resource");
      return found;
    };
    if (value.kind === "grooming") for (const id of value.record.assignedResourceIds) {
      const found = resource(id);
      const result = assertStaff(staff, found.compatibilityStaffId, "grooming", value.record.scheduledStart, value.record.scheduledEnd!);
      if (result) checked.push(result);
    }
    if (value.kind === "hotel") {
      const rooms = await this.operations.rooms(r.businessId, r.branchId);
      if (value.record.roomAssignments.some((a) => !rooms.some((room) => room.id === a.roomId && room.serviceIds.includes(booking.serviceId)))) conflict("invalid-resource");
      for (const task of value.record.dailyCareTasks.filter((t) => t.state === "pending")) {
        const start = `${task.scheduledDate}T${task.scheduledTime ?? "12:00"}`;
        const end = new Date(minutes(start) * 60000 + 30 * 60000).toISOString().slice(0, 16);
        const result = assertStaff(staff, task.assignedStaffId ?? null, "hotel-care", start, end);
        if (result) checked.push(result);
      }
    }
    if (value.kind === "daycare") {
      if (value.record.zoneId && resource(value.record.zoneId).kind !== "daycare-zone") conflict("invalid-resource");
      const result = assertStaff(staff, value.record.responsibleStaffId, "daycare", `${value.record.attendanceDate}T09:00`, `${value.record.attendanceDate}T18:00`);
      if (result) checked.push(result);
    }
    return [...new Map(checked.map((s) => [s.id, s])).values()];
  }
}
