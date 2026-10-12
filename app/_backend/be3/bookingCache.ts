import type { Be1ServiceModule } from "../be1/contracts";
import { readBusinessSession } from "../be1/configurationCache";
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
  return `${be3ScopeKey(businessId)}\u0000${branchId}`;
}
export function be3ScopeKey(businessId: string) {
  const session = readBusinessSession(), workspace = session?.workspaces.find(w => w.business.id === businessId);
  return JSON.stringify([session?.person.id ?? "", businessId, workspace?.membership.id, workspace?.membership.role, workspace?.membership.updatedAt,
    workspace?.permittedBranches.map(b => [b.id, b.updatedAt]).sort()]);
}

function directory(businessId: string) {
  const current = directories.get(be3ScopeKey(businessId));
  if (current) return current;
  const created: Directory = { status: "idle", bookings: new Map(), error: null };
  directories.set(be3ScopeKey(businessId), created);
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
  directories.set(be3ScopeKey(businessId), {
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
  if ((current.bookings.get(booking.id)?.revision ?? 0) > booking.revision) return;
  current.bookings.set(booking.id, booking);
  if (current.status !== "ready" && current.status !== "loading") current.status = "partial";
  current.error = null;
  emit();
}

export function readBe3DirectoryStatus(businessId: string) {
  return directories.get(be3ScopeKey(businessId))?.status ?? "idle";
}

export function readBe3DirectoryError(businessId: string) {
  return directories.get(be3ScopeKey(businessId))?.error ?? null;
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
  const current = directories.get(be3ScopeKey(businessId));
  if (current?.status !== "ready") return null;
  return filterAndSortBookings([...current.bookings.values()], options);
}

/** Reads a known partial or fully hydrated Booking, always within Business scope. */
export function readBe3Booking(businessId: string, bookingId: string) {
  return directories.get(be3ScopeKey(businessId))?.bookings.get(bookingId) ?? null;
}
export function readKnownBe3Bookings(businessId: string, options: ReadBe3BookingsOptions = {}) {
  return filterAndSortBookings([...(directories.get(be3ScopeKey(businessId))?.bookings.values() ?? [])], options);
}
export function readAllKnownBe3Directories() {
  return [...directories].filter(([id]) => id === be3ScopeKey(JSON.parse(id)[1])).map(([id, entry]) => ({ businessId: JSON.parse(id)[1] as string, bookings: filterAndSortBookings([...entry.bookings.values()], {}) }));
}

/**
 * Compatibility-only lookup for frozen local models that already carry a
 * stable BE3 ID. It is never an authorization boundary or a server query.
 */
export function readBe3BookingByStableId(bookingId: string) {
  for (const [id, current] of directories) {
    if (id !== be3ScopeKey(JSON.parse(id)[1])) continue;
    const booking = current.bookings.get(bookingId);
    if (booking) return booking;
  }
  return null;
}

export function readAllReadyBe3Directories() {
  return [...directories.entries()]
    .filter(([id, current]) => current.status === "ready" && id === be3ScopeKey(JSON.parse(id)[1]))
    .map(([id, current]) => ({
      businessId: JSON.parse(id)[1] as string,
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
    .filter((current) => current.status === "ready" && current.catalog && catalogEntry(current.catalog.businessId, current.catalog.branchId) === current)
    .map((current) => current.catalog!);
}
export function invalidateBe3Catalog(businessId: string, branchId: string) { const entry = catalogs.get(catalogKey(businessId, branchId)); if (entry) { entry.status = "idle"; emit(); } }

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
