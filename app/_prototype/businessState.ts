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
    inService: number;
    readyForPickup: number;
    newMessages: number;
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
    role: "พนักงานรับเข้า (ตัวอย่าง)",
    memberLabel: "พนักงานรับเข้า (ตัวอย่าง)",
  },
  {
    key: "whisker-thonglor-frontdesk",
    businessId: "business-whisker-rest",
    branchId: "whisker-thonglor",
    role: "พนักงานหน้าร้าน (ตัวอย่าง)",
    memberLabel: "พนักงานหน้าร้าน (ตัวอย่าง)",
  },
  {
    key: "paw-partner-onnut",
    businessId: "business-paw-partner",
    branchId: "partner-onnut",
    role: "ผู้ประสานงานดูแล (ตัวอย่าง)",
    memberLabel: "ผู้ประสานงานดูแล (ตัวอย่าง)",
  },
] as const;

const DEMO_ENABLED_MODULES: Record<string, readonly BusinessServiceModule[]> = {
  "whisker-ari-frontdesk": ["grooming", "hotel"],
  "whisker-thonglor-frontdesk": ["grooming"],
  "paw-partner-onnut": ["hotel", "daycare"],
};

// These are intentionally small relationship references for the Booking
// prototype. They are not a Customer CRM and do not read Consumer Passport
// fixtures or guardian-only fields.
export const DEMO_BOOKING_CONTACTS: readonly DemoBookingContact[] = [
  {
    id: "booking-contact-nalin",
    name: "คุณนลิน (ตัวอย่าง)",
    businessIds: ["business-whisker-rest"],
    pets: [
      { id: "booking-pet-mochi", name: "Mochi", species: "cat" },
      { id: "booking-pet-milo", name: "Milo", species: "dog" },
    ],
  },
  {
    id: "booking-contact-pim",
    name: "คุณพิม (ตัวอย่าง)",
    businessIds: ["business-whisker-rest"],
    pets: [
      { id: "booking-pet-luna", name: "Luna", species: "cat" },
      { id: "booking-pet-tofu", name: "Tofu", species: "dog" },
    ],
  },
  {
    id: "booking-contact-onnut-aom",
    name: "คุณอ้อม (ตัวอย่าง)",
    businessIds: ["business-paw-partner"],
    pets: [
      { id: "booking-pet-pudding", name: "Pudding", species: "dog" },
      { id: "booking-pet-maple", name: "Maple", species: "dog" },
    ],
  },
  {
    id: "booking-contact-onnut-lee",
    name: "คุณลี (ตัวอย่าง)",
    businessIds: ["business-paw-partner"],
    pets: [
      { id: "booking-pet-leo", name: "Leo", species: "cat" },
    ],
  },
] as const;

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
  { id: "ari-hotel-capacity", businessId: "business-whisker-rest", branchId: "whisker-ari", module: "hotel", kind: "hotel-room-type", label: "พื้นที่พักตามเงื่อนไข", capacityMode: "capacity", capacity: 2, serviceIds: ["ari-hotel-stay"] },
  { id: "thonglor-groomer-nok", businessId: "business-whisker-rest", branchId: "whisker-thonglor", module: "grooming", kind: "groomer", label: "ช่างนก", capacityMode: "exclusive", capacity: 1, serviceIds: ["thonglor-grooming-bath"] },
  { id: "thonglor-station-a", businessId: "business-whisker-rest", branchId: "whisker-thonglor", module: "grooming", kind: "grooming-station", label: "จุดบริการ A", capacityMode: "exclusive", capacity: 1, serviceIds: ["thonglor-grooming-bath"] },
  { id: "thonglor-dryer-1", businessId: "business-whisker-rest", branchId: "whisker-thonglor", module: "grooming", kind: "dryer", label: "เครื่องเป่า 1", capacityMode: "exclusive", capacity: 1, serviceIds: ["thonglor-grooming-bath"] },
  { id: "onnut-hotel-capacity", businessId: "business-paw-partner", branchId: "partner-onnut", module: "hotel", kind: "hotel-room-type", label: "พื้นที่พักตามเงื่อนไข", capacityMode: "capacity", capacity: 2, serviceIds: ["onnut-hotel-stay"] },
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
    customer: { id: "booking-contact-nalin", name: "คุณนลิน (ตัวอย่าง)" },
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
    notes: "ข้อมูลตัวอย่างสำหรับทดสอบเวลาชน",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-ari-hotel-luna",
    customer: { id: "booking-contact-pim", name: "คุณพิม (ตัวอย่าง)" },
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
    notes: "เข้าพัก 3 คืน (ตัวอย่าง)",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-ari-hotel-milo",
    customer: { id: "booking-contact-nalin", name: "คุณนลิน (ตัวอย่าง)" },
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
    notes: "ทำให้พื้นที่พักเต็มในวันที่ 19 สิงหาคม (ตัวอย่าง)",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-ari-cancelled",
    customer: { id: "booking-contact-pim", name: "คุณพิม (ตัวอย่าง)" },
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
    customer: { id: "booking-contact-pim", name: "คุณพิม (ตัวอย่าง)" },
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
    notes: "ข้อมูลตัวอย่าง",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-onnut-daycare-full",
    customer: { id: "booking-contact-onnut-aom", name: "คุณอ้อม (ตัวอย่าง)" },
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
    notes: "สองตัวอย่างทำให้โซนสังคมเต็มในวันที่ 18 สิงหาคม",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
  {
    bookingId: "booking-fixture-onnut-hotel-leo",
    customer: { id: "booking-contact-onnut-lee", name: "คุณลี (ตัวอย่าง)" },
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
    notes: "ข้อมูลตัวอย่าง",
    createdAt: BOOKING_FIXTURE_CREATED_AT,
    updatedAt: BOOKING_FIXTURE_CREATED_AT,
    cancelledAt: null,
  },
] as const;

