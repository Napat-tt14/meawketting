import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { backendContext, withBackend } from "../app/_backend/runtime";
import { SessionIdentityAdapter, beginBusinessLogin, finishGoogleLogin, logoutSession, tokenHash } from "../app/_backend/auth";
import { imageType, readMedia, uploadMedia } from "../app/_backend/media";
import { GET as googleStart } from "../app/api/auth/google/start/route";
import { GET as lineStart } from "../app/api/auth/line/start/route";
import { seededDatabase, OWNER, WHISKER, ARI, STAFF } from "./d1Fixtures";

const env = { MEAWKETTING_AUTH_MODE: "session", GOOGLE_CLIENT_ID: "google-test", GOOGLE_CLIENT_SECRET: "synthetic-google-secret",
  LINE_LOGIN_CHANNEL_ID: "line-test", LINE_LOGIN_CHANNEL_SECRET: "synthetic-line-secret", MEAWKETTING_PUBLIC_ORIGIN: "https://shop.test" };
const cookieName = "__Host-meawketting-session";
const req = (path = "/api/be1", cookie = "") => new Request(`https://shop.test${path}`, { headers: { origin: "https://shop.test", cookie } });
const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
function harness(t: TestContext) {
  const db = seededDatabase();
  t.after(() => db.close());
  const run = (request: Request, next: () => Promise<Response>) => withBackend(request, env, async () => { backendContext().database = db; return next(); });
  return { db, run };
}
async function session(db: ReturnType<typeof seededDatabase>, person: string | null = OWNER, provider = "google", subject = crypto.randomUUID()) {
  const id = crypto.randomUUID(), token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url"), now = new Date().toISOString();
  db.inspect.prepare("INSERT INTO auth_identities(id,person_id,provider,provider_subject,created_at,updated_at) VALUES(?,?,?,?,?,?)").run(id, person, provider, subject, now, now);
  db.inspect.prepare("INSERT INTO auth_sessions(id,identity_id,person_id,token_hash,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?,?)")
    .run(crypto.randomUUID(), id, person, await tokenHash(token), new Date(Date.now() + 3600000).toISOString(), now, now);
  return { id, token, cookie: `${cookieName}=${token}`, subject };
}

test("opaque sessions trust D1 linkage only and reject duplicate, absent, forged, expired and revoked cookies", async t => {
  const { db, run } = harness(t), valid = await session(db);
  const resolve = async (cookie: string) => run(req("/api/be1", cookie), async () => {
    assert.equal((await new SessionIdentityAdapter().resolve()).personId, OWNER); return new Response(null);
  });
  await resolve(valid.cookie);
  for (const cookie of ["", `${cookieName}=forged`, `${valid.cookie}; ${valid.cookie}`, `${cookieName}=${"a".repeat(43)}`]) await assert.rejects(resolve(cookie), { code: "UNAUTHENTICATED" });
  db.inspect.prepare("UPDATE auth_sessions SET created_at=?,expires_at=? WHERE token_hash=?").run(new Date(Date.now() - 3600000).toISOString(), new Date(Date.now() - 1000).toISOString(), await tokenHash(valid.token));
  await assert.rejects(resolve(valid.cookie), { code: "UNAUTHENTICATED" });
  db.inspect.prepare("UPDATE auth_sessions SET expires_at=?,revoked_at=?").run(new Date(Date.now() + 3600000).toISOString(), new Date().toISOString());
  await assert.rejects(resolve(valid.cookie), { code: "UNAUTHENTICATED" });
  const unlinked = await session(db, null);
  await assert.rejects(resolve(unlinked.cookie), { code: "FORBIDDEN" });
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM persons").get()?.n, 6);
  assert.equal(db.inspect.prepare("SELECT token_hash FROM auth_sessions WHERE identity_id=?").get(valid.id)?.token_hash, await tokenHash(valid.token));
});

