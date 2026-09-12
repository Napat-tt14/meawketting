import type { BookingView } from "../be3/contracts";
import type { ExecutionChange, ExecutionView, JobView, StayView, AttendanceView, ServiceRecordView } from "./contracts";
import type { PrototypeHotelCareTask, PrototypeServiceJobAddOn, PrototypeServiceRecord, PrototypeServiceRecordActivity } from "../../_prototype/businessState";
import { conflict } from "../shared/errors";
import { opaqueId } from "../shared/validation";

export function executionId(value: ExecutionView): string {
  return value.kind === "grooming" ? value.record.serviceJobId : value.kind === "hotel" ? value.record.hotelStayId : value.record.daycareAttendanceId;
}

export function createExecution(booking: BookingView, petId: string, id: string, now: string): ExecutionView {
  const common = {
    bookingId: booking.id, businessId: booking.businessId, branchId: booking.branchId, customerId: booking.customerId, petId,
    intakeId: null, businessNote: "", createdAt: now, updatedAt: now, cancelledAt: null, revision: 1, serviceId: booking.serviceId, serviceLabel: booking.serviceLabel,
    history: [{ id: opaqueId("evt"), at: now, type: "created" as const, summary: "สร้างงานจากการจอง" }],
  };
  if (booking.serviceModule === "grooming") return { kind: "grooming", record: {
    ...common, serviceJobId: id, serviceModule: "grooming", baseServiceId: booking.serviceId, status: "booked",
    scheduledStart: booking.start, scheduledEnd: booking.end,
    estimatedDurationMinutes: Math.max(1, Math.round((Date.parse(`${booking.end}:00Z`) - Date.parse(`${booking.start}:00Z`)) / 60000)),
    actualStartedAt: null, actualCompletedAt: null, assignedResourceIds: [...booking.assignedResourceIds], addOns: [],
  } };
  if (booking.serviceModule === "hotel") return { kind: "hotel", record: {
    ...common, hotelStayId: id, scheduledCheckIn: booking.start, scheduledCheckOut: booking.end!, actualCheckInAt: null,
    actualCheckOutAt: null, status: "booked", roomAssignments: [], roomMoveHistory: [], guardianCareInstruction: null, dailyCareTasks: [], incidentNotes: [],
  } };
  return { kind: "daycare", record: {
    ...common, daycareAttendanceId: id, attendanceDate: booking.start, dropOffWindow: "08:00–10:00", pickupWindow: "16:00–18:00",
    status: "booked", zoneId: booking.assignedResourceIds[0] ?? null, responsibleStaffId: null, checkedInAt: null, activatedAt: null,
    readyForPickupAt: null, checkedOutAt: null, completedAt: null, careEvents: [], businessNote: booking.notes,
  } };
}

const GROOMING_LABELS = { booked: "รอรับเข้า", "checked-in": "รับเข้าแล้ว", waiting: "รอเริ่ม", "in-service": "กำลังทำ", "ready-for-pickup": "พร้อมรับกลับ", completed: "เสร็จแล้ว", cancelled: "ยกเลิก" };
const HOTEL_LABELS = { booked: "จองไว้", "expected-today": "เข้าพักวันนี้", "checked-in": "เข้าพักแล้ว", "in-stay": "พักอยู่", "ready-for-checkout": "พร้อมรับกลับ", "checked-out": "เช็กเอาต์แล้ว", completed: "เสร็จสิ้น", cancelled: "ยกเลิก", "no-show": "ไม่มาตามนัด" };
const DAYCARE_LABELS = { booked: "ยังไม่มา", "checked-in": "รับเข้าแล้ว", active: "อยู่ใน Daycare", "ready-for-pickup": "พร้อมรับกลับ", "checked-out": "รับกลับแล้ว", completed: "เสร็จสิ้น", cancelled: "ยกเลิก" };
const HOTEL_NEXT: Record<StayView["status"], readonly StayView["status"][]> = {
  booked: ["expected-today", "checked-in", "cancelled", "no-show"], "expected-today": ["checked-in", "cancelled", "no-show"],
  "checked-in": ["in-stay", "ready-for-checkout", "cancelled"], "in-stay": ["ready-for-checkout", "cancelled"],
  "ready-for-checkout": ["checked-out", "cancelled"], "checked-out": ["completed"], completed: [], cancelled: [], "no-show": [],
};
const DAYCARE_NEXT: Record<AttendanceView["status"], readonly AttendanceView["status"][]> = {
  booked: ["checked-in", "cancelled"], "checked-in": ["active", "cancelled"], active: ["ready-for-pickup", "cancelled"],
  "ready-for-pickup": ["checked-out"], "checked-out": ["completed"], completed: [], cancelled: [],
};

