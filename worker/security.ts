import { createRequestMetadata } from "../app/_backend/be1/metadata";

export interface RateLimiter { limit(input: { key: string }): Promise<{ success: boolean }> }
export type SecurityEnvironment = { MEAWKETTING_ENV?: string; MEAWKETTING_AUTH_MODE?: string; MEAWKETTING_FIXTURE_MODE?: string; API_RATE_LIMITER?: RateLimiter };
type SafeEvent = { event: "api-failure" | "worker-failure"; route: string; status: number; requestId: string; correlationId: string; durationMs: number };
function routeGroup(path: string) { return /^\/api\/be[1-8]$/.test(path) ? path : path.startsWith("/api/channels/line/") ? "/api/channels/line/:channelId" : "/api/other"; }

/** No query, raw path IDs, headers, IP, body or exception text in application logs. */
export async function secureFetch(request: Request, env: SecurityEnvironment, next: () => Promise<Response>, log: (event: SafeEvent) => void = event => console.warn(JSON.stringify(event))) {
  const started = Date.now(), url = new URL(request.url), api = url.pathname.startsWith("/api/");
  const metadata = createRequestMetadata(request.headers);
  let response: Response;
  try {
    const remote = env.MEAWKETTING_ENV === "staging" || env.MEAWKETTING_ENV === "production";
    if (api && remote && (env.MEAWKETTING_AUTH_MODE === "dev-test" || env.MEAWKETTING_FIXTURE_MODE === "test" || !env.API_RATE_LIMITER)) {
      response = Response.json({ ok: false, error: { code: "ENVIRONMENT_NOT_CONFIGURED" } }, { status: 503 });
    } else if (api && env.API_RATE_LIMITER && !(await env.API_RATE_LIMITER.limit({ key: `${routeGroup(url.pathname)}:${request.headers.get("cf-connecting-ip") ?? "unknown"}` })).success) {
      response = Response.json({ ok: false, error: { code: "RATE_LIMITED" } }, { status: 429, headers: { "retry-after": "60" } });
    } else {
      response = await next();
    }
  } catch {
    response = Response.json({ ok: false, error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
  // Preserve streaming bodies, status and existing API correlation metadata.
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  if (api) {
    headers.set("cache-control", "no-store");
    if (!headers.has("x-request-id")) headers.set("x-request-id", metadata.requestId);
    if (!headers.has("x-correlation-id")) headers.set("x-correlation-id", metadata.correlationId);
  }
  // Scope frame policy to Business; future Guardian embedding is a separate flow.
  if (url.pathname === "/" || url.pathname.startsWith("/business")) {
    headers.set("x-frame-options", "SAMEORIGIN");
    headers.set("content-security-policy", "frame-ancestors 'self'; object-src 'none'; base-uri 'self'");
    headers.set("permissions-policy", "camera=(self), microphone=(), geolocation=()");
  }
  if ((api && response.status >= 400) || response.status >= 500) log({ event: api ? "api-failure" : "worker-failure", route: api ? routeGroup(url.pathname) : "/page", status: response.status,
    requestId: headers.get("x-request-id") ?? metadata.requestId, correlationId: headers.get("x-correlation-id") ?? metadata.correlationId, durationMs: Date.now() - started });
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
