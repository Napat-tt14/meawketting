import {
  DEMO_BUSINESS_CONTEXTS,
  applyPrototypeApprovedGroomingAddOn,
  type DemoBusinessContext,
  readPrototypeBooking,
  readPrototypeCustomer,
  readPrototypeGroomingServiceJob,
} from "./businessState";

// BF-4 stores only Business communication records and opaque relationship
// references. Customer, Pet, Booking, Branch, and Passport data stay in their
// existing sources and are resolved at render time.
export const INBOX_STORAGE_KEY = "meawketting:business-inbox:prototype-v1";

export type PrototypeMessageDirection = "business" | "customer";
export type PrototypeMessageDeliveryState = "local-sent" | "local-read" | null;
export type PrototypeStructuredRequestStatus = "waiting" | "approved" | "declined" | "cancelled" | "expired";

type PrototypeMessageBase = {
  messageId: string;
  conversationId: string;
  direction: PrototypeMessageDirection;
  sentAt: string;
};

export type PrototypeTextMessage = PrototypeMessageBase & {
  kind: "text";
  text: string;
  deliveryState: PrototypeMessageDeliveryState;
};

export type PrototypeAddServiceRequestMessage = PrototypeMessageBase & {
  kind: "add-service-request";
  direction: "business";
  bookingId: string;
  // Added by BF-5; optional so existing BF-4 browser-local messages remain
  // readable until a new structured request is created from a Grooming Job.
  serviceJobId?: string | null;
  serviceName: string;
  additionalPrice: number;
  additionalMinutes: number;
  note: string;
  requestStatus: PrototypeStructuredRequestStatus;
  respondedAt: string | null;
  responseSource: "guardian-local-preview" | null;
};

export type PrototypeInboxMessage = PrototypeTextMessage | PrototypeAddServiceRequestMessage;

