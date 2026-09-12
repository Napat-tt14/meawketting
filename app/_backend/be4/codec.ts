import type { ExecutionView, JobView, StayView, AttendanceView } from "./contracts";
import { executionId } from "./domain";

export type ExecutionRow = {
  id: string; business_id: string; branch_id: string; booking_id: string; customer_id: string; pet_id: string;
  module: ExecutionView["kind"]; status: string; intake_id: string | null; scheduled_start: string; scheduled_end: string | null;
  business_note: string; details_json: string; revision: number; write_token: string; created_at: string; updated_at: string; cancelled_at: string | null;
  service_id: string; service_label: string;
};
export type AssignmentRow = {
  id: string; execution_id: string; resource_id: string | null; space_id: string | null; staff_id: string | null;
  start_local: string; end_local: string; assigned_at: string; assigned_by: string | null; reason: string | null;
};
export type EventRow = { id: string; execution_id: string; kind: string; summary: string; data_json: string; occurred_at: string };
export type TaskRow = {
  id: string; execution_id: string; kind: StayView["dailyCareTasks"][number]["kind"]; label: string; scheduled_date: string; scheduled_time: string;
  staff_id: string | null; completed_at: string | null; completed_by: string | null; instructions: string | null; authorized_intake_id: string | null;
};

export function encode(value: ExecutionView, writeToken: string) {
  const r = value.record;
  const start = value.kind === "grooming" ? value.record.scheduledStart : value.kind === "hotel" ? value.record.scheduledCheckIn : value.record.attendanceDate;
  const end = value.kind === "grooming" ? value.record.scheduledEnd : value.kind === "hotel" ? value.record.scheduledCheckOut : null;
  const details = value.kind === "grooming" ? { actualStartedAt: value.record.actualStartedAt, actualCompletedAt: value.record.actualCompletedAt }
    : value.kind === "hotel" ? { actualCheckInAt: value.record.actualCheckInAt, actualCheckOutAt: value.record.actualCheckOutAt, guardianCareInstruction: value.record.guardianCareInstruction }
      : { dropOffWindow: value.record.dropOffWindow, pickupWindow: value.record.pickupWindow, checkedInAt: value.record.checkedInAt, activatedAt: value.record.activatedAt,
        readyForPickupAt: value.record.readyForPickupAt, checkedOutAt: value.record.checkedOutAt, completedAt: value.record.completedAt };
  return [executionId(value), r.businessId, r.branchId, r.bookingId, r.customerId, r.petId, value.kind, r.status, r.intakeId,
    start, end, r.businessNote, JSON.stringify({ ...details, serviceId: r.serviceId, serviceLabel: r.serviceLabel }), r.revision, writeToken, r.createdAt, r.updatedAt, r.cancelledAt];
}

export function decode(row: ExecutionRow, assignments: AssignmentRow[], events: EventRow[], tasks: TaskRow[]): ExecutionView {
  const details = JSON.parse(row.details_json);
  const common = {
    bookingId: row.booking_id, businessId: row.business_id, branchId: row.branch_id, customerId: row.customer_id, petId: row.pet_id,
    intakeId: row.intake_id, businessNote: row.business_note, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at, cancelledAt: row.cancelled_at,
    serviceId: details.serviceId ?? row.service_id, serviceLabel: details.serviceLabel ?? row.service_label,
    history: events.filter((e) => e.kind.startsWith("history:")).map((e) => ({ id: e.id, at: e.occurred_at, type: e.kind.slice(8), summary: e.summary })),
  };
  if (row.module === "grooming") {
    const addOns = events.filter((e) => e.kind === "addon").map((e) => JSON.parse(e.data_json)) as JobView["addOns"];
    return { kind: "grooming", record: {
      ...common, ...details, serviceJobId: row.id, serviceModule: "grooming", baseServiceId: common.serviceId,
      scheduledStart: row.scheduled_start, scheduledEnd: row.scheduled_end, status: row.status, addOns,
      estimatedDurationMinutes: Math.max(1, (Date.parse(`${row.scheduled_end}:00Z`) - Date.parse(`${row.scheduled_start}:00Z`)) / 60000) + addOns.reduce((n, a) => n + a.additionalMinutes, 0),
      assignedResourceIds: assignments.flatMap((a) => a.resource_id ? [a.resource_id] : []),
    } as JobView };
  }
  if (row.module === "hotel") {
    const incidentNotes = events.filter((e) => e.kind === "incident").map((e) => JSON.parse(e.data_json)) as StayView["incidentNotes"];
    for (const e of events.filter((e) => e.kind === "incident-resolved")) {
      const data = JSON.parse(e.data_json) as { id: string; resolvedAt: string; resolvedBy: string };
      const incident = incidentNotes.find((i) => i.id === data.id);
      if (incident) Object.assign(incident, data);
    }
    return { kind: "hotel", record: {
      ...common, ...details, hotelStayId: row.id, scheduledCheckIn: row.scheduled_start, scheduledCheckOut: row.scheduled_end!, status: row.status,
      roomAssignments: assignments.filter((a) => a.space_id).map((a) => ({ id: a.id, roomId: a.space_id!, startDate: a.start_local, endDate: a.end_local, assignedAt: a.assigned_at, assignedBy: a.assigned_by, reason: a.reason })),
      roomMoveHistory: events.filter((e) => e.kind === "room-move").map((e) => JSON.parse(e.data_json)), incidentNotes,
      dailyCareTasks: tasks.map((t) => ({ id: t.id, kind: t.kind, label: t.label, scheduledDate: t.scheduled_date, scheduledTime: t.scheduled_time,
        assignedStaffId: t.staff_id, state: t.completed_at ? "completed" : "pending", completedAt: t.completed_at, completedBy: t.completed_by,
        instructions: t.instructions, authorization: t.authorized_intake_id ? { source: "customer-confirmed-intake", intakeId: t.authorized_intake_id, confirmedAt: "" } : null })),
    } as StayView };
  }
  return { kind: "daycare", record: {
    ...common, ...details, daycareAttendanceId: row.id, attendanceDate: row.scheduled_start, status: row.status,
    zoneId: assignments.find((a) => a.resource_id)?.resource_id ?? null, responsibleStaffId: assignments.find((a) => a.staff_id)?.staff_id ?? null,
    careEvents: events.filter((e) => e.kind === "daycare-care").map((e) => JSON.parse(e.data_json)),
  } as AttendanceView };
}
