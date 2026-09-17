import type { D1DatabaseLike } from "./be1/repository";
import { clearSessionCookie, newSessionToken, sessionCookie, sessionTokenHash, SESSION_COOKIE } from "./be1/session";
import { D1SessionRepository } from "./be1/sessionRepository";

export const GOOGLE_PROVIDER = "google";
export const GOOGLE_ISSUER = "https://accounts.google.com";
export const GOOGLE_OAUTH_STATE_COOKIE = "__Host-meawketting-google-oauth";
export const GOOGLE_OAUTH_STATE_MAX_AGE = 600;
export const GOOGLE_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type GoogleAuthEnvironment = {
  DB: D1DatabaseLike;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MEAWKETTING_PUBLIC_ORIGIN?: string;
  MEAWKETTING_GOOGLE_OWNER_EMAIL?: string;
  MEAWKETTING_GOOGLE_OWNER_PERSON_ID?: string;
};

type GoogleFailureCode = "not-configured" | "invalid-request" | "provider-error" | "not-authorized" | "persistence-error";

export class GoogleAuthError extends Error {
  constructor(readonly code: GoogleFailureCode, cause?: unknown) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = "GoogleAuthError";
  }
}

type OAuthState = {
  state: string;
  codeVerifier: string;
  nonce: string;
  returnTo: string;
};

type GoogleClaims = {
  iss?: unknown;
  sub?: unknown;
  aud?: unknown;
  azp?: unknown;
  exp?: unknown;
  iat?: unknown;
  nonce?: unknown;
  email?: unknown;
  email_verified?: unknown;
};

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

let jwksCache: { expiresAt: number; keys: Jwk[] } | null = null;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new GoogleAuthError("invalid-request");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeJson(value: unknown) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson<T>(value: string): T {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;
  } catch (error) {
    throw new GoogleAuthError("invalid-request", error);
  }
}

function randomToken() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

