import { be1Error } from "../be1/errors";
import { validateId } from "../be1/validation";
import { choice, integer, object, string } from "../shared/validation";
import type { Be6Operation, InboxContext } from "./contracts";

export function parseInboxContext(value: unknown): InboxContext {
  const v = object(value);
  return { customerId: validateId(v.customerId), petId: v.petId == null ? null : validateId(v.petId), bookingId: v.bookingId == null ? null : validateId(v.bookingId), executionId: v.executionId == null ? null : validateId(v.executionId) };
}
export function parseBe6Operation(value: unknown): Be6Operation {
  const v = object(value), type = choice(v.type, ["inbox.list", "conversation.get", "conversation.ensure", "conversation.read", "message.send", "approval.request", "approval.cancel"] as const);
  const scope = { businessId: validateId(v.businessId), branchId: validateId(v.branchId) };
  if (type === "inbox.list") return { ...scope, type, afterId: v.afterId == null ? "" : string(v.afterId, 100), limit: v.limit == null ? 50 : integer(v.limit, 1, 50) };
  if (type === "conversation.get") return { ...scope, type, conversationId: validateId(v.conversationId), beforeSequence: v.beforeSequence == null ? undefined : integer(v.beforeSequence, 1, Number.MAX_SAFE_INTEGER) };
  const requestKey = validateId(v.requestKey);
  if (type === "conversation.ensure") return { ...scope, type, requestKey, context: parseInboxContext(v.context) };
  const conversationId = validateId(v.conversationId);
  if (type === "conversation.read") return { ...scope, type, requestKey, conversationId, throughSequence: integer(v.throughSequence, 0, Number.MAX_SAFE_INTEGER) };
  if (type === "approval.cancel") return { ...scope, type, requestKey, conversationId, messageId: validateId(v.messageId), expectedRevision: integer(v.expectedRevision, 1, 2147483647) };
  const context = parseInboxContext(v.context);
  if (type === "message.send") return { ...scope, type, requestKey, conversationId, context, text: string(v.text, 5000, true) };
  if (!context.bookingId) throw be1Error("INVALID_INPUT");
  return { ...scope, type, requestKey, conversationId, context, serviceName: string(v.serviceName, 80, true), additionalPrice: integer(v.additionalPrice, 0, 10000000), additionalMinutes: integer(v.additionalMinutes, 0, 1440), note: string(v.note, 1000) };
}
