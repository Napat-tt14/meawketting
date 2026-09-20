import { AsyncLocalStorage } from "node:async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";
import { connectPostgres, type PostgresDatabase } from "./postgres";
import { be1Error } from "./be1/errors";

export type BackendEnvironment = {
  DATABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  MEAWKETTING_PUBLIC_ORIGIN?: string;
  MEAWKETTING_AUTH_MODE?: string;
};
type Context = { env: BackendEnvironment; request: Request; cookies: string[]; database?: PostgresDatabase; auth?: SupabaseClient };
const context = new AsyncLocalStorage<Context>();
export function backendContext() {
  const current = context.getStore();
  if (!current) throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
  return current;
}
export function database() {
  const current = backendContext();
  if (current.env.MEAWKETTING_AUTH_MODE === "dev-test" && process.env.NODE_ENV === "production") throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
  if (current.database) return current.database;
  if (!current.env.DATABASE_URL) throw be1Error("PERSISTENCE_ERROR");
  return current.database ??= connectPostgres(current.env.DATABASE_URL);
}
export async function withBackend(request: Request, env: BackendEnvironment, next: () => Promise<Response>) {
  const current: Context = { env, request, cookies: [] };
  return context.run(current, async () => {
    try {
      const response = await next();
      const headers = new Headers(response.headers);
      for (const cookie of current.cookies) headers.append("set-cookie", cookie);
      if (current.cookies.length) headers.set("cache-control", "private, no-store");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } finally { await current.database?.close(); }
  });
}
