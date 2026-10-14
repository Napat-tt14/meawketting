import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { backendContext, withBackend } from "../app/_backend/runtime";
import { tokenHash } from "../app/_backend/auth";
import { registrationRequest } from "../app/_backend/businessRegistration";
import { seededDatabase, OWNER, WHISKER, ARI } from "./d1Fixtures";
import { Be1Application } from "../app/_backend/be1/application";
import { D1Be1Repository } from "../app/_backend/be1/d1Repository";

const env = { MEAWKETTING_AUTH_MODE: "session", MEAWKETTING_PUBLIC_ORIGIN: "https://shop.test" };
const input = { displayName: "Synthetic owner", businessName: "Synthetic shop", branchName: "Main", phone: "0812345678", email: "", modules: ["grooming", "hotel"], confirmed: true };
async function harness(t: TestContext, provider = "google") {
  const db = seededDatabase(), uid = crypto.randomUUID(), token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url"), now = new Date().toISOString();
  t.after(() => db.close());
  db.inspect.prepare("INSERT INTO auth_identities(id,provider,provider_subject,created_at,updated_at) VALUES(?,?,?,?,?)").run(uid, provider, crypto.randomUUID(), now, now);
  db.inspect.prepare("INSERT INTO auth_sessions(id,identity_id,token_hash,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?)")
    .run(crypto.randomUUID(), uid, await tokenHash(token), new Date(Date.now() + 3600000).toISOString(), now, now);
  const run = (body: unknown = input, method = "POST", origin = "https://shop.test", authenticated = true) => {
    const request = new Request("https://shop.test/api/business/register", { method, headers: { origin, "content-type": "application/json", ...(authenticated ? { cookie: `__Host-meawketting-session=${token}` } : {}) }, ...(method === "POST" ? { body: JSON.stringify(body) } : {}) });
    return withBackend(request, env, async () => { backendContext().database = db; return registrationRequest(request); });
  };
  return { db, uid, run };
}
test("registration creates one atomic Owner workspace; concurrent retries reuse the same receipt", async t => {
  const { db, uid, run } = await harness(t);
  assert.deepEqual(await (await run(null, "GET")).json(), { authenticated: true, registered: false });
  const responses = await Promise.all([run(), run(), run()]);
  assert.deepEqual(responses.map(response => response.status), [200, 200, 200]);
  const results = await Promise.all(responses.map(response => response.json()));
  assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM business_registrations").get()?.n, 1);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM audit_events WHERE action='business.register'").get()?.n, 1);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM branch_operating_hours h JOIN business_registrations r ON r.branch_id=h.branch_id WHERE h.closed=1").get()?.n, 7);
  assert.equal((await run({ ...input, businessName: "Changed" })).status, 409);
  assert.equal(db.inspect.prepare("SELECT m.role FROM business_memberships m JOIN business_registrations r USING(business_id)").get()?.role, "OWNER");
  const app = new Be1Application(new D1Be1Repository(db));
  assert.deepEqual(await (await run(null, "GET")).json(), { authenticated: true, registered: true });
  const personId = db.inspect.prepare("SELECT person_id FROM auth_identities WHERE id=?").get(uid)?.person_id as string;
  assert.equal(db.inspect.prepare("SELECT person_id FROM auth_sessions WHERE identity_id=?").get(uid)?.person_id, personId);
  const actor = await app.resolvePerson(personId), session = await app.resolveSession(actor);
  assert.equal(session.workspaces.length, 1); assert.equal(session.workspaces[0].permittedBranches.length, 1);
  await assert.rejects(app.getBusiness(actor, WHISKER), { code: "FORBIDDEN" });
  await assert.rejects(app.getBranch(actor, session.workspaces[0].business.id, ARI), { code: "NOT_FOUND" });
  db.inspect.exec("UPDATE businesses SET status='inactive' WHERE id IN (SELECT business_id FROM business_registrations)");
  assert.equal((await run()).status, 403); assert.equal((await run(null, "GET")).status, 403);
});
test("registration rejects missing auth, cross-origin, forged authority, invalid contact and modules without writes", async t => {
  const { db, run } = await harness(t);
  assert.equal((await run(input, "POST", "https://shop.test", false)).status, 401);
  assert.equal((await run(input, "POST", "https://evil.test")).status, 403);
  for (const body of [{ ...input, confirmed: false }, { ...input, role: "OWNER" }, { ...input, modules: [] }, { ...input, modules: ["hotel", "hotel"] }, { ...input, phone: "bad" }, { ...input, email: "bad" }, { ...input, businessName: "" }]) assert.equal((await run(body)).status, 400);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM business_registrations").get()?.n, 0);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM persons").get()?.n, 6);
});
test("LINE without email registers; already linked identities cannot self-provision another Owner", async t => {
  const { db, uid, run } = await harness(t, "line");
  db.inspect.prepare("UPDATE auth_identities SET person_id=? WHERE id=?").run(OWNER, uid);
  db.inspect.prepare("UPDATE auth_sessions SET person_id=? WHERE identity_id=?").run(OWNER, uid);
  assert.equal((await run()).status, 403);
  const fresh = await harness(t, "line");
  assert.equal((await fresh.run()).status, 200);
  assert.equal(fresh.db.inspect.prepare("SELECT p.primary_email FROM persons p JOIN auth_identities i ON i.person_id=p.id WHERE i.id=?").get(fresh.uid)?.primary_email, null);
});
test("registration failure rolls back Person, Business, membership, auth linkage and audit in one D1 batch", async t => {
  const { db, uid, run } = await harness(t);
  db.inspect.exec("CREATE TRIGGER injected_registration_failure BEFORE INSERT ON business_registrations BEGIN SELECT RAISE(ABORT,'injected failure'); END");
  assert.equal((await run()).status, 500);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM persons").get()?.n, 6);
  assert.equal(db.inspect.prepare("SELECT person_id FROM auth_identities WHERE id=?").get(uid)?.person_id, null);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM audit_events WHERE action='business.register'").get()?.n, 0);
});
test("revoked setup sessions cannot create authority and provider subjects are unique", async t => {
  const { db, uid, run } = await harness(t);
  const now = new Date().toISOString();
  db.inspect.prepare("UPDATE auth_sessions SET revoked_at=? WHERE identity_id=?").run(now, uid);
  assert.equal((await run()).status, 401);
  assert.throws(() => db.inspect.prepare("INSERT INTO auth_identities(id,provider,provider_subject,created_at,updated_at) SELECT ? ,provider,provider_subject,?,? FROM auth_identities WHERE id=?").run(crypto.randomUUID(), now, now, uid));
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM business_registrations").get()?.n, 0);
  const racing = await harness(t), current = racing.db.inspect.prepare("SELECT id FROM auth_sessions WHERE identity_id=?").get(racing.uid)!.id;
  racing.db.inspect.prepare(`INSERT INTO auth_sessions(id,identity_id,token_hash,expires_at,created_at,last_seen_at)
    SELECT ?,identity_id,?,expires_at,created_at,last_seen_at FROM auth_sessions WHERE id=?`).run(crypto.randomUUID(), await tokenHash("another-live-session"), current);
  const atomicBatch = racing.db.batch.bind(racing.db);
  t.mock.method(racing.db, "batch", async (statements: Parameters<typeof racing.db.batch>[0]) => {
    racing.db.inspect.prepare("UPDATE auth_sessions SET revoked_at=? WHERE id=?").run(new Date().toISOString(), current);
    return atomicBatch(statements);
  });
  assert.equal((await racing.run()).status, 403);
  assert.equal(racing.db.inspect.prepare("SELECT count(*) n FROM persons").get()?.n, 6);
  assert.equal(racing.db.inspect.prepare("SELECT count(*) n FROM business_registrations").get()?.n, 0);
});