test("Google and LINE start directly with state, nonce, PKCE and secure host-only cookies", async t => {
  const { db, run } = harness(t);
  for (const [provider, host] of [["google", "accounts.google.com"], ["line", "access.line.me"]] as const) {
    const response = await run(req(`/api/auth/${provider}/start`), () => beginBusinessLogin(provider));
    const url = new URL(response.headers.get("location")!);
    assert.equal(url.hostname, host); assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(url.searchParams.get("redirect_uri"), "https://shop.test/api/auth/google/callback");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(url.searchParams.get("state")?.length, 43); assert.equal(url.searchParams.get("nonce")?.length, 43);
    const cookie = response.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Lax/); assert.doesNotMatch(cookie, /Domain=/);
    assert.equal(db.inspect.prepare("SELECT provider FROM auth_oauth_states WHERE token_hash=?").get(await tokenHash(url.searchParams.get("state")!))?.provider, provider);
  }
});

test("local OAuth permits development localhost only and uses host-only non-Secure cookies", async t => {
  const { db } = harness(t), variables = process.env as Record<string, string | undefined>, previous = variables.NODE_ENV;
  variables.NODE_ENV = "development";
  try {
    const request = new Request("http://localhost:5173/api/auth/google/start");
    const response = await withBackend(request, { ...env, MEAWKETTING_PUBLIC_ORIGIN: "http://localhost:5173" }, async () => { backendContext().database = db; return beginBusinessLogin("google"); });
    assert.equal(new URL(response.headers.get("location")!).searchParams.get("redirect_uri"), "http://localhost:5173/api/auth/google/callback");
    assert.match(response.headers.get("set-cookie")!, /meawketting-local-oauth=/); assert.doesNotMatch(response.headers.get("set-cookie")!, /; Secure/);
    await assert.rejects(withBackend(new Request("http://example.test/api/auth/google/start"), { ...env, MEAWKETTING_PUBLIC_ORIGIN: "http://example.test" }, () => beginBusinessLogin("google")));
  } finally { if (previous === undefined) delete variables.NODE_ENV; else variables.NODE_ENV = previous; }
});

test("OAuth start diagnostics preserve signup intent and never expose credentials", async t => {
  const events: string[] = [];
  t.mock.method(console, "warn", (event: string) => events.push(event));
  for (const handler of [googleStart, lineStart]) {
    const request = req("/api/auth/google/start?intent=register&secret=private");
    for (const [config, expected] of [[{ ...env, MEAWKETTING_PUBLIC_ORIGIN: "https://other.test" }, "origin-mismatch"], [{ ...env, GOOGLE_CLIENT_ID: undefined, LINE_LOGIN_CHANNEL_ID: undefined }, "not-configured"]] as const) {
      const response = await withBackend(request, config, () => handler(request));
      assert.equal(response.headers.get("location"), `https://shop.test/business/register?error=${expected}`); assert.equal(response.headers.has("set-cookie"), false);
    }
  }
  assert.doesNotMatch(events.join("\n"), /private|synthetic|secret=|https:/);
});

test("Google verifies cryptographic signature, issuer, audience, expiry and nonce; callbacks consume state once", async t => {
  const { db, run } = harness(t), pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: crypto.randomUUID(), use: "sig" };
  let claims: Record<string, unknown> = {}, calls = 0, forge = false;
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(init?.redirect, "error"); calls++;
    if (String(url).endsWith("/certs")) return Response.json({ keys: [jwk] }, { headers: { "cache-control": "max-age=300" } });
    assert.equal(String(url), "https://oauth2.googleapis.com/token");
    const body = init?.body as URLSearchParams; assert.equal(body.get("client_secret"), env.GOOGLE_CLIENT_SECRET); assert.equal(body.get("code_verifier")?.length, 43);
    const input = `${b64({ alg: "RS256", kid: jwk.kid })}.${b64(claims)}`;
    const signature = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(input))).toString("base64url");
    return Response.json({ id_token: `${input}.${forge ? Buffer.from("forged").toString("base64url") : signature}` });
  });
  t.mock.method(console, "warn", () => {});
  const callback = async (override: Record<string, unknown> = {}) => {
    const start = await run(req("/api/auth/google/start"), () => beginBusinessLogin("google")), url = new URL(start.headers.get("location")!);
    claims = { iss: "https://accounts.google.com", aud: env.GOOGLE_CLIENT_ID, sub: "stable-google-subject", exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000), nonce: url.searchParams.get("nonce"), email: "same@example.test", email_verified: true, ...override };
    const cookie = start.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    const request = req(`/api/auth/google/callback?code=test-code&state=${url.searchParams.get("state")}`, cookie);
    return { response: await run(request, () => finishGoogleLogin(request)), request };
  };
  for (const override of [{ iss: "https://evil.test" }, { aud: "other-client" }, { exp: 1 }, { nonce: "forged" }, { sub: "" }]) {
    assert.match((await callback(override)).response.headers.get("location")!, /login\?error=try-again/);
  }
  forge = true; assert.match((await callback()).response.headers.get("location")!, /login\?error=try-again/); forge = false;
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM auth_identities").get()?.n, 0);
  const success = await callback(); assert.equal(success.response.headers.get("location"), "https://shop.test/business/setup");
  const count = calls;
  assert.match((await run(success.request, () => finishGoogleLogin(success.request))).headers.get("location")!, /login\?error=try-again/); assert.equal(calls, count);
  await callback(); assert.equal(db.inspect.prepare("SELECT count(*) n FROM auth_identities").get()?.n, 1); assert.equal(db.inspect.prepare("SELECT count(*) n FROM persons").get()?.n, 6);
});