export type PrototypeConversation = {
  conversationId: string;
  businessId: string;
  customerId: string;
  petId: string | null;
  bookingId: string | null;
  branchId: string | null;
  serviceJobId: string | null;
  messages: PrototypeInboxMessage[];
  unreadCount: number;
  lastReadAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const CONVERSATION_FIXTURE_CREATED_AT = "2026-08-18T02:48:00.000Z";

export const DEMO_CONVERSATION_FIXTURES: readonly PrototypeConversation[] = [
  {
    conversationId: "conversation-fixture-pim",
    businessId: "business-whisker-rest",
    customerId: "booking-contact-pim",
    petId: "booking-pet-luna",
    bookingId: "booking-fixture-ari-hotel-luna",
    branchId: "whisker-ari",
    serviceJobId: null,
    unreadCount: 2,
    lastReadAt: "2026-08-18T02:56:00.000Z",
    createdAt: CONVERSATION_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T03:42:00.000Z",
    messages: [
      {
        messageId: "message-pim-business-received",
        conversationId: "conversation-fixture-pim",
        direction: "business",
        kind: "text",
        text: "รับน้องเรียบร้อยแล้วค่ะ เดี๋ยวส่งอัปเดตให้นะคะ",
        sentAt: "2026-08-18T02:55:00.000Z",
        deliveryState: "local-read",
      },
      {
        messageId: "message-pim-customer-thanks",
        conversationId: "conversation-fixture-pim",
        direction: "customer",
        kind: "text",
        text: "ขอบคุณค่ะ ถ้ามีอะไรแจ้งได้เลยนะคะ",
        sentAt: "2026-08-18T03:05:00.000Z",
        deliveryState: null,
      },
      {
        messageId: "message-pim-add-service",
        conversationId: "conversation-fixture-pim",
        direction: "business",
        kind: "add-service-request",
        bookingId: "booking-fixture-ari-hotel-luna",
        serviceName: "แกะสางขน",
        additionalPrice: 300,
        additionalMinutes: 30,
        note: "พบขนพันกันเล็กน้อยระหว่างดูแลค่ะ",
        requestStatus: "waiting",
        respondedAt: null,
        responseSource: null,
        sentAt: "2026-08-18T03:28:00.000Z",
      },
      {
        messageId: "message-pim-customer-received",
        conversationId: "conversation-fixture-pim",
        direction: "customer",
        kind: "text",
        text: "ได้รับข้อมูลแล้วค่ะ ขอบคุณค่ะ",
        sentAt: "2026-08-18T03:42:00.000Z",
        deliveryState: null,
      },
    ],
  },
  {
    conversationId: "conversation-fixture-nalin",
    businessId: "business-whisker-rest",
    customerId: "booking-contact-nalin",
    petId: "booking-pet-mochi",
    bookingId: "booking-fixture-ari-grooming-1030",
    branchId: "whisker-ari",
    serviceJobId: "grooming-job-fixture-mochi",
    unreadCount: 2,
    lastReadAt: "2026-08-18T02:50:00.000Z",
    createdAt: CONVERSATION_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T10:50:00.000Z",
    messages: [
      {
        messageId: "message-nalin-business-confirmed",
        conversationId: "conversation-fixture-nalin",
        direction: "business",
        kind: "text",
        text: "ยืนยันนัดอาบน้ำและตัดขนของ Mochi เวลา 10:30 น. ค่ะ",
        sentAt: "2026-08-18T02:52:00.000Z",
        deliveryState: "local-read",
      },
      {
        messageId: "message-nalin-customer-first",
        conversationId: "conversation-fixture-nalin",
        direction: "customer",
        kind: "text",
        text: "รับทราบค่ะ ฝากดูบริเวณขาหน้าด้วยนะคะ",
        sentAt: "2026-08-18T03:14:00.000Z",
        deliveryState: null,
      },
      {
        messageId: "message-nalin-customer-pickup",
        conversationId: "conversation-fixture-nalin",
        direction: "customer",
        kind: "text",
        text: "ขอเลื่อนเวลารับเป็นบ่ายโมงได้ไหมคะ",
        sentAt: "2026-08-18T03:18:00.000Z",
        deliveryState: null,
      },
      {
        messageId: "message-nalin-grooming-addon",
        conversationId: "conversation-fixture-nalin",
        direction: "business",
        kind: "add-service-request",
        bookingId: "booking-fixture-ari-grooming-1030",
        serviceJobId: "grooming-job-fixture-mochi",
        serviceName: "แกะสางขน",
        additionalPrice: 300,
        additionalMinutes: 30,
        note: "พบขนพันกันมากระหว่างเตรียมบริการค่ะ",
        requestStatus: "waiting",
        respondedAt: null,
        responseSource: null,
        sentAt: "2026-08-18T10:50:00.000Z",
      },
    ],
  },
  {
    conversationId: "conversation-fixture-aom",
    businessId: "business-paw-partner",
    customerId: "booking-contact-onnut-aom",
    petId: "booking-pet-pudding",
    bookingId: "booking-fixture-onnut-daycare-full",
    branchId: "partner-onnut",
    serviceJobId: null,
    unreadCount: 2,
    lastReadAt: "2026-08-18T02:35:00.000Z",
    createdAt: CONVERSATION_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T04:08:00.000Z",
    messages: [
      {
        messageId: "message-aom-business-daycare",
        conversationId: "conversation-fixture-aom",
        direction: "business",
        kind: "text",
        text: "รับ Pudding และ Maple เข้า Daycare เรียบร้อยแล้วค่ะ",
        sentAt: "2026-08-18T03:02:00.000Z",
        deliveryState: "local-read",
      },
      {
        messageId: "message-aom-customer-meal",
        conversationId: "conversation-fixture-aom",
        direction: "customer",
        kind: "text",
        text: "มื้อกลางวันแยกถ้วยให้น้องสองตัวนะคะ",
        sentAt: "2026-08-18T04:02:00.000Z",
        deliveryState: null,
      },
      {
        messageId: "message-aom-customer-thanks",
        conversationId: "conversation-fixture-aom",
        direction: "customer",
        kind: "text",
        text: "ขอบคุณมากค่ะ",
        sentAt: "2026-08-18T04:08:00.000Z",
        deliveryState: null,
      },
    ],
  },
  {
    conversationId: "conversation-fixture-lee",
    businessId: "business-paw-partner",
    customerId: "booking-contact-onnut-lee",
    petId: "booking-pet-leo",
    bookingId: "booking-fixture-onnut-hotel-leo",
    branchId: "partner-onnut",
    serviceJobId: null,
    unreadCount: 0,
    lastReadAt: "2026-08-18T03:20:00.000Z",
    createdAt: CONVERSATION_FIXTURE_CREATED_AT,
    updatedAt: "2026-08-18T03:20:00.000Z",
    messages: [
      {
        messageId: "message-lee-business-info",
        conversationId: "conversation-fixture-lee",
        direction: "business",
        kind: "text",
        text: "ได้รับข้อมูลการเข้าพักของ Leo แล้วค่ะ",
        sentAt: "2026-08-18T03:20:00.000Z",
        deliveryState: "local-sent",
      },
    ],
  },
] as const;

type PrototypeInboxStore = {
  conversations: Record<string, PrototypeConversation>;
};

function emptyInboxStore(): PrototypeInboxStore {
  return { conversations: {} };
}

function cloneMessage(message: PrototypeInboxMessage): PrototypeInboxMessage {
  return { ...message };
}

export function clonePrototypeConversation(conversation: PrototypeConversation): PrototypeConversation {
  return { ...conversation, messages: conversation.messages.map(cloneMessage) };
}

function isStructuredRequestStatus(value: unknown): value is PrototypeStructuredRequestStatus {
  return value === "waiting" || value === "approved" || value === "declined" || value === "cancelled" || value === "expired";
}

function isPrototypeInboxMessage(value: unknown): value is PrototypeInboxMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message = value as Partial<PrototypeInboxMessage>;
  if (typeof message.messageId !== "string" || typeof message.conversationId !== "string" || typeof message.sentAt !== "string") return false;
  if (message.direction !== "business" && message.direction !== "customer") return false;
  if (message.kind === "text") {
    return typeof message.text === "string"
      && (message.deliveryState === "local-sent" || message.deliveryState === "local-read" || message.deliveryState === null);
  }
  return message.kind === "add-service-request"
    && message.direction === "business"
    && typeof message.bookingId === "string"
    && (typeof message.serviceJobId === "string" || message.serviceJobId === null || typeof message.serviceJobId === "undefined")
    && typeof message.serviceName === "string"
    && typeof message.additionalPrice === "number"
    && typeof message.additionalMinutes === "number"
    && typeof message.note === "string"
    && isStructuredRequestStatus(message.requestStatus)
    && (typeof message.respondedAt === "string" || message.respondedAt === null)
    && (message.responseSource === "guardian-local-preview" || message.responseSource === null);
}

