import { AsyncLocalStorage } from "node:async_hooks";
import { D1DatabaseAdapter } from "./d1";
import { be1Error } from "./be1/errors";

export type BackendEnvironment = {
  DB?: D1Database;
  MEDIA?: R2Bucket;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  LINE_LOGIN_CHANNEL_ID?: string;
  LINE_LOGIN_CHANNEL_SECRET?: string;
  MEAWKETTING_PUBLIC_ORIGIN?: string;
  MEAWKETTING_AUTH_MODE?: string;
};
type Context = { env: BackendEnvironment; request: Request; cookies: string[]; database?: D1DatabaseAdapter; verifiedReads: Map<string, Promise<unknown>> };
const context = new AsyncLocalStorage<Context>();
/** Verified reads live for this HTTP request only; commit guards still read the database. */
export function verifiedRequestRead<T>(key: string, read: () => Promise<T>): Promise<T> {
  const current = context.getStore();
  if (!current) return read();
  const previous = current.verifiedReads.get(key);
  if (previous) return previous as Promise<T>;
  const value = read(); current.verifiedReads.set(key, value); return value;
}
export function backendContext() {
  const current = context.getStore();
  if (!current) throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
  return current;
}
export function database() {
  const current = backendContext();
  if (current.env.MEAWKETTING_AUTH_MODE === "dev-test" && process.env.NODE_ENV === "production") throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
  if (current.database) return current.database;
  if (!current.env.DB) throw be1Error("PERSISTENCE_ERROR");
  return current.database ??= new D1DatabaseAdapter(current.env.DB, current.request.signal);
}
export async function withBackend(request: Request, env: BackendEnvironment, next: () => Promise<Response>) {
  const current: Context = { env, request, cookies: [], verifiedReads: new Map() };
  return context.run(current, async () => {
    const started = performance.now();
    const response = await next();
    const headers = new Headers(response.headers);
    if (new URL(request.url).pathname.startsWith("/api/")) {
      const metrics = current.database?.metrics;
      headers.append("server-timing", `app;dur=${(performance.now() - started).toFixed(1)}, d1-reported;dur=${(metrics?.duration ?? 0).toFixed(1)}, d1-rpc;dur=${(metrics?.rpcDuration ?? 0).toFixed(1)}, d1-statements;desc="${metrics?.statements ?? 0}", d1-batches;desc="${metrics?.batches ?? 0}", d1-meta-statements;desc="${metrics?.reportedStatements ?? 0}", d1-rows-read;desc="${metrics?.rowsRead ?? 0}", d1-rows-written;desc="${metrics?.rowsWritten ?? 0}"`);
    }
    for (const cookie of current.cookies) headers.append("set-cookie", cookie);
    if (current.cookies.length) headers.set("cache-control", "private, no-store");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  });
}
