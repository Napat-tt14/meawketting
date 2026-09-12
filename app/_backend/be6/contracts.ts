import type { PrototypeConversation, PrototypeInboxMessage } from "../../_prototype/inboxState";

export type InboxContext = { customerId: string; petId: string | null; bookingId: string | null; executionId: string | null };
export type MessageView = PrototypeInboxMessage & { sequence: number; branchId: string; revision: number };
export type ConversationView = Omit<PrototypeConversation, "messages"> & { messages: MessageView[]; contextRevision: number; hasOlderMessages: boolean };
export type InboxDirectory = { conversations: ConversationView[]; nextAfterId: string | null };
export type Be6Scope = { businessId: string; branchId: string };
export type Be6Operation = Be6Scope & (
  | { type: "inbox.list"; afterId?: string; limit?: number }
  | { type: "conversation.get"; conversationId: string; beforeSequence?: number }
  | { type: "conversation.ensure"; context: InboxContext; requestKey: string }
  | { type: "conversation.read"; conversationId: string; throughSequence: number; requestKey: string }
  | { type: "message.send"; conversationId: string; context: InboxContext; text: string; requestKey: string }
  | { type: "approval.request"; conversationId: string; context: InboxContext; serviceName: string; additionalPrice: number; additionalMinutes: number; note: string; requestKey: string }
  | { type: "approval.cancel"; conversationId: string; messageId: string; expectedRevision: number; requestKey: string }
);
export type IncomingMessage = { eventId: string; providerMessageId: string; externalSubject: string; text: string; occurredAt: string };
export type Channel = { id: string; businessId: string; branchId: string; provider: "line" | "mock"; state: "active" | "disconnected"; externalAccountId: string; secretRef: string };
export type SendEnvelope = { retryKey: string; recipient: string; text: string };
export type SendOutcome = { state: "accepted"; providerMessageId: string | null; providerRequestId: string | null } | { state: "retry" | "failed" | "not-connected"; code: string };
export interface ChannelAdapter {
  readonly provider: "line" | "mock";
  verify(rawBody: Uint8Array, signature: string): Promise<boolean>;
  decode(rawBody: Uint8Array, accountId: string): IncomingMessage[];
  send(envelope: SendEnvelope): Promise<SendOutcome>;
}