function isPrototypeConversation(value: unknown): value is PrototypeConversation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const conversation = value as Partial<PrototypeConversation>;
  return typeof conversation.conversationId === "string"
    && typeof conversation.businessId === "string"
    && typeof conversation.customerId === "string"
    && (typeof conversation.petId === "string" || conversation.petId === null)
    && (typeof conversation.bookingId === "string" || conversation.bookingId === null)
    && (typeof conversation.branchId === "string" || conversation.branchId === null)
    && (typeof conversation.serviceJobId === "string" || conversation.serviceJobId === null)
    && Array.isArray(conversation.messages)
    && conversation.messages.every(isPrototypeInboxMessage)
    && typeof conversation.unreadCount === "number"
    && conversation.unreadCount >= 0
    && (typeof conversation.lastReadAt === "string" || conversation.lastReadAt === null)
    && typeof conversation.createdAt === "string"
    && typeof conversation.updatedAt === "string";
}

function readInboxStore(): PrototypeInboxStore {
  if (typeof window === "undefined") return emptyInboxStore();
  try {
    const raw = window.sessionStorage.getItem(INBOX_STORAGE_KEY);
    if (!raw) return emptyInboxStore();
    const parsed = JSON.parse(raw) as Partial<PrototypeInboxStore>;
    return {
      conversations: parsed.conversations && typeof parsed.conversations === "object" && !Array.isArray(parsed.conversations)
        ? parsed.conversations
        : {},
    };
  } catch {
    return emptyInboxStore();
  }
}

