import { backendContext, database, verifiedRequestRead } from "./runtime";
import { asBe1Error, be1Error } from "./be1/errors";
import type { IdentityAdapter, AuthenticatedIdentity } from "./be1/identity";

type Provider = "google" | "line";
type Account = { id: string; person_id: string | null; provider: Provider; email: string | null; session_id: string };
type LoginState = { provider: Provider; code_verifier: string; nonce: string };
type Claims = Record<string, unknown>;
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();

function localHttp(request: Request) {
  const url = new URL(request.url);
  return process.env.NODE_ENV === "development" && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}
function cookieName(kind: "session" | "oauth") {
  return `${localHttp(backendContext().request) ? "meawketting-local" : "__Host-meawketting"}-${kind}`;
}
function readCookie(kind: "session" | "oauth") {
  const pairs = (backendContext().request.headers.get("cookie") ?? "").split(";").filter(part => part.includes("=")).map(part => {
    const entry = part.trim(), separator = entry.indexOf("="); return [entry.slice(0, separator), entry.slice(separator + 1)];
  });
  const names = pairs.map(pair => pair[0]);
  if (new Set(names).size !== names.length) throw be1Error("UNAUTHENTICATED");
  return pairs.find(pair => pair[0] === cookieName(kind))?.[1];
}
function writeCookie(kind: "session" | "oauth", value: string, seconds: number) {
  backendContext().cookies.push(`${cookieName(kind)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${localHttp(backendContext().request) ? "" : "; Secure"}`);
}
function base64url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function randomToken() { return base64url(crypto.getRandomValues(new Uint8Array(32))); }
export async function tokenHash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))), b => b.toString(16).padStart(2, "0")).join(""); }
function origin() {
  const { env, request } = backendContext();
  if (!env.MEAWKETTING_PUBLIC_ORIGIN) throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "public-origin");
  let url: URL;
  try { url = new URL(env.MEAWKETTING_PUBLIC_ORIGIN); } catch { throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "public-origin-invalid"); }
  if (url.protocol !== "https:" && !localHttp(request)) throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "public-origin-invalid");
  if (url.origin !== new URL(request.url).origin) throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "origin-mismatch");
  return url.origin;
}
function providerConfig(provider: Provider) {
  const env = backendContext().env;
  if (env.MEAWKETTING_AUTH_MODE !== "session") throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "provider-config");
  const clientId = provider === "google" ? env.GOOGLE_CLIENT_ID : env.LINE_LOGIN_CHANNEL_ID;
  const clientSecret = provider === "google" ? env.GOOGLE_CLIENT_SECRET : env.LINE_LOGIN_CHANNEL_SECRET;
  if (!clientId || !clientSecret) throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "provider-config");
  return { clientId, clientSecret };
}

