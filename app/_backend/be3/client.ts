import { invalidateBusinessData } from "../shared/client";
import {
  BE1_DEV_ACTOR_HEADER,
  BE1_DEV_OWNER_PERSON_ID,
  type Be1ApiResponse,
} from "../be1/contracts";
import { Be1ClientError } from "../be1/client";
import { refreshBookingOperations } from "../be4/client";
import { clearBusinessSession, readBusinessSession } from "../be1/configurationCache";
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
  readBe3Booking,
  be3ScopeKey,
} from "./bookingCache";

async function requestBe3<T extends Be3ApiOperation>(operation: T, signal?: AbortSignal): Promise<Be3OperationResult<T>> {
  signal?.throwIfAborted();
  const session = readBusinessSession();
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
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
  });
  const payload = await response.json() as Be1ApiResponse<Be3OperationResult<T>>;
  if (!payload.ok) throw new Be1ClientError(payload.error.code, payload.error.message);
  signal?.throwIfAborted();
  if (["booking.list", "booking.get", "booking.catalog", "booking.availability"].includes(operation.type) && session !== readBusinessSession()) throw new DOMException("Booking scope changed", "AbortError");
  const actor = response.headers.get("x-meawketting-person-id");
  if (["booking.list", "booking.get", "booking.catalog", "booking.availability"].includes(operation.type) && actor && actor !== session?.person.id) { clearBusinessSession(); throw new Be1ClientError("FORBIDDEN", "กรุณายืนยันบัญชีอีกครั้ง"); }
  return payload.data;
}

const directoryRequests = new Map<string, Promise<void>>();
const catalogRequests = new Map<string, Promise<BookingCatalogView>>();
const businessRequestQueues = new Map<string, Promise<void>>();

function catalogKey(businessId: string, branchId: string) {
  return `${be3ScopeKey(businessId)}\u0000${branchId}`;
}

/**
 * Keep reads, all-page hydration, and mutations ordered per Business. This
 * prevents an older response from overwriting a newer authoritative mutation
 * in the synchronous compatibility cache. Separate Businesses remain
 * independent.
 */
function enqueueBusinessRequest<T>(businessId: string, task: () => Promise<T>): Promise<T> {
  const scope = be3ScopeKey(businessId);
  const previous = businessRequestQueues.get(scope) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(task);
  const tail = result.then(() => undefined, () => undefined);
  businessRequestQueues.set(scope, tail);
  void tail.finally(() => {
    if (businessRequestQueues.get(scope) === tail) businessRequestQueues.delete(scope);
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
  const scope = be3ScopeKey(businessId);
  const pending = directoryRequests.get(scope);
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
      if (page.offset !== offset || !Number.isSafeInteger(page.total) || page.total < 0 || page.items.length > 100
        || new Set(page.items.map(b => b.id)).size !== page.items.length || page.items.some(b => bookings.has(b.id))) throw new Error("BE3 directory pagination returned an unexpected page.");
      for (const booking of page.items) bookings.set(booking.id, booking);
      offset += page.items.length;
      pageCount += 1;
      if (offset >= page.total) break;
      if (page.items.length === 0 || pageCount >= 10_000) {
        throw new Error("BE3 directory pagination did not make progress.");
      }
    }
    if (scope !== be3ScopeKey(businessId)) throw new DOMException("Booking scope changed", "AbortError");
    installBe3Directory(businessId, [...bookings.values()]);
  })
    .catch((error) => {
      markBe3DirectoryError(businessId, error);
      throw error;
    })
    .finally(() => {
      directoryRequests.delete(scope);
    });
  directoryRequests.set(scope, request);
  return request;
}

export async function queryDurableBookings(input: BookingListInput, signal?: AbortSignal) {
    const page = await requestBe3({ type: "booking.list", input }, signal);
    if (page.offset !== (input.offset ?? 0) || !Number.isSafeInteger(page.total) || page.total < 0 || (page.items.length === 0 && page.offset < page.total)
      || page.items.length > (input.limit ?? 100) || new Set(page.items.map(b => b.id)).size !== page.items.length
      || page.items.some(b => b.businessId !== input.businessId || (input.branchId && b.branchId !== input.branchId))) throw new Error("Booking pagination made no progress");
    page.items.forEach(patchBe3Booking);
    return page;
}

export async function getDurableBooking(businessId: string, branchId: string, bookingId: string, signal?: AbortSignal) {
    const booking = await requestBe3({ type: "booking.get", businessId, branchId, bookingId }, signal);
    patchBe3Booking(booking);
    return booking;
}

export function checkDurableBookingAvailability(input: BookingAvailabilityInput) {
  return enqueueBusinessRequest(input.businessId, () => requestBe3({ type: "booking.availability", input }));
}

async function patchMutationResult(result: BookingMutationResult, scope: string) {
  const businessId = result.outcome === "conflict" ? result.current?.businessId : result.booking.businessId;
  if (businessId && scope !== be3ScopeKey(businessId)) return result;
  if (result.outcome === "conflict") {
    if (result.current) patchBe3Booking(result.current);
  } else {
    const previous = readBe3Booking(result.booking.businessId, result.booking.id), booking = result.booking;
    const samePlanning = previous && JSON.stringify([previous.customerId, previous.pets.map(p => p.id), previous.serviceId, previous.start, previous.end, previous.status, previous.assignedResourceIds])
      === JSON.stringify([booking.customerId, booking.pets.map(p => p.id), booking.serviceId, booking.start, booking.end, booking.status, booking.assignedResourceIds]);
    patchBe3Booking(result.booking);
    try { await refreshBookingOperations(result.booking.businessId, result.booking.branchId, result.booking.id); } catch { /* The atomic Booking/execution commit has already succeeded. */ }
    invalidateBusinessData(result.booking.businessId, samePlanning ? ["booking", "operations", "crm"] : ["booking", "operations", "home", "crm", "reports"]);
  }
  return result;
}

export function createDurableBooking(input: CreateBookingInput) {
  const scope = be3ScopeKey(input.businessId);
  return enqueueBusinessRequest(input.businessId, async () => (
    patchMutationResult(await requestBe3({ type: "booking.create", input }), scope)
  ));
}

export function updateDurableBooking(input: UpdateBookingInput) {
  const scope = be3ScopeKey(input.businessId);
  return enqueueBusinessRequest(input.businessId, async () => (
    patchMutationResult(await requestBe3({ type: "booking.update", input }), scope)
  ));
}

export function rescheduleDurableBooking(input: RescheduleBookingInput) {
  const scope = be3ScopeKey(input.businessId);
  return enqueueBusinessRequest(input.businessId, async () => (
    patchMutationResult(await requestBe3({ type: "booking.reschedule", input }), scope)
  ));
}

export function assignDurableBookingResources(input: AssignBookingResourcesInput) {
  const scope = be3ScopeKey(input.businessId);
  return enqueueBusinessRequest(input.businessId, async () => (
    patchMutationResult(await requestBe3({ type: "booking.assign-resources", input }), scope)
  ));
}

export function cancelDurableBooking(input: CancelBookingInput) {
  const scope = be3ScopeKey(input.businessId);
  return enqueueBusinessRequest(input.businessId, async () => (
    patchMutationResult(await requestBe3({ type: "booking.cancel", input }), scope)
  ));
}
