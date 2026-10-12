import { readBusinessSession } from "../be1/configurationCache";
import { businessCommand, BusinessRequestError, matchesBusinessReadScope } from "../shared/client";
import type { Be6Operation, ConversationView, InboxContext, InboxDirectory, MessageView } from "./contracts";
import type { PrototypeAddServiceRequestMessage, PrototypeTextMessage } from "../../_prototype/inboxState";

const cache = new Map<string, ConversationView[]>(), loading = new Map<string, Promise<void>>(), queues = new Map<string, Promise<unknown>>(), pendingKeys = new Map<string, string>();
const recentScopes = new Map<string, string>();
const conversationRequests = new Map<string, { promise: Promise<ConversationView>; signal?: AbortSignal }>(), latestReads = new Map<string, number>(), directoryReads = new Map<string, number>(), loadingSignals = new Map<string, AbortSignal | undefined>();
const latestSequences = new Map<string, number>();
function permissionChanged(before: ConversationView | undefined, after: ConversationView) { return Boolean(before && JSON.stringify(before.readableBranchIds?.slice().sort()) !== JSON.stringify(after.readableBranchIds?.slice().sort())); }
function scopeKey(businessId: string, branchId: string) {
  const s = readBusinessSession(), w = s?.workspaces.find((w) => w.business.id === businessId);
  if (!s || !w || w.membership.status !== "active" || !w.permittedBranches.some((b) => b.id === branchId)) return null;
  return JSON.stringify([s.person.id, businessId, branchId, w.membership.id, w.membership.role, w.membership.updatedAt, w.permittedBranches.map((b) => [b.id, b.updatedAt]).sort()]);
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
  // A committed mutation stays acknowledged when its old UI scope has changed.
  if (key !== scopeKey(view.businessId, branchId) || (view.readScope && !matchesBusinessReadScope(view.businessId, view.readScope))) return;
  const old = readInboxDirectory(view.businessId, branchId);
  const previous = old.find((c) => c.conversationId === view.conversationId);
  const allowed = new Set(view.readableBranchIds ?? [view.branchId]);
  const merged = new Map((permissionChanged(previous, view) ? [] : previous?.messages.filter(m => allowed.has(m.branchId)) ?? []).map(m => [m.messageId, m]));
  for (const message of [...view.messages, ...(view.refreshedMessages ?? [])]) if (allowed.has(message.branchId) && (merged.get(message.messageId)?.revision ?? 0) <= message.revision) merged.set(message.messageId, message);
  const messages = [...merged.values()].sort((a, b) => a.sequence - b.sequence);
  const keepCursor = !permissionChanged(previous, view) && previous?.messages[0] && view.messages[0] && previous.messages[0].sequence < view.messages[0].sequence;
  install(view.businessId, branchId, [...old.filter((c) => c.conversationId !== view.conversationId), { ...view, messages, hasOlderMessages: keepCursor ? previous!.hasOlderMessages : view.hasOlderMessages }], key);
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
export function ensureDurableInbox(businessId: string, branchId: string, force = false, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const key = scopeKey(businessId, branchId); if (!key) return Promise.reject(new BusinessRequestError("FORBIDDEN", undefined, "Inbox unavailable", 403));
  if (!force && cache.has(key) && Date.now() - (directoryReads.get(key) ?? 0) < 10_000) return Promise.resolve();
  const existing = loading.get(key); if (existing && !loadingSignals.get(key)?.aborted) return existing;
  const task = enqueue(key, async () => {
    const all: ConversationView[] = []; let afterId = "";
    for (let page = 0; page < 10000; page++) {
      const next = await businessCommand<InboxDirectory>("/api/be6", { type: "inbox.list", businessId, branchId, afterId, limit: 50 }, signal); signal?.throwIfAborted(); all.push(...next.conversations);
      if (next.conversations.length > 50 || next.conversations.some((c, i) => c.conversationId <= afterId || (i > 0 && c.conversationId <= next.conversations[i - 1].conversationId))
        || (next.nextAfterId && (!next.conversations.length || next.nextAfterId !== next.conversations.at(-1)!.conversationId))) throw new Error("Inbox pagination made no progress");
      if (!next.nextAfterId) {
        const previous = readInboxDirectory(businessId, branchId);
        install(businessId, branchId, all.map((c) => {
          const old = previous.find(p => p.conversationId === c.conversationId), allowed = new Set(c.readableBranchIds ?? [c.branchId]);
          const changed = permissionChanged(old, c);
          if (changed) { latestReads.delete(`${key}:${c.conversationId}`); latestSequences.delete(`${key}:${c.conversationId}`); }
          return { ...c, hasOlderMessages: !changed && old ? old.hasOlderMessages : c.hasOlderMessages, messages: [...new Map([...(changed ? [] : old?.messages.filter(m => allowed.has(m.branchId)) ?? []), ...c.messages].map(m => [m.messageId, m])).values()].sort((a, b) => a.sequence - b.sequence) };
        }), key); directoryReads.set(key, Date.now()); return;
      }
      if (next.nextAfterId <= afterId) throw new Error("Inbox pagination failed"); afterId = next.nextAfterId;
    }
    throw new Error("Inbox directory too large");
  }).finally(() => { if (loading.get(key) === task) { loading.delete(key); loadingSignals.delete(key); } }); loading.set(key, task); loadingSignals.set(key, signal); return task;
}
export async function loadCustomerInbox(businessId: string, branchId: string, customerId: string, signal?: AbortSignal) {
  const key = scopeKey(businessId, branchId); if (!key) throw new BusinessRequestError("FORBIDDEN", undefined, "Inbox unavailable", 403);
  let afterId = "";
  for (let page = 0; page < 10_000; page++) {
    const value = await businessCommand<InboxDirectory>("/api/be6", { type: "inbox.list", businessId, branchId, customerId, afterId, limit: 50 }, signal);
    signal?.throwIfAborted();
    if (value.conversations.some(c => c.customerId !== customerId || c.conversationId <= afterId) || (value.nextAfterId && (!value.conversations.length || value.nextAfterId !== value.conversations.at(-1)!.conversationId))) throw new Error("Customer inbox pagination made no progress");
    value.conversations.forEach(c => patch(branchId, c, key));
    if (!value.nextAfterId) return; if (value.nextAfterId <= afterId) throw new Error("Customer inbox pagination made no progress"); afterId = value.nextAfterId;
  }
  throw new Error("Customer inbox too large");
}
export function loadDurableConversation(businessId: string, branchId: string, conversationId: string, read: { older?: boolean; force?: boolean; signal?: AbortSignal } = {}): Promise<ConversationView> {
  read.signal?.throwIfAborted();
  const key = scopeKey(businessId, branchId); if (!key) return Promise.reject(new BusinessRequestError("FORBIDDEN", undefined, "Inbox unavailable", 403));
  const previous = readInboxDirectory(businessId, branchId).find(c => c.conversationId === conversationId);
  const id = `${key}:${conversationId}`, requestId = `${id}:${read.older ? previous?.messages[0]?.sequence ?? "older" : "latest"}`, pending = conversationRequests.get(requestId);
  if (pending && !pending.signal?.aborted) return pending.promise;
  if (!read.older && read.force === false && previous && Date.now() - (latestReads.get(id) ?? 0) < 10_000) return Promise.resolve(previous);
  if (read.older && previous && !previous.hasOlderMessages) return Promise.resolve(previous);
  const promise = (async () => {
    const watermark = latestSequences.get(id);
    let beforeSequence = read.older ? previous?.messages[0]?.sequence : undefined;
    const messages: MessageView[] = [], refreshedMessages: MessageView[] = [];
    for (let page = 0; page < 10000; page++) {
      const refreshMessageIds = !read.older && page === 0 ? previous?.messages.filter(m => (m.kind === "add-service-request" && m.requestStatus === "waiting") || (m.kind === "text" && ["queued", "not-connected"].includes(m.deliveryState ?? ""))).map(m => m.messageId) : undefined;
      const next = await businessCommand<ConversationView>("/api/be6", { type: "conversation.get", businessId, branchId, conversationId, beforeSequence, refreshMessageIds: refreshMessageIds?.slice(0, 1000) }, read.signal);
      read.signal?.throwIfAborted();
      if (scopeKey(businessId, branchId) !== key || next.businessId !== businessId || next.conversationId !== conversationId || [...next.messages, ...(next.refreshedMessages ?? [])].some(m => m.conversationId !== conversationId)) throw new Error("Inbox scope changed");
      if ((next.hasOlderMessages && next.messages.length === 0) || next.messages.some((m, i) => (beforeSequence && m.sequence >= beforeSequence) || (i > 0 && m.sequence <= next.messages[i - 1].sequence))) throw new Error("Message pagination failed");
      if (!read.older && page === 0 && refreshMessageIds && refreshMessageIds.length > 1000) {
        for (let offset = 1000; offset < refreshMessageIds.length; offset += 1000) {
          const extra = await businessCommand<ConversationView>("/api/be6", { type: "conversation.get", businessId, branchId, conversationId, refreshMessageIds: refreshMessageIds.slice(offset, offset + 1000) }, read.signal);
          read.signal?.throwIfAborted(); next.refreshedMessages = [...(next.refreshedMessages ?? []), ...(extra.refreshedMessages ?? [])];
        }
      }
      refreshedMessages.push(...(next.refreshedMessages ?? []));
      messages.unshift(...next.messages);
      if (read.older || !watermark || !next.hasOlderMessages || (next.messages[0]?.sequence ?? 0) <= watermark) {
        const keepHistoryCursor = !permissionChanged(previous, next) && !read.older && previous?.messages.length && next.messages[0] && previous.messages[0].sequence < next.messages[0].sequence;
        const result = { ...next, messages, refreshedMessages, hasOlderMessages: keepHistoryCursor ? previous!.hasOlderMessages : next.hasOlderMessages };
        patch(branchId, result, key); if (!read.older) { latestReads.set(id, Date.now()); if (messages.at(-1)) latestSequences.set(id, messages.at(-1)!.sequence); }
        return readInboxDirectory(businessId, branchId).find(c => c.conversationId === conversationId)!;
      }
      const cursor = next.messages[0]?.sequence; if (!cursor || (beforeSequence && cursor >= beforeSequence)) throw new Error("Message pagination failed"); beforeSequence = cursor;
    }
    throw new Error("Conversation too large");
  })().finally(() => { if (conversationRequests.get(requestId)?.promise === promise) conversationRequests.delete(requestId); });
  conversationRequests.set(requestId, { promise, signal: read.signal }); return promise;
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
