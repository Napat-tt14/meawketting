import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";
import { seededDatabase } from "../tests/backendTestKit.ts";

// Execute actual HTTP route handlers with isolated D1-compatible persistence.
// No network server, production DB, provider or real credential is used.
const db = seededDatabase();
for (const phase of [5, 6, 7]) db.sqlite.exec(await readFile(`scripts/seed-be${phase}-dev.sql`, "utf8"));
const cacheDir = await mkdtemp(join(tmpdir(), "meawketting-api-smoke-"));
globalThis.__meawkettingProductionSmokeEnv = { DB: db, MEAWKETTING_AUTH_MODE: "dev-test" };
const server = await createServer({ configFile: false, cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
  plugins: [{ name: "isolated-worker-binding", resolveId(id) { if (id === "cloudflare:workers") return "\0smoke-env"; }, load(id) { if (id === "\0smoke-env") return "export const env = globalThis.__meawkettingProductionSmokeEnv;"; } }],
});
const originalFetch = globalThis.fetch;
const routes = new Map(); let requests = 0;
try {
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    if (url.hostname !== "localhost" || !/^\/api\/(be[1-8]|dev\/guardian)$/.test(url.pathname)) throw Error("Only isolated local API handlers allowed");
    let route = routes.get(url.pathname);
    if (!route) { route = await server.ssrLoadModule(`/app${url.pathname}/route.ts`); routes.set(url.pathname, route); }
    requests++;
    return route.POST(request);
  };
  const scope = { businessId: "business-whisker-rest", branchId: "whisker-ari" };
  for (const [phase, operation] of [[1, { type: "session.resolve" }], [2, { type: "customer.list", input: scope }], [3, { type: "booking.catalog", ...scope }], [8, { type: "reports.get", ...scope }]]) {
    const response = await fetch(`http://localhost/api/be${phase}`, { method: "POST", headers: { "content-type": "application/json", "x-meawketting-dev-person-id": "prs_01k47meawketting000000001" }, body: JSON.stringify(operation) });
    const body = await response.json();
    assert.equal(response.status, 200, `BE${phase}: ${body.error?.code}`);
    assert.equal(body.ok, true); assert.equal(response.headers.get("cache-control"), "no-store");
  }
  for (const phase of [5, 6, 7]) await import(`./smoke-be${phase}.mjs`);
  for (const phase of [1, 2, 3]) {
    const response = await fetch(`http://localhost/api/be${phase}`, { method: "POST", headers: { "origin": "https://evil.test", "content-type": "application/json", "x-meawketting-dev-person-id": "prs_01k47meawketting000000001" }, body: "{}" });
    assert.equal(response.status, 403);
  }
  const webhook = await server.ssrLoadModule("/app/api/channels/line/[channelId]/route.ts");
  for (const channelId of ["known-looking-channel", "missing-channel"]) {
    const response = await webhook.POST(new Request(`http://localhost/api/channels/line/${channelId}`, { method: "POST", body: "{}" }), { params: Promise.resolve({ channelId }) });
    requests++;
    assert.equal(response.status, 401); assert.equal(await response.text(), "");
  }
  routes.set("/api/channels/line/:channelId", webhook);
  console.log(`PASS: ${requests} HTTP handler requests across ${routes.size} routes; isolated D1 simulation, no network/provider deployment`);
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.__meawkettingProductionSmokeEnv;
  await server.close(); db.sqlite.close();
  await rm(cacheDir, { recursive: true, force: true, maxRetries: 3 });
}
