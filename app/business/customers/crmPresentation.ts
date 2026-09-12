import type {
  BusinessServiceModule,
  PrototypeBooking,
  PrototypeCharge,
  PrototypeCustomer,
  PrototypePayment,
  PrototypeServiceRecord,
} from "../../_prototype/businessState";
import { getPrototypeChargeBalance } from "../../_prototype/businessState";
import type { PrototypeConversation } from "../../_prototype/inboxState";
import { BUSINESS_FIXTURE_TEST_MODE } from "../../_prototype/fixtureRuntime";
import { readCrm } from "../../_backend/be8/client";

export type CustomerCrmSegment =
  | "all"
  | "new"
  | "regular"
  | "no-next-booking"
  | "grooming"
  | "hotel"
  | "daycare"
  | "inactive";

export type CustomerLifecycle = "new" | "active" | "regular" | "inactive";

export type CustomerCrmDataset = {
  scope?: { businessId: string; branchId: string };
  bookings: readonly PrototypeBooking[];
  serviceRecords: readonly PrototypeServiceRecord[];
  charges: readonly PrototypeCharge[];
  payments: readonly PrototypePayment[];
  conversations: readonly PrototypeConversation[];
};

export type CustomerCrmProfile = {
  customerId: string;
  lifecycle: CustomerLifecycle;
  visitCount: number;
  lastVisitAt: string | null;
  nextBooking: PrototypeBooking | null;
  servicesUsed: BusinessServiceModule[];
  outstandingBalance: number;
  conversationCount: number;
  latestConversationAt: string | null;
  returned: boolean;
  daysSinceLastVisit: number | null;
  signals: string[];
  nextAction: {
    label: string;
    detail: string;
    href: string;
    kind: "booking" | "message" | "billing" | "prepare";
  };
};

export type CustomerTimelineKind = "booking" | "service" | "payment" | "message";

export type CustomerTimelineItem = {
  id: string;
  kind: CustomerTimelineKind;
  at: string;
  title: string;
  detail: string;
  href: string;
  serviceModule: BusinessServiceModule | null;
};

export const CUSTOMER_CRM_SEGMENTS: readonly { value: CustomerCrmSegment; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "new", label: "ลูกค้าใหม่" },
  { value: "regular", label: "ลูกค้าประจำ" },
  { value: "no-next-booking", label: "ไม่มีนัดถัดไป" },
  { value: "grooming", label: "Grooming" },
  { value: "hotel", label: "Hotel" },
  { value: "daycare", label: "Daycare" },
  { value: "inactive", label: "ไม่ได้มาสักพัก" },
] as const;

export const CUSTOMER_LIFECYCLE_LABELS: Record<CustomerLifecycle, string> = {
  new: "ลูกค้าใหม่",
  active: "กำลังใช้บริการ",
  regular: "ลูกค้าประจำ",
  inactive: "ไม่ได้มาสักพัก",
};

const SERVICE_MODULE_LABELS: Record<BusinessServiceModule, string> = {
  grooming: "Grooming",
  hotel: "Hotel",
  daycare: "Daycare",
};

