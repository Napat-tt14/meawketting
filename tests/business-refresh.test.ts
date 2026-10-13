import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { writeFileSync } from "node:fs";
import { BE1_WEEKDAYS, type BusinessSessionView } from "../app/_backend/be1/contracts";
import { ensureBusinessSession } from "../app/_backend/be1/client";
import { installBusinessSession, readBusinessSession } from "../app/_backend/be1/configurationCache";
import { ensureDurableCustomerDirectory, searchDurableCustomers, updateDurableCustomerNotes } from "../app/_backend/be2/client";
import { readBe2DirectoryStatus, readBe2Customer } from "../app/_backend/be2/customerPetCache";
import { queryDurableBookings, updateDurableBooking } from "../app/_backend/be3/client";
import { patchBe3Booking, readBe3DirectoryStatus, readKnownBe3Bookings } from "../app/_backend/be3/bookingCache";
import { loadFilteredOperations, mutateOperations } from "../app/_backend/be4/client";
import { installOperations, operationsComplete, readExecution, readOperationDirectory } from "../app/_backend/be4/operationsCache";
import type { StaffView } from "../app/_backend/be4/contracts";
import type { BookingView, UpdateBookingInput } from "../app/_backend/be3/contracts";
import type { ChargeBalanceView, PaymentView } from "../app/_backend/be7/contracts";
import { ensureDurableInbox, loadDurableConversation, readInboxDirectory } from "../app/_backend/be6/client";
import type { ConversationView, MessageView } from "../app/_backend/be6/contracts";
import { chargePaymentsReady, checkoutDurableCharge, ensureDurableBilling, loadChargePayments, recordDurablePayment, readFinancialDirectory } from "../app/_backend/be7/client";
import { ensureDurableReport, ensureDurableSummary, loadCrmPage, readCrm } from "../app/_backend/be8/client";
import { emptyCrm, emptyReport } from "../app/_backend/be8/projections";
import { businessCommand, clearBusinessReadFailures, invalidateBusinessData } from "../app/_backend/shared/client";
import { startBusinessRefresh } from "../app/_backend/shared/refresh";
import { businessStartupPages, ensureBusinessPageData, isBusinessPagePrepared, isBusinessWorkspacePrepared, prepareBusinessWorkspace } from "../app/business/_components/businessPageData";
import { BUSINESS_NAVIGATION_HREFS } from "../app/business/_components/businessNavigationModel";
import { expireIntakeLease, loadDurableIntake, readCachedIntake } from "../app/_backend/be5/client";

let fixtureId = 0;
const comparisons: Record<string, unknown>[] = [];
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function fixture(t: TestContext) {
  const id = `refresh_${fixtureId++}`, stamp = "2026-10-12T00:00:00.000Z";
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: Date.parse(stamp) });
  let monotonic = 1000;
  t.mock.method(performance, "now", () => monotonic);
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window"), oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document"), oldFetch = globalThis.fetch;
  const readers: { stop: () => void }[] = [];
  const browser = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false });
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  const common = { status: "active" as const, createdAt: stamp, updatedAt: stamp };
  const session: BusinessSessionView = { person: { id: `person_${id}`, displayName: "Owner", primaryEmail: null, ...common }, workspaces: [{
    business: { id, name: id, contactName: "Owner", phone: "0800000000", email: "", description: "", address: "", logoUrl: null, ...common },
    membership: { id: `member_${id}`, personId: `person_${id}`, businessId: id, role: "OWNER", ...common },
    permittedBranches: ["one", "two"].map(branch => ({ id: `${id}_${branch}`, businessId: id, name: branch, area: "", address: "", phone: "", email: "", timezone: "Asia/Bangkok", enabledModules: ["grooming"], operatingHours: BE1_WEEKDAYS.map(day => ({ day, closed: true, open: "09:00", close: "18:00" })), ...common })),
  }] };
  installBusinessSession(session); clearBusinessReadFailures();
  const scope = { businessId: id, branchId: `${id}_one` }, context = { ...scope, key: `${id}:one`, role: "เจ้าของ", memberLabel: "Owner" };
  const calls: Record<string, unknown>[] = [];
  let messageCount = 2000, badMessages = false, allowed = session.workspaces[0].permittedBranches.map(b => b.id), response: ((op: Record<string, unknown>, signal?: AbortSignal) => Promise<Response> | Response) | undefined;
  const view = (sequences: number[], older: boolean): ConversationView => ({ ...scope, conversationId: "conversation_refresh", customerId: "customer_refresh", petId: null, bookingId: null, serviceJobId: null, contextRevision: 1,
    messages: sequences.map(sequence => ({ sequence, messageId: `msg_${sequence}`, conversationId: "conversation_refresh", branchId: sequence % 2 ? scope.branchId : `${id}_two`, revision: 1, kind: "text", direction: "customer", text: `Message ${sequence}`, sentAt: stamp, deliveryState: null })),
    hasOlderMessages: older, unreadCount: 0, lastReadAt: null, createdAt: stamp, updatedAt: stamp, readableBranchIds: allowed });
  const ok = (data: unknown) => new Response(JSON.stringify({ ok: true, data }), { headers: { "content-type": "application/json" } });
  globalThis.fetch = async (_url, init) => {
    const op = JSON.parse(String(init?.body)); calls.push(op);
    if (response) return response(op, init?.signal ?? undefined);
    let data: unknown;
    switch (op.type) {
      case "session.resolve": data = session; break;
      case "customer.list": case "booking.list": data = { items: [], total: 0, offset: op.input.offset, limit: 100 }; break;
      case "booking.catalog": data = { businessId: op.businessId, branchId: op.branchId, services: [], resources: [] }; break;
      case "operations.list": data = { executions: [], records: [], staff: [], rooms: [] }; break;
      case "charges.list": data = { balances: [], nextAfterId: null }; break;
      case "payments.list": data = { payments: [], refunds: [], nextAfterId: null }; break;
      case "reports.get": data = emptyReport(op.options ?? {}, new Date().toISOString(), "Asia/Bangkok", id, "One"); break;
      case "home.summary": case "billing.summary": data = { generatedAt: new Date().toISOString(), revenueSummary: emptyReport({}, new Date().toISOString(), "Asia/Bangkok").revenueSummary, bookings: [], bookingTrend: [], waitingIntake: 0, unreadMessages: 0 }; break;
      case "inbox.list": data = { conversations: [view([messageCount], true)], nextAfterId: null }; break;
      case "conversation.get": {
        const end = Math.min(messageCount, (op.beforeSequence ?? messageCount + 1) - 1), start = Math.max(1, end - 99);
        data = badMessages ? view([], true) : view(Array.from({ length: end - start + 1 }, (_, i) => start + i), start > 1); break;
      }
      case "crm.list": {
        const all = Array.from({ length: 1000 }, (_, i) => `c_${String(i).padStart(4, "0")}`).filter(customer => customer > (op.afterId ?? "") && (!op.query || customer.includes(op.query)));
        const selected = all.slice(op.offset ?? 0, (op.offset ?? 0) + (op.limit ?? 50));
        data = { generatedAt: new Date().toISOString(), items: selected.map(customer => ({ profile: emptyCrm(customer), upcoming: [], timeline: [], timelineNext: null })),
          customers: selected.map(customer => ({ id: customer, businessId: id, displayName: customer, phone: null, email: null, businessNotes: "", tags: [], pets: [], ...common })),
          total: all.length, segments: { all: 1000, new: 1000, regular: 0, inactive: 0, "no-next-booking": 1000, grooming: 0, hotel: 0, daycare: 0 }, nextAfterId: all.length > (op.offset ?? 0) + selected.length ? selected.at(-1) : null,
          ...(op.offset !== undefined ? { nextOffset: all.length > op.offset + selected.length ? op.offset + selected.length : null } : {}) }; break;
      }
      default: throw new Error(`Unexpected ${op.type}`);
    }
    return ok(data);
  };
  const cleanup = () => {
    readers.forEach(reader => reader.stop());
    globalThis.fetch = oldFetch;
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else Reflect.deleteProperty(globalThis, "window");
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument); else Reflect.deleteProperty(globalThis, "document");
  };
  t.after(cleanup);
  return { scope, context, session, calls, browser, doc, view, ok,
    track: (reader: { stop: () => void }) => readers.push(reader),
    respond: (fn: typeof response) => { response = fn; }, messages: (n: number) => { messageCount = n; }, malformed: () => { badMessages = true; }, branches: (ids: string[]) => { allowed = ids; },
    advance: async (ms: number) => { monotonic += ms; t.mock.timers.tick(ms); await flush(); t.mock.timers.tick(0); await flush(); },
    hide: (hidden: boolean) => { doc.hidden = hidden; doc.dispatchEvent(new Event("visibilitychange")); },
  };
}