function writeInboxStore(store: PrototypeInboxStore) {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent("meawketting:business-state"));
    return true;
  } catch {
    return false;
  }
}

function mergedPrototypeConversations(store: PrototypeInboxStore) {
  const conversations = new Map<string, PrototypeConversation>();
  for (const fixture of DEMO_CONVERSATION_FIXTURES) conversations.set(fixture.conversationId, clonePrototypeConversation(fixture));
  for (const stored of Object.values(store.conversations)) {
    if (isPrototypeConversation(stored)) conversations.set(stored.conversationId, clonePrototypeConversation(stored));
  }
  return [...conversations.values()];
}

export function filterPrototypeConversationsForBusiness(conversations: readonly PrototypeConversation[], businessId: string) {
  return conversations
    .filter((conversation) => conversation.businessId === businessId)
    .map(clonePrototypeConversation)
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt) || first.conversationId.localeCompare(second.conversationId));
}

export function listPrototypeConversationFixtures(contextOrBusinessId: DemoBusinessContext | string) {
  const businessId = typeof contextOrBusinessId === "string" ? contextOrBusinessId : contextOrBusinessId.businessId;
  return filterPrototypeConversationsForBusiness(DEMO_CONVERSATION_FIXTURES, businessId);
}

export function listPrototypeConversations(contextOrBusinessId: DemoBusinessContext | string) {
  const businessId = typeof contextOrBusinessId === "string" ? contextOrBusinessId : contextOrBusinessId.businessId;
  return filterPrototypeConversationsForBusiness(mergedPrototypeConversations(readInboxStore()), businessId);
}

export function readPrototypeConversation(conversationId: string) {
  return mergedPrototypeConversations(readInboxStore()).find((conversation) => conversation.conversationId === conversationId) ?? null;
}

export function findReusablePrototypeConversation(
  conversations: readonly PrototypeConversation[],
  businessId: string,
  customerId: string,
) {
  return conversations.find((conversation) => conversation.businessId === businessId && conversation.customerId === customerId) ?? null;
}

function generatedPrototypeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export type EnsurePrototypeConversationResult =
  | { ok: true; conversation: PrototypeConversation; reused: boolean }
  | { ok: false; reason: "missing-customer" | "invalid-context" | "storage" };

