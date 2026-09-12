import { readBusinessSession } from "../be1/configurationCache";
import { businessCommand } from "../shared/client";
import type { Be6Operation, ConversationView, InboxContext, InboxDirectory, MessageView } from "./contracts";
import type { PrototypeAddServiceRequestMessage, PrototypeTextMessage } from "../../_prototype/inboxState";

const cache = new Map<string, ConversationView[]>(), loading = new Map<string, Promise<void>>(), queues = new Map<string, Promise<unknown>>(), pendingKeys = new Map<string, string>();
const recentScopes = new Map<string, string>();
function scopeKey(businessId: string, branchId: string) {
  const s = readBusinessSession(), w = s?.workspaces.find((w) => w.business.id === businessId);
  if (!s || !w || !w.permittedBranches.some((b) => b.id === branchId)) return null;
  return JSON.stringify([s.person.id, businessId, branchId, w.membership.id, w.membership.role, w.permittedBranches.map((b) => b.id).sort()]);
}
function announce() { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("meawketting:business-state")); }
function install(businessId: string, branchId: string, data: ConversationView[], actorKey: string) {
  if (actorKey !== scopeKey(businessId, branchId) || data.some((c) => c.businessId !== businessId)) throw new Error("Inbox scope changed");
  cache.set(actorKey, structuredClone(data)); announce();
}
export function readInboxDirectory(businessId: string, branchId: string) {
  const key = scopeKey(businessId, branchId); return key ? structuredClone(cache.get(key) ?? []) : [];
}
function patch(branchId: string, view: ConversationView, key: string) {
  const old = readInboxDirectory(view.businessId, branchId);
  const previous = old.find((c) => c.conversationId === view.conversationId);
  const messages = [...new Map([...(previous?.messages ?? []), ...view.messages].map((m) => [m.messageId, m])).values()].sort((a, b) => a.sequence - b.sequence);
  install(view.businessId, branchId, [...old.filter((c) => c.conversationId !== view.conversationId), { ...view, messages }], key);
  recentScopes.set(JSON.stringify([readBusinessSession()?.person.id, view.businessId, view.conversationId]), branchId);
}
function find(businessId: string, id: string) {
  const s = readBusinessSession(), w = s?.workspaces.find((w) => w.business.id === businessId);
  const recent = recentScopes.get(JSON.stringify([s?.person.id, businessId, id]));
  for (const branch of [...(w?.permittedBranches ?? [])].sort((a, b) => Number(b.id === recent) - Number(a.id === recent))) {
    const c = readInboxDirectory(businessId, branch.id).find((c) => c.conversationId === id); if (c) return c;
  }
  return null;
}
export function isInboxLoaded(businessId: string, branchId: string) { const key = scopeKey(businessId, branchId); return Boolean(key && cache.has(key)); }
const request = <T>(op: Be6Operation) => businessCommand<T>("/api/be6", op);
function enqueue<T>(key: string, action: () => Promise<T>) {
  const result = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(action), tail = result.then(() => undefined, () => undefined);
  queues.set(key, tail); void tail.finally(() => { if (queues.get(key) === tail) queues.delete(key); }); return result;
}
async function mutate(op: Exclude<Be6Operation, { type: "inbox.list" | "conversation.get" }> ) {
  const key = scopeKey(op.businessId, op.branchId); if (!key) throw new Error("Inbox unavailable");
  return enqueue(key, async () => {
    const fingerprint = JSON.stringify([key, { ...op, requestKey: null }]), requestKey = pendingKeys.get(fingerprint) ?? op.requestKey; pendingKeys.set(fingerprint, requestKey);
    try {
      const result = await request<ConversationView>({ ...op, requestKey }); pendingKeys.delete(fingerprint); patch(op.branchId, result, key); return result;
    } catch (error) {
      if (error instanceof Error && "code" in error && ["CONFLICT", "FORBIDDEN", "NOT_FOUND", "INVALID_INPUT"].includes(String(error.code))) pendingKeys.delete(fingerprint);
      throw error;
    }
  });
}
export function ensureDurableInbox(businessId: string, branchId: string, force = false) {
  const key = scopeKey(businessId, branchId); if (!key) return Promise.reject(new Error("Inbox unavailable"));
  if (!force && cache.has(key)) return Promise.resolve();
  const existing = loading.get(key); if (existing) return existing;
  const task = enqueue(key, async () => {
    const all: ConversationView[] = []; let afterId = "";
    for (let page = 0; page < 10000; page++) {
      const next = await request<InboxDirectory>({ type: "inbox.list", businessId, branchId, afterId, limit: 50 }); all.push(...next.conversations);
      if (!next.nextAfterId) {
        const previous = readInboxDirectory(businessId, branchId);
        install(businessId, branchId, all.map((c) => ({ ...c, messages: [...new Map([...(previous.find((p) => p.conversationId === c.conversationId)?.messages ?? []), ...c.messages].map((m) => [m.messageId, m])).values()].sort((a, b) => a.sequence - b.sequence) })), key); return;
      }
      if (next.nextAfterId <= afterId) throw new Error("Inbox pagination failed"); afterId = next.nextAfterId;
    }
    throw new Error("Inbox directory too large");
  }).finally(() => loading.delete(key)); loading.set(key, task); return task;
}
export async function loadDurableConversation(businessId: string, branchId: string, conversationId: string) {
  const key = scopeKey(businessId, branchId); if (!key) throw new Error("Inbox unavailable");
  return enqueue(key, async () => {
    let beforeSequence: number | undefined; const messages: MessageView[] = [];
    for (let page = 0; page < 10000; page++) {
      const next = await request<ConversationView>({ type: "conversation.get", businessId, branchId, conversationId, beforeSequence }); messages.unshift(...next.messages);
      if (!next.hasOlderMessages) { const result = { ...next, messages, hasOlderMessages: false }; patch(branchId, result, key); return result; }
      const cursor = next.messages[0]?.sequence; if (!cursor || (beforeSequence && cursor >= beforeSequence)) throw new Error("Message pagination failed"); beforeSequence = cursor;
    }
    throw new Error("Conversation too large");
  });
}
export async function ensureDurableConversation(input: { businessId: string; branchId?: string | null; customerId: string; petId?: string | null; bookingId?: string | null; serviceJobId?: string | null }) {
  try {
    if (!input.branchId) throw new Error("Missing Branch");
    const known = readInboxDirectory(input.businessId, input.branchId).some((c) => c.customerId === input.customerId);
    const conversation = await mutate({ type: "conversation.ensure", businessId: input.businessId, branchId: input.branchId, requestKey: crypto.randomUUID(), context: {
      customerId: input.customerId, petId: input.petId ?? null, bookingId: input.bookingId ?? null, executionId: input.serviceJobId ?? null } });
    return { ok: true as const, conversation, reused: Boolean(known) };
  } catch { return { ok: false as const, reason: "invalid-context" as const }; }
}
function context(c: ConversationView): InboxContext { return { customerId: c.customerId, petId: c.petId, bookingId: c.bookingId, executionId: c.serviceJobId }; }
export async function sendDurableTextMessage(conversationId: string, businessId: string, text: string) {
  try {
    const c = find(businessId, conversationId); if (!c?.branchId) throw new Error("Missing Conversation");
    const conversation = await mutate({ type: "message.send", businessId, branchId: c.branchId, conversationId, text, context: context(c), requestKey: crypto.randomUUID() });
    return { ok: true as const, conversation, message: conversation.messages.at(-1) as PrototypeTextMessage };
  } catch { return { ok: false as const, reason: "storage" as const }; }
}
export async function createDurableAddServiceRequest(input: { conversationId: string; businessId: string; bookingId: string; serviceJobId?: string | null; serviceName: string; additionalPrice: number; additionalMinutes: number; note?: string }) {
  try {
    const c = find(input.businessId, input.conversationId); if (!c?.branchId) throw new Error("Missing Conversation");
    const conversation = await mutate({ type: "approval.request", businessId: input.businessId, branchId: c.branchId, conversationId: input.conversationId, context: { ...context(c), bookingId: input.bookingId, executionId: input.serviceJobId ?? c.serviceJobId },
      serviceName: input.serviceName, additionalPrice: input.additionalPrice, additionalMinutes: input.additionalMinutes, note: input.note ?? "", requestKey: crypto.randomUUID() });
    return { ok: true as const, conversation, message: conversation.messages.at(-1) as PrototypeAddServiceRequestMessage };
  } catch { return { ok: false as const, reason: "booking-mismatch" as const }; }
}
export async function cancelDurableAddServiceRequest(messageId: string, businessId: string) {
  const workspace = readBusinessSession()?.workspaces.find((w) => w.business.id === businessId);
  for (const branch of workspace?.permittedBranches ?? []) {
    const c = readInboxDirectory(businessId, branch.id).find((c) => c.messages.some((m) => m.messageId === messageId)), m = c?.messages.find((m) => m.messageId === messageId);
    if (!c || !m) continue;
    try { return await mutate({ type: "approval.cancel", businessId, branchId: m.branchId, conversationId: c.conversationId, messageId, expectedRevision: m.revision, requestKey: crypto.randomUUID() }); } catch { return null; }
  }
  return null;
}
export async function markDurableConversationRead(conversationId: string, businessId: string, branchId: string) {
  const c = readInboxDirectory(businessId, branchId).find((c) => c.conversationId === conversationId);
  if (!c || c.unreadCount === 0) return c ?? null;
  return mutate({ type: "conversation.read", businessId, branchId, conversationId, throughSequence: Math.max(0, ...c.messages.map((m) => m.sequence)), requestKey: crypto.randomUUID() });
}
