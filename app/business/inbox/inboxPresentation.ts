import {
  BOOKING_DEMO_DATE,
  getDemoBusinessContextDetails,
  getDemoBusinessContextForBranch,
  listPrototypeBookingFixtures,
  readPrototypeBooking,
  readPrototypeCustomer,
  readPrototypeCustomerFixture,
  type BusinessServiceModule,
  type PrototypeBooking,
} from "../../_prototype/businessState";
import type {
  PrototypeAddServiceRequestMessage,
  PrototypeConversation,
  PrototypeInboxMessage,
  PrototypeStructuredRequestStatus,
} from "../../_prototype/inboxState";
import { bookingTimeLabel, calendarDateLabel } from "../calendar/calendarPresentation";

export type ConversationCustomerContext = { id: string; name: string };
export type ConversationPetContext = { id: string; name: string; species: "cat" | "dog" };
export type ConversationBookingContext = {
  bookingId: string;
  customerId: string;
  branchId: string;
  branchName: string;
  serviceModule: BusinessServiceModule;
  serviceLabel: string;
  timeModel: PrototypeBooking["timeModel"];
  start: string;
  end: string | null;
  status: PrototypeBooking["status"];
};

export type ResolvedConversationContext = {
  customer: ConversationCustomerContext | null;
  pet: ConversationPetContext | null;
  booking: ConversationBookingContext | null;
};

function fixtureBooking(bookingId: string) {
  return listPrototypeBookingFixtures(null, { includeCancelled: true }).find((booking) => booking.bookingId === bookingId) ?? null;
}

export function resolvePrototypeConversationContext(
  conversation: PrototypeConversation,
  fixtureOnly = false,
): ResolvedConversationContext {
  const sourceCustomer = fixtureOnly
    ? readPrototypeCustomerFixture(conversation.customerId)
    : readPrototypeCustomer(conversation.customerId);
  const customer = sourceCustomer?.businessId === conversation.businessId
    ? { id: sourceCustomer.id, name: sourceCustomer.name }
    : null;
  const sourceBooking = conversation.bookingId
    ? (fixtureOnly ? fixtureBooking(conversation.bookingId) : readPrototypeBooking(conversation.bookingId))
    : null;
  const validBooking = sourceBooking
    && sourceBooking.businessId === conversation.businessId
    && sourceBooking.customer.id === conversation.customerId
    ? sourceBooking
    : null;
  const petId = conversation.petId ?? validBooking?.pets[0]?.id ?? null;
  const sourcePet = sourceCustomer?.pets.find((pet) => pet.id === petId) ?? validBooking?.pets.find((pet) => pet.id === petId) ?? null;
  const pet = sourcePet ? { id: sourcePet.id, name: sourcePet.name, species: sourcePet.species } : null;
  const branchContext = validBooking
    ? getDemoBusinessContextForBranch(validBooking.businessId, validBooking.branchId)
    : null;
  const branchName = branchContext ? getDemoBusinessContextDetails(branchContext).branch?.name ?? "สาขาที่เกี่ยวข้อง" : "สาขาที่เกี่ยวข้อง";
  const booking = validBooking ? {
    bookingId: validBooking.bookingId,
    customerId: validBooking.customer.id,
    branchId: validBooking.branchId,
    branchName,
    serviceModule: validBooking.serviceModule,
    serviceLabel: validBooking.service.label,
    timeModel: validBooking.timeModel,
    start: validBooking.start,
    end: validBooking.end,
    status: validBooking.status,
  } satisfies ConversationBookingContext : null;

  return { customer, pet, booking };
}

export const STRUCTURED_REQUEST_STATUS_LABELS: Record<PrototypeStructuredRequestStatus, string> = {
  waiting: "รอเจ้าของตอบ",
  approved: "เจ้าของอนุมัติแล้ว",
  declined: "เจ้าของไม่อนุมัติ",
  cancelled: "ร้านยกเลิกคำขอแล้ว",
  expired: "คำขอหมดอายุ",
};

export function prototypeMessagePreview(message: PrototypeInboxMessage | null) {
  if (!message) return "ยังไม่มีข้อความ";
  if (message.kind === "text") return message.text;
  return `ขอเพิ่มบริการ ${message.serviceName} · ${STRUCTURED_REQUEST_STATUS_LABELS[message.requestStatus]}`;
}

export function latestPrototypeConversationMessage(conversation: PrototypeConversation) {
  return conversation.messages.at(-1) ?? null;
}

function normalizedSearchText(value: string) {
  return value.trim().toLocaleLowerCase("th-TH");
}

export function conversationMatchesPrototypeSearch(
  conversation: PrototypeConversation,
  context: ResolvedConversationContext,
  query: string,
) {
  const normalizedQuery = normalizedSearchText(query);
  if (!normalizedQuery) return true;
  const searchable = [
    context.customer?.name ?? "",
    context.pet?.name ?? "",
    context.booking?.serviceLabel ?? "",
    ...conversation.messages.flatMap((message) => message.kind === "text"
      ? [message.text]
      : [message.serviceName, message.note, STRUCTURED_REQUEST_STATUS_LABELS[message.requestStatus]]),
  ].join(" ").toLocaleLowerCase("th-TH");
  return searchable.includes(normalizedQuery);
}

export function conversationIsInService(context: ResolvedConversationContext) {
  const booking = context.booking;
  if (!booking || booking.status === "cancelled") return false;
  if (booking.timeModel === "date-range") return booking.start <= BOOKING_DEMO_DATE && Boolean(booking.end && BOOKING_DEMO_DATE < booking.end);
  return booking.start.slice(0, 10) === BOOKING_DEMO_DATE && (booking.status === "confirmed" || booking.status === "arrived");
}

const messageTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Bangkok",
});

export function prototypeMessageTimeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : messageTimeFormatter.format(date);
}

export function prototypeConversationContextLabel(context: ResolvedConversationContext) {
  if (!context.booking) return context.pet?.name ? `น้อง ${context.pet.name}` : "บทสนทนากับลูกค้า";
  if (context.booking.timeModel === "day") {
    return calendarDateLabel(context.booking.start, { day: "numeric", month: "short" });
  }
  return bookingTimeLabel({
    bookingId: context.booking.bookingId,
    customer: { id: context.booking.customerId, name: context.customer?.name ?? "ลูกค้า" },
    pets: context.pet ? [context.pet] : [],
    businessId: "",
    branchId: context.booking.branchId,
    serviceModule: context.booking.serviceModule,
    service: { id: "", label: context.booking.serviceLabel },
    timeModel: context.booking.timeModel,
    start: context.booking.start,
    end: context.booking.end,
    requiredResources: [],
    assignedResources: [],
    status: context.booking.status,
    estimate: null,
    notes: "",
    createdAt: "",
    updatedAt: "",
    cancelledAt: null,
  });
}

export function prototypeRequestPriceLabel(request: Pick<PrototypeAddServiceRequestMessage, "additionalPrice">) {
  return `+${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(request.additionalPrice)} บาท`;
}