export async function verifiedBusinessUser(): Promise<Account> {
  if (backendContext().env.MEAWKETTING_AUTH_MODE !== "session") throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
  return verifiedRequestRead("auth-session", async () => {
    const token = readCookie("session");
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw be1Error("UNAUTHENTICATED");
    const account = await database().prepare(`SELECT i.id,i.person_id,i.provider,i.email,s.id session_id FROM auth_sessions s
      JOIN auth_identities i ON i.id=s.identity_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?`)
      .bind(await tokenHash(token), new Date().toISOString()).first<Account>();
    if (!account) throw be1Error("UNAUTHENTICATED");
    return account;
  });
}
export class SessionIdentityAdapter implements IdentityAdapter {
  async resolve(): Promise<AuthenticatedIdentity> {
    const account = await verifiedBusinessUser();
    if (!account.person_id) throw be1Error("FORBIDDEN");
    return { personId: account.person_id, provider: "session" };
  }
}
/** A linked but revoked account cannot create another Owner workspace. */
export async function businessAccountDestination(identityId: string) {
  const account = await database().prepare("SELECT person_id FROM auth_identities WHERE id=?").bind(identityId).first<{ person_id: string | null }>();
  if (!account) throw be1Error("UNAUTHENTICATED");
  if (!account.person_id) return "/business/setup" as const;
  const active = await database().prepare(`SELECT p.id FROM persons p WHERE p.id=? AND p.status='active' AND EXISTS(
    SELECT 1 FROM business_memberships m JOIN businesses b ON b.id=m.business_id
    WHERE m.person_id=p.id AND m.status='active' AND b.status='active')`).bind(account.person_id).first();
  if (!active) throw be1Error("FORBIDDEN");
  return "/business/home" as const;
}
export function beginGoogleLogin() { return beginBusinessLogin("google"); }
export async function beginBusinessLogin(provider: Provider) {
  const target = origin(), { clientId } = providerConfig(provider);
  const state = randomToken(), verifier = randomToken(), nonce = randomToken(), db = database();
  await db.batch([
    db.prepare("DELETE FROM auth_oauth_states WHERE expires_at<=?").bind(new Date().toISOString()),
    db.prepare("INSERT INTO auth_oauth_states(token_hash,provider,code_verifier,nonce,expires_at) VALUES(?,?,?,?,?)")
      .bind(await tokenHash(state), provider, verifier, nonce, new Date(Date.now() + 10 * 60 * 1000).toISOString()),
  ]);
  writeCookie("oauth", state, 600);
  const url = new URL(provider === "google" ? "https://accounts.google.com/o/oauth2/v2/auth" : "https://access.line.me/oauth2/v2.1/authorize");
  for (const [key, value] of Object.entries({ client_id: clientId, response_type: "code", redirect_uri: `${target}/api/auth/google/callback`,
    scope: provider === "google" ? "openid email profile" : "openid profile", state, nonce,
    code_challenge: base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier)))), code_challenge_method: "S256" })) url.searchParams.set(key, value);
  return Response.redirect(url, 302);
}
export async function businessLoginRequest(request: Request, provider: Provider) {
  try { return await beginBusinessLogin(provider); }
  catch (error) {
    const failure = asBe1Error(error);
    const reason = typeof failure.cause === "string" && ["provider-config", "public-origin", "public-origin-invalid", "origin-mismatch"].includes(failure.cause) ? failure.cause : undefined;
    console.warn(JSON.stringify({ event: "auth-start-failure", provider, code: failure.code, reason }));
    const location = new URL(new URL(request.url).searchParams.get("intent") === "register" ? "/business/register" : "/business/login", request.url);
    location.searchParams.set("error", reason === "origin-mismatch" ? "origin-mismatch" : failure.code === "AUTHENTICATION_NOT_CONFIGURED" ? "not-configured" : "try-again");
    return Response.redirect(location, 302);
  }
}
async function providerJson(url: string, init?: RequestInit): Promise<Claims> {
  const response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw be1Error("UNAUTHENTICATED");
  const value = await response.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw be1Error("UNAUTHENTICATED");
  return value as Claims;
}
function decodePart(part: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw be1Error("UNAUTHENTICATED");
  return Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
}
type SigningKey = JsonWebKey & { kid: string };
let googleKeys: { expires: number; keys: SigningKey[] } | undefined;
async function verifyGoogleToken(token: string, clientId: string, nonce: string) {
  const parts = token.split(".");
  if (parts.length !== 3 || token.length > 16384) throw be1Error("UNAUTHENTICATED");
  const header = JSON.parse(new TextDecoder().decode(decodePart(parts[0]))) as Claims;
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw be1Error("UNAUTHENTICATED");
  if (!googleKeys || googleKeys.expires <= Date.now() || !googleKeys.keys.some(key => key.kid === header.kid)) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", { redirect: "error", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw be1Error("UNAUTHENTICATED");
    const value = await response.json() as { keys?: SigningKey[] };
    if (!Array.isArray(value.keys)) throw be1Error("UNAUTHENTICATED");
    const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 300);
    googleKeys = { keys: value.keys, expires: Date.now() + Math.min(maxAge, 3600) * 1000 };
  }
  const jwk = googleKeys.keys.find(key => key.kid === header.kid && key.kty === "RSA" && (!key.use || key.use === "sig"));
  if (!jwk) throw be1Error("UNAUTHENTICATED");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodePart(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`))) throw be1Error("UNAUTHENTICATED");
  const claims = JSON.parse(new TextDecoder().decode(decodePart(parts[1]))) as Claims;
  validateClaims(claims, clientId, nonce, "google");
  return claims;
}
function validateClaims(claims: Claims, clientId: string, nonce: string, provider: Provider) {
  if (claims.aud !== clientId || claims.nonce !== nonce || typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 255
    || typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now() || typeof claims.iat !== "number" || claims.iat * 1000 > Date.now() + 60000
    || !(provider === "google" ? ["https://accounts.google.com", "accounts.google.com"] : ["https://access.line.me"]).includes(String(claims.iss))
    || (claims.azp !== undefined && claims.azp !== clientId)) throw be1Error("UNAUTHENTICATED");
}
async function issueSession(provider: Provider, claims: Claims) {
  const db = database(), now = new Date().toISOString(), token = randomToken(), previous = readCookie("session");
  const email = typeof claims.email === "string" && (provider === "line" || claims.email_verified === true || claims.email_verified === "true") ? claims.email : null;
  const statements = [db.prepare(`INSERT INTO auth_identities(id,provider,provider_subject,email,display_name,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?) ON CONFLICT(provider,provider_subject) DO UPDATE SET email=excluded.email,display_name=excluded.display_name,updated_at=excluded.updated_at`)
    .bind(crypto.randomUUID(), provider, claims.sub, email, typeof claims.name === "string" ? claims.name : null, now, now)];
  if (previous && /^[A-Za-z0-9_-]{43}$/.test(previous)) statements.push(db.prepare("UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL").bind(now, await tokenHash(previous)));
  statements.push(db.prepare(`INSERT INTO auth_sessions(id,identity_id,person_id,token_hash,expires_at,created_at,last_seen_at)
    SELECT ?,id,person_id,?,?,?,? FROM auth_identities WHERE provider=? AND provider_subject=?`)
    .bind(crypto.randomUUID(), await tokenHash(token), new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(), now, now, provider, claims.sub));
  await db.batch(statements);
  const account = await db.prepare("SELECT id FROM auth_identities WHERE provider=? AND provider_subject=?").bind(provider, claims.sub).first<{ id: string }>();
  if (!account) throw be1Error("PERSISTENCE_ERROR");
  try {
    const destination = await businessAccountDestination(account.id);
    writeCookie("session", token, SESSION_SECONDS);
    return destination;
  } catch (error) {
    await db.prepare("UPDATE auth_sessions SET revoked_at=? WHERE token_hash=?").bind(now, await tokenHash(token)).run();
    writeCookie("session", "", 0);
    throw error;
  }
}
export async function finishGoogleLogin(request: Request) {
  let stage = "callback";
  try {
    const target = origin(), params = new URL(request.url).searchParams, code = params.get("code"), state = params.get("state");
    const cookie = readCookie("oauth");
    if (!code || code.length > 4096 || !state || !cookie || state !== cookie || !/^[A-Za-z0-9_-]{43}$/.test(state) || params.getAll("state").length !== 1 || params.getAll("code").length !== 1) throw be1Error("UNAUTHENTICATED");
    const saved = await database().prepare("DELETE FROM auth_oauth_states WHERE token_hash=? AND expires_at>? RETURNING provider,code_verifier,nonce")
      .bind(await tokenHash(state), new Date().toISOString()).first<LoginState>();
    writeCookie("oauth", "", 0);
    if (!saved) throw be1Error("UNAUTHENTICATED");
    const { clientId, clientSecret } = providerConfig(saved.provider);
    stage = "token-exchange";
    const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: `${target}/api/auth/google/callback`, client_id: clientId, client_secret: clientSecret, code_verifier: saved.code_verifier });
    const tokens = await providerJson(saved.provider === "google" ? "https://oauth2.googleapis.com/token" : "https://api.line.me/oauth2/v2.1/token", { method: "POST", body });
    if (typeof tokens.id_token !== "string") throw be1Error("UNAUTHENTICATED");
    stage = "token-verification";
    const claims = saved.provider === "google" ? await verifyGoogleToken(tokens.id_token, clientId, saved.nonce)
      : await providerJson("https://api.line.me/oauth2/v2.1/verify", { method: "POST", body: new URLSearchParams({ id_token: tokens.id_token, client_id: clientId, nonce: saved.nonce }) });
    validateClaims(claims, clientId, saved.nonce, saved.provider);
    stage = "account-destination";
    return Response.redirect(`${target}${await issueSession(saved.provider, claims)}`, 302);
  } catch (error) {
    console.warn(JSON.stringify({ event: "auth-callback-failure", stage, code: asBe1Error(error).code }));
    writeCookie("oauth", "", 0);
    return Response.redirect(new URL("/business/login?error=try-again", request.url), 302);
  }
}
export async function logoutSession() {
  if (backendContext().env.MEAWKETTING_AUTH_MODE !== "session") throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
  const token = readCookie("session");
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) await database().prepare("UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL").bind(new Date().toISOString(), await tokenHash(token)).run();
  writeCookie("session", "", 0);
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
