import type { AuthorizedMutation } from "../be1/repository";
import type {
  BookingCatalogView,
  BookingPage,
  BookingResourceView,
  BookingServiceView,
  BookingStatus,
  BookingView,
} from "./contracts";

export type BookingQuery = {
  businessId: string;
  branchIds: string[];
  customerId: string | null;
  rangeStartMinute: number | null;
  rangeEndMinute: number | null;
  modules: BookingView["serviceModule"][];
  statuses: BookingStatus[];
  resourceId: string | null;
  includeCancelled: boolean;
  limit: number;
  offset: number;
};

export type BookingReservationWrite = {
  resourceId: string;
  reservationKey: string;
  reservationDate: string | null;
  startMinute: number;
  endMinute: number;
  units: number;
};

export type BookingPersistenceWrite = {
  booking: BookingView;
  startMinute: number;
  endMinute: number;
  startWeekday: string;
  idempotencyKey: string | null;
  requestHash: string | null;
  reservations: BookingReservationWrite[];
};

export type IdempotencyRecord = {
  requestHash: string;
  bookingId: string;
};

export interface Be3Repository {
  ensureDefaultCatalog(catalog: BookingCatalogView, occurredAt: string, actorPersonId: string): Promise<void>;
  listServices(businessId: string, branchId: string): Promise<BookingServiceView[]>;
  getService(businessId: string, branchId: string, serviceId: string): Promise<BookingServiceView | null>;
  listResources(businessId: string, branchId: string, serviceId?: string): Promise<BookingResourceView[]>;
  getBooking(businessId: string, branchId: string, bookingId: string): Promise<BookingView | null>;
  listBookings(query: BookingQuery): Promise<BookingPage>;
  listOverlappingBookings(businessId: string, branchId: string, startMinute: number, endMinute: number, excludeBookingId?: string): Promise<BookingView[]>;
  findIdempotency(businessId: string, idempotencyKey: string): Promise<IdempotencyRecord | null>;
  createBooking(write: BookingPersistenceWrite, context: AuthorizedMutation): Promise<void>;
  replaceBooking(before: BookingView, write: BookingPersistenceWrite, action: string, context: AuthorizedMutation): Promise<"updated" | "version-conflict">;
}
