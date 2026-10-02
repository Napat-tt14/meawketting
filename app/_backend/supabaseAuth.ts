import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { backendContext, database } from "./runtime";
import { asBe1Error, be1Error } from "./be1/errors";
import type { IdentityAdapter, AuthenticatedIdentity } from "./be1/identity";
import { readJson } from "./shared/http";
import { requireSameOrigin } from "./shared/requestSecurity";

function localHttp(request: Request) {
  const url = new URL(request.url);
  return process.env.NODE_ENV === "development" && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

export function authClient() {
  const current = backendContext();
  if (current.auth) return current.auth;
  const { env, request, cookies } = current;
  if (env.MEAWKETTING_AUTH_MODE !== "supabase" || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "supabase-config");
  let url: URL;
  try { url = new URL(env.SUPABASE_URL); } catch { throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "supabase-url"); }
  if (url.protocol !== "https:") throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "supabase-url");
  const header = request.headers.get("cookie") ?? "";
  // Cookie parsers collapse duplicate names, so reject ambiguity before parsing.
  const names = header.split(";").filter(part => part.includes("=")).map(part => part.slice(0,part.indexOf("=")).trim());
  if (new Set(names).size !== names.length) throw be1Error("UNAUTHENTICATED");
  const input = new Map(parseCookieHeader(header).map(c => [c.name, c.value ?? ""]));
  const local = localHttp(request);
  const cookieOptions = { name: local ? "meawketting-auth-local" : "__Host-meawketting-auth", path: "/", secure: !local, httpOnly: true, sameSite: "lax" as const };
  return current.auth = createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions,
    cookies: {
      getAll: () => Array.from(input, ([name, value]) => ({ name, value })),
      setAll: values => { for (const c of values) {
        // Later SDK calls in this request must see cookies already queued for the response.
        if (c.options.maxAge === 0) input.delete(c.name); else input.set(c.name, c.value);
        cookies.push(serializeCookieHeader(c.name, c.value, { ...c.options, path: "/", secure: !local, httpOnly: true, sameSite: "lax" }));
      } },
    },
  });
}

export class SupabaseIdentityAdapter implements IdentityAdapter {
  async resolve(): Promise<AuthenticatedIdentity> {
    const { data, error } = await authClient().auth.getUser();
    if (error || !data.user) throw be1Error("UNAUTHENTICATED");
    // Mapping is explicitly provisioned. Email and user_metadata never confer authority.
    const person = await database().prepare("SELECT person_id FROM auth_person_links WHERE auth_user_id=?::uuid")
      .bind(data.user.id).first<{ person_id: string }>();
    if (!person) throw be1Error("FORBIDDEN");
    return { personId: person.person_id, provider: "supabase" };
  }
}

export async function verifiedBusinessUser() {
  const { data, error } = await authClient().auth.getUser();
  if (error || !data.user || data.user.is_anonymous) throw be1Error("UNAUTHENTICATED");
  const provider = data.user.app_metadata.provider;
  if (!["google", "custom:line", "email"].includes(provider ?? "")) throw be1Error("FORBIDDEN");
  if (provider === "email" && !data.user.email_confirmed_at) throw be1Error("FORBIDDEN");
  return data.user;
}

/** A verified account without a Person link still needs setup; revoked access cannot create a new Owner. */
export async function businessAccountDestination(userId: string) {
  const linked = await database().prepare("SELECT person_id FROM auth_person_links WHERE auth_user_id=?::uuid").bind(userId).first();
  if (!linked) return "/business/setup" as const;
  const active = await database().prepare(`SELECT p.id FROM auth_person_links l JOIN persons p ON p.id=l.person_id
    WHERE l.auth_user_id=?::uuid AND p.status='active' AND EXISTS(SELECT 1 FROM business_memberships m
    JOIN businesses b ON b.id=m.business_id WHERE m.person_id=p.id AND m.status='active' AND b.status='active')`)
    .bind(userId).first();
  if (!active) throw be1Error("FORBIDDEN");
  return "/business/home" as const;
}