test("CRM loads one page/search, reuses scoped cache, invalidates on mutation, and never marks full directory ready", async t => {
  const f = fixture(t);
  await ensureBusinessPageData("/business/customers", f.context); assert.equal(f.calls.length, 0);
  const first = await loadCrmPage(f.scope, { offset: 0 }); assert.equal(first.items.length, 50); assert.equal(f.calls.length, 1);
  await loadCrmPage(f.scope, { offset: 0 }); assert.equal(f.calls.length, 1);
  const second = await loadCrmPage(f.scope, { offset: first.nextOffset! }); assert.equal(second.items[0].profile.customerId, "c_0050"); assert.equal(f.calls.length, 2);
  await loadCrmPage(f.scope, { offset: 0 }); assert.equal(f.calls.length, 2);
  const search = await loadCrmPage(f.scope, { offset: 0, query: "0999" }); assert.equal(search.items.length, 1); assert.equal(f.calls.length, 3);
  assert.equal(readBe2DirectoryStatus(f.scope.businessId), "idle");
  invalidateBusinessData(f.scope.businessId); await loadCrmPage(f.scope, { offset: 0 }); assert.equal(f.calls.length, 4);
  const before = f.calls.length;
  installBusinessSession({ ...f.session, person: { ...f.session.person, id: "another_person" } });
  assert.equal(readCrm(f.scope, "c_0000").profile.customerId, "c_0000");
  await loadCrmPage(f.scope); assert.equal(f.calls.length, before + 1);
  await assert.rejects(loadCrmPage({ ...f.scope, branchId: "private_branch" }), /scope unavailable/);
  await assert.rejects(loadCrmPage({ businessId: "other_business", branchId: f.scope.branchId }), /scope unavailable/);
  comparisons.push({ scenario: "CRM 1000 customers initial", before: 20, after: 1, cachedRepeat: 0, search: 1, nextPage: 1 });
});

test("CRM rejects empty/cyclic/duplicate pagination and abandons an old Person's delayed result", async t => {
  const f = fixture(t);
  f.respond(() => f.ok({ generatedAt: new Date().toISOString(), items: [], nextAfterId: "c_0001" }));
  await assert.rejects(loadCrmPage(f.scope), /pagination/); assert.equal(f.calls.length, 1);
  f.respond(() => f.ok({ generatedAt: new Date().toISOString(), items: [{ profile: emptyCrm("c_0001") }], nextAfterId: "c_0001" }));
  await assert.rejects(loadCrmPage(f.scope, { afterId: "c_0001" }), /pagination/); assert.equal(f.calls.length, 2);
  f.respond(() => f.ok({ generatedAt: new Date().toISOString(), items: [{ profile: emptyCrm("c_0001") }, { profile: emptyCrm("c_0001") }], nextAfterId: null }));
  await assert.rejects(loadCrmPage(f.scope), /pagination/);
  f.respond(() => f.ok({ generatedAt: new Date().toISOString(), items: [], nextAfterId: null, nextOffset: 50 }));
  await assert.rejects(loadCrmPage(f.scope, { offset: 0 }), /pagination/);
  let resolve!: (value: Response) => void;
  f.respond(() => new Promise<Response>(r => { resolve = r; }));
  const stale = loadCrmPage(f.scope);
  installBusinessSession({ ...f.session, person: { ...f.session.person, id: "new_person" } });
  resolve(f.ok({ generatedAt: new Date().toISOString(), items: [], nextAfterId: null }));
  await assert.rejects(stale, { name: "AbortError" });
});

test("A read from another authenticated Person or a wider grant set never enters the scoped cache", async t => {
  const f = fixture(t);
  f.respond(() => new Response(JSON.stringify({ ok: true, data: {} }), { headers: { "x-meawketting-person-id": "another_authenticated_person" } }));
  await assert.rejects(loadCrmPage(f.scope), /ยืนยันบัญชี/); assert.equal(readBusinessSession(), null);
  installBusinessSession(f.session);
  const w = f.session.workspaces[0];
  f.respond(() => f.ok({ readScope: { personId: f.session.person.id, membershipId: w.membership.id, role: w.membership.role, membershipUpdatedAt: w.membership.updatedAt, branches: [{ id: "unconfirmed_branch", updatedAt: w.membership.updatedAt }] } }));
  await assert.rejects(loadCrmPage(f.scope), /ยืนยันบัญชี/); assert.equal(readBusinessSession(), null);
  assert.deepEqual(readInboxDirectory(f.scope.businessId, f.scope.branchId), []);
});

test("CRM concurrent reads deduplicate and hidden/event-driven refresh never scans all 1000 Customers", async t => {
  const f = fixture(t); await Promise.all([loadCrmPage(f.scope), loadCrmPage(f.scope)]); assert.equal(f.calls.length, 1);
  let initial = true;
  const reader = startBusinessRefresh(async signal => { await loadCrmPage(f.scope, {}, { force: !initial, signal }); initial = false; }, { businessId: f.scope.businessId }); f.track(reader);
  await flush(); assert.equal(f.calls.length, 1);
  await f.advance(3_600_000); assert.equal(f.calls.length, 1);
  f.hide(true); invalidateBusinessData(f.scope.businessId); await flush(); await f.advance(3_600_000); assert.equal(f.calls.length, 1);
  f.hide(false); await flush(); assert.equal(f.calls.length, 2);
  invalidateBusinessData(f.scope.businessId); await flush(); assert.equal(f.calls.length, 3);
  comparisons.push({ scenario: "CRM 1000 customers, visible unchanged hour", before: 14400, after: 0, foregroundRefresh: 1 });
});

