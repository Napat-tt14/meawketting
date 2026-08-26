import type { PrototypeBooking, PrototypeBookingDraft } from "../../_prototype/businessState";
import { addCalendarDays, calendarDayDistance } from "./calendarPresentation";

export type CalendarDragOperation = "move" | "resize-start" | "resize-end";

export type BookingDropTarget = {
  date: string;
  time?: string;
};

export function bookingDropTargetKey(target: BookingDropTarget) {
  return `${target.date}${target.time ? `T${target.time}` : ""}`;
}

export function bookingDraftFromPrototype(booking: PrototypeBooking): PrototypeBookingDraft {
  const start = booking.timeModel === "appointment" ? booking.start.slice(0, 16) : booking.start.slice(0, 10);
  const end = booking.timeModel === "appointment"
    ? booking.end?.slice(0, 16) ?? ""
    : booking.timeModel === "date-range"
      ? booking.end?.slice(0, 10) ?? ""
      : "";

  return {
    bookingId: booking.bookingId,
    businessId: booking.businessId,
    branchId: booking.branchId,
    serviceModule: booking.serviceModule,
    serviceId: booking.service.id,
    timeModel: booking.timeModel,
    customer: { ...booking.customer },
    pets: booking.pets.map((pet) => ({ ...pet })),
    start,
    end,
    assignedResourceIds: [...booking.assignedResources],
    notes: booking.notes,
    estimate: booking.estimate,
    status: booking.status,
  };
}

function dateTimeTimestamp(value: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00Z` : "";
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function dateTimeValue(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}T${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function appointmentDuration(booking: PrototypeBooking) {
  const start = dateTimeTimestamp(booking.start);
  const end = booking.end ? dateTimeTimestamp(booking.end) : null;
  return start !== null && end !== null && end > start ? end - start : 60 * 60_000;
}

function appointmentTarget(booking: PrototypeBooking, target: BookingDropTarget) {
  const currentTime = booking.start.slice(11, 16) || "09:00";
  return `${target.date}T${target.time ?? currentTime}`;
}

export function buildBookingMutationDraft(
  booking: PrototypeBooking,
  operation: CalendarDragOperation,
  target: BookingDropTarget,
) {
  const draft = bookingDraftFromPrototype(booking);

  if (booking.timeModel === "appointment") {
    const nextValue = appointmentTarget(booking, target);
    if (operation === "resize-start") return { ...draft, start: nextValue };
    if (operation === "resize-end") return { ...draft, end: nextValue };
    const start = dateTimeTimestamp(nextValue);
    return start === null
      ? { ...draft, start: nextValue }
      : { ...draft, start: nextValue, end: dateTimeValue(start + appointmentDuration(booking)) };
  }

  if (booking.timeModel === "date-range") {
    if (operation === "resize-start") return { ...draft, start: target.date };
    // Calendar date cells represent occupied nights while `end` is the
    // exclusive check-out date. Dropping the trailing edge on a date should
    // therefore keep that date in the stay and check out on the next day.
    if (operation === "resize-end") return { ...draft, end: addCalendarDays(target.date, 1) };
    const nights = Math.max(1, booking.end ? calendarDayDistance(booking.start, booking.end) : 1);
    return { ...draft, start: target.date, end: addCalendarDays(target.date, nights) };
  }

  return { ...draft, start: target.date, end: "" };
}

export function buildBookingCopyDraft(booking: PrototypeBooking, target: BookingDropTarget) {
  return {
    ...buildBookingMutationDraft(booking, "move", target),
    bookingId: undefined,
  } satisfies PrototypeBookingDraft;
}