export async function emailPasswordRequest(request: Request, mode: "register" | "login") {
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  try {
    requireSameOrigin(request);
    // Login CSRF matters before there is a session cookie as well.
    if (request.headers.get("origin") !== new URL(request.url).origin) throw be1Error("FORBIDDEN");
    const value = await readJson(request, 4096);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw be1Error("INVALID_INPUT");
    const input = value as Record<string, unknown>;
    if (Object.keys(input).some(key => !["email", "password"].includes(key))
      || typeof input.email !== "string" || typeof input.password !== "string") throw be1Error("INVALID_INPUT");
    const email = input.email.trim(), password = input.password;
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || password.length < (mode === "register" ? 8 : 1) || password.length > 128) throw be1Error("INVALID_INPUT");
    const client = authClient();
    const { data, error } = mode === "register"
      ? await client.auth.signUp({ email, password, options: { emailRedirectTo: `${origin()}/api/auth/google/callback` } })
      : await client.auth.signInWithPassword({ email, password });
    if (error) {
      const limited = error.status === 429;
      return Response.json({ error: limited ? "RATE_LIMITED" : error.code === "email_not_confirmed" ? "EMAIL_NOT_CONFIRMED"
        : mode === "login" ? "INVALID_CREDENTIALS" : "SIGNUP_FAILED" }, { status: limited ? 429 : mode === "login" ? 401 : 400, headers });
    }
    // Supabase may deliberately obscure an existing address. Never infer a login from a returned user alone.
    if (mode === "register" && !data.session) return Response.json({ confirmationRequired: true }, { headers });
    if (!data.session) throw be1Error("UNAUTHENTICATED");
    const user = await verifiedBusinessUser();
    const redirectTo = await businessAccountDestination(user.id);
    return Response.json({ redirectTo }, { headers });
  } catch (error) {
    const failure = asBe1Error(error);
    return Response.json({ error: failure.code }, { status: failure.status, headers });
  }
}

function origin() {
  const { env, request } = backendContext();
  if (!env.MEAWKETTING_PUBLIC_ORIGIN) throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "public-origin");
  let url: URL;
  try { url = new URL(env.MEAWKETTING_PUBLIC_ORIGIN); } catch { throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "public-origin-invalid"); }
  if (url.protocol !== "https:" && !localHttp(request)) throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "public-origin-invalid");
  if (url.origin !== new URL(request.url).origin) throw be1Error("AUTHENTICATION_NOT_CONFIGURED", "origin-mismatch");
  return url.origin;
}
export async function beginGoogleLogin() {
  return beginBusinessLogin("google");
}
export async function beginBusinessLogin(provider: "google" | "custom:line") {
  const target = origin();
  const { data, error } = await authClient().auth.signInWithOAuth({ provider, options: {
    redirectTo: `${target}/api/auth/google/callback`, skipBrowserRedirect: true,
  } });
  if (error || !data.url) throw be1Error("UNAUTHENTICATED");
  return Response.redirect(data.url, 302);
}

/** Both providers expose safe diagnostics instead of disguising every failure as missing configuration. */
export async function businessLoginRequest(request: Request, provider: "google" | "custom:line") {
  try { return await beginBusinessLogin(provider); }
  catch (error) {
    const failure = asBe1Error(error);
    const reason = typeof failure.cause === "string" && ["supabase-config", "supabase-url", "public-origin", "public-origin-invalid", "origin-mismatch"].includes(failure.cause) ? failure.cause : undefined;
    console.warn(JSON.stringify({ event: "auth-start-failure", provider, code: failure.code, reason }));
    const location = new URL(new URL(request.url).searchParams.get("intent") === "register" ? "/business/register" : "/business/login", request.url);
    location.searchParams.set("error", reason === "origin-mismatch" ? "origin-mismatch" : failure.code === "AUTHENTICATION_NOT_CONFIGURED" ? "not-configured" : "try-again");
    return Response.redirect(location, 302);
  }
}
export async function finishGoogleLogin(request: Request) {
  let stage = "callback";
  try {
    const target = origin();
    const code = new URL(request.url).searchParams.get("code");
    if (!code) throw be1Error("UNAUTHENTICATED");
    const client = authClient();
    stage = "token-exchange";
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.user) throw be1Error("UNAUTHENTICATED");
    stage = "account-destination";
    const user = await verifiedBusinessUser();
    return Response.redirect(`${target}${await businessAccountDestination(user.id)}`, 302);
  } catch (error) {
    const code = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "unknown";
    if (code === "FORBIDDEN") await authClient().auth.signOut({ scope: "local" }).catch(() => {});
    console.warn(JSON.stringify({ event: "auth-callback-failure", stage, code }));
    return Response.redirect(new URL("/business/login?error=try-again", request.url), 302);
  }
}
export async function logoutSupabase() {
  const { error } = await authClient().auth.signOut({ scope: "local" });
  if (error) throw be1Error("UNAUTHENTICATED");
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