function newestValue(values: readonly (string | null | undefined)[]) {
  return values.filter((value): value is string => Boolean(value)).sort((first, second) => second.localeCompare(first))[0] ?? null;
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function dayDistance(later: string, earlier: string) {
  const laterTime = Date.parse(`${dateOnly(later)}T00:00:00.000Z`);
  const earlierTime = Date.parse(`${dateOnly(earlier)}T00:00:00.000Z`);
  if (!Number.isFinite(laterTime) || !Number.isFinite(earlierTime)) return 0;
  return Math.max(0, Math.floor((laterTime - earlierTime) / 86_400_000));
}

export function deriveCustomerCrmReferenceAt(customers: readonly PrototypeCustomer[], dataset: CustomerCrmDataset) {
  if (!BUSINESS_FIXTURE_TEST_MODE) return new Date().toISOString();
  return newestValue([
    ...customers.map((customer) => customer.createdAt),
    ...dataset.serviceRecords.map((record) => record.completedAt),
    ...dataset.charges.map((charge) => charge.createdAt),
    ...dataset.payments.map((payment) => payment.recordedAt),
    ...dataset.conversations.map((conversation) => conversation.updatedAt),
  ]) ?? new Date().toISOString();
}

function bookingIsCurrentOrFuture(booking: PrototypeBooking, referenceAt: string) {
  // The CRM watermark is a data reference day, not a live clock. Keep unresolved
  // same-day work visible even if another record was updated later that day.
  return booking.status !== "cancelled" && dateOnly(booking.start) >= dateOnly(referenceAt);
}

export function deriveCustomerUpcomingBookings(
  customer: PrototypeCustomer,
  dataset: CustomerCrmDataset,
  referenceAt = deriveCustomerCrmReferenceAt([customer], dataset),
): PrototypeBooking[] {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readCrm(dataset.scope, customer.id).upcoming;
  const completedPetsByBooking = new Map<string, Set<string>>();
  for (const record of dataset.serviceRecords) {
    if (record.businessId !== customer.businessId || record.customerId !== customer.id) continue;
    const key = `${record.branchId}:${record.serviceModule}:${record.bookingId}`;
    const completedPets = completedPetsByBooking.get(key) ?? new Set<string>();
    completedPets.add(record.petId);
    completedPetsByBooking.set(key, completedPets);
  }

  return dataset.bookings
    .filter((booking) => (
      booking.businessId === customer.businessId
      && booking.customer.id === customer.id
      && bookingIsCurrentOrFuture(booking, referenceAt)
    ))
    .flatMap((booking) => {
      const completedPets = completedPetsByBooking.get(`${booking.branchId}:${booking.serviceModule}:${booking.bookingId}`);
      const pets = booking.pets.filter((pet) => !completedPets?.has(pet.id));
      // This is a display projection only. A completed Pet must not hide a
      // sibling's unfinished attendance or mutate the shared Booking's Pets.
      return pets.length > 0 ? [{ ...booking, pets }] : [];
    })
    .sort((first, second) => first.start.localeCompare(second.start) || first.bookingId.localeCompare(second.bookingId));
}

function serviceLabels(modules: readonly BusinessServiceModule[]) {
  return modules.map((module) => SERVICE_MODULE_LABELS[module]).join(" · ");
}

export function deriveCustomerCrmProfile(
  customer: PrototypeCustomer,
  dataset: CustomerCrmDataset,
  referenceAt = deriveCustomerCrmReferenceAt([customer], dataset),
): CustomerCrmProfile {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readCrm(dataset.scope, customer.id).profile;
  const bookings = dataset.bookings
    .filter((booking) => booking.businessId === customer.businessId && booking.customer.id === customer.id)
    .sort((first, second) => first.start.localeCompare(second.start));
  const records = dataset.serviceRecords
    .filter((record) => record.businessId === customer.businessId && record.customerId === customer.id)
    .sort((first, second) => second.completedAt.localeCompare(first.completedAt));
  const charges = dataset.charges.filter((charge) => charge.businessId === customer.businessId && charge.customerId === customer.id);
  const payments = dataset.payments.filter((payment) => payment.businessId === customer.businessId && payment.customerId === customer.id);
  const conversations = dataset.conversations
    .filter((conversation) => conversation.businessId === customer.businessId && conversation.customerId === customer.id)
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  const visitCount = new Set(records.map((record) => record.bookingId)).size;
  const lastVisitAt = records[0]?.completedAt ?? null;
  const nextBooking = deriveCustomerUpcomingBookings(customer, dataset, referenceAt)[0] ?? null;
  const servicesUsed = [...new Set([
    ...records.map((record) => record.serviceModule),
    ...bookings
      .filter((booking) => booking.status !== "cancelled" && dateOnly(booking.start) <= dateOnly(referenceAt))
      .map((booking) => booking.serviceModule),
  ])];
  const outstandingBalance = charges.reduce((total, charge) => (
    total + getPrototypeChargeBalance(charge, payments).remaining
  ), 0);
  const daysSinceLastVisit = lastVisitAt ? dayDistance(referenceAt, lastVisitAt) : null;
  const inactive = Boolean(lastVisitAt && daysSinceLastVisit !== null && daysSinceLastVisit >= 45 && !nextBooking);
  const lifecycle: CustomerLifecycle = inactive
    ? "inactive"
    : visitCount >= 2
      ? "regular"
      : nextBooking
        ? "active"
        : "new";
  const returned = visitCount >= 2;
  const signals: string[] = [];
  if (returned) signals.push(`กลับมาใช้บริการแล้ว ${visitCount} ครั้ง`);
  if (lastVisitAt) signals.push(`บริการล่าสุดเป็น ${records[0]?.serviceLabel ?? serviceLabels(servicesUsed)}`);
  if (!nextBooking) signals.push("ยังไม่มีนัดหมายถัดไป");
  if (inactive) signals.push(`ไม่ได้มาใช้บริการ ${daysSinceLastVisit} วัน`);
  if (outstandingBalance > 0) signals.push("มียอดที่ยังต้องติดตาม");
  if (signals.length === 0) signals.push("เริ่มสร้างความสัมพันธ์จากข้อมูลการจองและบริการ");

  const nextAction = outstandingBalance > 0
    ? {
        label: "ตรวจยอดและการชำระ",
        detail: "มียอดคงเหลือจากบริการของลูกค้ารายนี้",
        href: "/business/billing",
        kind: "billing" as const,
      }
    : nextBooking
      ? {
          label: "เปิดนัดหมายถัดไป",
          detail: `${nextBooking.service.label} · ${nextBooking.start.slice(0, 10)}`,
          href: `/business/calendar?bookingId=${encodeURIComponent(nextBooking.bookingId)}`,
          kind: "prepare" as const,
        }
      : visitCount > 0
        ? {
            label: "เพิ่มการจองครั้งถัดไป",
            detail: `บริการที่เคยใช้: ${serviceLabels(servicesUsed) || "ยังไม่ระบุ"}`,
            href: `/business/calendar?customerId=${encodeURIComponent(customer.id)}`,
            kind: "booking" as const,
          }
        : conversations.length > 0
          ? {
              label: "เปิดบทสนทนาล่าสุด",
              detail: "ดูข้อความที่เกี่ยวข้องก่อนเริ่มการจอง",
              href: `/business/inbox?customerId=${encodeURIComponent(customer.id)}`,
              kind: "message" as const,
            }
          : {
              label: "เพิ่มการจองแรก",
              detail: "เริ่มจากบริการที่ลูกค้าต้องการ โดยไม่สร้างคะแนนหรือแคมเปญอัตโนมัติ",
              href: `/business/calendar?customerId=${encodeURIComponent(customer.id)}`,
              kind: "booking" as const,
            };

  return {
    customerId: customer.id,
    lifecycle,
    visitCount,
    lastVisitAt,
    nextBooking,
    servicesUsed,
    outstandingBalance,
    conversationCount: conversations.length,
    latestConversationAt: conversations[0]?.updatedAt ?? null,
    returned,
    daysSinceLastVisit,
    signals,
    nextAction,
  };
}

export function customerMatchesCrmSegment(profile: CustomerCrmProfile, segment: CustomerCrmSegment) {
  if (segment === "all") return true;
  if (segment === "new") return profile.lifecycle === "new" || profile.lifecycle === "active";
  if (segment === "regular") return profile.lifecycle === "regular";
  if (segment === "no-next-booking") return !profile.nextBooking;
  if (segment === "inactive") return profile.lifecycle === "inactive";
  return profile.servicesUsed.includes(segment);
}

function bookingTimelineDetail(booking: PrototypeBooking) {
  if (booking.status === "cancelled") return `${booking.service.label} · ยกเลิกแล้ว`;
  const petNames = booking.pets.map((pet) => pet.name).join(", ");
  return `${booking.service.label}${petNames ? ` · ${petNames}` : ""}`;
}

function requestStatusLabel(status: "waiting" | "approved" | "declined" | "cancelled" | "expired") {
  if (status === "waiting") return "รอคำตอบ";
  if (status === "approved") return "อนุมัติแล้ว";
  if (status === "declined") return "ไม่อนุมัติ";
  if (status === "cancelled") return "ยกเลิกแล้ว";
  return "หมดอายุ";
}

export function deriveCustomerTimeline(customer: PrototypeCustomer, dataset: CustomerCrmDataset): CustomerTimelineItem[] {
  if (!BUSINESS_FIXTURE_TEST_MODE) return readCrm(dataset.scope, customer.id).timeline;
  const customerCharges = dataset.charges.filter((charge) => charge.businessId === customer.businessId && charge.customerId === customer.id);
  const chargesById = new Map(customerCharges.map((charge) => [charge.chargeId, charge]));
  const bookingItems: CustomerTimelineItem[] = dataset.bookings
    .filter((booking) => booking.businessId === customer.businessId && booking.customer.id === customer.id)
    .map((booking) => ({
      id: `booking-${booking.bookingId}`,
      kind: "booking",
      at: booking.start,
      title: booking.status === "cancelled" ? "นัดหมายถูกยกเลิก" : "นัดหมาย",
      detail: bookingTimelineDetail(booking),
      href: `/business/calendar?bookingId=${encodeURIComponent(booking.bookingId)}`,
      serviceModule: booking.serviceModule,
    }));
  const serviceItems: CustomerTimelineItem[] = dataset.serviceRecords
    .filter((record) => record.businessId === customer.businessId && record.customerId === customer.id)
    .map((record) => ({
      id: `service-${record.serviceRecordId}`,
      kind: "service",
      at: record.completedAt,
      title: "บริการเสร็จแล้ว",
      detail: record.summary,
      href: "#customer-service-history-title",
      serviceModule: record.serviceModule,
    }));
  const chargeItems: CustomerTimelineItem[] = customerCharges.map((charge) => ({
    id: `charge-${charge.chargeId}`,
    kind: "payment",
    at: charge.createdAt,
    title: charge.cancelledAt ? "ยอดชำระถูกยกเลิก" : "เปิดยอดชำระ",
    detail: charge.serviceLabel,
    href: `/business/billing?chargeId=${encodeURIComponent(charge.chargeId)}`,
    serviceModule: charge.serviceModule,
  }));
  const paymentItems: CustomerTimelineItem[] = dataset.payments
    .filter((payment) => payment.businessId === customer.businessId && payment.customerId === customer.id)
    .map((payment) => {
      const allocatedCharges = payment.allocations
        .map((allocation) => chargesById.get(allocation.chargeId))
        .filter((charge): charge is PrototypeCharge => Boolean(charge));
      const firstCharge = allocatedCharges[0] ?? null;
      return {
        id: `payment-${payment.paymentId}`,
        kind: "payment" as const,
        at: payment.recordedAt,
        title: "บันทึกการชำระแล้ว",
        detail: allocatedCharges.map((charge) => charge.serviceLabel).filter(Boolean).join(" · ") || "การชำระของลูกค้า",
        href: firstCharge ? `/business/billing?chargeId=${encodeURIComponent(firstCharge.chargeId)}` : "/business/billing",
        serviceModule: firstCharge?.serviceModule ?? null,
      };
    });
  const messageItems: CustomerTimelineItem[] = dataset.conversations
    .filter((conversation) => conversation.businessId === customer.businessId && conversation.customerId === customer.id)
    .flatMap((conversation) => conversation.messages.map((message) => ({
      id: `message-${message.messageId}`,
      kind: "message" as const,
      at: message.sentAt,
      title: message.kind === "text"
        ? message.direction === "customer" ? "ลูกค้าส่งข้อความ" : "ร้านส่งข้อความ"
        : "ร้านส่งคำขอบริการเพิ่มเติม",
      detail: message.kind === "text"
        ? message.text
        : `${message.serviceName} · ${requestStatusLabel(message.requestStatus)}`,
      href: `/business/inbox?conversationId=${encodeURIComponent(conversation.conversationId)}`,
      serviceModule: null,
    })));

  return [...bookingItems, ...serviceItems, ...chargeItems, ...paymentItems, ...messageItems]
    .sort((first, second) => second.at.localeCompare(first.at) || first.id.localeCompare(second.id));
}
