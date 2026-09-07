import { be1Error } from "../be1/errors";
import type { Be1ServiceModule, Be1Weekday } from "../be1/contracts";
import { validateId } from "../be1/validation";
import type {
  AssignBookingResourcesInput,
  Be3ApiOperation,
  BookingAvailabilityInput,
  BookingListInput,
  BookingResourceKind,
  BookingStatus,
  BookingTimeModel,
  CancelBookingInput,
  CreateBookingInput,
  RescheduleBookingInput,
  UpdateBookingInput,
} from "./contracts";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;
const MAX_BOOKING_MINUTES = 370 * DAY_MINUTES;
const WEEKDAYS: readonly Be1Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw be1Error("INVALID_INPUT");
  return value as Record<string, unknown>;
}

function stringField(value: unknown, maximum: number, required = false) {
  if (typeof value !== "string") throw be1Error("INVALID_INPUT");
  const normalized = value.normalize("NFKC").trim();
  if ((required && !normalized) || normalized.length > maximum) throw be1Error("INVALID_INPUT");
  return normalized;
}

function integerField(value: unknown, fallback: number, minimum: number, maximum: number) {
  const candidate = value === undefined ? fallback : value;
  if (typeof candidate !== "number" || !Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw be1Error("INVALID_INPUT");
  }
  return candidate;
}

function booleanField(value: unknown, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw be1Error("INVALID_INPUT");
  return value;
}

function optionalId(value: unknown) {
  return value === undefined ? undefined : validateId(value);
}

function idList(value: unknown, maximum = 24) {
  if (!Array.isArray(value) || value.length > maximum) throw be1Error("INVALID_INPUT");
  return [...new Set(value.map(validateId))];
}

function status(value: unknown): BookingStatus {
  if (value !== "pending" && value !== "confirmed" && value !== "arrived" && value !== "cancelled") throw be1Error("INVALID_INPUT");
  return value;
}

function moduleValue(value: unknown): Be1ServiceModule {
  if (value !== "grooming" && value !== "hotel" && value !== "daycare") throw be1Error("INVALID_INPUT");
  return value;
}

function optionalArray<T>(value: unknown, parser: (entry: unknown) => T, maximum = 8) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum) throw be1Error("INVALID_INPUT");
  return [...new Set(value.map(parser))];
}

function nullableEnd(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return stringField(value, 16, true);
}

function estimate(value: unknown) {
  if (value === null || value === undefined) return null;
  return integerField(value, 0, 0, 1_000_000);
}

function timestampFromParts(year: number, month: number, day: number, hour = 0, minute = 0) {
  const timestamp = Date.UTC(year, month - 1, day, hour, minute);
  const checked = new Date(timestamp);
  return checked.getUTCFullYear() === year
    && checked.getUTCMonth() === month - 1
    && checked.getUTCDate() === day
    && checked.getUTCHours() === hour
    && checked.getUTCMinutes() === minute
    ? timestamp
    : null;
}

export function localValueMinute(value: string) {
  const dateTime = value.match(DATETIME_PATTERN);
  if (dateTime) {
    const timestamp = timestampFromParts(Number(dateTime[1]), Number(dateTime[2]), Number(dateTime[3]), Number(dateTime[4]), Number(dateTime[5]));
    return timestamp === null ? null : timestamp / MINUTE;
  }
  const date = value.match(DATE_PATTERN);
  if (!date) return null;
  const timestamp = timestampFromParts(Number(date[1]), Number(date[2]), Number(date[3]));
  return timestamp === null ? null : timestamp / MINUTE;
}

export function bookingInterval(timeModel: BookingTimeModel, start: string, end: string | null) {
  const startMinute = localValueMinute(start);
  if (startMinute === null) return null;
  if (timeModel === "day") return DATE_PATTERN.test(start) && end === null
    ? { startMinute, endMinute: startMinute + DAY_MINUTES }
    : null;
  const endMinute = end === null ? null : localValueMinute(end);
  const expected = timeModel === "appointment" ? DATETIME_PATTERN : DATE_PATTERN;
  return expected.test(start) && end !== null && expected.test(end) && endMinute !== null
    && endMinute > startMinute && endMinute - startMinute <= MAX_BOOKING_MINUTES
    ? { startMinute, endMinute }
    : null;
}

export function weekdayForLocalValue(value: string): Be1Weekday | null {
  const minute = localValueMinute(value.slice(0, 10));
  return minute === null ? null : WEEKDAYS[new Date(minute * MINUTE).getUTCDay()] ?? null;
}

