import assert from "node:assert/strict";
import test from "node:test";
import { withBackend, backendContext } from "../app/_backend/runtime";
import { connectPostgres } from "../app/_backend/postgres";
import { SupabaseIdentityAdapter, beginGoogleLogin, finishGoogleLogin, logoutSupabase } from "../app/_backend/supabaseAuth";
import { imageType, readMedia, uploadMedia } from "../app/_backend/media";
import { seededDatabase, OWNER, WHISKER, ARI, STAFF } from "./postgresFixtures";

const userId = "11111111-1111-4111-8111-111111111111";
const env = { MEAWKETTING_AUTH_MODE: "supabase", SUPABASE_URL: "https://auth.example.test", SUPABASE_PUBLISHABLE_KEY: "synthetic-anon-key", SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key", MEAWKETTING_PUBLIC_ORIGIN: "https://shop.test" };
const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
function cookie(expires = Math.floor(Date.now()/1000)+3600) {
  const jwt = `${b64({alg:"HS256",typ:"JWT"})}.${b64({sub:userId,exp:expires,aud:"authenticated",session_id:userId})}.synthetic-signature`;
  return `__Host-meawketting-auth=base64-${b64({access_token:jwt,refresh_token:"synthetic-refresh",token_type:"bearer",expires_at:expires,expires_in:3600,user:{id:"forged-client-person",email:"owner@evil.test"}})}`;
}
function req(path = "/api/be1", cookies = cookie()) { return new Request(`https://shop.test${path}`, { headers: { cookie: cookies, origin: "https://shop.test" } }); }
function verified() { return Response.json({ id:userId, aud:"authenticated", role:"authenticated", email:"identity@example.test", app_metadata:{provider:"google"}, user_metadata:{role:"OWNER"} }); }

test("Supabase identity trusts verified user ID only, maps to Person, ignores email/claims, and denies unmapped users", async t => {
  const db = seededDatabase();
  db.inspect.prepare("INSERT INTO auth_person_links(auth_user_id,person_id) VALUES(?::uuid,?)").run(userId, OWNER);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string) => { assert.match(String(url), /\/auth\/v1\/user$/); calls++; return verified(); });
  const run = async (cookies = cookie()) => withBackend(req("/api/be1",cookies), env, async () => {
    backendContext().database = connectPostgres(process.env.MEAWKETTING_TEST_DATABASE_URL!, db.schema);
    assert.equal((await new SupabaseIdentityAdapter().resolve()).personId, OWNER);
    return new Response(null);
  });
  await run(); assert.equal(calls, 1);
  await assert.rejects(run(`${cookie()}; ${cookie()}`), { code:"UNAUTHENTICATED" });
  assert.equal(calls,1);
  db.inspect.exec("DELETE FROM auth_person_links");
  await assert.rejects(run(), { code: "FORBIDDEN" });
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM persons").get()?.n, 6);
});
test("Supabase sessions fail closed for missing, duplicate, forged, expired and rejected credentials", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({error:"invalid_token",message:"invalid token"},{status:401}));
  for(const value of ["", "__Host-meawketting-auth=forged", `${cookie()}; ${cookie()}`, cookie(1), cookie()]) {
    await assert.rejects(withBackend(req("/api/be1",value),env,async()=>{
      await new SupabaseIdentityAdapter().resolve(); return new Response(null);
    }));
  }
});
test("Google login uses Supabase PKCE and secure HttpOnly cookies; logout revokes at Supabase", async t => {
  const start = await withBackend(req("/api/auth/google/start",""),env,beginGoogleLogin);
  const url = new URL(start.headers.get("location")!);
  assert.equal(url.origin,env.SUPABASE_URL); assert.equal(url.searchParams.get("provider"),"google");
  assert.equal(url.searchParams.get("code_challenge_method"),"s256");
  assert.equal(url.searchParams.get("redirect_to"),"https://shop.test/api/auth/google/callback");
  const verifier = start.headers.get("set-cookie")!;
  assert.match(verifier,/HttpOnly/); assert.match(verifier,/Secure/); assert.match(verifier,/SameSite=Lax/i);
  let revoked = false;
  t.mock.method(globalThis,"fetch",async (url:string)=>{ if(String(url).includes("/logout")){revoked=true;return new Response(null,{status:204});}return verified(); });
  const logout = await withBackend(req("/api/auth/google/logout"),env,logoutSupabase);
  assert.equal(logout.status,204); assert.equal(revoked,true); assert.match(logout.headers.get("set-cookie")!,/Max-Age=0/i);
});
test("private media validates types, denies cross-Branch reads, and only signs authorized opaque paths", async t => {
  const db=seededDatabase(), id=crypto.randomUUID();
  db.inspect.prepare("INSERT INTO auth_person_links(auth_user_id,person_id) VALUES(?::uuid,?)").run(userId,OWNER);
  db.inspect.prepare("INSERT INTO media_objects(id,business_id,branch_id,kind,pet_id,object_path,content_type,byte_size,created_by) VALUES(?::uuid,?,?,'pet-photo',?,'opaque/random','image/png',8,?)")
    .run(id,WHISKER,ARI,"booking-pet-mochi",OWNER);
  let signed=0;
  t.mock.method(globalThis,"fetch",async(url:string)=>{
    if(String(url).includes("/auth/v1/user"))return verified();
    assert.match(String(url),/\/storage\/v1\/object\/sign\/business-media\/opaque\/random$/); signed++;
    return Response.json({signedURL:"/object/sign/business-media/opaque/random?token=synthetic"});
  });
  const run=()=>withBackend(req(`/api/media?id=${id}`),env,async()=>{backendContext().database=connectPostgres(process.env.MEAWKETTING_TEST_DATABASE_URL!,db.schema);return readMedia(backendContext().request)});
  const read=await run(); assert.equal(((await read.json()) as {expiresIn:number}).expiresIn,60); assert.equal(signed,1);
  db.inspect.prepare("UPDATE auth_person_links SET person_id=? WHERE auth_user_id=?::uuid").run(STAFF,userId);
  await assert.rejects(run()); assert.equal(signed,1);
  assert.throws(()=>imageType(new TextEncoder().encode('<svg onload="alert(1)">')));
  assert.equal(imageType(new Uint8Array([137,80,78,71,13,10,26,10])),"image/png");
});
test("media upload rejects oversized bodies and mismatched MIME before reaching Storage", async t => {
  const db=seededDatabase();db.inspect.prepare("INSERT INTO auth_person_links(auth_user_id,person_id) VALUES(?::uuid,?)").run(userId,OWNER);
  t.mock.method(globalThis,"fetch",async(url:string)=>{assert.match(String(url),/\/auth\/v1\/user$/);return verified()});
  for(const bytes of [new Uint8Array(10485761),new Uint8Array([137,80,78,71,13,10,26,10])]){
    const request=new Request(`https://shop.test/api/media?kind=business-logo&businessId=${WHISKER}`,{method:"POST",headers:{cookie:cookie(),origin:"https://shop.test","content-type":"image/jpeg"},body:bytes});
    await assert.rejects(withBackend(request,env,async()=>{backendContext().database=connectPostgres(process.env.MEAWKETTING_TEST_DATABASE_URL!,db.schema);return uploadMedia(request)}),{code:"INVALID_INPUT"});
  }
});