export function defaultCareTasks(stayId: string, date: string): PrototypeHotelCareTask[] {
  return ([
    ["meal", "อาหารเช้า", "08:00"], ["water", "ตรวจน้ำ", "12:00"], ["activity", "เดินเล่น / กิจกรรม", "15:00"],
    ["meal", "อาหารเย็น", "18:00"], ["note", "บันทึกอัปเดตประจำวัน", "19:00"],
  ] as const).map(([kind, label, scheduledTime], index) => ({
    id: `${stayId}-care-${index}-${date}`, kind, label, scheduledDate: date, scheduledTime,
    assignedStaffId: null, state: "pending", completedAt: null, completedBy: null,
  }));
}

export function isCompleted(value: ExecutionView): boolean {
  return value.record.status === "completed" || (value.kind !== "grooming" && value.record.status === "checked-out");
}

/** Booking remains planning. Preserve actual assignments and terminal history. */
export function projectBooking(booking: BookingView, existing: ExecutionView[], now: string): { before: ExecutionView | null; after: ExecutionView }[] {
  const writes: { before: ExecutionView | null; after: ExecutionView }[] = [];
  for (const before of existing) {
    if (isCompleted(before) || ["cancelled", "no-show"].includes(before.record.status)) continue;
    const after = structuredClone(before);
    if (booking.status === "cancelled" || booking.serviceModule !== before.kind || !booking.pets.some((p) => p.id === before.record.petId)) {
      after.record.status = "cancelled"; after.record.cancelledAt = now;
      after.record.history.push({ id: opaqueId("evt"), at: now, type: "status", summary: "ยกเลิกตามการจอง" });
    } else {
      after.record.customerId = booking.customerId;
      after.record.serviceId = booking.serviceId; after.record.serviceLabel = booking.serviceLabel;
      if (after.kind === "grooming") {
        after.record.baseServiceId = booking.serviceId; after.record.scheduledStart = booking.start; after.record.scheduledEnd = booking.end;
        if (after.record.status === "booked") after.record.assignedResourceIds = [...booking.assignedResourceIds];
      }
      if (after.kind === "hotel" && before.kind === "hotel") {
        after.record.scheduledCheckIn = booking.start; after.record.scheduledCheckOut = booking.end!;
        after.record.roomAssignments = after.record.roomAssignments.map((a) => ({ ...a,
          startDate: a.startDate === before.record.scheduledCheckIn ? booking.start : a.startDate,
          endDate: (a.endDate ?? before.record.scheduledCheckOut) === before.record.scheduledCheckOut ? booking.end : a.endDate }));
      }
      if (after.kind === "daycare") after.record.attendanceDate = booking.start;
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      after.record.history.push({ id: opaqueId("evt"), at: now, type: "note", summary: "ปรับข้อมูลแผนงานจากการจอง" });
    }
    after.record.revision++; after.record.updatedAt = now; writes.push({ before, after });
  }
  if (booking.status !== "cancelled") for (const pet of booking.pets) {
    if (!existing.some((e) => e.kind === booking.serviceModule && e.record.petId === pet.id)) writes.push({ before: null, after: createExecution(booking, pet.id, opaqueId("execution"), now) });
  }
  return writes;
}