test("missing and foreign OAuth state never calls a provider", async t => {
  const { db, run } = harness(t); let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; throw Error("unexpected provider call"); }); t.mock.method(console, "warn", () => {});
  for (const request of [req("/api/auth/google/callback?code=forged"), req(`/api/auth/google/callback?code=forged&state=${"a".repeat(43)}`, `__Host-meawketting-oauth=${"b".repeat(43)}`)]) {
    assert.match((await run(request, () => finishGoogleLogin(request))).headers.get("location")!, /login\?error=try-again/);
  }
  const start = await run(req("/api/auth/google/start"), () => beginBusinessLogin("google")), url = new URL(start.headers.get("location")!);
  db.inspect.prepare("UPDATE auth_oauth_states SET expires_at=?").run(new Date(Date.now() - 1000).toISOString());
  const expired = req(`/api/auth/google/callback?code=test-code&state=${url.searchParams.get("state")}`, start.headers.getSetCookie()[0].split(";")[0]);
  assert.match((await run(expired, () => finishGoogleLogin(expired))).headers.get("location")!, /login\?error=try-again/);
  assert.equal(calls, 0);
});

test("LINE verifies provider tokens server-side, preserves linked Person, rotates session and denies revoked memberships", async t => {
  const { db, run } = harness(t), old = await session(db, OWNER, "line", "line-subject"); let nonce = "", verified = 0;
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(init?.redirect, "error");
    if (String(url).endsWith("/token")) return Response.json({ id_token: "synthetic-line-token" });
    assert.equal(String(url), "https://api.line.me/oauth2/v2.1/verify");
    assert.equal((init?.body as URLSearchParams).get("nonce"), nonce); assert.equal((init?.body as URLSearchParams).get("client_id"), env.LINE_LOGIN_CHANNEL_ID); verified++;
    return Response.json({ iss: "https://access.line.me", aud: env.LINE_LOGIN_CHANNEL_ID, sub: old.subject, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), nonce });
  });
  t.mock.method(console, "warn", () => {});
  const callback = async () => {
    const start = await run(req("/api/auth/line/start"), () => beginBusinessLogin("line")), url = new URL(start.headers.get("location")!); nonce = url.searchParams.get("nonce")!;
    const request = req(`/api/auth/google/callback?code=test-code&state=${url.searchParams.get("state")}`, `${start.headers.getSetCookie()[0].split(";")[0]}; ${old.cookie}`);
    return run(request, () => finishGoogleLogin(request));
  };
  const response = await callback(); assert.equal(response.headers.get("location"), "https://shop.test/business/home"); assert.equal(verified, 1);
  assert.ok(db.inspect.prepare("SELECT revoked_at FROM auth_sessions WHERE token_hash=?").get(await tokenHash(old.token))?.revoked_at);
  const cookie = response.headers.getSetCookie().find(value => value.startsWith(`${cookieName}=`))!.split(";")[0];
  const logout = await run(req("/api/auth/google/logout", cookie), logoutSession); assert.equal(logout.status, 204); assert.match(logout.headers.get("set-cookie")!, /Max-Age=0/);
  await assert.rejects(run(req("/api/be1", cookie), async () => { await new SessionIdentityAdapter().resolve(); return new Response(null); }), { code: "UNAUTHENTICATED" });
  db.inspect.prepare("UPDATE business_memberships SET status='inactive' WHERE person_id=?").run(OWNER);
  assert.match((await callback()).headers.get("location")!, /login\?error=try-again/);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM persons").get()?.n, 6);
});