function cookieValue(request: Request, name: string) {
  const matches = (request.headers.get("cookie") ?? "").split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`));
  if (matches.length !== 1) return null;
  return matches[0].slice(name.length + 1) || null;
}

function cookieHeader(name: string, value: string, maxAge: number) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookieHeader(name: string) {
  return cookieHeader(name, "", 0);
}

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/business/") || value.startsWith("//") || value.includes("\\")) return "/business/home";
  return value;
}

function configuredOrigin(request: Request, environment: GoogleAuthEnvironment) {
  const raw = environment.MEAWKETTING_PUBLIC_ORIGIN?.trim() || new URL(request.url).origin;
  try {
    const origin = new URL(raw);
    if ((origin.protocol !== "https:" && origin.protocol !== "http:") || origin.pathname !== "/" || origin.search || origin.hash) {
      throw new Error("invalid origin");
    }
    return origin.origin;
  } catch (error) {
    throw new GoogleAuthError("not-configured", error);
  }
}

function requireOAuthConfig(environment: GoogleAuthEnvironment) {
  const clientId = environment.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = environment.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new GoogleAuthError("not-configured");
  return { clientId, clientSecret };
}

function redirectUri(request: Request, environment: GoogleAuthEnvironment) {
  return `${configuredOrigin(request, environment)}/api/auth/google/callback`;
}

function errorRedirect(request: Request, code: GoogleFailureCode) {
  const location = new URL("/business/login", request.url);
  location.searchParams.set("error", code === "not-authorized" ? "not-authorized" : code === "not-configured" ? "not-configured" : "try-again");
  return location;
}

function redirectResponse(location: URL, cookies: string[] = []) {
  const headers = new Headers({
    location: location.toString(),
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
  });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function parseOAuthState(request: Request): OAuthState {
  const raw = cookieValue(request, GOOGLE_OAUTH_STATE_COOKIE);
  if (!raw) throw new GoogleAuthError("invalid-request");
  const state = decodeJson<Partial<OAuthState>>(raw);
  if (typeof state.state !== "string" || typeof state.codeVerifier !== "string" || typeof state.nonce !== "string" || typeof state.returnTo !== "string") {
    throw new GoogleAuthError("invalid-request");
  }
  return state as OAuthState;
}

export async function beginGoogleLogin(request: Request, environment: GoogleAuthEnvironment) {
  const { clientId } = requireOAuthConfig(environment);
  const state: OAuthState = {
    state: randomToken(),
    codeVerifier: randomToken(),
    nonce: randomToken(),
    returnTo: safeReturnTo(new URL(request.url).searchParams.get("returnTo")),
  };
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("redirect_uri", redirectUri(request, environment));
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "openid email profile");
  authorization.searchParams.set("state", state.state);
  authorization.searchParams.set("nonce", state.nonce);
  authorization.searchParams.set("code_challenge", await pkceChallenge(state.codeVerifier));
  authorization.searchParams.set("code_challenge_method", "S256");
  authorization.searchParams.set("prompt", "select_account");
  return redirectResponse(authorization, [cookieHeader(GOOGLE_OAUTH_STATE_COOKIE, encodeJson(state), GOOGLE_OAUTH_STATE_MAX_AGE)]);
}

async function exchangeCode(request: Request, environment: GoogleAuthEnvironment, code: string, codeVerifier: string) {
  const { clientId, clientSecret } = requireOAuthConfig(environment);
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri(request, environment),
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    redirect: "error",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new GoogleAuthError("provider-error");
  const payload = await response.json() as { id_token?: unknown };
  if (typeof payload.id_token !== "string" || !payload.id_token) throw new GoogleAuthError("provider-error");
  return payload.id_token;
}

async function fetchGoogleKeys(forceRefresh = false) {
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", { redirect: "error" });
  if (!response.ok) throw new GoogleAuthError("provider-error");
  const payload = await response.json() as { keys?: unknown };
  const keys = Array.isArray(payload.keys) ? payload.keys.filter((key): key is Jwk => {
    if (!key || typeof key !== "object") return false;
    const candidate = key as Record<string, unknown>;
    return typeof candidate.kid === "string" && candidate.alg === "RS256" && typeof candidate.n === "string" && typeof candidate.e === "string";
  }) : [];
  if (!keys.length) throw new GoogleAuthError("provider-error");
  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/i)?.[1] ?? 3600);
  jwksCache = { keys, expiresAt: Date.now() + Math.min(Math.max(maxAge, 600), 3600) * 1000 };
  return keys;
}

async function verifyGoogleIdToken(idToken: string, environment: GoogleAuthEnvironment, nonce: string): Promise<{ subject: string; email: string }> {
  const { clientId } = requireOAuthConfig(environment);
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new GoogleAuthError("provider-error");
  const header = decodeJson<{ alg?: unknown; kid?: unknown }>(parts[0]);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new GoogleAuthError("provider-error");
  const payload = decodeJson<GoogleClaims>(parts[1]);
  const keys = await fetchGoogleKeys();
  let key = keys.find((candidate) => candidate.kid === header.kid);
  if (!key) key = (await fetchGoogleKeys(true)).find((candidate) => candidate.kid === header.kid);
  if (!key) throw new GoogleAuthError("provider-error");
  const cryptoKey = await crypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    cryptoKey,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw new GoogleAuthError("provider-error");

  const now = Math.floor(Date.now() / 1000);
  const audience = payload.aud;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (payload.iss !== GOOGLE_ISSUER && payload.iss !== "accounts.google.com") throw new GoogleAuthError("provider-error");
  if (audience !== clientId || (payload.azp !== undefined && payload.azp !== clientId)) throw new GoogleAuthError("provider-error");
  if (typeof payload.sub !== "string" || !payload.sub || typeof payload.exp !== "number" || payload.exp <= now || typeof payload.iat !== "number" || payload.iat > now + 60) throw new GoogleAuthError("provider-error");
  if (payload.nonce !== nonce || payload.email_verified !== true || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new GoogleAuthError("not-authorized");
  return { subject: payload.sub, email };
}

async function linkGooglePerson(environment: GoogleAuthEnvironment, subject: string, email: string) {
  const existing = await environment.DB.prepare(`
    SELECT person_id, status
    FROM person_external_identities
    WHERE provider = ? AND issuer = ? AND subject = ?
  `).bind(GOOGLE_PROVIDER, GOOGLE_ISSUER, subject).first<{ person_id: string; status: string }>();
  if (existing) {
    if (existing.status !== "active") throw new GoogleAuthError("not-authorized");
    const person = await environment.DB.prepare("SELECT id, status FROM persons WHERE id = ?").bind(existing.person_id).first<{ id: string; status: string }>();
    if (!person || person.status !== "active") throw new GoogleAuthError("not-authorized");
    return existing.person_id;
  }

  const configuredEmail = environment.MEAWKETTING_GOOGLE_OWNER_EMAIL?.trim().toLowerCase();
  const ownerPersonId = environment.MEAWKETTING_GOOGLE_OWNER_PERSON_ID?.trim();
  if (!configuredEmail || !ownerPersonId || email !== configuredEmail) throw new GoogleAuthError("not-authorized");
  const owner = await environment.DB.prepare("SELECT id, status FROM persons WHERE id = ?").bind(ownerPersonId).first<{ id: string; status: string }>();
  if (!owner || owner.status !== "active") throw new GoogleAuthError("not-authorized");

  const identityId = `pei_google_${crypto.randomUUID().replaceAll("-", "")}`;
  try {
    await environment.DB.prepare(`
      INSERT INTO person_external_identities (id, person_id, provider, issuer, subject, verified_at, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).bind(identityId, ownerPersonId, GOOGLE_PROVIDER, GOOGLE_ISSUER, subject, new Date().toISOString()).run();
  } catch (error) {
    const raced = await environment.DB.prepare(`
      SELECT person_id, status
      FROM person_external_identities
      WHERE provider = ? AND issuer = ? AND subject = ?
    `).bind(GOOGLE_PROVIDER, GOOGLE_ISSUER, subject).first<{ person_id: string; status: string }>();
    if (!raced || raced.status !== "active" || raced.person_id !== ownerPersonId) throw new GoogleAuthError("persistence-error", error);
  }
  return ownerPersonId;
}

