import {
  BE1_DEV_ACTOR_HEADER,
  BE1_DEV_OWNER_PERSON_ID,
  type Be1ApiResponse,
} from "../be1/contracts";
import { Be1ClientError } from "../be1/client";
import { ensureDurableOperations } from "../be4/client";
import {
  BE3_API_PATH,
  type AssignBookingResourcesInput,
  type Be3ApiOperation,
  type Be3OperationResult,
  type BookingAvailabilityInput,
  type BookingCatalogView,
  type BookingListInput,
  type BookingMutationResult,
  type BookingView,
  type CancelBookingInput,
  type CreateBookingInput,
  type RescheduleBookingInput,
  type UpdateBookingInput,
} from "./contracts";
import {
  installBe3Catalog,
  installBe3Directory,
  markBe3CatalogError,
  markBe3CatalogLoading,
  markBe3DirectoryError,
  markBe3DirectoryLoading,
  patchBe3Booking,
  readBe3Catalog,
  readBe3CatalogStatus,
  readBe3DirectoryStatus,
} from "./bookingCache";

async function requestBe3<T extends Be3ApiOperation>(operation: T): Promise<Be3OperationResult<T>> {
  const headers = new Headers({
    "content-type": "application/json",
    "x-correlation-id": crypto.randomUUID(),
  });
  // Explicit local adapter only. The server accepts this identity solely when
  // its own environment is configured as `dev-test`.
  if (process.env.NODE_ENV !== "production") headers.set(BE1_DEV_ACTOR_HEADER, BE1_DEV_OWNER_PERSON_ID);
  const response = await fetch(BE3_API_PATH, {
    method: "POST",
    headers,
    body: JSON.stringify(operation),
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await response.json() as Be1ApiResponse<Be3OperationResult<T>>;
  if (!payload.ok) throw new Be1ClientError(payload.error.code, payload.error.message);
  return payload.data;
}

const directoryRequests = new Map<string, Promise<void>>();
const catalogRequests = new Map<string, Promise<BookingCatalogView>>();
const businessRequestQueues = new Map<string, Promise<void>>();

function catalogKey(businessId: string, branchId: string) {
  return `${businessId}\u0000${branchId}`;
}

/**
 * Keep reads, all-page hydration, and mutations ordered per Business. This
 * prevents an older response from overwriting a newer authoritative mutation
 * in the synchronous compatibility cache. Separate Businesses remain
 * independent.
 */
function enqueueBusinessRequest<T>(businessId: string, task: () => Promise<T>): Promise<T> {
  const previous = businessRequestQueues.get(businessId) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(task);
  const tail = result.then(() => undefined, () => undefined);
  businessRequestQueues.set(businessId, tail);
  void tail.finally(() => {
    if (businessRequestQueues.get(businessId) === tail) businessRequestQueues.delete(businessId);
  });
  return result;
}

/** Stable for one submission/retry chain; callers must retain and reuse it. */
export function createBookingIdempotencyKey() {
  return `be3-create-${crypto.randomUUID()}`;
}

export function ensureDurableBookingCatalog(businessId: string, branchId: string, force = false) {
  const cached = readBe3Catalog(businessId, branchId);
  if (!force && readBe3CatalogStatus(businessId, branchId) === "ready" && cached) return Promise.resolve(cached);
  const key = catalogKey(businessId, branchId);
  const pending = catalogRequests.get(key);
  if (pending) return pending;
  markBe3CatalogLoading(businessId, branchId);
  const request = enqueueBusinessRequest(businessId, async () => {
    const catalog = await requestBe3({ type: "booking.catalog", businessId, branchId });
    installBe3Catalog(businessId, branchId, catalog);
    return catalog;
  })
    .catch((error) => {
      markBe3CatalogError(businessId, branchId, error);
      throw error;
    })
    .finally(() => {
      catalogRequests.delete(key);
    });
  catalogRequests.set(key, request);
  return request;
}

/**
 * Hydrates the complete set of permitted Branch Bookings for one Business.
 * Filtered/ranged list calls only patch known records and never mark this
 * directory complete.
 */
export function ensureDurableBookingDirectory(businessId: string, force = false) {
  if (!force && readBe3DirectoryStatus(businessId) === "ready") return Promise.resolve();
  const pending = directoryRequests.get(businessId);
  if (pending) return pending;
  markBe3DirectoryLoading(businessId);
  const request = enqueueBusinessRequest(businessId, async () => {
    const bookings = new Map<string, BookingView>();
    let offset = 0;
    let pageCount = 0;
    while (true) {
      const page = await requestBe3({
        type: "booking.list",
        input: { businessId, includeCancelled: true, limit: 100, offset },
      });
      if (page.offset !== offset) throw new Error("BE3 directory pagination returned an unexpected offset.");
      for (const booking of page.items) bookings.set(booking.id, booking);
      offset += page.items.length;
      pageCount += 1;
      if (offset >= page.total) break;
      if (page.items.length === 0 || pageCount >= 10_000) {
        throw new Error("BE3 directory pagination did not make progress.");
      }
    }
    installBe3Directory(businessId, [...bookings.values()]);
  })
    .catch((error) => {
      markBe3DirectoryError(businessId, error);
      throw error;
    })
    .finally(() => {
      directoryRequests.delete(businessId);
    });
  directoryRequests.set(businessId, request);
  return request;
}

export function queryDurableBookings(input: BookingListInput) {
  return enqueueBusinessRequest(input.businessId, async () => {
    const page = await requestBe3({ type: "booking.list", input });
    page.items.forEach(patchBe3Booking);
    return page;
  });
}

export function getDurableBooking(businessId: string, branchId: string, bookingId: string) {
  return enqueueBusinessRequest(businessId, async () => {
    const booking = await requestBe3({ type: "booking.get", businessId, branchId, bookingId });
    patchBe3Booking(booking);
    return booking;
  });
}

export function checkDurableBookingAvailability(input: BookingAvailabilityInput) {
  return enqueueBusinessRequest(input.businessId, () => requestBe3({ type: "booking.availability", input }));
}

async function patchMutationResult(result: BookingMutationResult) {
  if (result.outcome === "conflict") {
    if (result.current) patchBe3Booking(result.current);
  } else {
    patchBe3Booking(result.booking);
    try { await ensureDurableOperations(result.booking.businessId, result.booking.branchId, true); } catch { /* The atomic Booking/execution commit has already succeeded. */ }
  }
  return result;
}

export function createDurableBooking(input: CreateBookingInput) {
  return enqueueBusinessRequest(input.businessId, async () => (
    patchMutationResult(await requestBe3({ type: "booking.create", input }))
  ));
}

export function updateDurableBooking(input: UpdateBookingInput) {
  return enqueueBusinessRequest(input.businessId, async () => (
    patchMutationResult(await requestBe3({ type: "booking.update", input }))
  ));
}

export function rescheduleDurableBooking(input: RescheduleBookingInput) {
  return enqueueBusinessRequest(input.businessId, async () => (
    patchMutationResult(await requestBe3({ type: "booking.reschedule", input }))
  ));
}

export function assignDurableBookingResources(input: AssignBookingResourcesInput) {
  return enqueueBusinessRequest(input.businessId, async () => (
    patchMutationResult(await requestBe3({ type: "booking.assign-resources", input }))
  ));
}

export function cancelDurableBooking(input: CancelBookingInput) {
  return enqueueBusinessRequest(input.businessId, async () => (
    patchMutationResult(await requestBe3({ type: "booking.cancel", input }))
  ));
}