export function changeExecution(before: ExecutionView, change: ExecutionChange, now: string, actorId: string): ExecutionView {
  const next = structuredClone(before);
  const record = next.record;
  record.updatedAt = now; record.revision += 1;
  let summary = "";
  let eventType = "status";
  if (change.type === "note") {
    record.businessNote = change.note; summary = "อัปเดตหมายเหตุของร้าน"; eventType = "note";
  } else if (change.type === "transition") {
    const target = change.status;
    if (next.kind === "grooming") {
      const job = next.record;
      if (!(target in GROOMING_LABELS) || job.status === "cancelled" || (job.status === "completed" && target === "cancelled")) conflict("invalid-transition");
      if (target === "in-service") job.actualStartedAt ??= now;
      if (target === "completed") job.actualCompletedAt ??= now;
      else if (job.status === "completed") job.actualCompletedAt = null;
      job.status = target as JobView["status"]; summary = `เปลี่ยนสถานะเป็น ${GROOMING_LABELS[job.status]}`;
    } else if (next.kind === "hotel") {
      const stay = next.record;
      if (target !== stay.status && !HOTEL_NEXT[stay.status].includes(target as StayView["status"])) conflict("invalid-transition");
      if (target === "checked-in") {
        if (!stay.roomAssignments.some((a) => a.startDate <= stay.scheduledCheckIn && (a.endDate ?? stay.scheduledCheckOut) > stay.scheduledCheckIn)) conflict("room-required");
        stay.actualCheckInAt ??= now;
        if (!stay.dailyCareTasks.length) stay.dailyCareTasks = defaultCareTasks(stay.hotelStayId, stay.scheduledCheckIn);
      }
      if (target === "checked-out") {
        if (stay.dailyCareTasks.some((task) => task.scheduledDate <= stay.scheduledCheckOut && task.state !== "completed")) conflict("care-incomplete");
        stay.actualCheckOutAt ??= now;
      }
      stay.status = target as StayView["status"]; summary = `เปลี่ยนสถานะเป็น ${HOTEL_LABELS[stay.status]}`;
    } else {
      const attendance = next.record;
      if (target !== attendance.status && !DAYCARE_NEXT[attendance.status].includes(target as AttendanceView["status"])) conflict("invalid-transition");
      if ((target === "checked-in" || target === "active") && !attendance.zoneId) conflict("zone-required");
      if (target === "checked-in") attendance.checkedInAt ??= now;
      if (target === "active") attendance.activatedAt ??= now;
      if (target === "ready-for-pickup") attendance.readyForPickupAt ??= now;
      if (target === "checked-out") attendance.checkedOutAt ??= now;
      if (target === "completed") attendance.completedAt ??= now;
      attendance.status = target as AttendanceView["status"]; summary = `เปลี่ยนสถานะเป็น ${DAYCARE_LABELS[attendance.status]}`;
    }
    if (target === "cancelled") record.cancelledAt ??= now;
  } else if (change.type === "grooming-resources" && next.kind === "grooming") {
    next.record.assignedResourceIds = [...change.resourceIds]; eventType = "assignment"; summary = "อัปเดตทรัพยากรที่รับผิดชอบ";
  } else if (change.type === "hotel-room" && next.kind === "hotel") {
    const stay = next.record;
    const effective = change.effectiveDate ?? stay.scheduledCheckIn;
    if (effective < stay.scheduledCheckIn || effective >= stay.scheduledCheckOut || isCompleted(next) || ["cancelled", "no-show"].includes(stay.status)) conflict("invalid-transition");
    const current = stay.roomAssignments.find((a) => a.startDate <= effective && (a.endDate ?? stay.scheduledCheckOut) > effective);
    if (change.effectiveDate) {
      if (current) current.endDate = effective;
      stay.roomMoveHistory.push({ id: opaqueId("move"), movedAt: now, fromRoomId: current?.roomId ?? null, toRoomId: change.roomId, reason: change.reason || null });
      stay.roomAssignments = stay.roomAssignments.filter((a) => a.startDate < effective || a.id === current?.id);
    } else if (current) stay.roomAssignments = stay.roomAssignments.filter((a) => a.id !== current.id);
    stay.roomAssignments.push({ id: opaqueId("asn"), roomId: change.roomId, startDate: effective, endDate: stay.scheduledCheckOut, assignedAt: now, assignedBy: actorId, reason: change.reason || null });
    eventType = change.effectiveDate ? "room-move" : "room-assignment"; summary = change.effectiveDate ? "ย้ายห้องหรือโซนระหว่างเข้าพัก" : "ระบุห้องหรือโซนสำหรับการเข้าพัก";
  } else if ((change.type === "hotel-care-complete" || change.type === "hotel-care-staff") && next.kind === "hotel") {
    const task = next.record.dailyCareTasks.find((entry) => entry.id === change.taskId);
    if (!task) conflict("invalid-transition");
    if (change.type === "hotel-care-complete") {
      task.state = "completed"; task.completedAt ??= now; task.completedBy ??= actorId; eventType = "care"; summary = `ทำงานดูแล: ${task.label}`;
    } else { task.assignedStaffId = change.staffId; eventType = "care-assignment"; summary = "อัปเดตผู้รับผิดชอบงานดูแล"; }
  } else if (change.type === "hotel-incident" && next.kind === "hotel") {
    next.record.incidentNotes.push({ id: opaqueId("incident"), summary: change.summary, severity: change.severity, createdAt: now, createdBy: actorId, resolvedAt: null, resolvedBy: null });
    eventType = "incident"; summary = "เพิ่มบันทึกเหตุการณ์ของร้าน";
  } else if (change.type === "hotel-incident-resolve" && next.kind === "hotel") {
    const incident = next.record.incidentNotes.find((entry) => entry.id === change.incidentId);
    if (!incident) conflict("invalid-transition");
    incident.resolvedAt ??= now; incident.resolvedBy ??= actorId; eventType = "incident"; summary = "ติดตามเหตุการณ์เรียบร้อยแล้ว";
  } else if (change.type === "daycare-zone" && next.kind === "daycare") {
    next.record.zoneId = change.zoneId; eventType = "zone"; summary = "ย้ายโซนดูแลแล้ว";
  } else if (change.type === "daycare-staff" && next.kind === "daycare") {
    next.record.responsibleStaffId = change.staffId; eventType = "staff"; summary = "อัปเดตผู้รับผิดชอบ";
  } else if (change.type === "daycare-care" && next.kind === "daycare") {
    if (!["checked-in", "active", "ready-for-pickup"].includes(next.record.status)) conflict("invalid-transition");
    const label = { meal: "ให้อาหาร", water: "เติมน้ำ", activity: "กิจกรรม / เล่น", rest: "พักผ่อน", note: "บันทึกการดูแล" }[change.kind];
    next.record.careEvents.push({ id: opaqueId("care"), kind: change.kind, label, note: change.note || null, occurredAt: now, staffId: next.record.responsibleStaffId });
    eventType = "care"; summary = label;
  } else conflict("invalid-transition");
  record.history.push({ id: opaqueId("evt"), at: now, type: eventType, summary } as never);
  return next;
}