export async function finishGoogleLogin(request: Request, environment: GoogleAuthEnvironment) {
  let state: OAuthState;
  try {
    state = parseOAuthState(request);
    const query = new URL(request.url).searchParams;
    if (query.get("error") || !query.get("code") || query.get("state") !== state.state) throw new GoogleAuthError("invalid-request");
    const idToken = await exchangeCode(request, environment, query.get("code")!, state.codeVerifier);
    const claims = await verifyGoogleIdToken(idToken, environment, state.nonce);
    const personId = await linkGooglePerson(environment, claims.subject, claims.email);
    const token = newSessionToken();
    const issuedAt = Math.floor(Date.now() / 1000);
    await new D1SessionRepository(environment.DB).create({ tokenHash: await sessionTokenHash(token), personId, issuedAt, expiresAt: issuedAt + GOOGLE_SESSION_MAX_AGE });
    return redirectResponse(new URL(state.returnTo, request.url), [
      sessionCookie(token, GOOGLE_SESSION_MAX_AGE),
      clearCookieHeader(GOOGLE_OAUTH_STATE_COOKIE),
    ]);
  } catch (error) {
    const code = error instanceof GoogleAuthError ? error.code : "provider-error";
    return redirectResponse(errorRedirect(request, code), [clearCookieHeader(GOOGLE_OAUTH_STATE_COOKIE)]);
  }
}

export async function logoutGoogleSession(request: Request, environment: GoogleAuthEnvironment) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) {
    try {
      await new D1SessionRepository(environment.DB).revokeByTokenHash(await sessionTokenHash(token));
    } catch {
      // Logout remains idempotent even when the cookie is stale or malformed.
    }
  }
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store", "set-cookie": clearSessionCookie },
  });
}
