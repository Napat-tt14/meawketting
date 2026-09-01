import type { ShareableScopeKey, TemporaryAccess } from "./sharingState";
import {
  addAccessEvent,
  evaluateTemporaryAccess,
  findTemporaryAccessByFallbackCode,
  getBusinessBranch,
  getBusinessFixture,
  readTemporaryAccess,
  updateTemporaryAccess,
} from "./sharingState";

export type DemoBusinessContext = {
  key: string;
  businessId: string;
  branchId: string;
  role: string;
  memberLabel: string;
};

export type BusinessServiceModule = "grooming" | "hotel" | "daycare";

export const BUSINESS_SERVICE_MODULES: Record<BusinessServiceModule, { label: string }> = {
  grooming: { label: "อาบน้ำ / ตัดขน" },
  hotel: { label: "โรงแรม" },
  daycare: { label: "Daycare" },
};

// BF-2 keeps the Booking model deliberately small and browser-local. These
// are operational demo references only; they do not mirror Pet Passport data
// or establish a Customer/Guardian authority relationship.
export const BOOKING_DEMO_DATE = "2026-08-18" as const;
// Fixed operational reference keeps prototype timing deterministic instead of
// treating the wall clock as a delayed workday during visual QA.
export const GROOMING_DEMO_NOW = "2026-08-18T12:20" as const;
// Hotel uses the same fixed operational day as Calendar and Grooming so
// browser-local fixture behaviour remains deterministic during visual QA.
export const HOTEL_DEMO_NOW = "2026-08-18T12:20" as const;

export type BookingTimeModel = "appointment" | "date-range" | "day";
export type BookingStatus = "pending" | "confirmed" | "arrived" | "cancelled";
export type BookingResourceKind = "groomer" | "grooming-station" | "dryer" | "hotel-room-type" | "daycare-zone";
export type BookingResourceCapacityMode = "exclusive" | "capacity";

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
  type: "created" | "status" | "room-assignment" | "room-move" | "care" | "note" | "incident" | "intake" | "dates";
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

export type UpdatePrototypeHotelStayDatesResult =
  | { ok: true; stay: PrototypeHotelStay }
  | { ok: false; reason: "missing" | "wrong-context" | "invalid-dates" | "unavailable" | "storage"; availability?: HotelRoomAvailability };

export type ServiceJobTransitionResult =
  | { ok: true; job: PrototypeServiceJob; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "invalid-transition" | "storage"; job?: PrototypeServiceJob };

export type ServiceJobResourceConflict = {
  resourceId: string;
  resourceLabel: string;
  message: string;
  conflictingJobIds: string[];
};

export type ServiceJobResourceAvailability = {
  available: boolean;
  conflicts: ServiceJobResourceConflict[];
};

export type BookingConflictCode =
  | "wrong-context"
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
  | "resource-conflict"
  | "capacity-conflict"
  | "duplicate-confirmation";

export type BookingConflictRecovery = "change-time" | "change-resource" | "change-date" | "return-to-edit";