test("Inbox reads latest 100 once, older pages only on demand, catches new-message gaps, and preserves cursor", async t => {
  const f = fixture(t);
  await ensureDurableInbox(f.scope.businessId, f.scope.branchId);
  let view = await loadDurableConversation(f.scope.businessId, f.scope.branchId, "conversation_refresh");
  assert.equal(view.messages.length, 100); assert.equal(f.calls.filter(c => c.type === "conversation.get").length, 1);
  await loadDurableConversation(f.scope.businessId, f.scope.branchId, view.conversationId); assert.equal(f.calls.filter(c => c.type === "conversation.get").length, 2);
  view = await loadDurableConversation(f.scope.businessId, f.scope.branchId, view.conversationId, { older: true }); assert.equal(view.messages.length, 200); assert.equal(view.messages[0].sequence, 1801);
  f.messages(2300); await ensureDurableInbox(f.scope.businessId, f.scope.branchId, true);
  view = await loadDurableConversation(f.scope.businessId, f.scope.branchId, view.conversationId);
  assert.deepEqual(view.messages.map(m => m.sequence), Array.from({ length: 500 }, (_, i) => i + 1801));
  assert.equal(view.hasOlderMessages, true);
  while (view.hasOlderMessages) view = await loadDurableConversation(f.scope.businessId, f.scope.branchId, view.conversationId, { older: true });
  assert.equal(view.messages.length, 2300);
  view = await loadDurableConversation(f.scope.businessId, f.scope.branchId, view.conversationId); assert.equal(view.hasOlderMessages, false);
  comparisons.push({ scenario: "Inbox 2000 messages initial / unchanged refresh", before: 20, after: 1, olderPage: 1 });
});

test("Inbox pending reads deduplicate, cancelled reads cannot patch, and fresh grants prune cached history", async t => {
  const f = fixture(t); const conv = "conversation_refresh";
  await Promise.all([loadDurableConversation(f.scope.businessId, f.scope.branchId, conv), loadDurableConversation(f.scope.businessId, f.scope.branchId, conv)]);
  assert.equal(f.calls.length, 1);
  f.branches([f.scope.branchId]); await loadDurableConversation(f.scope.businessId, f.scope.branchId, conv);
  assert.ok(readInboxDirectory(f.scope.businessId, f.scope.branchId)[0].messages.every(m => m.branchId === f.scope.branchId));
  let resolve!: (value: Response) => void; f.respond(() => new Promise<Response>(r => { resolve = r; }));
  const cancel = new AbortController(), pending = loadDurableConversation(f.scope.businessId, f.scope.branchId, conv, { signal: cancel.signal });
  cancel.abort(); resolve(f.ok(f.view([3000], false))); await assert.rejects(pending, { name: "AbortError" });
  assert.ok(!readInboxDirectory(f.scope.businessId, f.scope.branchId)[0].messages.some(m => m.sequence === 3000));
  f.respond(undefined); f.malformed(); await assert.rejects(loadDurableConversation(f.scope.businessId, f.scope.branchId, conv), /pagination/);
  comparisons.push({ scenario: "Inbox same conversation simultaneous readers", before: 40, after: 1 });
});

test("Inbox refreshes status of loaded older approvals without reloading their history", async t => {
  const f = fixture(t), old: MessageView = { sequence: 1850, messageId: "approval_1850", conversationId: "conversation_refresh", branchId: f.scope.branchId, revision: 1,
    kind: "add-service-request", direction: "business", bookingId: "booking_1", serviceName: "Service", additionalPrice: 50, additionalMinutes: 10, note: "", requestStatus: "waiting", respondedAt: null, responseSource: null, sentAt: "2026-10-12T00:00:00Z" };
  await loadDurableConversation(f.scope.businessId, f.scope.branchId, old.conversationId);
  f.respond(() => { const page = f.view(Array.from({ length: 100 }, (_, i) => 1801 + i), true); page.messages = page.messages.map(m => m.sequence === old.sequence ? old : m); return f.ok(page); });
  await loadDurableConversation(f.scope.businessId, f.scope.branchId, old.conversationId, { older: true });
  f.respond(op => { assert.deepEqual(op.refreshMessageIds, [old.messageId]); return f.ok({ ...f.view(Array.from({ length: 100 }, (_, i) => 1901 + i), true), refreshedMessages: [{ ...old, revision: 2, requestStatus: "approved" }] }); });
  await loadDurableConversation(f.scope.businessId, f.scope.branchId, old.conversationId);
  assert.deepEqual(f.calls.at(-1)?.refreshMessageIds, [old.messageId]);
  const refreshed = readInboxDirectory(f.scope.businessId, f.scope.branchId)[0].messages.find(m => m.messageId === old.messageId)!;
  assert.ok(refreshed.kind === "add-service-request"); assert.equal(refreshed.requestStatus, "approved");
});

test("Visible polling pauses hidden tabs, aborts stale reads, and never queues another slow refresh", async t => {
  const f = fixture(t); let reads = 0, finish!: () => void;
  f.hide(true);
  const reader = startBusinessRefresh(signal => new Promise<void>((resolve, reject) => { reads++; finish = resolve; signal.addEventListener("abort", () => reject(signal.reason), { once: true }); }), { businessId: f.scope.businessId, intervalMs: 60_000 }); f.track(reader);
  await f.advance(3_600_000); assert.equal(reads, 0);
  f.hide(false); await flush(); assert.equal(reads, 1);
  await f.advance(600_000); await reader.refresh(); assert.equal(reads, 1);
  f.hide(true); await flush(); f.hide(false); await flush(); await f.advance(0); assert.equal(reads, 2);
  finish(); await flush(); await f.advance(60_000); assert.equal(reads, 3);
});

