import type { Be1LifecycleStatus, Be1ServiceModule } from "../be1/contracts";
import type { PetSpecies } from "../be2/contracts";

export const BE3_API_PATH = "/api/be3" as const;

export type BookingTimeModel = "appointment" | "date-range" | "day";
export type BookingStatus = "pending" | "confirmed" | "arrived" | "cancelled";
export type BookingResourceKind = "groomer" | "grooming-station" | "dryer" | "hotel-room-type" | "daycare-zone";
export type BookingResourceCapacityMode = "exclusive" | "capacity";
export type BookingResourceAvailabilityState = "working" | "unavailable" | "break" | "time-off";

export type BookingPetView = {
  id: string;
  name: string;
  species: PetSpecies;
};

export type BookingServiceView = {
  id: string;
  businessId: string;
  branchId: string;
  module: Be1ServiceModule;
  label: string;
  timeModel: BookingTimeModel;
  defaultDurationMinutes: number | null;
  estimate: number | null;
  requiredResourceKinds: BookingResourceKind[];
  status: Be1LifecycleStatus;
};

export type BookingResourceAvailabilityWindow = {
  id: string;
  state: BookingResourceAvailabilityState;
  start: string;
  end: string;
};

export type BookingResourceView = {
  id: string;
  businessId: string;
  branchId: string;
  module: Be1ServiceModule;
  kind: BookingResourceKind;
  label: string;
  capacityMode: BookingResourceCapacityMode;
  capacity: number;
  serviceIds: string[];
  /** Opaque compatibility link only; this is not Person, Membership, or Team truth. */
  compatibilityStaffId: string | null;
  /** Only planning-capacity is durable in BE3. Room/zone assignment remains BE4-local. */
  hotelRole: "planning-capacity" | null;
  availability: BookingResourceAvailabilityWindow[];
  status: Be1LifecycleStatus;
};

export type BookingCatalogView = {
  businessId: string;
  branchId: string;
  services: BookingServiceView[];
  resources: BookingResourceView[];
};

export type BookingView = {
  id: string;
  businessId: string;
  branchId: string;
  customerId: string;
  /** Composed from the current BE2 Customer row; never stored on Booking. */
  customerName: string;
  /** Composed from current BE2 profiles through durable booking_pet links. */
  pets: BookingPetView[];
  serviceId: string;
  /** Composed from the current planning Service row; never stored on Booking. */
  serviceLabel: string;
  serviceModule: Be1ServiceModule;
  timeModel: BookingTimeModel;
  /** Branch-local ISO-like value. Appointment: YYYY-MM-DDTHH:mm; otherwise YYYY-MM-DD. */
  start: string;
  /** Exclusive appointment/range end. Day bookings use null. */
  end: string | null;
  requiredResourceKinds: BookingResourceKind[];
  assignedResourceIds: string[];
  status: BookingStatus;
  estimate: number | null;
  notes: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};

export type BookingPage = {
  items: BookingView[];
  total: number;
  limit: number;
  offset: number;
};

export type BookingConflictCode =
  | "BRANCH_INACTIVE"
  | "BRANCH_CLOSED"
  | "OUTSIDE_OPERATING_HOURS"
  | "MODULE_DISABLED"
  | "SERVICE_UNAVAILABLE"
  | "CUSTOMER_UNAVAILABLE"
  | "PET_UNAVAILABLE"
  | "CUSTOMER_PET_RELATIONSHIP_MISSING"
  | "INVALID_TIME"
  | "MISSING_RESOURCE"
  | "RESOURCE_UNAVAILABLE"
  | "STAFF_UNAVAILABLE"
  | "TIME_CONFLICT"
  | "CAPACITY_CONFLICT"
  | "DUPLICATE_BOOKING"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_KEY_REUSED";

export type BookingConflictRecovery = "change-time" | "change-resource" | "change-date" | "return-to-edit" | "reload";

export type BookingConflict = {
  code: BookingConflictCode;
  message: string;
  recovery: BookingConflictRecovery;
  resourceId?: string;
  resourceKind?: BookingResourceKind;
  bookingIds?: string[];
  dates?: string[];
};

export type BookingAvailability = {
  available: boolean;
  conflicts: BookingConflict[];
};

export type BookingListInput = {
  businessId: string;
  branchId?: string;
  customerId?: string;
  rangeStart?: string;
  rangeEnd?: string;
  modules?: Be1ServiceModule[];
  statuses?: BookingStatus[];
  resourceId?: string;
  includeCancelled?: boolean;
  limit?: number;
  offset?: number;
};

export type BookingAvailabilityInput = {
  businessId: string;
  branchId: string;
  bookingId?: string;
  serviceId: string;
  customerId: string;
  petIds: string[];
  start: string;
  end: string | null;
  assignedResourceIds: string[];
  status: BookingStatus;
};

export type CreateBookingInput = Omit<BookingAvailabilityInput, "bookingId"> & {
  estimate: number | null;
  notes: string;
  idempotencyKey: string;
};

export type UpdateBookingInput = Omit<CreateBookingInput, "idempotencyKey"> & {
  bookingId: string;
  expectedRevision: number;
};

export type RescheduleBookingInput = {
  businessId: string;
  branchId: string;
  bookingId: string;
  expectedRevision: number;
  start: string;
  end: string | null;
};

export type AssignBookingResourcesInput = {
  businessId: string;
  branchId: string;
  bookingId: string;
  expectedRevision: number;
  assignedResourceIds: string[];
};

export type CancelBookingInput = {
  businessId: string;
  branchId: string;
  bookingId: string;
  expectedRevision: number;
};

export type BookingMutationResult =
  | { outcome: "created" | "updated" | "cancelled" | "replayed"; booking: BookingView }
  | { outcome: "conflict"; availability: BookingAvailability; current: BookingView | null };

export type Be3ApiOperation =
  | { type: "booking.catalog"; businessId: string; branchId: string }
  | { type: "booking.list"; input: BookingListInput }
  | { type: "booking.get"; businessId: string; branchId: string; bookingId: string }
  | { type: "booking.availability"; input: BookingAvailabilityInput }
  | { type: "booking.create"; input: CreateBookingInput }
  | { type: "booking.update"; input: UpdateBookingInput }
  | { type: "booking.reschedule"; input: RescheduleBookingInput }
  | { type: "booking.assign-resources"; input: AssignBookingResourcesInput }
  | { type: "booking.cancel"; input: CancelBookingInput };

export type Be3OperationResult<T extends Be3ApiOperation> =
  T["type"] extends "booking.catalog" ? BookingCatalogView
    : T["type"] extends "booking.list" ? BookingPage
      : T["type"] extends "booking.get" ? BookingView
        : T["type"] extends "booking.availability" ? BookingAvailability
          : T["type"] extends "booking.create" | "booking.update" | "booking.reschedule" | "booking.assign-resources" | "booking.cancel" ? BookingMutationResult
            : never;
