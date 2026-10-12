import assert from "node:assert/strict";
import test from "node:test";
import { BE1_WEEKDAYS, type BusinessSessionView } from "../app/_backend/be1/contracts";
import { installBusinessSession } from "../app/_backend/be1/configurationCache";
import { emptyReport } from "../app/_backend/be8/projections";
import { businessCommand } from "../app/_backend/shared/client";
import { ensureBusinessPageData } from "../app/business/_components/businessPageData";

const stamp = "2026-10-12T00:00:00.000Z";
const session: BusinessSessionView = {
  person: { id: "prs_loading", displayName: "ผู้ดูแล", primaryEmail: null, status: "active", createdAt: stamp, updatedAt: stamp },
  workspaces: ["current", "other"].map(id => ({
    business: { id, name: id, contactName: "ผู้ดูแล", phone: "0800000000", email: "", description: "", address: "", logoUrl: null, status: "active", createdAt: stamp, updatedAt: stamp },
    membership: { id: `member_${id}`, personId: "prs_loading", businessId: id, role: "OWNER", status: "active", createdAt: stamp, updatedAt: stamp },
    permittedBranches: ["one", "two"].map(branch => ({ id: `${id}_${branch}`, businessId: id, name: branch, area: "", address: "", phone: "", email: "", timezone: "Asia/Bangkok", status: "active", enabledModules: ["grooming"], operatingHours: BE1_WEEKDAYS.map(day => ({ day, closed: true, open: "09:00", close: "18:00" })), createdAt: stamp, updatedAt: stamp })),
  })),
};
const context = { businessId: "current", branchId: "current_one", key: "current:one", role: "เจ้าของ", memberLabel: "ผู้ดูแล" };

test("Business pages load only their required scope, reuse caches, and keep unrelated failures out of startup", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse(stamp) });
  const previousFetch = globalThis.fetch;
  const requests: { type: string; businessId?: string; branchId?: string }[] = [];
  let rejectReport = false;
  globalThis.fetch = async (_url, init) => {
    assert.ok(init?.signal instanceof AbortSignal, "Business requests must have a deadline");
    const op = JSON.parse(String(init?.body));
    requests.push({ type: op.type, businessId: op.businessId ?? op.input?.businessId, branchId: op.branchId });
    let data: unknown;
    switch (op.type) {
      case "customer.list": case "booking.list": data = { items: [], total: 0, offset: op.input.offset, limit: 100 }; break;
      case "booking.catalog": data = { businessId: op.businessId, branchId: op.branchId, services: [], resources: [] }; break;
      case "operations.list": data = { executions: [], records: [], staff: [], rooms: [] }; break;
      case "inbox.list": data = { conversations: [], nextAfterId: null }; break;
      case "charges.list": data = { balances: [], nextAfterId: null }; break;
      case "payments.list": data = { payments: [], refunds: [], nextAfterId: null }; break;
      case "reports.get":
      case "home.summary": case "billing.summary":
        if (rejectReport) throw new Error("Report offline");
        data = emptyReport({}, stamp, "Asia/Bangkok", "Current", "One"); break;
      default: throw new Error(`Unexpected request: ${op.type}`);
    }
    return new Response(JSON.stringify({ ok: true, data }), { headers: { "content-type": "application/json" } });
  };
  installBusinessSession(session);
  try {
    await ensureBusinessPageData("/business/customers", context);
    assert.deepEqual(requests.map(item => item.type), [], "CRM owns a bounded page read rather than a full Customer directory");
    requests.length = 0;
    await ensureBusinessPageData("/business/home", context);
    assert.deepEqual(requests.map(item => item.type), ["home.summary"]);
    assert.ok(requests.every(item => item.businessId === "current" && (!item.branchId || item.branchId === "current_one")));
    requests.length = 0;
    await ensureBusinessPageData("/business/calendar", context);
    assert.deepEqual(requests.map(item => item.type), ["booking.catalog"], "Calendar owns its ranged booking query");
    requests.length = 0;
    await ensureBusinessPageData("/business/calendar", context); assert.equal(requests.length, 0);

    rejectReport = true;
    await ensureBusinessPageData("/business/settings", context);
    assert.equal(requests.length, 0, "Settings profile does not preload operations/catalog");
    requests.length = 0;
    rejectReport = false;
    await ensureBusinessPageData("/business/billing", context);
    assert.deepEqual(requests.map(item => item.type), ["charges.list", "billing.summary"]);
    rejectReport = true;
    t.mock.timers.tick(60_001);
    await assert.rejects(ensureBusinessPageData("/business/home", context), /Report offline/);
    rejectReport = false;
    requests.length = 0;
    await ensureBusinessPageData("/business/home", context);
    assert.deepEqual(requests.map(item => item.type), ["home.summary"], "Retry must preserve acknowledged projections");

    requests.length = 0;
    await ensureBusinessPageData("/business/home", { ...context, branchId: "current_two" });
    assert.deepEqual(requests.map(item => item.type), ["home.summary"]);
    assert.ok(requests.every(item => item.branchId === "current_two"));
    requests.length = 0;
    await assert.rejects(ensureBusinessPageData("/business/home", { ...context, branchId: "private_branch" }), /ไม่สามารถเปิดสาขานี้ได้/);
    assert.equal(requests.length, 0);
    assert.ok(!requests.some(item => item.businessId === "other"));
  } finally { globalThis.fetch = previousFetch; }
});

test("Business transport surfaces a stalled request and allows the next attempt", async () => {
  const previousFetch = globalThis.fetch;
  const previousTimeout = AbortSignal.timeout;
  AbortSignal.timeout = milliseconds => { assert.equal(milliseconds, 20_000); return previousTimeout(5); };
  globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  });
  const keepAlive = setInterval(() => {}, 100);
  try {
    await assert.rejects(businessCommand("/api/be4", { type: "operations.list" }), { name: "TimeoutError" });
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, data: "ready" }));
    assert.equal(await businessCommand("/api/be4", { type: "operations.list" }), "ready");
  } finally { clearInterval(keepAlive); globalThis.fetch = previousFetch; AbortSignal.timeout = previousTimeout; }
});