for (const status of [401, 403]) test(`${status} stops scheduled/manual/focus reads until session is confirmed again`, async t => {
  const f = fixture(t); let valid = false, reads = 0, sessions = 0;
  f.respond(op => { if (op.type === "session.resolve") { sessions++; return f.ok(f.session); } reads++; return valid ? f.ok({}) : new Response(JSON.stringify({ ok: false, error: { code: status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", message: "Denied" } }), { status }); });
  const reader = startBusinessRefresh(signal => businessCommand("/api/be8", { type: "reports.get", ...f.scope, options: {} }, signal), { businessId: f.scope.businessId, intervalMs: 60_000 }); f.track(reader);
  await flush(); await f.advance(3_600_000); await reader.refresh(); f.hide(true); f.hide(false); invalidateBusinessData(f.scope.businessId); await flush(); assert.equal(reads, 1);
  valid = true; await ensureBusinessSession(true); await flush(); assert.equal(sessions, 1); assert.equal(reads, 2);
});

for (const header of ["120", "date", "missing"]) test(`429 respects Retry-After (${header}) across remount/focus and resumes without a request storm`, async t => {
  const f = fixture(t); let reads = 0;
  const wait = header === "missing" ? 60_000 : 120_000;
  f.respond(() => { reads++; return reads === 1 ? new Response(JSON.stringify({ ok: false, error: { code: "RATE_LIMITED", message: "Wait" } }), { status: 429, headers: header === "missing" ? {} : { "retry-after": header === "date" ? new Date(Date.now() + wait).toUTCString() : header } }) : f.ok({}); });
  const load = (signal: AbortSignal) => businessCommand("/api/be8", { type: "reports.get", ...f.scope, options: {} }, signal);
  const first = startBusinessRefresh(load, { businessId: f.scope.businessId, intervalMs: 60_000 }); await flush(); first.stop();
  const reader = startBusinessRefresh(load, { businessId: f.scope.businessId, intervalMs: 60_000 }); f.track(reader); await flush();
  f.hide(true); f.hide(false); await reader.refresh(); await f.advance(wait - 1); assert.equal(reads, 1);
  await f.advance(1); assert.equal(reads, 2);
});

test("Customer directory malformed pagination stops in one call", async t => {
  const f = fixture(t); f.respond(() => f.ok({ items: [], total: 1, offset: 0, limit: 100 }));
  await assert.rejects(ensureDurableCustomerDirectory(f.scope.businessId), /pagination/); assert.equal(f.calls.length, 1);
});

test("Home and Billing use frame-owned initial data, then make 60/120 refresh calls in a visible hour", async t => {
  const f = fixture(t); await ensureBusinessPageData("/business/home", f.context);
  const startupCalls = f.calls.length;
  const home = startBusinessRefresh(signal => ensureDurableSummary(f.scope, true, { signal }), { businessId: f.scope.businessId, intervalMs: 60_000, initial: false }); f.track(home);
  await flush(); assert.equal(f.calls.length, startupCalls, "Mount must not repeat fresh frame reads");
  for (let minute = 0; minute < 60; minute++) await f.advance(60_000);
  const homeCalls = f.calls.length - startupCalls; assert.equal(homeCalls, 60); home.stop();
  const billScope = { ...f.scope, branchId: `${f.scope.businessId}_two` };
  await ensureBusinessPageData("/business/billing", { ...f.context, ...billScope });
  const billStartup = f.calls.length;
  const billing = startBusinessRefresh(async signal => { await ensureDurableBilling(billScope.businessId, billScope.branchId, true, signal, false); await ensureDurableSummary(billScope, false, { signal }); }, { businessId: billScope.businessId, intervalMs: 60_000, initial: false }); f.track(billing);
  await flush(); assert.equal(f.calls.length, billStartup);
  for (let minute = 0; minute < 60; minute++) await f.advance(60_000);
  const billingCalls = f.calls.length - billStartup; assert.equal(billingCalls, 120);
  assert.equal(f.calls.filter(c => c.type === "charges.list").length, 61); assert.equal(f.calls.filter(c => c.type === "payments.list").length, 0); billing.stop();
  const baseline = f.calls.length; f.hide(true);
  const paused = startBusinessRefresh(signal => ensureDurableReport(f.scope, {}, { signal }), { businessId: f.scope.businessId, intervalMs: 60_000 }); f.track(paused);
  await f.advance(3_600_000); assert.equal(f.calls.length, baseline);
  comparisons.push({ scenario: "Home visible hour, excluding startup", before: 720, after: homeCalls });
  comparisons.push({ scenario: "Billing visible hour, excluding startup (one page per directory)", before: 2160, after: billingCalls });
  writeFileSync("work/p2-api-call-comparison.json", JSON.stringify({ note: "Synthetic transport and fake clock, not production usage or prices. Before counts from the original audit; exclude initial directory/session loads unless labelled initial.", comparisons }, null, 2));
});

test("Billing cold frame data is reused on mount and the paused Inbox frame makes no reads", async t => {
  const f = fixture(t); await ensureBusinessPageData("/business/billing", f.context);
  assert.equal(f.calls.length, 2); const before = f.calls.length;
  await ensureDurableBilling(f.scope.businessId, f.scope.branchId, false, undefined, false); await ensureDurableSummary(f.scope, false, { force: false });
  assert.equal(f.calls.length, before);
  await ensureBusinessPageData("/business/inbox", f.context); assert.equal(f.calls.length, before);
  await ensureDurableInbox(f.scope.businessId, f.scope.branchId); const inbox = f.calls.length;
  await ensureDurableInbox(f.scope.businessId, f.scope.branchId); assert.equal(f.calls.length, inbox);
});

test("Customer detail preload keeps booking, operations and balances without loading the paused chat", async t => {
  const f = fixture(t), customerId = "customer_no_chat";
  f.respond(op => {
    if (op.type === "customer.get") return f.ok({ id: customerId, businessId: f.scope.businessId, displayName: "Customer", phone: null, email: null, businessNotes: "", tags: [], pets: [], status: "active", createdAt: "2026-10-12T00:00:00.000Z", updatedAt: "2026-10-12T00:00:00.000Z" });
    if (op.type === "booking.list") return f.ok({ items: [], total: 0, offset: (op.input as Record<string, unknown>).offset, limit: 100 });
    if (op.type === "operations.list") return f.ok({ executions: [], records: [], staff: [], rooms: [] });
    if (op.type === "charges.list") return f.ok({ balances: [], nextAfterId: null });
    if (op.type === "payments.list") return f.ok({ payments: [], refunds: [], nextAfterId: null });
    throw new Error(`Unexpected ${op.type}`);
  });
  await ensureBusinessPageData(`/business/customers/${customerId}`, f.context);
  assert.equal(f.calls.filter(c => c.type === "customer.get").length, 1);
  assert.equal(f.calls.filter(c => c.type === "booking.list").length, 1);
  assert.equal(f.calls.filter(c => c.type === "operations.list").length, 2);
  assert.equal(f.calls.filter(c => c.type === "charges.list").length, 2);
  assert.equal(f.calls.filter(c => c.type === "payments.list").length, 2);
  assert.ok(f.calls.every(c => !String(c.type).startsWith("inbox.") && !String(c.type).startsWith("conversation.")));
  assert.equal(readBe2DirectoryStatus(f.scope.businessId), "partial", "A single customer never completes the whole directory");
});

test("Workspace startup warms enabled current-branch pages once, with bounded CRM and no message history", async t => {
  const f = fixture(t);
  assert.equal(isBusinessWorkspacePrepared(f.context), false);
  assert.equal(isBusinessPagePrepared("/business/home", f.context), false);
  await ensureBusinessPageData("/business/home", f.context);
  assert.equal(isBusinessWorkspacePrepared(f.context), true);
  const ready: string[] = [];
  await prepareBusinessWorkspace(f.context, new AbortController().signal, path => ready.push(path));
  const paths = businessStartupPages(f.context);
  assert.ok(!paths.includes("/business/inbox"), "Paused chat has no startup owner or preload");
  assert.ok(paths.includes("/business/grooming"));
  assert.ok(!paths.includes("/business/hotel") && !paths.includes("/business/daycare"));
  assert.ok(!BUSINESS_NAVIGATION_HREFS.includes("/business/customers/private-customer"));
  for (const path of paths) assert.equal(isBusinessPagePrepared(path, f.context), true, path);
  assert.ok(ready.includes("/business/settings"), "Pages without backend reads also become ready for navigation");
  assert.equal(f.calls.filter(c => c.type === "booking.catalog").length, 1);
  assert.equal(f.calls.filter(c => c.type === "crm.list").length, 1);
  assert.ok(f.calls.some(c => c.type === "crm.list" && c.offset === 0 && c.limit === 50));
  assert.ok(f.calls.filter(c => c.type === "booking.list").every(c => (c.input as Record<string, unknown>).rangeStart && (c.input as Record<string, unknown>).rangeEnd));
  assert.equal(f.calls.filter(c => String(c.type).startsWith("inbox.") || String(c.type).startsWith("conversation.") || c.type === "payments.list" || String(c.type).startsWith("intake.")).length, 0);
  assert.ok(f.calls.every(c => (c.businessId ?? (c.input as Record<string, unknown>)?.businessId) === f.scope.businessId));
  assert.ok(f.calls.every(c => !c.branchId || c.branchId === f.scope.branchId));
  assert.equal(readBe2DirectoryStatus(f.scope.businessId), "idle");
  const before = f.calls.length;
  await prepareBusinessWorkspace(f.context, new AbortController().signal);
  await ensureBusinessPageData("/business/calendar", f.context);
  await loadCrmPage(f.scope, { offset: 0, query: "", segment: "all" });
  const today = "2026-10-12";
  await ensureDurableReport(f.scope, { dateRangePreset: "today", branchScope: "current", customStartDate: "2026-10-06", customEndDate: today }, { force: false });
  assert.equal(f.calls.length, before, "Warm page navigation/mount reuse the same acknowledged reads");
  writeFileSync("work/business-navigation-api-comparison-2026-10-12.json", JSON.stringify({
    note: "Measured with synthetic fetch transport and fixed clock; route/RSC prefetch, production latency, SQL and billing are not measured here.",
    customerCount: 1000, messageCount: 2000, routes: paths,
    startupCalls: before, startupByOperation: Object.fromEntries([...new Set(f.calls.map(c => String(c.type)))].map(type => [type, f.calls.filter(c => c.type === type).length])),
    cachedNavigationAndMountCalls: f.calls.length - before,
  }, null, 2));
  assert.equal(isBusinessPagePrepared("/business/home", { ...f.context, branchId: `${f.scope.businessId}_two` }), false);
  installBusinessSession({ ...f.session, person: { ...f.session.person, id: "another_startup_person" } });
  assert.equal(isBusinessWorkspacePrepared(f.context), false);
  assert.equal(isBusinessPagePrepared("/business/home", f.context), false);
  await assert.rejects(prepareBusinessWorkspace({ ...f.context, branchId: "private_branch" }, new AbortController().signal), /ไม่สามารถเปิดสาขานี้ได้/);
  assert.equal(f.calls.length, before);
});

test("Hidden-tab startup pauses, drops an aborted response, and resumes without duplicate refresh work", async t => {
  const f = fixture(t); let finish!: (response: Response) => void;
  f.hide(true);
  f.respond(() => new Promise(resolve => { finish = resolve; }));
  const ready: string[] = [];
  const refresh = startBusinessRefresh(signal => prepareBusinessWorkspace(f.context, signal, path => ready.push(path)), { businessId: f.scope.businessId, targets: [] });
  f.track(refresh);
  await flush(); assert.equal(f.calls.length, 0);
  f.hide(false); await flush(); assert.equal(f.calls.length, 1);
  f.hide(false); await flush(); assert.equal(f.calls.length, 1, "Only one startup read can be pending");
  f.hide(true); finish(f.ok({ generatedAt: new Date().toISOString(), bookings: [] })); await flush();
  assert.equal(isBusinessPagePrepared("/business/home", f.context), false);
  assert.equal(ready.length, 0);
  f.respond(undefined); f.hide(false);
  for (let step = 0; step < 20; step++) await flush();
  assert.equal(isBusinessPagePrepared("/business/settings", f.context), true);
  assert.equal(f.calls.filter(c => c.type === "home.summary").length, 2);
  const before = f.calls.length;
  f.hide(true); f.hide(false); await flush();
  assert.equal(f.calls.length, before, "Foreground resume does not repeat completed startup pages");
});

for (const status of [401, 403, 429]) test(`Workspace startup honors ${status} without loading other pages in a storm`, async t => {
  const f = fixture(t); let reads = 0;
  f.respond(() => {
    reads++;
    return new Response(JSON.stringify({ ok: false, error: { code: status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "RATE_LIMITED", message: "Blocked" } }), { status, headers: { "retry-after": "120" } });
  });
  f.track(startBusinessRefresh(signal => prepareBusinessWorkspace(f.context, signal), { businessId: f.scope.businessId, targets: [] }));
  await flush(); assert.equal(reads, 1);
  await f.advance(60_000); f.hide(true); f.hide(false); await flush(); assert.equal(reads, 1);
  assert.equal(isBusinessWorkspacePrepared(f.context), false);
  if (status === 429) { await f.advance(60_000); assert.equal(reads, 2); }
  else { await f.advance(600_000); assert.equal(reads, 1); }
});

test("Startup catalog respects server Retry-After before trying another Booking read", async t => {
  const f = fixture(t);
  await ensureBusinessPageData("/business/home", f.context);
  let reads = 0;
  f.respond(op => {
    assert.equal(op.type, "booking.catalog"); reads++;
    return new Response(JSON.stringify({ ok: false, error: { code: "RATE_LIMITED", message: "Wait" } }), { status: 429, headers: { "retry-after": "120" } });
  });
  f.track(startBusinessRefresh(signal => prepareBusinessWorkspace(f.context, signal), { businessId: f.scope.businessId, targets: [] }));
  await flush(); assert.equal(reads, 1);
  await f.advance(60_000); f.hide(true); f.hide(false); await flush(); assert.equal(reads, 1);
  await f.advance(60_000); assert.equal(reads, 2);
});

test("An unavailable optional startup page does not discard the ready Home or stop other pages", async t => {
  const f = fixture(t);
  f.respond(op => op.type === "reports.get" ? Promise.reject(new Error("Reports unavailable"))
    : op.type === "booking.catalog" ? f.ok({ ...f.scope, services: [], resources: [] })
    : op.type === "home.summary" || op.type === "billing.summary" ? f.ok({ generatedAt: new Date().toISOString(), bookings: [] })
    : op.type === "customer.list" || op.type === "booking.list" ? f.ok({ items: [], offset: (op.input as Record<string, unknown>).offset, total: 0, limit: 100 })
    : op.type === "crm.list" ? f.ok({ items: [], total: 0, nextOffset: null })
    : op.type === "charges.list" ? f.ok({ balances: [], nextAfterId: null })
    : op.type === "inbox.list" ? f.ok({ conversations: [], nextAfterId: null })
    : f.ok({ executions: [], records: [], staff: [], rooms: [] }));
  await assert.rejects(prepareBusinessWorkspace(f.context, new AbortController().signal), /Reports unavailable/);
  assert.equal(isBusinessPagePrepared("/business/home", f.context), true);
  assert.equal(isBusinessPagePrepared("/business/settings", f.context), true);
  assert.equal(isBusinessPagePrepared("/business/reports", f.context), false);
  assert.equal(isBusinessPagePrepared("/business/grooming", f.context), true);
});

test("Changing conversation starts the needed read without waiting for an abandoned conversation", async t => {
  const f = fixture(t); let finish!: (value: Response) => void;
  f.respond(op => op.conversationId === "conversation_refresh" ? new Promise<Response>(resolve => { finish = resolve; }) : f.ok({ ...f.view([99], false), conversationId: "conversation_next", messages: f.view([99], false).messages.map(m => ({ ...m, conversationId: "conversation_next" })) }));
  const controller = new AbortController(), old = loadDurableConversation(f.scope.businessId, f.scope.branchId, "conversation_refresh", { signal: controller.signal }); controller.abort();
  const next = await loadDurableConversation(f.scope.businessId, f.scope.branchId, "conversation_next"); assert.equal(next.conversationId, "conversation_next");
  finish(f.ok(f.view([20], false))); await assert.rejects(old, { name: "AbortError" });
  assert.ok(!readInboxDirectory(f.scope.businessId, f.scope.branchId).some(c => c.conversationId === "conversation_refresh"));
});

test("Intake lease expires on hiding and a cancelled delayed response cannot reopen private data", async t => {
  const f = fixture(t), result = { record: { id: "intake_1", ...f.scope, accessId: "access_1" }, access: { id: "access_1", ...f.scope, checkedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() }, passport: { name: "Private" } };
  f.respond(() => f.ok(result)); await loadDurableIntake(f.scope, "intake_1"); assert.ok(readCachedIntake(f.scope, "intake_1")?.passport);
  await f.advance(6001); assert.equal(readCachedIntake(f.scope, "intake_1")?.passport, null);
  await loadDurableIntake(f.scope, "intake_1");
  expireIntakeLease(f.scope, "intake_1"); assert.equal(readCachedIntake(f.scope, "intake_1")?.passport, null);
  let resolve!: (value: Response) => void; f.respond(() => new Promise<Response>(r => { resolve = r; }));
  const controller = new AbortController(), pending = loadDurableIntake(f.scope, "intake_1", controller.signal);
  await flush(); controller.abort(); resolve(f.ok(result)); await assert.rejects(pending, { name: "AbortError" }); assert.equal(readCachedIntake(f.scope, "intake_1")?.passport, null);
});

test("A read slower than the Intake lease returns masked private fields", async t => {
  const f = fixture(t); let resolve!: (value: Response) => void;
  f.respond(() => new Promise<Response>(r => { resolve = r; }));
  const result = { record: { id: "intake_slow", ...f.scope, accessId: "access_slow" }, access: { id: "access_slow", ...f.scope, checkedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() }, passport: { name: "Private" } };
  const read = loadDurableIntake(f.scope, "intake_slow"); await flush(); await f.advance(7000); resolve(f.ok(result));
  assert.equal((await read).passport, null); assert.equal(readCachedIntake(f.scope, "intake_slow")?.passport, null);
});

test("An acknowledged checkout remains successful when the UI Person changes before its cache update", async t => {
  const f = fixture(t); let writes = 0;
  f.respond(op => {
    if (op.type === "charge.checkout") {
      writes++; installBusinessSession({ ...f.session, person: { ...f.session.person, id: "confirmed_new_person" } });
      return f.ok({ balance: { charge: { ...f.scope, chargeId: "charge_acknowledged" } }, created: true, reconciled: false, replayed: false });
    }
    if (op.type === "charges.list") return f.ok({ balances: [], nextAfterId: null });
    if (op.type === "payments.list") return f.ok({ payments: [], refunds: [], nextAfterId: null });
    throw new Error(`Unexpected ${op.type}`);
  });
  const result = await checkoutDurableCharge("execution_acknowledged", f.scope);
  assert.equal(result.ok, true); assert.equal(writes, 1);
  if (result.ok) assert.equal(result.charge.chargeId, "charge_acknowledged");
});

function p2Booking(scope: { businessId: string; branchId: string }, id = "booking_p2"): BookingView {
  const stamp = "2026-10-12T00:00:00.000Z";
  return { ...scope, id, customerId: "customer_p2", customerName: "Customer", pets: [{ id: "pet_p2", name: "Cat", species: "cat" }],
    serviceId: "service_p2", serviceLabel: "Bath", serviceModule: "grooming", timeModel: "appointment", start: "2026-10-12T10:00", end: "2026-10-12T11:00",
    requiredResourceKinds: [], assignedResourceIds: [], status: "confirmed", estimate: 100, notes: "", revision: 1, createdAt: stamp, updatedAt: stamp, cancelledAt: null };
}

test("P2 Calendar reads bypass an abandoned range; partial pages stay visible without marking the full directory ready", async t => {
  const f = fixture(t); let finish!: (response: Response) => void;
  f.respond(op => (op.input as { rangeStart: string }).rangeStart === "2026-10-01" ? new Promise<Response>(resolve => { finish = resolve; })
    : f.ok({ items: [p2Booking(f.scope)], total: 1, offset: 0, limit: 100 }));
  const controller = new AbortController(), old = queryDurableBookings({ ...f.scope, rangeStart: "2026-10-01", rangeEnd: "2026-10-02" }, controller.signal);
  controller.abort();
  await queryDurableBookings({ ...f.scope, rangeStart: "2026-10-12", rangeEnd: "2026-10-13" });
  assert.equal(f.calls.length, 2); assert.equal(readBe3DirectoryStatus(f.scope.businessId), "partial"); assert.equal(readKnownBe3Bookings(f.scope.businessId).length, 1);
  finish(f.ok({ items: [p2Booking(f.scope, "old_booking")], total: 1, offset: 0, limit: 100 })); await assert.rejects(old, { name: "AbortError" });
  assert.equal(readKnownBe3Bookings(f.scope.businessId).length, 1);
  installBusinessSession({ ...f.session, person: { ...f.session.person, id: "different_person_p2" } });
  assert.equal(readKnownBe3Bookings(f.scope.businessId).length, 0);
});

test("P2 customer searches bypass cancelled reads and cannot install another Person's response", async t => {
  const f = fixture(t); let finish!: (response: Response) => void;
  const stamp = "2026-10-12T00:00:00.000Z";
  const customer = { id: "customer_p2", businessId: f.scope.businessId, displayName: "New", phone: null, email: null, businessNotes: "", tags: [], pets: [], status: "active", createdAt: stamp, updatedAt: stamp };
  f.respond(op => (op.input as { query: string }).query === "old" ? new Promise<Response>(resolve => { finish = resolve; }) : f.ok({ items: [customer], total: 1, offset: 0, limit: 50 }));
  const controller = new AbortController(), old = searchDurableCustomers(f.scope.businessId, "old", 50, 0, controller.signal); controller.abort();
  await searchDurableCustomers(f.scope.businessId, "new", 50); assert.equal(f.calls.length, 2); assert.equal(readBe2DirectoryStatus(f.scope.businessId), "partial");
  finish(f.ok({ items: [{ ...customer, displayName: "Stale" }], total: 1, offset: 0, limit: 50 })); await assert.rejects(old, { name: "AbortError" });
  assert.equal(readBe2Customer(f.scope.businessId, customer.id)?.displayName, "New");
  installBusinessSession({ ...f.session, person: { ...f.session.person, id: "new_customer_actor" } }); assert.equal(readBe2Customer(f.scope.businessId, customer.id), null);
});

test("P2 booking commits patch one Booking and refresh only its operations; operation notes never reload the directory", async t => {
  const f = fixture(t), booking = p2Booking(f.scope);
  await loadCrmPage(f.scope); f.calls.length = 0;
  patchBe3Booking(booking); installOperations(f.scope.businessId, f.scope.branchId, { executions: [], staff: [], rooms: [], records: [] });
  f.respond(op => op.type === "booking.update" ? f.ok({ outcome: "updated", booking: { ...booking, revision: 2, notes: "saved" } }) : f.ok({ executions: [], staff: [], rooms: [], records: [] }));
  const input = { ...f.scope, bookingId: booking.id, expectedRevision: 1, serviceId: booking.serviceId, customerId: booking.customerId,
    petIds: booking.pets.map(p => p.id), start: booking.start, end: booking.end, assignedResourceIds: [], status: booking.status, estimate: booking.estimate, notes: "saved" } as UpdateBookingInput;
  const saved = await updateDurableBooking(input); assert.equal(saved.outcome, "updated");
  assert.deepEqual(f.calls.map(c => c.type), ["booking.update", "operations.list"]); assert.equal(f.calls[1].bookingId, booking.id);
  assert.equal(readKnownBe3Bookings(f.scope.businessId)[0].revision, 2);
  f.respond(() => f.ok({ generatedAt: new Date().toISOString(), items: [{ profile: emptyCrm("customer_p2"), upcoming: [], timeline: [], timelineNext: null }], nextAfterId: null }));
  await loadCrmPage(f.scope); assert.equal(f.calls.at(-1)?.type, "crm.list");
  f.calls.length = 0;
  f.respond(() => f.ok({ kind: "grooming", record: { ...f.scope, serviceJobId: "execution_p2", revision: 2, status: "waiting", businessNote: "saved" } }));
  await mutateOperations({ type: "operations.change", input: { ...f.scope, executionId: "execution_p2", expectedRevision: 1, requestKey: "p2-notes", change: { type: "note", note: "saved" } } });
  assert.deepEqual(f.calls.map(c => c.type), ["operations.change"]); assert.equal(readExecution("execution_p2")?.record.businessNote, "saved");
});

test("P2 filtered operations and scoped histories never mark full directories complete", async t => {
  const f = fixture(t);
  await loadFilteredOperations(f.scope.businessId, f.scope.branchId, { date: "2026-10-12" }); assert.equal(f.calls.length, 1);
  await loadFilteredOperations(f.scope.businessId, f.scope.branchId, { date: "2026-10-12" }); assert.equal(f.calls.length, 1);
  assert.equal(operationsComplete(f.scope.businessId, f.scope.branchId), false);
  await ensureBusinessPageData("/business/settings", f.context); assert.equal(f.calls.length, 1);
  f.calls.length = 0; await ensureBusinessPageData("/business/team", f.context);
  assert.ok(f.calls.every(c => c.branchId === f.scope.branchId || (c.input as { branchId?: string })?.branchId === f.scope.branchId));
  assert.ok(f.calls.filter(c => c.type === "booking.list").every(c => (c.input as { rangeStart?: string }).rangeStart));
});

test("P2 Billing loads payment history only for the opened Charge, deduplicates it and patches a payment without full reload", async t => {
  const f = fixture(t);
  const charge: ChargeBalanceView = { charge: { ...f.scope, chargeId: "charge_p2", customerId: "customer_p2", revision: 1 }, remaining: 100, total: 100, paid: 0 } as ChargeBalanceView;
  let paid = false;
  const payment = { ...f.scope, paymentId: "payment_p2", customerId: "customer_p2", amount: 50, refunded: 0, unallocated: 0, allocations: [{ chargeId: "charge_p2", amount: 50 }] } as PaymentView;
  f.respond(op => op.type === "charges.list" ? f.ok({ balances: [charge], nextAfterId: null }) : op.type === "payment.record" ? (paid = true, f.ok({ balance: { ...charge, charge: { ...charge.charge, revision: 2 }, paid: 50, remaining: 50 }, replayed: false }))
    : f.ok({ payments: paid ? [payment] : [], refunds: [], nextAfterId: null }));
  await ensureDurableBilling(f.scope.businessId, f.scope.branchId, false, undefined, false); assert.deepEqual(f.calls.map(c => c.type), ["charges.list"]);
  await Promise.all([loadChargePayments(f.scope.businessId, f.scope.branchId, "charge_p2"), loadChargePayments(f.scope.businessId, f.scope.branchId, "charge_p2")]);
  assert.equal(f.calls.filter(c => c.type === "payments.list").length, 1); assert.equal(f.calls[1].chargeId, "charge_p2"); f.calls.length = 0;
  const result = await recordDurablePayment({ context: f.context, chargeId: "charge_p2", amount: 50, method: "cash", note: "", requestKey: "p2-retained-key" });
  assert.equal(result.ok, true); assert.deepEqual(f.calls.map(c => c.type), ["payment.record", "payments.list"]);
  assert.equal(f.calls[0].requestKey, "p2-retained-key"); assert.equal(f.calls[1].chargeId, "charge_p2");
  assert.equal(readFinancialDirectory(f.scope.businessId, f.scope.branchId)?.balances[0].paid, 50);
  assert.equal(readFinancialDirectory(f.scope.businessId, f.scope.branchId)?.payments[0].paymentId, "payment_p2");
});

test("P2 targeted invalidation refreshes the affected summary and preserves unrelated cached CRM and Reports", async t => {
  const f = fixture(t); let home = 0, billing = 0;
  f.track(startBusinessRefresh(async () => { home++; }, { businessId: f.scope.businessId, targets: ["home"], initial: false }));
  f.track(startBusinessRefresh(async () => { billing++; }, { businessId: f.scope.businessId, targets: ["billing"], initial: false }));
  await loadCrmPage(f.scope); await ensureDurableReport(f.scope, {}, { force: false });
  const before = f.calls.length;
  invalidateBusinessData(f.scope.businessId, ["booking", "operations"]); await flush();
  await loadCrmPage(f.scope); await ensureDurableReport(f.scope, {}, { force: false });
  assert.equal(home, 0); assert.equal(billing, 0); assert.equal(f.calls.length, before);
  invalidateBusinessData(f.scope.businessId, ["home"]); await flush(); assert.equal(home, 1); assert.equal(billing, 0);
  invalidateBusinessData(f.scope.businessId, ["billing", "home", "crm", "reports"]); await flush();
  assert.equal(home, 2); assert.equal(billing, 1);
  await loadCrmPage(f.scope); await ensureDurableReport(f.scope, {}, { force: false }); assert.equal(f.calls.length, before + 2);
});

test("P2 a pending operations page cannot replace a newer acknowledged operation", async t => {
  const f = fixture(t); let finish!: (value: Response) => void;
  installOperations(f.scope.businessId, f.scope.branchId, { executions: [], records: [], staff: [], rooms: [] }, false);
  f.respond(op => op.type === "operations.list" ? new Promise<Response>(r => { finish = r; })
    : f.ok({ kind: "grooming", record: { ...f.scope, serviceJobId: "pending_operation_p2", revision: 2, status: "waiting", businessNote: "saved" } }));
  const old = loadFilteredOperations(f.scope.businessId, f.scope.branchId, { date: "2026-10-12" });
  await mutateOperations({ type: "operations.change", input: { ...f.scope, executionId: "pending_operation_p2", expectedRevision: 1, requestKey: "p2-pending-note", change: { type: "note", note: "saved" } } });
  finish(f.ok({ executions: [{ kind: "grooming", record: { ...f.scope, serviceJobId: "pending_operation_p2", revision: 1, businessNote: "stale" } }], records: [], staff: [], rooms: [] }));
  await assert.rejects(old, { name: "AbortError" });
  assert.equal(readExecution("pending_operation_p2")?.record.businessNote, "saved"); assert.equal(operationsComplete(f.scope.businessId, f.scope.branchId), false);
});

test("P2 an old customer read cannot overwrite an acknowledged edit or install its result after the Person changes", async t => {
  const f = fixture(t); let finish!: (value: Response) => void;
  const customer = { id: "customer_p2", businessId: f.scope.businessId, displayName: "Customer", businessNotes: "saved", pets: [], tags: [], status: "active", createdAt: "2026-10-12T00:00:00.000Z", updatedAt: "2026-10-12T00:00:00.000Z", phone: null, email: null };
  f.respond(op => op.type === "customer.search" ? new Promise<Response>(r => { finish = r; }) : f.ok(customer));
  const old = searchDurableCustomers(f.scope.businessId, "old");
  await updateDurableCustomerNotes({ businessId: f.scope.businessId, customerId: customer.id, businessNotes: "saved" });
  finish(f.ok({ items: [{ ...customer, businessNotes: "stale" }], total: 1, offset: 0, limit: 100 }));
  await assert.rejects(old, { name: "AbortError" }); assert.equal(readBe2Customer(f.scope.businessId, customer.id)?.businessNotes, "saved");
  f.respond(() => { installBusinessSession({ ...f.session, person: { ...f.session.person, id: "different_customer_person" } }); return f.ok(customer); });
  const acknowledged = await updateDurableCustomerNotes({ businessId: f.scope.businessId, customerId: customer.id, businessNotes: "saved" });
  assert.equal(acknowledged.businessNotes, "saved"); assert.equal(readBe2Customer(f.scope.businessId, customer.id), null);
});

test("P2 staff reassignment discards pending metadata from the removed branch", async t => {
  const f = fixture(t), otherBranch = f.session.workspaces[0].permittedBranches[1].id; let finish!: (value: Response) => void;
  const staff = { businessId: f.scope.businessId, staffId: "staff_scope_p2", branchIds: [otherBranch], name: "Old", revision: 1 } as StaffView;
  installOperations(f.scope.businessId, f.scope.branchId, { executions: [], records: [], staff: [], rooms: [] }, false);
  installOperations(f.scope.businessId, otherBranch, { executions: [], records: [], staff: [staff], rooms: [] }, false);
  f.respond(op => op.type === "operations.list" ? new Promise<Response>(r => { finish = r; }) : f.ok({ ...staff, name: "New", branchIds: [f.scope.branchId], revision: 2 }));
  const old = loadFilteredOperations(f.scope.businessId, otherBranch, { date: "2026-10-12" });
  await mutateOperations({ type: "staff.save", ...f.scope, requestKey: "p2-staff-move", expectedRevision: 1,
    draft: { staffId: staff.staffId, name: "New", branchIds: [f.scope.branchId], role: "staff", capabilities: [] } });
  finish(f.ok({ executions: [], records: [], staff: [staff], rooms: [] })); await assert.rejects(old, { name: "AbortError" });
  assert.equal(readOperationDirectory(f.scope.businessId, otherBranch)?.staff.length, 0);
  assert.equal(readOperationDirectory(f.scope.businessId, f.scope.branchId)?.staff[0].name, "New");
});

test("P2 payment history remains loading until its matching balance snapshot arrives and stale pending history is discarded", async t => {
  const f = fixture(t); let count = 0, finish!: (value: Response) => void;
  const balance = () => ({ charge: { ...f.scope, chargeId: "charge_history_p2", customerId: "customer_p2", revision: count + 1 }, paymentCount: count, refunded: 0 });
  f.respond(op => op.type === "charges.list" ? f.ok({ balances: [balance()], nextAfterId: null }) : new Promise<Response>(r => { finish = r; }));
  await ensureDurableBilling(f.scope.businessId, f.scope.branchId, false, undefined, false);
  assert.equal(chargePaymentsReady(f.scope.businessId, f.scope.branchId, "charge_history_p2"), false);
  const old = loadChargePayments(f.scope.businessId, f.scope.branchId, "charge_history_p2"); count++;
  await ensureDurableBilling(f.scope.businessId, f.scope.branchId, true, undefined, false);
  finish(f.ok({ payments: [], refunds: [], nextAfterId: null })); await old;
  assert.equal(chargePaymentsReady(f.scope.businessId, f.scope.branchId, "charge_history_p2"), false);
  f.respond(() => f.ok({ payments: [{ ...f.scope, paymentId: "payment_history_p2", allocations: [{ chargeId: "charge_history_p2", amount: 100 }] }], refunds: [], nextAfterId: null }));
  await loadChargePayments(f.scope.businessId, f.scope.branchId, "charge_history_p2");
  assert.equal(chargePaymentsReady(f.scope.businessId, f.scope.branchId, "charge_history_p2"), true);
  assert.equal(readFinancialDirectory(f.scope.businessId, f.scope.branchId)?.payments.length, 1);
});

for (const type of ["booking.list", "inbox.list", "charges.list", "payments.list"] as const) test(`P2 ${type} stops malformed pagination immediately`, async t => {
  const f = fixture(t);
  f.respond(() => f.ok(type === "booking.list" ? { items: [], offset: 0, total: 1, limit: 100 } : type === "inbox.list" ? { conversations: [], nextAfterId: "not_empty" }
    : type === "charges.list" ? { balances: [], nextAfterId: "not_empty" } : { payments: [], refunds: [], nextAfterId: "not_empty" }));
  if (type === "booking.list") await assert.rejects(queryDurableBookings(f.scope), /pagination/);
  else if (type === "inbox.list") await assert.rejects(ensureDurableInbox(f.scope.businessId, f.scope.branchId), /pagination/);
  else if (type === "charges.list") await assert.rejects(ensureDurableBilling(f.scope.businessId, f.scope.branchId, true, undefined, false), /pagination/);
  else await assert.rejects(loadChargePayments(f.scope.businessId, f.scope.branchId, "charge_bad"), /pagination/);
  assert.equal(f.calls.length, 1);
});
