import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { businessRequest, readJson } from "../app/_backend/shared/http";
import { requireSameOrigin } from "../app/_backend/shared/requestSecurity";
import { resolveIdentityAdapter } from "../app/_backend/be1/identity";
import { secureFetch } from "../worker/security";
import { LineChannelAdapter } from "../app/_backend/be6/adapters";

test("identity selection rejects obsolete and unconfigured providers", () => {
  for (const mode of [undefined, "google", "session", "supabase"]) assert.throws(() => resolveIdentityAdapter(mode));
});

test("origin protection rejects cross-site, null origin and cookie requests with no origin", () => {
  const attempts: Record<string, string>[] = [{ origin: "https://evil.test" }, { origin: "null" }, { "sec-fetch-site": "cross-site" }, { cookie: "session=value" }];
  for (const headers of attempts) assert.throws(() => requireSameOrigin(new Request("https://shop.test/api/be1", { headers })));
  requireSameOrigin(new Request("https://shop.test/api/be1", { headers: { origin: "https://shop.test", cookie: "session=value" } }));
});

test("bounded JSON rejects oversized streams without content-length, malformed JSON and misleading MIME", async () => {
  const request = (body: string, type = "application/json") => new Request("https://shop.test", { method: "POST", headers: { "content-type": type }, body });
  assert.deepEqual(await readJson(request('{"ok":true}')), { ok: true });
  await assert.rejects(readJson(request('"' + 'x'.repeat(65536) + '"')));
  await assert.rejects(readJson(request('{')));
  await assert.rejects(readJson(request('{}', 'application/jsonp')));
  for (const phase of [1, 2, 3]) assert.match(readFileSync(`app/api/be${phase}/route.ts`, "utf8"), /await readJson\(request\)/);
});

test("unconfigured authentication never executes a mutation", async () => {
  let executed = false;
  const response = await businessRequest(new Request("https://shop.test/api/be8", { method: "POST", body: "{}" }), undefined, async () => { executed = true; });
  assert.equal(response.status, 501); assert.equal(executed, false);
});

test("production environment rejects fixtures and missing limiter; rate failure never calls application", async () => {
  const request = new Request("https://shop.test/api/be7?token=private", { headers: { "cf-connecting-ip": "192.0.2.1" } });
  let invoked = 0; const next = async () => { invoked++; return new Response("ok"); }; const quiet = () => {};
  assert.equal((await secureFetch(request, { MEAWKETTING_ENV: "production" }, next, quiet)).status, 503);
  assert.equal((await secureFetch(request, { MEAWKETTING_ENV: "production", MEAWKETTING_FIXTURE_MODE: "test", API_RATE_LIMITER: { limit: async () => ({ success: true }) } }, next, quiet)).status, 503);
  const limited = await secureFetch(request, { API_RATE_LIMITER: { limit: async () => ({ success: false }) } }, next, quiet);
  assert.equal(limited.status, 429); assert.equal(limited.headers.get("retry-after"), "60"); assert.equal(invoked, 0);
  assert.equal((await secureFetch(request, { API_RATE_LIMITER: { limit: async () => { throw Error("binding unavailable"); } } }, next, quiet)).status, 500);
  assert.equal(invoked, 0);
});

test("Worker wraps streaming replies with headers and bounded PII-free failure evidence", async () => {
  const events: unknown[] = [];
  const response = await secureFetch(new Request("https://shop.test/api/channels/line/secret-object?token=secret", { headers: { "x-correlation-id": "private\u0020value" } }), {}, async () => { throw Error("password secret"); }, event => events.push(event));
  assert.equal(response.status, 500); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("x-request-id")!, /^[a-f0-9-]+$/);
  assert.doesNotMatch(JSON.stringify(events) + await response.text(), /secret|password|private/);
  const html = await secureFetch(new Request("https://shop.test/business/scan"), {}, async () => new Response("stream"));
  assert.equal(await html.text(), "stream"); assert.match(html.headers.get("content-security-policy")!, /frame-ancestors 'self'/);
  assert.match(html.headers.get("permissions-policy")!, /camera=\(self\)/);
});

test("guest signup status is quiet, while real auth failures retain safe route evidence", async () => {
  const events: unknown[] = [];
  const run = (path: string, method = "GET", status = 401) => secureFetch(new Request(`https://shop.test${path}`, { method }), {},
    async () => Response.json({ error: "UNAUTHENTICATED" }, { status }), event => events.push(event));
  const guest = await run("/api/business/register?email=private");
  assert.equal(guest.status, 401);
  assert.deepEqual(events, []);
  assert.ok(guest.headers.get("x-request-id"));
  await run("/api/business/register", "POST");
  await run("/api/auth/email/login?password=private", "POST");
  await run("/api/business/register", "GET", 403);
  assert.deepEqual(events.map(event => (event as { route: string }).route), ["/api/business/register", "/api/auth/email/login", "/api/business/register"]);
  assert.doesNotMatch(JSON.stringify(events), /private|email=|password=/);
  let limiterKey = "";
  await secureFetch(new Request("https://shop.test/api/auth/email/login"), { API_RATE_LIMITER: { limit: async ({ key }) => { limiterKey = key; return { success: true }; } } }, async () => new Response("ok"));
  assert.equal(limiterKey, "/api/other:unknown");
});

test("development timing uses measured durations without mixing Worker and Node clocks", async () => {
  const variables = process.env as Record<string, string | undefined>;
  const previous = variables.NODE_ENV;
  try {
    for (const [mode, expected] of [["development", "0,24,94"], ["production", "1790928236600,24,94"]]) {
      variables.NODE_ENV = mode;
      const response = await secureFetch(new Request("https://shop.test/business/login"), {},
        async () => new Response("ok", { headers: { "x-vinext-timing": "1790928236600,24,94" } }));
      assert.equal(response.headers.get("x-vinext-timing"), expected);
      assert.equal(await response.text(), "ok");
    }
  } finally {
    if (previous === undefined) delete variables.NODE_ENV; else variables.NODE_ENV = previous;
  }
});

test("LINE transient server failures retry with unchanged retry key, credentials never follow redirects", async () => {
  const keys: string[] = [];
  const adapter = new LineChannelAdapter("test-secret", "test-access-token", async (_url, init) => {
    keys.push(new Headers(init?.headers).get("X-Line-Retry-Key")!); assert.equal(init?.redirect, "error"); return new Response(null, { status: 503 });
  });
  const envelope = { retryKey: crypto.randomUUID(), recipient: "test-user", text: "test" };
  assert.equal((await adapter.send(envelope)).state, "retry"); assert.equal((await adapter.send(envelope)).state, "retry"); assert.deepEqual(keys, [envelope.retryKey, envelope.retryKey]);
});