test("Google callback accepts only an explicitly mapped active membership and never bootstraps authority", async t => {
  const db = seededDatabase();
  const session = JSON.parse(Buffer.from(cookie().split("base64-")[1], "base64url").toString());
  session.user = { id:userId, aud:"authenticated", role:"authenticated", email:"identity@example.test", app_metadata:{provider:"google"}, user_metadata:{} };
  t.mock.method(globalThis,"fetch",async(url:string)=>{
    if(String(url).includes("/token")) return Response.json(session);
    if(String(url).includes("/logout")) return new Response(null,{status:204});
    return verified();
  });
  const run = async () => {
    const start = await withBackend(req("/api/auth/google/start",""),env,beginGoogleLogin);
    const verifier = start.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    const request = req("/api/auth/google/callback?code=synthetic-code", verifier);
    return withBackend(request,env,async()=>{
      backendContext().database=connectPostgres(process.env.MEAWKETTING_TEST_DATABASE_URL!,db.schema);
      return finishGoogleLogin(request);
    });
  };
  assert.equal((await run()).headers.get("location"), "https://shop.test/business/register");
  db.inspect.prepare("INSERT INTO auth_person_links(auth_user_id,person_id) VALUES(?::uuid,?)").run(userId,OWNER);
  assert.equal((await run()).headers.get("location"),"https://shop.test/business/home");
  db.inspect.prepare("UPDATE business_memberships SET status='inactive' WHERE person_id=?").run(OWNER);
  assert.match((await run()).headers.get("location")!, /login\?error=try-again$/);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM persons").get()?.n,6);
});

test("authorized media upload persists only metadata and compensates Storage when database commit fails", async t => {
  const db=seededDatabase();
  db.inspect.prepare("INSERT INTO auth_person_links(auth_user_id,person_id) VALUES(?::uuid,?)").run(userId,OWNER);
  let uploads=0, deletes=0;
  t.mock.method(globalThis,"fetch",async(url:string,init?:RequestInit)=>{
    if(String(url).includes("/auth/v1/user")) return verified();
    if(init?.method==="DELETE"){deletes++;return Response.json([]);}
    assert.match(String(url),/\/storage\/v1\/object\/business-media\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
    assert.equal(new Headers(init?.headers).get("x-upsert"),"false");
    uploads++;return Response.json({Key:"synthetic"});
  });
  const run=()=>{
    const request=new Request(`https://shop.test/api/media?kind=business-logo&businessId=${WHISKER}`,{method:"POST",headers:{cookie:cookie(),origin:"https://shop.test","content-type":"image/png"},body:new Uint8Array([137,80,78,71,13,10,26,10])});
    return withBackend(request,env,async()=>{backendContext().database=connectPostgres(process.env.MEAWKETTING_TEST_DATABASE_URL!,db.schema);return uploadMedia(request);});
  };
  assert.equal((await run()).status,201);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM media_objects WHERE byte_size=8 AND content_type='image/png'").get()?.n,1);
  db.inspect.exec("ALTER TABLE media_objects ADD CONSTRAINT injected_failure CHECK(false) NOT VALID");
  await assert.rejects(run());
  assert.equal(uploads,2);assert.equal(deletes,1);
  assert.equal(db.inspect.prepare("SELECT count(*) n FROM media_objects").get()?.n,1);
});