export function ensurePrototypeConversation(input: {
  businessId: string;
  customerId: string;
  petId?: string | null;
  bookingId?: string | null;
  branchId?: string | null;
  serviceJobId?: string | null;
}): EnsurePrototypeConversationResult {
  const customer = readPrototypeCustomer(input.customerId);
  if (!customer || customer.businessId !== input.businessId) return { ok: false, reason: "missing-customer" };

  const petId = input.petId ?? null;
  if (petId && !customer.pets.some((pet) => pet.id === petId)) return { ok: false, reason: "invalid-context" };

  const serviceJob = input.serviceJobId ? readPrototypeGroomingServiceJob(input.serviceJobId) : null;
  if (input.serviceJobId && (!serviceJob || serviceJob.businessId !== input.businessId || serviceJob.customerId !== customer.id)) {
    return { ok: false, reason: "invalid-context" };
  }
  const bookingId = input.bookingId ?? serviceJob?.bookingId ?? null;
  const booking = bookingId ? readPrototypeBooking(bookingId) : null;
  if (bookingId && (!booking || booking.businessId !== input.businessId || booking.customer.id !== customer.id)) {
    return { ok: false, reason: "invalid-context" };
  }
  if (serviceJob && (serviceJob.bookingId !== booking?.bookingId || (petId && serviceJob.petId !== petId))) {
    return { ok: false, reason: "invalid-context" };
  }
  const bookingPetId = booking?.pets.find((pet) => customer.pets.some((candidate) => candidate.id === pet.id))?.id ?? null;
  const serviceJobPetId = serviceJob?.petId ?? null;
  const validatedBranchId = booking?.branchId
    ?? (input.branchId && DEMO_BUSINESS_CONTEXTS.some((context) => context.businessId === input.businessId && context.branchId === input.branchId)
      ? input.branchId
      : null);

  const store = readInboxStore();
  const conversations = mergedPrototypeConversations(store);
  const existing = findReusablePrototypeConversation(conversations, input.businessId, customer.id);
  const now = new Date().toISOString();
  if (existing) {
    const next: PrototypeConversation = {
      ...existing,
      petId: petId || serviceJobPetId || bookingPetId || existing.petId,
      bookingId: booking?.bookingId ?? existing.bookingId,
      branchId: validatedBranchId ?? existing.branchId,
      serviceJobId: serviceJob?.serviceJobId ?? existing.serviceJobId,
      updatedAt: booking || petId || serviceJob ? now : existing.updatedAt,
    };
    if (next.petId === existing.petId && next.bookingId === existing.bookingId && next.branchId === existing.branchId && next.serviceJobId === existing.serviceJobId) {
      return { ok: true, conversation: clonePrototypeConversation(existing), reused: true };
    }
    store.conversations[next.conversationId] = next;
    if (!writeInboxStore(store)) return { ok: false, reason: "storage" };
    return { ok: true, conversation: clonePrototypeConversation(next), reused: true };
  }

  const conversation: PrototypeConversation = {
    conversationId: generatedPrototypeId("prototype-conversation"),
    businessId: customer.businessId,
    customerId: customer.id,
    petId: petId || serviceJobPetId || bookingPetId,
    bookingId: booking?.bookingId ?? null,
    branchId: validatedBranchId,
    serviceJobId: serviceJob?.serviceJobId ?? null,
    messages: [],
    unreadCount: 0,
    lastReadAt: now,
    createdAt: now,
    updatedAt: now,
  };
  store.conversations[conversation.conversationId] = conversation;
  if (!writeInboxStore(store)) return { ok: false, reason: "storage" };
  return { ok: true, conversation: clonePrototypeConversation(conversation), reused: false };
}

export function markPrototypeConversationReadValue(conversation: PrototypeConversation, readAt: string) {
  return {
    ...clonePrototypeConversation(conversation),
    unreadCount: 0,
    lastReadAt: readAt,
  } satisfies PrototypeConversation;
}

export function markPrototypeConversationRead(conversationId: string, businessId: string) {
  const store = readInboxStore();
  const conversation = mergedPrototypeConversations(store).find((item) => item.conversationId === conversationId) ?? null;
  if (!conversation || conversation.businessId !== businessId) return null;
  if (conversation.unreadCount === 0) return clonePrototypeConversation(conversation);
  const next = markPrototypeConversationReadValue(conversation, new Date().toISOString());
  store.conversations[next.conversationId] = next;
  return writeInboxStore(store) ? clonePrototypeConversation(next) : null;
}

export function appendPrototypeTextMessageValue(
  conversation: PrototypeConversation,
  text: string,
  messageId: string,
  sentAt: string,
) {
  const message: PrototypeTextMessage = {
    messageId,
    conversationId: conversation.conversationId,
    direction: "business",
    kind: "text",
    text: text.trim(),
    sentAt,
    deliveryState: "local-sent",
  };
  return {
    conversation: {
      ...clonePrototypeConversation(conversation),
      messages: [...conversation.messages.map(cloneMessage), message],
      updatedAt: sentAt,
    } satisfies PrototypeConversation,
    message,
  };
}

export type SendPrototypeMessageResult =
  | { ok: true; conversation: PrototypeConversation; message: PrototypeTextMessage }
  | { ok: false; reason: "missing" | "invalid" | "storage" };