const DEMO_BUSINESS_HOME: Record<string, BusinessHomeDemo> = {
  "whisker-ari-frontdesk": {
    today: { waitingIntake: 3, inService: 5, readyForPickup: 2, newMessages: 4 },
    attention: [
      { id: "approval", tone: "waiting", title: "รอเจ้าของอนุมัติข้อมูล 2 รายการ", detail: "ต้องได้รับคำตอบก่อนยืนยันรับเข้า" },
      { id: "pickup", tone: "ready", title: "มีน้องพร้อมรับกลับ 2 ตัว", detail: "ตรวจของที่นำมาด้วยก่อนส่งมอบ" },
      { id: "messages", tone: "info", title: "มีข้อความใหม่ 4 รายการ", detail: "ข้อมูลตัวอย่าง · ระบบข้อความยังไม่เปิดใช้" },
    ],
    moduleSummaries: {
      grooming: { value: "8 งานวันนี้", detail: "ข้อมูลคิวตัวอย่างของสาขา" },
      hotel: { value: "12 / 18 ห้องมีผู้เข้าพัก", detail: "ข้อมูลการเข้าพักตัวอย่าง" },
    },
    revenueToday: 12450,
  },
  "whisker-thonglor-frontdesk": {
    today: { waitingIntake: 2, inService: 3, readyForPickup: 1, newMessages: 1 },
    attention: [
      { id: "approval", tone: "waiting", title: "รอเจ้าของอนุมัติข้อมูล 1 รายการ", detail: "ต้องได้รับคำตอบก่อนยืนยันรับเข้า" },
      { id: "pickup", tone: "ready", title: "มีน้องพร้อมรับกลับ 1 ตัว", detail: "ตรวจของที่นำมาด้วยก่อนส่งมอบ" },
      { id: "messages", tone: "info", title: "มีข้อความใหม่ 1 รายการ", detail: "ข้อมูลตัวอย่าง · ระบบข้อความยังไม่เปิดใช้" },
    ],
    moduleSummaries: {
      grooming: { value: "5 งานวันนี้", detail: "ข้อมูลคิวตัวอย่างของสาขา" },
    },
    revenueToday: 7200,
  },
  "paw-partner-onnut": {
    today: { waitingIntake: 1, inService: 7, readyForPickup: 3, newMessages: 2 },
    attention: [
      { id: "approval", tone: "waiting", title: "รอเจ้าของอนุมัติข้อมูล 1 รายการ", detail: "ต้องได้รับคำตอบก่อนยืนยันรับเข้า" },
      { id: "pickup", tone: "ready", title: "มีน้องพร้อมรับกลับ 3 ตัว", detail: "ตรวจของที่นำมาด้วยก่อนส่งมอบ" },
      { id: "messages", tone: "info", title: "มีข้อความใหม่ 2 รายการ", detail: "ข้อมูลตัวอย่าง · ระบบข้อความยังไม่เปิดใช้" },
    ],
    moduleSummaries: {
      hotel: { value: "9 / 14 ห้องมีผู้เข้าพัก", detail: "ข้อมูลการเข้าพักตัวอย่าง" },
      daycare: { value: "7 / 12 ตัวในพื้นที่ดูแล", detail: "ข้อมูลความจุตัวอย่าง" },
    },
    revenueToday: 9800,
  },
};

