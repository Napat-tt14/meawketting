import { be1Error } from "../be1/errors";
import { validateId } from "../be1/validation";
import { choice, date, ids, integer, nullableId, object, string } from "../shared/validation";
import type { Be4Operation, ExecutionChange } from "./contracts";

function localTime(value: unknown) {
  const result = string(value, 16, true);
  date(result.slice(0, 10));
  if (result.length !== 10 && !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(result)) throw be1Error("INVALID_INPUT");
  return result;
}

function change(value: unknown): ExecutionChange {
  const v = object(value);
  switch (v.type) {
    case "transition": return { type: v.type, status: choice(v.status, ["booked", "checked-in", "waiting", "in-service", "ready-for-pickup", "completed", "cancelled", "expected-today", "in-stay", "ready-for-checkout", "checked-out", "no-show", "active"]) };
    case "note": return { type: v.type, note: string(v.note) };
    case "grooming-resources": return { type: v.type, resourceIds: ids(v.resourceIds) };
    case "hotel-room": return { type: v.type, roomId: validateId(v.roomId), effectiveDate: v.effectiveDate === null ? null : date(v.effectiveDate), reason: string(v.reason, 1000) };
    case "hotel-care-complete": return { type: v.type, taskId: validateId(v.taskId) };
    case "hotel-care-staff": return { type: v.type, taskId: validateId(v.taskId), staffId: nullableId(v.staffId) };
    case "hotel-incident": return { type: v.type, summary: string(v.summary, 2000, true), severity: choice(v.severity, ["attention", "info"]) };
    case "hotel-incident-resolve": return { type: v.type, incidentId: validateId(v.incidentId) };
    case "daycare-zone": return { type: v.type, zoneId: validateId(v.zoneId) };
    case "daycare-staff": return { type: v.type, staffId: nullableId(v.staffId) };
    case "daycare-care": return { type: v.type, kind: choice(v.kind, ["meal", "water", "activity", "rest", "note"]), note: string(v.note, 2000, true) };
    default: throw be1Error("INVALID_INPUT");
  }
}

export function parseBe4Operation(value: unknown): Be4Operation {
  const v = object(value);
  if (v.type === "operations.change") {
    const i = object(v.input);
    return { type: v.type, input: { businessId: validateId(i.businessId), branchId: validateId(i.branchId), executionId: validateId(i.executionId), expectedRevision: integer(i.expectedRevision, 1), requestKey: validateId(i.requestKey), change: change(i.change) } };
  }
  const scope = { businessId: validateId(v.businessId), branchId: validateId(v.branchId) };
  switch (v.type) {
    case "operations.list": return { type: v.type, ...scope, afterId: v.afterId ? validateId(v.afterId) : "", limit: v.limit === undefined ? 100 : integer(v.limit, 1, 200) };
    case "operations.get": return { type: v.type, ...scope, executionId: validateId(v.executionId) };
    case "record.correct": return { type: v.type, ...scope, recordId: validateId(v.recordId), field: choice(v.field, ["summary", "business-note"]), value: string(v.value, 4000, true), reason: string(v.reason, 1000, true), expectedRevision: integer(v.expectedRevision, 1), requestKey: validateId(v.requestKey) };
    case "staff.save": {
      const d = object(v.draft);
      if (!Array.isArray(d.capabilities) || d.capabilities.length > 4 || (d.active !== undefined && typeof d.active !== "boolean")) throw be1Error("INVALID_INPUT");
      if (d.businessId !== undefined && d.businessId !== scope.businessId) throw be1Error("INVALID_INPUT");
      const availability = d.availability ?? [];
      if (!Array.isArray(availability) || availability.length > 100) throw be1Error("INVALID_INPUT");
      return { type: v.type, ...scope, expectedRevision: v.expectedRevision === null ? null : integer(v.expectedRevision, 1), requestKey: validateId(v.requestKey), draft: {
        staffId: d.staffId === undefined ? undefined : validateId(d.staffId), businessId: scope.businessId,
        branchIds: ids(d.branchIds), name: string(d.name, 120, true), avatarSeed: d.avatarSeed === undefined ? undefined : string(d.avatarSeed, 120, true),
        role: choice(d.role, ["owner", "manager", "staff"]), capabilities: [...new Set(d.capabilities.map((c) => choice(c, ["grooming", "hotel-care", "daycare", "front-desk"] as const)))], active: d.active === undefined ? true : d.active,
        availability: availability.map((item) => {
          const w = object(item), start = localTime(w.start), end = localTime(w.end);
          if (end < start || (end === start && start.length !== 10)) throw be1Error("INVALID_INPUT");
          return { id: validateId(w.id), state: choice(w.state, ["working", "unavailable", "break", "time-off"]), start, end, note: w.note === null ? null : string(w.note, 1000) };
        }),
      } };
    }
    default: throw be1Error("INVALID_INPUT");
  }
}