export function calendarDateFromMinute(minute: number) {
  const date = new Date(minute * MINUTE);
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

export function occupiedCalendarDates(startMinute: number, endMinute: number) {
  const dates: string[] = [];
  const firstDay = Math.floor(startMinute / DAY_MINUTES) * DAY_MINUTES;
  for (let day = firstDay; day < endMinute; day += DAY_MINUTES) {
    if (startMinute < day + DAY_MINUTES && endMinute > day) dates.push(calendarDateFromMinute(day));
  }
  return dates;
}

export function validateBookingListInput(value: unknown): Required<Omit<BookingListInput, "branchId" | "customerId" | "rangeStart" | "rangeEnd" | "resourceId">> & {
  branchId?: string;
  customerId?: string;
  rangeStart?: string;
  rangeEnd?: string;
  resourceId?: string;
} {
  const input = record(value);
  const rangeStart = input.rangeStart === undefined ? undefined : stringField(input.rangeStart, 16, true);
  const rangeEnd = input.rangeEnd === undefined ? undefined : stringField(input.rangeEnd, 16, true);
  if ((rangeStart === undefined) !== (rangeEnd === undefined)) throw be1Error("INVALID_INPUT");
  if (rangeStart !== undefined && rangeEnd !== undefined) {
    const startMinute = localValueMinute(rangeStart);
    const endMinute = localValueMinute(rangeEnd);
    if (startMinute === null || endMinute === null || endMinute <= startMinute || endMinute - startMinute > 370 * DAY_MINUTES) {
      throw be1Error("INVALID_INPUT");
    }
  }
  return {
    businessId: validateId(input.businessId),
    branchId: optionalId(input.branchId),
    customerId: optionalId(input.customerId),
    rangeStart,
    rangeEnd,
    modules: optionalArray(input.modules, moduleValue, 3),
    statuses: optionalArray(input.statuses, status, 4),
    resourceId: optionalId(input.resourceId),
    includeCancelled: booleanField(input.includeCancelled),
    limit: integerField(input.limit, 100, 1, 100),
    offset: integerField(input.offset, 0, 0, 1_000_000),
  };
}

export function validateBookingAvailabilityInput(value: unknown): BookingAvailabilityInput {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    branchId: validateId(input.branchId),
    bookingId: optionalId(input.bookingId),
    serviceId: validateId(input.serviceId),
    customerId: validateId(input.customerId),
    petIds: idList(input.petIds),
    start: stringField(input.start, 16, true),
    end: nullableEnd(input.end),
    assignedResourceIds: idList(input.assignedResourceIds, 12),
    status: status(input.status),
  };
}

export function validateCreateBookingInput(value: unknown): CreateBookingInput {
  const input = record(value);
  const base = validateBookingAvailabilityInput(input);
  const idempotencyKey = stringField(input.idempotencyKey, 160, true);
  if (idempotencyKey.length < 8) throw be1Error("INVALID_INPUT");
  return {
    businessId: base.businessId,
    branchId: base.branchId,
    serviceId: base.serviceId,
    customerId: base.customerId,
    petIds: base.petIds,
    start: base.start,
    end: base.end,
    assignedResourceIds: base.assignedResourceIds,
    status: base.status,
    estimate: estimate(input.estimate),
    notes: stringField(input.notes, 4_000),
    idempotencyKey,
  };
}

export function validateUpdateBookingInput(value: unknown): UpdateBookingInput {
  const input = record(value);
  const base = validateBookingAvailabilityInput(input);
  return {
    ...base,
    bookingId: validateId(input.bookingId),
    expectedRevision: integerField(input.expectedRevision, 0, 1, 2_147_483_647),
    estimate: estimate(input.estimate),
    notes: stringField(input.notes, 4_000),
  };
}

export function validateRescheduleBookingInput(value: unknown): RescheduleBookingInput {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    branchId: validateId(input.branchId),
    bookingId: validateId(input.bookingId),
    expectedRevision: integerField(input.expectedRevision, 0, 1, 2_147_483_647),
    start: stringField(input.start, 16, true),
    end: nullableEnd(input.end),
  };
}

export function validateAssignBookingResourcesInput(value: unknown): AssignBookingResourcesInput {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    branchId: validateId(input.branchId),
    bookingId: validateId(input.bookingId),
    expectedRevision: integerField(input.expectedRevision, 0, 1, 2_147_483_647),
    assignedResourceIds: idList(input.assignedResourceIds, 12),
  };
}

export function validateCancelBookingInput(value: unknown): CancelBookingInput {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    branchId: validateId(input.branchId),
    bookingId: validateId(input.bookingId),
    expectedRevision: integerField(input.expectedRevision, 0, 1, 2_147_483_647),
  };
}

export function parseBe3Operation(value: unknown): Be3ApiOperation {
  const operation = record(value);
  switch (operation.type) {
    case "booking.catalog":
      return { type: operation.type, businessId: validateId(operation.businessId), branchId: validateId(operation.branchId) };
    case "booking.list":
      return { type: operation.type, input: validateBookingListInput(operation.input) };
    case "booking.get":
      return { type: operation.type, businessId: validateId(operation.businessId), branchId: validateId(operation.branchId), bookingId: validateId(operation.bookingId) };
    case "booking.availability":
      return { type: operation.type, input: validateBookingAvailabilityInput(operation.input) };
    case "booking.create":
      return { type: operation.type, input: validateCreateBookingInput(operation.input) };
    case "booking.update":
      return { type: operation.type, input: validateUpdateBookingInput(operation.input) };
    case "booking.reschedule":
      return { type: operation.type, input: validateRescheduleBookingInput(operation.input) };
    case "booking.assign-resources":
      return { type: operation.type, input: validateAssignBookingResourcesInput(operation.input) };
    case "booking.cancel":
      return { type: operation.type, input: validateCancelBookingInput(operation.input) };
    default:
      throw be1Error("INVALID_INPUT");
  }
}

export function isBookingResourceKind(value: string): value is BookingResourceKind {
  return value === "groomer" || value === "grooming-station" || value === "dryer" || value === "hotel-room-type" || value === "daycare-zone";
}