/** Only the verified approval application calls this; never a Business command. */
export function approvedAddOn(before: ExecutionView, addOn: PrototypeServiceJobAddOn, now: string): ExecutionView {
  if (before.kind !== "grooming" || before.record.status === "cancelled") conflict("invalid-transition");
  if (before.record.addOns.some((entry) => entry.sourceRequestId === addOn.sourceRequestId)) return before;
  const next = structuredClone(before);
  next.record.addOns.push(addOn); next.record.estimatedDurationMinutes += addOn.additionalMinutes;
  next.record.revision += 1; next.record.updatedAt = now;
  next.record.history.push({ id: opaqueId("evt"), at: now, type: "add-on", summary: `เจ้าของอนุมัติ ${addOn.label}` });
  return next;
}

export function serviceRecordFor(value: ExecutionView, labels: string[], now: string): ServiceRecordView {
  if (!isCompleted(value)) conflict("invalid-transition");
  const r = value.record;
  const activities: PrototypeServiceRecordActivity[] = [];
  if (value.kind === "grooming") for (const addon of value.record.addOns) activities.push({ id: addon.id, kind: "add-on", label: addon.label, occurredAt: addon.approvedAt, detail: `เพิ่มเวลา ${addon.additionalMinutes} นาที` });
  if (value.kind === "hotel") for (const task of value.record.dailyCareTasks) {
    if (task.state === "completed" && task.kind !== "medication" && task.kind !== "note") activities.push({ id: task.id, kind: "care", label: task.label, occurredAt: task.completedAt, detail: null });
  }
  if (value.kind === "daycare") for (const event of value.record.careEvents) {
    if (event.kind !== "note") activities.push({ id: event.id, kind: "care", label: event.label, occurredAt: event.occurredAt, detail: null });
  }
  const completedAt = value.kind === "grooming" ? value.record.actualCompletedAt! : value.kind === "hotel" ? value.record.actualCheckOutAt! : value.record.checkedOutAt!;
  const source: PrototypeServiceRecord["source"] = value.kind === "grooming" ? "grooming-job" : value.kind === "hotel" ? "hotel-stay" : "daycare-attendance";
  return {
    serviceRecordId: opaqueId("srv"), source, serviceJobId: value.kind === "grooming" ? executionId(value) : null,
    hotelStayId: value.kind === "hotel" ? executionId(value) : null, daycareAttendanceId: value.kind === "daycare" ? executionId(value) : null,
    bookingId: r.bookingId, businessId: r.businessId, branchId: r.branchId, customerId: r.customerId, petId: r.petId,
    serviceModule: value.kind, serviceLabel: r.serviceLabel, completedAt: completedAt || now, summary: `${r.serviceLabel} · เสร็จสิ้น`,
    details: [{ id: "service", label: "บริการ", value: r.serviceLabel },
      ...(value.kind === "grooming" ? [{ id: "duration", label: "ระยะเวลาโดยประมาณ", value: `${value.record.estimatedDurationMinutes} นาที` }]
        : value.kind === "hotel" ? [{ id: "stay-dates", label: "ช่วงเข้าพัก", value: `${value.record.scheduledCheckIn} – ${value.record.scheduledCheckOut}` }]
          : [{ id: "attendance-date", label: "วันที่ดูแล", value: value.record.attendanceDate }])], activities, staffResourceLabels: labels,
    businessNote: r.businessNote, photos: [], corrections: [], sourceRevisions: [],
    handover: { status: "pending", handedOverAt: null, handedOverBy: null, note: "", paymentStatusAtHandover: null, history: [] },
    createdAt: now, updatedAt: now, revision: 1,
  };
}
