import type { Be1ServiceModule } from "../be1/contracts";
import type {
  BookingCatalogView,
  BookingResourceView,
  BookingServiceView,
  BookingStatus,
  BookingView,
} from "./contracts";

export type Be3DirectoryStatus = "idle" | "partial" | "loading" | "ready" | "error";
export type Be3CatalogStatus = "idle" | "loading" | "ready" | "error";

export type ReadBe3BookingsOptions = {
  branchId?: string;
  customerId?: string;
  modules?: readonly Be1ServiceModule[];
  statuses?: readonly BookingStatus[];
  includeCancelled?: boolean;
};

type Directory = {
  status: Be3DirectoryStatus;
  bookings: Map<string, BookingView>;
  error: string | null;
};

type CatalogEntry = {
  status: Be3CatalogStatus;
  catalog: BookingCatalogView | null;
  error: string | null;
};

const directories = new Map<string, Directory>();
const catalogs = new Map<string, CatalogEntry>();
const listeners = new Set<() => void>();
let revision = 0;

function catalogKey(businessId: string, branchId: string) {
  return `${businessId}\u0000${branchId}`;
}

function directory(businessId: string) {
  const current = directories.get(businessId);
  if (current) return current;
  const created: Directory = { status: "idle", bookings: new Map(), error: null };
  directories.set(businessId, created);
  return created;
}

function catalogEntry(businessId: string, branchId: string) {
  const key = catalogKey(businessId, branchId);
  const current = catalogs.get(key);
  if (current) return current;
  const created: CatalogEntry = { status: "idle", catalog: null, error: null };
  catalogs.set(key, created);
  return created;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function emit() {
  revision += 1;
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("meawketting:business-state"));
  }
}

export function markBe3DirectoryLoading(businessId: string) {
  const current = directory(businessId);
  current.status = "loading";
  current.error = null;
  emit();
}

/** Installs a complete, all-page Business directory from an authoritative list query. */
export function installBe3Directory(businessId: string, bookings: readonly BookingView[]) {
  if (bookings.some((booking) => booking.businessId !== businessId)) {
    throw new Error("BE3 directory response contained a Booking from another Business.");
  }
  directories.set(businessId, {
    status: "ready",
    bookings: new Map(bookings.map((booking) => [booking.id, booking])),
    error: null,
  });
  emit();
}

export function markBe3DirectoryError(businessId: string, error: unknown) {
  const current = directory(businessId);
  current.status = "error";
  current.error = errorMessage(error);
  emit();
}

/**
 * Patch one authoritative Booking response without claiming that the whole
 * Business directory has been loaded. Cancellation is retained as lifecycle
 * state; BE3 never hard-removes the Booking from this cache.
 */
export function patchBe3Booking(booking: BookingView) {
  const current = directory(booking.businessId);
  current.bookings.set(booking.id, booking);
  if (current.status !== "ready" && current.status !== "loading") current.status = "partial";
  current.error = null;
  emit();
}

export function readBe3DirectoryStatus(businessId: string) {
  return directories.get(businessId)?.status ?? "idle";
}

export function readBe3DirectoryError(businessId: string) {
  return directories.get(businessId)?.error ?? null;
}

function filterAndSortBookings(bookings: readonly BookingView[], options: ReadBe3BookingsOptions) {
  const includeCancelled = options.includeCancelled ?? true;
  const modules = options.modules?.length ? new Set(options.modules) : null;
  const statuses = options.statuses?.length ? new Set(options.statuses) : null;
  return bookings
    .filter((booking) => !options.branchId || booking.branchId === options.branchId)
    .filter((booking) => !options.customerId || booking.customerId === options.customerId)
    .filter((booking) => !modules || modules.has(booking.serviceModule))
    .filter((booking) => !statuses || statuses.has(booking.status))
    .filter((booking) => includeCancelled || booking.status !== "cancelled")
    .sort((first, second) => first.start.localeCompare(second.start) || first.id.localeCompare(second.id));
}

/** Returns null until every server page for this Business has been installed. */
export function readBe3Bookings(businessId: string, options: ReadBe3BookingsOptions = {}): BookingView[] | null {
  const current = directories.get(businessId);
  if (current?.status !== "ready") return null;
  return filterAndSortBookings([...current.bookings.values()], options);
}

/** Reads a known partial or fully hydrated Booking, always within Business scope. */
export function readBe3Booking(businessId: string, bookingId: string) {
  return directories.get(businessId)?.bookings.get(bookingId) ?? null;
}

/**
 * Compatibility-only lookup for frozen local models that already carry a
 * stable BE3 ID. It is never an authorization boundary or a server query.
 */
export function readBe3BookingByStableId(bookingId: string) {
  for (const current of directories.values()) {
    const booking = current.bookings.get(bookingId);
    if (booking) return booking;
  }
  return null;
}

export function readAllReadyBe3Directories() {
  return [...directories.entries()]
    .filter(([, current]) => current.status === "ready")
    .map(([businessId, current]) => ({
      businessId,
      bookings: filterAndSortBookings([...current.bookings.values()], {}),
    }));
}

export function markBe3CatalogLoading(businessId: string, branchId: string) {
  const current = catalogEntry(businessId, branchId);
  current.status = "loading";
  current.error = null;
  emit();
}

export function installBe3Catalog(businessId: string, branchId: string, catalog: BookingCatalogView) {
  if (catalog.businessId !== businessId || catalog.branchId !== branchId) {
    throw new Error("BE3 catalog response did not match the requested Business and Branch.");
  }
  catalogs.set(catalogKey(businessId, branchId), { status: "ready", catalog, error: null });
  emit();
}

export function markBe3CatalogError(businessId: string, branchId: string, error: unknown) {
  const current = catalogEntry(businessId, branchId);
  current.status = "error";
  current.error = errorMessage(error);
  emit();
}

export function readBe3CatalogStatus(businessId: string, branchId: string) {
  return catalogs.get(catalogKey(businessId, branchId))?.status ?? "idle";
}

export function readBe3CatalogError(businessId: string, branchId: string) {
  return catalogs.get(catalogKey(businessId, branchId))?.error ?? null;
}

export function readBe3Catalog(businessId: string, branchId: string) {
  const current = catalogs.get(catalogKey(businessId, branchId));
  return current?.status === "ready" ? current.catalog : null;
}

/** Compatibility-only lookup; server operations still authorize Business and Branch. */
export function readBe3ResourceByStableId(resourceId: string): BookingResourceView | null {
  for (const current of catalogs.values()) {
    if (current.status !== "ready") continue;
    const resource = current.catalog?.resources.find((candidate) => candidate.id === resourceId);
    if (resource) return resource;
  }
  return null;
}

/** Compatibility-only lookup; server operations still authorize Business and Branch. */
export function readBe3ServiceByStableId(serviceId: string): BookingServiceView | null {
  for (const current of catalogs.values()) {
    if (current.status !== "ready") continue;
    const service = current.catalog?.services.find((candidate) => candidate.id === serviceId);
    if (service) return service;
  }
  return null;
}

export function readAllReadyBe3Catalogs() {
  return [...catalogs.values()]
    .filter((current) => current.status === "ready" && current.catalog)
    .map((current) => current.catalog!);
}

export function subscribeBe3Cache(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBe3CacheRevision() {
  return revision;
}

export function resetBe3CacheForTests() {
  directories.clear();
  catalogs.clear();
  emit();
}