export function sendPrototypeTextMessage(conversationId: string, businessId: string, text: string): SendPrototypeMessageResult {
  const normalized = text.trim();
  if (!normalized) return { ok: false, reason: "invalid" };
  const store = readInboxStore();
  const conversation = mergedPrototypeConversations(store).find((item) => item.conversationId === conversationId) ?? null;
  if (!conversation || conversation.businessId !== businessId) return { ok: false, reason: "missing" };
  const next = appendPrototypeTextMessageValue(conversation, normalized, generatedPrototypeId("prototype-message"), new Date().toISOString());
  store.conversations[next.conversation.conversationId] = next.conversation;
  if (!writeInboxStore(store)) return { ok: false, reason: "storage" };
  return { ok: true, conversation: clonePrototypeConversation(next.conversation), message: { ...next.message } };
}

export type CreatePrototypeAddServiceRequestResult =
  | { ok: true; conversation: PrototypeConversation; message: PrototypeAddServiceRequestMessage }
  | { ok: false; reason: "missing" | "invalid" | "booking-mismatch" | "storage" };

export function createPrototypeAddServiceRequest(input: {
  conversationId: string;
  businessId: string;
  bookingId: string;
  serviceJobId?: string | null;
  serviceName: string;
  additionalPrice: number;
  additionalMinutes: number;
  note?: string;
}): CreatePrototypeAddServiceRequestResult {
  const serviceName = input.serviceName.trim();
  if (!serviceName || !Number.isFinite(input.additionalPrice) || input.additionalPrice < 0 || !Number.isFinite(input.additionalMinutes) || input.additionalMinutes < 0) {
    return { ok: false, reason: "invalid" };
  }
  const store = readInboxStore();
  const conversation = mergedPrototypeConversations(store).find((item) => item.conversationId === input.conversationId) ?? null;
  if (!conversation || conversation.businessId !== input.businessId) return { ok: false, reason: "missing" };
  const booking = readPrototypeBooking(input.bookingId);
  if (!booking || booking.status === "cancelled" || booking.businessId !== conversation.businessId || booking.customer.id !== conversation.customerId) {
    return { ok: false, reason: "booking-mismatch" };
  }
  const serviceJobId = input.serviceJobId ?? conversation.serviceJobId ?? null;
  const serviceJob = serviceJobId ? readPrototypeGroomingServiceJob(serviceJobId) : null;
  if (serviceJobId && (!serviceJob || serviceJob.businessId !== conversation.businessId || serviceJob.customerId !== conversation.customerId || serviceJob.bookingId !== booking.bookingId)) {
    return { ok: false, reason: "booking-mismatch" };
  }

  const sentAt = new Date().toISOString();
  const message: PrototypeAddServiceRequestMessage = {
    messageId: generatedPrototypeId("prototype-request"),
    conversationId: conversation.conversationId,
    direction: "business",
    kind: "add-service-request",
    bookingId: booking.bookingId,
    serviceJobId: serviceJob?.serviceJobId ?? null,
    serviceName,
    additionalPrice: Math.round(input.additionalPrice),
    additionalMinutes: Math.round(input.additionalMinutes),
    note: input.note?.trim() ?? "",
    requestStatus: "waiting",
    respondedAt: null,
    responseSource: null,
    sentAt,
  };
  const next: PrototypeConversation = {
    ...clonePrototypeConversation(conversation),
    bookingId: booking.bookingId,
    branchId: booking.branchId,
    petId: booking.pets[0]?.id ?? conversation.petId,
    serviceJobId: serviceJob?.serviceJobId ?? conversation.serviceJobId,
    messages: [...conversation.messages.map(cloneMessage), message],
    updatedAt: sentAt,
  };
  store.conversations[next.conversationId] = next;
  if (!writeInboxStore(store)) return { ok: false, reason: "storage" };
  return { ok: true, conversation: clonePrototypeConversation(next), message: { ...message } };
}

export function applyPrototypeGuardianDecision(
  message: PrototypeAddServiceRequestMessage,
  decision: "approved" | "declined",
  respondedAt: string,
) {
  if (message.requestStatus !== "waiting") return { message: { ...message }, duplicate: true };
  return {
    message: {
      ...message,
      requestStatus: decision,
      respondedAt,
      responseSource: "guardian-local-preview",
    } satisfies PrototypeAddServiceRequestMessage,
    duplicate: false,
  };
}

