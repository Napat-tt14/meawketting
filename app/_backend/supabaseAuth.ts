import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { backendContext, database } from "./runtime";
import { be1Error } from "./be1/errors";
import type { IdentityAdapter, AuthenticatedIdentity } from "./be1/identity";

export function authClient() {
  const current = backendContext();
  if (current.auth) return current.auth;
  const { env, request, cookies } = current;
  if (env.MEAWKETTING_AUTH_MODE !== "supabase" || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
  const url = new URL(env.SUPABASE_URL);
  if (url.protocol !== "https:") throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
  const header = request.headers.get("cookie") ?? "";
  // Cookie parsers collapse duplicate names, so reject ambiguity before parsing.
  const names = header.split(";").filter(part => part.includes("=")).map(part => part.slice(0,part.indexOf("=")).trim());
  if (new Set(names).size !== names.length) throw be1Error("UNAUTHENTICATED");
  const input = parseCookieHeader(header);
  return current.auth = createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { name: "__Host-meawketting-auth", path: "/", secure: true, httpOnly: true, sameSite: "lax" },
    cookies: {
      getAll: () => input.map(c => ({ name: c.name, value: c.value ?? "" })),
      setAll: values => { for (const c of values) cookies.push(serializeCookieHeader(c.name, c.value, { ...c.options, path: "/", secure: true, httpOnly: true, sameSite: "lax" })); },
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

function origin() {
  const { env, request } = backendContext();
  if (!env.MEAWKETTING_PUBLIC_ORIGIN) throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
  const url = new URL(env.MEAWKETTING_PUBLIC_ORIGIN);
  if (url.protocol !== "https:" || url.origin !== new URL(request.url).origin) throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
  return url.origin;
}
export async function beginGoogleLogin() {
  return beginBusinessLogin("google");
}
export async function beginBusinessLogin(provider: "google" | "custom:line") {
  const { data, error } = await authClient().auth.signInWithOAuth({ provider, options: {
    redirectTo: `${origin()}/api/auth/google/callback`, skipBrowserRedirect: true,
  } });
  if (error || !data.url) throw be1Error("UNAUTHENTICATED");
  return Response.redirect(data.url, 302);
}
export async function finishGoogleLogin(request: Request) {
  try {
    const target = origin();
    const code = new URL(request.url).searchParams.get("code");
    if (!code) throw be1Error("UNAUTHENTICATED");
    const client = authClient();
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.user) throw be1Error("UNAUTHENTICATED");
    const linked = await database().prepare("SELECT person_id FROM auth_person_links WHERE auth_user_id=?::uuid")
      .bind(data.user.id).first();
    // Verified identity can complete registration, but has no Business authority yet.
    if (!linked) return Response.redirect(`${target}/business/register`, 302);
    const person = await database().prepare(`SELECT p.id FROM auth_person_links l JOIN persons p ON p.id=l.person_id
      WHERE l.auth_user_id=?::uuid AND p.status='active' AND EXISTS(SELECT 1 FROM business_memberships m
      JOIN businesses b ON b.id=m.business_id WHERE m.person_id=p.id AND m.status='active' AND b.status='active')`)
      .bind(data.user.id).first();
    if (!person) { await client.auth.signOut(); throw be1Error("FORBIDDEN"); }
    return Response.redirect(`${target}/business/home`, 302);
  } catch { return Response.redirect(new URL("/business/login?error=try-again", request.url), 302); }
}
export async function logoutSupabase() {
  const { error } = await authClient().auth.signOut({ scope: "local" });
  if (error) throw be1Error("UNAUTHENTICATED");
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
