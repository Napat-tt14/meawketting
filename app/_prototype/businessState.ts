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
  // remains a future Hotel operations decision and is not locked by a Booking.
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

const DEMO_BUSINESS_HOME: Record<string, BusinessHomeDemo> = {
  "whisker-ari-frontdesk": {
    today: { waitingIntake: 3 },
    attention: [
      { id: "approval", tone: "waiting", title: "รอเจ้าของอนุมัติข้อมูล 2 รายการ", detail: "ต้องได้รับคำตอบก่อนยืนยันรับเข้า" },
    ],
    moduleSummaries: {
      hotel: { value: "12 / 18 ห้องมีผู้เข้าพัก", detail: "ภาพรวมการเข้าพัก" },
    },
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
      hotel: { value: "9 / 14 ห้องมีผู้เข้าพัก", detail: "ภาพรวมการเข้าพัก" },
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
  store.bookings[booking.bookingId] = booking;
  synchronizePrototypeGroomingJobsForBooking(store, booking, now);
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
) {
  const store = readStore();
  const existing = Object.values(store.intakes).find((record) => record.accessId === access.id);
  if (existing) return existing;

  // The scanner has already passed recipient, Branch, scope, expiry, and
  // consent checks before this function runs. Reuse an explicit local match
  // only; an unknown QR never creates a permanent Customer relationship.
  const knownRelationship = findKnownBusinessCustomerPetByPassportSlug(context.businessId, access.petSlug);

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

  // Scan/Intake does not infer a service from a free-text purpose. It only
  // attaches a known Grooming Job when Business, Branch, Customer, Pet, and
  // an already-scheduled booked Job all match the shared records.
  if (getEnabledBusinessModules(context).includes("grooming") && record.customerId && record.petRelationshipId) {
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