export const DEFAULT_BUSINESS_CONTEXT_KEY = DEMO_BUSINESS_CONTEXTS[0].key;
export const BUSINESS_STORAGE_KEY = "meawketting:business-intake:prototype-v1";

export function businessRoleLabel(role: string) {
  if (role === "Front desk staff (Demo)") return "พนักงานรับเข้า (ตัวอย่าง)";
  if (role === "Care coordinator (Demo)") return "ผู้ประสานงานดูแล (ตัวอย่าง)";
  return role;
}

export function businessStaffLabel(label: string) {
  return label.replace(" · Prototype", " (ตัวอย่าง)");
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
};

export type QrContractType = "quick-passport" | "public-safety" | "temporary-business" | "unknown";

export type CheckInResult =
  | { ok: true; record: BusinessIntakeRecord; duplicate: boolean }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "revoked" | "wrong-business" | "changed" };

const emptyStore = (): BusinessStore => ({
  activeContextKey: DEFAULT_BUSINESS_CONTEXT_KEY,
  intakes: {},
  bookings: {},
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
  return { context, business, branch };
}

export function getEnabledBusinessModules(context: DemoBusinessContext) {
  return DEMO_ENABLED_MODULES[context.key] ?? [];
}

export function getDemoBookingContacts(context?: DemoBusinessContext | null) {
  if (!context) return DEMO_BOOKING_CONTACTS;
  return DEMO_BOOKING_CONTACTS.filter((contact) => contact.businessIds.includes(context.businessId));
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
    conflicts.push(conflict("missing-customer", "กรุณาเลือกลูกค้าตัวอย่าง", "return-to-edit"));
  }
  if (draft.pets.length === 0) {
    conflicts.push(conflict("missing-pet", "กรุณาเลือกน้องที่เข้ารับบริการ", "return-to-edit"));
  }

  const contact = draft.customer ? getDemoBookingContacts(context).find((item) => item.id === draft.customer?.id) : null;
  if (draft.customer && (!contact || draft.pets.some((pet) => !contact.pets.some((candidate) => candidate.id === pet.id)))) {
    conflicts.push(conflict("invalid-pet-selection", "น้องที่เลือกไม่อยู่ในข้อมูลลูกค้าตัวอย่างนี้", "return-to-edit"));
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
        `${resource.label}มีงานในช่วงเวลานี้`,
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
  if (!writeStore(store)) return { ok: false, reason: "storage" };
  return { ok: true, booking: cloneBooking(cancelled), duplicate: false };
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

export function createOrResumeBusinessIntake(access: TemporaryAccess, context: DemoBusinessContext) {
  const store = readStore();
  const existing = Object.values(store.intakes).find((record) => record.accessId === access.id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const suffix = access.id.replace(/^prototype-access-/, "").replace(/[^a-z0-9-]/gi, "").slice(-32) || Date.now().toString(36);
  const record: BusinessIntakeRecord = {
    id: `prototype-intake-${suffix}`,
    accessId: access.id,
    businessId: context.businessId,
    branchId: context.branchId,
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
  const completed = updateBusinessIntake(intakeId, (current) => ({
    ...current,
    taskState: "complete",
    checkInState: "checked-in",
    checkedInAt,
    prototypeSessionReference: `LOCAL-SESSION-${Date.now().toString(36).toUpperCase()}`,
  }));
  return completed
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
    requester: status === "awaiting-owner" ? "ผู้ประสานงานดูแล (ตัวอย่าง)" : null,
    decisionAt: null,
    revokedAt: status === "revoked" ? new Date(Date.now() - 2 * 60_000).toISOString() : null,
    events: [{
      id: `created-${id}`,
      type: "created",
      occurredAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      actor: "เจ้าของหลัก (ตัวอย่าง)",
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
