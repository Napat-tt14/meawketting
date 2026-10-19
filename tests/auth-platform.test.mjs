import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import { Miniflare, Response as WorkerResponse } from "miniflare";

test("Workers completes Google/LINE OAuth and refuses token or signing-key redirects", async () => {
  const bundle = await build({ stdin: { contents: `
    import { withBackend } from './app/_backend/runtime';
    import { beginBusinessLogin, finishGoogleLogin } from './app/_backend/auth';
    import { registrationRequest } from './app/_backend/businessRegistration';
    export default { fetch(request, env) {
      return withBackend(request, env, () => {
        const path = new URL(request.url).pathname;
        return path.endsWith('/start') ? beginBusinessLogin(path.includes('/line/') ? 'line' : 'google')
          : path.endsWith('/callback') ? finishGoogleLogin(request) : registrationRequest(request);
      });
    }};`, resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "neutral", external: ["node:*"], define: { "process.env.NODE_ENV": '"production"' } });
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: "worker-test-key", use: "sig" };
  let nonce = "", redirectAt = "", calls = [];
  const json = value => new WorkerResponse(JSON.stringify(value), { headers: { "content-type": "application/json" } });
  const runtime = new Miniflare({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: "2026-05-15", compatibilityFlags: ["nodejs_compat"], d1Databases: ["DB"], d1Persist: false,
    bindings: { MEAWKETTING_AUTH_MODE: "session", MEAWKETTING_PUBLIC_ORIGIN: "https://shop.test", GOOGLE_CLIENT_ID: "google-test", GOOGLE_CLIENT_SECRET: "synthetic-google-secret", LINE_LOGIN_CHANNEL_ID: "line-test", LINE_LOGIN_CHANNEL_SECRET: "synthetic-line-secret" },
    outboundService: async request => {
      const url = new URL(request.url); calls.push(url.origin + url.pathname);
      if (url.pathname === redirectAt) return new WorkerResponse(null, { status: 302, headers: { location: "https://unexpected.test/never" } });
      if (url.pathname.endsWith("/certs")) return json({ keys: [jwk] });
      const body = new URLSearchParams(await request.text());
      const line = url.hostname === "api.line.me", clientId = line ? "line-test" : "google-test";
      const claims = { iss: line ? "https://access.line.me" : "https://accounts.google.com", aud: clientId, sub: `${clientId}-subject`, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), nonce };
      if (url.pathname.endsWith("/verify")) { assert.equal(body.get("nonce"), nonce); return json(claims); }
      assert.equal(body.get("client_secret"), line ? "synthetic-line-secret" : "synthetic-google-secret");
      assert.equal(body.get("redirect_uri"), "https://shop.test/api/auth/google/callback");
      assert.equal(body.get("code_verifier").length, 43);
      if (line) return json({ id_token: "synthetic-line-token" });
      const input = `${Buffer.from(JSON.stringify({ alg: "RS256", kid: jwk.kid })).toString("base64url")}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}`;
      const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(input));
      return json({ id_token: `${input}.${Buffer.from(signature).toString("base64url")}` });
    } });
  try {
    const db = await runtime.getD1Database("DB");
    const ddl = readFileSync("migrations/d1/0001_initial.sql", "utf8").split(/(?=^CREATE\b)/m).filter(sql => /^CREATE\b/.test(sql));
    await db.batch(ddl.map(sql => db.prepare(sql)));
    // Reject signing-key redirects before the first successful request caches keys.
    for (const [provider, blocked] of [["google", "/token"], ["google", "/oauth2/v3/certs"], ["line", "/oauth2/v2.1/token"], ["google", ""], ["line", ""]]) {
      redirectAt = blocked; calls = [];
      const start = await runtime.dispatchFetch(`https://shop.test/api/auth/${provider}/start`, { redirect: "manual" });
      const authorization = new URL(start.headers.get("location")); nonce = authorization.searchParams.get("nonce");
      const callback = await runtime.dispatchFetch(`https://shop.test/api/auth/google/callback?code=synthetic&state=${authorization.searchParams.get("state")}`, { redirect: "manual", headers: { cookie: start.headers.getSetCookie()[0].split(";")[0] } });
      assert.ok(calls.length > 0, "OAuth must reach the provider in Workers");
      assert.ok(calls.every(url => !url.includes("unexpected.test")));
      assert.equal(callback.headers.get("location"), `https://shop.test/business/${blocked ? "login?error=try-again" : "setup"}`);
      const cookie = callback.headers.getSetCookie().find(value => value.startsWith("__Host-meawketting-session="));
      if (blocked) { assert.equal(cookie, undefined); continue; }
      assert.match(cookie, /HttpOnly; SameSite=Lax; Max-Age=604800; Secure/);
      const status = await runtime.dispatchFetch("https://shop.test/api/business/register", { headers: { cookie: cookie.split(";")[0] } });
      assert.equal(status.status, 200);
      assert.deepEqual(await status.json(), { authenticated: true, registered: false });
    }
    assert.equal((await db.prepare("SELECT count(*) n FROM auth_identities").first()).n, 2);
    assert.equal((await db.prepare("SELECT count(*) n FROM persons").first()).n, 0);
  } finally { await runtime.dispose(); }
});
