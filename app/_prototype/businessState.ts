import type { ShareableScopeKey, TemporaryAccess } from "./sharingState";
import { readReport } from "../_backend/be8/client";
import {
  addAccessEvent,
  BUSINESS_FIXTURES,
  evaluateTemporaryAccess,
  findTemporaryAccessByFallbackCode,
  getBusinessBranch,
  getBusinessFixture,
  readTemporaryAccess,
  updateTemporaryAccess,
} from "./sharingState";
import {
  hasBusinessSession,
  readBusinessSession,
  readCachedBranches,
  readCachedBusiness,
  readCachedMembership,
} from "../_backend/be1/configurationCache";
import type { CustomerView } from "../_backend/be2/contracts";
import {
  readAllReadyBe2Directories,
  readBe2CustomerByStableId,
  readBe2Customers,
  readBe2DirectoryStatus,
} from "../_backend/be2/customerPetCache";
import type {
  BookingAvailability as DurableBookingAvailability,
  BookingAvailabilityInput,
  BookingConflict as DurableBookingConflict,
  BookingResourceView,
  BookingServiceView,
  BookingView,
  CreateBookingInput,
  UpdateBookingInput,
} from "../_backend/be3/contracts";
import {
  readAllReadyBe3Directories,
  readBe3BookingByStableId,
  readBe3Bookings,
  readBe3Catalog,
  readBe3DirectoryStatus,
  readBe3ResourceByStableId,
} from "../_backend/be3/bookingCache";
import { readNonAuthoritativePassportCompatibility } from "./be2PassportCompatibility";
import { BUSINESS_FIXTURE_TEST_MODE } from "./fixtureRuntime";
import { readExecutions, readOperationDirectory, readOperationStaff, readServiceRecords } from "../_backend/be4/operationsCache";
import { readAllFinancialDirectories, readFinancialDirectory } from "../_backend/be7/client";
import { dateInZone } from "../_backend/shared/time";
import { businessTimezone } from "../_backend/shared/businessClock";

export type DemoBusinessContext = {
  key: string;
  businessId: string;
  branchId: string;
  role: string;
  memberLabel: string;
};

export const UNAVAILABLE_BUSINESS_CONTEXT: DemoBusinessContext = {
  key: "", businessId: "", branchId: "", role: "ยังไม่ได้เข้าสู่ระบบ", memberLabel: "",
};

export type BusinessServiceModule = "grooming" | "hotel" | "daycare";

export const BUSINESS_SERVICE_MODULES: Record<BusinessServiceModule, { label: string }> = {
  grooming: { label: "อาบน้ำ / ตัดขน" },
  hotel: { label: "โรงแรม" },
  daycare: { label: "Daycare" },
};

export type BusinessWeekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export const BUSINESS_WEEKDAY_LABELS: Record<BusinessWeekday, string> = {
  monday: "จันทร์",
  tuesday: "อังคาร",
  wednesday: "พุธ",
  thursday: "พฤหัสบดี",
  friday: "ศุกร์",
  saturday: "เสาร์",
  sunday: "อาทิตย์",
};

export type PrototypeOperatingHoursEntry = {
  day: BusinessWeekday;
  closed: boolean;
  open: string;
  close: string;
};

export type PrototypeBusinessProfile = {
  businessId: string;
  name: string;
  logoDataUrl: string | null;
  contactName: string;
  phone: string;
  email: string;
  description: string;
  address: string;
  updatedAt: string;
};

export type PrototypeBusinessProfileDraft = Omit<PrototypeBusinessProfile, "updatedAt">;

export type PrototypeBusinessBranch = {
  branchId: string;
  businessId: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  email: string;
  active: boolean;
  enabledModules: BusinessServiceModule[];
  operatingHours: PrototypeOperatingHoursEntry[];
  createdAt: string;
  updatedAt: string;
};

export type PrototypeBusinessBranchDraft = Omit<PrototypeBusinessBranch, "branchId" | "createdAt" | "updatedAt"> & {
  branchId?: string;
};

export type SavePrototypeBusinessBranchResult =
  | { ok: true; branch: PrototypeBusinessBranch; created: boolean }
  | { ok: false; reason: "invalid" | "duplicate" | "last-active-branch" | "storage" };

// BE3 keeps the frozen Booking presentation shape while durable Booking truth
// lives behind the application API. These current-name projections never
// mirror Pet Passport data or establish Customer/Guardian authority.
export const BOOKING_DEMO_DATE = "2026-08-18" as const;
// Fixed operational reference keeps prototype timing deterministic instead of
// treating the wall clock as a delayed workday during visual QA.
export const GROOMING_DEMO_NOW = "2026-08-18T12:20" as const;
// Hotel uses the same fixed operational day as Calendar and Grooming so
// browser-local fixture behaviour remains deterministic during visual QA.
export const HOTEL_DEMO_NOW = "2026-08-18T12:20" as const;
// Billing follows the same fixed local operational day as Calendar, Grooming,
// and Hotel so receipt/revenue examples remain deterministic during QA.
export const BILLING_DEMO_NOW = "2026-08-18T12:20:00.000Z" as const;

export type BookingTimeModel = "appointment" | "date-range" | "day";
export type BookingStatus = "pending" | "confirmed" | "arrived" | "cancelled";
export type BookingResourceKind = "groomer" | "grooming-station" | "dryer" | "hotel-room-type" | "daycare-zone";
export type BookingResourceCapacityMode = "exclusive" | "capacity";

// BF-9 keeps a Person distinct from a schedulable Resource.  A groomer can
// link to one Person, while stations, dryers, rooms, and zones remain
// non-person resources.  This lets the existing Booking/Job assignment IDs
// stay stable without manufacturing another Resource registry for Team.
export type TeamMemberRole = "owner" | "manager" | "staff";
export type TeamMemberCapability = "grooming" | "hotel-care" | "daycare" | "front-desk";
export const TEAM_MEMBER_CAPABILITY_LABELS: Record<TeamMemberCapability, string> = {
  grooming: "อาบน้ำ / ตัดขน",
  "hotel-care": "ดูแลโรงแรม",
  daycare: "Daycare",
  "front-desk": "หน้าร้าน / รับเข้า",
};
export type TeamMemberAvailabilityState = "working" | "unavailable" | "break" | "time-off";

export type PrototypeTeamMemberAvailabilityWindow = {
  id: string;
  state: TeamMemberAvailabilityState;
  // Local date/time values use the same YYYY-MM-DD / YYYY-MM-DDTHH:mm
  // conventions as the Booking foundation.  Date-only values represent a
  // full operational day; this remains a lightweight availability layer.
  start: string;
  end: string;
  note: string | null;
};

export type PrototypeTeamMember = {
  staffId: string;
  businessId: string;
  // One identity may be visible at more than one Branch.  Do not duplicate a
  // Person merely to show them in another Branch context.
  branchIds: string[];
  name: string;
  avatarSeed: string;
  role: TeamMemberRole;
  capabilities: TeamMemberCapability[];
  active: boolean;
  availability: PrototypeTeamMemberAvailabilityWindow[];
  createdAt: string;
  updatedAt: string;
};

export type PrototypeTeamMemberDraft = {
  staffId?: string;
  businessId?: string;
  branchIds: string[];
  name: string;
  avatarSeed?: string;
  role: TeamMemberRole;
  capabilities: TeamMemberCapability[];
  active?: boolean;
  availability?: PrototypeTeamMemberAvailabilityWindow[];
};

export type TeamMemberAvailabilityConflict = {
  code: "inactive" | "outside-working-hours" | "unavailable" | "break" | "time-off" | "invalid-interval";
  message: string;
  windowId?: string;
};

export type TeamMemberAvailabilityResult = {
  available: boolean;
  state: TeamMemberAvailabilityState | "inactive" | "unknown";
  interval: BookingInterval | null;
  conflicts: TeamMemberAvailabilityConflict[];
};

export type GetTeamMembersForCapabilityOptions = {
  interval?: BookingInterval | null;
  date?: string | null;
  includeUnavailable?: boolean;
  includeInactive?: boolean;
};

export type ListPrototypeTeamMembersOptions = {
  includeInactive?: boolean;
  capability?: TeamMemberCapability;
};

export const BOOKING_TIME_MODEL_LABELS: Record<BookingTimeModel, string> = {
  appointment: "นัดตามเวลา",
  "date-range": "เข้าพักเป็นช่วงวันที่",
  day: "เต็มวัน",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  arrived: "มาถึงแล้ว",
  cancelled: "ยกเลิก",
};

export const BOOKING_RESOURCE_KIND_LABELS: Record<BookingResourceKind, string> = {
  groomer: "ช่าง",
  "grooming-station": "จุดบริการ",
  dryer: "เครื่องเป่า",
  "hotel-room-type": "ประเภทห้อง",
  "daycare-zone": "โซนดูแล",
};

export type DemoBookingPet = {
  id: string;
  name: string;
  species: "cat" | "dog";
};

// BF-3 keeps the Business relationship distinct from the Guardian-controlled
// Passport. A local Pet relationship may exist with no Passport connection at
// all, and a connection never grants permanent access to Passport data.
export type PetPassportConnectionState = "linked-active" | "linked-no-access" | "unlinked" | "access-expired";
export type BusinessPetDataSource = "customer-reported" | "business-local";

export type BusinessLocalPetRelationship = DemoBookingPet & {
  passportConnection: PetPassportConnectionState;
  dataSource: BusinessPetDataSource;
  businessNote: string;
  // This opaque fixture-only reference can reconnect an already-known local
  // relationship after a valid Temporary Business QR. It is never Passport data.
  passportSlug: string | null;
};

export type PrototypeCustomer = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  businessNote: string;
  tags: readonly string[];
  pets: readonly BusinessLocalPetRelationship[];
  createdAt: string;
  updatedAt: string;
};

export type DemoBookingContact = {
  id: string;
  name: string;
  businessIds: readonly string[];
  pets: readonly DemoBookingPet[];
};

export type DemoBookingService = {
  id: string;
  businessId: string;
  branchId: string;
  module: BusinessServiceModule;
  label: string;
  timeModel: BookingTimeModel;
  defaultDurationMinutes: number | null;
  estimate: number | null;
  requiredResourceKinds: readonly BookingResourceKind[];
};

export type DemoBookingResource = {
  id: string;
  businessId: string;
  branchId: string;
  module: BusinessServiceModule;
  kind: BookingResourceKind;
  label: string;
  capacityMode: BookingResourceCapacityMode;
  capacity: number;
  serviceIds: readonly string[];
  // Present only when this existing Resource represents a real Team member
  // (currently groomers).  Physical capacity resources intentionally have no
  // staffId and are never duplicated as Team records.
  staffId?: string;
  // Hotel keeps planning capacity separate from execution rooms. This is
  // optional so the BF-2 Resource fixtures remain compatible.
  hotelRole?: "planning-capacity" | "room" | "zone";
};

export type PrototypeBooking = {
  bookingId: string;
  customer: Pick<DemoBookingContact, "id" | "name">;
  // The local UI can begin with one Pet, while the foundation remains ready for
  // grouped Bookings without merging Pet-specific policy or consent.
  pets: DemoBookingPet[];
  businessId: string;
  branchId: string;
  serviceModule: BusinessServiceModule;
  service: Pick<DemoBookingService, "id" | "label">;
  timeModel: BookingTimeModel;
  // Appointments use local YYYY-MM-DDTHH:mm values. Date-range Bookings use
  // an exclusive check-out date; day Bookings use start only.
  start: string;
  end: string | null;
  requiredResources: BookingResourceKind[];
  assignedResources: string[];
  status: BookingStatus;
  estimate: number | null;
  notes: string;
  // Optimistic concurrency token supplied by BE3. Fixtures use revision 1;
  // optional keeps pre-BE3 compatibility projections readable during SSR.
  revision?: number;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};

// Kept controlled-form friendly. The selected service determines the final
// time model and required resources during availability validation/save.
export type PrototypeBookingDraft = {
  bookingId?: string;
  businessId: string;
  branchId: string;
  serviceModule: BusinessServiceModule | null;
  serviceId: string;
  timeModel: BookingTimeModel | null;
  customer: Pick<DemoBookingContact, "id" | "name"> | null;
  pets: DemoBookingPet[];
  start: string;
  end: string;
  assignedResourceIds: string[];
  notes: string;
  estimate: number | null;
  status: BookingStatus;
};

// A Service Job is the unit of work being executed. It deliberately keeps
// Booking planning/status separate from live Grooming operations. The first
// local implementation is Grooming-only, while the shared shape stays ready
// for future service modules without inventing their workflows.
export type ServiceJobStatus =
  | "booked"
  | "checked-in"
  | "waiting"
  | "in-service"
  | "ready-for-pickup"
  | "completed"
  | "cancelled";

export const SERVICE_JOB_STATUS_LABELS: Record<ServiceJobStatus, string> = {
  booked: "รอรับเข้า",
  "checked-in": "รับเข้าแล้ว",
  waiting: "รอเริ่ม",
  "in-service": "กำลังทำ",
  "ready-for-pickup": "พร้อมรับกลับ",
  completed: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
};

export type PrototypeServiceJobAddOn = {
  id: string;
  sourceRequestId: string | null;
  label: string;
  additionalPrice: number;
  additionalMinutes: number;
  approvedAt: string;
};

export type PrototypeServiceJobHistoryItem = {
  id: string;
  at: string;
  type: "created" | "status" | "assignment" | "add-on" | "note" | "intake";
  summary: string;
};

export type PrototypeServiceJob = {
  serviceJobId: string;
  bookingId: string;
  intakeId: string | null;
  businessId: string;
  branchId: string;
  customerId: string;
  petId: string;
  serviceModule: "grooming";
  baseServiceId: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  estimatedDurationMinutes: number;
  actualStartedAt: string | null;
  actualCompletedAt: string | null;
  assignedResourceIds: string[];
  status: ServiceJobStatus;
  businessNote: string;
  addOns: PrototypeServiceJobAddOn[];
  history: PrototypeServiceJobHistoryItem[];
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};

// Hotel execution is deliberately not coerced into the Grooming Service Job
// status machine. A Stay references the shared Booking but preserves its own
// arrival, occupancy, room movement, and daily-care facts per Pet.
export type HotelStayStatus =
  | "booked"
  | "expected-today"
  | "checked-in"
  | "in-stay"
  | "ready-for-checkout"
  | "checked-out"
  | "completed"
  | "cancelled"
  | "no-show";

export const HOTEL_STAY_STATUS_LABELS: Record<HotelStayStatus, string> = {
  booked: "จองไว้",
  "expected-today": "เข้าพักวันนี้",
  "checked-in": "เข้าพักแล้ว",
  "in-stay": "พักอยู่",
  "ready-for-checkout": "พร้อมรับกลับ",
  "checked-out": "เช็กเอาต์แล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  "no-show": "ไม่มาตามนัด",
};

export type PrototypeHotelRoomAssignment = {
  id: string;
  roomId: string;
  startDate: string;
  // Exclusive end date, aligned with the shared Calendar stay model.
  endDate: string | null;
  assignedAt: string;
  assignedBy: string | null;
  reason: string | null;
};

export type PrototypeHotelRoomMove = {
  id: string;
  movedAt: string;
  fromRoomId: string | null;
  toRoomId: string;
  reason: string | null;
};

export type PrototypeHotelCareTaskKind = "meal" | "water" | "medication" | "activity" | "cleaning" | "check" | "note" | "other";
export type PrototypeHotelCareTaskState = "pending" | "completed";

export type PrototypeHotelCareAuthorization = {
  source: "customer-confirmed-intake";
  intakeId: string;
  confirmedAt: string;
};

export type PrototypeHotelCareTask = {
  id: string;
  kind: PrototypeHotelCareTaskKind;
  label: string;
  scheduledDate: string;
  scheduledTime: string;
  // BF-9 adds an optional Team reference without creating a second Hotel
  // staffing or workforce-scheduling model.  Historical care tasks with no
  // assignment remain valid.
  assignedStaffId?: string | null;
  state: PrototypeHotelCareTaskState;
  completedAt: string | null;
  completedBy: string | null;
  // Medication is valid only with both explicit instructions and a matching
  // customer-confirmed Intake reference. Nothing is inferred from Passport.
  instructions?: string | null;
  authorization?: PrototypeHotelCareAuthorization | null;
};

export type PrototypeHotelIncidentNote = {
  id: string;
  summary: string;
  severity: "attention" | "info";
  createdAt: string;
  createdBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export type PrototypeHotelStayHistoryItem = {
  id: string;
  at: string;
  type: "created" | "status" | "room-assignment" | "room-move" | "care" | "care-assignment" | "note" | "incident" | "intake" | "dates";
  summary: string;
};

export type PrototypeHotelStay = {
  hotelStayId: string;
  bookingId: string;
  intakeId: string | null;
  businessId: string;
  branchId: string;
  customerId: string;
  petId: string;
  scheduledCheckIn: string;
  scheduledCheckOut: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  status: HotelStayStatus;
  roomAssignments: PrototypeHotelRoomAssignment[];
  roomMoveHistory: PrototypeHotelRoomMove[];
  // This field is supplied into the Business booking/intake context. It is
  // never a copy of a Guardian-controlled Passport field.
  guardianCareInstruction: string | null;
  businessNote: string;
  dailyCareTasks: PrototypeHotelCareTask[];
  incidentNotes: PrototypeHotelIncidentNote[];
  history: PrototypeHotelStayHistoryItem[];
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};

// BF-11 keeps Daycare execution distinct from both an appointment-style
// Grooming Job and an overnight Hotel Stay. One attendance belongs to one Pet
// on one day while continuing to reference the shared Booking and identities.
export type DaycareAttendanceStatus =
  | "booked"
  | "checked-in"
  | "active"
  | "ready-for-pickup"
  | "checked-out"
  | "completed"
  | "cancelled";

export const DAYCARE_ATTENDANCE_STATUS_LABELS: Record<DaycareAttendanceStatus, string> = {
  booked: "ยังไม่มา",
  "checked-in": "รับเข้าแล้ว",
  active: "อยู่ใน Daycare",
  "ready-for-pickup": "พร้อมรับกลับ",
  "checked-out": "รับกลับแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

export type PrototypeDaycareCareKind = "meal" | "water" | "activity" | "rest" | "note";

export type PrototypeDaycareCareEvent = {
  id: string;
  kind: PrototypeDaycareCareKind;
  label: string;
  note: string | null;
  occurredAt: string;
  staffId: string | null;
};

export type PrototypeDaycareHistoryItem = {
  id: string;
  at: string;
  type: "created" | "status" | "zone" | "staff" | "care" | "note" | "intake";
  summary: string;
};

export type PrototypeDaycareAttendance = {
  daycareAttendanceId: string;
  bookingId: string;
  intakeId: string | null;
  businessId: string;
  branchId: string;
  customerId: string;
  petId: string;
  attendanceDate: string;
  dropOffWindow: string | null;
  pickupWindow: string | null;
  status: DaycareAttendanceStatus;
  zoneId: string | null;
  responsibleStaffId: string | null;
  checkedInAt: string | null;
  activatedAt: string | null;
  readyForPickupAt: string | null;
  checkedOutAt: string | null;
  completedAt: string | null;
  businessNote: string;
  careEvents: PrototypeDaycareCareEvent[];
  history: PrototypeDaycareHistoryItem[];
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};

export type DaycareAttendanceTransitionResult =
  | { ok: true; attendance: PrototypeDaycareAttendance; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "invalid-transition" | "zone-required" | "capacity" | "storage" };

export type AssignPrototypeDaycareZoneResult =
  | { ok: true; attendance: PrototypeDaycareAttendance; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "invalid-zone" | "capacity" | "storage"; message?: string };

export type AssignPrototypeDaycareStaffResult =
  | { ok: true; attendance: PrototypeDaycareAttendance; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "invalid-staff" | "unavailable" | "storage"; message?: string };

// BF-7 keeps what the customer owes distinct from how and when it is paid.
// Amounts use whole Thai Baht in the local prototype so the UI never implies
// an accounting, tax, or payment-provider precision contract.
export type PrototypeChargeLineKind = "base-service" | "add-on" | "manual-adjustment" | "discount";
export type PrototypeChargeStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type PrototypePaymentMethod = "cash" | "bank-transfer" | "other";

export type PrototypeChargeLine = {
  id: string;
  kind: PrototypeChargeLineKind;
  label: string;
  amount: number;
  reason: string | null;
  sourceRequestId: string | null;
  serviceJobId: string | null;
  hotelStayId: string | null;
  daycareAttendanceId?: string | null;
  createdAt: string;
};

export type PrototypeChargeHistoryItem = {
  id: string;
  at: string;
  type: "created" | "adjusted" | "cancelled";
  summary: string;
};

export type PrototypeCharge = {
  chargeId: string;
  businessId: string;
  branchId: string;
  customerId: string;
  // A Booking can cover several Pets. Keeping this nullable lets one
  // booking-level base Charge represent its total without duplicating it per
  // Grooming Job or Hotel Stay.
  petId: string | null;
  bookingId: string;
  serviceJobId: string | null;
  hotelStayId: string | null;
  daycareAttendanceId?: string | null;
  serviceModule: BusinessServiceModule;
  serviceLabel: string;
  lineItems: PrototypeChargeLine[];
  cancelledAt: string | null;
  cancellationReason: string | null;
  history: PrototypeChargeHistoryItem[];
  createdAt: string;
  updatedAt: string;
};

export type PrototypePaymentAllocation = {
  chargeId: string;
  amount: number;
};

export type PrototypePayment = {
  paymentId: string;
  businessId: string;
  branchId: string;
  customerId: string;
  method: PrototypePaymentMethod;
  amount: number;
  allocations: PrototypePaymentAllocation[];
  note: string;
  // A local request key guards repeated clicks in this browser-only model.
  requestKey: string;
  recordedAt: string;
};

export type PrototypeChargeBalance = {
  charge: PrototypeCharge;
  total: number;
  paid: number;
  remaining: number;
  status: PrototypeChargeStatus;
  paymentCount: number;
};

// BF-8 records what the Business completed for one Pet-specific execution
// source. It is a Business service record, not a receipt and never becomes a
// Pet Passport or a copy of Guardian-controlled data.
export type PrototypeServiceRecordSource = "grooming-job" | "hotel-stay" | "daycare-attendance";
export type PrototypeServiceRecordActivityKind = "service" | "add-on" | "care" | "room";
export type PrototypeServiceRecordCorrectionField = "summary" | "business-note";
export type PrototypeServiceRecordPaymentStatus = PrototypeChargeStatus | "no-charge";
export type PrototypeServiceRecordHandoverStatus = "pending" | "handed-over";

export type PrototypeServiceRecordDetail = {
  id: string;
  label: string;
  value: string;
};

export type PrototypeServiceRecordActivity = {
  id: string;
  kind: PrototypeServiceRecordActivityKind;
  label: string;
  occurredAt: string | null;
  detail: string | null;
};

// This is a local metadata foundation only. BF-8 deliberately ships no
// uploader, cloud object store, public share URL, or copied Passport photo.
export type PrototypeServiceRecordPhoto = {
  id: string;
  phase: "before" | "after";
  label: string;
  localAssetRef: string | null;
  createdAt: string;
};

export type PrototypeServiceRecordCorrection = {
  id: string;
  at: string;
  field: PrototypeServiceRecordCorrectionField;
  previousValue: string;
  nextValue: string;
  reason: string;
  correctedBy: string;
  requestKey: string;
};

// When a completed Grooming Job is deliberately reopened and completed again,
// retain its former safe service snapshot before refreshing the one shared
// Service Record. This is an audit trail, not a second record.
export type PrototypeServiceRecordSourceRevision = {
  id: string;
  at: string;
  completedAt: string;
  summary: string;
  details: PrototypeServiceRecordDetail[];
  activities: PrototypeServiceRecordActivity[];
  staffResourceLabels: string[];
  businessNote: string;
  photos: PrototypeServiceRecordPhoto[];
  reason: "source-recompleted";
};

// Legacy compatibility metadata from the superseded standalone handover
// experience. Existing browser records may still contain it; the current UI
// never starts or advances this workflow.
export type PrototypeServiceRecordHandoverEvent = {
  id: string;
  at: string;
  type: "ready" | "handed-over";
  summary: string;
  paymentStatus: PrototypeServiceRecordPaymentStatus | null;
};

export type PrototypeServiceRecordHandover = {
  status: PrototypeServiceRecordHandoverStatus;
  handedOverAt: string | null;
  handedOverBy: string | null;
  note: string;
  paymentStatusAtHandover: PrototypeServiceRecordPaymentStatus | null;
  history: PrototypeServiceRecordHandoverEvent[];
};

export type PrototypeServiceRecord = {
  serviceRecordId: string;
  source: PrototypeServiceRecordSource;
  serviceJobId: string | null;
  hotelStayId: string | null;
  daycareAttendanceId?: string | null;
  bookingId: string;
  businessId: string;
  branchId: string;
  customerId: string;
  petId: string;
  serviceModule: BusinessServiceModule;
  serviceLabel: string;
  completedAt: string;
  summary: string;
  details: PrototypeServiceRecordDetail[];
  activities: PrototypeServiceRecordActivity[];
  staffResourceLabels: string[];
  // A Business-local note snapshot. It is never sourced from Passport,
  // Guardian instructions, medication authorization, or incident content.
  businessNote: string;
  photos: PrototypeServiceRecordPhoto[];
  sourceRevisions: PrototypeServiceRecordSourceRevision[];
  corrections: PrototypeServiceRecordCorrection[];
  handover: PrototypeServiceRecordHandover;
  createdAt: string;
  updatedAt: string;
};

export type PrototypeServiceRecordPaymentReference = {
  chargeId: string | null;
  status: PrototypeServiceRecordPaymentStatus;
  total: number;
  paid: number;
  remaining: number;
  source: "source" | "booking" | "none";
};

export type HotelRoomAvailabilityConflict = {
  roomId: string;
  roomLabel: string;
  message: string;
  stayIds: string[];
  dates: string[];
};

export type HotelRoomAvailability = {
  available: boolean;
  conflicts: HotelRoomAvailabilityConflict[];
};

export type HotelStayTransitionResult =
  | { ok: true; stay: PrototypeHotelStay; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "invalid-transition" | "room-required" | "intake-required" | "care-incomplete" | "storage"; stay?: PrototypeHotelStay };

export type AssignPrototypeHotelStayRoomResult =
  | { ok: true; stay: PrototypeHotelStay; availability: HotelRoomAvailability }
  | { ok: false; reason: "missing" | "wrong-context" | "unavailable" | "storage"; availability?: HotelRoomAvailability };

export type AssignPrototypeHotelCareTaskStaffResult =
  | { ok: true; stay: PrototypeHotelStay; staffId: string | null; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "invalid-staff" | "unavailable" | "storage"; availability?: TeamMemberAvailabilityResult };

export type UpdatePrototypeHotelStayDatesResult =
  | { ok: true; stay: PrototypeHotelStay }
  | { ok: false; reason: "missing" | "wrong-context" | "invalid-dates" | "unavailable" | "storage"; availability?: HotelRoomAvailability };

export type ServiceJobTransitionResult =
  | { ok: true; job: PrototypeServiceJob; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "invalid-transition" | "storage"; job?: PrototypeServiceJob };

export type ServiceJobResourceConflict = {
  code: "invalid-resource" | "resource-conflict" | "staff-inactive" | "staff-unavailable" | "staff-capability-mismatch" | "invalid-time";
  resourceId: string;
  resourceLabel: string;
  message: string;
  conflictingJobIds: string[];
  staffId?: string;
};

export type ServiceJobResourceAvailability = {
  available: boolean;
  conflicts: ServiceJobResourceConflict[];
};

export type BookingConflictCode =
  | "wrong-context"
  | "branch-inactive"
  | "branch-closed"
  | "outside-operating-hours"
  | "service-not-enabled"
  | "service-not-found"
  | "time-model-mismatch"
  | "missing-customer"
  | "missing-pet"
  | "invalid-pet-selection"
  | "invalid-time"
  | "invalid-estimate"
  | "missing-resource"
  | "invalid-resource"
  | "staff-inactive"
  | "staff-unavailable"
  | "staff-capability-mismatch"
  | "resource-conflict"
  | "capacity-conflict"
  | "duplicate-confirmation"
  | "version-conflict"
  | "idempotency-key-reused";

export type BookingConflictRecovery = "change-time" | "change-resource" | "change-date" | "return-to-edit";

export type BookingConflict = {
  code: BookingConflictCode;
  message: string;
  recovery: BookingConflictRecovery;
  resourceId?: string;
  resourceKind?: BookingResourceKind;
  staffId?: string;
  bookingIds?: string[];
  dates?: string[];
};

export type BookingInterval = {
  start: number;
  end: number;
};

export type BookingAvailabilityResult = {
  available: boolean;
  service: DemoBookingService | null;
  interval: BookingInterval | null;
  conflicts: BookingConflict[];
};

export type BusinessHomeDemo = {
  today: {
    waitingIntake: number;
    readyForPickup?: number;
  };
  attention: readonly {
    id: string;
    tone: "waiting" | "ready" | "info";
    title: string;
    detail: string;
  }[];
  moduleSummaries: Partial<Record<BusinessServiceModule, { value: string; detail: string }>>;
};

// Phase E reuses the Phase D Business/Branch fixtures. These are browser-local
// context presets, not memberships, roles, authorization, or verified accounts.
export const DEMO_BUSINESS_CONTEXTS: readonly DemoBusinessContext[] = [
  {
    key: "whisker-ari-frontdesk",
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    role: "พนักงานรับเข้า",
    memberLabel: "พนักงานรับเข้า",
  },
  {
    key: "whisker-thonglor-frontdesk",
    businessId: "business-whisker-rest",
    branchId: "whisker-thonglor",
    role: "พนักงานหน้าร้าน",
    memberLabel: "พนักงานหน้าร้าน",
  },
  {
    key: "paw-partner-onnut",
    businessId: "business-paw-partner",
    branchId: "partner-onnut",
    role: "ผู้ประสานงานดูแล",
    memberLabel: "ผู้ประสานงานดูแล",
  },
] as const;

const DEMO_ENABLED_MODULES: Record<string, readonly BusinessServiceModule[]> = {
  "whisker-ari-frontdesk": ["grooming", "hotel"],
  "whisker-thonglor-frontdesk": ["grooming"],
  "paw-partner-onnut": ["hotel", "daycare"],
};

const BUSINESS_CONFIGURATION_FIXTURE_CREATED_AT = "2026-08-17T03:00:00.000Z";
const BUSINESS_WEEKDAYS: readonly BusinessWeekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function createDefaultOperatingHours(): PrototypeOperatingHoursEntry[] {
  return BUSINESS_WEEKDAYS.map((day) => ({
    day,
    closed: false,
    open: "09:00",
    close: day === "saturday" || day === "sunday" ? "18:00" : "20:00",
  }));
}

function withoutDemoSuffix(value: string) {
  return value.replace(/\s*(?:\(Demo\)|Demo)$/i, "").trim();
}

const BUSINESS_PROFILE_CONTACT_FIXTURES: Record<string, Pick<PrototypeBusinessProfile, "contactName" | "phone" | "email" | "description" | "address">> = {
  "business-whisker-rest": {
    contactName: "คุณนนท์",
    phone: "02-114-8828",
    email: "hello@whiskerrest.example",
    description: "บริการดูแล อาบน้ำ ตัดขน และที่พักสำหรับสัตว์เลี้ยง",
    address: "กรุงเทพมหานคร",
  },
  "business-paw-partner": {
    contactName: "คุณมายด์",
    phone: "02-021-4722",
    email: "care@pawpartner.example",
    description: "ทีมดูแลสัตว์เลี้ยงแบบรายวันและเข้าพัก",
    address: "กรุงเทพมหานคร",
  },
};

const BRANCH_CONTACT_FIXTURES: Record<string, Pick<PrototypeBusinessBranch, "address" | "phone" | "email">> = {
  "whisker-ari": { address: "ซอยอารีย์ 4 แขวงพญาไท กรุงเทพฯ", phone: "02-114-8828", email: "ari@whiskerrest.example" },
  "whisker-thonglor": { address: "ซอยทองหล่อ 13 เขตวัฒนา กรุงเทพฯ", phone: "02-114-8839", email: "thonglor@whiskerrest.example" },
  "whisker-bangna": { address: "ถนนบางนา-ตราด เขตบางนา กรุงเทพฯ", phone: "02-114-8840", email: "bangna@whiskerrest.example" },
  "partner-onnut": { address: "ถนนอ่อนนุช เขตสวนหลวง กรุงเทพฯ", phone: "02-021-4722", email: "onnut@pawpartner.example" },
};

const BUSINESS_CONFIGURATION_BUSINESS_IDS = [...new Set(DEMO_BUSINESS_CONTEXTS.map((context) => context.businessId))];

const BUSINESS_PROFILE_FIXTURES: readonly PrototypeBusinessProfile[] = BUSINESS_FIXTURES.filter((business) => BUSINESS_CONFIGURATION_BUSINESS_IDS.includes(business.id)).map((business) => {
  const contact = BUSINESS_PROFILE_CONTACT_FIXTURES[business.id];
  return {
    businessId: business.id,
    name: withoutDemoSuffix(business.name),
    logoDataUrl: null,
    contactName: contact?.contactName ?? "ผู้ดูแลธุรกิจ",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    description: contact?.description ?? business.purpose,
    address: contact?.address ?? "",
    updatedAt: BUSINESS_CONFIGURATION_FIXTURE_CREATED_AT,
  };
});

const BUSINESS_BRANCH_FIXTURES: readonly PrototypeBusinessBranch[] = DEMO_BUSINESS_CONTEXTS.flatMap((context) => {
  const business = BUSINESS_FIXTURES.find((candidate) => candidate.id === context.businessId);
  const branch = business?.branches.find((candidate) => candidate.id === context.branchId);
  if (!business || !branch) return [];
  const contact = BRANCH_CONTACT_FIXTURES[branch.id];
  return [{
    branchId: branch.id,
    businessId: business.id,
    name: withoutDemoSuffix(branch.name),
    area: branch.area,
    address: contact?.address ?? branch.area,
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    active: true,
    enabledModules: [...(DEMO_ENABLED_MODULES[context.key] ?? [])],
    operatingHours: createDefaultOperatingHours(),
    createdAt: BUSINESS_CONFIGURATION_FIXTURE_CREATED_AT,
    updatedAt: BUSINESS_CONFIGURATION_FIXTURE_CREATED_AT,
  }];
});

// BF-3 fixture relationships are Business-level and stay shared across the
// Whisker Rest branches. They are local operational records, not Guardian
// authority, ownership, or a mirror of Consumer Passport data.
const CUSTOMER_FIXTURE_CREATED_AT = "2026-08-17T03:00:00.000Z";

export const DEMO_CUSTOMER_FIXTURES: readonly PrototypeCustomer[] = [
  {
    id: "booking-contact-nalin",
    name: "คุณนลิน",
    businessId: "business-whisker-rest",
    phone: "081-555-0142",
    email: "nalin@example.test",
    businessNote: "ลูกค้าชอบนัดช่วงเช้า",
    tags: ["ลูกค้าประจำ", "Hotel"],
    pets: [
      {
        id: "booking-pet-mochi",
        name: "Mochi",
        species: "cat",
        passportConnection: "linked-no-access",
        dataSource: "customer-reported",
        businessNote: "",
        passportSlug: null,
      },
      {
        id: "booking-pet-milo",
        name: "Milo",
        species: "dog",
        passportConnection: "unlinked",
        dataSource: "customer-reported",
        businessNote: "",
        passportSlug: null,
      },
      {
        id: "booking-pet-biscuit",
        name: "Biscuit",
        species: "cat",
        passportConnection: "unlinked",
        dataSource: "customer-reported",
        businessNote: "",
        passportSlug: null,
      },
    ],
    createdAt: CUSTOMER_FIXTURE_CREATED_AT,
    updatedAt: CUSTOMER_FIXTURE_CREATED_AT,
  },
  {
    id: "booking-contact-pim",
    name: "คุณพิม",
    businessId: "business-whisker-rest",
    phone: "089-444-2088",
    email: null,
    businessNote: "กรุณาโทรก่อนรับกลับ",
    tags: ["Grooming"],
    pets: [
      {
        id: "booking-pet-luna",
        name: "Luna",
        species: "cat",
        passportConnection: "linked-active",
        dataSource: "customer-reported",
        businessNote: "",
        passportSlug: "demo-luna",
      },
      {
        id: "booking-pet-tofu",
        name: "Tofu",
        species: "dog",
        passportConnection: "access-expired",
        dataSource: "customer-reported",
        businessNote: "",
        passportSlug: null,
      },
    ],
    createdAt: CUSTOMER_FIXTURE_CREATED_AT,
    updatedAt: CUSTOMER_FIXTURE_CREATED_AT,
  },
  {
    id: "booking-contact-onnut-aom",
    name: "คุณอ้อม",
    businessId: "business-paw-partner",
    phone: "086-333-1199",
    email: null,
    businessNote: "",
    tags: ["Daycare"],
    pets: [
      {
        id: "booking-pet-pudding",
        name: "Pudding",
        species: "dog",
        passportConnection: "unlinked",
        dataSource: "customer-reported",
        businessNote: "",
        passportSlug: null,
      },
      {
        id: "booking-pet-maple",
        name: "Maple",
        species: "dog",
        passportConnection: "unlinked",
        dataSource: "customer-reported",
        businessNote: "",
        passportSlug: null,
      },
    ],
    createdAt: CUSTOMER_FIXTURE_CREATED_AT,
    updatedAt: CUSTOMER_FIXTURE_CREATED_AT,
  },
  {
    id: "booking-contact-onnut-lee",
    name: "คุณลี",
    businessId: "business-paw-partner",
    phone: null,
    email: "lee@example.test",
    businessNote: "",
    tags: ["Hotel"],
    pets: [
      {
        id: "booking-pet-leo",
        name: "Leo",
        species: "cat",
        passportConnection: "linked-no-access",
        dataSource: "customer-reported",
        businessNote: "",
        passportSlug: null,
      },
    ],
    createdAt: CUSTOMER_FIXTURE_CREATED_AT,
    updatedAt: CUSTOMER_FIXTURE_CREATED_AT,
  },
] as const;

// BF-2 Booking keeps this compatibility projection so its controlled editor
// can reuse the new shared Customer/Pet identity source without a risky model
// rewrite. Bookings still preserve their display snapshots for old fixtures.
export const DEMO_BOOKING_CONTACTS: readonly DemoBookingContact[] = DEMO_CUSTOMER_FIXTURES.map((customer) => ({
  id: customer.id,
  name: customer.name,
  businessIds: [customer.businessId],
  pets: customer.pets.map(({ id, name, species }) => ({ id, name, species })),
}));

export const DEMO_BOOKING_SERVICES: readonly DemoBookingService[] = [
  {
    id: "ari-grooming-bath-groom",
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    module: "grooming",
    label: "อาบน้ำ / ตัดขน",
    timeModel: "appointment",
    defaultDurationMinutes: 90,
    estimate: 850,
    requiredResourceKinds: ["groomer", "grooming-station", "dryer"],
  },
  {
    id: "ari-hotel-stay",
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    module: "hotel",
    label: "เข้าพักโรงแรม",
    timeModel: "date-range",
    defaultDurationMinutes: null,
    estimate: 1200,
    requiredResourceKinds: ["hotel-room-type"],
  },
  {
    id: "thonglor-grooming-bath",
    businessId: "business-whisker-rest",
    branchId: "whisker-thonglor",
    module: "grooming",
    label: "อาบน้ำและตัดเล็บ",
    timeModel: "appointment",
    defaultDurationMinutes: 60,
    estimate: 650,
    requiredResourceKinds: ["groomer", "grooming-station", "dryer"],
  },
  {
    id: "onnut-hotel-stay",
    businessId: "business-paw-partner",
    branchId: "partner-onnut",
    module: "hotel",
    label: "เข้าพักโรงแรม",
    timeModel: "date-range",
    defaultDurationMinutes: null,
    estimate: 1000,
    requiredResourceKinds: ["hotel-room-type"],
  },
  {
    id: "onnut-daycare-full-day",
    businessId: "business-paw-partner",
    branchId: "partner-onnut",
    module: "daycare",
    label: "Daycare เต็มวัน",
    timeModel: "day",
    defaultDurationMinutes: null,
    estimate: 450,
    requiredResourceKinds: ["daycare-zone"],
  },
] as const;

export const DEMO_BOOKING_RESOURCES: readonly DemoBookingResource[] = [
  { id: "ari-groomer-pim", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "grooming", kind: "groomer", label: "ช่างพิม", capacityMode: "exclusive", capacity: 1, serviceIds: ["ari-grooming-bath-groom"], staffId: "team-pim" },
  { id: "ari-groomer-joy", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "grooming", kind: "groomer", label: "ช่างจอย", capacityMode: "exclusive", capacity: 1, serviceIds: ["ari-grooming-bath-groom"], staffId: "team-joy" },
  { id: "ari-station-a", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "grooming", kind: "grooming-station", label: "จุดบริการ A", capacityMode: "exclusive", capacity: 1, serviceIds: ["ari-grooming-bath-groom"] },
  { id: "ari-station-b", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "grooming", kind: "grooming-station", label: "จุดบริการ B", capacityMode: "exclusive", capacity: 1, serviceIds: ["ari-grooming-bath-groom"] },
  { id: "ari-dryer-1", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "grooming", kind: "dryer", label: "เครื่องเป่า 1", capacityMode: "exclusive", capacity: 1, serviceIds: ["ari-grooming-bath-groom"] },
  { id: "ari-dryer-2", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "grooming", kind: "dryer", label: "เครื่องเป่า 2", capacityMode: "exclusive", capacity: 1, serviceIds: ["ari-grooming-bath-groom"] },
  // Calendar reserves the aggregate planning capacity. Room/zone selection
  // stays an execution decision in Hotel Operations and is not locked by a
  // Booking.
  { id: "ari-hotel-capacity", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "hotel", kind: "hotel-room-type", label: "พื้นที่พักตามเงื่อนไข", capacityMode: "capacity", capacity: 2, serviceIds: ["ari-hotel-stay"], hotelRole: "planning-capacity" },
  { id: "ari-hotel-room-a01", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "hotel", kind: "hotel-room-type", label: "ห้อง A01", capacityMode: "capacity", capacity: 1, serviceIds: ["ari-hotel-stay"], hotelRole: "room" },
  { id: "ari-hotel-room-a02", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "hotel", kind: "hotel-room-type", label: "ห้อง A02", capacityMode: "capacity", capacity: 1, serviceIds: ["ari-hotel-stay"], hotelRole: "room" },
  { id: "ari-hotel-room-b03", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "hotel", kind: "hotel-room-type", label: "ห้อง B03", capacityMode: "capacity", capacity: 1, serviceIds: ["ari-hotel-stay"], hotelRole: "room" },
  { id: "ari-hotel-zone-quiet", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "hotel", kind: "hotel-room-type", label: "โซนสงบ C01", capacityMode: "capacity", capacity: 1, serviceIds: ["ari-hotel-stay"], hotelRole: "zone" },
  { id: "thonglor-groomer-nok", businessId: "business-whisker-rest", branchId: "whisker-thonglor", module: "grooming", kind: "groomer", label: "ช่างนก", capacityMode: "exclusive", capacity: 1, serviceIds: ["thonglor-grooming-bath"], staffId: "team-nok" },
  { id: "thonglor-station-a", businessId: "business-whisker-rest", branchId: "whisker-thonglor", module: "grooming", kind: "grooming-station", label: "จุดบริการ A", capacityMode: "exclusive", capacity: 1, serviceIds: ["thonglor-grooming-bath"] },
  { id: "thonglor-dryer-1", businessId: "business-whisker-rest", branchId: "whisker-thonglor", module: "grooming", kind: "dryer", label: "เครื่องเป่า 1", capacityMode: "exclusive", capacity: 1, serviceIds: ["thonglor-grooming-bath"] },
  { id: "onnut-hotel-capacity", businessId: "business-paw-partner", branchId: "partner-onnut", module: "hotel", kind: "hotel-room-type", label: "พื้นที่พักตามเงื่อนไข", capacityMode: "capacity", capacity: 2, serviceIds: ["onnut-hotel-stay"], hotelRole: "planning-capacity" },
  { id: "onnut-hotel-room-r01", businessId: "business-paw-partner", branchId: "partner-onnut", module: "hotel", kind: "hotel-room-type", label: "ห้อง R01", capacityMode: "capacity", capacity: 1, serviceIds: ["onnut-hotel-stay"], hotelRole: "room" },
  { id: "onnut-hotel-zone-quiet", businessId: "business-paw-partner", branchId: "partner-onnut", module: "hotel", kind: "hotel-room-type", label: "โซนสงบ R02", capacityMode: "capacity", capacity: 1, serviceIds: ["onnut-hotel-stay"], hotelRole: "zone" },
  { id: "onnut-daycare-social", businessId: "business-paw-partner", branchId: "partner-onnut", module: "daycare", kind: "daycare-zone", label: "โซนสังคม", capacityMode: "capacity", capacity: 2, serviceIds: ["onnut-daycare-full-day"] },
  { id: "onnut-daycare-quiet", businessId: "business-paw-partner", branchId: "partner-onnut", module: "daycare", kind: "daycare-zone", label: "โซนสงบ", capacityMode: "capacity", capacity: 6, serviceIds: ["onnut-daycare-full-day"] },
] as const;

// BF-9 Team fixtures share the existing Business/Branch and Resource IDs.
// `team-nam` deliberately has two Branch IDs to prove that a multi-Branch
// person is one identity rather than duplicated rows.  The blocks are only a
// lightweight demo availability source; they are not attendance or timesheet
// records.
const TEAM_MEMBER_FIXTURE_CREATED_AT = "2026-08-17T03:00:00.000Z";

export const DEMO_TEAM_MEMBER_FIXTURES: readonly PrototypeTeamMember[] = [
  {
    staffId: "team-pim",
    businessId: "business-whisker-rest",
    branchIds: ["whisker-ari"],
    name: "พิมพ์ชนก",
    avatarSeed: "pim",
    role: "staff",
    capabilities: ["grooming"],
    active: true,
    availability: [
      { id: "team-pim-working", state: "working", start: "2026-08-18T08:00", end: "2026-08-18T18:00", note: null },
      { id: "team-pim-break", state: "break", start: "2026-08-18T12:00", end: "2026-08-18T13:00", note: "พักกลางวัน" },
    ],
    createdAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
    updatedAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
  },
  {
    staffId: "team-joy",
    businessId: "business-whisker-rest",
    branchIds: ["whisker-ari"],
    name: "จอย",
    avatarSeed: "joy",
    role: "staff",
    capabilities: ["grooming"],
    active: false,
    availability: [{ id: "team-joy-working", state: "working", start: "2026-08-18T08:00", end: "2026-08-18T18:00", note: "หยุดใช้งานใน prototype" }],
    createdAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
    updatedAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
  },
  {
    staffId: "team-nok",
    businessId: "business-whisker-rest",
    branchIds: ["whisker-thonglor"],
    name: "นก",
    avatarSeed: "nok",
    role: "staff",
    capabilities: ["grooming"],
    active: true,
    availability: [{ id: "team-nok-working", state: "working", start: "2026-08-18T08:00", end: "2026-08-18T17:00", note: null }],
    createdAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
    updatedAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
  },
  {
    staffId: "team-nam",
    businessId: "business-whisker-rest",
    branchIds: ["whisker-ari", "whisker-thonglor"],
    name: "น้ำ",
    avatarSeed: "nam",
    role: "manager",
    capabilities: ["front-desk", "hotel-care"],
    active: true,
    availability: [
      { id: "team-nam-working", state: "working", start: "2026-08-18T08:00", end: "2026-08-18T18:00", note: null },
      { id: "team-nam-time-off", state: "time-off", start: "2026-08-18T15:00", end: "2026-08-18T18:00", note: "ออกก่อนเวลา" },
    ],
    createdAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
    updatedAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
  },
  {
    staffId: "team-aom",
    businessId: "business-whisker-rest",
    branchIds: ["whisker-ari"],
    name: "อ้อม",
    avatarSeed: "aom",
    role: "staff",
    capabilities: ["hotel-care", "front-desk"],
    active: true,
    availability: [
      { id: "team-aom-working", state: "working", start: "2026-08-18T08:00", end: "2026-08-18T18:00", note: null },
      { id: "team-aom-break", state: "break", start: "2026-08-18T12:00", end: "2026-08-18T12:30", note: "พัก" },
    ],
    createdAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
    updatedAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
  },
  {
    staffId: "team-mint",
    businessId: "business-paw-partner",
    branchIds: ["partner-onnut"],
    name: "มิ้นท์",
    avatarSeed: "mint",
    role: "staff",
    capabilities: ["daycare", "hotel-care", "front-desk"],
    active: true,
    availability: [{ id: "team-mint-working", state: "working", start: "2026-08-18T08:00", end: "2026-08-18T18:00", note: null }],
    createdAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
    updatedAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
  },
  {
    staffId: "team-fern",
    businessId: "business-paw-partner",
    branchIds: ["partner-onnut"],
    name: "เฟิร์น",
    avatarSeed: "fern",
    role: "owner",
    capabilities: ["front-desk", "hotel-care"],
    active: true,
    availability: [
      { id: "team-fern-working", state: "working", start: "2026-08-18T08:00", end: "2026-08-18T18:00", note: null },
      { id: "team-fern-unavailable", state: "unavailable", start: "2026-08-18T08:00", end: "2026-08-18T18:00", note: "ไม่พร้อมรับงานวันนี้" },
    ],
    createdAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
    updatedAt: TEAM_MEMBER_FIXTURE_CREATED_AT,
  },
] as const;

const BOOKING_FIXTURE_CREATED_AT = "2026-08-17T03:00:00.000Z";

// Fixed BF-2 sample data. It intentionally contains a resource collision,
// an Ari room-type capacity collision on 19 Aug, and a full Daycare zone on
// 18 Aug so calendar recovery paths can be exercised locally.
export const DEMO_BOOKING_FIXTURES: readonly PrototypeBooking[] = [
  {
    bookingId: "booking-fixture-ari-grooming-1030",
    customer: { id: "booking-contact-nalin", name: "คุณนลิน" },
    pets: [{ id: "booking-pet-mochi", name: "Mochi", species: "cat" }],
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    serviceModule: "grooming",
    service: { id: "ari-grooming-bath-groom", label: "อาบน้ำ / ตัดขน" },
    timeModel: "appointment",
    start: "2026-08-18T10:30",
    end: "2026-08-18T12:00",
    requiredResources: ["groomer", "grooming-station", "dryer"],
    assignedResources: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"],
    status: "confirmed",
    estimate: 850,
    notes: "ใช้ตรวจสอบเวลาชน",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-ari-grooming-biscuit",
    customer: { id: "booking-contact-nalin", name: "คุณนลิน" },
    pets: [{ id: "booking-pet-biscuit", name: "Biscuit", species: "cat" }],
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    serviceModule: "grooming",
    service: { id: "ari-grooming-bath-groom", label: "อาบน้ำ / ตัดขน" },
    timeModel: "appointment",
    start: "2026-08-18T08:00",
    end: "2026-08-18T09:00",
    requiredResources: ["groomer", "grooming-station", "dryer"],
    assignedResources: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"],
    status: "arrived",
    estimate: 850,
    notes: "งานเช้าที่เสร็จแล้วสำหรับตรวจประวัติบริการ",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-ari-grooming-tofu-active",
    customer: { id: "booking-contact-pim", name: "คุณพิม" },
    pets: [{ id: "booking-pet-tofu", name: "Tofu", species: "dog" }],
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    serviceModule: "grooming",
    service: { id: "ari-grooming-bath-groom", label: "อาบน้ำ / ตัดขน" },
    timeModel: "appointment",
    start: "2026-08-18T09:15",
    end: "2026-08-18T10:45",
    requiredResources: ["groomer", "grooming-station", "dryer"],
    assignedResources: ["ari-groomer-joy", "ari-station-b", "ari-dryer-2"],
    status: "arrived",
    estimate: 850,
    notes: "ใช้แสดงงานที่กำลังรอช่างรับช่วง",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-ari-grooming-milo",
    customer: { id: "booking-contact-nalin", name: "คุณนลิน" },
    pets: [{ id: "booking-pet-milo", name: "Milo", species: "dog" }],
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    serviceModule: "grooming",
    service: { id: "ari-grooming-bath-groom", label: "อาบน้ำ / ตัดขน" },
    timeModel: "appointment",
    start: "2026-08-18T12:15",
    end: "2026-08-18T13:45",
    requiredResources: ["groomer", "grooming-station", "dryer"],
    assignedResources: ["ari-groomer-joy", "ari-station-b", "ari-dryer-2"],
    status: "arrived",
    estimate: 850,
    notes: "รอเจ้าของมารับหลังเสร็จบริการ",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-ari-grooming-luna",
    customer: { id: "booking-contact-pim", name: "คุณพิม" },
    pets: [{ id: "booking-pet-luna", name: "Luna", species: "cat" }],
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    serviceModule: "grooming",
    service: { id: "ari-grooming-bath-groom", label: "อาบน้ำ / ตัดขน" },
    timeModel: "appointment",
    start: "2026-08-18T14:30",
    end: "2026-08-18T16:00",
    requiredResources: ["groomer", "grooming-station", "dryer"],
    assignedResources: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"],
    status: "confirmed",
    estimate: 850,
    notes: "มีสิทธิ์สแกนรับเข้าเพื่อเชื่อม Intake กับงานนี้",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-ari-hotel-luna",
    customer: { id: "booking-contact-pim", name: "คุณพิม" },
    pets: [{ id: "booking-pet-luna", name: "Luna", species: "cat" }],
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    serviceModule: "hotel",
    service: { id: "ari-hotel-stay", label: "เข้าพักโรงแรม" },
    timeModel: "date-range",
    start: "2026-08-18",
    end: "2026-08-21",
    requiredResources: ["hotel-room-type"],
    assignedResources: ["ari-hotel-capacity"],
    status: "confirmed",
    estimate: 3600,
    notes: "เข้าพัก 3 คืน",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-ari-hotel-biscuit-checkout",
    customer: { id: "booking-contact-nalin", name: "คุณนลิน" },
    pets: [{ id: "booking-pet-biscuit", name: "Biscuit", species: "cat" }],
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    serviceModule: "hotel",
    service: { id: "ari-hotel-stay", label: "เข้าพักโรงแรม" },
    timeModel: "date-range",
    start: "2026-08-16",
    end: "2026-08-18",
    requiredResources: ["hotel-room-type"],
    assignedResources: ["ari-hotel-capacity"],
    status: "confirmed",
    estimate: 2400,
    notes: "เตรียมรับกลับวันนี้",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-ari-hotel-milo",
    customer: { id: "booking-contact-nalin", name: "คุณนลิน" },
    pets: [{ id: "booking-pet-milo", name: "Milo", species: "dog" }],
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    serviceModule: "hotel",
    service: { id: "ari-hotel-stay", label: "เข้าพักโรงแรม" },
    timeModel: "date-range",
    start: "2026-08-19",
    end: "2026-08-20",
    requiredResources: ["hotel-room-type"],
    assignedResources: ["ari-hotel-capacity"],
    status: "confirmed",
    estimate: 1200,
    notes: "พื้นที่พักเต็มในวันที่ 19 สิงหาคม",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    // A future grouped Booking proves that operational Stay and care state
    // stays per Pet even when the Customer contacts the Business once.
    bookingId: "booking-fixture-ari-hotel-nalin-pair",
    customer: { id: "booking-contact-nalin", name: "คุณนลิน" },
    pets: [
      { id: "booking-pet-mochi", name: "Mochi", species: "cat" },
      { id: "booking-pet-biscuit", name: "Biscuit", species: "cat" },
    ],
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    serviceModule: "hotel",
    service: { id: "ari-hotel-stay", label: "เข้าพักโรงแรม" },
    timeModel: "date-range",
    start: "2026-08-24",
    end: "2026-08-26",
    requiredResources: ["hotel-room-type"],
    assignedResources: ["ari-hotel-capacity"],
    status: "confirmed",
    estimate: 4800,
    notes: "ลูกค้าเข้าพักพร้อมน้องสองตัว แต่ต้องจัดห้องและดูแลแยกกัน",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-ari-cancelled",
    customer: { id: "booking-contact-pim", name: "คุณพิม" },
    pets: [{ id: "booking-pet-tofu", name: "Tofu", species: "dog" }],
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    serviceModule: "grooming",
    service: { id: "ari-grooming-bath-groom", label: "อาบน้ำ / ตัดขน" },
    timeModel: "appointment",
    start: "2026-08-18T14:00",
    end: "2026-08-18T15:30",
    requiredResources: ["groomer", "grooming-station", "dryer"],
    assignedResources: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"],
    status: "cancelled",
    estimate: 850,
    notes: "ยกเลิกแล้ว จึงไม่กินเวลาหรือทรัพยากร",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: "2026-08-17T04:00:00.000Z",
  },
  {
    bookingId: "booking-fixture-thonglor-grooming",
    customer: { id: "booking-contact-pim", name: "คุณพิม" },
    pets: [{ id: "booking-pet-tofu", name: "Tofu", species: "dog" }],
    businessId: "business-whisker-rest",
    branchId: "whisker-thonglor",
    serviceModule: "grooming",
    service: { id: "thonglor-grooming-bath", label: "อาบน้ำและตัดเล็บ" },
    timeModel: "appointment",
    start: "2026-08-18T10:45",
    end: "2026-08-18T11:45",
    requiredResources: ["groomer", "grooming-station", "dryer"],
    assignedResources: ["thonglor-groomer-nok", "thonglor-station-a", "thonglor-dryer-1"],
    status: "confirmed",
    estimate: 650,
    notes: "ตรวจสอบรายการก่อนเริ่มงาน",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-onnut-daycare-full",
    customer: { id: "booking-contact-onnut-aom", name: "คุณอ้อม" },
    pets: [
      { id: "booking-pet-pudding", name: "Pudding", species: "dog" },
      { id: "booking-pet-maple", name: "Maple", species: "dog" },
    ],
    businessId: "business-paw-partner",
    branchId: "partner-onnut",
    serviceModule: "daycare",
    service: { id: "onnut-daycare-full-day", label: "Daycare เต็มวัน" },
    timeModel: "day",
    start: BOOKING_DEMO_DATE,
    end: null,
    requiredResources: ["daycare-zone"],
    assignedResources: ["onnut-daycare-social"],
    status: "confirmed",
    estimate: 900,
    notes: "สองรายการทำให้โซนสังคมเต็มในวันที่ 18 สิงหาคม",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-onnut-hotel-leo",
    customer: { id: "booking-contact-onnut-lee", name: "คุณลี" },
    pets: [{ id: "booking-pet-leo", name: "Leo", species: "cat" }],
    businessId: "business-paw-partner",
    branchId: "partner-onnut",
    serviceModule: "hotel",
    service: { id: "onnut-hotel-stay", label: "เข้าพักโรงแรม" },
    timeModel: "date-range",
    start: "2026-08-18",
    end: "2026-08-20",
    requiredResources: ["hotel-room-type"],
    assignedResources: ["onnut-hotel-capacity"],
    status: "pending",
    estimate: 2000,
    notes: "ตรวจสอบรายการก่อนเริ่มงาน",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
] as const;

const SERVICE_JOB_FIXTURE_CREATED_AT = "2026-08-18T01:00:00.000Z";

// BF-5 execution fixtures reference the shared Booking, Customer/Pet, and
// Resource fixtures above. They intentionally do not copy Customer/Pet data.
// Each Grooming Job represents one Pet's work inside a Booking; grouped
// Booking policy remains an open product question.
export const DEMO_GROOMING_SERVICE_JOB_FIXTURES: readonly PrototypeServiceJob[] = [
  {
    serviceJobId: "grooming-job-fixture-biscuit",
    bookingId: "booking-fixture-ari-grooming-biscuit",
    intakeId: null,
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    petId: "booking-pet-biscuit",
    serviceModule: "grooming",
    baseServiceId: "ari-grooming-bath-groom",
    scheduledStart: "2026-08-18T08:00",
    scheduledEnd: "2026-08-18T09:00",
    estimatedDurationMinutes: 60,
    actualStartedAt: "2026-08-18T08:04:00.000Z",
    actualCompletedAt: "2026-08-18T09:08:00.000Z",
    assignedResourceIds: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"],
    status: "completed",
    businessNote: "เช็กความเรียบร้อยก่อนส่งกลับแล้ว",
    addOns: [],
    history: [
      { id: "history-biscuit-created", at: SERVICE_JOB_FIXTURE_CREATED_AT, type: "created", summary: "สร้างงานจากการจอง" },
      { id: "history-biscuit-completed", at: "2026-08-18T09:08:00.000Z", type: "status", summary: "งานเสร็จแล้ว" },
    ],
    createdAt: SERVICE_JOB_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T09:08:00.000Z",
    cancelledAt: null,
  },
  {
    serviceJobId: "grooming-job-fixture-tofu",
    bookingId: "booking-fixture-ari-grooming-tofu-active",
    intakeId: null,
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-pim",
    petId: "booking-pet-tofu",
    serviceModule: "grooming",
    baseServiceId: "ari-grooming-bath-groom",
    scheduledStart: "2026-08-18T09:15",
    scheduledEnd: "2026-08-18T10:45",
    estimatedDurationMinutes: 90,
    actualStartedAt: null,
    actualCompletedAt: null,
    // Planned assignment stays on Booking. This execution Job intentionally
    // awaits a groomer hand-off so the attention state remains actionable.
    assignedResourceIds: ["ari-station-b", "ari-dryer-2"],
    status: "waiting",
    businessNote: "รอระบุช่างก่อนเริ่มงาน",
    addOns: [],
    history: [
      { id: "history-tofu-created", at: SERVICE_JOB_FIXTURE_CREATED_AT, type: "created", summary: "สร้างงานจากการจอง" },
      { id: "history-tofu-waiting", at: "2026-08-18T02:20:00.000Z", type: "status", summary: "รับเข้าแล้ว รอเริ่มบริการ" },
    ],
    createdAt: SERVICE_JOB_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T02:20:00.000Z",
    cancelledAt: null,
  },
  {
    serviceJobId: "grooming-job-fixture-mochi",
    bookingId: "booking-fixture-ari-grooming-1030",
    intakeId: null,
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    petId: "booking-pet-mochi",
    serviceModule: "grooming",
    baseServiceId: "ari-grooming-bath-groom",
    scheduledStart: "2026-08-18T10:30",
    scheduledEnd: "2026-08-18T12:00",
    estimatedDurationMinutes: 90,
    actualStartedAt: "2026-08-18T10:42:00.000Z",
    actualCompletedAt: null,
    assignedResourceIds: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"],
    status: "in-service",
    businessNote: "ดูแลบริเวณขาหน้าตามที่ลูกค้าแจ้ง",
    addOns: [],
    history: [
      { id: "history-mochi-created", at: SERVICE_JOB_FIXTURE_CREATED_AT, type: "created", summary: "สร้างงานจากการจอง" },
      { id: "history-mochi-started", at: "2026-08-18T10:42:00.000Z", type: "status", summary: "เริ่มอาบน้ำ / ตัดขน" },
    ],
    createdAt: SERVICE_JOB_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T10:42:00.000Z",
    cancelledAt: null,
  },
  {
    serviceJobId: "grooming-job-fixture-milo",
    bookingId: "booking-fixture-ari-grooming-milo",
    intakeId: null,
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    petId: "booking-pet-milo",
    serviceModule: "grooming",
    baseServiceId: "ari-grooming-bath-groom",
    scheduledStart: "2026-08-18T12:15",
    scheduledEnd: "2026-08-18T13:45",
    estimatedDurationMinutes: 90,
    actualStartedAt: "2026-08-18T12:17:00.000Z",
    actualCompletedAt: null,
    assignedResourceIds: ["ari-groomer-joy", "ari-station-b", "ari-dryer-2"],
    status: "ready-for-pickup",
    businessNote: "แจ้งลูกค้าก่อนรับกลับตามหมายเหตุของร้าน",
    addOns: [],
    history: [
      { id: "history-milo-created", at: SERVICE_JOB_FIXTURE_CREATED_AT, type: "created", summary: "สร้างงานจากการจอง" },
      { id: "history-milo-ready", at: "2026-08-18T13:38:00.000Z", type: "status", summary: "พร้อมรับกลับ" },
    ],
    createdAt: SERVICE_JOB_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T13:38:00.000Z",
    cancelledAt: null,
  },
  {
    serviceJobId: "grooming-job-fixture-luna",
    bookingId: "booking-fixture-ari-grooming-luna",
    intakeId: null,
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-pim",
    petId: "booking-pet-luna",
    serviceModule: "grooming",
    baseServiceId: "ari-grooming-bath-groom",
    scheduledStart: "2026-08-18T14:30",
    scheduledEnd: "2026-08-18T16:00",
    estimatedDurationMinutes: 90,
    actualStartedAt: null,
    actualCompletedAt: null,
    assignedResourceIds: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"],
    status: "booked",
    businessNote: "รอรับเข้า · เชื่อมได้จาก QR Intake fixture",
    addOns: [],
    history: [{ id: "history-luna-created", at: SERVICE_JOB_FIXTURE_CREATED_AT, type: "created", summary: "สร้างงานจากการจอง" }],
    createdAt: SERVICE_JOB_FIXTURE_CREATED_AT,
    updatedAt: SERVICE_JOB_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
] as const;

const HOTEL_STAY_FIXTURE_CREATED_AT = "2026-08-18T01:00:00.000Z";

// BF-6 execution fixtures intentionally reference Booking, Customer/Pet, and
// shared Room/Zone resources by ID only. They are not a mirror of Passport
// data, and a grouped Booking projects one independent Stay per Pet.
export const DEMO_HOTEL_STAY_FIXTURES: readonly PrototypeHotelStay[] = [
  {
    hotelStayId: "hotel-stay-fixture-luna",
    bookingId: "booking-fixture-ari-hotel-luna",
    intakeId: "prototype-intake-hotel-luna",
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-pim",
    petId: "booking-pet-luna",
    scheduledCheckIn: "2026-08-18",
    scheduledCheckOut: "2026-08-21",
    actualCheckInAt: "2026-08-18T08:40:00.000Z",
    actualCheckOutAt: null,
    status: "in-stay",
    roomAssignments: [{
      id: "hotel-room-assignment-luna-a01",
      roomId: "ari-hotel-room-a01",
      startDate: "2026-08-18",
      endDate: "2026-08-21",
      assignedAt: "2026-08-18T08:40:00.000Z",
      assignedBy: "พนักงานรับเข้า",
      reason: null,
    }],
    roomMoveHistory: [],
    guardianCareInstruction: "ให้อาหารตามตารางที่ลูกค้าแจ้ง และแยกชามน้ำไว้ในห้อง",
    businessNote: "สังเกตน้ำดื่มช่วงบ่ายก่อนส่งอัปเดตให้เจ้าของ",
    dailyCareTasks: [
      { id: "hotel-care-luna-breakfast", kind: "meal", label: "อาหารเช้า", scheduledDate: BOOKING_DEMO_DATE, scheduledTime: "08:00", assignedStaffId: "team-nam", state: "completed", completedAt: "2026-08-18T08:06:00.000Z", completedBy: "พนักงานรับเข้า" },
      { id: "hotel-care-luna-water", kind: "water", label: "ตรวจน้ำ", scheduledDate: BOOKING_DEMO_DATE, scheduledTime: "12:00", state: "pending", completedAt: null, completedBy: null },
      {
        id: "hotel-care-luna-medication",
        kind: "medication",
        label: "ให้ยาตามคำแนะนำที่ยืนยันไว้",
        scheduledDate: BOOKING_DEMO_DATE,
        scheduledTime: "14:00",
        state: "pending",
        completedAt: null,
        completedBy: null,
        instructions: "ทำตามคำแนะนำที่ลูกค้ายืนยันกับร้านใน Intake เท่านั้น",
        authorization: {
          source: "customer-confirmed-intake",
          intakeId: "prototype-intake-hotel-luna",
          confirmedAt: "2026-08-18T08:35:00.000Z",
        },
      },
      { id: "hotel-care-luna-evening", kind: "meal", label: "อาหารเย็น", scheduledDate: BOOKING_DEMO_DATE, scheduledTime: "18:00", state: "pending", completedAt: null, completedBy: null },
      { id: "hotel-care-luna-clean", kind: "cleaning", label: "ทำความสะอาดห้อง", scheduledDate: BOOKING_DEMO_DATE, scheduledTime: "16:00", assignedStaffId: "team-aom", state: "pending", completedAt: null, completedBy: null },
    ],
    incidentNotes: [{
      id: "hotel-incident-luna-water-bowl",
      summary: "ชามน้ำหกในห้อง ตรวจพื้นที่และติดตามก่อนมื้อเย็น",
      severity: "attention",
      createdAt: "2026-08-18T11:50:00.000Z",
      createdBy: "พนักงานรับเข้า",
      resolvedAt: null,
      resolvedBy: null,
    }],
    history: [
      { id: "hotel-history-luna-created", at: HOTEL_STAY_FIXTURE_CREATED_AT, type: "created", summary: "สร้างรายการเข้าพักจากการจอง" },
      { id: "hotel-history-luna-check-in", at: "2026-08-18T08:40:00.000Z", type: "intake", summary: "รับเข้าจาก Intake และระบุห้อง A01" },
      { id: "hotel-history-luna-in-stay", at: "2026-08-18T08:45:00.000Z", type: "status", summary: "เริ่มการเข้าพัก" },
    ],
    createdAt: HOTEL_STAY_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T08:45:00.000Z",
    cancelledAt: null,
  },
  {
    hotelStayId: "hotel-stay-fixture-biscuit-checkout",
    bookingId: "booking-fixture-ari-hotel-biscuit-checkout",
    intakeId: null,
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    petId: "booking-pet-biscuit",
    scheduledCheckIn: "2026-08-16",
    scheduledCheckOut: "2026-08-18",
    actualCheckInAt: "2026-08-16T10:20:00.000Z",
    actualCheckOutAt: null,
    status: "ready-for-checkout",
    roomAssignments: [{
      id: "hotel-room-assignment-biscuit-a01",
      roomId: "ari-hotel-room-a01",
      startDate: "2026-08-16",
      endDate: "2026-08-17",
      assignedAt: "2026-08-16T10:20:00.000Z",
      assignedBy: "พนักงานรับเข้า",
      reason: null,
    }, {
      id: "hotel-room-assignment-biscuit-a02",
      roomId: "ari-hotel-room-a02",
      startDate: "2026-08-17",
      endDate: "2026-08-18",
      assignedAt: "2026-08-17T09:15:00.000Z",
      assignedBy: "พนักงานรับเข้า",
      reason: "ย้ายเพื่อเตรียมห้องเดิมสำหรับทำความสะอาด",
    }],
    roomMoveHistory: [{
      id: "hotel-room-move-biscuit-a01-a02",
      movedAt: "2026-08-17T09:15:00.000Z",
      fromRoomId: "ari-hotel-room-a01",
      toRoomId: "ari-hotel-room-a02",
      reason: "ย้ายเพื่อเตรียมห้องเดิมสำหรับทำความสะอาด",
    }],
    guardianCareInstruction: null,
    businessNote: "ตรวจของที่นำมาด้วยก่อนส่งกลับ",
    dailyCareTasks: [
      { id: "hotel-care-biscuit-breakfast", kind: "meal", label: "อาหารเช้า", scheduledDate: BOOKING_DEMO_DATE, scheduledTime: "08:00", state: "completed", completedAt: "2026-08-18T08:05:00.000Z", completedBy: "พนักงานรับเข้า" },
      { id: "hotel-care-biscuit-check", kind: "check", label: "ตรวจความพร้อมรับกลับ", scheduledDate: BOOKING_DEMO_DATE, scheduledTime: "11:30", assignedStaffId: "team-nam", state: "pending", completedAt: null, completedBy: null },
    ],
    incidentNotes: [],
    history: [
      { id: "hotel-history-biscuit-created", at: "2026-08-16T10:10:00.000Z", type: "created", summary: "สร้างรายการเข้าพักจากการจอง" },
      { id: "hotel-history-biscuit-move", at: "2026-08-17T09:15:00.000Z", type: "room-move", summary: "ย้ายจากห้อง A01 ไปห้อง A02" },
      { id: "hotel-history-biscuit-ready", at: "2026-08-18T09:10:00.000Z", type: "status", summary: "เตรียมพร้อมรับกลับ" },
    ],
    createdAt: "2026-08-16T10:10:00.000Z",
    updatedAt: "2026-08-18T09:10:00.000Z",
    cancelledAt: null,
  },
  {
    hotelStayId: "hotel-stay-fixture-milo",
    bookingId: "booking-fixture-ari-hotel-milo",
    intakeId: null,
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    petId: "booking-pet-milo",
    scheduledCheckIn: "2026-08-19",
    scheduledCheckOut: "2026-08-20",
    actualCheckInAt: null,
    actualCheckOutAt: null,
    status: "booked",
    roomAssignments: [{
      id: "hotel-room-assignment-milo-b03",
      roomId: "ari-hotel-room-b03",
      startDate: "2026-08-19",
      endDate: "2026-08-20",
      assignedAt: HOTEL_STAY_FIXTURE_CREATED_AT,
      assignedBy: "พนักงานรับเข้า",
      reason: "สำรองห้องก่อนวันเข้าพัก",
    }],
    roomMoveHistory: [],
    guardianCareInstruction: null,
    businessNote: "รอเลือกห้องในวันรับเข้า",
    dailyCareTasks: [],
    incidentNotes: [],
    history: [{ id: "hotel-history-milo-created", at: HOTEL_STAY_FIXTURE_CREATED_AT, type: "created", summary: "สร้างรายการเข้าพักจากการจอง" }],
    createdAt: HOTEL_STAY_FIXTURE_CREATED_AT,
    updatedAt: HOTEL_STAY_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    hotelStayId: "hotel-stay-fixture-mochi-pair",
    bookingId: "booking-fixture-ari-hotel-nalin-pair",
    intakeId: null,
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    petId: "booking-pet-mochi",
    scheduledCheckIn: "2026-08-24",
    scheduledCheckOut: "2026-08-26",
    actualCheckInAt: null,
    actualCheckOutAt: null,
    status: "booked",
    roomAssignments: [],
    roomMoveHistory: [],
    guardianCareInstruction: null,
    businessNote: "รายการเข้าพักร่วมกับ Biscuit แต่ดูแลแยกตามน้อง",
    dailyCareTasks: [],
    incidentNotes: [],
    history: [{ id: "hotel-history-mochi-pair-created", at: HOTEL_STAY_FIXTURE_CREATED_AT, type: "created", summary: "สร้างรายการเข้าพักจากการจองแบบหลายตัว" }],
    createdAt: HOTEL_STAY_FIXTURE_CREATED_AT,
    updatedAt: HOTEL_STAY_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    hotelStayId: "hotel-stay-fixture-biscuit-pair",
    bookingId: "booking-fixture-ari-hotel-nalin-pair",
    intakeId: null,
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    petId: "booking-pet-biscuit",
    scheduledCheckIn: "2026-08-24",
    scheduledCheckOut: "2026-08-26",
    actualCheckInAt: null,
    actualCheckOutAt: null,
    status: "booked",
    roomAssignments: [],
    roomMoveHistory: [],
    guardianCareInstruction: null,
    businessNote: "รายการเข้าพักร่วมกับ Mochi แต่ดูแลแยกตามน้อง",
    dailyCareTasks: [],
    incidentNotes: [],
    history: [{ id: "hotel-history-biscuit-pair-created", at: HOTEL_STAY_FIXTURE_CREATED_AT, type: "created", summary: "สร้างรายการเข้าพักจากการจองแบบหลายตัว" }],
    createdAt: HOTEL_STAY_FIXTURE_CREATED_AT,
    updatedAt: HOTEL_STAY_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    hotelStayId: "hotel-stay-fixture-leo",
    bookingId: "booking-fixture-onnut-hotel-leo",
    intakeId: null,
    businessId: "business-paw-partner",
    branchId: "partner-onnut",
    customerId: "booking-contact-onnut-lee",
    petId: "booking-pet-leo",
    scheduledCheckIn: "2026-08-18",
    scheduledCheckOut: "2026-08-20",
    actualCheckInAt: null,
    actualCheckOutAt: null,
    status: "expected-today",
    roomAssignments: [{
      id: "hotel-room-assignment-leo-r01",
      roomId: "onnut-hotel-room-r01",
      startDate: "2026-08-18",
      endDate: "2026-08-20",
      assignedAt: HOTEL_STAY_FIXTURE_CREATED_AT,
      assignedBy: "ผู้ประสานงานดูแล",
      reason: "สำรองห้องก่อนรับเข้า",
    }],
    roomMoveHistory: [],
    guardianCareInstruction: null,
    businessNote: "รอสแกน Intake และเลือกห้องก่อนรับเข้า",
    dailyCareTasks: [],
    incidentNotes: [],
    history: [{ id: "hotel-history-leo-created", at: HOTEL_STAY_FIXTURE_CREATED_AT, type: "created", summary: "สร้างรายการเข้าพักจากการจอง" }],
    createdAt: HOTEL_STAY_FIXTURE_CREATED_AT,
    updatedAt: HOTEL_STAY_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
] as const;

const DAYCARE_ATTENDANCE_FIXTURE_CREATED_AT = "2026-08-18T01:00:00.000Z";

export const DEMO_DAYCARE_ATTENDANCE_FIXTURES: readonly PrototypeDaycareAttendance[] = [
  {
    daycareAttendanceId: "daycare-attendance-fixture-pudding",
    bookingId: "booking-fixture-onnut-daycare-full",
    intakeId: null,
    businessId: "business-paw-partner",
    branchId: "partner-onnut",
    customerId: "booking-contact-onnut-aom",
    petId: "booking-pet-pudding",
    attendanceDate: BOOKING_DEMO_DATE,
    dropOffWindow: "08:30–09:30",
    pickupWindow: "17:00–18:00",
    status: "active",
    zoneId: "onnut-daycare-social",
    responsibleStaffId: "team-mint",
    checkedInAt: "2026-08-18T09:12:00.000Z",
    activatedAt: "2026-08-18T09:20:00.000Z",
    readyForPickupAt: null,
    checkedOutAt: null,
    completedAt: null,
    businessNote: "ชอบพักมุมเงียบหลังเล่น",
    careEvents: [
      { id: "daycare-care-pudding-water", kind: "water", label: "เติมน้ำ", note: null, occurredAt: "2026-08-18T10:15:00.000Z", staffId: "team-mint" },
      { id: "daycare-care-pudding-play", kind: "activity", label: "เล่นกลุ่มเล็ก", note: "เล่นได้ตามปกติ", occurredAt: "2026-08-18T11:20:00.000Z", staffId: "team-mint" },
    ],
    history: [
      { id: "daycare-history-pudding-created", at: DAYCARE_ATTENDANCE_FIXTURE_CREATED_AT, type: "created", summary: "สร้างรายการ Daycare จากการจอง" },
      { id: "daycare-history-pudding-checkin", at: "2026-08-18T09:12:00.000Z", type: "status", summary: "รับน้องเข้า Daycare" },
      { id: "daycare-history-pudding-active", at: "2026-08-18T09:20:00.000Z", type: "status", summary: "เริ่มดูแลในโซนสังคม" },
    ],
    createdAt: DAYCARE_ATTENDANCE_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T11:20:00.000Z",
    cancelledAt: null,
  },
  {
    daycareAttendanceId: "daycare-attendance-fixture-maple",
    bookingId: "booking-fixture-onnut-daycare-full",
    intakeId: null,
    businessId: "business-paw-partner",
    branchId: "partner-onnut",
    customerId: "booking-contact-onnut-aom",
    petId: "booking-pet-maple",
    attendanceDate: BOOKING_DEMO_DATE,
    dropOffWindow: "08:30–09:30",
    pickupWindow: "17:00–18:00",
    status: "ready-for-pickup",
    zoneId: "onnut-daycare-social",
    responsibleStaffId: "team-mint",
    checkedInAt: "2026-08-18T09:08:00.000Z",
    activatedAt: "2026-08-18T09:18:00.000Z",
    readyForPickupAt: "2026-08-18T16:45:00.000Z",
    checkedOutAt: null,
    completedAt: null,
    businessNote: "รับกลับช่วง 17:00",
    careEvents: [
      { id: "daycare-care-maple-meal", kind: "meal", label: "ให้อาหารกลางวัน", note: "ทานครบ", occurredAt: "2026-08-18T12:10:00.000Z", staffId: "team-mint" },
      { id: "daycare-care-maple-rest", kind: "rest", label: "พักผ่อน", note: null, occurredAt: "2026-08-18T14:00:00.000Z", staffId: "team-mint" },
    ],
    history: [
      { id: "daycare-history-maple-created", at: DAYCARE_ATTENDANCE_FIXTURE_CREATED_AT, type: "created", summary: "สร้างรายการ Daycare จากการจอง" },
      { id: "daycare-history-maple-checkin", at: "2026-08-18T09:08:00.000Z", type: "status", summary: "รับน้องเข้า Daycare" },
      { id: "daycare-history-maple-ready", at: "2026-08-18T16:45:00.000Z", type: "status", summary: "พร้อมรับกลับ" },
    ],
    createdAt: DAYCARE_ATTENDANCE_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T16:45:00.000Z",
    cancelledAt: null,
  },
] as const;

// BF-7 financial fixtures intentionally live beside Booking/Job/Stay fixtures
// and are consumed through the same selectors as local mutations. They are
// not a second revenue fixture for Home.
const BILLING_FIXTURE_CREATED_AT = "2026-08-18T09:10:00.000Z";

export const DEMO_BILLING_CHARGE_FIXTURES: readonly PrototypeCharge[] = [
  {
    chargeId: "charge-fixture-ari-biscuit-grooming",
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    petId: "booking-pet-biscuit",
    bookingId: "booking-fixture-ari-grooming-biscuit",
    serviceJobId: "grooming-job-fixture-biscuit",
    hotelStayId: null,
    serviceModule: "grooming",
    serviceLabel: "อาบน้ำ / ตัดขน",
    lineItems: [{ id: "charge-line-biscuit-base", kind: "base-service", label: "อาบน้ำ / ตัดขน", amount: 850, reason: null, sourceRequestId: null, serviceJobId: "grooming-job-fixture-biscuit", hotelStayId: null, createdAt: BILLING_FIXTURE_CREATED_AT }],
    cancelledAt: null,
    cancellationReason: null,
    history: [{ id: "charge-history-biscuit-created", at: BILLING_FIXTURE_CREATED_AT, type: "created", summary: "สร้างยอดจากรายการบริการ" }],
    createdAt: BILLING_FIXTURE_CREATED_AT,
    updatedAt: BILLING_FIXTURE_CREATED_AT,
  },
  {
    chargeId: "charge-fixture-ari-milo-grooming",
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    petId: "booking-pet-milo",
    bookingId: "booking-fixture-ari-grooming-milo",
    serviceJobId: "grooming-job-fixture-milo",
    hotelStayId: null,
    serviceModule: "grooming",
    serviceLabel: "อาบน้ำ / ตัดขน",
    lineItems: [
      { id: "charge-line-milo-base", kind: "base-service", label: "อาบน้ำ / ตัดขน", amount: 850, reason: null, sourceRequestId: null, serviceJobId: "grooming-job-fixture-milo", hotelStayId: null, createdAt: BILLING_FIXTURE_CREATED_AT },
      { id: "charge-line-milo-deshed", kind: "add-on", label: "แกะสางขน", amount: 300, reason: "บริการเพิ่มเติมที่อนุมัติแล้ว", sourceRequestId: "fixture-addon-milo-deshed", serviceJobId: "grooming-job-fixture-milo", hotelStayId: null, createdAt: BILLING_FIXTURE_CREATED_AT },
    ],
    cancelledAt: null,
    cancellationReason: null,
    history: [
      { id: "charge-history-milo-created", at: BILLING_FIXTURE_CREATED_AT, type: "created", summary: "สร้างยอดจากรายการบริการ" },
      { id: "charge-history-milo-addon", at: "2026-08-18T13:39:00.000Z", type: "adjusted", summary: "เพิ่มบริการแกะสางขนที่อนุมัติแล้ว" },
    ],
    createdAt: BILLING_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T13:39:00.000Z",
  },
  {
    chargeId: "charge-fixture-ari-biscuit-hotel",
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    petId: "booking-pet-biscuit",
    bookingId: "booking-fixture-ari-hotel-biscuit-checkout",
    serviceJobId: null,
    hotelStayId: "hotel-stay-fixture-biscuit-checkout",
    serviceModule: "hotel",
    serviceLabel: "เข้าพักโรงแรม",
    lineItems: [{ id: "charge-line-biscuit-hotel-base", kind: "base-service", label: "เข้าพักโรงแรม 2 คืน", amount: 2400, reason: null, sourceRequestId: null, serviceJobId: null, hotelStayId: "hotel-stay-fixture-biscuit-checkout", createdAt: "2026-08-18T09:20:00.000Z" }],
    cancelledAt: null,
    cancellationReason: null,
    history: [{ id: "charge-history-biscuit-hotel-created", at: "2026-08-18T09:20:00.000Z", type: "created", summary: "สร้างยอดจากรายการเข้าพัก" }],
    createdAt: "2026-08-18T09:20:00.000Z",
    updatedAt: "2026-08-18T09:20:00.000Z",
  },
  {
    chargeId: "charge-fixture-thonglor-tofu-grooming",
    businessId: "business-whisker-rest",
    branchId: "whisker-thonglor",
    customerId: "booking-contact-pim",
    petId: "booking-pet-tofu",
    bookingId: "booking-fixture-thonglor-grooming",
    serviceJobId: null,
    hotelStayId: null,
    serviceModule: "grooming",
    serviceLabel: "อาบน้ำและตัดเล็บ",
    lineItems: [{ id: "charge-line-thonglor-tofu-base", kind: "base-service", label: "อาบน้ำและตัดเล็บ", amount: 650, reason: null, sourceRequestId: null, serviceJobId: null, hotelStayId: null, createdAt: "2026-08-18T11:48:00.000Z" }],
    cancelledAt: null,
    cancellationReason: null,
    history: [{ id: "charge-history-thonglor-tofu-created", at: "2026-08-18T11:48:00.000Z", type: "created", summary: "สร้างยอดจากรายการบริการ" }],
    createdAt: "2026-08-18T11:48:00.000Z",
    updatedAt: "2026-08-18T11:48:00.000Z",
  },
  {
    chargeId: "charge-fixture-onnut-leo-hotel",
    businessId: "business-paw-partner",
    branchId: "partner-onnut",
    customerId: "booking-contact-onnut-lee",
    petId: "booking-pet-leo",
    bookingId: "booking-fixture-onnut-hotel-leo",
    serviceJobId: null,
    hotelStayId: "hotel-stay-fixture-leo",
    serviceModule: "hotel",
    serviceLabel: "เข้าพักโรงแรม",
    lineItems: [{ id: "charge-line-onnut-leo-base", kind: "base-service", label: "เข้าพักโรงแรม 2 คืน", amount: 2000, reason: null, sourceRequestId: null, serviceJobId: null, hotelStayId: "hotel-stay-fixture-leo", createdAt: "2026-08-18T09:25:00.000Z" }],
    cancelledAt: null,
    cancellationReason: null,
    history: [{ id: "charge-history-onnut-leo-created", at: "2026-08-18T09:25:00.000Z", type: "created", summary: "สร้างยอดจากรายการเข้าพัก" }],
    createdAt: "2026-08-18T09:25:00.000Z",
    updatedAt: "2026-08-18T09:25:00.000Z",
  },
] as const;

export const DEMO_BILLING_PAYMENT_FIXTURES: readonly PrototypePayment[] = [
  {
    paymentId: "payment-fixture-ari-biscuit-cash",
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    method: "cash",
    amount: 850,
    allocations: [{ chargeId: "charge-fixture-ari-biscuit-grooming", amount: 850 }],
    note: "รับชำระหน้าร้าน",
    requestKey: "fixture-payment-ari-biscuit-cash",
    recordedAt: "2026-08-18T09:16:00.000Z",
  },
  {
    paymentId: "payment-fixture-ari-milo-transfer",
    businessId: "business-whisker-rest",
    branchId: "whisker-ari",
    customerId: "booking-contact-nalin",
    method: "bank-transfer",
    amount: 500,
    allocations: [{ chargeId: "charge-fixture-ari-milo-grooming", amount: 500 }],
    note: "ชำระบางส่วน",
    requestKey: "fixture-payment-ari-milo-transfer",
    recordedAt: "2026-08-18T13:45:00.000Z",
  },
  {
    paymentId: "payment-fixture-thonglor-tofu-cash",
    businessId: "business-whisker-rest",
    branchId: "whisker-thonglor",
    customerId: "booking-contact-pim",
    method: "cash",
    amount: 650,
    allocations: [{ chargeId: "charge-fixture-thonglor-tofu-grooming", amount: 650 }],
    note: "รับชำระหน้าร้าน",
    requestKey: "fixture-payment-thonglor-tofu-cash",
    recordedAt: "2026-08-18T11:52:00.000Z",
  },
] as const;

const DEMO_BUSINESS_HOME: Record<string, BusinessHomeDemo> = {
  "whisker-ari-frontdesk": {
    today: { waitingIntake: 3 },
    attention: [
      { id: "approval", tone: "waiting", title: "รอเจ้าของอนุมัติข้อมูล 2 รายการ", detail: "ต้องได้รับคำตอบก่อนยืนยันรับเข้า" },
    ],
    moduleSummaries: {},
  },
  "whisker-thonglor-frontdesk": {
    today: { waitingIntake: 2 },
    attention: [
      { id: "approval", tone: "waiting", title: "รอเจ้าของอนุมัติข้อมูล 1 รายการ", detail: "ต้องได้รับคำตอบก่อนยืนยันรับเข้า" },
    ],
    moduleSummaries: {},
  },
  "paw-partner-onnut": {
    today: { waitingIntake: 1, readyForPickup: 3 },
    attention: [
      { id: "approval", tone: "waiting", title: "รอเจ้าของอนุมัติข้อมูล 1 รายการ", detail: "ต้องได้รับคำตอบก่อนยืนยันรับเข้า" },
      { id: "pickup", tone: "ready", title: "มีน้องพร้อมรับกลับ 3 ตัว", detail: "ตรวจของที่นำมาด้วยก่อนส่งมอบ" },
    ],
    moduleSummaries: {
      daycare: { value: "7 / 12 ตัวในพื้นที่ดูแล", detail: "ภาพรวมความจุ" },
    },
  },
};

export const DEFAULT_BUSINESS_CONTEXT_KEY = DEMO_BUSINESS_CONTEXTS[0].key;
export const BUSINESS_STORAGE_KEY = "meawketting:business-intake:prototype-v1";

export function businessRoleLabel(role: string) {
  if (role === "Front desk staff (Demo)") return "พนักงานรับเข้า";
  if (role === "Care coordinator (Demo)") return "ผู้ประสานงานดูแล";
  return role;
}

export function businessStaffLabel(label: string) {
  return label.replace(" · Prototype", "");
}

export type IntakeTaskState = "allowed-data" | "intake" | "review" | "complete";
export type CheckInState = "draft" | "submitting" | "checked-in";
export type CorrectionTopic = "name" | "species" | "passport-reference";

export type CorrectionSuggestion = {
  id: string;
  topic: CorrectionTopic;
  currentValue: string;
  suggestedValue: string;
  note: string;
  submittedAt: string;
  status: "submitted" | "submitted-prototype";
};

export type BusinessIntakeRecord = {
  id: string;
  accessId: string;
  businessId: string;
  branchId: string;
  customerId: string | null;
  petRelationshipId: string | null;
  serviceJobId: string | null;
  // Optional BF-6 execution handoff. This references a Stay rather than
  // inventing a second intake subsystem for Hotel.
  hotelStayId: string | null;
  // Optional BF-11 handoff to the Pet-specific Daycare attendance record.
  daycareAttendanceId?: string | null;
  role: string;
  staffLabel: string;
  servicePurpose: string;
  sharedScope: ShareableScopeKey[];
  belongings: string[];
  businessNote: string;
  correctionSuggestion: CorrectionSuggestion | null;
  taskState: IntakeTaskState;
  checkInState: CheckInState;
  createdAt: string;
  updatedAt: string;
  checkedInAt: string | null;
  prototypeSessionReference: string | null;
};

type BusinessStore = {
  activeContextKey: string;
  intakes: Record<string, BusinessIntakeRecord>;
  // BF-9 adds People to the same local Business envelope.  Resource fixtures
  // remain the canonical capacity registry; this slice stores only identity,
  // Branch assignment, capabilities, active state, and lightweight
  // availability.
  teamMembers: Record<string, PrototypeTeamMember>;
  // Compatibility-only empty slot. BE3 intentionally ignores the former
  // browser Booking map and never writes durable Booking truth here.
  bookings: Record<string, PrototypeBooking>;
  serviceJobs: Record<string, PrototypeServiceJob>;
  hotelStays: Record<string, PrototypeHotelStay>;
  daycareAttendances: Record<string, PrototypeDaycareAttendance>;
  customers: Record<string, PrototypeCustomer>;
  charges: Record<string, PrototypeCharge>;
  payments: Record<string, PrototypePayment>;
  // BF-8 extends the same local envelope; Service Records are not a separate
  // Customer, Inbox, Billing, or Pet Passport store.
  serviceRecords: Record<string, PrototypeServiceRecord>;
};

export type QrContractType = "quick-passport" | "public-safety" | "temporary-business" | "unknown";

export type CheckInResult =
  | { ok: true; record: BusinessIntakeRecord; duplicate: boolean }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "revoked" | "wrong-business" | "changed" };

const emptyStore = (): BusinessStore => ({
  activeContextKey: DEFAULT_BUSINESS_CONTEXT_KEY,
  intakes: {},
  teamMembers: {},
  bookings: {},
  serviceJobs: {},
  hotelStays: {},
  daycareAttendances: {},
  customers: {},
  charges: {},
  payments: {},
  serviceRecords: {},
});

function readStore(): BusinessStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.sessionStorage.getItem(BUSINESS_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<BusinessStore>;
    return {
      activeContextKey: typeof parsed.activeContextKey === "string" ? parsed.activeContextKey : DEFAULT_BUSINESS_CONTEXT_KEY,
      intakes: BUSINESS_FIXTURE_TEST_MODE && parsed.intakes && typeof parsed.intakes === "object" && !Array.isArray(parsed.intakes) ? parsed.intakes : {},
      // BF-9 is additive; a BF-1–BF-8 browser session has no Team slice until
      // the first Team mutation and therefore remains compatible.
      teamMembers: BUSINESS_FIXTURE_TEST_MODE && parsed.teamMembers && typeof parsed.teamMembers === "object" && !Array.isArray(parsed.teamMembers) ? parsed.teamMembers : {},
      // BE3 has no browser backfill. A pre-BE3 session Booking is deliberately
      // ignored instead of being merged into the durable PostgreSQL directory.
      bookings: {},
      // BF-5 extends the same local Business envelope. Existing BF-1–BF-4
      // tabs keep their state when no Service Job slice exists yet.
      serviceJobs: BUSINESS_FIXTURE_TEST_MODE && parsed.serviceJobs && typeof parsed.serviceJobs === "object" && !Array.isArray(parsed.serviceJobs) ? parsed.serviceJobs : {},
      // BF-6 uses the same envelope for Hotel execution. Existing browser
      // tabs remain compatible until their first Hotel mutation.
      hotelStays: BUSINESS_FIXTURE_TEST_MODE && parsed.hotelStays && typeof parsed.hotelStays === "object" && !Array.isArray(parsed.hotelStays) ? parsed.hotelStays : {},
      daycareAttendances: BUSINESS_FIXTURE_TEST_MODE && parsed.daycareAttendances && typeof parsed.daycareAttendances === "object" && !Array.isArray(parsed.daycareAttendances) ? parsed.daycareAttendances : {},
      // BE2 intentionally ignores the former browser Customer/Pet slice. It is
      // neither backfilled nor overlaid onto server-authoritative identities.
      customers: {},
      // BE7 never reads or imports browser financial records into runtime truth.
      charges: BUSINESS_FIXTURE_TEST_MODE && parsed.charges && typeof parsed.charges === "object" && !Array.isArray(parsed.charges) ? parsed.charges : {},
      payments: BUSINESS_FIXTURE_TEST_MODE && parsed.payments && typeof parsed.payments === "object" && !Array.isArray(parsed.payments) ? parsed.payments : {},
      // BF-8 is an additive Service Record slice. BF-1–BF-7 browser sessions
      // keep their existing local state when no record exists yet.
      serviceRecords: BUSINESS_FIXTURE_TEST_MODE && parsed.serviceRecords && typeof parsed.serviceRecords === "object" && !Array.isArray(parsed.serviceRecords) ? parsed.serviceRecords : {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: BusinessStore) {
  if (typeof window === "undefined") return false;
  try {
    // Keep migrated identity/planning slices empty while remaining BE4+
    // browser-local execution domains retain only stable BE2/BE3 references.
    window.sessionStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify({ ...store, customers: {}, bookings: {},
      ...(!BUSINESS_FIXTURE_TEST_MODE ? { intakes: {}, teamMembers: {}, serviceJobs: {}, hotelStays: {}, daycareAttendances: {}, serviceRecords: {}, charges: {}, payments: {} } : {}) }));
    window.dispatchEvent(new CustomEvent("meawketting:business-state"));
    return true;
  } catch {
    return false;
  }
}

function cloneOperatingHours(hours: readonly PrototypeOperatingHoursEntry[]) {
  return hours.map((entry) => ({ ...entry }));
}

function cloneBusinessProfile(profile: PrototypeBusinessProfile): PrototypeBusinessProfile {
  return { ...profile };
}

function cloneBusinessBranch(branch: PrototypeBusinessBranch): PrototypeBusinessBranch {
  return {
    ...branch,
    enabledModules: [...branch.enabledModules],
    operatingHours: cloneOperatingHours(branch.operatingHours),
  };
}

function isBusinessServiceModule(value: unknown): value is BusinessServiceModule {
  return value === "grooming" || value === "hotel" || value === "daycare";
}

function isOperatingHoursEntry(value: unknown): value is PrototypeOperatingHoursEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<PrototypeOperatingHoursEntry>;
  return BUSINESS_WEEKDAYS.includes(candidate.day as BusinessWeekday)
    && typeof candidate.closed === "boolean"
    && typeof candidate.open === "string"
    && typeof candidate.close === "string";
}

function normalizeOperatingHours(hours: readonly PrototypeOperatingHoursEntry[] | undefined) {
  const supplied = new Map((hours ?? []).filter(isOperatingHoursEntry).map((entry) => [entry.day, entry]));
  return createDefaultOperatingHours().map((fallback) => {
    const entry = supplied.get(fallback.day);
    if (!entry) return fallback;
    return {
      day: fallback.day,
      closed: entry.closed,
      open: /^\d{2}:\d{2}$/.test(entry.open) ? entry.open : fallback.open,
      close: /^\d{2}:\d{2}$/.test(entry.close) ? entry.close : fallback.close,
    };
  });
}

export function getPrototypeBusinessProfile(businessId: string, fixtureOnly = false) {
  if (!BUSINESS_FIXTURE_TEST_MODE && fixtureOnly) return null;
  if (!fixtureOnly && hasBusinessSession()) {
    const business = readCachedBusiness(businessId);
    return business ? {
      businessId: business.id,
      name: business.name,
      logoDataUrl: business.logoUrl,
      contactName: business.contactName,
      phone: business.phone,
      email: business.email,
      description: business.description,
      address: business.address,
      updatedAt: business.updatedAt,
    } : null;
  }
  return BUSINESS_FIXTURE_TEST_MODE && BUSINESS_PROFILE_FIXTURES.find((profile) => profile.businessId === businessId)
    ? cloneBusinessProfile(BUSINESS_PROFILE_FIXTURES.find((profile) => profile.businessId === businessId)!)
    : null;
}

export function listPrototypeBusinessBranches(
  businessId: string,
  options: { includeInactive?: boolean; fixtureOnly?: boolean } = {},
) {
  if (!BUSINESS_FIXTURE_TEST_MODE && options.fixtureOnly) return [];
  const branches = !options.fixtureOnly && hasBusinessSession()
    ? readCachedBranches(businessId).map((branch): PrototypeBusinessBranch => ({
        branchId: branch.id,
        businessId: branch.businessId,
        name: branch.name,
        area: branch.area,
        address: branch.address,
        phone: branch.phone,
        email: branch.email,
        active: branch.status === "active",
        enabledModules: branch.enabledModules.filter(isBusinessServiceModule),
        operatingHours: normalizeOperatingHours(branch.operatingHours),
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt,
      }))
    : BUSINESS_FIXTURE_TEST_MODE ? BUSINESS_BRANCH_FIXTURES.map(cloneBusinessBranch) : [];
  return branches
    .filter((branch) => branch.businessId === businessId && (options.includeInactive || branch.active))
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt) || first.name.localeCompare(second.name, "th"))
    .map(cloneBusinessBranch);
}

export function getPrototypeBusinessBranch(businessId: string, branchId: string, fixtureOnly = false) {
  return listPrototypeBusinessBranches(businessId, { includeInactive: true, fixtureOnly }).find((branch) => branch.branchId === branchId) ?? null;
}

function contextKeyForBranch(businessId: string, branchId: string) {
  return DEMO_BUSINESS_CONTEXTS.find((item) => item.businessId === businessId && item.branchId === branchId)?.key
    ?? `${businessId}:${branchId}`;
}

export function listPrototypeBusinessContexts(businessId?: string | null, fixtureOnly = false) {
  if (!BUSINESS_FIXTURE_TEST_MODE && fixtureOnly) return [];
  const branches = !fixtureOnly && hasBusinessSession()
    ? (readBusinessSession()?.workspaces.flatMap((workspace) => listPrototypeBusinessBranches(workspace.business.id, { includeInactive: true })) ?? [])
    : BUSINESS_FIXTURE_TEST_MODE ? BUSINESS_BRANCH_FIXTURES.map(cloneBusinessBranch) : [];
  const baseline = new Map<string, DemoBusinessContext>();
  const durableSession = !fixtureOnly ? readBusinessSession() : null;
  const roleForBusiness = (targetBusinessId: string) => {
    const role = readCachedMembership(targetBusinessId)?.role;
    return role === "OWNER" ? "เจ้าของกิจการ" : role === "MANAGER" ? "ผู้จัดการ" : role === "STAFF" ? "พนักงาน" : null;
  };
  for (const context of DEMO_BUSINESS_CONTEXTS) {
    const branch = branches.find((candidate) => candidate.businessId === context.businessId && candidate.branchId === context.branchId);
    if (branch?.active) baseline.set(contextKeyForBranch(context.businessId, context.branchId), {
      ...context,
      role: roleForBusiness(context.businessId) ?? context.role,
      memberLabel: durableSession?.person.displayName ?? context.memberLabel,
    });
  }
  for (const branch of branches) {
    if (!branch.active) continue;
    const key = contextKeyForBranch(branch.businessId, branch.branchId);
    if (!baseline.has(key)) {
      baseline.set(key, {
        key,
        businessId: branch.businessId,
        branchId: branch.branchId,
        role: roleForBusiness(branch.businessId) ?? "พนักงานหน้าร้าน",
        memberLabel: durableSession?.person.displayName ?? "พนักงานหน้าร้าน",
      });
    }
  }
  return [...baseline.values()].filter((context) => !businessId || context.businessId === businessId);
}

export function getDemoBusinessContext(contextKey: string | null | undefined) {
  const contexts = listPrototypeBusinessContexts();
  return contexts.find((context) => context.key === contextKey) ?? contexts[0] ?? (BUSINESS_FIXTURE_TEST_MODE ? DEMO_BUSINESS_CONTEXTS[0] : UNAVAILABLE_BUSINESS_CONTEXT);
}

export function getDemoBusinessContextForBranch(businessId: string | null | undefined, branchId: string | null | undefined, fixtureOnly = false) {
  const knownBranch = businessId && branchId ? getPrototypeBusinessBranch(businessId, branchId, fixtureOnly) : null;
  if (knownBranch) return DEMO_BUSINESS_CONTEXTS.find((context) => context.businessId === businessId && context.branchId === branchId)
    ?? { key: contextKeyForBranch(knownBranch.businessId, knownBranch.branchId), businessId: knownBranch.businessId, branchId: knownBranch.branchId, role: "พนักงานหน้าร้าน", memberLabel: "พนักงานหน้าร้าน" };
  const contexts = listPrototypeBusinessContexts(businessId, fixtureOnly);
  return contexts.find((context) => context.branchId === branchId)
    ?? contexts[0]
    ?? (BUSINESS_FIXTURE_TEST_MODE ? DEMO_BUSINESS_CONTEXTS[0] : UNAVAILABLE_BUSINESS_CONTEXT);
}

export function getDemoBusinessContextDetails(context: DemoBusinessContext, fixtureOnly = false) {
  if (!BUSINESS_FIXTURE_TEST_MODE) {
    if (fixtureOnly) return { context, business: null, branch: null };
    const profile = getPrototypeBusinessProfile(context.businessId);
    const branch = getPrototypeBusinessBranch(context.businessId, context.branchId);
    return { context, business: profile, branch: branch ? { ...branch, id: branch.branchId } : null };
  }
  const fixture = getBusinessFixture(context.businessId);
  const profile = getPrototypeBusinessProfile(context.businessId, fixtureOnly);
  const branchProfile = getPrototypeBusinessBranch(context.businessId, context.branchId, fixtureOnly);
  const fixtureBranch = getBusinessBranch(fixture, context.branchId);
  return {
    context,
    business: fixture && profile ? {
      ...fixture,
      ...profile,
      name: profile.name,
      branches: listPrototypeBusinessBranches(context.businessId, { includeInactive: true, fixtureOnly }).map((branch) => ({
        id: branch.branchId,
        name: branch.name,
        area: branch.area,
        demoCode: fixture.branches.find((item) => item.id === branch.branchId)?.demoCode ?? branch.branchId,
      })),
    } : fixture ? { ...fixture, name: withoutDemoSuffix(fixture.name) } : null,
    branch: branchProfile ? { ...branchProfile, id: branchProfile.branchId, demoCode: fixtureBranch?.demoCode ?? branchProfile.branchId } : fixtureBranch ? { ...fixtureBranch, name: withoutDemoSuffix(fixtureBranch.name) } : null,
  };
}

export function getEnabledBusinessModules(context: DemoBusinessContext, fixtureOnly = false) {
  return getPrototypeBusinessBranch(context.businessId, context.branchId, fixtureOnly)?.enabledModules ?? [];
}

function cloneCustomerPet(pet: BusinessLocalPetRelationship): BusinessLocalPetRelationship {
  return { ...pet };
}

function cloneCustomer(customer: PrototypeCustomer): PrototypeCustomer {
  return {
    ...customer,
    tags: [...customer.tags],
    pets: customer.pets.map(cloneCustomerPet),
  };
}

function projectDurableCustomer(customer: CustomerView): PrototypeCustomer {
  return {
    id: customer.id,
    businessId: customer.businessId,
    name: customer.displayName,
    phone: customer.phone,
    email: customer.email,
    businessNote: customer.businessNotes,
    tags: [...customer.tags],
    pets: customer.pets.map((pet) => ({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      dataSource: pet.profileSource,
      businessNote: pet.businessNotes,
      ...readNonAuthoritativePassportCompatibility(pet.id),
    })),
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

function sortPrototypeCustomers(customers: readonly PrototypeCustomer[], context?: DemoBusinessContext | null) {
  return customers
    .filter((customer) => !context || customer.businessId === context.businessId)
    .sort((first, second) => first.name.localeCompare(second.name, "th") || first.id.localeCompare(second.id));
}

export function listPrototypeCustomerFixtures(context?: DemoBusinessContext | null) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return [];
  return sortPrototypeCustomers(DEMO_CUSTOMER_FIXTURES.map(cloneCustomer), context);
}

export function listPrototypeCustomers(context?: DemoBusinessContext | null) {
  if (context) {
    const durable = readBe2Customers(context.businessId);
    if (durable) return sortPrototypeCustomers(durable.map(projectDurableCustomer), context);
    return listPrototypeCustomerFixtures(context);
  }
  const readyDirectories = readAllReadyBe2Directories();
  if (!readyDirectories.length) return listPrototypeCustomerFixtures(null);
  const readyBusinessIds = new Set(readyDirectories.map((entry) => entry.businessId));
  const durable = readyDirectories.flatMap((entry) => entry.customers.map(projectDurableCustomer));
  const compatibility = (BUSINESS_FIXTURE_TEST_MODE ? DEMO_CUSTOMER_FIXTURES : [])
    .filter((customer) => !readyBusinessIds.has(customer.businessId))
    .map(cloneCustomer);
  return sortPrototypeCustomers([...durable, ...compatibility], null);
}

export function readPrototypeCustomerFixture(customerId: string) {
  return listPrototypeCustomerFixtures(null).find((customer) => customer.id === customerId) ?? null;
}

export function readPrototypeCustomer(customerId: string) {
  const durable = readBe2CustomerByStableId(customerId);
  if (durable) return projectDurableCustomer(durable);
  const fixture = readPrototypeCustomerFixture(customerId);
  if (fixture && readBe2DirectoryStatus(fixture.businessId) === "ready") return null;
  return fixture;
}

export function resolvePrototypeBookingRelationship(booking: PrototypeBooking) {
  const customer = readPrototypeCustomer(booking.customer.id);
  if (!customer || customer.businessId !== booking.businessId) {
    return { customer: { ...booking.customer }, pets: booking.pets.map((pet) => ({ ...pet })) };
  }
  return {
    customer: { id: customer.id, name: customer.name },
    pets: booking.pets.map((bookingPet) => {
      const current = customer.pets.find((pet) => pet.id === bookingPet.id);
      return current ? { id: current.id, name: current.name, species: current.species } : { ...bookingPet };
    }),
  };
}

export function findKnownBusinessCustomerPetByPassportSlug(businessId: string, passportSlug: string) {
  const normalizedSlug = passportSlug.trim();
  if (!normalizedSlug) return null;
  for (const customer of listPrototypeCustomers(null)) {
    if (customer.businessId !== businessId) continue;
    const pet = customer.pets.find((item) => item.passportSlug === normalizedSlug) ?? null;
    if (pet) return { customer, pet };
  }
  return null;
}

export function getDemoBookingContacts(context?: DemoBusinessContext | null) {
  return listPrototypeCustomers(context).map((customer) => ({
    id: customer.id,
    name: customer.name,
    businessIds: [customer.businessId],
    pets: customer.pets.map(({ id, name, species }) => ({ id, name, species })),
  }));
}

function projectDurableBookingService(service: BookingServiceView): DemoBookingService {
  return {
    id: service.id,
    businessId: service.businessId,
    branchId: service.branchId,
    module: service.module,
    label: service.label,
    timeModel: service.timeModel,
    defaultDurationMinutes: service.defaultDurationMinutes,
    estimate: service.estimate,
    requiredResourceKinds: [...service.requiredResourceKinds],
  };
}

function projectDurableBookingResource(resource: BookingResourceView): DemoBookingResource {
  return {
    id: resource.id,
    businessId: resource.businessId,
    branchId: resource.branchId,
    module: resource.module,
    kind: resource.kind,
    label: resource.label,
    capacityMode: resource.capacityMode,
    capacity: resource.capacity,
    serviceIds: [...resource.serviceIds],
    staffId: resource.compatibilityStaffId ?? undefined,
    hotelRole: resource.hotelRole ?? undefined,
  };
}

export function getBookingServices(context: DemoBusinessContext, fixtureOnly = false) {
  if (!BUSINESS_FIXTURE_TEST_MODE && fixtureOnly) return [];
  const enabledModules = getEnabledBusinessModules(context, fixtureOnly);
  const durableCatalog = fixtureOnly ? null : readBe3Catalog(context.businessId, context.branchId);
  if (durableCatalog) {
    return durableCatalog.services
      .filter((service) => service.status === "active" && enabledModules.includes(service.module))
      .map(projectDurableBookingService);
  }
  if (!BUSINESS_FIXTURE_TEST_MODE) return [];
  const services: DemoBookingService[] = DEMO_BOOKING_SERVICES.filter((service) => (
    service.businessId === context.businessId
    && service.branchId === context.branchId
    && enabledModules.includes(service.module)
  )).map((service) => ({ ...service, requiredResourceKinds: [...service.requiredResourceKinds] }));
  for (const serviceModule of enabledModules) {
    if (services.some((service) => service.module === serviceModule)) continue;
    services.push({
      id: `${context.branchId}-${serviceModule}-service`,
      businessId: context.businessId,
      branchId: context.branchId,
      module: serviceModule,
      label: BUSINESS_SERVICE_MODULES[serviceModule].label,
      timeModel: serviceModule === "grooming" ? "appointment" : serviceModule === "hotel" ? "date-range" : "day",
      defaultDurationMinutes: serviceModule === "grooming" ? 90 : null,
      estimate: null,
      requiredResourceKinds: serviceModule === "grooming"
        ? ["groomer", "grooming-station", "dryer"]
        : serviceModule === "hotel" ? ["hotel-room-type"] : ["daycare-zone"],
    });
  }
  return services;
}

export function getBookingResources(context: DemoBusinessContext, serviceId?: string, fixtureOnly = false) {
  if (!BUSINESS_FIXTURE_TEST_MODE && fixtureOnly) return [];
  const enabledModules = getEnabledBusinessModules(context, fixtureOnly);
  const durableCatalog = fixtureOnly ? null : readBe3Catalog(context.businessId, context.branchId);
  if (durableCatalog) {
    return durableCatalog.resources
      .filter((resource) => enabledModules.includes(resource.module) && (!serviceId || resource.serviceIds.includes(serviceId)))
      .map(projectDurableBookingResource);
  }
  if (!BUSINESS_FIXTURE_TEST_MODE) return [];
  const services = getBookingServices(context, fixtureOnly);
  const resources: DemoBookingResource[] = DEMO_BOOKING_RESOURCES.filter((resource) => (
    resource.businessId === context.businessId
    && resource.branchId === context.branchId
    && enabledModules.includes(resource.module)
    && (!serviceId || resource.serviceIds.includes(serviceId))
  )).map((resource) => ({ ...resource, serviceIds: [...resource.serviceIds] }));
  const targetServices = serviceId ? services.filter((service) => service.id === serviceId) : services;
  for (const service of targetServices) {
    if (resources.some((resource) => resource.serviceIds.includes(service.id))) continue;
    if (service.module === "grooming") {
      const groomers = fixtureOnly ? listPrototypeTeamMemberFixtures(context, { capability: "grooming" }) : listPrototypeTeamMembers(context, { capability: "grooming" });
      resources.push(...groomers.map((member) => ({
        id: `${context.branchId}-groomer-${member.staffId}`,
        businessId: context.businessId,
        branchId: context.branchId,
        module: "grooming" as const,
        kind: "groomer" as const,
        label: member.name,
        capacityMode: "exclusive" as const,
        capacity: 1,
        serviceIds: [service.id],
        staffId: member.staffId,
      })));
      resources.push(
        { id: `${context.branchId}-grooming-station`, businessId: context.businessId, branchId: context.branchId, module: "grooming", kind: "grooming-station", label: "จุดบริการหลัก", capacityMode: "exclusive", capacity: 1, serviceIds: [service.id] },
        { id: `${context.branchId}-dryer`, businessId: context.businessId, branchId: context.branchId, module: "grooming", kind: "dryer", label: "เครื่องเป่าหลัก", capacityMode: "exclusive", capacity: 1, serviceIds: [service.id] },
      );
    } else if (service.module === "hotel") {
      resources.push({ id: `${context.branchId}-hotel-capacity`, businessId: context.businessId, branchId: context.branchId, module: "hotel", kind: "hotel-room-type", label: "พื้นที่พักตามเงื่อนไข", capacityMode: "capacity", capacity: 4, serviceIds: [service.id], hotelRole: "planning-capacity" });
      resources.push({ id: `${context.branchId}-hotel-zone`, businessId: context.businessId, branchId: context.branchId, module: "hotel", kind: "hotel-room-type", label: "โซนพักหลัก", capacityMode: "capacity", capacity: 4, serviceIds: [service.id], hotelRole: "zone" });
    } else {
      resources.push({ id: `${context.branchId}-daycare-zone`, businessId: context.businessId, branchId: context.branchId, module: "daycare", kind: "daycare-zone", label: "โซนทั่วไป", capacityMode: "capacity", capacity: 12, serviceIds: [service.id] });
    }
  }
  return resources;
}

function cloneBooking(booking: PrototypeBooking): PrototypeBooking {
  return {
    ...booking,
    customer: { ...booking.customer },
    pets: booking.pets.map((pet) => ({ ...pet })),
    service: { ...booking.service },
    requiredResources: [...booking.requiredResources],
    assignedResources: [...booking.assignedResources],
  };
}

/** Frozen Business UI projection of the authoritative BE3 read model. */
export function projectDurableBooking(booking: BookingView): PrototypeBooking {
  return {
    bookingId: booking.id,
    businessId: booking.businessId,
    branchId: booking.branchId,
    customer: { id: booking.customerId, name: booking.customerName },
    pets: booking.pets.map((pet) => ({ id: pet.id, name: pet.name, species: pet.species })),
    serviceModule: booking.serviceModule,
    service: { id: booking.serviceId, label: booking.serviceLabel },
    timeModel: booking.timeModel,
    start: booking.start,
    end: booking.end,
    requiredResources: [...booking.requiredResourceKinds],
    assignedResources: [...booking.assignedResourceIds],
    status: booking.status,
    estimate: booking.estimate,
    notes: booking.notes,
    revision: booking.revision,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    cancelledAt: booking.cancelledAt,
  };
}

function mergedPrototypeBookings() {
  const readyDirectories = readAllReadyBe3Directories();
  if (!readyDirectories.length) return BUSINESS_FIXTURE_TEST_MODE ? DEMO_BOOKING_FIXTURES.map(cloneBooking) : [];
  const readyBusinessIds = new Set(readyDirectories.map((entry) => entry.businessId));
  const durable = readyDirectories.flatMap((entry) => entry.bookings.map(projectDurableBooking));
  const compatibility = (BUSINESS_FIXTURE_TEST_MODE ? DEMO_BOOKING_FIXTURES : [])
    .filter((booking) => !readyBusinessIds.has(booking.businessId))
    .map(cloneBooking);
  return [...durable, ...compatibility];
}

export type ListPrototypeBookingsOptions = {
  includeCancelled?: boolean;
};

function filterAndSortPrototypeBookings(
  bookings: readonly PrototypeBooking[],
  context?: DemoBusinessContext | null,
  options: ListPrototypeBookingsOptions = {},
) {
  const includeCancelled = options.includeCancelled ?? true;
  return bookings
    .filter((booking) => !context || (booking.businessId === context.businessId && booking.branchId === context.branchId))
    .filter((booking) => includeCancelled || booking.status !== "cancelled")
    .sort((a, b) => {
      const first = getBookingInterval(a.timeModel, a.start, a.end)?.start ?? Number.MAX_SAFE_INTEGER;
      const second = getBookingInterval(b.timeModel, b.start, b.end)?.start ?? Number.MAX_SAFE_INTEGER;
      return first - second || a.bookingId.localeCompare(b.bookingId);
    });
}

// Client surfaces render this deterministic DEV/TEST fixture list for their
// initial server/client pass, then replace it with the durable BE3 directory.
// Fixtures are never imported, backfilled, or accepted as mutation truth.
export function listPrototypeBookingFixtures(context?: DemoBusinessContext | null, options: ListPrototypeBookingsOptions = {}) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return [];
  return filterAndSortPrototypeBookings(DEMO_BOOKING_FIXTURES.map(cloneBooking), context, options);
}

export function listPrototypeBookings(context?: DemoBusinessContext | null, options: ListPrototypeBookingsOptions = {}) {
  if (context) {
    const durable = readBe3Bookings(context.businessId, {
      branchId: context.branchId,
      includeCancelled: options.includeCancelled,
    });
    if (durable) return filterAndSortPrototypeBookings(durable.map(projectDurableBooking), context, options);
    return listPrototypeBookingFixtures(context, options);
  }
  return filterAndSortPrototypeBookings(mergedPrototypeBookings(), null, options);
}

export function readPrototypeBooking(bookingId: string) {
  const durable = readBe3BookingByStableId(bookingId);
  if (durable) return projectDurableBooking(durable);
  const fixture = listPrototypeBookingFixtures(null).find((booking) => booking.bookingId === bookingId) ?? null;
  if (fixture && readBe3DirectoryStatus(fixture.businessId) === "ready") return null;
  return fixture;
}

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;
const WEEKDAY_FROM_UTC_DAY: readonly BusinessWeekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function timestampFromParts(year: number, month: number, day: number, hour = 0, minute = 0) {
  const timestamp = Date.UTC(year, month - 1, day, hour, minute);
  const checked = new Date(timestamp);
  if (
    checked.getUTCFullYear() !== year
    || checked.getUTCMonth() !== month - 1
    || checked.getUTCDate() !== day
    || checked.getUTCHours() !== hour
    || checked.getUTCMinutes() !== minute
  ) return null;
  return timestamp;
}

function dateTimestamp(value: string) {
  const match = value.match(DATE_PATTERN);
  if (!match) return null;
  return timestampFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

function businessWeekdayForDate(value: string) {
  const timestamp = dateTimestamp(value.slice(0, 10));
  return timestamp === null ? null : WEEKDAY_FROM_UTC_DAY[new Date(timestamp).getUTCDay()] ?? null;
}

function dateTimeTimestamp(value: string) {
  const match = value.match(DATETIME_PATTERN);
  if (!match) return null;
  return timestampFromParts(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5]));
}

function calendarDateFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

function addBusinessCalendarDays(value: string, days: number) {
  const timestamp = dateTimestamp(value);
  return timestamp === null ? value : calendarDateFromTimestamp(timestamp + days * DAY_IN_MILLISECONDS);
}

function thaiBookingDate(value: string) {
  const match = value.match(DATE_PATTERN);
  if (!match) return value;
  const monthLabels = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return `${Number(match[3])} ${monthLabels[Number(match[2]) - 1] ?? value}`;
}

function dayStartFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function calendarDaysInInterval(interval: BookingInterval) {
  const dates: string[] = [];
  for (let dayStart = dayStartFromTimestamp(interval.start); dayStart < interval.end; dayStart += DAY_IN_MILLISECONDS) {
    const dayEnd = dayStart + DAY_IN_MILLISECONDS;
    if (interval.start < dayEnd && interval.end > dayStart) dates.push(calendarDateFromTimestamp(dayStart));
  }
  return dates;
}

export function getBookingInterval(
  timeModel: BookingTimeModel,
  start: string,
  end: string | null | undefined,
): BookingInterval | null {
  if (timeModel === "appointment") {
    const startAt = dateTimeTimestamp(start);
    const endAt = typeof end === "string" ? dateTimeTimestamp(end) : null;
    return startAt !== null && endAt !== null && endAt > startAt ? { start: startAt, end: endAt } : null;
  }

  const startAt = dateTimestamp(start);
  if (startAt === null) return null;
  if (timeModel === "day") return { start: startAt, end: startAt + DAY_IN_MILLISECONDS };

  const endAt = typeof end === "string" ? dateTimestamp(end) : null;
  return endAt !== null && endAt > startAt ? { start: startAt, end: endAt } : null;
}

export function bookingIntervalsOverlap(first: BookingInterval, second: BookingInterval) {
  return first.start < second.end && second.start < first.end;
}

// BF-9 Team is a Person layer inside the existing local Business envelope.
// It intentionally links to the already-established Resource registry rather
// than replacing groomers, stations, dryers, rooms, or zones with a second
// scheduling model.
function clonePrototypeTeamMemberAvailability(window: PrototypeTeamMemberAvailabilityWindow) {
  return { ...window };
}

function clonePrototypeTeamMember(member: PrototypeTeamMember): PrototypeTeamMember {
  return {
    ...member,
    branchIds: [...member.branchIds],
    capabilities: [...member.capabilities],
    availability: member.availability.map(clonePrototypeTeamMemberAvailability),
  };
}

function isTeamMemberRole(value: unknown): value is TeamMemberRole {
  return value === "owner" || value === "manager" || value === "staff";
}

function isTeamMemberCapability(value: unknown): value is TeamMemberCapability {
  return value === "grooming" || value === "hotel-care" || value === "daycare" || value === "front-desk";
}

function isTeamMemberAvailabilityState(value: unknown): value is TeamMemberAvailabilityState {
  return value === "working" || value === "unavailable" || value === "break" || value === "time-off";
}

function isPrototypeTeamMemberAvailabilityWindow(value: unknown): value is PrototypeTeamMemberAvailabilityWindow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const window = value as Partial<PrototypeTeamMemberAvailabilityWindow>;
  return typeof window.id === "string"
    && isTeamMemberAvailabilityState(window.state)
    && typeof window.start === "string"
    && typeof window.end === "string"
    && (typeof window.note === "string" || window.note === null);
}

function isPrototypeTeamMember(value: unknown): value is PrototypeTeamMember {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const member = value as Partial<PrototypeTeamMember>;
  return typeof member.staffId === "string"
    && typeof member.businessId === "string"
    && Array.isArray(member.branchIds)
    && member.branchIds.every((branchId) => typeof branchId === "string")
    && typeof member.name === "string"
    && typeof member.avatarSeed === "string"
    && isTeamMemberRole(member.role)
    && Array.isArray(member.capabilities)
    && member.capabilities.every(isTeamMemberCapability)
    && typeof member.active === "boolean"
    && Array.isArray(member.availability)
    && member.availability.every(isPrototypeTeamMemberAvailabilityWindow)
    && typeof member.createdAt === "string"
    && typeof member.updatedAt === "string";
}

function mergedPrototypeTeamMembers(store: BusinessStore) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readOperationStaff().map(clonePrototypeTeamMember);
  const members = new Map<string, PrototypeTeamMember>();
  for (const fixture of DEMO_TEAM_MEMBER_FIXTURES) members.set(fixture.staffId, clonePrototypeTeamMember(fixture));
  for (const stored of Object.values(store.teamMembers)) {
    if (isPrototypeTeamMember(stored)) members.set(stored.staffId, clonePrototypeTeamMember(stored));
  }
  return [...members.values()];
}

function teamMemberMatchesContext(member: PrototypeTeamMember, context?: DemoBusinessContext | null) {
  return !context || (member.businessId === context.businessId && member.branchIds.includes(context.branchId));
}

function filterAndSortPrototypeTeamMembers(
  members: readonly PrototypeTeamMember[],
  context?: DemoBusinessContext | null,
  options: ListPrototypeTeamMembersOptions = {},
) {
  return members
    .filter((member) => teamMemberMatchesContext(member, context))
    .filter((member) => options.includeInactive || member.active)
    .filter((member) => !options.capability || member.capabilities.includes(options.capability))
    .sort((first, second) => first.name.localeCompare(second.name, "th") || first.staffId.localeCompare(second.staffId));
}

export function listPrototypeTeamMemberFixtures(
  context?: DemoBusinessContext | null,
  options: ListPrototypeTeamMembersOptions = {},
) {
  return filterAndSortPrototypeTeamMembers(BUSINESS_FIXTURE_TEST_MODE ? DEMO_TEAM_MEMBER_FIXTURES.map(clonePrototypeTeamMember) : readOperationStaff(), context, options);
}

export function listPrototypeTeamMembers(
  context?: DemoBusinessContext | null,
  options: ListPrototypeTeamMembersOptions = {},
) {
  return filterAndSortPrototypeTeamMembers(mergedPrototypeTeamMembers(readStore()), context, options);
}

export function readPrototypeTeamMember(staffId: string) {
  return listPrototypeTeamMembers(null, { includeInactive: true }).find((member) => member.staffId === staffId) ?? null;
}

function normalizedTeamMemberAvailability(
  availability: readonly PrototypeTeamMemberAvailabilityWindow[] | undefined,
  fallback: readonly PrototypeTeamMemberAvailabilityWindow[] = [],
) {
  const seen = new Set<string>();
  return (availability ?? fallback)
    .filter(isPrototypeTeamMemberAvailabilityWindow)
    .map((window, index) => ({
      id: window.id.trim() || `team-availability-${index + 1}`,
      state: window.state,
      start: window.start.trim(),
      end: window.end.trim(),
      note: window.note?.trim() || null,
    }))
    .filter((window) => {
      if (seen.has(window.id)) return false;
      seen.add(window.id);
      return Boolean(teamAvailabilityWindowInterval(window));
    });
}

function normalizedTeamMemberBranchIds(
  businessId: string,
  branchIds: readonly string[],
) {
  const business = getBusinessFixture(businessId);
  const normalized = [...new Set(branchIds.map((branchId) => branchId.trim()).filter(Boolean))];
  return normalized.length > 0 && business && normalized.every((branchId) => Boolean(getBusinessBranch(business, branchId)))
    ? normalized
    : null;
}

function normalizedTeamMemberCapabilities(capabilities: readonly TeamMemberCapability[]) {
  return [...new Set(capabilities.filter(isTeamMemberCapability))];
}

export type SavePrototypeTeamMemberResult =
  | { ok: true; member: PrototypeTeamMember; created: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "invalid" | "duplicate" | "storage" };

function generatedTeamMemberId() {
  return `prototype-team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildPrototypeTeamMember(
  draft: PrototypeTeamMemberDraft,
  context: DemoBusinessContext,
  existing: PrototypeTeamMember | null,
): PrototypeTeamMember | null {
  const businessId = existing?.businessId ?? context.businessId;
  if (draft.businessId && draft.businessId !== businessId) return null;
  const name = draft.name.trim();
  const branchIds = normalizedTeamMemberBranchIds(businessId, draft.branchIds);
  const capabilities = normalizedTeamMemberCapabilities(draft.capabilities);
  if (!name || !branchIds || capabilities.length === 0 || !isTeamMemberRole(draft.role)) return null;
  if (!existing && !branchIds.includes(context.branchId)) return null;
  const now = new Date().toISOString();
  return {
    staffId: (existing?.staffId ?? draft.staffId?.trim()) || generatedTeamMemberId(),
    businessId,
    branchIds,
    name,
    avatarSeed: draft.avatarSeed?.trim() || existing?.avatarSeed || name,
    role: draft.role,
    capabilities,
    active: draft.active ?? existing?.active ?? true,
    availability: normalizedTeamMemberAvailability(draft.availability, existing?.availability),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function createPrototypeTeamMember(draft: PrototypeTeamMemberDraft, context: DemoBusinessContext): SavePrototypeTeamMemberResult {
  const store = readStore();
  const desiredId = draft.staffId?.trim();
  if (desiredId && mergedPrototypeTeamMembers(store).some((member) => member.staffId === desiredId)) return { ok: false, reason: "duplicate" };
  const member = buildPrototypeTeamMember(draft, context, null);
  if (!member) return { ok: false, reason: "invalid" };
  store.teamMembers[member.staffId] = member;
  return writeStore(store) ? { ok: true, member: clonePrototypeTeamMember(member), created: true } : { ok: false, reason: "storage" };
}

export function updatePrototypeTeamMember(
  staffId: string,
  draft: PrototypeTeamMemberDraft,
  context: DemoBusinessContext,
): SavePrototypeTeamMemberResult {
  const store = readStore();
  const existing = mergedPrototypeTeamMembers(store).find((member) => member.staffId === staffId) ?? null;
  if (!existing) return { ok: false, reason: "missing" };
  if (!teamMemberMatchesContext(existing, context)) return { ok: false, reason: "wrong-context" };
  const member = buildPrototypeTeamMember({ ...draft, staffId }, context, existing);
  if (!member) return { ok: false, reason: "invalid" };
  store.teamMembers[member.staffId] = member;
  return writeStore(store) ? { ok: true, member: clonePrototypeTeamMember(member), created: false } : { ok: false, reason: "storage" };
}

export function setPrototypeTeamMemberActive(
  staffId: string,
  active: boolean,
  context: DemoBusinessContext,
): SavePrototypeTeamMemberResult {
  const existing = readPrototypeTeamMember(staffId);
  if (!existing) return { ok: false, reason: "missing" };
  return updatePrototypeTeamMember(staffId, {
    staffId,
    branchIds: existing.branchIds,
    name: existing.name,
    avatarSeed: existing.avatarSeed,
    role: existing.role,
    capabilities: existing.capabilities,
    availability: existing.availability,
    active,
  }, context);
}

function teamAvailabilityWindowInterval(window: Pick<PrototypeTeamMemberAvailabilityWindow, "start" | "end">): BookingInterval | null {
  const startDateTime = dateTimeTimestamp(window.start);
  const endDateTime = dateTimeTimestamp(window.end);
  if (startDateTime !== null && endDateTime !== null) return endDateTime > startDateTime ? { start: startDateTime, end: endDateTime } : null;
  const startDate = dateTimestamp(window.start);
  const endDate = dateTimestamp(window.end);
  if (startDate === null) return null;
  if (endDate === null || endDate === startDate) return { start: startDate, end: startDate + DAY_IN_MILLISECONDS };
  return endDate > startDate ? { start: startDate, end: endDate } : null;
}

function teamAvailabilityTargetInterval(intervalOrDate: BookingInterval | string | null | undefined) {
  if (!intervalOrDate) return null;
  if (typeof intervalOrDate !== "string") return intervalOrDate;
  const date = dateTimestamp(intervalOrDate);
  // A compact date-only lookup is a status probe at noon, not an assertion
  // that the person must cover all 24 hours of that date.
  return date === null ? null : { start: date + 12 * 60 * 60 * 1000, end: date + (12 * 60 + 30) * 60 * 1000 };
}

function teamAvailabilityWindowsForInterval(
  member: PrototypeTeamMember,
  interval: BookingInterval,
) {
  const targetDates = new Set(calendarDaysInInterval(interval));
  return member.availability.flatMap((window) => {
    const windowInterval = teamAvailabilityWindowInterval(window);
    if (!windowInterval) return [];
    const windowDates = calendarDaysInInterval(windowInterval);
    return windowDates.some((date) => targetDates.has(date)) ? [{ window, interval: windowInterval }] : [];
  });
}

export function evaluatePrototypeTeamMemberAvailability(
  member: PrototypeTeamMember,
  intervalOrDate: BookingInterval | string | null | undefined,
): TeamMemberAvailabilityResult {
  const interval = teamAvailabilityTargetInterval(intervalOrDate);
  if (!interval) {
    return { available: false, state: "unknown", interval: null, conflicts: [{ code: "invalid-interval", message: "ช่วงเวลางานของพนักงานไม่ถูกต้อง" }] };
  }
  if (!member.active) {
    return { available: false, state: "inactive", interval, conflicts: [{ code: "inactive", message: `${member.name} ถูกปิดใช้งาน จึงรับงานใหม่ไม่ได้` }] };
  }
  const windows = teamAvailabilityWindowsForInterval(member, interval);
  const working = windows.filter(({ window }) => window.state === "working");
  if (working.length > 0 && !working.some(({ interval: workingInterval }) => interval.start >= workingInterval.start && interval.end <= workingInterval.end)) {
    return { available: false, state: "unavailable", interval, conflicts: [{ code: "outside-working-hours", message: `${member.name} อยู่นอกช่วงเวลาทำงาน` }] };
  }
  const interruption = windows.find(({ window, interval: windowInterval }) => (
    window.state !== "working" && bookingIntervalsOverlap(interval, windowInterval)
  ));
  if (interruption) {
    const interruptionState = interruption.window.state;
    if (interruptionState === "working") return { available: true, state: "working", interval, conflicts: [] };
    const labels: Record<Exclude<TeamMemberAvailabilityState, "working">, string> = {
      unavailable: "ไม่พร้อมรับงาน",
      break: "อยู่ระหว่างพัก",
      "time-off": "ลางาน / หยุดงาน",
    };
    return {
      available: false,
      state: interruptionState,
      interval,
      conflicts: [{ code: interruptionState, windowId: interruption.window.id, message: `${member.name}${labels[interruptionState]}` }],
    };
  }
  return { available: true, state: working.length > 0 ? "working" : "unknown", interval, conflicts: [] };
}

export function getTeamMembersForCapability(
  context: DemoBusinessContext,
  capability: TeamMemberCapability,
  options: GetTeamMembersForCapabilityOptions = {},
) {
  return listPrototypeTeamMembers(context, { includeInactive: options.includeInactive, capability })
    .filter((member) => {
      if (options.includeUnavailable || (!options.interval && !options.date)) return true;
      return evaluatePrototypeTeamMemberAvailability(member, options.interval ?? options.date).available;
    });
}

export function getBookingResourceStaffMember(resourceId: string) {
  const durable = readBe3ResourceByStableId(resourceId);
  const staffId = durable?.compatibilityStaffId
    ?? DEMO_BOOKING_RESOURCES.find((candidate) => candidate.id === resourceId)?.staffId
    ?? null;
  const member = staffId ? readPrototypeTeamMember(staffId) : null;
  if (!member || !durable) return member;
  // BE3 owns schedulability. The BF9 Person record supplies presentation and
  // capability labels only; durable Resource lifecycle/windows override its
  // local availability for Booking preview.
  return {
    ...member,
    active: durable.status === "active",
    availability: durable.availability.map((window) => ({ ...window, note: null })),
  };
}

type TeamResourceEligibility =
  | { ok: true; member: PrototypeTeamMember }
  | { ok: false; code: "staff-inactive" | "staff-unavailable" | "staff-capability-mismatch"; message: string; staffId?: string };

function requiredCapabilityForBookingResource(resource: DemoBookingResource): TeamMemberCapability | null {
  return resource.kind === "groomer" ? "grooming" : null;
}

function evaluateTeamResourceEligibility(
  resource: DemoBookingResource,
  context: DemoBusinessContext,
  interval: BookingInterval,
): TeamResourceEligibility | null {
  if (!resource.staffId) return null;
  const member = getBookingResourceStaffMember(resource.id);
  const requiredCapability = requiredCapabilityForBookingResource(resource);
  if (!member || !teamMemberMatchesContext(member, context) || (requiredCapability && !member.capabilities.includes(requiredCapability))) {
    return {
      ok: false,
      code: "staff-capability-mismatch",
      staffId: resource.staffId,
      message: `${resource.label} ไม่พร้อมใช้กับทีม/ความสามารถของสาขาปัจจุบัน`,
    };
  }
  const availability = evaluatePrototypeTeamMemberAvailability(member, interval);
  if (!availability.available) {
    return {
      ok: false,
      code: availability.state === "inactive" ? "staff-inactive" : "staff-unavailable",
      staffId: member.staffId,
      message: availability.conflicts[0]?.message ?? `${member.name} ไม่พร้อมรับงานในช่วงเวลานี้`,
    };
  }
  return { ok: true, member };
}

function bookingUnits(booking: Pick<PrototypeBooking, "pets">) {
  return Math.max(1, booking.pets.length);
}

function draftBookingUnits(draft: PrototypeBookingDraft) {
  return Math.max(1, draft.pets.length);
}

function conflict(
  code: BookingConflictCode,
  message: string,
  recovery: BookingConflictRecovery,
  details: Omit<BookingConflict, "code" | "message" | "recovery"> = {},
): BookingConflict {
  return { code, message, recovery, ...details };
}

function draftFingerprint(draft: PrototypeBookingDraft) {
  return [
    draft.businessId,
    draft.branchId,
    draft.serviceId,
    draft.customer?.id ?? "",
    draft.pets.map((pet) => pet.id).sort().join(","),
    draft.start,
    draft.end,
    [...new Set(draft.assignedResourceIds)].sort().join(","),
  ].join("|");
}

function bookingFingerprint(booking: PrototypeBooking) {
  return [
    booking.businessId,
    booking.branchId,
    booking.service.id,
    booking.customer.id,
    booking.pets.map((pet) => pet.id).sort().join(","),
    booking.start,
    booking.end ?? "",
    [...new Set(booking.assignedResources)].sort().join(","),
  ].join("|");
}

// This evaluator is intentionally pure: callers supply the active Branch
// context and Booking collection, so tests and UI can get the same result
// without depending on sessionStorage or a component lifecycle.
export function evaluateBookingAvailability(
  draft: PrototypeBookingDraft,
  context: DemoBusinessContext,
  bookings: readonly PrototypeBooking[],
): BookingAvailabilityResult {
  const conflicts: BookingConflict[] = [];
  const contextMatches = draft.businessId === context.businessId && draft.branchId === context.branchId;
  if (!contextMatches) {
    return {
      available: false,
      service: null,
      interval: null,
      conflicts: [conflict(
        "wrong-context",
        "สาขาที่กำลังใช้งานเปลี่ยนแล้ว โปรดเลือกบริการและตัวเลือกของสาขาปัจจุบันอีกครั้ง",
        "return-to-edit",
      )],
    };
  }

  const branch = getPrototypeBusinessBranch(context.businessId, context.branchId);
  if (!branch?.active) {
    return {
      available: false,
      service: null,
      interval: null,
      conflicts: [conflict(
        "branch-inactive",
        "สาขานี้ปิดรับงานใหม่อยู่ กรุณาเลือกสาขาที่เปิดใช้งาน",
        "return-to-edit",
      )],
    };
  }

  const services = getBookingServices(context);
  const service = services.find((item) => item.id === draft.serviceId) ?? null;
  if (!service) {
    const existsElsewhere = DEMO_BOOKING_SERVICES.some((item) => item.id === draft.serviceId);
    return {
      available: false,
      service: null,
      interval: null,
      conflicts: [conflict(
        existsElsewhere ? "service-not-enabled" : "service-not-found",
        existsElsewhere ? "บริการนี้ยังไม่เปิดใช้ที่สาขาปัจจุบัน" : "กรุณาเลือกบริการก่อนตรวจเวลาว่าง",
        "return-to-edit",
      )],
    };
  }

  if (draft.serviceModule !== null && draft.serviceModule !== service.module) {
    conflicts.push(conflict("service-not-enabled", "บริการที่เลือกไม่ตรงกับบริการของสาขานี้", "return-to-edit"));
  }
  if (draft.timeModel !== null && draft.timeModel !== service.timeModel) {
    conflicts.push(conflict("time-model-mismatch", "รูปแบบวันและเวลาไม่ตรงกับบริการที่เลือก", "return-to-edit"));
  }
  if (!draft.customer?.id || !draft.customer.name.trim()) {
    conflicts.push(conflict("missing-customer", "กรุณาเลือกลูกค้า", "return-to-edit"));
  }
  if (draft.pets.length === 0) {
    conflicts.push(conflict("missing-pet", "กรุณาเลือกน้องที่เข้ารับบริการ", "return-to-edit"));
  }

  const contact = draft.customer ? getDemoBookingContacts(context).find((item) => item.id === draft.customer?.id) : null;
  if (draft.customer && (!contact || draft.pets.some((pet) => !contact.pets.some((candidate) => candidate.id === pet.id)))) {
    conflicts.push(conflict("invalid-pet-selection", "สัตว์เลี้ยงที่เลือกไม่อยู่ในข้อมูลของลูกค้ารายนี้", "return-to-edit"));
  }
  if (draft.estimate !== null && (!Number.isFinite(draft.estimate) || !Number.isInteger(draft.estimate) || draft.estimate < 0)) {
    conflicts.push(conflict("invalid-estimate", "ราคาประมาณต้องเป็นจำนวนเต็มบาท", "return-to-edit"));
  }

  const interval = getBookingInterval(service.timeModel, draft.start, draft.end || null);
  if (!interval) {
    conflicts.push(conflict(
      "invalid-time",
      service.timeModel === "appointment"
        ? "กรุณาระบุเวลาเริ่มและเวลาสิ้นสุดที่ถูกต้อง"
        : service.timeModel === "date-range"
          ? "วันเช็กเอาต์ต้องอยู่หลังวันเข้าพัก"
          : "กรุณาเลือกวันที่ให้บริการ",
      service.timeModel === "appointment" ? "change-time" : "change-date",
    ));
  }


  const bookingWeekday = businessWeekdayForDate(draft.start);
  const operatingHours = bookingWeekday ? branch.operatingHours.find((entry) => entry.day === bookingWeekday) : null;
  if (operatingHours?.closed) {
    conflicts.push(conflict(
      "branch-closed",
      `สาขาปิดทำการวัน${BUSINESS_WEEKDAY_LABELS[operatingHours.day]} กรุณาเลือกวันอื่น`,
      "change-date",
    ));
  } else if (operatingHours && service.timeModel === "appointment" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(draft.start)) {
    const startTime = draft.start.slice(11, 16);
    const endTime = draft.end.slice(11, 16);
    if (startTime < operatingHours.open || endTime > operatingHours.close) {
      conflicts.push(conflict(
        "outside-operating-hours",
        `เวลานี้อยู่นอกเวลาทำการ ${operatingHours.open}–${operatingHours.close}`,
        "change-time",
      ));
    }
  }

  const resources = getBookingResources(context, service.id);
  const selectedResourceIds = [...new Set(draft.assignedResourceIds.filter(Boolean))];
  const selectedResources: DemoBookingResource[] = [];
  for (const resourceId of selectedResourceIds) {
    const resource = resources.find((item) => item.id === resourceId);
    if (!resource) {
      conflicts.push(conflict("invalid-resource", "ตัวเลือกที่เลือกใช้ไม่ได้กับบริการหรือสาขานี้", "change-resource", { resourceId }));
    } else {
      selectedResources.push(resource);
    }
  }
  for (const kind of service.requiredResourceKinds) {
    if (!selectedResources.some((resource) => resource.kind === kind)) {
      conflicts.push(conflict(
        "missing-resource",
        `กรุณาเลือก${BOOKING_RESOURCE_KIND_LABELS[kind]}ก่อนตรวจเวลาว่าง`,
        "change-resource",
        { resourceKind: kind },
      ));
    }
  }

  // A groomer Resource can represent a shared Team person.  Keep the
  // Resource assignment contract intact, but reject inactive, out-of-branch,
  // capability-mismatched, or unavailable people before Calendar persists a
  // booking.  Physical Resources intentionally skip this person check.
  if (interval) {
    for (const resource of selectedResources) {
      const eligibility = evaluateTeamResourceEligibility(resource, context, interval);
      if (!eligibility || eligibility.ok) continue;
      conflicts.push(conflict(
        eligibility.code,
        eligibility.message,
        "change-resource",
        { resourceId: resource.id, resourceKind: resource.kind, staffId: eligibility.staffId },
      ));
    }
  }

  if (conflicts.length > 0 || !interval) {
    return { available: false, service, interval, conflicts };
  }

  const activeBookings = bookings.filter((booking) => (
    booking.bookingId !== draft.bookingId
    && booking.businessId === context.businessId
    && booking.branchId === context.branchId
    && booking.status !== "cancelled"
  ));
  if (activeBookings.some((booking) => bookingFingerprint(booking) === draftFingerprint(draft))) {
    return {
      available: false,
      service,
      interval,
      conflicts: [conflict(
        "duplicate-confirmation",
        "มีการจองเดียวกันอยู่แล้ว ระบบไม่ได้สร้างรายการซ้ำ",
        "return-to-edit",
      )],
    };
  }

  for (const resource of selectedResources) {
    const bookingsUsingResource = activeBookings.filter((booking) => {
      const bookingInterval = getBookingInterval(booking.timeModel, booking.start, booking.end);
      return booking.assignedResources.includes(resource.id) && !!bookingInterval && bookingIntervalsOverlap(interval, bookingInterval);
    });

    if (resource.capacityMode === "exclusive" && bookingsUsingResource.length > 0) {
      conflicts.push(conflict(
        "resource-conflict",
        `${resource.label}มีงานในช่วงเวลาเดียวกัน`,
        "change-resource",
        { resourceId: resource.id, resourceKind: resource.kind, bookingIds: bookingsUsingResource.map((booking) => booking.bookingId) },
      ));
      continue;
    }

    if (resource.capacityMode === "capacity") {
      const fullDates: string[] = [];
      const conflictingBookingIds = new Set<string>();
      for (const date of calendarDaysInInterval(interval)) {
        const dateStart = dateTimestamp(date);
        if (dateStart === null) continue;
        const dateInterval = { start: dateStart, end: dateStart + DAY_IN_MILLISECONDS };
        const occupants = bookingsUsingResource.filter((booking) => {
          const bookingInterval = getBookingInterval(booking.timeModel, booking.start, booking.end);
          return !!bookingInterval && bookingIntervalsOverlap(dateInterval, bookingInterval);
        });
        const usedCapacity = occupants.reduce((total, booking) => total + bookingUnits(booking), 0);
        if (usedCapacity + draftBookingUnits(draft) > resource.capacity) {
          fullDates.push(date);
          occupants.forEach((booking) => conflictingBookingIds.add(booking.bookingId));
        }
      }
      if (fullDates.length > 0) {
        const wording = resource.kind === "hotel-room-type" ? "ห้องที่ตรงกับเงื่อนไขเต็ม" : "โซนนี้เต็มแล้ว";
        conflicts.push(conflict(
          "capacity-conflict",
          `${wording}ในวันที่ ${fullDates.map(thaiBookingDate).join(", ")}`,
          resource.kind === "hotel-room-type" ? "change-date" : "change-resource",
          { resourceId: resource.id, resourceKind: resource.kind, bookingIds: [...conflictingBookingIds], dates: fullDates },
        ));
      }
    }
  }

  return { available: conflicts.length === 0, service, interval, conflicts };
}

export function evaluatePrototypeBookingAvailability(draft: PrototypeBookingDraft, context: DemoBusinessContext) {
  // Non-authoritative interaction preview only. Every BE3 command performs a
  // fresh server-side availability check in the same durable write unit.
  return evaluateBookingAvailability(draft, context, listPrototypeBookings(null));
}

export function durableBookingAvailabilityInput(draft: PrototypeBookingDraft): BookingAvailabilityInput {
  return {
    businessId: draft.businessId,
    branchId: draft.branchId,
    bookingId: draft.bookingId,
    serviceId: draft.serviceId,
    customerId: draft.customer?.id ?? "",
    petIds: draft.pets.map((pet) => pet.id),
    start: draft.start,
    end: draft.timeModel === "day" ? null : draft.end || null,
    assignedResourceIds: [...new Set(draft.assignedResourceIds.filter(Boolean))],
    status: draft.status,
  };
}

export function durableCreateBookingInputFromDraft(
  draft: PrototypeBookingDraft,
  idempotencyKey: string,
): CreateBookingInput {
  const availability = durableBookingAvailabilityInput(draft);
  const { bookingId, ...input } = availability;
  void bookingId;
  return {
    ...input,
    estimate: draft.estimate,
    notes: draft.notes.trim(),
    idempotencyKey,
  };
}

export function durableUpdateBookingInputFromDraft(
  draft: PrototypeBookingDraft,
  expectedRevision: number,
): UpdateBookingInput {
  const availability = durableBookingAvailabilityInput(draft);
  const { bookingId, ...input } = availability;
  void bookingId;
  return {
    ...input,
    bookingId: draft.bookingId ?? "",
    expectedRevision,
    estimate: draft.estimate,
    notes: draft.notes.trim(),
  };
}

function projectDurableConflictCode(code: DurableBookingConflict["code"]): BookingConflictCode {
  switch (code) {
    case "BRANCH_INACTIVE": return "branch-inactive";
    case "BRANCH_CLOSED": return "branch-closed";
    case "OUTSIDE_OPERATING_HOURS": return "outside-operating-hours";
    case "MODULE_DISABLED": return "service-not-enabled";
    case "SERVICE_UNAVAILABLE": return "service-not-found";
    case "CUSTOMER_UNAVAILABLE": return "missing-customer";
    case "PET_UNAVAILABLE": return "missing-pet";
    case "CUSTOMER_PET_RELATIONSHIP_MISSING": return "invalid-pet-selection";
    case "INVALID_TIME": return "invalid-time";
    case "MISSING_RESOURCE": return "missing-resource";
    case "RESOURCE_UNAVAILABLE": return "invalid-resource";
    case "STAFF_UNAVAILABLE": return "staff-unavailable";
    case "TIME_CONFLICT": return "resource-conflict";
    case "CAPACITY_CONFLICT": return "capacity-conflict";
    case "DUPLICATE_BOOKING": return "duplicate-confirmation";
    case "VERSION_CONFLICT": return "version-conflict";
    case "IDEMPOTENCY_KEY_REUSED": return "idempotency-key-reused";
  }
}

export function projectDurableBookingAvailability(
  availability: DurableBookingAvailability,
  draft: PrototypeBookingDraft,
  context: DemoBusinessContext,
): BookingAvailabilityResult {
  const service = getBookingServices(context).find((candidate) => candidate.id === draft.serviceId) ?? null;
  return {
    available: availability.available,
    service,
    interval: service ? getBookingInterval(service.timeModel, draft.start, draft.end || null) : null,
    conflicts: availability.conflicts.map((item) => ({
      code: projectDurableConflictCode(item.code),
      message: item.message,
      recovery: item.recovery === "reload" ? "return-to-edit" : item.recovery,
      resourceId: item.resourceId,
      resourceKind: item.resourceKind,
      bookingIds: item.bookingIds ? [...item.bookingIds] : undefined,
      dates: item.dates ? [...item.dates] : undefined,
    })),
  };
}

function clonePrototypeServiceJob(job: PrototypeServiceJob): PrototypeServiceJob {
  return {
    ...job,
    assignedResourceIds: [...job.assignedResourceIds],
    addOns: job.addOns.map((addOn) => ({ ...addOn })),
    history: job.history.map((item) => ({ ...item })),
  };
}

function isServiceJobStatus(value: unknown): value is ServiceJobStatus {
  return value === "booked"
    || value === "checked-in"
    || value === "waiting"
    || value === "in-service"
    || value === "ready-for-pickup"
    || value === "completed"
    || value === "cancelled";
}

function isPrototypeServiceJob(value: unknown): value is PrototypeServiceJob {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const job = value as Partial<PrototypeServiceJob>;
  return typeof job.serviceJobId === "string"
    && typeof job.bookingId === "string"
    && (typeof job.intakeId === "string" || job.intakeId === null)
    && typeof job.businessId === "string"
    && typeof job.branchId === "string"
    && typeof job.customerId === "string"
    && typeof job.petId === "string"
    && job.serviceModule === "grooming"
    && typeof job.baseServiceId === "string"
    && typeof job.scheduledStart === "string"
    && (typeof job.scheduledEnd === "string" || job.scheduledEnd === null)
    && typeof job.estimatedDurationMinutes === "number"
    && (typeof job.actualStartedAt === "string" || job.actualStartedAt === null)
    && (typeof job.actualCompletedAt === "string" || job.actualCompletedAt === null)
    && Array.isArray(job.assignedResourceIds)
    && job.assignedResourceIds.every((id) => typeof id === "string")
    && isServiceJobStatus(job.status)
    && typeof job.businessNote === "string"
    && Array.isArray(job.addOns)
    && job.addOns.every((addOn) => addOn && typeof addOn === "object" && typeof addOn.id === "string" && (typeof addOn.sourceRequestId === "string" || addOn.sourceRequestId === null) && typeof addOn.label === "string" && typeof addOn.additionalPrice === "number" && typeof addOn.additionalMinutes === "number" && typeof addOn.approvedAt === "string")
    && Array.isArray(job.history)
    && job.history.every((item) => item && typeof item === "object" && typeof item.id === "string" && typeof item.at === "string" && typeof item.summary === "string" && (item.type === "created" || item.type === "status" || item.type === "assignment" || item.type === "add-on" || item.type === "note" || item.type === "intake"))
    && typeof job.createdAt === "string"
    && typeof job.updatedAt === "string"
    && (typeof job.cancelledAt === "string" || job.cancelledAt === null);
}

function groomingJobDurationMinutes(start: string, end: string | null, fallback = 60) {
  if (!end) return fallback;
  const startAt = dateTimeTimestamp(start);
  const endAt = dateTimeTimestamp(end);
  if (startAt === null || endAt === null) return fallback;
  const minutes = Math.round((endAt - startAt) / 60_000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : fallback;
}

function serviceJobIdForBookingPet(bookingId: string, petId: string) {
  return `grooming-job-${bookingId}-${petId}`;
}

function serviceJobHistoryId(type: PrototypeServiceJobHistoryItem["type"]) {
  return `service-job-${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildGroomingServiceJobFromBooking(
  booking: PrototypeBooking,
  pet: DemoBookingPet,
  now: string,
): PrototypeServiceJob {
  return {
    serviceJobId: serviceJobIdForBookingPet(booking.bookingId, pet.id),
    bookingId: booking.bookingId,
    intakeId: null,
    businessId: booking.businessId,
    branchId: booking.branchId,
    customerId: booking.customer.id,
    petId: pet.id,
    serviceModule: "grooming",
    baseServiceId: booking.service.id,
    scheduledStart: booking.start,
    scheduledEnd: booking.end,
    estimatedDurationMinutes: groomingJobDurationMinutes(booking.start, booking.end),
    actualStartedAt: null,
    actualCompletedAt: null,
    assignedResourceIds: [...booking.assignedResources],
    status: "booked",
    businessNote: "",
    addOns: [],
    history: [{ id: serviceJobHistoryId("created"), at: now, type: "created", summary: "สร้างงานจากการจอง" }],
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
  };
}

function mergedPrototypeServiceJobs(store: BusinessStore) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readExecutions().flatMap((e) => e.kind === "grooming" ? [clonePrototypeServiceJob(e.record)] : []);
  const jobs = new Map<string, PrototypeServiceJob>();
  for (const fixture of DEMO_GROOMING_SERVICE_JOB_FIXTURES) jobs.set(fixture.serviceJobId, clonePrototypeServiceJob(fixture));
  for (const stored of Object.values(store.serviceJobs)) {
    if (isPrototypeServiceJob(stored)) jobs.set(stored.serviceJobId, clonePrototypeServiceJob(stored));
  }

  // A Grooming Booking always projects at least one Pet-specific operational
  // job. Saving a Booking persists it; this projection also keeps old BF-2
  // local bookings readable after the additive BF-5 migration.
  for (const booking of mergedPrototypeBookings()) {
    if (booking.serviceModule !== "grooming" || booking.status === "cancelled") continue;
    for (const pet of booking.pets) {
      const existing = [...jobs.values()].find((job) => job.bookingId === booking.bookingId && job.petId === pet.id) ?? null;
      if (!existing) {
        const createdAt = booking.createdAt || SERVICE_JOB_FIXTURE_CREATED_AT;
        const job = buildGroomingServiceJobFromBooking(booking, pet, createdAt);
        jobs.set(job.serviceJobId, job);
      }
    }
  }
  return [...jobs.values()];
}

function groomJobMatchesContext(job: PrototypeServiceJob, context?: DemoBusinessContext | null) {
  return !context || (job.businessId === context.businessId && job.branchId === context.branchId);
}

export type ListPrototypeServiceJobsOptions = {
  includeCancelled?: boolean;
  date?: string;
};

function filterAndSortPrototypeServiceJobs(
  jobs: readonly PrototypeServiceJob[],
  context?: DemoBusinessContext | null,
  options: ListPrototypeServiceJobsOptions = {},
) {
  const includeCancelled = options.includeCancelled ?? false;
  return jobs
    .filter((job) => groomJobMatchesContext(job, context))
    .filter((job) => includeCancelled || job.status !== "cancelled")
    .filter((job) => !options.date || job.scheduledStart.slice(0, 10) === options.date)
    .map(clonePrototypeServiceJob)
    .sort((first, second) => first.scheduledStart.localeCompare(second.scheduledStart) || first.serviceJobId.localeCompare(second.serviceJobId));
}

export function listPrototypeGroomingServiceJobFixtures(
  context?: DemoBusinessContext | null,
  options: ListPrototypeServiceJobsOptions = {},
) {
  return filterAndSortPrototypeServiceJobs(mergedPrototypeServiceJobs(emptyStore()), context, options);
}

export function listPrototypeGroomingServiceJobs(
  context?: DemoBusinessContext | null,
  options: ListPrototypeServiceJobsOptions = {},
) {
  return filterAndSortPrototypeServiceJobs(mergedPrototypeServiceJobs(readStore()), context, options);
}

export function readPrototypeGroomingServiceJob(serviceJobId: string) {
  return listPrototypeGroomingServiceJobs(null, { includeCancelled: true }).find((job) => job.serviceJobId === serviceJobId) ?? null;
}

export function findPrototypeGroomingServiceJobForBooking(bookingId: string, petId?: string | null) {
  return listPrototypeGroomingServiceJobs(null, { includeCancelled: true }).find((job) => (
    job.bookingId === bookingId && (!petId || job.petId === petId)
  )) ?? null;
}

export function groomingServiceJobOccursOnDate(job: PrototypeServiceJob, date: string) {
  return job.scheduledStart.slice(0, 10) === date;
}

export type GroomingServiceJobSummary = {
  total: number;
  booked: number;
  checkedIn: number;
  waiting: number;
  inService: number;
  readyForPickup: number;
  completed: number;
  cancelled: number;
};

export function summarizeGroomingServiceJobs(jobs: readonly PrototypeServiceJob[], date: string = BOOKING_DEMO_DATE): GroomingServiceJobSummary {
  const matching = jobs.filter((job) => groomingServiceJobOccursOnDate(job, date));
  return matching.reduce<GroomingServiceJobSummary>((summary, job) => {
    summary.total += 1;
    if (job.status === "booked") summary.booked += 1;
    if (job.status === "checked-in") summary.checkedIn += 1;
    if (job.status === "waiting") summary.waiting += 1;
    if (job.status === "in-service") summary.inService += 1;
    if (job.status === "ready-for-pickup") summary.readyForPickup += 1;
    if (job.status === "completed") summary.completed += 1;
    if (job.status === "cancelled") summary.cancelled += 1;
    return summary;
  }, { total: 0, booked: 0, checkedIn: 0, waiting: 0, inService: 0, readyForPickup: 0, completed: 0, cancelled: 0 });
}

export function getGroomingServiceJobSummary(
  context: DemoBusinessContext,
  date: string = BOOKING_DEMO_DATE,
  fixtureOnly = false,
) {
  const jobs = fixtureOnly
    ? listPrototypeGroomingServiceJobFixtures(context, { includeCancelled: false })
    : listPrototypeGroomingServiceJobs(context, { includeCancelled: false });
  return summarizeGroomingServiceJobs(jobs, date);
}

export function listCompletedPrototypeGroomingServiceJobs(
  customerId: string,
  fixtureOnly = false,
) {
  const jobs = fixtureOnly
    ? listPrototypeGroomingServiceJobFixtures(null, { includeCancelled: false })
    : listPrototypeGroomingServiceJobs(null, { includeCancelled: false });
  return jobs
    .filter((job) => job.customerId === customerId && job.status === "completed")
    .sort((first, second) => (second.actualCompletedAt ?? second.updatedAt).localeCompare(first.actualCompletedAt ?? first.updatedAt));
}

const SERVICE_JOB_TRANSITIONS: Record<ServiceJobStatus, readonly ServiceJobStatus[]> = {
  booked: ["checked-in", "waiting", "in-service", "ready-for-pickup", "completed", "cancelled"],
  "checked-in": ["booked", "waiting", "in-service", "ready-for-pickup", "completed", "cancelled"],
  waiting: ["booked", "checked-in", "in-service", "ready-for-pickup", "completed", "cancelled"],
  "in-service": ["booked", "checked-in", "waiting", "ready-for-pickup", "completed", "cancelled"],
  "ready-for-pickup": ["booked", "checked-in", "waiting", "in-service", "completed", "cancelled"],
  completed: ["booked", "checked-in", "waiting", "in-service", "ready-for-pickup"],
  cancelled: [],
};

export function serviceJobCanTransition(from: ServiceJobStatus, to: ServiceJobStatus) {
  return SERVICE_JOB_TRANSITIONS[from].includes(to);
}

function transitionServiceJobValue(
  job: PrototypeServiceJob,
  nextStatus: ServiceJobStatus,
  now: string,
  source: "board" | "intake" = "board",
) {
  const actualStartedAt = nextStatus === "in-service" ? job.actualStartedAt ?? now : job.actualStartedAt;
  const actualCompletedAt = nextStatus === "completed"
    ? job.actualCompletedAt ?? now
    : job.status === "completed" ? null : job.actualCompletedAt;
  const cancelledAt = nextStatus === "cancelled" ? job.cancelledAt ?? now : job.cancelledAt;
  const transitionLabel = nextStatus === "checked-in" && source === "intake"
    ? "รับเข้าแล้วจาก Intake"
    : `เปลี่ยนสถานะเป็น ${SERVICE_JOB_STATUS_LABELS[nextStatus]}`;
  return {
    ...clonePrototypeServiceJob(job),
    status: nextStatus,
    actualStartedAt,
    actualCompletedAt,
    cancelledAt,
    updatedAt: now,
    history: [...job.history.map((item) => ({ ...item })), { id: serviceJobHistoryId(source === "intake" ? "intake" : "status"), at: now, type: source === "intake" ? "intake" : "status", summary: transitionLabel }],
  } satisfies PrototypeServiceJob;
}

// Pure lifecycle reducer used by the local interaction layer. Keeping it
// separate from session persistence lets invalid drops leave the prior Job
// untouched and makes the transition rules independently verifiable.
export function buildPrototypeGroomingServiceJobTransition(
  job: PrototypeServiceJob,
  nextStatus: ServiceJobStatus,
  now: string,
  source: "board" | "intake" = "board",
) {
  if (job.status === nextStatus) return clonePrototypeServiceJob(job);
  if (!serviceJobCanTransition(job.status, nextStatus)) return null;
  return transitionServiceJobValue(job, nextStatus, now, source);
}

export function transitionPrototypeGroomingServiceJob(
  serviceJobId: string,
  nextStatus: ServiceJobStatus,
  context?: DemoBusinessContext | null,
): ServiceJobTransitionResult {
  const store = readStore();
  const job = mergedPrototypeServiceJobs(store).find((item) => item.serviceJobId === serviceJobId) ?? null;
  if (!job) return { ok: false, reason: "missing" };
  if (!groomJobMatchesContext(job, context)) return { ok: false, reason: "wrong-context", job: clonePrototypeServiceJob(job) };
  if (job.status === nextStatus) return { ok: true, job: clonePrototypeServiceJob(job), duplicate: true };
  if (!serviceJobCanTransition(job.status, nextStatus)) return { ok: false, reason: "invalid-transition", job: clonePrototypeServiceJob(job) };

  const next = buildPrototypeGroomingServiceJobTransition(job, nextStatus, new Date().toISOString());
  if (!next) return { ok: false, reason: "invalid-transition", job: clonePrototypeServiceJob(job) };
  // A fixture-derived or previously completed proof must be persisted before
  // this source leaves completed, otherwise a reopen could make its history
  // disappear on the next selector read.
  if (job.status === "completed" && next.status !== "completed") {
    ensurePrototypeServiceRecordForGroomingJobInStore(store, job);
  }
  store.serviceJobs[next.serviceJobId] = next;
  // Completion creates one source-keyed Service Record in the same local
  // transaction. Re-completion refreshes that same record and preserves the
  // prior safe snapshot as audit history; there is no post-completion workflow.
  if (next.status === "completed") refreshPrototypeServiceRecordForGroomingJobInStore(store, next);
  if (!writeStore(store)) return { ok: false, reason: "storage", job: clonePrototypeServiceJob(job) };
  return { ok: true, job: clonePrototypeServiceJob(next), duplicate: false };
}

export function evaluatePrototypeGroomingServiceJobResources(
  job: PrototypeServiceJob,
  assignedResourceIds: readonly string[],
  context: DemoBusinessContext,
  sourceJobs = listPrototypeGroomingServiceJobs(context, { includeCancelled: false }),
): ServiceJobResourceAvailability {
  const resources = getBookingResources(context, job.baseServiceId);
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  const selectedIds = [...new Set(assignedResourceIds.filter(Boolean))];
  const conflicts: ServiceJobResourceConflict[] = [];
  const currentInterval = getBookingInterval("appointment", job.scheduledStart, job.scheduledEnd);
  if (!currentInterval) return { available: false, conflicts: [{ code: "invalid-time", resourceId: "", resourceLabel: "เวลา", message: "ช่วงเวลางานนี้ไม่พร้อมตรวจทรัพยากร", conflictingJobIds: [] }] };

  for (const resourceId of selectedIds) {
    const resource = resourceById.get(resourceId);
    if (!resource) {
      conflicts.push({ code: "invalid-resource", resourceId, resourceLabel: "ทรัพยากร", message: "ทรัพยากรนี้ไม่อยู่ในสาขาหรือบริการปัจจุบัน", conflictingJobIds: [] });
      continue;
    }
    const eligibility = evaluateTeamResourceEligibility(resource, context, currentInterval);
    if (eligibility && !eligibility.ok) {
      conflicts.push({
        code: eligibility.code,
        resourceId,
        resourceLabel: resource.label,
        message: eligibility.message,
        conflictingJobIds: [],
        staffId: eligibility.staffId,
      });
      continue;
    }
    const overlapping = sourceJobs.filter((candidate) => {
      if (candidate.bookingId === job.bookingId || candidate.serviceJobId === job.serviceJobId || candidate.status === "cancelled") return false;
      if (!candidate.assignedResourceIds.includes(resourceId)) return false;
      const candidateInterval = getBookingInterval("appointment", candidate.scheduledStart, candidate.scheduledEnd);
      return Boolean(candidateInterval && bookingIntervalsOverlap(currentInterval, candidateInterval));
    });
    const exceedsCapacity = resource.capacityMode === "exclusive" ? overlapping.length > 0 : overlapping.length + 1 > resource.capacity;
    if (exceedsCapacity) {
      conflicts.push({
        code: "resource-conflict",
        resourceId,
        resourceLabel: resource.label,
        message: `${resource.label} มีงานซ้อนในช่วงเวลานี้`,
        conflictingJobIds: overlapping.map((candidate) => candidate.serviceJobId),
      });
    }
  }
  return { available: conflicts.length === 0, conflicts };
}

export type AssignPrototypeGroomingServiceJobResourcesResult =
  | { ok: true; job: PrototypeServiceJob; availability: ServiceJobResourceAvailability }
  | { ok: false; reason: "missing" | "wrong-context" | "unavailable" | "storage"; availability?: ServiceJobResourceAvailability };

export function assignPrototypeGroomingServiceJobResources(
  serviceJobId: string,
  assignedResourceIds: readonly string[],
  context: DemoBusinessContext,
): AssignPrototypeGroomingServiceJobResourcesResult {
  const store = readStore();
  const job = mergedPrototypeServiceJobs(store).find((item) => item.serviceJobId === serviceJobId) ?? null;
  if (!job) return { ok: false, reason: "missing" };
  if (!groomJobMatchesContext(job, context)) return { ok: false, reason: "wrong-context" };
  const availability = evaluatePrototypeGroomingServiceJobResources(job, assignedResourceIds, context, filterAndSortPrototypeServiceJobs(mergedPrototypeServiceJobs(store), context, { includeCancelled: false }));
  if (!availability.available) return { ok: false, reason: "unavailable", availability };
  const normalizedIds = [...new Set(assignedResourceIds.filter(Boolean))];
  const now = new Date().toISOString();
  const next: PrototypeServiceJob = {
    ...clonePrototypeServiceJob(job),
    assignedResourceIds: normalizedIds,
    updatedAt: now,
    history: [...job.history.map((item) => ({ ...item })), { id: serviceJobHistoryId("assignment"), at: now, type: "assignment", summary: "อัปเดตทรัพยากรที่รับผิดชอบ" }],
  };
  store.serviceJobs[next.serviceJobId] = next;
  if (!writeStore(store)) return { ok: false, reason: "storage", availability };
  return { ok: true, job: clonePrototypeServiceJob(next), availability };
}

export function updatePrototypeGroomingServiceJobNote(
  serviceJobId: string,
  businessNote: string,
  context: DemoBusinessContext,
) {
  const store = readStore();
  const job = mergedPrototypeServiceJobs(store).find((item) => item.serviceJobId === serviceJobId) ?? null;
  if (!job || !groomJobMatchesContext(job, context)) return null;
  const note = businessNote.trim();
  if (note === job.businessNote) return clonePrototypeServiceJob(job);
  const now = new Date().toISOString();
  const next: PrototypeServiceJob = {
    ...clonePrototypeServiceJob(job),
    businessNote: note,
    updatedAt: now,
    history: [...job.history.map((item) => ({ ...item })), { id: serviceJobHistoryId("note"), at: now, type: "note", summary: "อัปเดตหมายเหตุของร้าน" }],
  };
  store.serviceJobs[next.serviceJobId] = next;
  return writeStore(store) ? clonePrototypeServiceJob(next) : null;
}

export function applyPrototypeApprovedGroomingAddOn(input: {
  serviceJobId?: string | null;
  bookingId: string;
  sourceRequestId: string;
  serviceName: string;
  additionalPrice: number;
  additionalMinutes: number;
  approvedAt: string;
}) {
  if (!isWholeBaht(input.additionalPrice) || input.additionalPrice < 0) return null;
  const store = readStore();
  const job = (input.serviceJobId
    ? mergedPrototypeServiceJobs(store).find((item) => item.serviceJobId === input.serviceJobId)
    : null) ?? mergedPrototypeServiceJobs(store).find((item) => item.bookingId === input.bookingId) ?? null;
  if (!job || job.status === "cancelled") return null;
  const duplicate = job.addOns.some((addOn) => addOn.sourceRequestId === input.sourceRequestId);
  if (duplicate) return { job: clonePrototypeServiceJob(job), duplicate: true };
  const now = input.approvedAt;
  const addOn: PrototypeServiceJobAddOn = {
    id: `service-job-addon-${input.sourceRequestId}`,
    sourceRequestId: input.sourceRequestId,
    label: input.serviceName.trim(),
    additionalPrice: input.additionalPrice,
    additionalMinutes: Math.round(input.additionalMinutes),
    approvedAt: now,
  };
  const next: PrototypeServiceJob = {
    ...clonePrototypeServiceJob(job),
    addOns: [...job.addOns.map((item) => ({ ...item })), addOn],
    estimatedDurationMinutes: job.estimatedDurationMinutes + addOn.additionalMinutes,
    updatedAt: now,
    history: [...job.history.map((item) => ({ ...item })), { id: serviceJobHistoryId("add-on"), at: now, type: "add-on", summary: `เจ้าของอนุมัติ ${addOn.label}` }],
  };
  store.serviceJobs[next.serviceJobId] = next;
  return writeStore(store) ? { job: clonePrototypeServiceJob(next), duplicate: false } : null;
}

function synchronizePrototypeGroomingJobsForBooking(store: BusinessStore, booking: PrototypeBooking, now: string) {
  const existingJobs = mergedPrototypeServiceJobs(store).filter((job) => job.bookingId === booking.bookingId);
  if (booking.serviceModule !== "grooming" || booking.status === "cancelled") {
    for (const job of existingJobs) {
      if (job.status === "completed" || job.status === "cancelled") continue;
      const cancelled = transitionServiceJobValue(job, "cancelled", now);
      store.serviceJobs[cancelled.serviceJobId] = cancelled;
    }
    return;
  }

  for (const pet of booking.pets) {
    const existing = existingJobs.find((job) => job.petId === pet.id) ?? null;
    if (!existing) {
      const job = buildGroomingServiceJobFromBooking(booking, pet, now);
      store.serviceJobs[job.serviceJobId] = job;
      continue;
    }
    const preserveActualAssignment = existing.status !== "booked";
    const next: PrototypeServiceJob = {
      ...clonePrototypeServiceJob(existing),
      businessId: booking.businessId,
      branchId: booking.branchId,
      customerId: booking.customer.id,
      baseServiceId: booking.service.id,
      scheduledStart: booking.start,
      scheduledEnd: booking.end,
      estimatedDurationMinutes: groomingJobDurationMinutes(booking.start, booking.end) + existing.addOns.reduce((total, addOn) => total + addOn.additionalMinutes, 0),
      assignedResourceIds: preserveActualAssignment ? [...existing.assignedResourceIds] : [...booking.assignedResources],
      updatedAt: now,
    };
    store.serviceJobs[next.serviceJobId] = next;
  }
  for (const existing of existingJobs) {
    if (booking.pets.some((pet) => pet.id === existing.petId) || existing.status === "completed" || existing.status === "cancelled") continue;
    const cancelled = transitionServiceJobValue(existing, "cancelled", now);
    store.serviceJobs[cancelled.serviceJobId] = cancelled;
  }
}

function clonePrototypeHotelStay(stay: PrototypeHotelStay): PrototypeHotelStay {
  return {
    ...stay,
    roomAssignments: stay.roomAssignments.map((assignment) => ({ ...assignment })),
    roomMoveHistory: stay.roomMoveHistory.map((move) => ({ ...move })),
    dailyCareTasks: stay.dailyCareTasks.map((task) => ({
      ...task,
      authorization: task.authorization ? { ...task.authorization } : task.authorization,
    })),
    incidentNotes: (stay.incidentNotes ?? []).map((incident) => ({ ...incident })),
    history: stay.history.map((item) => ({ ...item })),
  };
}

function isHotelStayStatus(value: unknown): value is HotelStayStatus {
  return value === "booked"
    || value === "expected-today"
    || value === "checked-in"
    || value === "in-stay"
    || value === "ready-for-checkout"
    || value === "checked-out"
    || value === "completed"
    || value === "cancelled"
    || value === "no-show";
}

function isPrototypeHotelRoomAssignment(value: unknown): value is PrototypeHotelRoomAssignment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const assignment = value as Partial<PrototypeHotelRoomAssignment>;
  return typeof assignment.id === "string"
    && typeof assignment.roomId === "string"
    && typeof assignment.startDate === "string"
    && (typeof assignment.endDate === "string" || assignment.endDate === null)
    && typeof assignment.assignedAt === "string"
    && (typeof assignment.assignedBy === "string" || assignment.assignedBy === null)
    && (typeof assignment.reason === "string" || assignment.reason === null);
}

function isPrototypeHotelRoomMove(value: unknown): value is PrototypeHotelRoomMove {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const move = value as Partial<PrototypeHotelRoomMove>;
  return typeof move.id === "string"
    && typeof move.movedAt === "string"
    && (typeof move.fromRoomId === "string" || move.fromRoomId === null)
    && typeof move.toRoomId === "string"
    && (typeof move.reason === "string" || move.reason === null);
}

function isPrototypeHotelCareTask(value: unknown): value is PrototypeHotelCareTask {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const task = value as Partial<PrototypeHotelCareTask>;
  const authorization = task.authorization;
  const validAuthorization = authorization === undefined
    || authorization === null
    || (authorization.source === "customer-confirmed-intake"
      && typeof authorization.intakeId === "string"
      && typeof authorization.confirmedAt === "string");
  const validMedication = task.kind !== "medication"
    || (typeof task.instructions === "string"
      && task.instructions.trim().length > 0
      && authorization?.source === "customer-confirmed-intake"
      && typeof authorization.intakeId === "string"
      && authorization.intakeId.length > 0);
  return typeof task.id === "string"
    && (task.kind === "meal" || task.kind === "water" || task.kind === "medication" || task.kind === "activity" || task.kind === "cleaning" || task.kind === "check" || task.kind === "note" || task.kind === "other")
    && typeof task.label === "string"
    && typeof task.scheduledDate === "string"
    && typeof task.scheduledTime === "string"
    && (typeof task.assignedStaffId === "string" || task.assignedStaffId === null || task.assignedStaffId === undefined)
    && (task.state === "pending" || task.state === "completed")
    && (typeof task.completedAt === "string" || task.completedAt === null)
    && (typeof task.completedBy === "string" || task.completedBy === null)
    && (typeof task.instructions === "string" || task.instructions === null || task.instructions === undefined)
    && validAuthorization
    && validMedication;
}

export function prototypeHotelCareTaskIsAuthorized(task: PrototypeHotelCareTask) {
  if (task.kind !== "medication") return true;
  return Boolean(
    task.instructions?.trim()
    && task.authorization?.source === "customer-confirmed-intake"
    && task.authorization.intakeId,
  );
}

function isPrototypeHotelIncidentNote(value: unknown): value is PrototypeHotelIncidentNote {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const incident = value as Partial<PrototypeHotelIncidentNote>;
  return typeof incident.id === "string"
    && typeof incident.summary === "string"
    && (incident.severity === "attention" || incident.severity === "info")
    && typeof incident.createdAt === "string"
    && (typeof incident.createdBy === "string" || incident.createdBy === null)
    && (typeof incident.resolvedAt === "string" || incident.resolvedAt === null)
    && (typeof incident.resolvedBy === "string" || incident.resolvedBy === null);
}

function isPrototypeHotelStayHistoryItem(value: unknown): value is PrototypeHotelStayHistoryItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Partial<PrototypeHotelStayHistoryItem>;
  return typeof item.id === "string"
    && typeof item.at === "string"
    && (item.type === "created" || item.type === "status" || item.type === "room-assignment" || item.type === "room-move" || item.type === "care" || item.type === "care-assignment" || item.type === "note" || item.type === "incident" || item.type === "intake" || item.type === "dates")
    && typeof item.summary === "string";
}

function isPrototypeHotelStay(value: unknown): value is PrototypeHotelStay {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const stay = value as Partial<PrototypeHotelStay>;
  return typeof stay.hotelStayId === "string"
    && typeof stay.bookingId === "string"
    && (typeof stay.intakeId === "string" || stay.intakeId === null)
    && typeof stay.businessId === "string"
    && typeof stay.branchId === "string"
    && typeof stay.customerId === "string"
    && typeof stay.petId === "string"
    && typeof stay.scheduledCheckIn === "string"
    && typeof stay.scheduledCheckOut === "string"
    && (typeof stay.actualCheckInAt === "string" || stay.actualCheckInAt === null)
    && (typeof stay.actualCheckOutAt === "string" || stay.actualCheckOutAt === null)
    && isHotelStayStatus(stay.status)
    && Array.isArray(stay.roomAssignments)
    && stay.roomAssignments.every(isPrototypeHotelRoomAssignment)
    && Array.isArray(stay.roomMoveHistory)
    && stay.roomMoveHistory.every(isPrototypeHotelRoomMove)
    && (typeof stay.guardianCareInstruction === "string" || stay.guardianCareInstruction === null)
    && typeof stay.businessNote === "string"
    && Array.isArray(stay.dailyCareTasks)
    && stay.dailyCareTasks.every(isPrototypeHotelCareTask)
    && (stay.incidentNotes === undefined || (Array.isArray(stay.incidentNotes) && stay.incidentNotes.every(isPrototypeHotelIncidentNote)))
    && Array.isArray(stay.history)
    && stay.history.every(isPrototypeHotelStayHistoryItem)
    && typeof stay.createdAt === "string"
    && typeof stay.updatedAt === "string"
    && (typeof stay.cancelledAt === "string" || stay.cancelledAt === null);
}

function hotelStayIdForBookingPet(bookingId: string, petId: string) {
  return `hotel-stay-${bookingId}-${petId}`;
}

function hotelStayHistoryId(type: PrototypeHotelStayHistoryItem["type"]) {
  return `hotel-stay-${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function hotelRoomAssignmentId() {
  return `hotel-room-assignment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function hotelRoomMoveId() {
  return `hotel-room-move-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function hotelIncidentNoteId() {
  return `hotel-incident-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultHotelCareTasks(hotelStayId: string, date: string): PrototypeHotelCareTask[] {
  return [
    { id: `${hotelStayId}-care-breakfast-${date}`, kind: "meal", label: "อาหารเช้า", scheduledDate: date, scheduledTime: "08:00", assignedStaffId: null, state: "pending", completedAt: null, completedBy: null },
    { id: `${hotelStayId}-care-water-${date}`, kind: "water", label: "ตรวจน้ำ", scheduledDate: date, scheduledTime: "12:00", assignedStaffId: null, state: "pending", completedAt: null, completedBy: null },
    { id: `${hotelStayId}-care-activity-${date}`, kind: "activity", label: "เดินเล่น / กิจกรรม", scheduledDate: date, scheduledTime: "15:00", assignedStaffId: null, state: "pending", completedAt: null, completedBy: null },
    { id: `${hotelStayId}-care-evening-${date}`, kind: "meal", label: "อาหารเย็น", scheduledDate: date, scheduledTime: "18:00", assignedStaffId: null, state: "pending", completedAt: null, completedBy: null },
    { id: `${hotelStayId}-care-note-${date}`, kind: "note", label: "บันทึกอัปเดตประจำวัน", scheduledDate: date, scheduledTime: "19:00", assignedStaffId: null, state: "pending", completedAt: null, completedBy: null },
  ];
}

function buildHotelStayFromBooking(booking: PrototypeBooking, pet: DemoBookingPet, now: string): PrototypeHotelStay {
  const hotelStayId = hotelStayIdForBookingPet(booking.bookingId, pet.id);
  const expectedToday = booking.start === BOOKING_DEMO_DATE;
  return {
    hotelStayId,
    bookingId: booking.bookingId,
    intakeId: null,
    businessId: booking.businessId,
    branchId: booking.branchId,
    customerId: booking.customer.id,
    petId: pet.id,
    scheduledCheckIn: booking.start,
    scheduledCheckOut: booking.end ?? addBusinessCalendarDays(booking.start, 1),
    actualCheckInAt: null,
    actualCheckOutAt: null,
    status: expectedToday ? "expected-today" : "booked",
    roomAssignments: [],
    roomMoveHistory: [],
    guardianCareInstruction: null,
    businessNote: "",
    dailyCareTasks: [],
    incidentNotes: [],
    history: [{ id: hotelStayHistoryId("created"), at: now, type: "created", summary: "สร้างรายการเข้าพักจากการจอง" }],
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
  };
}

function mergedPrototypeHotelStays(store: BusinessStore) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readExecutions().flatMap((e) => e.kind === "hotel" ? [clonePrototypeHotelStay(e.record)] : []);
  const stays = new Map<string, PrototypeHotelStay>();
  for (const fixture of DEMO_HOTEL_STAY_FIXTURES) stays.set(fixture.hotelStayId, clonePrototypeHotelStay(fixture));
  for (const stored of Object.values(store.hotelStays)) {
    if (isPrototypeHotelStay(stored)) stays.set(stored.hotelStayId, clonePrototypeHotelStay(stored));
  }

  // New or retained Hotel Bookings project a per-Pet execution record even
  // before a room is chosen. This deliberately keeps the two lifecycles
  // linked without turning them into one status field.
  for (const booking of mergedPrototypeBookings()) {
    if (booking.serviceModule !== "hotel" || booking.status === "cancelled") continue;
    for (const pet of booking.pets) {
      const existing = [...stays.values()].find((stay) => stay.bookingId === booking.bookingId && stay.petId === pet.id) ?? null;
      if (!existing) stays.set(hotelStayIdForBookingPet(booking.bookingId, pet.id), buildHotelStayFromBooking(booking, pet, booking.createdAt || HOTEL_STAY_FIXTURE_CREATED_AT));
    }
  }
  return [...stays.values()];
}

function hotelStayMatchesContext(stay: PrototypeHotelStay, context?: DemoBusinessContext | null) {
  return !context || (stay.businessId === context.businessId && stay.branchId === context.branchId);
}

export type ListPrototypeHotelStaysOptions = {
  includeClosed?: boolean;
  date?: string;
};

function hotelStayIsOpen(stay: PrototypeHotelStay) {
  return stay.status !== "cancelled" && stay.status !== "no-show" && stay.status !== "completed";
}

export function hotelStayOccursOnDate(stay: PrototypeHotelStay, date: string) {
  return stay.scheduledCheckIn <= date && date < stay.scheduledCheckOut;
}

function filterAndSortPrototypeHotelStays(
  stays: readonly PrototypeHotelStay[],
  context?: DemoBusinessContext | null,
  options: ListPrototypeHotelStaysOptions = {},
) {
  const includeClosed = options.includeClosed ?? false;
  return stays
    .filter((stay) => hotelStayMatchesContext(stay, context))
    .filter((stay) => includeClosed || hotelStayIsOpen(stay))
    .filter((stay) => !options.date || hotelStayOccursOnDate(stay, options.date) || (stay.scheduledCheckOut === options.date && stay.status === "ready-for-checkout"))
    .map(clonePrototypeHotelStay)
    .sort((first, second) => first.scheduledCheckIn.localeCompare(second.scheduledCheckIn) || first.hotelStayId.localeCompare(second.hotelStayId));
}

export function listPrototypeHotelStayFixtures(
  context?: DemoBusinessContext | null,
  options: ListPrototypeHotelStaysOptions = {},
) {
  return filterAndSortPrototypeHotelStays(mergedPrototypeHotelStays(emptyStore()), context, options);
}

export function listPrototypeHotelStays(
  context?: DemoBusinessContext | null,
  options: ListPrototypeHotelStaysOptions = {},
) {
  return filterAndSortPrototypeHotelStays(mergedPrototypeHotelStays(readStore()), context, options);
}

export function readPrototypeHotelStay(hotelStayId: string) {
  return listPrototypeHotelStays(null, { includeClosed: true }).find((stay) => stay.hotelStayId === hotelStayId) ?? null;
}

export type PrototypeTeamWorkItem = {
  id: string;
  staffId: string;
  kind: "grooming" | "hotel-care" | "daycare";
  sourceId: string;
  bookingId: string | null;
  hotelStayId: string | null;
  daycareAttendanceId?: string | null;
  label: string;
  startsAt: string;
  endsAt: string;
  status: string;
  conflict: boolean;
};

export type PrototypeTeamMemberWorkload = {
  items: PrototypeTeamWorkItem[];
  today: number;
  inProgress: PrototypeTeamWorkItem | null;
  next: PrototypeTeamWorkItem | null;
  conflicts: number;
  overload: boolean;
};

function teamWorkItemInterval(item: Pick<PrototypeTeamWorkItem, "startsAt" | "endsAt">) {
  return getBookingInterval("appointment", item.startsAt, item.endsAt);
}

function teamWorkItemConflict(items: readonly PrototypeTeamWorkItem[], item: PrototypeTeamWorkItem) {
  const interval = teamWorkItemInterval(item);
  if (!interval) return true;
  const member = readPrototypeTeamMember(item.staffId);
  if (member && !evaluatePrototypeTeamMemberAvailability(member, interval).available) return true;
  return items.some((candidate) => {
    if (candidate.id === item.id || candidate.staffId !== item.staffId) return false;
    const candidateInterval = teamWorkItemInterval(candidate);
    return Boolean(candidateInterval && bookingIntervalsOverlap(interval, candidateInterval));
  });
}

// Grooming execution is preferred over its parent Booking so a later Job
// reassignment never double-counts the person in Team workload. Hotel care
// stays task-level because a care assignee does not reserve an entire stay.
export function listPrototypeTeamWorkItems(
  context: DemoBusinessContext,
  date: string = BOOKING_DEMO_DATE,
  fixtureOnly = false,
) {
  const jobs = fixtureOnly
    ? listPrototypeGroomingServiceJobFixtures(context, { date, includeCancelled: false })
    : listPrototypeGroomingServiceJobs(context, { date, includeCancelled: false });
  const stays = fixtureOnly
    ? listPrototypeHotelStayFixtures(context, { date, includeClosed: true })
    : listPrototypeHotelStays(context, { date, includeClosed: true });
  const daycareAttendances = fixtureOnly
    ? listPrototypeDaycareAttendanceFixtures(context, { date, includeClosed: true })
    : listPrototypeDaycareAttendances(context, { date, includeClosed: true });
  const items: PrototypeTeamWorkItem[] = [];

  for (const job of jobs) {
    const interval = getBookingInterval("appointment", job.scheduledStart, job.scheduledEnd);
    if (!interval) continue;
    const staffIds = [...new Set(job.assignedResourceIds
      .map((resourceId) => getBookingResourceStaffMember(resourceId)?.staffId ?? null)
      .filter((staffId): staffId is string => Boolean(staffId)))];
    for (const staffId of staffIds) {
      items.push({
        id: `team-work-job-${job.serviceJobId}-${staffId}`,
        staffId,
        kind: "grooming",
        sourceId: job.serviceJobId,
        bookingId: job.bookingId,
        hotelStayId: null,
        label: "งานอาบน้ำ / ตัดขน",
        startsAt: job.scheduledStart,
        endsAt: job.scheduledEnd ?? job.scheduledStart,
        status: job.status,
        conflict: false,
      });
    }
  }

  for (const stay of stays) {
    for (const task of stay.dailyCareTasks) {
      if (task.scheduledDate !== date || !task.assignedStaffId) continue;
      const start = `${task.scheduledDate}T${task.scheduledTime}`;
      const startTimestamp = dateTimeTimestamp(start);
      if (startTimestamp === null) continue;
      items.push({
        id: `team-work-care-${stay.hotelStayId}-${task.id}-${task.assignedStaffId}`,
        staffId: task.assignedStaffId,
        kind: "hotel-care",
        sourceId: task.id,
        bookingId: stay.bookingId,
        hotelStayId: stay.hotelStayId,
        label: task.label,
        startsAt: start,
        endsAt: new Date(startTimestamp + 30 * 60 * 1000).toISOString().slice(0, 16),
        status: task.state,
        conflict: false,
      });
    }
  }

  for (const attendance of daycareAttendances) {
    if (!attendance.responsibleStaffId || ["cancelled", "completed"].includes(attendance.status)) continue;
    items.push({
      id: `team-work-daycare-${attendance.daycareAttendanceId}-${attendance.responsibleStaffId}`,
      staffId: attendance.responsibleStaffId,
      kind: "daycare",
      sourceId: attendance.daycareAttendanceId,
      bookingId: attendance.bookingId,
      hotelStayId: null,
      daycareAttendanceId: attendance.daycareAttendanceId,
      label: "ดูแล Daycare",
      startsAt: `${attendance.attendanceDate}T09:00`,
      endsAt: `${attendance.attendanceDate}T18:00`,
      status: attendance.status,
      conflict: false,
    });
  }

  const withConflicts = items.map((item) => ({ ...item, conflict: teamWorkItemConflict(items, item) }));
  return withConflicts.sort((first, second) => first.startsAt.localeCompare(second.startsAt) || first.id.localeCompare(second.id));
}

export function getPrototypeTeamMemberWorkload(
  staffId: string,
  context: DemoBusinessContext,
  date: string = BOOKING_DEMO_DATE,
  fixtureOnly = false,
): PrototypeTeamMemberWorkload {
  const items = listPrototypeTeamWorkItems(context, date, fixtureOnly).filter((item) => item.staffId === staffId);
  const now = date === BOOKING_DEMO_DATE ? dateTimeTimestamp(GROOMING_DEMO_NOW) : null;
  const inProgress = items.find((item) => {
    const interval = teamWorkItemInterval(item);
    return Boolean(interval && now !== null && interval.start <= now && now < interval.end);
  }) ?? null;
  const next = items.find((item) => {
    const interval = teamWorkItemInterval(item);
    return Boolean(interval && (now === null || interval.start >= now));
  }) ?? null;
  const conflicts = items.filter((item) => item.conflict).length;
  return { items, today: items.length, inProgress, next, conflicts, overload: items.length >= 4 || conflicts > 0 };
}

export function findPrototypeHotelStayForBooking(bookingId: string, petId?: string | null) {
  return listPrototypeHotelStays(null, { includeClosed: true }).find((stay) => (
    stay.bookingId === bookingId && (!petId || stay.petId === petId)
  )) ?? null;
}

export function getHotelRooms(context: DemoBusinessContext, fixtureOnly = false) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readOperationDirectory(context.businessId, context.branchId)?.rooms ?? [];
  // Physical room/zone assignment is explicitly BE4-local. BE3 exposes only
  // the aggregate planning-capacity resource, so keep this isolated fixture
  // adapter instead of treating execution rooms as durable scheduling truth.
  void fixtureOnly;
  return getBookingResources(context, undefined, true)
    .filter((resource) => resource.module === "hotel" && (resource.hotelRole === "room" || resource.hotelRole === "zone"));
}

function roomAssignmentInterval(stay: PrototypeHotelStay, assignment: PrototypeHotelRoomAssignment) {
  return getBookingInterval("date-range", assignment.startDate, assignment.endDate ?? stay.scheduledCheckOut);
}

export function getPrototypeHotelStayRoomAssignment(stay: PrototypeHotelStay, date: string = BOOKING_DEMO_DATE) {
  const current = stay.roomAssignments
    .filter((assignment) => assignment.startDate <= date && date < (assignment.endDate ?? stay.scheduledCheckOut))
    .at(-1) ?? null;
  if (current) return { ...current };
  // A room remains operationally relevant through a same-day checkout even
  // though its calendar span correctly ends at the exclusive checkout date.
  if (stay.status === "ready-for-checkout" && stay.scheduledCheckOut === date) {
    const last = stay.roomAssignments.at(-1) ?? null;
    return last ? { ...last } : null;
  }
  return null;
}

export function getPrototypeHotelStayRoomId(stay: PrototypeHotelStay, date: string = BOOKING_DEMO_DATE) {
  return getPrototypeHotelStayRoomAssignment(stay, date)?.roomId ?? null;
}

export type HotelRoomOccupancySummary = {
  occupied: number;
  reserved: number;
  capacity: number;
  available: number;
};

export function getPrototypeHotelRoomOccupancySummary(
  stays: readonly PrototypeHotelStay[],
  context: DemoBusinessContext,
  roomId: string,
  date: string = BOOKING_DEMO_DATE,
): HotelRoomOccupancySummary {
  const room = getHotelRooms(context).find((item) => item.id === roomId) ?? null;
  if (!room) return { occupied: 0, reserved: 0, capacity: 0, available: 0 };
  const assigned = stays.filter((stay) => (
    hotelStayMatchesContext(stay, context)
    && hotelStayIsOpen(stay)
    && getPrototypeHotelStayRoomId(stay, date) === room.id
  ));
  const occupied = assigned.filter((stay) => ["checked-in", "in-stay", "ready-for-checkout"].includes(stay.status)).length;
  const reserved = assigned.filter((stay) => stay.status === "booked" || stay.status === "expected-today").length;
  return {
    occupied,
    reserved,
    capacity: room.capacity,
    available: Math.max(0, room.capacity - occupied - reserved),
  };
}

export function evaluatePrototypeHotelStayRoomAvailability(
  stay: PrototypeHotelStay,
  roomId: string,
  startDate: string,
  endDate: string,
  context: DemoBusinessContext,
  sourceStays = listPrototypeHotelStays(context, { includeClosed: true }),
): HotelRoomAvailability {
  const room = getHotelRooms(context).find((resource) => resource.id === roomId) ?? null;
  const interval = getBookingInterval("date-range", startDate, endDate);
  if (!room || !interval) {
    return {
      available: false,
      conflicts: [{
        roomId,
        roomLabel: room?.label ?? "ห้องที่เลือก",
        message: room ? "ช่วงวันเข้าพักไม่ถูกต้อง" : "ห้องหรือโซนนี้ใช้กับสาขาปัจจุบันไม่ได้",
        stayIds: [],
        dates: [],
      }],
    };
  }

  const overlapping = sourceStays.filter((candidate) => {
    if (candidate.hotelStayId === stay.hotelStayId || !hotelStayIsOpen(candidate)) return false;
    return candidate.roomAssignments.some((assignment) => {
      if (assignment.roomId !== room.id) return false;
      const assignmentInterval = roomAssignmentInterval(candidate, assignment);
      return Boolean(assignmentInterval && bookingIntervalsOverlap(interval, assignmentInterval));
    });
  });
  const capacityExceeded = overlapping.length + 1 > room.capacity;
  if (!capacityExceeded) return { available: true, conflicts: [] };
  const dates = calendarDaysInInterval(interval).filter((date) => overlapping.some((candidate) => candidate.roomAssignments.some((assignment) => {
    if (assignment.roomId !== room.id) return false;
    const assignmentInterval = roomAssignmentInterval(candidate, assignment);
    const dayStart = dateTimestamp(date);
    return Boolean(assignmentInterval && dayStart !== null && bookingIntervalsOverlap(assignmentInterval, { start: dayStart, end: dayStart + DAY_IN_MILLISECONDS }));
  })));
  const isZone = room.hotelRole === "zone";
  return {
    available: false,
    conflicts: [{
      roomId: room.id,
      roomLabel: room.label,
      message: isZone
        ? `${room.label} เต็มในวันที่ ${dates.map(thaiBookingDate).join(", ") || thaiBookingDate(startDate)}`
        : `${room.label} มีน้องเข้าพักช่วงวันที่เลือกแล้ว`,
      stayIds: overlapping.map((candidate) => candidate.hotelStayId),
      dates,
    }],
  };
}

export type HotelStaySummary = {
  total: number;
  arrivals: number;
  departures: number;
  current: number;
  readyForPickup: number;
  occupied: number;
  reserved: number;
  capacity: number;
  available: number;
  occupiedRooms: number;
  totalRooms: number;
  availableRooms: number;
  careDue: number;
  incidents: number;
  unassignedArrivals: number;
  attention: number;
};

export function summarizePrototypeHotelStays(
  stays: readonly PrototypeHotelStay[],
  context: DemoBusinessContext,
  date: string = BOOKING_DEMO_DATE,
  fixtureOnly = false,
): HotelStaySummary {
  const visible = stays.filter((stay) => hotelStayMatchesContext(stay, context));
  const operationalHistory = visible.filter((stay) => stay.status !== "cancelled" && stay.status !== "no-show");
  const open = visible.filter(hotelStayIsOpen);
  const arrivals = operationalHistory.filter((stay) => stay.scheduledCheckIn === date).length;
  const departures = operationalHistory.filter((stay) => stay.scheduledCheckOut === date).length;
  const readyForPickup = open.filter((stay) => stay.status === "ready-for-checkout").length;
  const currentStays = open.filter((stay) => (
    ["checked-in", "in-stay", "ready-for-checkout"].includes(stay.status)
    && (hotelStayOccursOnDate(stay, date) || stay.scheduledCheckOut === date)
  ));
  const reservedStays = open.filter((stay) => (
    (stay.status === "booked" || stay.status === "expected-today")
    && hotelStayOccursOnDate(stay, date)
    && Boolean(getPrototypeHotelStayRoomId(stay, date))
  ));
  const occupiedRoomIds = new Set(currentStays.map((stay) => getPrototypeHotelStayRoomId(stay, date)).filter((roomId): roomId is string => Boolean(roomId)));
  const reservedRoomIds = new Set(reservedStays.map((stay) => getPrototypeHotelStayRoomId(stay, date)).filter((roomId): roomId is string => Boolean(roomId)));
  const rooms = getHotelRooms(context, fixtureOnly);
  const totalRooms = rooms.length;
  const capacity = rooms.reduce((total, room) => total + room.capacity, 0);
  const occupied = currentStays.filter((stay) => Boolean(getPrototypeHotelStayRoomId(stay, date))).length;
  const reserved = reservedStays.length;
  const careDue = currentStays.reduce((total, stay) => total + stay.dailyCareTasks.filter((task) => task.scheduledDate === date && task.state === "pending").length, 0);
  const incidents = currentStays.reduce((total, stay) => total + stay.incidentNotes.filter((incident) => incident.severity === "attention" && !incident.resolvedAt).length, 0);
  const unassignedArrivals = open.filter((stay) => stay.scheduledCheckIn === date && !getPrototypeHotelStayRoomId(stay, date)).length;
  // A same-day ready-for-checkout stay is already represented in departures;
  // keep the dashboard action count useful instead of counting it twice.
  const readyOutsideDeparture = open.filter((stay) => (
    stay.status === "ready-for-checkout" && stay.scheduledCheckOut !== date
  )).length;
  const actionableDepartures = open.filter((stay) => stay.scheduledCheckOut === date && stay.status !== "checked-out").length;
  const attention = unassignedArrivals + actionableDepartures + careDue + incidents + readyOutsideDeparture;
  return {
    total: open.length,
    arrivals,
    departures,
    current: currentStays.length,
    readyForPickup,
    occupied,
    reserved,
    capacity,
    available: Math.max(0, capacity - occupied - reserved),
    occupiedRooms: occupiedRoomIds.size,
    totalRooms,
    availableRooms: Math.max(0, totalRooms - new Set([...occupiedRoomIds, ...reservedRoomIds]).size),
    careDue,
    incidents,
    unassignedArrivals,
    attention,
  };
}

export function getPrototypeHotelStaySummary(
  context: DemoBusinessContext,
  date: string = BOOKING_DEMO_DATE,
  fixtureOnly = false,
) {
  const stays = fixtureOnly
    ? listPrototypeHotelStayFixtures(context, { includeClosed: true })
    : listPrototypeHotelStays(context, { includeClosed: true });
  return summarizePrototypeHotelStays(stays, context, date, fixtureOnly);
}

function hotelStayHasOutstandingCare(stay: PrototypeHotelStay, throughDate: string = BOOKING_DEMO_DATE) {
  return stay.dailyCareTasks.some((task) => task.scheduledDate <= throughDate && task.state !== "completed");
}

const HOTEL_STAY_TRANSITIONS: Record<HotelStayStatus, readonly HotelStayStatus[]> = {
  booked: ["expected-today", "checked-in", "cancelled", "no-show"],
  "expected-today": ["checked-in", "cancelled", "no-show"],
  "checked-in": ["in-stay", "ready-for-checkout", "cancelled"],
  "in-stay": ["ready-for-checkout", "cancelled"],
  "ready-for-checkout": ["checked-out", "cancelled"],
  "checked-out": ["completed"],
  completed: [],
  cancelled: [],
  "no-show": [],
};

export function hotelStayCanTransition(from: HotelStayStatus, to: HotelStayStatus) {
  return HOTEL_STAY_TRANSITIONS[from].includes(to);
}

function transitionHotelStayValue(stay: PrototypeHotelStay, nextStatus: HotelStayStatus, now: string, source: "board" | "intake" = "board") {
  const checkedIn = nextStatus === "checked-in" ? stay.actualCheckInAt ?? now : stay.actualCheckInAt;
  const checkedOut = nextStatus === "checked-out" ? stay.actualCheckOutAt ?? now : stay.actualCheckOutAt;
  const cancelledAt = nextStatus === "cancelled" ? stay.cancelledAt ?? now : stay.cancelledAt;
  const careTasks = nextStatus === "checked-in" && stay.dailyCareTasks.length === 0
    ? defaultHotelCareTasks(stay.hotelStayId, stay.scheduledCheckIn)
    : stay.dailyCareTasks.map((task) => ({ ...task }));
  const statusLabel = nextStatus === "checked-in" && source === "intake"
    ? "รับเข้าแล้วจาก Intake"
    : `เปลี่ยนสถานะเป็น ${HOTEL_STAY_STATUS_LABELS[nextStatus]}`;
  return {
    ...clonePrototypeHotelStay(stay),
    status: nextStatus,
    actualCheckInAt: checkedIn,
    actualCheckOutAt: checkedOut,
    cancelledAt,
    dailyCareTasks: careTasks,
    updatedAt: now,
    history: [...stay.history.map((item) => ({ ...item })), { id: hotelStayHistoryId(source === "intake" ? "intake" : "status"), at: now, type: source === "intake" ? "intake" : "status", summary: statusLabel }],
  } satisfies PrototypeHotelStay;
}

export function transitionPrototypeHotelStay(
  hotelStayId: string,
  nextStatus: HotelStayStatus,
  context?: DemoBusinessContext | null,
): HotelStayTransitionResult {
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay) return { ok: false, reason: "missing" };
  if (!hotelStayMatchesContext(stay, context)) return { ok: false, reason: "wrong-context", stay: clonePrototypeHotelStay(stay) };
  if (stay.status === nextStatus) return { ok: true, stay: clonePrototypeHotelStay(stay), duplicate: true };
  if (!hotelStayCanTransition(stay.status, nextStatus)) return { ok: false, reason: "invalid-transition", stay: clonePrototypeHotelStay(stay) };
  if (nextStatus === "checked-in" && !getPrototypeHotelStayRoomId(stay, stay.scheduledCheckIn)) return { ok: false, reason: "room-required", stay: clonePrototypeHotelStay(stay) };
  if (nextStatus === "checked-out" && hotelStayHasOutstandingCare(stay, stay.scheduledCheckOut)) return { ok: false, reason: "care-incomplete", stay: clonePrototypeHotelStay(stay) };

  const next = transitionHotelStayValue(stay, nextStatus, new Date().toISOString());
  store.hotelStays[next.hotelStayId] = next;
  // A Hotel Service Record is only available after genuine checkout. The
  // summary never pulls guardianCareInstruction, Intake, or medical details.
  if (next.status === "checked-out" || next.status === "completed") ensurePrototypeServiceRecordForHotelStayInStore(store, next);
  if (!writeStore(store)) return { ok: false, reason: "storage", stay: clonePrototypeHotelStay(stay) };
  return { ok: true, stay: clonePrototypeHotelStay(next), duplicate: false };
}

export function checkInPrototypeHotelStay(hotelStayId: string, context: DemoBusinessContext): HotelStayTransitionResult {
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay) return { ok: false, reason: "missing" };
  if (!hotelStayMatchesContext(stay, context)) return { ok: false, reason: "wrong-context", stay: clonePrototypeHotelStay(stay) };
  if (stay.status === "checked-in" || stay.status === "in-stay") return { ok: true, stay: clonePrototypeHotelStay(stay), duplicate: true };
  if (!stay.intakeId || store.intakes[stay.intakeId]?.checkInState !== "checked-in") return { ok: false, reason: "intake-required", stay: clonePrototypeHotelStay(stay) };
  if (!getPrototypeHotelStayRoomId(stay, stay.scheduledCheckIn)) return { ok: false, reason: "room-required", stay: clonePrototypeHotelStay(stay) };
  if (!hotelStayCanTransition(stay.status, "checked-in")) return { ok: false, reason: "invalid-transition", stay: clonePrototypeHotelStay(stay) };
  const next = transitionHotelStayValue(stay, "checked-in", new Date().toISOString(), "intake");
  store.hotelStays[next.hotelStayId] = next;
  if (!writeStore(store)) return { ok: false, reason: "storage", stay: clonePrototypeHotelStay(stay) };
  return { ok: true, stay: clonePrototypeHotelStay(next), duplicate: false };
}

function roomAvailabilityForStore(
  store: BusinessStore,
  stay: PrototypeHotelStay,
  roomId: string,
  startDate: string,
  endDate: string,
  context: DemoBusinessContext,
) {
  return evaluatePrototypeHotelStayRoomAvailability(
    stay,
    roomId,
    startDate,
    endDate,
    context,
    filterAndSortPrototypeHotelStays(mergedPrototypeHotelStays(store), context, { includeClosed: true }),
  );
}

export function assignPrototypeHotelStayRoom(
  hotelStayId: string,
  roomId: string,
  context: DemoBusinessContext,
): AssignPrototypeHotelStayRoomResult {
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay) return { ok: false, reason: "missing" };
  if (!hotelStayMatchesContext(stay, context)) return { ok: false, reason: "wrong-context" };
  const availability = roomAvailabilityForStore(store, stay, roomId, stay.scheduledCheckIn, stay.scheduledCheckOut, context);
  if (!availability.available) return { ok: false, reason: "unavailable", availability };

  const existing = getPrototypeHotelStayRoomAssignment(stay, stay.scheduledCheckIn);
  const now = new Date().toISOString();
  const next: PrototypeHotelStay = {
    ...clonePrototypeHotelStay(stay),
    roomAssignments: existing
      ? stay.roomAssignments.map((assignment) => assignment.id === existing.id ? { ...assignment, roomId, assignedAt: now, assignedBy: context.memberLabel } : { ...assignment })
      : [...stay.roomAssignments.map((assignment) => ({ ...assignment })), {
        id: hotelRoomAssignmentId(),
        roomId,
        startDate: stay.scheduledCheckIn,
        endDate: stay.scheduledCheckOut,
        assignedAt: now,
        assignedBy: context.memberLabel,
        reason: null,
      }],
    updatedAt: now,
    history: [...stay.history.map((item) => ({ ...item })), { id: hotelStayHistoryId("room-assignment"), at: now, type: "room-assignment", summary: "ระบุห้องหรือโซนสำหรับการเข้าพัก" }],
  };
  store.hotelStays[next.hotelStayId] = next;
  if (!writeStore(store)) return { ok: false, reason: "storage", availability };
  return { ok: true, stay: clonePrototypeHotelStay(next), availability };
}

export function movePrototypeHotelStayRoom(
  hotelStayId: string,
  roomId: string,
  context: DemoBusinessContext,
  reason = "",
  effectiveDate: string = BOOKING_DEMO_DATE,
): AssignPrototypeHotelStayRoomResult {
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay) return { ok: false, reason: "missing" };
  if (!hotelStayMatchesContext(stay, context)) return { ok: false, reason: "wrong-context" };
  const current = getPrototypeHotelStayRoomAssignment(stay, effectiveDate);
  const availability = roomAvailabilityForStore(store, stay, roomId, effectiveDate, stay.scheduledCheckOut, context);
  if (!availability.available) return { ok: false, reason: "unavailable", availability };
  const now = new Date().toISOString();
  if (current?.roomId === roomId) return { ok: true, stay: clonePrototypeHotelStay(stay), availability };
  const normalizedReason = reason.trim() || null;
  const next: PrototypeHotelStay = {
    ...clonePrototypeHotelStay(stay),
    roomAssignments: [
      ...stay.roomAssignments.map((assignment) => assignment.id === current?.id ? { ...assignment, endDate: effectiveDate } : { ...assignment }),
      {
        id: hotelRoomAssignmentId(),
        roomId,
        startDate: effectiveDate,
        endDate: stay.scheduledCheckOut,
        assignedAt: now,
        assignedBy: context.memberLabel,
        reason: normalizedReason,
      },
    ],
    roomMoveHistory: [...stay.roomMoveHistory.map((move) => ({ ...move })), {
      id: hotelRoomMoveId(),
      movedAt: now,
      fromRoomId: current?.roomId ?? null,
      toRoomId: roomId,
      reason: normalizedReason,
    }],
    updatedAt: now,
    history: [...stay.history.map((item) => ({ ...item })), { id: hotelStayHistoryId("room-move"), at: now, type: "room-move", summary: "ย้ายห้องหรือโซนระหว่างเข้าพัก" }],
  };
  store.hotelStays[next.hotelStayId] = next;
  if (!writeStore(store)) return { ok: false, reason: "storage", availability };
  return { ok: true, stay: clonePrototypeHotelStay(next), availability };
}

function dateChangeAvailability(
  store: BusinessStore,
  stay: PrototypeHotelStay,
  startDate: string,
  endDate: string,
  context: DemoBusinessContext,
) {
  const source = filterAndSortPrototypeHotelStays(mergedPrototypeHotelStays(store), context, { includeClosed: true });
  for (const assignment of stay.roomAssignments) {
    const assignmentStart = assignment.startDate === stay.scheduledCheckIn ? startDate : assignment.startDate;
    const assignmentEnd = (assignment.endDate ?? stay.scheduledCheckOut) === stay.scheduledCheckOut ? endDate : assignment.endDate ?? endDate;
    const availability = evaluatePrototypeHotelStayRoomAvailability(stay, assignment.roomId, assignmentStart, assignmentEnd, context, source);
    if (!availability.available) return availability;
  }
  return { available: true, conflicts: [] } satisfies HotelRoomAvailability;
}

export function evaluatePrototypeHotelStayDateChange(
  hotelStayId: string,
  scheduledCheckIn: string,
  scheduledCheckOut: string,
  context: DemoBusinessContext,
): UpdatePrototypeHotelStayDatesResult {
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay) return { ok: false, reason: "missing" };
  if (!hotelStayMatchesContext(stay, context)) return { ok: false, reason: "wrong-context" };
  if (!getBookingInterval("date-range", scheduledCheckIn, scheduledCheckOut)) return { ok: false, reason: "invalid-dates" };
  const roomAvailability = dateChangeAvailability(store, stay, scheduledCheckIn, scheduledCheckOut, context);
  if (!roomAvailability.available) return { ok: false, reason: "unavailable", availability: roomAvailability };
  const booking = mergedPrototypeBookings().find((item) => item.bookingId === stay.bookingId) ?? null;
  if (!booking || booking.serviceModule !== "hotel") return { ok: false, reason: "missing" };
  // Read-only compatibility guard. The caller must reschedule through BE3;
  // only an authoritative successful result may update the local BE4 Stay.
  return { ok: true, stay: clonePrototypeHotelStay(stay) };
}

function hotelCareTaskInterval(task: Pick<PrototypeHotelCareTask, "scheduledDate" | "scheduledTime">): BookingInterval | null {
  const start = dateTimeTimestamp(`${task.scheduledDate}T${task.scheduledTime}`);
  return start === null ? null : { start, end: start + 30 * 60 * 1000 };
}

function hotelCareStaffAvailability(
  store: BusinessStore,
  staffId: string,
  task: PrototypeHotelCareTask,
  context: DemoBusinessContext,
) {
  const member = mergedPrototypeTeamMembers(store).find((candidate) => candidate.staffId === staffId) ?? null;
  if (!member || !teamMemberMatchesContext(member, context) || !member.capabilities.includes("hotel-care")) return null;
  return evaluatePrototypeTeamMemberAvailability(member, hotelCareTaskInterval(task));
}

export function assignPrototypeHotelCareTaskStaff(
  hotelStayId: string,
  taskId: string,
  staffId: string | null,
  context: DemoBusinessContext,
): AssignPrototypeHotelCareTaskStaffResult {
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay) return { ok: false, reason: "missing" };
  if (!hotelStayMatchesContext(stay, context)) return { ok: false, reason: "wrong-context" };
  const task = stay.dailyCareTasks.find((item) => item.id === taskId) ?? null;
  if (!task) return { ok: false, reason: "missing" };
  if (task.assignedStaffId === staffId) return { ok: true, stay: clonePrototypeHotelStay(stay), staffId, duplicate: true };

  if (staffId) {
    const availability = hotelCareStaffAvailability(store, staffId, task, context);
    if (!availability) return { ok: false, reason: "invalid-staff" };
    if (!availability.available) return { ok: false, reason: "unavailable", availability };
  }

  const assignedMember = staffId ? mergedPrototypeTeamMembers(store).find((member) => member.staffId === staffId) ?? null : null;
  const now = new Date().toISOString();
  const next: PrototypeHotelStay = {
    ...clonePrototypeHotelStay(stay),
    dailyCareTasks: stay.dailyCareTasks.map((item) => item.id === taskId ? { ...item, assignedStaffId: staffId } : { ...item }),
    updatedAt: now,
    history: [
      ...stay.history.map((item) => ({ ...item })),
      {
        id: hotelStayHistoryId("care-assignment"),
        at: now,
        type: "care-assignment",
        summary: staffId ? `มอบหมายงานดูแลให้ ${assignedMember?.name ?? "ทีม"}` : "ยกเลิกการมอบหมายงานดูแล",
      },
    ],
  };
  store.hotelStays[next.hotelStayId] = next;
  return writeStore(store)
    ? { ok: true, stay: clonePrototypeHotelStay(next), staffId, duplicate: false }
    : { ok: false, reason: "storage" };
}

export function completePrototypeHotelCareTask(
  hotelStayId: string,
  taskId: string,
  context: DemoBusinessContext,
) {
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay || !hotelStayMatchesContext(stay, context)) return null;
  const next = buildPrototypeHotelCareTaskCompletion(stay, taskId, new Date().toISOString(), context.memberLabel);
  if (!next) return null;
  store.hotelStays[next.hotelStayId] = next;
  return writeStore(store) ? clonePrototypeHotelStay(next) : null;
}

export function buildPrototypeHotelCareTaskCompletion(
  stay: PrototypeHotelStay,
  taskId: string,
  completedAt: string,
  completedBy: string | null,
) {
  const task = stay.dailyCareTasks.find((item) => item.id === taskId) ?? null;
  if (!task) return null;
  if (!prototypeHotelCareTaskIsAuthorized(task)) return null;
  if (task.state === "completed") return clonePrototypeHotelStay(stay);
  return {
    ...clonePrototypeHotelStay(stay),
    dailyCareTasks: stay.dailyCareTasks.map((item) => item.id === task.id ? { ...item, state: "completed", completedAt, completedBy } : { ...item }),
    updatedAt: completedAt,
    history: [...stay.history.map((item) => ({ ...item })), { id: hotelStayHistoryId("care"), at: completedAt, type: "care", summary: `ทำงานดูแล: ${task.label}` }],
  } satisfies PrototypeHotelStay;
}

export function updatePrototypeHotelStayNote(hotelStayId: string, businessNote: string, context: DemoBusinessContext) {
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay || !hotelStayMatchesContext(stay, context)) return null;
  const note = businessNote.trim();
  if (note === stay.businessNote) return clonePrototypeHotelStay(stay);
  const now = new Date().toISOString();
  const next: PrototypeHotelStay = {
    ...clonePrototypeHotelStay(stay),
    businessNote: note,
    updatedAt: now,
    history: [...stay.history.map((item) => ({ ...item })), { id: hotelStayHistoryId("note"), at: now, type: "note", summary: "อัปเดตหมายเหตุของร้าน" }],
  };
  store.hotelStays[next.hotelStayId] = next;
  return writeStore(store) ? clonePrototypeHotelStay(next) : null;
}

export function addPrototypeHotelIncidentNote(
  hotelStayId: string,
  summary: string,
  context: DemoBusinessContext,
  severity: PrototypeHotelIncidentNote["severity"] = "attention",
) {
  const normalizedSummary = summary.trim();
  if (!normalizedSummary) return null;
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay || !hotelStayMatchesContext(stay, context)) return null;
  const now = new Date().toISOString();
  const incident: PrototypeHotelIncidentNote = {
    id: hotelIncidentNoteId(),
    summary: normalizedSummary,
    severity,
    createdAt: now,
    createdBy: context.memberLabel,
    resolvedAt: null,
    resolvedBy: null,
  };
  const next: PrototypeHotelStay = {
    ...clonePrototypeHotelStay(stay),
    incidentNotes: [...stay.incidentNotes.map((item) => ({ ...item })), incident],
    updatedAt: now,
    history: [...stay.history.map((item) => ({ ...item })), { id: hotelStayHistoryId("incident"), at: now, type: "incident", summary: "เพิ่มบันทึกเหตุที่ต้องติดตาม" }],
  };
  store.hotelStays[next.hotelStayId] = next;
  return writeStore(store) ? clonePrototypeHotelStay(next) : null;
}

export function resolvePrototypeHotelIncidentNote(
  hotelStayId: string,
  incidentId: string,
  context: DemoBusinessContext,
) {
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay || !hotelStayMatchesContext(stay, context)) return null;
  const incident = stay.incidentNotes.find((item) => item.id === incidentId) ?? null;
  if (!incident) return null;
  if (incident.resolvedAt) return clonePrototypeHotelStay(stay);
  const now = new Date().toISOString();
  const next: PrototypeHotelStay = {
    ...clonePrototypeHotelStay(stay),
    incidentNotes: stay.incidentNotes.map((item) => item.id === incident.id
      ? { ...item, resolvedAt: now, resolvedBy: context.memberLabel }
      : { ...item }),
    updatedAt: now,
    history: [...stay.history.map((item) => ({ ...item })), { id: hotelStayHistoryId("incident"), at: now, type: "incident", summary: "ปิดบันทึกเหตุที่ติดตามแล้ว" }],
  };
  store.hotelStays[next.hotelStayId] = next;
  return writeStore(store) ? clonePrototypeHotelStay(next) : null;
}

export function listPrototypeHotelLinkedGroomingJobs(stay: PrototypeHotelStay, fixtureOnly = false) {
  const jobs = fixtureOnly
    ? listPrototypeGroomingServiceJobFixtures(null, { includeCancelled: false })
    : listPrototypeGroomingServiceJobs(null, { includeCancelled: false });
  return jobs.filter((job) => (
    job.businessId === stay.businessId
    && job.branchId === stay.branchId
    && job.customerId === stay.customerId
    && job.petId === stay.petId
    && job.scheduledStart.slice(0, 10) >= stay.scheduledCheckIn
    && job.scheduledStart.slice(0, 10) <= stay.scheduledCheckOut
  ));
}

// ---------------------------------------------------------------------------
// BF-11 Daycare Operations foundation
// ---------------------------------------------------------------------------

function clonePrototypeDaycareAttendance(attendance: PrototypeDaycareAttendance): PrototypeDaycareAttendance {
  return {
    ...attendance,
    careEvents: attendance.careEvents.map((event) => ({ ...event })),
    history: attendance.history.map((item) => ({ ...item })),
  };
}

function isDaycareAttendanceStatus(value: unknown): value is DaycareAttendanceStatus {
  return value === "booked"
    || value === "checked-in"
    || value === "active"
    || value === "ready-for-pickup"
    || value === "checked-out"
    || value === "completed"
    || value === "cancelled";
}

function isPrototypeDaycareAttendance(value: unknown): value is PrototypeDaycareAttendance {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const attendance = value as Partial<PrototypeDaycareAttendance>;
  return typeof attendance.daycareAttendanceId === "string"
    && typeof attendance.bookingId === "string"
    && typeof attendance.businessId === "string"
    && typeof attendance.branchId === "string"
    && typeof attendance.customerId === "string"
    && typeof attendance.petId === "string"
    && typeof attendance.attendanceDate === "string"
    && isDaycareAttendanceStatus(attendance.status)
    && Array.isArray(attendance.careEvents)
    && Array.isArray(attendance.history);
}

function daycareAttendanceIdForBookingPet(bookingId: string, petId: string) {
  return `daycare-${bookingId}-${petId}`;
}

function daycareHistoryItem(type: PrototypeDaycareHistoryItem["type"], summary: string, at = new Date().toISOString()): PrototypeDaycareHistoryItem {
  return { id: `daycare-history-${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, at, type, summary };
}

function buildDaycareAttendanceFromBooking(booking: PrototypeBooking, pet: DemoBookingPet, createdAt: string): PrototypeDaycareAttendance {
  const assignedZone = booking.assignedResources.find((resourceId) => DEMO_BOOKING_RESOURCES.some((resource) => resource.id === resourceId && resource.kind === "daycare-zone")) ?? booking.assignedResources[0] ?? null;
  return {
    daycareAttendanceId: daycareAttendanceIdForBookingPet(booking.bookingId, pet.id),
    bookingId: booking.bookingId,
    intakeId: null,
    businessId: booking.businessId,
    branchId: booking.branchId,
    customerId: booking.customer.id,
    petId: pet.id,
    attendanceDate: booking.start.slice(0, 10),
    dropOffWindow: "08:00–10:00",
    pickupWindow: "16:00–18:00",
    status: booking.status === "cancelled" ? "cancelled" : "booked",
    zoneId: assignedZone,
    responsibleStaffId: null,
    checkedInAt: null,
    activatedAt: null,
    readyForPickupAt: null,
    checkedOutAt: null,
    completedAt: null,
    businessNote: booking.notes,
    careEvents: [],
    history: [daycareHistoryItem("created", "สร้างรายการ Daycare จากการจอง", createdAt)],
    createdAt,
    updatedAt: createdAt,
    cancelledAt: booking.status === "cancelled" ? booking.cancelledAt ?? createdAt : null,
  };
}

function mergedPrototypeDaycareAttendances(store: BusinessStore) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readExecutions().flatMap((e) => e.kind === "daycare" ? [clonePrototypeDaycareAttendance(e.record)] : []);
  const attendances = new Map<string, PrototypeDaycareAttendance>();
  for (const fixture of DEMO_DAYCARE_ATTENDANCE_FIXTURES) attendances.set(fixture.daycareAttendanceId, clonePrototypeDaycareAttendance(fixture));
  for (const stored of Object.values(store.daycareAttendances)) {
    if (isPrototypeDaycareAttendance(stored)) attendances.set(stored.daycareAttendanceId, clonePrototypeDaycareAttendance(stored));
  }
  for (const booking of mergedPrototypeBookings().filter((item) => item.serviceModule === "daycare" && item.timeModel === "day")) {
    for (const pet of booking.pets) {
      const id = daycareAttendanceIdForBookingPet(booking.bookingId, pet.id);
      const fixture = [...attendances.values()].find((item) => item.bookingId === booking.bookingId && item.petId === pet.id);
      if (!fixture && !attendances.has(id)) attendances.set(id, buildDaycareAttendanceFromBooking(booking, pet, booking.createdAt || DAYCARE_ATTENDANCE_FIXTURE_CREATED_AT));
    }
  }
  return [...attendances.values()];
}

export type ListPrototypeDaycareAttendanceOptions = {
  date?: string;
  includeClosed?: boolean;
};

function filterAndSortDaycareAttendances(
  attendances: readonly PrototypeDaycareAttendance[],
  context?: DemoBusinessContext | null,
  options: ListPrototypeDaycareAttendanceOptions = {},
) {
  return attendances
    .filter((attendance) => (!context || (attendance.businessId === context.businessId && attendance.branchId === context.branchId))
      && (!options.date || attendance.attendanceDate === options.date)
      && (options.includeClosed || !["completed", "cancelled"].includes(attendance.status)))
    .sort((first, second) => first.attendanceDate.localeCompare(second.attendanceDate) || first.daycareAttendanceId.localeCompare(second.daycareAttendanceId))
    .map(clonePrototypeDaycareAttendance);
}

export function listPrototypeDaycareAttendanceFixtures(context?: DemoBusinessContext | null, options: ListPrototypeDaycareAttendanceOptions = {}) {
  return filterAndSortDaycareAttendances(mergedPrototypeDaycareAttendances(emptyStore()), context, options);
}

export function listPrototypeDaycareAttendances(context?: DemoBusinessContext | null, options: ListPrototypeDaycareAttendanceOptions = {}) {
  return filterAndSortDaycareAttendances(mergedPrototypeDaycareAttendances(readStore()), context, options);
}

export function readPrototypeDaycareAttendance(daycareAttendanceId: string) {
  return listPrototypeDaycareAttendances(null, { includeClosed: true }).find((attendance) => attendance.daycareAttendanceId === daycareAttendanceId) ?? null;
}

export function getPrototypeDaycareZones(context: DemoBusinessContext, fixtureOnly = false) {
  return getBookingResources(context, undefined, fixtureOnly).filter((resource) => resource.module === "daycare" && resource.kind === "daycare-zone");
}

function daycareAttendanceOccupiesZone(attendance: PrototypeDaycareAttendance) {
  return attendance.status === "checked-in" || attendance.status === "active" || attendance.status === "ready-for-pickup";
}

export function getPrototypeDaycareZoneAvailability(
  context: DemoBusinessContext,
  zoneId: string,
  date: string = BOOKING_DEMO_DATE,
  excludingAttendanceId?: string | null,
) {
  const zone = getPrototypeDaycareZones(context).find((resource) => resource.id === zoneId) ?? null;
  if (!zone) return { available: false, zone: null, used: 0, capacity: 0, remaining: 0, message: "ไม่พบโซนในสาขาปัจจุบัน" };
  const used = listPrototypeDaycareAttendances(context, { date, includeClosed: false })
    .filter((attendance) => attendance.daycareAttendanceId !== excludingAttendanceId && attendance.zoneId === zone.id && daycareAttendanceOccupiesZone(attendance))
    .length;
  const remaining = Math.max(0, zone.capacity - used);
  return {
    available: remaining > 0,
    zone,
    used,
    capacity: zone.capacity,
    remaining,
    message: remaining > 0 ? `เหลือ ${remaining} จาก ${zone.capacity}` : `${zone.label} เต็มแล้ว`,
  };
}

export function summarizePrototypeDaycare(
  context: DemoBusinessContext,
  date: string = BOOKING_DEMO_DATE,
  fixtureOnly = false,
) {
  const attendances = fixtureOnly
    ? listPrototypeDaycareAttendanceFixtures(context, { date, includeClosed: true })
    : listPrototypeDaycareAttendances(context, { date, includeClosed: true });
  const zones = getPrototypeDaycareZones(context, fixtureOnly);
  const capacity = zones.reduce((total, zone) => total + zone.capacity, 0);
  const occupied = attendances.filter(daycareAttendanceOccupiesZone).length;
  return {
    total: attendances.filter((attendance) => attendance.status !== "cancelled").length,
    booked: attendances.filter((attendance) => attendance.status === "booked").length,
    checkedIn: attendances.filter((attendance) => attendance.status === "checked-in").length,
    active: attendances.filter((attendance) => attendance.status === "active").length,
    readyForPickup: attendances.filter((attendance) => attendance.status === "ready-for-pickup").length,
    checkedOut: attendances.filter((attendance) => attendance.status === "checked-out" || attendance.status === "completed").length,
    occupied,
    capacity,
    available: Math.max(0, capacity - occupied),
    careEvents: attendances.reduce((total, attendance) => total + attendance.careEvents.length, 0),
  };
}

function daycareAttendanceMatchesContext(attendance: PrototypeDaycareAttendance, context: DemoBusinessContext) {
  return attendance.businessId === context.businessId && attendance.branchId === context.branchId;
}

export function assignPrototypeDaycareZone(
  daycareAttendanceId: string,
  zoneId: string,
  context: DemoBusinessContext,
): AssignPrototypeDaycareZoneResult {
  const store = readStore();
  const attendance = mergedPrototypeDaycareAttendances(store).find((item) => item.daycareAttendanceId === daycareAttendanceId) ?? null;
  if (!attendance) return { ok: false, reason: "missing" };
  if (!daycareAttendanceMatchesContext(attendance, context)) return { ok: false, reason: "wrong-context" };
  if (attendance.zoneId === zoneId) return { ok: true, attendance: clonePrototypeDaycareAttendance(attendance), duplicate: true };
  const availability = getPrototypeDaycareZoneAvailability(context, zoneId, attendance.attendanceDate, attendance.daycareAttendanceId);
  if (!availability.zone) return { ok: false, reason: "invalid-zone", message: availability.message };
  if (!availability.available) return { ok: false, reason: "capacity", message: availability.message };
  const now = new Date().toISOString();
  const next: PrototypeDaycareAttendance = {
    ...clonePrototypeDaycareAttendance(attendance),
    zoneId,
    updatedAt: now,
    history: [...attendance.history.map((item) => ({ ...item })), daycareHistoryItem("zone", `ย้ายไป${availability.zone.label}`, now)],
  };
  store.daycareAttendances[next.daycareAttendanceId] = next;
  return writeStore(store) ? { ok: true, attendance: clonePrototypeDaycareAttendance(next), duplicate: false } : { ok: false, reason: "storage" };
}

export function assignPrototypeDaycareStaff(
  daycareAttendanceId: string,
  staffId: string | null,
  context: DemoBusinessContext,
): AssignPrototypeDaycareStaffResult {
  const store = readStore();
  const attendance = mergedPrototypeDaycareAttendances(store).find((item) => item.daycareAttendanceId === daycareAttendanceId) ?? null;
  if (!attendance) return { ok: false, reason: "missing" };
  if (!daycareAttendanceMatchesContext(attendance, context)) return { ok: false, reason: "wrong-context" };
  if (attendance.responsibleStaffId === staffId) return { ok: true, attendance: clonePrototypeDaycareAttendance(attendance), duplicate: true };
  if (staffId) {
    const member = listPrototypeTeamMembers(context, { includeInactive: true }).find((item) => item.staffId === staffId) ?? null;
    if (!member || !member.active || !member.capabilities.includes("daycare")) return { ok: false, reason: "invalid-staff", message: "พนักงานคนนี้ไม่พร้อมรับงาน Daycare ของสาขา" };
    const interval = getBookingInterval("appointment", `${attendance.attendanceDate}T09:00`, `${attendance.attendanceDate}T18:00`);
    const availability = interval ? evaluatePrototypeTeamMemberAvailability(member, interval) : null;
    if (!availability?.available) return { ok: false, reason: "unavailable", message: availability?.conflicts[0]?.message ?? "พนักงานไม่พร้อมในวันให้บริการ" };
  }
  const now = new Date().toISOString();
  const next: PrototypeDaycareAttendance = {
    ...clonePrototypeDaycareAttendance(attendance),
    responsibleStaffId: staffId,
    updatedAt: now,
    history: [...attendance.history.map((item) => ({ ...item })), daycareHistoryItem("staff", staffId ? "มอบหมายผู้ดูแลแล้ว" : "นำผู้ดูแลออกจากรายการ", now)],
  };
  store.daycareAttendances[next.daycareAttendanceId] = next;
  return writeStore(store) ? { ok: true, attendance: clonePrototypeDaycareAttendance(next), duplicate: false } : { ok: false, reason: "storage" };
}

const DAYCARE_TRANSITIONS: Record<DaycareAttendanceStatus, readonly DaycareAttendanceStatus[]> = {
  booked: ["checked-in", "cancelled"],
  "checked-in": ["active", "cancelled"],
  active: ["ready-for-pickup", "cancelled"],
  "ready-for-pickup": ["checked-out"],
  "checked-out": ["completed"],
  completed: [],
  cancelled: [],
};

export function transitionPrototypeDaycareAttendance(
  daycareAttendanceId: string,
  nextStatus: DaycareAttendanceStatus,
  context: DemoBusinessContext,
): DaycareAttendanceTransitionResult {
  const store = readStore();
  const attendance = mergedPrototypeDaycareAttendances(store).find((item) => item.daycareAttendanceId === daycareAttendanceId) ?? null;
  if (!attendance) return { ok: false, reason: "missing" };
  if (!daycareAttendanceMatchesContext(attendance, context)) return { ok: false, reason: "wrong-context" };
  if (attendance.status === nextStatus) return { ok: true, attendance: clonePrototypeDaycareAttendance(attendance), duplicate: true };
  if (!DAYCARE_TRANSITIONS[attendance.status].includes(nextStatus)) return { ok: false, reason: "invalid-transition" };
  if ((nextStatus === "checked-in" || nextStatus === "active") && !attendance.zoneId) return { ok: false, reason: "zone-required" };
  if (nextStatus === "checked-in" && attendance.zoneId) {
    const availability = getPrototypeDaycareZoneAvailability(context, attendance.zoneId, attendance.attendanceDate, attendance.daycareAttendanceId);
    if (!availability.available) return { ok: false, reason: "capacity" };
  }
  const now = new Date().toISOString();
  const next: PrototypeDaycareAttendance = {
    ...clonePrototypeDaycareAttendance(attendance),
    status: nextStatus,
    checkedInAt: nextStatus === "checked-in" ? attendance.checkedInAt ?? now : attendance.checkedInAt,
    activatedAt: nextStatus === "active" ? attendance.activatedAt ?? now : attendance.activatedAt,
    readyForPickupAt: nextStatus === "ready-for-pickup" ? attendance.readyForPickupAt ?? now : attendance.readyForPickupAt,
    checkedOutAt: nextStatus === "checked-out" ? attendance.checkedOutAt ?? now : attendance.checkedOutAt,
    completedAt: nextStatus === "completed" ? attendance.completedAt ?? now : attendance.completedAt,
    cancelledAt: nextStatus === "cancelled" ? attendance.cancelledAt ?? now : attendance.cancelledAt,
    updatedAt: now,
    history: [...attendance.history.map((item) => ({ ...item })), daycareHistoryItem("status", `เปลี่ยนสถานะเป็น ${DAYCARE_ATTENDANCE_STATUS_LABELS[nextStatus]}`, now)],
  };
  store.daycareAttendances[next.daycareAttendanceId] = next;
  if (nextStatus === "checked-out" || nextStatus === "completed") ensurePrototypeServiceRecordForDaycareAttendanceInStore(store, next);
  return writeStore(store) ? { ok: true, attendance: clonePrototypeDaycareAttendance(next), duplicate: false } : { ok: false, reason: "storage" };
}

export function addPrototypeDaycareCareEvent(
  daycareAttendanceId: string,
  kind: PrototypeDaycareCareKind,
  note: string,
  context: DemoBusinessContext,
) {
  const labels: Record<PrototypeDaycareCareKind, string> = { meal: "ให้อาหาร", water: "เติมน้ำ", activity: "กิจกรรม / เล่น", rest: "พักผ่อน", note: "บันทึกการดูแล" };
  const store = readStore();
  const attendance = mergedPrototypeDaycareAttendances(store).find((item) => item.daycareAttendanceId === daycareAttendanceId) ?? null;
  if (!attendance || !daycareAttendanceMatchesContext(attendance, context) || !["checked-in", "active", "ready-for-pickup"].includes(attendance.status)) return null;
  const now = new Date().toISOString();
  const event: PrototypeDaycareCareEvent = {
    id: `daycare-care-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    label: labels[kind],
    note: note.trim() || null,
    occurredAt: now,
    staffId: attendance.responsibleStaffId,
  };
  const next: PrototypeDaycareAttendance = {
    ...clonePrototypeDaycareAttendance(attendance),
    careEvents: [...attendance.careEvents.map((item) => ({ ...item })), event],
    updatedAt: now,
    history: [...attendance.history.map((item) => ({ ...item })), daycareHistoryItem("care", `${event.label}${event.note ? ` · ${event.note}` : ""}`, now)],
  };
  store.daycareAttendances[next.daycareAttendanceId] = next;
  return writeStore(store) ? clonePrototypeDaycareAttendance(next) : null;
}

export function updatePrototypeDaycareNote(daycareAttendanceId: string, note: string, context: DemoBusinessContext) {
  const store = readStore();
  const attendance = mergedPrototypeDaycareAttendances(store).find((item) => item.daycareAttendanceId === daycareAttendanceId) ?? null;
  if (!attendance || !daycareAttendanceMatchesContext(attendance, context)) return null;
  const businessNote = note.trim();
  if (businessNote === attendance.businessNote) return clonePrototypeDaycareAttendance(attendance);
  const now = new Date().toISOString();
  const next: PrototypeDaycareAttendance = {
    ...clonePrototypeDaycareAttendance(attendance),
    businessNote,
    updatedAt: now,
    history: [...attendance.history.map((item) => ({ ...item })), daycareHistoryItem("note", "อัปเดตหมายเหตุของร้าน", now)],
  };
  store.daycareAttendances[next.daycareAttendanceId] = next;
  return writeStore(store) ? clonePrototypeDaycareAttendance(next) : null;
}

function synchronizePrototypeDaycareAttendancesForBooking(store: BusinessStore, booking: PrototypeBooking, now: string) {
  const existingAttendances = mergedPrototypeDaycareAttendances(store).filter((attendance) => attendance.bookingId === booking.bookingId);
  if (booking.serviceModule !== "daycare" || booking.timeModel !== "day") {
    for (const attendance of existingAttendances) {
      if (["checked-out", "completed", "cancelled"].includes(attendance.status)) continue;
      store.daycareAttendances[attendance.daycareAttendanceId] = {
        ...clonePrototypeDaycareAttendance(attendance),
        status: "cancelled",
        cancelledAt: now,
        updatedAt: now,
        history: [...attendance.history.map((item) => ({ ...item })), daycareHistoryItem("status", "ยกเลิกรายการเมื่อการจองเปลี่ยนบริการ", now)],
      };
    }
    return;
  }
  for (const pet of booking.pets) {
    const existing = existingAttendances.find((attendance) => attendance.petId === pet.id) ?? null;
    if (!existing) {
      const created = buildDaycareAttendanceFromBooking(booking, pet, now);
      store.daycareAttendances[created.daycareAttendanceId] = created;
      continue;
    }
    const cancelled = booking.status === "cancelled" && !["checked-out", "completed", "cancelled"].includes(existing.status);
    const next: PrototypeDaycareAttendance = {
      ...clonePrototypeDaycareAttendance(existing),
      attendanceDate: booking.start.slice(0, 10),
      status: cancelled ? "cancelled" : existing.status,
      cancelledAt: cancelled ? existing.cancelledAt ?? now : existing.cancelledAt,
      updatedAt: now,
      history: cancelled ? [...existing.history.map((item) => ({ ...item })), daycareHistoryItem("status", "ยกเลิกตามการจอง", now)] : existing.history.map((item) => ({ ...item })),
    };
    store.daycareAttendances[next.daycareAttendanceId] = next;
  }
  for (const existing of existingAttendances) {
    if (booking.pets.some((pet) => pet.id === existing.petId) || ["checked-out", "completed", "cancelled"].includes(existing.status)) continue;
    store.daycareAttendances[existing.daycareAttendanceId] = {
      ...clonePrototypeDaycareAttendance(existing),
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
      history: [...existing.history.map((item) => ({ ...item })), daycareHistoryItem("status", "ยกเลิกรายการของน้องที่ถูกนำออกจากการจอง", now)],
    };
  }
}

// ---------------------------------------------------------------------------
// BF-7 Billing / Payments / Revenue foundation
// ---------------------------------------------------------------------------

function clonePrototypeChargeLine(line: PrototypeChargeLine): PrototypeChargeLine {
  return { ...line };
}

function clonePrototypeCharge(charge: PrototypeCharge): PrototypeCharge {
  return {
    ...charge,
    lineItems: charge.lineItems.map(clonePrototypeChargeLine),
    history: charge.history.map((item) => ({ ...item })),
  };
}

function clonePrototypePayment(payment: PrototypePayment): PrototypePayment {
  return {
    ...payment,
    allocations: payment.allocations.map((allocation) => ({ ...allocation })),
  };
}

function isWholeBaht(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function isPrototypeChargeLineKind(value: unknown): value is PrototypeChargeLineKind {
  return value === "base-service" || value === "add-on" || value === "manual-adjustment" || value === "discount";
}

function isPrototypePaymentMethod(value: unknown): value is PrototypePaymentMethod {
  return value === "cash" || value === "bank-transfer" || value === "other";
}

function isPrototypeChargeLine(value: unknown): value is PrototypeChargeLine {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const line = value as Partial<PrototypeChargeLine>;
  return typeof line.id === "string"
    && isPrototypeChargeLineKind(line.kind)
    && typeof line.label === "string"
    && isWholeBaht(line.amount)
    && (typeof line.reason === "string" || line.reason === null)
    && (typeof line.sourceRequestId === "string" || line.sourceRequestId === null)
    && (typeof line.serviceJobId === "string" || line.serviceJobId === null)
    && (typeof line.hotelStayId === "string" || line.hotelStayId === null)
    && typeof line.createdAt === "string";
}

function isPrototypeChargeHistoryItem(value: unknown): value is PrototypeChargeHistoryItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Partial<PrototypeChargeHistoryItem>;
  return typeof item.id === "string"
    && typeof item.at === "string"
    && (item.type === "created" || item.type === "adjusted" || item.type === "cancelled")
    && typeof item.summary === "string";
}

function isPrototypeCharge(value: unknown): value is PrototypeCharge {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const charge = value as Partial<PrototypeCharge>;
  return typeof charge.chargeId === "string"
    && typeof charge.businessId === "string"
    && typeof charge.branchId === "string"
    && typeof charge.customerId === "string"
    && (typeof charge.petId === "string" || charge.petId === null)
    && typeof charge.bookingId === "string"
    && (typeof charge.serviceJobId === "string" || charge.serviceJobId === null)
    && (typeof charge.hotelStayId === "string" || charge.hotelStayId === null)
    && (charge.serviceModule === "grooming" || charge.serviceModule === "hotel" || charge.serviceModule === "daycare")
    && typeof charge.serviceLabel === "string"
    && Array.isArray(charge.lineItems)
    && charge.lineItems.every(isPrototypeChargeLine)
    && (typeof charge.cancelledAt === "string" || charge.cancelledAt === null)
    && (typeof charge.cancellationReason === "string" || charge.cancellationReason === null)
    && Array.isArray(charge.history)
    && charge.history.every(isPrototypeChargeHistoryItem)
    && typeof charge.createdAt === "string"
    && typeof charge.updatedAt === "string";
}

function isPrototypePaymentAllocation(value: unknown): value is PrototypePaymentAllocation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const allocation = value as Partial<PrototypePaymentAllocation>;
  return typeof allocation.chargeId === "string" && isWholeBaht(allocation.amount) && allocation.amount > 0;
}

function isPrototypePayment(value: unknown): value is PrototypePayment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payment = value as Partial<PrototypePayment>;
  const allocationTotal = Array.isArray(payment.allocations)
    ? payment.allocations.reduce<number>((total, allocation) => total + (isPrototypePaymentAllocation(allocation) ? allocation.amount : 0), 0)
    : -1;
  return typeof payment.paymentId === "string"
    && typeof payment.businessId === "string"
    && typeof payment.branchId === "string"
    && typeof payment.customerId === "string"
    && isPrototypePaymentMethod(payment.method)
    && isWholeBaht(payment.amount)
    && payment.amount > 0
    && Array.isArray(payment.allocations)
    && payment.allocations.every(isPrototypePaymentAllocation)
    && allocationTotal === payment.amount
    && typeof payment.note === "string"
    && typeof payment.requestKey === "string"
    && typeof payment.recordedAt === "string";
}

function mergedPrototypeCharges(store: BusinessStore) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readAllFinancialDirectories().flatMap((d) => d.balances.map((b) => b.charge));
  const charges = new Map<string, PrototypeCharge>();
  for (const fixture of DEMO_BILLING_CHARGE_FIXTURES) charges.set(fixture.chargeId, clonePrototypeCharge(fixture));
  for (const stored of Object.values(store.charges)) {
    if (isPrototypeCharge(stored)) charges.set(stored.chargeId, clonePrototypeCharge(stored));
  }
  return [...charges.values()];
}

function mergedPrototypePayments(store: BusinessStore) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readAllFinancialDirectories().flatMap((d) => d.payments);
  const payments = new Map<string, PrototypePayment>();
  for (const fixture of DEMO_BILLING_PAYMENT_FIXTURES) payments.set(fixture.paymentId, clonePrototypePayment(fixture));
  for (const stored of Object.values(store.payments)) {
    if (isPrototypePayment(stored)) payments.set(stored.paymentId, clonePrototypePayment(stored));
  }
  return [...payments.values()];
}

function chargeMatchesContext(charge: PrototypeCharge, context?: DemoBusinessContext | null) {
  return !context || (charge.businessId === context.businessId && charge.branchId === context.branchId);
}

function paymentMatchesContext(payment: PrototypePayment, context?: DemoBusinessContext | null) {
  return !context || (payment.businessId === context.businessId && payment.branchId === context.branchId);
}

function sortPrototypeCharges(charges: readonly PrototypeCharge[], context?: DemoBusinessContext | null) {
  return charges
    .filter((charge) => chargeMatchesContext(charge, context))
    .map(clonePrototypeCharge)
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt) || second.createdAt.localeCompare(first.createdAt) || first.chargeId.localeCompare(second.chargeId));
}

function sortPrototypePayments(payments: readonly PrototypePayment[], context?: DemoBusinessContext | null) {
  return payments
    .filter((payment) => paymentMatchesContext(payment, context))
    .map(clonePrototypePayment)
    .sort((first, second) => second.recordedAt.localeCompare(first.recordedAt) || first.paymentId.localeCompare(second.paymentId));
}

export function listPrototypeChargeFixtures(context?: DemoBusinessContext | null) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return [];
  return sortPrototypeCharges(mergedPrototypeCharges(emptyStore()), context);
}

export function listPrototypeCharges(context?: DemoBusinessContext | null) {
  return sortPrototypeCharges(mergedPrototypeCharges(readStore()), context);
}

export function readPrototypeCharge(chargeId: string) {
  return listPrototypeCharges(null).find((charge) => charge.chargeId === chargeId) ?? null;
}

export function listPrototypePaymentFixtures(context?: DemoBusinessContext | null) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return [];
  return sortPrototypePayments(mergedPrototypePayments(emptyStore()), context);
}

export function listPrototypePayments(context?: DemoBusinessContext | null) {
  return sortPrototypePayments(mergedPrototypePayments(readStore()), context);
}

function allocatedPaymentAmountForCharge(chargeId: string, payments: readonly PrototypePayment[]) {
  return payments.reduce((sum, payment) => sum + payment.allocations
    .filter((allocation) => allocation.chargeId === chargeId)
    .reduce((allocationSum, allocation) => allocationSum + allocation.amount, 0), 0);
}

export function getPrototypeChargeBalance(
  charge: PrototypeCharge,
  payments: readonly PrototypePayment[] = listPrototypePayments(null),
): PrototypeChargeBalance {
  if (!BUSINESS_FIXTURE_TEST_MODE) {
    const balance = readFinancialDirectory(charge.businessId, charge.branchId)?.balances.find((b) => b.charge.chargeId === charge.chargeId);
    if (balance) return balance;
    return { charge, total: 0, paid: 0, remaining: 0, status: "unpaid", paymentCount: 0 };
  }
  const total = Math.max(0, charge.lineItems.reduce((sum, line) => sum + line.amount, 0));
  const paid = Math.min(total, allocatedPaymentAmountForCharge(charge.chargeId, payments));
  const remaining = charge.cancelledAt ? 0 : Math.max(0, total - paid);
  const paymentCount = payments.filter((payment) => payment.allocations.some((allocation) => allocation.chargeId === charge.chargeId)).length;
  const status: PrototypeChargeStatus = charge.cancelledAt
    ? "cancelled"
    : remaining === 0
      ? "paid"
      : paid > 0
        ? "partial"
        : "unpaid";
  return { charge: clonePrototypeCharge(charge), total, paid, remaining, status, paymentCount };
}

export function listPrototypeChargeBalances(context: DemoBusinessContext, fixtureOnly = false) {
  const charges = fixtureOnly ? listPrototypeChargeFixtures(context) : listPrototypeCharges(context);
  const payments = fixtureOnly ? listPrototypePaymentFixtures(context) : listPrototypePayments(context);
  return charges.map((charge) => getPrototypeChargeBalance(charge, payments));
}

export type PrototypeRevenueBreakdown = {
  module: BusinessServiceModule;
  revenue: number;
  paymentCount: number;
};

export type PrototypeRevenueSummary = {
  revenueToday: number;
  paymentCountToday: number;
  unpaidBalance: number;
  unpaidCount: number;
  partialCount: number;
  breakdown: PrototypeRevenueBreakdown[];
};

export function getPrototypeRevenueSummary(
  context: DemoBusinessContext,
  date: string = BOOKING_DEMO_DATE,
  fixtureOnly = false,
): PrototypeRevenueSummary {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readReport(context, date === dateInZone(new Date(), businessTimezone(context)) ? {} : { dateRangePreset: "custom", customStartDate: date, customEndDate: date }).revenueSummary;
  const charges = fixtureOnly ? listPrototypeChargeFixtures(context) : listPrototypeCharges(context);
  const payments = fixtureOnly ? listPrototypePaymentFixtures(context) : listPrototypePayments(context);
  const balances = charges.map((charge) => getPrototypeChargeBalance(charge, payments));
  const chargesById = new Map(charges.map((charge) => [charge.chargeId, charge]));
  const paymentsToday = payments.filter((payment) => (BUSINESS_FIXTURE_TEST_MODE ? payment.recordedAt.slice(0, 10) : dateInZone(payment.recordedAt, businessTimezone(context))) === date);
  const breakdownByModule = new Map<BusinessServiceModule, PrototypeRevenueBreakdown>();
  for (const payment of paymentsToday) {
    for (const allocation of payment.allocations) {
      const charge = chargesById.get(allocation.chargeId);
      if (!charge) continue;
      const current = breakdownByModule.get(charge.serviceModule) ?? { module: charge.serviceModule, revenue: 0, paymentCount: 0 };
      current.revenue += allocation.amount;
      current.paymentCount += 1;
      breakdownByModule.set(charge.serviceModule, current);
    }
  }
  return {
    revenueToday: paymentsToday.reduce((sum, payment) => sum + payment.amount, 0),
    paymentCountToday: paymentsToday.length,
    unpaidBalance: balances.filter((balance) => balance.status === "unpaid" || balance.status === "partial").reduce((sum, balance) => sum + balance.remaining, 0),
    unpaidCount: balances.filter((balance) => balance.status === "unpaid").length,
    partialCount: balances.filter((balance) => balance.status === "partial").length,
    breakdown: [...breakdownByModule.values()].sort((first, second) => second.revenue - first.revenue || first.module.localeCompare(second.module)),
  };
}

function generatedPrototypeBillingId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function chargeHistoryId(type: PrototypeChargeHistoryItem["type"]) {
  return generatedPrototypeBillingId(`charge-${type}`);
}

function chargeIdForBooking(bookingId: string) {
  return `charge-booking-${bookingId}`;
}

function baseChargeLine(booking: PrototypeBooking, serviceJobId: string | null, hotelStayId: string | null, at: string, daycareAttendanceId: string | null = null): PrototypeChargeLine {
  return {
    id: generatedPrototypeBillingId("charge-line-base"),
    kind: "base-service",
    label: booking.service.label,
    amount: Math.max(0, booking.estimate ?? 0),
    reason: null,
    sourceRequestId: null,
    serviceJobId,
    hotelStayId,
    daycareAttendanceId,
    createdAt: at,
  };
}

function createChargeForBooking(
  booking: PrototypeBooking,
  source: { serviceJobId: string | null; hotelStayId: string | null; daycareAttendanceId?: string | null; petId: string | null },
  at: string,
) {
  const singlePet = booking.pets.length === 1;
  const chargeId = chargeIdForBooking(booking.bookingId);
  return {
    chargeId,
    businessId: booking.businessId,
    branchId: booking.branchId,
    customerId: booking.customer.id,
    petId: singlePet ? source.petId : null,
    bookingId: booking.bookingId,
    serviceJobId: singlePet ? source.serviceJobId : null,
    hotelStayId: singlePet ? source.hotelStayId : null,
    daycareAttendanceId: singlePet ? source.daycareAttendanceId ?? null : null,
    serviceModule: booking.serviceModule,
    serviceLabel: booking.service.label,
    lineItems: [baseChargeLine(booking, singlePet ? source.serviceJobId : null, singlePet ? source.hotelStayId : null, at, singlePet ? source.daycareAttendanceId ?? null : null)],
    cancelledAt: null,
    cancellationReason: null,
    history: [{ id: chargeHistoryId("created"), at, type: "created", summary: "สร้างยอดจากรายการบริการ" }],
    createdAt: at,
    updatedAt: at,
  } satisfies PrototypeCharge;
}

function reconcileGroomingAddOnsIntoCharge(charge: PrototypeCharge, job: PrototypeServiceJob, at: string) {
  if (charge.cancelledAt || job.addOns.length === 0) return clonePrototypeCharge(charge);
  const missing = job.addOns.filter((addOn) => {
    const sourceKey = addOn.sourceRequestId ?? addOn.id;
    return !charge.lineItems.some((line) => line.kind === "add-on" && line.serviceJobId === job.serviceJobId && (line.sourceRequestId ?? line.id) === sourceKey);
  });
  if (missing.length === 0) return clonePrototypeCharge(charge);
  const newLines = missing.map((addOn) => ({
    id: `charge-line-addon-${addOn.id}`,
    kind: "add-on" as const,
    label: addOn.label,
    amount: addOn.additionalPrice,
    reason: "บริการเพิ่มเติมที่อนุมัติแล้ว",
    sourceRequestId: addOn.sourceRequestId,
    serviceJobId: job.serviceJobId,
    hotelStayId: null,
    createdAt: addOn.approvedAt || at,
  }));
  return {
    ...clonePrototypeCharge(charge),
    lineItems: [...charge.lineItems.map(clonePrototypeChargeLine), ...newLines],
    history: [...charge.history.map((item) => ({ ...item })), { id: chargeHistoryId("adjusted"), at, type: "adjusted", summary: "เพิ่มบริการเพิ่มเติมที่อนุมัติแล้วในยอด" }],
    updatedAt: at,
  } satisfies PrototypeCharge;
}

export type GetOrCreatePrototypeChargeResult =
  | { ok: true; charge: PrototypeCharge; created: boolean; reconciled: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "cancelled" | "invalid-amount" | "storage" };

function saveOrReturnCharge(
  store: BusinessStore,
  charge: PrototypeCharge,
  created: boolean,
  reconciled: boolean,
): GetOrCreatePrototypeChargeResult {
  if (!created && !reconciled) return { ok: true, charge: clonePrototypeCharge(charge), created: false, reconciled: false };
  store.charges[charge.chargeId] = charge;
  if (!writeStore(store)) return { ok: false, reason: "storage" };
  return { ok: true, charge: clonePrototypeCharge(charge), created, reconciled };
}

export function getOrCreatePrototypeChargeForGroomingJob(
  serviceJobId: string,
  context: DemoBusinessContext,
): GetOrCreatePrototypeChargeResult {
  if (!BUSINESS_FIXTURE_TEST_MODE) return { ok: false, reason: "storage" };
  const store = readStore();
  const job = mergedPrototypeServiceJobs(store).find((item) => item.serviceJobId === serviceJobId) ?? null;
  if (!job) return { ok: false, reason: "missing" };
  if (!groomJobMatchesContext(job, context)) return { ok: false, reason: "wrong-context" };
  if (job.status === "cancelled") return { ok: false, reason: "cancelled" };
  const booking = mergedPrototypeBookings().find((item) => item.bookingId === job.bookingId) ?? null;
  if (!booking || booking.status === "cancelled") return { ok: false, reason: "cancelled" };
  if (!isWholeBaht(booking.estimate) || booking.estimate < 0 || job.addOns.some((addOn) => !isWholeBaht(addOn.additionalPrice) || addOn.additionalPrice < 0)) return { ok: false, reason: "invalid-amount" };
  const existing = mergedPrototypeCharges(store).find((charge) => charge.bookingId === booking.bookingId) ?? null;
  if (existing?.cancelledAt) return { ok: true, charge: clonePrototypeCharge(existing), created: false, reconciled: false };
  const now = BILLING_DEMO_NOW;
  const base = existing ?? createChargeForBooking(booking, { serviceJobId: job.serviceJobId, hotelStayId: null, petId: job.petId }, now);
  const reconciled = reconcileGroomingAddOnsIntoCharge(base, job, now);
  const didReconcile = reconciled.lineItems.length !== base.lineItems.length;
  return saveOrReturnCharge(store, reconciled, !existing, didReconcile);
}

export function getOrCreatePrototypeChargeForHotelStay(
  hotelStayId: string,
  context: DemoBusinessContext,
): GetOrCreatePrototypeChargeResult {
  if (!BUSINESS_FIXTURE_TEST_MODE) return { ok: false, reason: "storage" };
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay) return { ok: false, reason: "missing" };
  if (!hotelStayMatchesContext(stay, context)) return { ok: false, reason: "wrong-context" };
  if (stay.status === "cancelled" || stay.status === "no-show") return { ok: false, reason: "cancelled" };
  const booking = mergedPrototypeBookings().find((item) => item.bookingId === stay.bookingId) ?? null;
  if (!booking || booking.status === "cancelled") return { ok: false, reason: "cancelled" };
  if (!isWholeBaht(booking.estimate) || booking.estimate < 0) return { ok: false, reason: "invalid-amount" };
  const existing = mergedPrototypeCharges(store).find((charge) => charge.bookingId === booking.bookingId) ?? null;
  if (existing) return { ok: true, charge: clonePrototypeCharge(existing), created: false, reconciled: false };
  const charge = createChargeForBooking(booking, { serviceJobId: null, hotelStayId: stay.hotelStayId, petId: stay.petId }, BILLING_DEMO_NOW);
  return saveOrReturnCharge(store, charge, true, false);
}

export function getOrCreatePrototypeChargeForDaycareAttendance(
  daycareAttendanceId: string,
  context: DemoBusinessContext,
): GetOrCreatePrototypeChargeResult {
  if (!BUSINESS_FIXTURE_TEST_MODE) return { ok: false, reason: "storage" };
  const store = readStore();
  const attendance = mergedPrototypeDaycareAttendances(store).find((item) => item.daycareAttendanceId === daycareAttendanceId) ?? null;
  if (!attendance) return { ok: false, reason: "missing" };
  if (!daycareAttendanceMatchesContext(attendance, context)) return { ok: false, reason: "wrong-context" };
  if (attendance.status === "cancelled") return { ok: false, reason: "cancelled" };
  const booking = mergedPrototypeBookings().find((item) => item.bookingId === attendance.bookingId) ?? null;
  if (!booking || booking.status === "cancelled") return { ok: false, reason: "cancelled" };
  if (!isWholeBaht(booking.estimate) || booking.estimate < 0) return { ok: false, reason: "invalid-amount" };
  const existing = mergedPrototypeCharges(store).find((charge) => charge.bookingId === booking.bookingId) ?? null;
  if (existing) return { ok: true, charge: clonePrototypeCharge(existing), created: false, reconciled: false };
  const charge = createChargeForBooking(booking, {
    serviceJobId: null,
    hotelStayId: null,
    daycareAttendanceId: attendance.daycareAttendanceId,
    petId: attendance.petId,
  }, BILLING_DEMO_NOW);
  return saveOrReturnCharge(store, charge, true, false);
}

export type AddPrototypeChargeAdjustmentResult =
  | { ok: true; charge: PrototypeCharge }
  | { ok: false; reason: "missing" | "wrong-context" | "cancelled" | "invalid" | "invalid-total" | "storage" };

export function addPrototypeChargeAdjustment(input: {
  chargeId: string;
  context: DemoBusinessContext;
  kind: "manual-adjustment" | "discount";
  label: string;
  amount: number;
  reason: string;
}) : AddPrototypeChargeAdjustmentResult {
  if (!BUSINESS_FIXTURE_TEST_MODE) return { ok: false, reason: "storage" };
  const label = input.label.trim();
  const reason = input.reason.trim();
  const normalizedAmount = Math.round(input.amount);
  if (!label || !reason || !Number.isFinite(input.amount) || normalizedAmount <= 0 || !Number.isInteger(input.amount)) return { ok: false, reason: "invalid" };
  const store = readStore();
  const charge = mergedPrototypeCharges(store).find((item) => item.chargeId === input.chargeId) ?? null;
  if (!charge) return { ok: false, reason: "missing" };
  if (!chargeMatchesContext(charge, input.context)) return { ok: false, reason: "wrong-context" };
  if (charge.cancelledAt) return { ok: false, reason: "cancelled" };
  const signedAmount = input.kind === "discount" ? -normalizedAmount : normalizedAmount;
  const projectedTotal = charge.lineItems.reduce((sum, line) => sum + line.amount, 0) + signedAmount;
  if (projectedTotal < 0 || projectedTotal < allocatedPaymentAmountForCharge(charge.chargeId, mergedPrototypePayments(store))) return { ok: false, reason: "invalid-total" };
  const now = BILLING_DEMO_NOW;
  const next: PrototypeCharge = {
    ...clonePrototypeCharge(charge),
    lineItems: [...charge.lineItems.map(clonePrototypeChargeLine), {
      id: generatedPrototypeBillingId("charge-line-adjustment"),
      kind: input.kind,
      label,
      amount: signedAmount,
      reason,
      sourceRequestId: null,
      serviceJobId: null,
      hotelStayId: null,
      createdAt: now,
    }],
    history: [...charge.history.map((item) => ({ ...item })), { id: chargeHistoryId("adjusted"), at: now, type: "adjusted", summary: input.kind === "discount" ? "เพิ่มส่วนลดในยอด" : "ปรับยอดด้วยเหตุผล" }],
    updatedAt: now,
  };
  store.charges[next.chargeId] = next;
  return writeStore(store) ? { ok: true, charge: clonePrototypeCharge(next) } : { ok: false, reason: "storage" };
}

export type CancelPrototypeChargeResult =
  | { ok: true; charge: PrototypeCharge; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "has-payments" | "invalid" | "storage" };

export function cancelPrototypeCharge(
  chargeId: string,
  reason: string,
  context: DemoBusinessContext,
): CancelPrototypeChargeResult {
  if (!BUSINESS_FIXTURE_TEST_MODE) return { ok: false, reason: "storage" };
  const normalizedReason = reason.trim();
  if (!normalizedReason) return { ok: false, reason: "invalid" };
  const store = readStore();
  const charge = mergedPrototypeCharges(store).find((item) => item.chargeId === chargeId) ?? null;
  if (!charge) return { ok: false, reason: "missing" };
  if (!chargeMatchesContext(charge, context)) return { ok: false, reason: "wrong-context" };
  if (charge.cancelledAt) return { ok: true, charge: clonePrototypeCharge(charge), duplicate: true };
  if (allocatedPaymentAmountForCharge(charge.chargeId, mergedPrototypePayments(store)) > 0) return { ok: false, reason: "has-payments" };
  const now = BILLING_DEMO_NOW;
  const next: PrototypeCharge = {
    ...clonePrototypeCharge(charge),
    cancelledAt: now,
    cancellationReason: normalizedReason,
    history: [...charge.history.map((item) => ({ ...item })), { id: chargeHistoryId("cancelled"), at: now, type: "cancelled", summary: "ยกเลิกยอดใน local prototype" }],
    updatedAt: now,
  };
  store.charges[next.chargeId] = next;
  return writeStore(store) ? { ok: true, charge: clonePrototypeCharge(next), duplicate: false } : { ok: false, reason: "storage" };
}

export type RecordPrototypePaymentResult =
  | { ok: true; payment: PrototypePayment; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "cancelled" | "invalid" | "overpayment" | "storage" };

export function recordPrototypePayment(input: {
  chargeId: string;
  context: DemoBusinessContext;
  amount: number;
  method: PrototypePaymentMethod;
  note?: string;
  requestKey: string;
  recordedAt?: string;
}): RecordPrototypePaymentResult {
  if (!BUSINESS_FIXTURE_TEST_MODE) return { ok: false, reason: "storage" };
  const requestKey = input.requestKey.trim();
  const amount = Math.round(input.amount);
  if (!requestKey || !isPrototypePaymentMethod(input.method) || !Number.isFinite(input.amount) || !Number.isInteger(input.amount) || amount <= 0) return { ok: false, reason: "invalid" };
  const store = readStore();
  const payments = mergedPrototypePayments(store);
  const charge = mergedPrototypeCharges(store).find((item) => item.chargeId === input.chargeId) ?? null;
  if (!charge) return { ok: false, reason: "missing" };
  if (!chargeMatchesContext(charge, input.context)) return { ok: false, reason: "wrong-context" };
  if (charge.cancelledAt) return { ok: false, reason: "cancelled" };
  const duplicate = payments.find((payment) => payment.requestKey === requestKey) ?? null;
  if (duplicate) {
    if (!duplicate.allocations.some((allocation) => allocation.chargeId === charge.chargeId)) return { ok: false, reason: "invalid" };
    return { ok: true, payment: clonePrototypePayment(duplicate), duplicate: true };
  }
  const balance = getPrototypeChargeBalance(charge, payments);
  if (amount > balance.remaining) return { ok: false, reason: "overpayment" };
  const payment: PrototypePayment = {
    paymentId: generatedPrototypeBillingId("payment"),
    businessId: charge.businessId,
    branchId: charge.branchId,
    customerId: charge.customerId,
    method: input.method,
    amount,
    allocations: [{ chargeId: charge.chargeId, amount }],
    note: input.note?.trim() ?? "",
    requestKey,
    recordedAt: input.recordedAt ?? BILLING_DEMO_NOW,
  };
  store.payments[payment.paymentId] = payment;
  return writeStore(store) ? { ok: true, payment: clonePrototypePayment(payment), duplicate: false } : { ok: false, reason: "storage" };
}

// ---------------------------------------------------------------------------
// BF-8 shared Service Record foundation
// ---------------------------------------------------------------------------

function serviceRecordIdForGroomingJob(serviceJobId: string) {
  return `service-record-grooming-${serviceJobId}`;
}

function serviceRecordIdForHotelStay(hotelStayId: string) {
  return `service-record-hotel-${hotelStayId}`;
}

function serviceRecordIdForDaycareAttendance(daycareAttendanceId: string) {
  return `service-record-daycare-${daycareAttendanceId}`;
}

function generatedPrototypeServiceRecordId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function clonePrototypeServiceRecordSourceRevision(revision: PrototypeServiceRecordSourceRevision): PrototypeServiceRecordSourceRevision {
  return {
    ...revision,
    details: revision.details.map((detail) => ({ ...detail })),
    activities: revision.activities.map((activity) => ({ ...activity })),
    staffResourceLabels: [...revision.staffResourceLabels],
    photos: revision.photos.map((photo) => ({ ...photo })),
  };
}

function clonePrototypeServiceRecord(record: PrototypeServiceRecord): PrototypeServiceRecord {
  return {
    ...record,
    details: record.details.map((detail) => ({ ...detail })),
    activities: record.activities.map((activity) => ({ ...activity })),
    staffResourceLabels: [...record.staffResourceLabels],
    photos: record.photos.map((photo) => ({ ...photo })),
    // Existing BF-8 browser sessions predate sourceRevisions. Treat their
    // already-valid Service Records as having no prior source revisions.
    sourceRevisions: (record.sourceRevisions ?? []).map(clonePrototypeServiceRecordSourceRevision),
    corrections: record.corrections.map((correction) => ({ ...correction })),
    handover: {
      ...record.handover,
      history: record.handover.history.map((event) => ({ ...event })),
    },
  };
}

function nextPrototypeServiceRecordAuditTimestamp(record: PrototypeServiceRecord) {
  const timestamps = [
    record.completedAt,
    record.createdAt,
    record.updatedAt,
    ...record.corrections.map((correction) => correction.at),
    ...record.handover.history.map((event) => event.at),
    ...(record.sourceRevisions ?? []).map((revision) => revision.at),
  ];
  const latest = timestamps.reduce((maximum, timestamp) => {
    const value = Date.parse(timestamp);
    return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
  }, 0);
  return new Date(Math.max(Date.now(), latest + 1)).toISOString();
}

function isPrototypeServiceRecordSource(value: unknown): value is PrototypeServiceRecordSource {
  return value === "grooming-job" || value === "hotel-stay" || value === "daycare-attendance";
}

function isPrototypeServiceRecordActivityKind(value: unknown): value is PrototypeServiceRecordActivityKind {
  return value === "service" || value === "add-on" || value === "care" || value === "room";
}

function isPrototypeServiceRecordCorrectionField(value: unknown): value is PrototypeServiceRecordCorrectionField {
  return value === "summary" || value === "business-note";
}

function isPrototypeServiceRecordPaymentStatus(value: unknown): value is PrototypeServiceRecordPaymentStatus {
  return value === "unpaid" || value === "partial" || value === "paid" || value === "cancelled" || value === "no-charge";
}

function isPrototypeServiceRecordHandoverStatus(value: unknown): value is PrototypeServiceRecordHandoverStatus {
  return value === "pending" || value === "handed-over";
}

function isPrototypeServiceRecordDetail(value: unknown): value is PrototypeServiceRecordDetail {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const detail = value as Partial<PrototypeServiceRecordDetail>;
  return typeof detail.id === "string" && typeof detail.label === "string" && typeof detail.value === "string";
}

function isPrototypeServiceRecordActivity(value: unknown): value is PrototypeServiceRecordActivity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const activity = value as Partial<PrototypeServiceRecordActivity>;
  return typeof activity.id === "string"
    && isPrototypeServiceRecordActivityKind(activity.kind)
    && typeof activity.label === "string"
    && (typeof activity.occurredAt === "string" || activity.occurredAt === null)
    && (typeof activity.detail === "string" || activity.detail === null);
}

function isPrototypeServiceRecordPhoto(value: unknown): value is PrototypeServiceRecordPhoto {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const photo = value as Partial<PrototypeServiceRecordPhoto>;
  return typeof photo.id === "string"
    && (photo.phase === "before" || photo.phase === "after")
    && typeof photo.label === "string"
    && (typeof photo.localAssetRef === "string" || photo.localAssetRef === null)
    && typeof photo.createdAt === "string";
}

function isPrototypeServiceRecordSourceRevision(value: unknown): value is PrototypeServiceRecordSourceRevision {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const revision = value as Partial<PrototypeServiceRecordSourceRevision>;
  return typeof revision.id === "string"
    && typeof revision.at === "string"
    && typeof revision.completedAt === "string"
    && typeof revision.summary === "string"
    && Array.isArray(revision.details)
    && revision.details.every(isPrototypeServiceRecordDetail)
    && Array.isArray(revision.activities)
    && revision.activities.every(isPrototypeServiceRecordActivity)
    && Array.isArray(revision.staffResourceLabels)
    && revision.staffResourceLabels.every((label) => typeof label === "string")
    && typeof revision.businessNote === "string"
    && Array.isArray(revision.photos)
    && revision.photos.every(isPrototypeServiceRecordPhoto)
    && revision.reason === "source-recompleted";
}

function isPrototypeServiceRecordCorrection(value: unknown): value is PrototypeServiceRecordCorrection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const correction = value as Partial<PrototypeServiceRecordCorrection>;
  return typeof correction.id === "string"
    && typeof correction.at === "string"
    && isPrototypeServiceRecordCorrectionField(correction.field)
    && typeof correction.previousValue === "string"
    && typeof correction.nextValue === "string"
    && typeof correction.reason === "string"
    && typeof correction.correctedBy === "string"
    && typeof correction.requestKey === "string";
}

function isPrototypeServiceRecordHandoverEvent(value: unknown): value is PrototypeServiceRecordHandoverEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const event = value as Partial<PrototypeServiceRecordHandoverEvent>;
  return typeof event.id === "string"
    && typeof event.at === "string"
    && (event.type === "ready" || event.type === "handed-over")
    && typeof event.summary === "string"
    && (event.paymentStatus === null || isPrototypeServiceRecordPaymentStatus(event.paymentStatus));
}

function isPrototypeServiceRecordHandover(value: unknown): value is PrototypeServiceRecordHandover {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const handover = value as Partial<PrototypeServiceRecordHandover>;
  return isPrototypeServiceRecordHandoverStatus(handover.status)
    && (typeof handover.handedOverAt === "string" || handover.handedOverAt === null)
    && (typeof handover.handedOverBy === "string" || handover.handedOverBy === null)
    && typeof handover.note === "string"
    && (handover.paymentStatusAtHandover === null || isPrototypeServiceRecordPaymentStatus(handover.paymentStatusAtHandover))
    && Array.isArray(handover.history)
    && handover.history.every(isPrototypeServiceRecordHandoverEvent);
}

function isPrototypeServiceRecord(value: unknown): value is PrototypeServiceRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Partial<PrototypeServiceRecord>;
  const sourceIdsAreCoherent = record.source === "grooming-job"
    ? typeof record.serviceJobId === "string" && record.hotelStayId === null && (record.daycareAttendanceId === undefined || record.daycareAttendanceId === null)
    : record.source === "hotel-stay"
      ? typeof record.hotelStayId === "string" && record.serviceJobId === null && (record.daycareAttendanceId === undefined || record.daycareAttendanceId === null)
      : record.source === "daycare-attendance"
        ? typeof record.daycareAttendanceId === "string" && record.serviceJobId === null && record.hotelStayId === null
        : false;
  return typeof record.serviceRecordId === "string"
    && isPrototypeServiceRecordSource(record.source)
    && sourceIdsAreCoherent
    && typeof record.bookingId === "string"
    && typeof record.businessId === "string"
    && typeof record.branchId === "string"
    && typeof record.customerId === "string"
    && typeof record.petId === "string"
    && (record.serviceModule === "grooming" || record.serviceModule === "hotel" || record.serviceModule === "daycare")
    && typeof record.serviceLabel === "string"
    && typeof record.completedAt === "string"
    && typeof record.summary === "string"
    && Array.isArray(record.details)
    && record.details.every(isPrototypeServiceRecordDetail)
    && Array.isArray(record.activities)
    && record.activities.every(isPrototypeServiceRecordActivity)
    && Array.isArray(record.staffResourceLabels)
    && record.staffResourceLabels.every((label) => typeof label === "string")
    && typeof record.businessNote === "string"
    && Array.isArray(record.photos)
    && record.photos.every(isPrototypeServiceRecordPhoto)
    && (record.sourceRevisions === undefined || (Array.isArray(record.sourceRevisions) && record.sourceRevisions.every(isPrototypeServiceRecordSourceRevision)))
    && Array.isArray(record.corrections)
    && record.corrections.every(isPrototypeServiceRecordCorrection)
    && isPrototypeServiceRecordHandover(record.handover)
    && typeof record.createdAt === "string"
    && typeof record.updatedAt === "string";
}

function initialPrototypeServiceRecordHandover(serviceRecordId: string, at: string): PrototypeServiceRecordHandover {
  return {
    status: "pending",
    handedOverAt: null,
    handedOverBy: null,
    note: "",
    paymentStatusAtHandover: null,
    history: [{
      id: `${serviceRecordId}-handover-ready`,
      at,
      type: "ready",
      // Keep the legacy event shape for old persisted records without
      // presenting a new handover task in the current product.
      summary: "บันทึก Service Record จากงานที่เสร็จแล้ว",
      paymentStatus: null,
    }],
  };
}

function recordResourceLabels(job: PrototypeServiceJob) {
  const context = getDemoBusinessContextForBranch(job.businessId, job.branchId);
  const resources = getBookingResources(context, job.baseServiceId);
  const labels = job.assignedResourceIds
    .map((resourceId) => resources.find((resource) => resource.id === resourceId)?.label ?? null)
    .filter((label): label is string => Boolean(label));
  return [...new Set(labels)];
}

function roomLabelsForStay(stay: PrototypeHotelStay) {
  const context = getDemoBusinessContextForBranch(stay.businessId, stay.branchId);
  const rooms = getHotelRooms(context);
  return [...new Set(stay.roomAssignments
    .map((assignment) => rooms.find((room) => room.id === assignment.roomId)?.label ?? null)
    .filter((label): label is string => Boolean(label)))];
}

function buildPrototypeServiceRecordFromGroomingJob(
  job: PrototypeServiceJob,
  booking: PrototypeBooking,
): PrototypeServiceRecord | null {
  if (job.status !== "completed" || !job.actualCompletedAt) return null;
  const serviceRecordId = serviceRecordIdForGroomingJob(job.serviceJobId);
  const resourceLabels = recordResourceLabels(job);
  const addOnLabels = job.addOns.map((addOn) => addOn.label).filter(Boolean);
  const details: PrototypeServiceRecordDetail[] = [
    { id: `${serviceRecordId}-detail-base`, label: "บริการหลัก", value: booking.service.label },
    { id: `${serviceRecordId}-detail-addon`, label: "บริการเพิ่มเติม", value: addOnLabels.length > 0 ? addOnLabels.join(" · ") : "ไม่มี" },
    { id: `${serviceRecordId}-detail-team`, label: "ทีม / ทรัพยากร", value: resourceLabels.length > 0 ? resourceLabels.join(" · ") : "ยังไม่ระบุ" },
  ];
  const activities: PrototypeServiceRecordActivity[] = [
    {
      id: `${serviceRecordId}-activity-service`,
      kind: "service",
      label: booking.service.label,
      occurredAt: job.actualCompletedAt,
      detail: "บริการหลักเสร็จแล้ว",
    },
    ...job.addOns.map((addOn) => ({
      id: `${serviceRecordId}-activity-addon-${addOn.id}`,
      kind: "add-on" as const,
      label: addOn.label,
      occurredAt: addOn.approvedAt,
      detail: "บริการเพิ่มเติมที่อนุมัติแล้ว",
    })),
  ];
  return {
    serviceRecordId,
    source: "grooming-job",
    serviceJobId: job.serviceJobId,
    hotelStayId: null,
    bookingId: job.bookingId,
    businessId: job.businessId,
    branchId: job.branchId,
    customerId: job.customerId,
    petId: job.petId,
    serviceModule: "grooming",
    serviceLabel: booking.service.label,
    completedAt: job.actualCompletedAt,
    summary: `${booking.service.label} เสร็จแล้ว`,
    details,
    activities,
    staffResourceLabels: resourceLabels,
    businessNote: job.businessNote,
    photos: [],
    sourceRevisions: [],
    corrections: [],
    handover: initialPrototypeServiceRecordHandover(serviceRecordId, job.actualCompletedAt),
    createdAt: job.actualCompletedAt,
    updatedAt: job.actualCompletedAt,
  };
}

function buildPrototypeServiceRecordFromHotelStay(
  stay: PrototypeHotelStay,
  booking: PrototypeBooking,
): PrototypeServiceRecord | null {
  if ((stay.status !== "checked-out" && stay.status !== "completed") || !stay.actualCheckOutAt) return null;
  const serviceRecordId = serviceRecordIdForHotelStay(stay.hotelStayId);
  const roomLabels = roomLabelsForStay(stay);
  // Service Record intentionally summarizes ordinary daily care only. It excludes
  // guardianCareInstruction, Intake, medication instructions/authorization,
  // and incident details so it cannot become a medical or Passport record.
  const nonMedicalTasks = stay.dailyCareTasks.filter((task) => task.kind !== "medication");
  const completedCare = nonMedicalTasks.filter((task) => task.state === "completed");
  const completedCareLabels = completedCare.map((task) => task.label).filter(Boolean);
  const staffLabels = [...new Set(completedCare
    .map((task) => task.completedBy)
    .filter((label): label is string => Boolean(label)))];
  const details: PrototypeServiceRecordDetail[] = [
    { id: `${serviceRecordId}-detail-stay`, label: "ช่วงเข้าพัก", value: `${stay.scheduledCheckIn} – ${stay.scheduledCheckOut}` },
    { id: `${serviceRecordId}-detail-room`, label: "ห้อง / โซน", value: roomLabels.length > 0 ? roomLabels.join(" · ") : "ยังไม่ระบุ" },
    { id: `${serviceRecordId}-detail-care`, label: "งานดูแลทั่วไป", value: `${completedCare.length}/${nonMedicalTasks.length} รายการเสร็จแล้ว` },
  ];
  const activities: PrototypeServiceRecordActivity[] = [
    {
      id: `${serviceRecordId}-activity-stay`,
      kind: "service",
      label: booking.service.label,
      occurredAt: stay.actualCheckOutAt,
      detail: `เข้าพัก ${stay.scheduledCheckIn} – ${stay.scheduledCheckOut}`,
    },
    ...(roomLabels.length > 0 ? [{
      id: `${serviceRecordId}-activity-room`,
      kind: "room" as const,
      label: `ห้อง / โซน ${roomLabels.join(" · ")}`,
      occurredAt: stay.actualCheckOutAt,
      detail: stay.roomMoveHistory.length > 0 ? `มีการย้ายห้อง ${stay.roomMoveHistory.length} ครั้ง` : "ไม่มีการย้ายห้องที่บันทึกไว้",
    }] : []),
    {
      id: `${serviceRecordId}-activity-care`,
      kind: "care",
      label: `งานดูแลทั่วไปเสร็จ ${completedCare.length}/${nonMedicalTasks.length}`,
      occurredAt: stay.actualCheckOutAt,
      detail: completedCareLabels.length > 0 ? completedCareLabels.join(" · ") : "ไม่มีรายการดูแลทั่วไปที่ทำเสร็จ",
    },
  ];
  return {
    serviceRecordId,
    source: "hotel-stay",
    serviceJobId: null,
    hotelStayId: stay.hotelStayId,
    bookingId: stay.bookingId,
    businessId: stay.businessId,
    branchId: stay.branchId,
    customerId: stay.customerId,
    petId: stay.petId,
    serviceModule: "hotel",
    serviceLabel: booking.service.label,
    completedAt: stay.actualCheckOutAt,
    summary: `${booking.service.label} เช็กเอาต์แล้ว`,
    details,
    activities,
    staffResourceLabels: staffLabels,
    businessNote: stay.businessNote,
    photos: [],
    sourceRevisions: [],
    corrections: [],
    handover: initialPrototypeServiceRecordHandover(serviceRecordId, stay.actualCheckOutAt),
    createdAt: stay.actualCheckOutAt,
    updatedAt: stay.actualCheckOutAt,
  };
}

function buildPrototypeServiceRecordFromDaycareAttendance(
  attendance: PrototypeDaycareAttendance,
  booking: PrototypeBooking,
): PrototypeServiceRecord | null {
  if (attendance.status !== "checked-out" && attendance.status !== "completed") return null;
  const completedAt = attendance.completedAt ?? attendance.checkedOutAt;
  if (!completedAt) return null;
  const serviceRecordId = serviceRecordIdForDaycareAttendance(attendance.daycareAttendanceId);
  const context = getDemoBusinessContextForBranch(attendance.businessId, attendance.branchId);
  const zoneLabel = attendance.zoneId
    ? getPrototypeDaycareZones(context).find((zone) => zone.id === attendance.zoneId)?.label ?? "โซนที่ไม่พบในผังปัจจุบัน"
    : "ยังไม่ระบุ";
  const staffLabel = attendance.responsibleStaffId
    ? listPrototypeTeamMembers(context, { includeInactive: true }).find((member) => member.staffId === attendance.responsibleStaffId)?.name ?? "ผู้ดูแลเดิม"
    : "ยังไม่ระบุ";
  const details: PrototypeServiceRecordDetail[] = [
    { id: `${serviceRecordId}-detail-date`, label: "วันที่เข้า Daycare", value: attendance.attendanceDate },
    { id: `${serviceRecordId}-detail-zone`, label: "โซน", value: zoneLabel },
    { id: `${serviceRecordId}-detail-team`, label: "ผู้ดูแล", value: staffLabel },
    { id: `${serviceRecordId}-detail-care`, label: "กิจกรรมการดูแล", value: `${attendance.careEvents.length} รายการ` },
  ];
  const activities: PrototypeServiceRecordActivity[] = [
    {
      id: `${serviceRecordId}-activity-service`,
      kind: "service",
      label: booking.service.label,
      occurredAt: completedAt,
      detail: `${attendance.dropOffWindow ?? "ไม่ระบุเวลารับเข้า"} · ${attendance.pickupWindow ?? "ไม่ระบุเวลารับกลับ"}`,
    },
    ...attendance.careEvents.map((event) => ({
      id: `${serviceRecordId}-activity-${event.id}`,
      kind: "care" as const,
      label: event.label,
      occurredAt: event.occurredAt,
      detail: event.note,
    })),
  ];
  return {
    serviceRecordId,
    source: "daycare-attendance",
    serviceJobId: null,
    hotelStayId: null,
    daycareAttendanceId: attendance.daycareAttendanceId,
    bookingId: attendance.bookingId,
    businessId: attendance.businessId,
    branchId: attendance.branchId,
    customerId: attendance.customerId,
    petId: attendance.petId,
    serviceModule: "daycare",
    serviceLabel: booking.service.label,
    completedAt,
    summary: `${booking.service.label} รับกลับแล้ว`,
    details,
    activities,
    staffResourceLabels: staffLabel === "ยังไม่ระบุ" ? [] : [staffLabel],
    businessNote: attendance.businessNote,
    photos: [],
    sourceRevisions: [],
    corrections: [],
    handover: initialPrototypeServiceRecordHandover(serviceRecordId, completedAt),
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}

function mergedPrototypeServiceRecords(store: BusinessStore) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readServiceRecords().map(clonePrototypeServiceRecord);
  const records = new Map<string, PrototypeServiceRecord>();
  for (const stored of Object.values(store.serviceRecords)) {
    if (isPrototypeServiceRecord(stored)) records.set(stored.serviceRecordId, clonePrototypeServiceRecord(stored));
  }
  const bookings = new Map(mergedPrototypeBookings().map((booking) => [booking.bookingId, booking]));
  for (const job of mergedPrototypeServiceJobs(store)) {
    const recordId = serviceRecordIdForGroomingJob(job.serviceJobId);
    if (records.has(recordId)) continue;
    const booking = bookings.get(job.bookingId);
    const record = booking ? buildPrototypeServiceRecordFromGroomingJob(job, booking) : null;
    if (record) records.set(record.serviceRecordId, record);
  }
  for (const stay of mergedPrototypeHotelStays(store)) {
    const recordId = serviceRecordIdForHotelStay(stay.hotelStayId);
    if (records.has(recordId)) continue;
    const booking = bookings.get(stay.bookingId);
    const record = booking ? buildPrototypeServiceRecordFromHotelStay(stay, booking) : null;
    if (record) records.set(record.serviceRecordId, record);
  }
  for (const attendance of mergedPrototypeDaycareAttendances(store)) {
    const recordId = serviceRecordIdForDaycareAttendance(attendance.daycareAttendanceId);
    if (records.has(recordId)) continue;
    const booking = bookings.get(attendance.bookingId);
    const record = booking ? buildPrototypeServiceRecordFromDaycareAttendance(attendance, booking) : null;
    if (record) records.set(record.serviceRecordId, record);
  }
  return [...records.values()];
}

function serviceRecordMatchesContext(record: PrototypeServiceRecord, context?: DemoBusinessContext | null) {
  return !context || (record.businessId === context.businessId && record.branchId === context.branchId);
}

function sortPrototypeServiceRecords(records: readonly PrototypeServiceRecord[], context?: DemoBusinessContext | null) {
  return records
    .filter((record) => serviceRecordMatchesContext(record, context))
    .map(clonePrototypeServiceRecord)
    .sort((first, second) => second.completedAt.localeCompare(first.completedAt) || second.updatedAt.localeCompare(first.updatedAt) || first.serviceRecordId.localeCompare(second.serviceRecordId));
}

export function listPrototypeServiceRecordFixtures(context?: DemoBusinessContext | null) {
  return sortPrototypeServiceRecords(mergedPrototypeServiceRecords(emptyStore()), context);
}

export function listPrototypeServiceRecords(context?: DemoBusinessContext | null) {
  return sortPrototypeServiceRecords(mergedPrototypeServiceRecords(readStore()), context);
}

export function listPrototypeServiceRecordsForCustomer(
  customerId: string,
  context?: DemoBusinessContext | null,
  fixtureOnly = false,
) {
  const records = fixtureOnly ? listPrototypeServiceRecordFixtures(context) : listPrototypeServiceRecords(context);
  return records.filter((record) => record.customerId === customerId);
}

export function readPrototypeServiceRecord(serviceRecordId: string) {
  return listPrototypeServiceRecords(null).find((record) => record.serviceRecordId === serviceRecordId) ?? null;
}

function sourceIsCompleteForServiceRecord(record: PrototypeServiceRecord, store: BusinessStore) {
  if (record.source === "grooming-job" && record.serviceJobId) {
    const job = mergedPrototypeServiceJobs(store).find((item) => item.serviceJobId === record.serviceJobId) ?? null;
    return Boolean(job?.status === "completed" && job.actualCompletedAt);
  }
  if (record.source === "hotel-stay" && record.hotelStayId) {
    const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === record.hotelStayId) ?? null;
    return Boolean(stay && ["checked-out", "completed"].includes(stay.status) && stay.actualCheckOutAt);
  }
  if (record.source === "daycare-attendance" && record.daycareAttendanceId) {
    const attendance = mergedPrototypeDaycareAttendances(store).find((item) => item.daycareAttendanceId === record.daycareAttendanceId) ?? null;
    return Boolean(attendance && ["checked-out", "completed"].includes(attendance.status) && (attendance.checkedOutAt || attendance.completedAt));
  }
  return false;
}

function ensurePrototypeServiceRecordForGroomingJobInStore(
  store: BusinessStore,
  job: PrototypeServiceJob,
) {
  const serviceRecordId = serviceRecordIdForGroomingJob(job.serviceJobId);
  const existing = store.serviceRecords[serviceRecordId];
  if (isPrototypeServiceRecord(existing)) return clonePrototypeServiceRecord(existing);
  const booking = mergedPrototypeBookings().find((item) => item.bookingId === job.bookingId) ?? null;
  const record = booking ? buildPrototypeServiceRecordFromGroomingJob(job, booking) : null;
  if (!record) return null;
  store.serviceRecords[record.serviceRecordId] = record;
  return clonePrototypeServiceRecord(record);
}

function serviceRecordSourceSnapshotKey(record: PrototypeServiceRecord) {
  return JSON.stringify({
    completedAt: record.completedAt,
    serviceLabel: record.serviceLabel,
    summary: record.summary,
    details: record.details,
    activities: record.activities,
    staffResourceLabels: record.staffResourceLabels,
    businessNote: record.businessNote,
    photos: record.photos,
  });
}

function sourceRevisionFromPrototypeServiceRecord(record: PrototypeServiceRecord, at: string): PrototypeServiceRecordSourceRevision {
  return {
    id: generatedPrototypeServiceRecordId("service-record-source-revision"),
    at,
    completedAt: record.completedAt,
    summary: record.summary,
    details: record.details.map((detail) => ({ ...detail })),
    activities: record.activities.map((activity) => ({ ...activity })),
    staffResourceLabels: [...record.staffResourceLabels],
    businessNote: record.businessNote,
    photos: record.photos.map((photo) => ({ ...photo })),
    reason: "source-recompleted",
  };
}

function refreshPrototypeServiceRecordForGroomingJobInStore(
  store: BusinessStore,
  job: PrototypeServiceJob,
) {
  const serviceRecordId = serviceRecordIdForGroomingJob(job.serviceJobId);
  const existing = store.serviceRecords[serviceRecordId];
  if (!isPrototypeServiceRecord(existing)) return ensurePrototypeServiceRecordForGroomingJobInStore(store, job);
  const current = clonePrototypeServiceRecord(existing);
  const booking = mergedPrototypeBookings().find((item) => item.bookingId === job.bookingId) ?? null;
  const fresh = booking ? buildPrototypeServiceRecordFromGroomingJob(job, booking) : null;
  if (!fresh) return current;

  // An operator-entered lightweight correction remains intentional even when
  // the source Job is completed again. Refresh the execution-derived facts,
  // but retain those explicitly corrected text fields and local photo metadata.
  const refreshed: PrototypeServiceRecord = {
    ...fresh,
    summary: current.corrections.some((correction) => correction.field === "summary") ? current.summary : fresh.summary,
    businessNote: current.corrections.some((correction) => correction.field === "business-note") ? current.businessNote : fresh.businessNote,
    photos: current.photos.map((photo) => ({ ...photo })),
    sourceRevisions: current.sourceRevisions.map(clonePrototypeServiceRecordSourceRevision),
    corrections: current.corrections.map((correction) => ({ ...correction })),
    handover: {
      ...current.handover,
      history: current.handover.history.map((event) => ({ ...event })),
    },
    createdAt: current.createdAt,
    updatedAt: current.updatedAt,
  };
  if (serviceRecordSourceSnapshotKey(current) === serviceRecordSourceSnapshotKey(refreshed)) return current;

  const at = nextPrototypeServiceRecordAuditTimestamp(current);
  const next: PrototypeServiceRecord = {
    ...refreshed,
    sourceRevisions: [...refreshed.sourceRevisions, sourceRevisionFromPrototypeServiceRecord(current, at)],
    updatedAt: at,
  };
  store.serviceRecords[next.serviceRecordId] = next;
  return clonePrototypeServiceRecord(next);
}

function ensurePrototypeServiceRecordForHotelStayInStore(
  store: BusinessStore,
  stay: PrototypeHotelStay,
) {
  const serviceRecordId = serviceRecordIdForHotelStay(stay.hotelStayId);
  const existing = store.serviceRecords[serviceRecordId];
  if (isPrototypeServiceRecord(existing)) return clonePrototypeServiceRecord(existing);
  const booking = mergedPrototypeBookings().find((item) => item.bookingId === stay.bookingId) ?? null;
  const record = booking ? buildPrototypeServiceRecordFromHotelStay(stay, booking) : null;
  if (!record) return null;
  store.serviceRecords[record.serviceRecordId] = record;
  return clonePrototypeServiceRecord(record);
}

function ensurePrototypeServiceRecordForDaycareAttendanceInStore(
  store: BusinessStore,
  attendance: PrototypeDaycareAttendance,
) {
  const serviceRecordId = serviceRecordIdForDaycareAttendance(attendance.daycareAttendanceId);
  const existing = store.serviceRecords[serviceRecordId];
  if (isPrototypeServiceRecord(existing)) return clonePrototypeServiceRecord(existing);
  const booking = mergedPrototypeBookings().find((item) => item.bookingId === attendance.bookingId) ?? null;
  const record = booking ? buildPrototypeServiceRecordFromDaycareAttendance(attendance, booking) : null;
  if (!record) return null;
  store.serviceRecords[record.serviceRecordId] = record;
  return clonePrototypeServiceRecord(record);
}

export type GetOrCreatePrototypeServiceRecordResult =
  | { ok: true; record: PrototypeServiceRecord; created: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "not-completed" | "storage" };

export function getOrCreatePrototypeServiceRecordForGroomingJob(
  serviceJobId: string,
  context: DemoBusinessContext,
): GetOrCreatePrototypeServiceRecordResult {
  const store = readStore();
  const job = mergedPrototypeServiceJobs(store).find((item) => item.serviceJobId === serviceJobId) ?? null;
  if (!job) return { ok: false, reason: "missing" };
  if (!groomJobMatchesContext(job, context)) return { ok: false, reason: "wrong-context" };
  const existing = store.serviceRecords[serviceRecordIdForGroomingJob(job.serviceJobId)];
  if (isPrototypeServiceRecord(existing)) return { ok: true, record: clonePrototypeServiceRecord(existing), created: false };
  const record = ensurePrototypeServiceRecordForGroomingJobInStore(store, job);
  if (!record) return { ok: false, reason: "not-completed" };
  return writeStore(store) ? { ok: true, record, created: true } : { ok: false, reason: "storage" };
}

export function getOrCreatePrototypeServiceRecordForHotelStay(
  hotelStayId: string,
  context: DemoBusinessContext,
): GetOrCreatePrototypeServiceRecordResult {
  const store = readStore();
  const stay = mergedPrototypeHotelStays(store).find((item) => item.hotelStayId === hotelStayId) ?? null;
  if (!stay) return { ok: false, reason: "missing" };
  if (!hotelStayMatchesContext(stay, context)) return { ok: false, reason: "wrong-context" };
  const existing = store.serviceRecords[serviceRecordIdForHotelStay(stay.hotelStayId)];
  if (isPrototypeServiceRecord(existing)) return { ok: true, record: clonePrototypeServiceRecord(existing), created: false };
  const record = ensurePrototypeServiceRecordForHotelStayInStore(store, stay);
  if (!record) return { ok: false, reason: "not-completed" };
  return writeStore(store) ? { ok: true, record, created: true } : { ok: false, reason: "storage" };
}

export function getOrCreatePrototypeServiceRecordForDaycareAttendance(
  daycareAttendanceId: string,
  context: DemoBusinessContext,
): GetOrCreatePrototypeServiceRecordResult {
  const store = readStore();
  const attendance = mergedPrototypeDaycareAttendances(store).find((item) => item.daycareAttendanceId === daycareAttendanceId) ?? null;
  if (!attendance) return { ok: false, reason: "missing" };
  if (!daycareAttendanceMatchesContext(attendance, context)) return { ok: false, reason: "wrong-context" };
  const existing = store.serviceRecords[serviceRecordIdForDaycareAttendance(attendance.daycareAttendanceId)];
  if (isPrototypeServiceRecord(existing)) return { ok: true, record: clonePrototypeServiceRecord(existing), created: false };
  const record = ensurePrototypeServiceRecordForDaycareAttendanceInStore(store, attendance);
  if (!record) return { ok: false, reason: "not-completed" };
  return writeStore(store) ? { ok: true, record, created: true } : { ok: false, reason: "storage" };
}

function paymentReferenceForServiceRecord(
  record: PrototypeServiceRecord,
  charges: readonly PrototypeCharge[],
  payments: readonly PrototypePayment[],
): PrototypeServiceRecordPaymentReference {
  const sourceCharges = charges.filter((charge) => (
    (record.serviceJobId && charge.serviceJobId === record.serviceJobId)
    || (record.hotelStayId && charge.hotelStayId === record.hotelStayId)
    || (record.daycareAttendanceId && charge.daycareAttendanceId === record.daycareAttendanceId)
  ));
  const bookingCharges = charges.filter((charge) => charge.bookingId === record.bookingId);
  const charge = sourceCharges[0] ?? bookingCharges[0] ?? null;
  if (!charge) return { chargeId: null, status: "no-charge", total: 0, paid: 0, remaining: 0, source: "none" };
  const balance = getPrototypeChargeBalance(charge, payments);
  return {
    chargeId: charge.chargeId,
    status: balance.status,
    total: balance.total,
    paid: balance.paid,
    remaining: balance.remaining,
    source: sourceCharges.length > 0 ? "source" : "booking",
  };
}

export function getPrototypeServiceRecordPaymentReference(
  record: PrototypeServiceRecord,
  context: DemoBusinessContext,
  fixtureOnly = false,
) {
  if (!serviceRecordMatchesContext(record, context)) return { chargeId: null, status: "no-charge", total: 0, paid: 0, remaining: 0, source: "none" } satisfies PrototypeServiceRecordPaymentReference;
  const charges = fixtureOnly ? listPrototypeChargeFixtures(context) : listPrototypeCharges(context);
  const payments = fixtureOnly ? listPrototypePaymentFixtures(context) : listPrototypePayments(context);
  return paymentReferenceForServiceRecord(record, charges, payments);
}

export type CorrectPrototypeServiceRecordResult =
  | { ok: true; record: PrototypeServiceRecord; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "invalid" | "storage" };

export function correctPrototypeServiceRecord(input: {
  serviceRecordId: string;
  context: DemoBusinessContext;
  field: PrototypeServiceRecordCorrectionField;
  nextValue: string;
  reason: string;
  requestKey: string;
}): CorrectPrototypeServiceRecordResult {
  const nextValue = input.nextValue.trim();
  const reason = input.reason.trim();
  const requestKey = input.requestKey.trim();
  if (!isPrototypeServiceRecordCorrectionField(input.field) || !nextValue || !reason || !requestKey) return { ok: false, reason: "invalid" };
  const store = readStore();
  const record = mergedPrototypeServiceRecords(store).find((item) => item.serviceRecordId === input.serviceRecordId) ?? null;
  if (!record) return { ok: false, reason: "missing" };
  if (!serviceRecordMatchesContext(record, input.context)) return { ok: false, reason: "wrong-context" };
  const duplicate = record.corrections.find((correction) => correction.requestKey === requestKey) ?? null;
  if (duplicate) return { ok: true, record: clonePrototypeServiceRecord(record), duplicate: true };
  const previousValue = input.field === "summary" ? record.summary : record.businessNote;
  if (previousValue === nextValue) return { ok: false, reason: "invalid" };
  const now = nextPrototypeServiceRecordAuditTimestamp(record);
  const correction: PrototypeServiceRecordCorrection = {
    id: generatedPrototypeServiceRecordId("service-record-correction"),
    at: now,
    field: input.field,
    previousValue,
    nextValue,
    reason,
    correctedBy: input.context.memberLabel,
    requestKey,
  };
  const next: PrototypeServiceRecord = {
    ...clonePrototypeServiceRecord(record),
    summary: input.field === "summary" ? nextValue : record.summary,
    businessNote: input.field === "business-note" ? nextValue : record.businessNote,
    corrections: [...record.corrections.map((item) => ({ ...item })), correction],
    updatedAt: now,
  };
  store.serviceRecords[next.serviceRecordId] = next;
  return writeStore(store) ? { ok: true, record: clonePrototypeServiceRecord(next), duplicate: false } : { ok: false, reason: "storage" };
}

export type CompletePrototypeServiceRecordHandoverResult =
  | { ok: true; record: PrototypeServiceRecord; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "source-not-complete" | "review-required" | "storage" };

export function completePrototypeServiceRecordHandover(input: {
  serviceRecordId: string;
  context: DemoBusinessContext;
  note?: string;
  paymentReviewed: boolean;
}): CompletePrototypeServiceRecordHandoverResult {
  if (!input.paymentReviewed) return { ok: false, reason: "review-required" };
  const store = readStore();
  const record = mergedPrototypeServiceRecords(store).find((item) => item.serviceRecordId === input.serviceRecordId) ?? null;
  if (!record) return { ok: false, reason: "missing" };
  if (!serviceRecordMatchesContext(record, input.context)) return { ok: false, reason: "wrong-context" };
  if (record.handover.status === "handed-over") return { ok: true, record: clonePrototypeServiceRecord(record), duplicate: true };
  if (!sourceIsCompleteForServiceRecord(record, store)) return { ok: false, reason: "source-not-complete" };
  const paymentReference = paymentReferenceForServiceRecord(record, mergedPrototypeCharges(store), mergedPrototypePayments(store));
  const now = nextPrototypeServiceRecordAuditTimestamp(record);
  const next: PrototypeServiceRecord = {
    ...clonePrototypeServiceRecord(record),
    handover: {
      ...record.handover,
      status: "handed-over",
      handedOverAt: now,
      handedOverBy: input.context.memberLabel,
      note: input.note?.trim() ?? "",
      paymentStatusAtHandover: paymentReference.status,
      history: [...record.handover.history.map((event) => ({ ...event })), {
        id: generatedPrototypeServiceRecordId("service-record-handover"),
        at: now,
        type: "handed-over",
        summary: "ส่งมอบให้ลูกค้าแล้ว",
        paymentStatus: paymentReference.status,
      }],
    },
    updatedAt: now,
  };
  store.serviceRecords[next.serviceRecordId] = next;
  return writeStore(store) ? { ok: true, record: clonePrototypeServiceRecord(next), duplicate: false } : { ok: false, reason: "storage" };
}

function synchronizePrototypeHotelStaysForBooking(store: BusinessStore, booking: PrototypeBooking, now: string) {
  const existingStays = mergedPrototypeHotelStays(store).filter((stay) => stay.bookingId === booking.bookingId);
  if (booking.serviceModule !== "hotel" || booking.status === "cancelled") {
    for (const existing of existingStays) {
      if (existing.status === "checked-out" || existing.status === "completed" || existing.status === "cancelled") continue;
      const cancelled: PrototypeHotelStay = {
        ...clonePrototypeHotelStay(existing),
        status: "cancelled",
        cancelledAt: now,
        updatedAt: now,
        history: [...existing.history.map((item) => ({ ...item })), { id: hotelStayHistoryId("status"), at: now, type: "status", summary: "ยกเลิกรายการเข้าพักตามการจอง" }],
      };
      store.hotelStays[cancelled.hotelStayId] = cancelled;
    }
    return;
  }

  for (const pet of booking.pets) {
    const existing = existingStays.find((stay) => stay.petId === pet.id) ?? null;
    if (!existing) {
      const created = buildHotelStayFromBooking(booking, pet, now);
      store.hotelStays[created.hotelStayId] = created;
      continue;
    }
    if (existing.status === "checked-out" || existing.status === "completed" || existing.status === "cancelled") continue;
    const datesChanged = existing.scheduledCheckIn !== booking.start || existing.scheduledCheckOut !== (booking.end ?? addBusinessCalendarDays(booking.start, 1));
    const nextCheckOut = booking.end ?? addBusinessCalendarDays(booking.start, 1);
    const next: PrototypeHotelStay = {
      ...clonePrototypeHotelStay(existing),
      businessId: booking.businessId,
      branchId: booking.branchId,
      customerId: booking.customer.id,
      scheduledCheckIn: booking.start,
      scheduledCheckOut: nextCheckOut,
      roomAssignments: existing.roomAssignments.map((assignment) => ({
        ...assignment,
        startDate: assignment.startDate === existing.scheduledCheckIn ? booking.start : assignment.startDate,
        endDate: (assignment.endDate ?? existing.scheduledCheckOut) === existing.scheduledCheckOut ? nextCheckOut : assignment.endDate,
      })),
      status: existing.status === "booked" && booking.start === BOOKING_DEMO_DATE ? "expected-today" : existing.status,
      updatedAt: now,
      history: datesChanged ? [...existing.history.map((item) => ({ ...item })), { id: hotelStayHistoryId("dates"), at: now, type: "dates", summary: "ปรับวันเข้าพักจาก Calendar" }] : existing.history.map((item) => ({ ...item })),
    };
    store.hotelStays[next.hotelStayId] = next;
  }
  for (const existing of existingStays) {
    if (booking.pets.some((pet) => pet.id === existing.petId) || existing.status === "checked-out" || existing.status === "completed" || existing.status === "cancelled") continue;
    const cancelled: PrototypeHotelStay = {
      ...clonePrototypeHotelStay(existing),
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
      history: [...existing.history.map((item) => ({ ...item })), { id: hotelStayHistoryId("status"), at: now, type: "status", summary: "ยกเลิกรายการเข้าพักของน้องที่ถูกนำออกจากการจอง" }],
    };
    store.hotelStays[cancelled.hotelStayId] = cancelled;
  }
}

/**
 * Best-effort compatibility projection for execution domains that remain
 * browser-local until BE4. It never persists a Booking record and therefore
 * cannot become planning truth. Call only with an authoritative BE3 result.
 */
export function synchronizePrototypeExecutionCompatibilityForBooking(booking: PrototypeBooking) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return true; // BE3 and BE4 already committed atomically.
  const store = readStore();
  const now = booking.updatedAt || new Date().toISOString();
  synchronizePrototypeGroomingJobsForBooking(store, booking, now);
  synchronizePrototypeHotelStaysForBooking(store, booking, now);
  synchronizePrototypeDaycareAttendancesForBooking(store, booking, now);
  return writeStore(store);
}

export function getBusinessHomeDemo(context: DemoBusinessContext) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return { today: { waitingIntake: readReport(context).waitingIntake, readyForPickup: 0 }, attention: [], moduleSummaries: {} } as BusinessHomeDemo;
  return DEMO_BUSINESS_HOME[context.key] ?? DEMO_BUSINESS_HOME[DEFAULT_BUSINESS_CONTEXT_KEY];
}

export function readActiveBusinessContext() {
  return getDemoBusinessContext(readStore().activeContextKey);
}

export function writeActiveBusinessContext(contextKey: string) {
  const context = getDemoBusinessContext(contextKey);
  const store = readStore();
  store.activeContextKey = context.key;
  return writeStore(store) ? context : readActiveBusinessContext();
}

export function detectQrContract(value: string): QrContractType {
  const normalized = value.trim();
  const upper = normalized.toUpperCase();
  if (/\/quick-passport\//i.test(normalized) || upper.startsWith("QUICK-PASSPORT")) return "quick-passport";
  if (/\/safety\//i.test(normalized) || upper.startsWith("PUBLIC-SAFETY")) return "public-safety";
  if (/\/temporary-access\//i.test(normalized) || /^tb_[A-Za-z0-9_-]{43}$/.test(normalized) || (BUSINESS_FIXTURE_TEST_MODE && upper.startsWith("DEMO-TEMP-"))) return "temporary-business";
  return "unknown";
}

export function accessIdFromScanValue(value: string) {
  const normalized = value.trim();
  try {
    const url = new URL(normalized, "https://prototype.local");
    const match = url.pathname.match(/^\/temporary-access\/([^/]+)\/?$/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function findTemporaryAccessFromScanValue(value: string) {
  const accessId = accessIdFromScanValue(value);
  return accessId ? readTemporaryAccess(accessId) : findTemporaryAccessByFallbackCode(value);
}

export function createOrResumeBusinessIntake(
  access: TemporaryAccess,
  context: DemoBusinessContext,
  target: { hotelStayId?: string | null; daycareAttendanceId?: string | null } = {},
) {
  if (access.businessId !== context.businessId || access.branchId !== context.branchId) return null;
  const store = readStore();
  const requestedHotelStayId = target.hotelStayId ?? null;
  const requestedDaycareAttendanceId = target.daycareAttendanceId ?? null;
  const existing = Object.values(store.intakes).find((record) => record.accessId === access.id
    && record.businessId === context.businessId && record.branchId === context.branchId
    && (!requestedHotelStayId || record.hotelStayId === requestedHotelStayId)
    && (!requestedDaycareAttendanceId || record.daycareAttendanceId === requestedDaycareAttendanceId));
  if (existing) return existing;

  // The scanner has already passed recipient, Branch, scope, expiry, and
  // consent checks before this function runs. Reuse an explicit local match
  // only; an unknown QR never creates a permanent Customer relationship.
  const knownRelationship = findKnownBusinessCustomerPetByPassportSlug(context.businessId, access.petSlug);
  const hotelStay = requestedHotelStayId ? readPrototypeHotelStay(requestedHotelStayId) : null;
  if (requestedHotelStayId && (!hotelStay
    || hotelStay.businessId !== context.businessId
    || hotelStay.branchId !== context.branchId
    || hotelStay.customerId !== knownRelationship?.customer.id
    || hotelStay.petId !== knownRelationship?.pet.id)) return null;
  const daycareAttendance = requestedDaycareAttendanceId ? readPrototypeDaycareAttendance(requestedDaycareAttendanceId) : null;
  if (requestedDaycareAttendanceId && (!daycareAttendance
    || daycareAttendance.businessId !== context.businessId
    || daycareAttendance.branchId !== context.branchId
    || daycareAttendance.customerId !== knownRelationship?.customer.id
    || daycareAttendance.petId !== knownRelationship?.pet.id)) return null;

  const now = new Date().toISOString();
  const suffix = access.id.replace(/^prototype-access-/, "").replace(/[^a-z0-9-]/gi, "").slice(-32) || Date.now().toString(36);
  const targetSuffix = requestedDaycareAttendanceId
    ? `-daycare-${requestedDaycareAttendanceId.replace(/[^a-z0-9-]/gi, "").slice(-32)}`
    : requestedHotelStayId ? `-hotel-${requestedHotelStayId.replace(/[^a-z0-9-]/gi, "").slice(-32)}` : "";
  const record: BusinessIntakeRecord = {
    id: `prototype-intake-${suffix}${targetSuffix}`,
    accessId: access.id,
    businessId: context.businessId,
    branchId: context.branchId,
    customerId: knownRelationship?.customer.id ?? null,
    petRelationshipId: knownRelationship?.pet.id ?? null,
    serviceJobId: null,
    hotelStayId: hotelStay?.hotelStayId ?? null,
    daycareAttendanceId: daycareAttendance?.daycareAttendanceId ?? null,
    role: context.role,
    staffLabel: context.memberLabel,
    servicePurpose: access.purpose,
    sharedScope: [...access.scope],
    belongings: [],
    businessNote: "",
    correctionSuggestion: null,
    taskState: "allowed-data",
    checkInState: "draft",
    createdAt: now,
    updatedAt: now,
    checkedInAt: null,
    prototypeSessionReference: null,
  };
  store.intakes[record.id] = record;
  return writeStore(store) ? record : null;
}

export function readBusinessIntake(intakeId: string) {
  const record = readStore().intakes[intakeId];
  return record?.id === intakeId ? record : null;
}

export function updateBusinessIntake(
  intakeId: string,
  update: (record: BusinessIntakeRecord) => BusinessIntakeRecord,
) {
  const store = readStore();
  const record = store.intakes[intakeId];
  if (!record) return null;
  const next = { ...update(record), id: record.id, accessId: record.accessId, updatedAt: new Date().toISOString() };
  store.intakes[intakeId] = next;
  return writeStore(store) ? next : null;
}

export function submitCorrectionSuggestion(
  intakeId: string,
  suggestion: Omit<CorrectionSuggestion, "id" | "submittedAt" | "status">,
) {
  return updateBusinessIntake(intakeId, (record) => ({
    ...record,
    correctionSuggestion: {
      ...suggestion,
      id: `prototype-correction-${Date.now().toString(36)}`,
      submittedAt: new Date().toISOString(),
      status: "submitted-prototype",
    },
  }));
}

export function approveOwnerDecisionPrototype(accessId: string) {
  const access = readTemporaryAccess(accessId);
  if (!access || (access.status !== "ready" && access.status !== "awaiting-owner")) return access;
  const approved = addAccessEvent(
    { ...access, status: "active", consentStatus: "approved", decisionAt: new Date().toISOString() },
    "approved",
    "Primary Guardian (Prototype control)",
    "จำลอง Guardian อนุมัติขอบเขตเดิมใน local prototype",
  );
  return updateTemporaryAccess(approved) ? approved : access;
}

export function beginOwnerDecisionPrototype(accessId: string, requester: string) {
  const access = readTemporaryAccess(accessId);
  if (!access || access.status !== "ready" || access.consentStatus !== "additional-decision-needed") return access;
  const pending = addAccessEvent(
    { ...access, status: "awaiting-owner", requester },
    "request-sent",
    requester,
    "ส่งคำขอเพื่อรอ Guardian ตัดสินใจเพิ่มเติมจาก Business Intake",
  );
  return updateTemporaryAccess(pending) ? pending : access;
}

export function setPrototypeAccessInterruption(accessId: string, state: "revoked" | "expired") {
  const access = readTemporaryAccess(accessId);
  if (!access) return null;
  if (state === "expired") {
    const expired = { ...access, status: "active" as const, expiresAt: new Date(Date.now() - 60_000).toISOString() };
    return updateTemporaryAccess(expired) ? readTemporaryAccess(accessId) : access;
  }
  const revoked = addAccessEvent(
    { ...access, status: "revoked", revokedAt: new Date().toISOString() },
    "revoked",
    "Primary Guardian (Prototype control)",
    "จำลองการยกเลิกสิทธิ์ระหว่าง Intake",
  );
  return updateTemporaryAccess(revoked) ? revoked : access;
}

export function confirmPrototypeCheckIn(intakeId: string, activeContext?: DemoBusinessContext): CheckInResult {
  const record = readBusinessIntake(intakeId);
  if (!record) return { ok: false, reason: "missing" };
  if (record.checkInState === "checked-in") return { ok: true, record, duplicate: true };

  const access = readTemporaryAccess(record.accessId);
  const gate = activeContext
    ? evaluateTemporaryAccess(access, activeContext.businessId, activeContext.branchId)
    : evaluateTemporaryAccess(access, record.businessId, record.branchId);
  if (gate !== "valid" || !access || access.status !== "active") {
    const reason = gate === "wrong-business"
      ? "wrong-business"
      : gate === "expired" || gate === "revoked" || gate === "invalid"
        ? gate
        : "changed";
    return { ok: false, reason };
  }

  const checkedInAt = new Date().toISOString();
  const store = readStore();
  const context = activeContext ?? getDemoBusinessContextForBranch(record.businessId, record.branchId);
  let serviceJobId = record.serviceJobId ?? null;

  // Hotel and Daycare targets are passed explicitly from their operations
  // surfaces. Intake never guesses an execution record from free text.
  if (record.daycareAttendanceId) {
    const attendance = mergedPrototypeDaycareAttendances(store).find((item) => item.daycareAttendanceId === record.daycareAttendanceId) ?? null;
    if (!attendance
      || attendance.businessId !== context.businessId
      || attendance.branchId !== context.branchId
      || attendance.customerId !== record.customerId
      || attendance.petId !== record.petRelationshipId
      || !attendance.zoneId
      || !["booked", "checked-in", "active"].includes(attendance.status)) return { ok: false, reason: "changed" };
    if (attendance.status === "booked" && !getPrototypeDaycareZoneAvailability(context, attendance.zoneId, attendance.attendanceDate, attendance.daycareAttendanceId).available) {
      return { ok: false, reason: "changed" };
    }
    const nextStatus: DaycareAttendanceStatus = attendance.status === "booked" ? "checked-in" : attendance.status;
    store.daycareAttendances[attendance.daycareAttendanceId] = {
      ...clonePrototypeDaycareAttendance(attendance),
      intakeId,
      status: nextStatus,
      checkedInAt: nextStatus === "checked-in" ? attendance.checkedInAt ?? checkedInAt : attendance.checkedInAt,
      updatedAt: checkedInAt,
      history: attendance.intakeId === intakeId
        ? attendance.history.map((item) => ({ ...item }))
        : [...attendance.history.map((item) => ({ ...item })), daycareHistoryItem("intake", "Intake เสร็จแล้วและเชื่อมกับรายการ Daycare", checkedInAt)],
    };
  } else if (record.hotelStayId) {
    const hotelStay = mergedPrototypeHotelStays(store).find((stay) => stay.hotelStayId === record.hotelStayId) ?? null;
    if (!hotelStay
      || hotelStay.businessId !== context.businessId
      || hotelStay.branchId !== context.branchId
      || hotelStay.customerId !== record.customerId
      || hotelStay.petId !== record.petRelationshipId) return { ok: false, reason: "changed" };
    if (hotelStay.intakeId !== intakeId) {
      const prepared: PrototypeHotelStay = {
        ...clonePrototypeHotelStay(hotelStay),
        intakeId,
        updatedAt: checkedInAt,
        history: [...hotelStay.history.map((item) => ({ ...item })), { id: hotelStayHistoryId("intake"), at: checkedInAt, type: "intake", summary: "Intake เสร็จแล้ว รอระบุห้องก่อนรับเข้า" }],
      };
      store.hotelStays[prepared.hotelStayId] = prepared;
    }
  // Scan/Intake does not infer a service from a free-text purpose. It only
  // attaches a known Grooming Job when Business, Branch, Customer, Pet, and
  // an already-scheduled booked Job all match the shared records.
  } else if (getEnabledBusinessModules(context).includes("grooming") && record.customerId && record.petRelationshipId) {
    const jobs = mergedPrototypeServiceJobs(store);
    const candidate = (serviceJobId ? jobs.find((job) => job.serviceJobId === serviceJobId) : null)
      ?? jobs.find((job) => (
        job.businessId === context.businessId
        && job.branchId === context.branchId
        && job.customerId === record.customerId
        && job.petId === record.petRelationshipId
        && job.status === "booked"
      ))
      ?? null;
    if (candidate && candidate.status === "booked") {
      const activated = transitionServiceJobValue(candidate, "checked-in", checkedInAt, "intake");
      store.serviceJobs[activated.serviceJobId] = { ...activated, intakeId: intakeId };
      serviceJobId = activated.serviceJobId;
    }
  }

  const completed: BusinessIntakeRecord = {
    ...record,
    serviceJobId,
    taskState: "complete",
    checkInState: "checked-in",
    checkedInAt,
    updatedAt: checkedInAt,
    prototypeSessionReference: `LOCAL-SESSION-${Date.now().toString(36).toUpperCase()}`,
  };
  store.intakes[intakeId] = completed;
  return writeStore(store)
    ? { ok: true, record: completed, duplicate: false }
    : { ok: false, reason: "changed" };
}

function fixtureAccess(
  id: string,
  fallbackCode: string,
  businessId: string,
  branchId: string,
  status: TemporaryAccess["status"],
  consentStatus: TemporaryAccess["consentStatus"],
  expiresAt: string,
): TemporaryAccess {
  const business = getBusinessFixture(businessId);
  return {
    id,
    fallbackCode,
    petSlug: "demo-luna",
    businessId,
    branchId,
    purpose: business?.purpose ?? "รับเข้าบริการตามข้อมูลที่เจ้าของอนุญาต",
    scope: ["basicIdentity", "photo"],
    createdAt: new Date(Date.now() - 10 * 60_000).toISOString(),
    expiresAt,
    status,
    consentStatus,
    requester: status === "awaiting-owner" ? "ผู้ประสานงานดูแล" : null,
    decisionAt: null,
    revokedAt: status === "revoked" ? new Date(Date.now() - 2 * 60_000).toISOString() : null,
    events: [{
      id: `created-${id}`,
      type: "created",
      occurredAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      actor: "เจ้าของหลัก",
      summary: "สร้าง QR ชั่วคราวสำหรับร้านเพื่อทดสอบขั้นตอนรับเข้า",
    }],
  };
}

export function ensureBusinessScanFixtures() {
  const future = new Date(Date.now() + 8 * 60 * 60_000).toISOString();
  const past = new Date(Date.now() - 5 * 60_000).toISOString();
  const fixtures = [
    fixtureAccess("prototype-access-phase-e-active", "DEMO-TEMP-ACTIVE", "business-whisker-rest", "whisker-ari", "active", "owner-consented", future),
    fixtureAccess("prototype-access-phase-e-expiry-midflow", "DEMO-TEMP-EXPIRY-MIDFLOW", "business-whisker-rest", "whisker-ari", "active", "owner-consented", future),
    fixtureAccess("prototype-access-phase-e-responsive", "DEMO-TEMP-RESPONSIVE", "business-whisker-rest", "whisker-ari", "active", "owner-consented", future),
    fixtureAccess("prototype-access-phase-e-pending", "DEMO-TEMP-PENDING", "business-paw-partner", "partner-onnut", "ready", "additional-decision-needed", future),
    fixtureAccess("prototype-access-phase-e-pending-responsive", "DEMO-TEMP-PENDING-RESPONSIVE", "business-paw-partner", "partner-onnut", "ready", "additional-decision-needed", future),
    fixtureAccess("prototype-access-phase-e-expired", "DEMO-TEMP-EXPIRED", "business-whisker-rest", "whisker-ari", "active", "owner-consented", past),
    fixtureAccess("prototype-access-phase-e-revoked", "DEMO-TEMP-REVOKED", "business-whisker-rest", "whisker-ari", "revoked", "owner-consented", future),
    fixtureAccess("prototype-access-phase-e-wrong", "DEMO-TEMP-WRONG", "business-gentle-groom", "gentle-rama9", "active", "owner-consented", future),
  ];
  for (const access of fixtures) {
    if (!readTemporaryAccess(access.id)) updateTemporaryAccess(access);
  }
}

// ---------------------------------------------------------------------------
// BF-8 Reports & Business Insights Foundation
// ---------------------------------------------------------------------------

export type ReportDateRangePreset = "today" | "7d" | "30d" | "custom";
export type ReportBranchScope = "current" | "all";

export type GetBusinessReportsOptions = {
  dateRangePreset?: ReportDateRangePreset;
  customStartDate?: string;
  customEndDate?: string;
  branchScope?: ReportBranchScope;
  fixtureOnly?: boolean;
};

export type ReportKeyMetrics = {
  revenue: number;
  paymentCount: number;
  unpaidBalance: number;
  unpaidCount: number;
  partialCount: number;
  completedServices: number;
  completedGrooming: number;
  completedHotel: number;
  completedDaycare: number;
  totalBookings: number;
  confirmedBookings: number;
  arrivedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
};

export type ReportPopularService = {
  label: string;
  module: BusinessServiceModule;
  count: number;
  revenue: number;
};

export type ReportServiceBreakdown = {
  grooming: {
    revenue: number;
    jobCount: number;
    completedCount: number;
    inProgressCount: number;
    popularServices: ReportPopularService[];
  };
  hotel: {
    revenue: number;
    stayCount: number;
    checkInCount: number;
    checkOutCount: number;
    occupancyRate: number;
    capacity: number;
    occupied: number;
    available: number;
  };
  daycare: {
    enabled: boolean;
    revenue: number;
    bookingCount: number;
    attendanceCount: number;
    activeCount: number;
    readyForPickupCount: number;
    completedCount: number;
    capacity: number;
    occupied: number;
    available: number;
  };
};

export type ReportOperationalInsights = {
  busiestDay: { dayName: string; count: number };
  peakAppointmentTime: { timeSlot: string; count: number };
  hotelOccupancyRate: number;
  cancellations: {
    totalCancelledBookings: number;
    cancellationRate: number;
    noShowStays: number;
    cancelledJobs: number;
  };
  workStatus: {
    completed: number;
    pendingOrInProgress: number;
    delayedOrAttention: number;
  };
};

export type ReportTopCustomer = {
  customerId: string;
  customerName: string;
  petNames: string[];
  visitCount: number;
  totalSpent: number;
};

export type ReportRecentServiceItem = {
  id: string;
  date: string;
  time: string;
  customerName: string;
  petName: string;
  serviceLabel: string;
  module: BusinessServiceModule;
  branchId: string;
  branchName: string;
  statusLabel: string;
  statusCode: string;
  amount: number;
  paymentStatus: PrototypeChargeStatus | "no-charge";
};

export type ReportBranchComparisonItem = {
  branchId: string;
  branchName: string;
  bookingCount: number;
  completedCount: number;
  revenue: number;
  enabledModules: readonly BusinessServiceModule[];
};

export type BusinessReportsSummary = {
  dateRange: {
    preset: ReportDateRangePreset;
    startDate: string;
    endDate: string;
  };
  branchScope: ReportBranchScope;
  branchName: string;
  businessName: string;
  keyMetrics: ReportKeyMetrics;
  serviceBreakdown: ReportServiceBreakdown;
  operationalInsights: ReportOperationalInsights;
  customerInsights: {
    newCustomers: number;
    returningCustomers: number;
    topCustomers: ReportTopCustomer[];
    recentServices: ReportRecentServiceItem[];
  };
  branchComparison: ReportBranchComparisonItem[];
};

const THAI_DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"] as const;

export function getBusinessReportsSummary(
  context: DemoBusinessContext,
  options: GetBusinessReportsOptions = {},
): BusinessReportsSummary {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readReport(context, options);
  const {
    dateRangePreset = "today",
    customStartDate,
    customEndDate,
    branchScope = "current",
    fixtureOnly = false,
  } = options;

  let startDate: string = BOOKING_DEMO_DATE;
  let endDate: string = BOOKING_DEMO_DATE;

  if (dateRangePreset === "today") {
    startDate = BOOKING_DEMO_DATE;
    endDate = BOOKING_DEMO_DATE;
  } else if (dateRangePreset === "7d") {
    // 7 days ending at BOOKING_DEMO_DATE (2026-08-12 to 2026-08-18)
    startDate = "2026-08-12";
    endDate = BOOKING_DEMO_DATE;
  } else if (dateRangePreset === "30d") {
    // 30 days ending at BOOKING_DEMO_DATE (2026-07-20 to 2026-08-18)
    startDate = "2026-07-20";
    endDate = BOOKING_DEMO_DATE;
  } else if (dateRangePreset === "custom") {
    startDate = customStartDate || BOOKING_DEMO_DATE;
    endDate = customEndDate || BOOKING_DEMO_DATE;
    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }
  }

  const isAllBranches = branchScope === "all";

  // Data sources
  const allCharges = fixtureOnly ? listPrototypeChargeFixtures(null) : listPrototypeCharges(null);
  const allPayments = fixtureOnly ? listPrototypePaymentFixtures(null) : listPrototypePayments(null);
  const allBookings = fixtureOnly ? listPrototypeBookingFixtures(null, { includeCancelled: true }) : listPrototypeBookings(null, { includeCancelled: true });
  const allGroomingJobs = fixtureOnly ? listPrototypeGroomingServiceJobFixtures(null, { includeCancelled: true }) : listPrototypeGroomingServiceJobs(null, { includeCancelled: true });
  const allHotelStays = fixtureOnly ? listPrototypeHotelStayFixtures(null, { includeClosed: true }) : listPrototypeHotelStays(null, { includeClosed: true });
  const allDaycareAttendances = fixtureOnly ? listPrototypeDaycareAttendanceFixtures(null, { includeClosed: true }) : listPrototypeDaycareAttendances(null, { includeClosed: true });
  const allCustomers = fixtureOnly ? listPrototypeCustomerFixtures(null) : listPrototypeCustomers(null);

  // Scope filter: matches business and optionally branch
  const inScope = (item: { businessId: string; branchId: string }) => {
    if (item.businessId !== context.businessId) return false;
    if (!isAllBranches && item.branchId !== context.branchId) return false;
    return true;
  };

  const scopedCharges = allCharges.filter(inScope);
  const scopedPayments = allPayments.filter(inScope);
  const scopedBookings = allBookings.filter(inScope);
  const scopedGroomingJobs = allGroomingJobs.filter(inScope);
  const scopedHotelStays = allHotelStays.filter(inScope);
  const scopedDaycareAttendances = allDaycareAttendances.filter(inScope);
  const scopedCustomers = allCustomers.filter((c) => c.businessId === context.businessId);

  // Context details
  const contextDetails = getDemoBusinessContextDetails(context, fixtureOnly);
  const businessContexts = listPrototypeBusinessContexts(context.businessId, fixtureOnly);
  const businessBranches = listPrototypeBusinessBranches(context.businessId, { includeInactive: true, fixtureOnly });
  const branchesById = new Map(businessBranches.map((branch) => [branch.branchId, branch]));
  // Historical activity retains its Branch metadata after deactivation, while
  // currently available capacity only comes from active Branch contexts.
  const capacityContexts = businessContexts.filter((branchContext) => isAllBranches || branchContext.branchId === context.branchId);
  const businessName = contextDetails.business?.name ?? "ร้าน";
  const branchName = isAllBranches ? `ทุกสาขา (${businessName})` : (contextDetails.branch?.name ?? "สาขาปัจจุบัน");

  // Charges by ID for allocation lookups
  const scopedChargesById = new Map(scopedCharges.map((c) => [c.chargeId, c]));
  const balances = scopedCharges.map((charge) => getPrototypeChargeBalance(charge, scopedPayments));

  // --- REVENUE CALCULATION ---
  // Payments recorded within [startDate, endDate]
  const paymentsInRange = scopedPayments.filter((p) => {
    const date = p.recordedAt.slice(0, 10);
    return date >= startDate && date <= endDate;
  });

  const revenue = paymentsInRange.reduce((sum, p) => sum + p.amount, 0);
  const paymentCount = paymentsInRange.length;

  const unpaidBalances = balances.filter((b) => b.status === "unpaid" || b.status === "partial");
  const unpaidBalance = unpaidBalances.reduce((sum, b) => sum + b.remaining, 0);
  const unpaidCount = balances.filter((b) => b.status === "unpaid").length;
  const partialCount = balances.filter((b) => b.status === "partial").length;

  // Module revenue allocation within date range
  let groomingRevenue = 0;
  let hotelRevenue = 0;
  let daycareRevenue = 0;

  for (const payment of paymentsInRange) {
    for (const alloc of payment.allocations) {
      const charge = scopedChargesById.get(alloc.chargeId);
      if (!charge) continue;
      if (charge.serviceModule === "grooming") groomingRevenue += alloc.amount;
      else if (charge.serviceModule === "hotel") hotelRevenue += alloc.amount;
      else if (charge.serviceModule === "daycare") daycareRevenue += alloc.amount;
    }
  }

  // --- BOOKINGS CALCULATION ---
  const bookingsInRange = scopedBookings.filter((b) => {
    if (b.timeModel === "date-range") {
      const bStart = b.start.slice(0, 10);
      const bEnd = b.end ? b.end.slice(0, 10) : bStart;
      return bStart <= endDate && bEnd >= startDate;
    }
    const bDate = b.start.slice(0, 10);
    return bDate >= startDate && bDate <= endDate;
  });

  const totalBookings = bookingsInRange.length;
  const confirmedBookings = bookingsInRange.filter((b) => b.status === "confirmed").length;
  const arrivedBookings = bookingsInRange.filter((b) => b.status === "arrived").length;
  const pendingBookings = bookingsInRange.filter((b) => b.status === "pending").length;
  const cancelledBookings = bookingsInRange.filter((b) => b.status === "cancelled").length;

  // --- COMPLETED SERVICES CALCULATION ---
  const groomingJobsInRange = scopedGroomingJobs.filter((job) => {
    const jobDate = job.scheduledStart.slice(0, 10);
    return jobDate >= startDate && jobDate <= endDate;
  });

  const completedGroomingJobs = groomingJobsInRange.filter((job) => job.status === "completed");
  const inProgressGroomingJobs = groomingJobsInRange.filter((job) =>
    ["checked-in", "waiting", "in-service", "ready-for-pickup"].includes(job.status)
  );

  const hotelStaysInRange = scopedHotelStays.filter((stay) => {
    return stay.scheduledCheckIn <= endDate && stay.scheduledCheckOut >= startDate;
  });

  const completedHotelStays = hotelStaysInRange.filter((stay) =>
    stay.status === "completed" || stay.status === "checked-out"
  );

  const checkInCount = hotelStaysInRange.filter((stay) =>
    stay.scheduledCheckIn >= startDate && stay.scheduledCheckIn <= endDate
  ).length;

  const checkOutCount = hotelStaysInRange.filter((stay) =>
    stay.scheduledCheckOut >= startDate && stay.scheduledCheckOut <= endDate
  ).length;

  const completedGrooming = completedGroomingJobs.length;
  const completedHotel = completedHotelStays.length;
  const daycareAttendancesInRange = scopedDaycareAttendances.filter((attendance) => attendance.attendanceDate >= startDate && attendance.attendanceDate <= endDate);
  const completedDaycareAttendances = daycareAttendancesInRange.filter((attendance) => attendance.status === "checked-out" || attendance.status === "completed");
  const activeDaycareAttendances = daycareAttendancesInRange.filter((attendance) => ["checked-in", "active", "ready-for-pickup"].includes(attendance.status));
  const completedDaycare = completedDaycareAttendances.length;
  const completedServices = completedGrooming + completedHotel + completedDaycare;

  // Popular Grooming Services
  const groomingServiceCounts = new Map<string, { label: string; count: number; revenue: number }>();
  for (const job of groomingJobsInRange) {
    const booking = scopedBookings.find((b) => b.bookingId === job.bookingId);
    const label = booking?.service.label ?? "อาบน้ำ / ตัดขน";
    const current = groomingServiceCounts.get(label) ?? { label, count: 0, revenue: 0 };
    current.count += 1;
    // Estimated / charge revenue
    const charge = scopedCharges.find((c) => c.serviceJobId === job.serviceJobId || c.bookingId === job.bookingId);
    if (charge) {
      current.revenue += charge.lineItems.reduce((s, line) => s + line.amount, 0);
    } else {
      current.revenue += booking?.estimate ?? 0;
    }
    groomingServiceCounts.set(label, current);
  }

  const popularGroomingServices: ReportPopularService[] = [...groomingServiceCounts.values()]
    .map((item) => ({ ...item, module: "grooming" as const }))
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

  // Hotel Occupancy
  // Calculate occupancy metrics
  const hotelRooms = capacityContexts.flatMap((branchContext) => getHotelRooms(branchContext, fixtureOnly));
  const totalCapacity = hotelRooms.reduce((sum, r) => sum + r.capacity, 0);

  // Active stays on demo date (or middle of range)
  const activeOccupiedStays = hotelStaysInRange.filter((stay) =>
    ["checked-in", "in-stay", "ready-for-checkout"].includes(stay.status)
  );
  const occupiedCount = activeOccupiedStays.length;
  const occupancyRate = totalCapacity > 0 ? Math.min(100, Math.round((occupiedCount / totalCapacity) * 100)) : 0;
  const availableCapacity = Math.max(0, totalCapacity - occupiedCount);

  // Daycare metrics
  const daycareBookings = bookingsInRange.filter((b) => b.serviceModule === "daycare");
  const daycareEnabled = capacityContexts.some((branchContext) => getEnabledBusinessModules(branchContext, fixtureOnly).includes("daycare"));
  const daycareZones = capacityContexts.flatMap((branchContext) => getPrototypeDaycareZones(branchContext, fixtureOnly));
  const daycareCapacity = daycareZones.reduce((sum, zone) => sum + zone.capacity, 0);
  const daycareOccupied = activeDaycareAttendances.length;

  // --- CUSTOMER METRICS ---
  // Customers involved in bookings or jobs within range
  const activeCustomerIds = new Set<string>();
  for (const b of bookingsInRange) activeCustomerIds.add(b.customer.id);
  for (const j of groomingJobsInRange) activeCustomerIds.add(j.customerId);
  for (const s of hotelStaysInRange) activeCustomerIds.add(s.customerId);
  for (const attendance of daycareAttendancesInRange) activeCustomerIds.add(attendance.customerId);

  const totalCustomers = activeCustomerIds.size;
  let newCustomers = 0;
  let returningCustomers = 0;

  for (const customerId of activeCustomerIds) {
    const customer = scopedCustomers.find((c) => c.id === customerId);
    // If customer was created within range, count as new, else returning
    if (customer && customer.createdAt.slice(0, 10) >= startDate) {
      newCustomers += 1;
    } else {
      returningCustomers += 1;
    }
  }

  // Top customers by activity
  const customerSpending = new Map<string, { customerId: string; customerName: string; petNames: Set<string>; visitCount: number; totalSpent: number }>();
  for (const b of bookingsInRange) {
    const current = customerSpending.get(b.customer.id) ?? {
      customerId: b.customer.id,
      customerName: b.customer.name,
      petNames: new Set<string>(),
      visitCount: 0,
      totalSpent: 0,
    };
    current.visitCount += 1;
    for (const pet of b.pets) current.petNames.add(pet.name);
    current.totalSpent += b.estimate ?? 0;
    customerSpending.set(b.customer.id, current);
  }

  const topCustomers: ReportTopCustomer[] = [...customerSpending.values()]
    .map((item) => ({
      customerId: item.customerId,
      customerName: item.customerName,
      petNames: [...item.petNames],
      visitCount: item.visitCount,
      totalSpent: item.totalSpent,
    }))
    .sort((a, b) => b.visitCount - a.visitCount || b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // --- OPERATIONAL INSIGHTS ---
  // Busiest Day
  const dayCounts = new Map<string, number>();
  for (const b of bookingsInRange) {
    const dateStr = b.start.slice(0, 10);
    try {
      const dayIndex = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
      const dayName = THAI_DAY_NAMES[dayIndex] ?? "ไม่ระบุ";
      dayCounts.set(dayName, (dayCounts.get(dayName) ?? 0) + 1);
    } catch {
      // ignore parsing error
    }
  }

  let busiestDay = { dayName: "อังคาร", count: 0 };
  for (const [dayName, count] of dayCounts.entries()) {
    if (count > busiestDay.count) {
      busiestDay = { dayName, count };
    }
  }

  // Peak Appointment Time
  const timeBuckets = new Map<string, number>([
    ["08:00 - 10:00", 0],
    ["10:00 - 12:00", 0],
    ["12:00 - 14:00", 0],
    ["14:00 - 16:00", 0],
    ["16:00 - 18:00", 0],
  ]);

  for (const b of bookingsInRange) {
    if (b.timeModel === "appointment" && b.start.length >= 16) {
      const time = b.start.slice(11, 16);
      if (time >= "08:00" && time < "10:00") timeBuckets.set("08:00 - 10:00", (timeBuckets.get("08:00 - 10:00") ?? 0) + 1);
      else if (time >= "10:00" && time < "12:00") timeBuckets.set("10:00 - 12:00", (timeBuckets.get("10:00 - 12:00") ?? 0) + 1);
      else if (time >= "12:00" && time < "14:00") timeBuckets.set("12:00 - 14:00", (timeBuckets.get("12:00 - 14:00") ?? 0) + 1);
      else if (time >= "14:00" && time < "16:00") timeBuckets.set("14:00 - 16:00", (timeBuckets.get("14:00 - 16:00") ?? 0) + 1);
      else if (time >= "16:00" && time <= "18:00") timeBuckets.set("16:00 - 18:00", (timeBuckets.get("16:00 - 18:00") ?? 0) + 1);
    }
  }

  let peakAppointmentTime = { timeSlot: "10:00 - 12:00", count: 0 };
  for (const [timeSlot, count] of timeBuckets.entries()) {
    if (count > peakAppointmentTime.count) {
      peakAppointmentTime = { timeSlot, count };
    }
  }

  // Delayed / Attention Jobs
  const delayedGroomingJobs = scopedGroomingJobs.filter((job) =>
    Boolean(job.scheduledEnd && job.scheduledEnd < GROOMING_DEMO_NOW && !["completed", "cancelled"].includes(job.status))
  ).length;

  const hotelAttentionCount = scopedHotelStays.reduce((total, stay) => {
    const overdueCare = stay.dailyCareTasks.filter((t) => t.scheduledDate <= endDate && t.state === "pending").length;
    const unresolvedIncidents = stay.incidentNotes.filter((i) => i.severity === "attention" && !i.resolvedAt).length;
    return total + overdueCare + unresolvedIncidents;
  }, 0);

  const workStatus = {
    completed: completedServices,
    pendingOrInProgress: inProgressGroomingJobs.length + activeOccupiedStays.length + activeDaycareAttendances.length,
    delayedOrAttention: delayedGroomingJobs + hotelAttentionCount + daycareAttendancesInRange.filter((attendance) => attendance.status === "booked").length,
  };

  const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0;
  const noShowStays = scopedHotelStays.filter((s) => s.status === "no-show").length;
  const cancelledJobs = scopedGroomingJobs.filter((j) => j.status === "cancelled").length;

  // --- RECENT SERVICES LIST ---
  const recentServices: ReportRecentServiceItem[] = [];

  for (const job of groomingJobsInRange) {
    const booking = scopedBookings.find((b) => b.bookingId === job.bookingId);
    const customer = scopedCustomers.find((c) => c.id === job.customerId);
    const pet = customer?.pets.find((p) => p.id === job.petId);
    const charge = scopedCharges.find((c) => c.serviceJobId === job.serviceJobId || c.bookingId === job.bookingId);
    const balance = charge ? getPrototypeChargeBalance(charge, scopedPayments) : null;
    const branchName = branchesById.get(job.branchId)?.name ?? job.branchId;

    recentServices.push({
      id: job.serviceJobId,
      date: job.scheduledStart.slice(0, 10),
      time: job.scheduledStart.slice(11, 16) || "09:00",
      customerName: customer?.name ?? booking?.customer.name ?? "ลูกค้า",
      petName: pet?.name ?? "น้อง",
      serviceLabel: booking?.service.label ?? "อาบน้ำ / ตัดขน",
      module: "grooming",
      branchId: job.branchId,
      branchName,
      statusLabel: SERVICE_JOB_STATUS_LABELS[job.status] ?? job.status,
      statusCode: job.status,
      amount: charge?.lineItems.reduce((s, line) => s + line.amount, 0) ?? booking?.estimate ?? 0,
      paymentStatus: balance?.status ?? "no-charge",
    });
  }

  for (const stay of hotelStaysInRange) {
    const booking = scopedBookings.find((b) => b.bookingId === stay.bookingId);
    const customer = scopedCustomers.find((c) => c.id === stay.customerId);
    const pet = customer?.pets.find((p) => p.id === stay.petId);
    const charge = scopedCharges.find((c) => c.hotelStayId === stay.hotelStayId || c.bookingId === stay.bookingId);
    const balance = charge ? getPrototypeChargeBalance(charge, scopedPayments) : null;
    const branchName = branchesById.get(stay.branchId)?.name ?? stay.branchId;

    recentServices.push({
      id: stay.hotelStayId,
      date: stay.scheduledCheckIn,
      time: "12:00",
      customerName: customer?.name ?? booking?.customer.name ?? "ลูกค้า",
      petName: pet?.name ?? "น้อง",
      serviceLabel: "เข้าพักโรงแรม",
      module: "hotel",
      branchId: stay.branchId,
      branchName,
      statusLabel: HOTEL_STAY_STATUS_LABELS[stay.status] ?? stay.status,
      statusCode: stay.status,
      amount: charge?.lineItems.reduce((s, line) => s + line.amount, 0) ?? booking?.estimate ?? 0,
      paymentStatus: balance?.status ?? "no-charge",
    });
  }

  for (const attendance of daycareAttendancesInRange) {
    const booking = scopedBookings.find((item) => item.bookingId === attendance.bookingId);
    const customer = scopedCustomers.find((item) => item.id === attendance.customerId);
    const pet = customer?.pets.find((item) => item.id === attendance.petId);
    const charge = scopedCharges.find((item) => item.daycareAttendanceId === attendance.daycareAttendanceId || item.bookingId === attendance.bookingId);
    const balance = charge ? getPrototypeChargeBalance(charge, scopedPayments) : null;
    const attendanceBranchName = branchesById.get(attendance.branchId)?.name ?? attendance.branchId;
    recentServices.push({
      id: attendance.daycareAttendanceId,
      date: attendance.attendanceDate,
      time: attendance.checkedInAt?.slice(11, 16) ?? "09:00",
      customerName: customer?.name ?? booking?.customer.name ?? "ลูกค้า",
      petName: pet?.name ?? booking?.pets.find((item) => item.id === attendance.petId)?.name ?? "น้อง",
      serviceLabel: booking?.service.label ?? "Daycare",
      module: "daycare",
      branchId: attendance.branchId,
      branchName: attendanceBranchName,
      statusLabel: DAYCARE_ATTENDANCE_STATUS_LABELS[attendance.status],
      statusCode: attendance.status,
      amount: charge?.lineItems.reduce((sum, line) => sum + line.amount, 0) ?? booking?.estimate ?? 0,
      paymentStatus: balance?.status ?? "no-charge",
    });
  }

  recentServices.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  // --- BRANCH COMPARISON (WHEN VIEWING ALL BRANCHES) ---
  const branchComparison: ReportBranchComparisonItem[] = [];
  if (isAllBranches) {
    for (const bCtx of businessBranches) {
      const bBookings = allBookings.filter((b) => b.businessId === context.businessId && b.branchId === bCtx.branchId);
      const bBookingsInRange = bBookings.filter((b) => {
        if (b.timeModel === "date-range") {
          const bStart = b.start.slice(0, 10);
          const bEnd = b.end ? b.end.slice(0, 10) : bStart;
          return bStart <= endDate && bEnd >= startDate;
        }
        const bDate = b.start.slice(0, 10);
        return bDate >= startDate && bDate <= endDate;
      });

      const bGroomingJobs = allGroomingJobs.filter((j) => j.businessId === context.businessId && j.branchId === bCtx.branchId);
      const bCompletedGrooming = bGroomingJobs.filter((j) =>
        j.status === "completed" && j.scheduledStart.slice(0, 10) >= startDate && j.scheduledStart.slice(0, 10) <= endDate
      ).length;

      const bHotelStays = allHotelStays.filter((s) => s.businessId === context.businessId && s.branchId === bCtx.branchId);
      const bCompletedHotel = bHotelStays.filter((s) =>
        (s.status === "completed" || s.status === "checked-out") && s.scheduledCheckOut >= startDate && s.scheduledCheckOut <= endDate
      ).length;
      const bCompletedDaycare = allDaycareAttendances.filter((attendance) => (
        attendance.businessId === context.businessId
        && attendance.branchId === bCtx.branchId
        && attendance.attendanceDate >= startDate
        && attendance.attendanceDate <= endDate
        && (attendance.status === "checked-out" || attendance.status === "completed")
      )).length;

      const bPayments = allPayments.filter((p) =>
        p.businessId === context.businessId && p.branchId === bCtx.branchId && p.recordedAt.slice(0, 10) >= startDate && p.recordedAt.slice(0, 10) <= endDate
      );
      const bRevenue = bPayments.reduce((sum, p) => sum + p.amount, 0);

      branchComparison.push({
        branchId: bCtx.branchId,
        branchName: bCtx.name,
        bookingCount: bBookingsInRange.length,
        completedCount: bCompletedGrooming + bCompletedHotel + bCompletedDaycare,
        revenue: bRevenue,
        enabledModules: [...bCtx.enabledModules],
      });
    }
  }

  return {
    dateRange: {
      preset: dateRangePreset,
      startDate,
      endDate,
    },
    branchScope,
    branchName,
    businessName,
    keyMetrics: {
      revenue,
      paymentCount,
      unpaidBalance,
      unpaidCount,
      partialCount,
      completedServices,
      completedGrooming,
      completedHotel,
      completedDaycare,
      totalBookings,
      confirmedBookings,
      arrivedBookings,
      pendingBookings,
      cancelledBookings,
      totalCustomers,
      newCustomers,
      returningCustomers,
    },
    serviceBreakdown: {
      grooming: {
        revenue: groomingRevenue,
        jobCount: groomingJobsInRange.length,
        completedCount: completedGrooming,
        inProgressCount: inProgressGroomingJobs.length,
        popularServices: popularGroomingServices,
      },
      hotel: {
        revenue: hotelRevenue,
        stayCount: hotelStaysInRange.length,
        checkInCount,
        checkOutCount,
        occupancyRate,
        capacity: totalCapacity,
        occupied: occupiedCount,
        available: availableCapacity,
      },
      daycare: {
        enabled: daycareEnabled,
        revenue: daycareRevenue,
        bookingCount: daycareBookings.length,
        attendanceCount: daycareAttendancesInRange.filter((attendance) => attendance.status !== "cancelled").length,
        activeCount: activeDaycareAttendances.length,
        readyForPickupCount: daycareAttendancesInRange.filter((attendance) => attendance.status === "ready-for-pickup").length,
        completedCount: completedDaycare,
        capacity: daycareCapacity,
        occupied: daycareOccupied,
        available: Math.max(0, daycareCapacity - daycareOccupied),
      },
    },
    operationalInsights: {
      busiestDay,
      peakAppointmentTime,
      hotelOccupancyRate: occupancyRate,
      cancellations: {
        totalCancelledBookings: cancelledBookings,
        cancellationRate,
        noShowStays,
        cancelledJobs,
      },
      workStatus,
    },
    customerInsights: {
      newCustomers,
      returningCustomers,
      topCustomers,
      recentServices: recentServices.slice(0, 10),
    },
    branchComparison,
  };
}
