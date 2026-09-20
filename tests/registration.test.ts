import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { backendContext, withBackend } from "../app/_backend/runtime";
import { connectPostgres } from "../app/_backend/postgres";
import { registrationRequest } from "../app/_backend/businessRegistration";
import { beginBusinessLogin } from "../app/_backend/supabaseAuth";
import { seededDatabase, OWNER, WHISKER, ARI } from "./postgresFixtures";
import { Be1Application } from "../app/_backend/be1/application";
import { PostgresBe1Repository } from "../app/_backend/be1/postgresRepository";

const uid = "22222222-2222-4222-8222-222222222222";
const env = { MEAWKETTING_AUTH_MODE: "supabase", SUPABASE_URL: "https://auth.example.test", SUPABASE_PUBLISHABLE_KEY: "synthetic-key", MEAWKETTING_PUBLIC_ORIGIN: "https://shop.test" };
const input = { displayName: "Synthetic owner", businessName: "Synthetic shop", branchName: "Main", phone: "0812345678", email: "", modules: ["grooming", "hotel"], confirmed: true };
function harness(t: TestContext) {
  const db = seededDatabase();
  let provider = "google";
  t.mock.method(globalThis, "fetch", async () => Response.json({ id: uid, app_metadata: { provider }, user_metadata: { role: "OWNER" }, aud: "authenticated", role: "authenticated" }));
  const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const cookie = `__Host-meawketting-auth=base64-${b64({ access_token: `${b64({alg:"HS256"})}.${b64({sub:uid,exp:Math.floor(Date.now()/1000)+3600})}.test`,refresh_token:"test",expires_at:Math.floor(Date.now()/1000)+3600,user:{id:uid} })}`;
  const run = (body: unknown = input, method = "POST", origin = "https://shop.test", authenticated = true) => {
    const request = new Request("https://shop.test/api/business/register", { method, headers: { origin, "content-type":"application/json", ...(authenticated ? {cookie} : {}) }, ...(method === "POST" ? {body:JSON.stringify(body)} : {}) });
    return withBackend(request,env,async () => { backendContext().database = connectPostgres(process.env.MEAWKETTING_TEST_DATABASE_URL!,db.schema); return registrationRequest(request); });
  };
  return { db, run, line: () => { provider="custom:line"; } };
}
test("registration creates one atomic Owner workspace and concurrent identical retries reuse it", async t => {
  const { db, run } = harness(t);
  assert.deepEqual(await (await run(null,"GET")).json(), { authenticated:true, registered:false });
  const responses = await Promise.all([run(),run(),run()]);
  assert.deepEqual(responses.map(r=>r.status),[200,200,200]);
  const results = await Promise.all(responses.map(r=>r.json()));
  assert.deepEqual(results[0],results[1]); assert.deepEqual(results[1],results[2]);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM business_registrations").get()?.n,1);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM audit_events WHERE action='business.register'").get()?.n,1);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM branch_operating_hours h JOIN business_registrations r ON r.branch_id=h.branch_id WHERE h.closed=1").get()?.n,7);
  assert.equal((await run({...input,businessName:"Changed"})).status,409);
  assert.equal(db.inspect.prepare("SELECT m.role FROM business_memberships m JOIN business_registrations r USING(business_id)").get()?.role,"OWNER");
  const app = new Be1Application(new PostgresBe1Repository(db));
  const personId = db.inspect.prepare("SELECT person_id FROM auth_person_links WHERE auth_user_id=?::uuid").get(uid)?.person_id as string;
  const actor = await app.resolvePerson(personId);
  const session = await app.resolveSession(actor);
  assert.equal(session.workspaces.length,1);
  assert.equal(session.workspaces[0].permittedBranches.length,1);
  await assert.rejects(app.getBusiness(actor,WHISKER),{code:"FORBIDDEN"});
  // Scoped lookup conceals foreign Branch existence.
  await assert.rejects(app.getBranch(actor,session.workspaces[0].business.id,ARI),{code:"NOT_FOUND"});
  db.inspect.exec("UPDATE businesses SET status='inactive' WHERE id IN (SELECT business_id FROM business_registrations)");
  assert.equal((await run()).status,403);
});
test("registration rejects missing auth, cross-origin, unconfirmed, forged authority, invalid contact and modules without writes", async t => {
  const { db, run } = harness(t);
  assert.equal((await run(input,"POST","https://shop.test",false)).status,401);
  assert.equal((await run(input,"POST","https://evil.test")).status,403);
  for (const body of [{...input,confirmed:false},{...input,role:"OWNER"},{...input,modules:[]},{...input,modules:["hotel","hotel"]},{...input,phone:"bad"},{...input,email:"bad"},{...input,businessName:""}]) assert.equal((await run(body)).status,400);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM business_registrations").get()?.n,0);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM persons").get()?.n,6);
});
test("LINE without email registers; already linked identities cannot self-provision another Owner", async t => {
  const { db, run, line } = harness(t); line();
  db.inspect.prepare("INSERT INTO auth_person_links(auth_user_id,person_id) VALUES(?::uuid,?)").run(uid,OWNER);
  assert.equal((await run()).status,403);
  db.inspect.exec("DELETE FROM auth_person_links");
  assert.equal((await run()).status,200);
  assert.equal(db.inspect.prepare("SELECT p.primary_email FROM persons p JOIN auth_person_links l ON l.person_id=p.id").get()?.primary_email,null);
});
test("registration failure rolls back Person, Business, membership and auth link together", async t => {
  const { db, run } = harness(t);
  db.inspect.exec("ALTER TABLE business_registrations ADD CONSTRAINT injected_failure CHECK(false) NOT VALID");
  assert.equal((await run()).status,500);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM persons").get()?.n,6);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM auth_person_links").get()?.n,0);
});
test("LINE uses Supabase custom provider with PKCE and the same server callback", async () => {
  const request = new Request("https://shop.test/api/auth/line/start");
  const response = await withBackend(request,env,()=>beginBusinessLogin("custom:line"));
  const url = new URL(response.headers.get("location")!);
  assert.equal(url.searchParams.get("provider"),"custom:line");
  assert.equal(url.searchParams.get("code_challenge_method"),"s256");
  assert.equal(url.searchParams.get("redirect_to"),"https://shop.test/api/auth/google/callback");
});