export type BookingConflict = {
  code: BookingConflictCode;
  message: string;
  recovery: BookingConflictRecovery;
  resourceId?: string;
  resourceKind?: BookingResourceKind;
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

export type SavePrototypeBookingResult =
  | { ok: true; booking: PrototypeBooking; created: boolean; availability: BookingAvailabilityResult }
  | { ok: false; reason: "missing" | "duplicate" | "unavailable" | "storage"; availability: BookingAvailabilityResult };

export type CancelPrototypeBookingResult =
  | { ok: true; booking: PrototypeBooking; duplicate: boolean }
  | { ok: false; reason: "missing" | "wrong-context" | "storage" };

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
  revenueToday: number;
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
    email: "nalin.demo@example.test",
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
    email: "lee.demo@example.test",
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
  { id: "ari-groomer-pim", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "grooming", kind: "groomer", label: "ช่างพิม", capacityMode: "exclusive", capacity: 1, serviceIds: ["ari-grooming-bath-groom"] },
  { id: "ari-groomer-joy", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "grooming", kind: "groomer", label: "ช่างจอย", capacityMode: "exclusive", capacity: 1, serviceIds: ["ari-grooming-bath-groom"] },
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
  { id: "thonglor-groomer-nok", businessId: "business-whisker-rest", branchId: "whisker-thonglor", module: "grooming", kind: "groomer", label: "ช่างนก", capacityMode: "exclusive", capacity: 1, serviceIds: ["thonglor-grooming-bath"] },
  { id: "thonglor-station-a", businessId: "business-whisker-rest", branchId: "whisker-thonglor", module: "grooming", kind: "grooming-station", label: "จุดบริการ A", capacityMode: "exclusive", capacity: 1, serviceIds: ["thonglor-grooming-bath"] },
  { id: "thonglor-dryer-1", businessId: "business-whisker-rest", branchId: "whisker-thonglor", module: "grooming", kind: "dryer", label: "เครื่องเป่า 1", capacityMode: "exclusive", capacity: 1, serviceIds: ["thonglor-grooming-bath"] },
  { id: "onnut-hotel-capacity", businessId: "business-paw-partner", branchId: "partner-onnut", module: "hotel", kind: "hotel-room-type", label: "พื้นที่พักตามเงื่อนไข", capacityMode: "capacity", capacity: 2, serviceIds: ["onnut-hotel-stay"], hotelRole: "planning-capacity" },
  { id: "onnut-hotel-room-r01", businessId: "business-paw-partner", branchId: "partner-onnut", module: "hotel", kind: "hotel-room-type", label: "ห้อง R01", capacityMode: "capacity", capacity: 1, serviceIds: ["onnut-hotel-stay"], hotelRole: "room" },
  { id: "onnut-hotel-zone-quiet", businessId: "business-paw-partner", branchId: "partner-onnut", module: "hotel", kind: "hotel-room-type", label: "โซนสงบ R02", capacityMode: "capacity", capacity: 1, serviceIds: ["onnut-hotel-stay"], hotelRole: "zone" },
  { id: "onnut-daycare-social", businessId: "business-paw-partner", branchId: "partner-onnut", module: "daycare", kind: "daycare-zone", label: "โซนสังคม", capacityMode: "capacity", capacity: 2, serviceIds: ["onnut-daycare-full-day"] },
  { id: "onnut-daycare-quiet", businessId: "business-paw-partner", branchId: "partner-onnut", module: "daycare", kind: "daycare-zone", label: "โซนสงบ", capacityMode: "capacity", capacity: 6, serviceIds: ["onnut-daycare-full-day"] },
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
      { id: "hotel-care-luna-breakfast", kind: "meal", label: "อาหารเช้า", scheduledDate: BOOKING_DEMO_DATE, scheduledTime: "08:00", state: "completed", completedAt: "2026-08-18T08:06:00.000Z", completedBy: "พนักงานรับเข้า" },
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
      { id: "hotel-care-luna-clean", kind: "cleaning", label: "ทำความสะอาดห้อง", scheduledDate: BOOKING_DEMO_DATE, scheduledTime: "16:00", state: "pending", completedAt: null, completedBy: null },
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
      { id: "hotel-care-biscuit-check", kind: "check", label: "ตรวจความพร้อมรับกลับ", scheduledDate: BOOKING_DEMO_DATE, scheduledTime: "11:30", state: "pending", completedAt: null, completedBy: null },
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

const DEMO_BUSINESS_HOME: Record<string, BusinessHomeDemo> = {
  "whisker-ari-frontdesk": {
    today: { waitingIntake: 3 },
    attention: [
      { id: "approval", tone: "waiting", title: "รอเจ้าของอนุมัติข้อมูล 2 รายการ", detail: "ต้องได้รับคำตอบก่อนยืนยันรับเข้า" },
    ],
    moduleSummaries: {},
    revenueToday: 12450,
  },
  "whisker-thonglor-frontdesk": {
    today: { waitingIntake: 2 },
    attention: [
      { id: "approval", tone: "waiting", title: "รอเจ้าของอนุมัติข้อมูล 1 รายการ", detail: "ต้องได้รับคำตอบก่อนยืนยันรับเข้า" },
    ],
    moduleSummaries: {},
    revenueToday: 7200,
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
    revenueToday: 9800,
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
  status: "submitted-prototype";
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
  bookings: Record<string, PrototypeBooking>;
  serviceJobs: Record<string, PrototypeServiceJob>;
  hotelStays: Record<string, PrototypeHotelStay>;
  customers: Record<string, PrototypeCustomer>;
};

export type QrContractType = "quick-passport" | "public-safety" | "temporary-business" | "unknown";

export type CheckInResult =
  | { ok: true; record: BusinessIntakeRecord; duplicate: boolean }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "revoked" | "wrong-business" | "changed" };

const emptyStore = (): BusinessStore => ({
  activeContextKey: DEFAULT_BUSINESS_CONTEXT_KEY,
  intakes: {},
  bookings: {},
  serviceJobs: {},
  hotelStays: {},
  customers: {},
});

function readStore(): BusinessStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.sessionStorage.getItem(BUSINESS_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<BusinessStore>;
    return {
      activeContextKey: typeof parsed.activeContextKey === "string" ? parsed.activeContextKey : DEFAULT_BUSINESS_CONTEXT_KEY,
      intakes: parsed.intakes && typeof parsed.intakes === "object" && !Array.isArray(parsed.intakes) ? parsed.intakes : {},
      // BF-1 stores only activeContextKey/intakes. Defaulting this field keeps
      // existing same-tab Intake state intact while BF-2 data is introduced.
      bookings: parsed.bookings && typeof parsed.bookings === "object" && !Array.isArray(parsed.bookings) ? parsed.bookings : {},
      // BF-5 extends the same local Business envelope. Existing BF-1–BF-4
      // tabs keep their state when no Service Job slice exists yet.
      serviceJobs: parsed.serviceJobs && typeof parsed.serviceJobs === "object" && !Array.isArray(parsed.serviceJobs) ? parsed.serviceJobs : {},
      // BF-6 uses the same envelope for Hotel execution. Existing browser
      // tabs remain compatible until their first Hotel mutation.
      hotelStays: parsed.hotelStays && typeof parsed.hotelStays === "object" && !Array.isArray(parsed.hotelStays) ? parsed.hotelStays : {},
      // BF-3 preserves the same storage envelope so a Customer/Pet relationship
      // can be shared with Bookings without introducing a disconnected store.
      customers: parsed.customers && typeof parsed.customers === "object" && !Array.isArray(parsed.customers) ? parsed.customers : {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: BusinessStore) {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent("meawketting:business-state"));
    return true;
  } catch {
    return false;
  }
}

export function getDemoBusinessContext(contextKey: string | null | undefined) {
  return DEMO_BUSINESS_CONTEXTS.find((context) => context.key === contextKey) ?? DEMO_BUSINESS_CONTEXTS[0];
}

export function getDemoBusinessContextForBranch(businessId: string | null | undefined, branchId: string | null | undefined) {
  return DEMO_BUSINESS_CONTEXTS.find((context) => context.businessId === businessId && context.branchId === branchId)
    ?? DEMO_BUSINESS_CONTEXTS[0];
}

export function getDemoBusinessContextDetails(context: DemoBusinessContext) {
  const business = getBusinessFixture(context.businessId);
  const branch = getBusinessBranch(business, context.branchId);
  const withoutDemoSuffix = (value: string) => value.replace(/\s*(?:\(Demo\)|Demo)$/i, "").trim();
  return {
    context,
    business: business ? { ...business, name: withoutDemoSuffix(business.name) } : null,
    branch: branch ? { ...branch, name: withoutDemoSuffix(branch.name) } : null,
  };
}

export function getEnabledBusinessModules(context: DemoBusinessContext) {
  return DEMO_ENABLED_MODULES[context.key] ?? [];
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

function isPetPassportConnectionState(value: unknown): value is PetPassportConnectionState {
  return value === "linked-active" || value === "linked-no-access" || value === "unlinked" || value === "access-expired";
}

function isBusinessPetDataSource(value: unknown): value is BusinessPetDataSource {
  return value === "customer-reported" || value === "business-local";
}

function isBusinessLocalPetRelationship(value: unknown): value is BusinessLocalPetRelationship {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const pet = value as Partial<BusinessLocalPetRelationship>;
  return typeof pet.id === "string"
    && typeof pet.name === "string"
    && (pet.species === "cat" || pet.species === "dog")
    && isPetPassportConnectionState(pet.passportConnection)
    && isBusinessPetDataSource(pet.dataSource)
    && typeof pet.businessNote === "string"
    && (typeof pet.passportSlug === "string" || pet.passportSlug === null);
}

function isPrototypeCustomer(value: unknown): value is PrototypeCustomer {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const customer = value as Partial<PrototypeCustomer>;
  return typeof customer.id === "string"
    && typeof customer.businessId === "string"
    && typeof customer.name === "string"
    && (typeof customer.phone === "string" || customer.phone === null)
    && (typeof customer.email === "string" || customer.email === null)
    && typeof customer.businessNote === "string"
    && Array.isArray(customer.tags)
    && customer.tags.every((tag) => typeof tag === "string")
    && Array.isArray(customer.pets)
    && customer.pets.every(isBusinessLocalPetRelationship)
    && typeof customer.createdAt === "string"
    && typeof customer.updatedAt === "string";
}

function mergedPrototypeCustomers(store: BusinessStore) {
  const customers = new Map<string, PrototypeCustomer>();
  for (const fixture of DEMO_CUSTOMER_FIXTURES) customers.set(fixture.id, cloneCustomer(fixture));
  for (const stored of Object.values(store.customers)) {
    if (isPrototypeCustomer(stored)) customers.set(stored.id, cloneCustomer(stored));
  }
  return [...customers.values()];
}

function sortPrototypeCustomers(customers: readonly PrototypeCustomer[], context?: DemoBusinessContext | null) {
  return customers
    .filter((customer) => !context || customer.businessId === context.businessId)
    .sort((first, second) => first.name.localeCompare(second.name, "th") || first.id.localeCompare(second.id));
}

export function listPrototypeCustomerFixtures(context?: DemoBusinessContext | null) {
  return sortPrototypeCustomers(DEMO_CUSTOMER_FIXTURES.map(cloneCustomer), context);
}

export function listPrototypeCustomers(context?: DemoBusinessContext | null) {
  return sortPrototypeCustomers(mergedPrototypeCustomers(readStore()), context);
}

export function readPrototypeCustomerFixture(customerId: string) {
  return listPrototypeCustomerFixtures(null).find((customer) => customer.id === customerId) ?? null;
}

export function readPrototypeCustomer(customerId: string) {
  return listPrototypeCustomers(null).find((customer) => customer.id === customerId) ?? null;
}

function normalizedContactValue(value: string | null | undefined) {
  return (value ?? "").replace(/[^0-9]/g, "");
}

export function findPotentialPrototypeCustomerDuplicate(
  businessId: string,
  phone: string | null | undefined,
  excludeCustomerId?: string,
) {
  const normalizedPhone = normalizedContactValue(phone);
  if (!normalizedPhone) return null;
  return listPrototypeCustomers(null).find((customer) => (
    customer.businessId === businessId
    && customer.id !== excludeCustomerId
    && normalizedContactValue(customer.phone) === normalizedPhone
  )) ?? null;
}

export type PrototypeCustomerDraft = {
  customerId?: string;
  businessId: string;
  name: string;
  phone: string;
  email: string;
  businessNote: string;
  tags?: readonly string[];
};

export type SavePrototypeCustomerResult =
  | { ok: true; customer: PrototypeCustomer; created: boolean; potentialDuplicate: PrototypeCustomer | null }
  | { ok: false; reason: "missing" | "invalid" | "duplicate" | "storage"; duplicate?: PrototypeCustomer };

function generatedCustomerId() {
  return `prototype-customer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizedTags(tags: readonly string[] | undefined) {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))].slice(0, 8);
}

export function savePrototypeCustomer(
  draft: PrototypeCustomerDraft,
  options: { allowPotentialDuplicate?: boolean } = {},
): SavePrototypeCustomerResult {
  const name = draft.name.trim();
  if (!name || !draft.businessId) return { ok: false, reason: "invalid" };

  const store = readStore();
  const existing = draft.customerId
    ? mergedPrototypeCustomers(store).find((customer) => customer.id === draft.customerId) ?? null
    : null;
  if (draft.customerId && (!existing || existing.businessId !== draft.businessId)) return { ok: false, reason: "missing" };

  const duplicate = findPotentialPrototypeCustomerDuplicate(draft.businessId, draft.phone, draft.customerId);
  if (!existing && duplicate && !options.allowPotentialDuplicate) {
    return { ok: false, reason: "duplicate", duplicate };
  }

  const now = new Date().toISOString();
  const customer: PrototypeCustomer = {
    id: existing?.id ?? generatedCustomerId(),
    businessId: draft.businessId,
    name,
    phone: draft.phone.trim() || null,
    email: draft.email.trim() || null,
    businessNote: draft.businessNote.trim(),
    tags: normalizedTags(draft.tags ?? existing?.tags),
    pets: existing?.pets.map(cloneCustomerPet) ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  store.customers[customer.id] = customer;
  if (!writeStore(store)) return { ok: false, reason: "storage" };
  return { ok: true, customer: cloneCustomer(customer), created: !existing, potentialDuplicate: duplicate };
}

export type PrototypePetRelationshipDraft = {
  customerId: string;
  name: string;
  species: "cat" | "dog";
  businessNote: string;
};

export type AddPrototypePetRelationshipResult =
  | { ok: true; customer: PrototypeCustomer; pet: BusinessLocalPetRelationship }
  | { ok: false; reason: "missing" | "invalid" | "storage" };

function generatedPetRelationshipId() {
  return `prototype-pet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function addPrototypePetRelationship(draft: PrototypePetRelationshipDraft): AddPrototypePetRelationshipResult {
  const name = draft.name.trim();
  if (!name) return { ok: false, reason: "invalid" };
  const store = readStore();
  const customer = mergedPrototypeCustomers(store).find((item) => item.id === draft.customerId) ?? null;
  if (!customer) return { ok: false, reason: "missing" };

  const pet: BusinessLocalPetRelationship = {
    id: generatedPetRelationshipId(),
    name,
    species: draft.species,
    passportConnection: "unlinked",
    dataSource: "business-local",
    businessNote: draft.businessNote.trim(),
    passportSlug: null,
  };
  const updated: PrototypeCustomer = {
    ...customer,
    pets: [...customer.pets.map(cloneCustomerPet), pet],
    updatedAt: new Date().toISOString(),
  };
  store.customers[updated.id] = updated;
  if (!writeStore(store)) return { ok: false, reason: "storage" };
  return { ok: true, customer: cloneCustomer(updated), pet: cloneCustomerPet(pet) };
}

export function updatePrototypeCustomerTags(customerId: string, tags: readonly string[]) {
  const customer = readPrototypeCustomer(customerId);
  if (!customer) return null;
  const result = savePrototypeCustomer({
    customerId: customer.id,
    businessId: customer.businessId,
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    businessNote: customer.businessNote,
    tags,
  });
  return result.ok ? result.customer : null;
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

export function getBookingServices(context: DemoBusinessContext) {
  const enabledModules = getEnabledBusinessModules(context);
  return DEMO_BOOKING_SERVICES.filter((service) => (
    service.businessId === context.businessId
    && service.branchId === context.branchId
    && enabledModules.includes(service.module)
  ));
}

export function getBookingResources(context: DemoBusinessContext, serviceId?: string) {
  return DEMO_BOOKING_RESOURCES.filter((resource) => (
    resource.businessId === context.businessId
    && resource.branchId === context.branchId
    && (!serviceId || resource.serviceIds.includes(serviceId))
  ));
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

function isBookingTimeModel(value: unknown): value is BookingTimeModel {
  return value === "appointment" || value === "date-range" || value === "day";
}

function isBookingStatus(value: unknown): value is BookingStatus {
  return value === "pending" || value === "confirmed" || value === "arrived" || value === "cancelled";
}

function isPrototypeBooking(value: unknown): value is PrototypeBooking {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const booking = value as Partial<PrototypeBooking>;
  return typeof booking.bookingId === "string"
    && !!booking.customer
    && typeof booking.customer.id === "string"
    && typeof booking.customer.name === "string"
    && Array.isArray(booking.pets)
    && typeof booking.businessId === "string"
    && typeof booking.branchId === "string"
    && (booking.serviceModule === "grooming" || booking.serviceModule === "hotel" || booking.serviceModule === "daycare")
    && !!booking.service
    && typeof booking.service.id === "string"
    && typeof booking.service.label === "string"
    && isBookingTimeModel(booking.timeModel)
    && typeof booking.start === "string"
    && (typeof booking.end === "string" || booking.end === null)
    && Array.isArray(booking.requiredResources)
    && Array.isArray(booking.assignedResources)
    && isBookingStatus(booking.status)
    && (typeof booking.estimate === "number" || booking.estimate === null)
    && typeof booking.notes === "string"
    && typeof booking.createdAt === "string"
    && typeof booking.updatedAt === "string"
    && (typeof booking.cancelledAt === "string" || booking.cancelledAt === null);
}

function mergedPrototypeBookings(store: BusinessStore) {
  const bookings = new Map<string, PrototypeBooking>();
  for (const fixture of DEMO_BOOKING_FIXTURES) bookings.set(fixture.bookingId, cloneBooking(fixture));
  for (const stored of Object.values(store.bookings)) {
    if (isPrototypeBooking(stored)) bookings.set(stored.bookingId, cloneBooking(stored));
  }
  return [...bookings.values()];
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

// Client surfaces render this deterministic fixture list for their initial
// server/client pass, then hydrate browser-local additions in an effect.
// That prevents a previously saved local booking from causing an SSR mismatch.
export function listPrototypeBookingFixtures(context?: DemoBusinessContext | null, options: ListPrototypeBookingsOptions = {}) {
  return filterAndSortPrototypeBookings(DEMO_BOOKING_FIXTURES.map(cloneBooking), context, options);
}

export function listPrototypeBookings(context?: DemoBusinessContext | null, options: ListPrototypeBookingsOptions = {}) {
  return filterAndSortPrototypeBookings(mergedPrototypeBookings(readStore()), context, options);
}

export function readPrototypeBooking(bookingId: string) {
  return listPrototypeBookings(null).find((booking) => booking.bookingId === bookingId) ?? null;
}

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

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
  if (draft.estimate !== null && (!Number.isFinite(draft.estimate) || draft.estimate < 0)) {
    conflicts.push(conflict("invalid-estimate", "ราคาประมาณต้องเป็นจำนวนเงินที่ถูกต้อง", "return-to-edit"));
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
  return evaluateBookingAvailability(draft, context, listPrototypeBookings(null));
}

function generatedBookingId() {
  return `prototype-booking-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function savePrototypeBooking(draft: PrototypeBookingDraft, context: DemoBusinessContext): SavePrototypeBookingResult {
  const store = readStore();
  const allBookings = mergedPrototypeBookings(store);
  const availability = evaluateBookingAvailability(draft, context, allBookings);
  const existing = draft.bookingId ? allBookings.find((booking) => booking.bookingId === draft.bookingId) ?? null : null;
  if (draft.bookingId && !existing) return { ok: false, reason: "missing", availability };
  if (!availability.available || !availability.service) {
    return {
      ok: false,
      reason: availability.conflicts.some((item) => item.code === "duplicate-confirmation") ? "duplicate" : "unavailable",
      availability,
    };
  }

  const now = new Date().toISOString();
  const booking: PrototypeBooking = {
    bookingId: existing?.bookingId ?? generatedBookingId(),
    customer: { ...draft.customer! },
    pets: draft.pets.map((pet) => ({ ...pet })),
    businessId: context.businessId,
    branchId: context.branchId,
    serviceModule: availability.service.module,
    service: { id: availability.service.id, label: availability.service.label },
    timeModel: availability.service.timeModel,
    start: draft.start,
    end: availability.service.timeModel === "day" ? null : draft.end,
    requiredResources: [...availability.service.requiredResourceKinds],
    assignedResources: [...new Set(draft.assignedResourceIds.filter(Boolean))],
    status: draft.status,
    estimate: draft.estimate,
    notes: draft.notes.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    cancelledAt: draft.status === "cancelled" ? existing?.cancelledAt ?? now : null,
  };
  // Calendar remains the planning source, but a direct date resize must not
  // silently create a conflict for a room that has already been assigned to
  // the related Hotel Stay.
  if (booking.serviceModule === "hotel" && existing) {
    const linkedStays = mergedPrototypeHotelStays(store).filter((stay) => stay.bookingId === booking.bookingId && hotelStayIsOpen(stay));
    for (const linkedStay of linkedStays) {
      const roomAvailability = dateChangeAvailability(store, linkedStay, booking.start, booking.end ?? addBusinessCalendarDays(booking.start, 1), context);
      if (!roomAvailability.available) {
        return {
          ok: false,
          reason: "unavailable",
          availability: {
            ...availability,
            available: false,
            conflicts: [...availability.conflicts, ...roomAvailability.conflicts.map((item) => conflict(
              "resource-conflict",
              item.message,
              "change-date",
              { resourceId: item.roomId, bookingIds: item.stayIds, dates: item.dates },
            ))],
          },
        };
      }
    }
  }
  store.bookings[booking.bookingId] = booking;
  synchronizePrototypeGroomingJobsForBooking(store, booking, now);
  synchronizePrototypeHotelStaysForBooking(store, booking, now);
  if (!writeStore(store)) return { ok: false, reason: "storage", availability };
  return { ok: true, booking: cloneBooking(booking), created: !existing, availability };
}

export function cancelPrototypeBooking(
  bookingId: string,
  context?: DemoBusinessContext | null,
): CancelPrototypeBookingResult {
  const store = readStore();
  const booking = mergedPrototypeBookings(store).find((item) => item.bookingId === bookingId) ?? null;
  if (!booking) return { ok: false, reason: "missing" };
  if (context && (booking.businessId !== context.businessId || booking.branchId !== context.branchId)) {
    return { ok: false, reason: "wrong-context" };
  }
  if (booking.status === "cancelled") return { ok: true, booking, duplicate: true };

  const now = new Date().toISOString();
  const cancelled: PrototypeBooking = {
    ...booking,
    status: "cancelled",
    cancelledAt: now,
    updatedAt: now,
  };
  store.bookings[cancelled.bookingId] = cancelled;
  synchronizePrototypeGroomingJobsForBooking(store, cancelled, now);
  synchronizePrototypeHotelStaysForBooking(store, cancelled, now);
  if (!writeStore(store)) return { ok: false, reason: "storage" };
  return { ok: true, booking: cloneBooking(cancelled), duplicate: false };
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
  const jobs = new Map<string, PrototypeServiceJob>();
  for (const fixture of DEMO_GROOMING_SERVICE_JOB_FIXTURES) jobs.set(fixture.serviceJobId, clonePrototypeServiceJob(fixture));
  for (const stored of Object.values(store.serviceJobs)) {
    if (isPrototypeServiceJob(stored)) jobs.set(stored.serviceJobId, clonePrototypeServiceJob(stored));
  }

  // A Grooming Booking always projects at least one Pet-specific operational
  // job. Saving a Booking persists it; this projection also keeps old BF-2
  // local bookings readable after the additive BF-5 migration.
  for (const booking of mergedPrototypeBookings(store)) {
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

export function summarizeGroomingServiceJobs(jobs: readonly PrototypeServiceJob[], date = BOOKING_DEMO_DATE): GroomingServiceJobSummary {
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
  date = BOOKING_DEMO_DATE,
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
  store.serviceJobs[next.serviceJobId] = next;
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
  if (!currentInterval) return { available: false, conflicts: [{ resourceId: "", resourceLabel: "เวลา", message: "ช่วงเวลางานนี้ไม่พร้อมตรวจทรัพยากร", conflictingJobIds: [] }] };

  for (const resourceId of selectedIds) {
    const resource = resourceById.get(resourceId);
    if (!resource) {
      conflicts.push({ resourceId, resourceLabel: "ทรัพยากร", message: "ทรัพยากรนี้ไม่อยู่ในสาขาหรือบริการปัจจุบัน", conflictingJobIds: [] });
      continue;
    }
    const overlapping = sourceJobs.filter((candidate) => {
      if (candidate.serviceJobId === job.serviceJobId || candidate.status === "cancelled") return false;
      if (!candidate.assignedResourceIds.includes(resourceId)) return false;
      const candidateInterval = getBookingInterval("appointment", candidate.scheduledStart, candidate.scheduledEnd);
      return Boolean(candidateInterval && bookingIntervalsOverlap(currentInterval, candidateInterval));
    });
    const exceedsCapacity = resource.capacityMode === "exclusive" ? overlapping.length > 0 : overlapping.length + 1 > resource.capacity;
    if (exceedsCapacity) {
      conflicts.push({
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
    additionalPrice: Math.round(input.additionalPrice),
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
    && (item.type === "created" || item.type === "status" || item.type === "room-assignment" || item.type === "room-move" || item.type === "care" || item.type === "note" || item.type === "incident" || item.type === "intake" || item.type === "dates")
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
    { id: `${hotelStayId}-care-breakfast-${date}`, kind: "meal", label: "อาหารเช้า", scheduledDate: date, scheduledTime: "08:00", state: "pending", completedAt: null, completedBy: null },
    { id: `${hotelStayId}-care-water-${date}`, kind: "water", label: "ตรวจน้ำ", scheduledDate: date, scheduledTime: "12:00", state: "pending", completedAt: null, completedBy: null },
    { id: `${hotelStayId}-care-activity-${date}`, kind: "activity", label: "เดินเล่น / กิจกรรม", scheduledDate: date, scheduledTime: "15:00", state: "pending", completedAt: null, completedBy: null },
    { id: `${hotelStayId}-care-evening-${date}`, kind: "meal", label: "อาหารเย็น", scheduledDate: date, scheduledTime: "18:00", state: "pending", completedAt: null, completedBy: null },
    { id: `${hotelStayId}-care-note-${date}`, kind: "note", label: "บันทึกอัปเดตประจำวัน", scheduledDate: date, scheduledTime: "19:00", state: "pending", completedAt: null, completedBy: null },
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
  const stays = new Map<string, PrototypeHotelStay>();
  for (const fixture of DEMO_HOTEL_STAY_FIXTURES) stays.set(fixture.hotelStayId, clonePrototypeHotelStay(fixture));
  for (const stored of Object.values(store.hotelStays)) {
    if (isPrototypeHotelStay(stored)) stays.set(stored.hotelStayId, clonePrototypeHotelStay(stored));
  }

  // New or retained Hotel Bookings project a per-Pet execution record even
  // before a room is chosen. This deliberately keeps the two lifecycles
  // linked without turning them into one status field.
  for (const booking of mergedPrototypeBookings(store)) {
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

export function findPrototypeHotelStayForBooking(bookingId: string, petId?: string | null) {
  return listPrototypeHotelStays(null, { includeClosed: true }).find((stay) => (
    stay.bookingId === bookingId && (!petId || stay.petId === petId)
  )) ?? null;
}

export function getHotelRooms(context: DemoBusinessContext) {
  return getBookingResources(context)
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
  date = BOOKING_DEMO_DATE,
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
  const rooms = getHotelRooms(context);
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
  date = BOOKING_DEMO_DATE,
  fixtureOnly = false,
) {
  const stays = fixtureOnly
    ? listPrototypeHotelStayFixtures(context, { includeClosed: true })
    : listPrototypeHotelStays(context, { includeClosed: true });
  return summarizePrototypeHotelStays(stays, context, date);
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

export function updatePrototypeHotelStayDates(
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
  const booking = mergedPrototypeBookings(store).find((item) => item.bookingId === stay.bookingId) ?? null;
  if (!booking || booking.serviceModule !== "hotel") return { ok: false, reason: "missing" };
  const result = savePrototypeBooking({
    bookingId: booking.bookingId,
    businessId: booking.businessId,
    branchId: booking.branchId,
    serviceModule: booking.serviceModule,
    serviceId: booking.service.id,
    timeModel: booking.timeModel,
    customer: { ...booking.customer },
    pets: booking.pets.map((pet) => ({ ...pet })),
    start: scheduledCheckIn,
    end: scheduledCheckOut,
    assignedResourceIds: [...booking.assignedResources],
    notes: booking.notes,
    estimate: booking.estimate,
    status: booking.status,
  }, context);
  if (!result.ok) return { ok: false, reason: result.reason === "storage" ? "storage" : "unavailable", availability: roomAvailability };
  const updated = readPrototypeHotelStay(hotelStayId);
  return updated ? { ok: true, stay: updated } : { ok: false, reason: "storage" };
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

export function getBusinessHomeDemo(context: DemoBusinessContext) {
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
  if (/\/temporary-access\//i.test(normalized) || upper.startsWith("DEMO-TEMP-")) return "temporary-business";
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
  target: { hotelStayId?: string | null } = {},
) {
  const store = readStore();
  const requestedHotelStayId = target.hotelStayId ?? null;
  const existing = Object.values(store.intakes).find((record) => record.accessId === access.id && (!requestedHotelStayId || record.hotelStayId === requestedHotelStayId));
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

  const now = new Date().toISOString();
  const suffix = access.id.replace(/^prototype-access-/, "").replace(/[^a-z0-9-]/gi, "").slice(-32) || Date.now().toString(36);
  const record: BusinessIntakeRecord = {
    id: `prototype-intake-${suffix}`,
    accessId: access.id,
    businessId: context.businessId,
    branchId: context.branchId,
    customerId: knownRelationship?.customer.id ?? null,
    petRelationshipId: knownRelationship?.pet.id ?? null,
    serviceJobId: null,
    hotelStayId: hotelStay?.hotelStayId ?? null,
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

  // A Hotel target is passed explicitly from its Arrival card. Intake never
  // guesses a Stay from free-text purpose or the first matching Pet.
  if (record.hotelStayId) {
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