function bucket() {
  const objects = new Map<string, Uint8Array>(); let puts = 0, deletes = 0, gets = 0;
  const binding = { put: async (key: string, value: Uint8Array) => { puts++; objects.set(key, value); return {}; }, delete: async (key: string) => { deletes++; objects.delete(key); },
    get: async (key: string) => { gets++; const bytes = objects.get(key); return bytes ? { body: bytes, writeHttpMetadata: (headers: Headers) => headers.set("content-type", "image/png") } : null; } } as unknown as R2Bucket;
  return { binding, objects, stats: () => ({ puts, deletes, gets }) };
}
test("private R2 media checks tenant and Branch before reads, streams authenticated objects and never publishes bucket URLs", async t => {
  const { db } = harness(t), owner = await session(db), staff = await session(db, STAFF), id = crypto.randomUUID(), storage = bucket();
  db.inspect.prepare("INSERT INTO media_objects(id,business_id,branch_id,kind,pet_id,object_path,content_type,byte_size,created_by) VALUES(?,?,?,'pet-photo',?,'scoped/private','image/png',8,?)")
    .run(id, WHISKER, ARI, "booking-pet-mochi", OWNER);
  storage.objects.set("scoped/private", new Uint8Array([137,80,78,71,13,10,26,10]));
  const run = (cookie: string, raw = false) => { const request = req(`/api/media?id=${id}${raw ? "&raw=1" : ""}`, cookie); return withBackend(request, { ...env, MEDIA: storage.binding }, async () => { backendContext().database = db; return readMedia(request); }); };
  assert.deepEqual(await (await run(owner.cookie)).json(), { url: `/api/media?id=${id}&raw=1` });
  const object = await run(owner.cookie, true); assert.equal(object.headers.get("content-type"), "image/png"); assert.match(object.headers.get("cache-control")!, /private, no-store/); assert.equal((await object.arrayBuffer()).byteLength, 8);
  await assert.rejects(run(staff.cookie, true), { code: "NOT_FOUND" }); assert.equal(storage.stats().gets, 1);
  assert.throws(() => imageType(new TextEncoder().encode('<svg onload="alert(1)">'))); assert.equal(imageType(new Uint8Array([137,80,78,71,13,10,26,10])), "image/png");
});
test("R2 upload rejects CSRF, oversize and MIME mismatch before storage, compensates failed metadata batch", async t => {
  const { db } = harness(t), owner = await session(db), storage = bucket();
  const run = (bytes: Uint8Array, type = "image/png", origin = "https://shop.test") => {
    const request = new Request(`https://shop.test/api/media?kind=business-logo&businessId=${WHISKER}`, { method: "POST", headers: { cookie: owner.cookie, origin, "content-type": type }, body: new Blob([new Uint8Array(bytes)]) });
    return withBackend(request, { ...env, MEDIA: storage.binding }, async () => { backendContext().database = db; return uploadMedia(request); });
  };
  const png = new Uint8Array([137,80,78,71,13,10,26,10]);
  await assert.rejects(run(png, "image/png", "https://evil.test"), { code: "FORBIDDEN" });
  await assert.rejects(run(new Uint8Array(10485761)), { code: "INVALID_INPUT" }); await assert.rejects(run(png, "image/jpeg"), { code: "INVALID_INPUT" }); assert.equal(storage.stats().puts, 0);
  assert.equal((await run(png)).status, 201); assert.equal(db.inspect.prepare("SELECT count(*) n FROM media_objects").get()?.n, 1);
  assert.match([...storage.objects.keys()][0], new RegExp(`^${WHISKER}/business/logo/[0-9a-f-]+$`));
  db.inspect.exec("CREATE TRIGGER injected_media_failure BEFORE INSERT ON media_objects BEGIN SELECT RAISE(ABORT,'injected failure'); END");
  await assert.rejects(run(png)); assert.equal(storage.stats().puts, 2); assert.equal(storage.stats().deletes, 1); assert.equal(db.inspect.prepare("SELECT count(*) n FROM media_objects").get()?.n, 1);
});