export type SimulatePrototypeGuardianResponseResult =
  | { ok: true; conversation: PrototypeConversation; message: PrototypeAddServiceRequestMessage; duplicate: boolean }
  | { ok: false; reason: "missing" | "storage" };

// This explicitly models the smallest local Guardian-side test surface. The
// Business UI never receives a generic approve function or a way to attribute
// its own action as Guardian authority.
export function simulatePrototypeGuardianResponse(
  messageId: string,
  decision: "approved" | "declined",
): SimulatePrototypeGuardianResponseResult {
  const store = readInboxStore();
  const conversation = mergedPrototypeConversations(store).find((item) => item.messages.some((message) => message.messageId === messageId)) ?? null;
  if (!conversation) return { ok: false, reason: "missing" };
  const current = conversation.messages.find((message): message is PrototypeAddServiceRequestMessage => message.messageId === messageId && message.kind === "add-service-request") ?? null;
  if (!current) return { ok: false, reason: "missing" };
  const applied = applyPrototypeGuardianDecision(current, decision, new Date().toISOString());
  if (applied.duplicate) return { ok: true, conversation: clonePrototypeConversation(conversation), message: applied.message, duplicate: true };
  const next: PrototypeConversation = {
    ...clonePrototypeConversation(conversation),
    messages: conversation.messages.map((message) => message.messageId === messageId ? applied.message : cloneMessage(message)),
    updatedAt: applied.message.respondedAt ?? conversation.updatedAt,
  };
  store.conversations[next.conversationId] = next;
  if (!writeInboxStore(store)) return { ok: false, reason: "storage" };
  // The Guardian-only local simulator is the sole approval surface. An
  // approved Grooming request may update the linked execution Job's add-on
  // estimate; it never mutates the Booking or creates a Charge/Payment.
  if (decision === "approved") {
    applyPrototypeApprovedGroomingAddOn({
      serviceJobId: applied.message.serviceJobId ?? next.serviceJobId,
      bookingId: applied.message.bookingId,
      sourceRequestId: applied.message.messageId,
      serviceName: applied.message.serviceName,
      additionalPrice: applied.message.additionalPrice,
      additionalMinutes: applied.message.additionalMinutes,
      approvedAt: applied.message.respondedAt ?? new Date().toISOString(),
    });
  }
  return { ok: true, conversation: clonePrototypeConversation(next), message: { ...applied.message }, duplicate: false };
}

export function cancelPrototypeAddServiceRequest(messageId: string, businessId: string) {
  const store = readInboxStore();
  const conversation = mergedPrototypeConversations(store).find((item) => item.businessId === businessId && item.messages.some((message) => message.messageId === messageId)) ?? null;
  if (!conversation) return null;
  const current = conversation.messages.find((message): message is PrototypeAddServiceRequestMessage => message.messageId === messageId && message.kind === "add-service-request") ?? null;
  if (!current || current.requestStatus !== "waiting") return clonePrototypeConversation(conversation);
  const now = new Date().toISOString();
  const cancelled: PrototypeAddServiceRequestMessage = { ...current, requestStatus: "cancelled", respondedAt: now };
  const next: PrototypeConversation = {
    ...clonePrototypeConversation(conversation),
    messages: conversation.messages.map((message) => message.messageId === messageId ? cancelled : cloneMessage(message)),
    updatedAt: now,
  };
  store.conversations[next.conversationId] = next;
  return writeInboxStore(store) ? clonePrototypeConversation(next) : null;
}

export function getPrototypeInboxUnreadCount(contextOrBusinessId: DemoBusinessContext | string, fixtureOnly = false) {
  const conversations = fixtureOnly
    ? listPrototypeConversationFixtures(contextOrBusinessId)
    : listPrototypeConversations(contextOrBusinessId);
  return conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
}
