import { BusinessRequestError, invalidatesProjection, type ProjectionTarget } from "./client";

/** One visible-page read at a time; mutations never run through this scheduler. */
export type RefreshReason = "initial" | "interval" | "foreground" | "invalidation" | "manual";
export function startBusinessRefresh(load: (signal: AbortSignal, reason: RefreshReason) => Promise<unknown>, options: {
  businessId: string; intervalMs?: number; initial?: boolean; onError?: (error: unknown) => void; onHidden?: () => void;
  targets?: readonly ProjectionTarget[];
}) {
  let timer: ReturnType<typeof setTimeout> | undefined, controller: AbortController | undefined;
  let stopped = false, blocked = false, running = false, dirty = false, failures = 0, nextAllowed = 0;
  let nextReason: RefreshReason = "interval";
  const clear = () => { clearTimeout(timer); timer = undefined; };
  const schedule = (delay: number) => { clear(); if (!stopped && !blocked && !document.hidden) timer = setTimeout(() => void refresh(nextReason), Math.min(2_147_483_647, Math.max(0, delay))); };
  async function refresh(reason: RefreshReason = "manual") {
    if (stopped || blocked || running || document.hidden) return;
    if (Date.now() < nextAllowed) { schedule(nextAllowed - Date.now()); return; }
    clear(); running = true; controller = new AbortController();
    const current = controller;
    let retry = 0;
    try { await load(current.signal, reason); failures = 0; }
    catch (error) {
      if (current.signal.aborted || (error instanceof Error && error.name === "AbortError")) return;
      const code = error instanceof Error && "code" in error ? String(error.code) : "";
      blocked = ["UNAUTHENTICATED", "FORBIDDEN"].includes(code) || (error instanceof BusinessRequestError && [401, 403].includes(error.status ?? 0));
      if (!blocked) {
        retry = error instanceof BusinessRequestError && (error.status === 429 || code === "RATE_LIMITED") ? error.retryAfterMs ?? 60_000 : Math.min(300_000, 5000 * 2 ** Math.min(failures++, 6));
        nextAllowed = Date.now() + retry;
      }
      options.onError?.(error);
    } finally {
      running = false;
      if (!stopped && !blocked && !document.hidden) {
        if (dirty) { dirty = false; schedule(Math.max(0, nextAllowed - Date.now())); }
        else if (retry || options.intervalMs) { nextReason = retry ? reason : "interval"; schedule(retry || options.intervalMs!); }
      }
    }
  }
  const visibility = () => {
    if (document.hidden) { clear(); controller?.abort(); options.onHidden?.(); }
    else if (running && controller?.signal.aborted) { dirty = true; nextReason = "foreground"; }
    else void refresh("foreground");
  };
  const invalidated = (event: Event) => { if ((event as CustomEvent<string>).detail === options.businessId && invalidatesProjection(event, options.targets)) queueMicrotask(() => { nextReason = "invalidation"; if (running) dirty = true; else void refresh("invalidation"); }); };
  const verified = () => { blocked = false; void refresh(); };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("meawketting:business-data-invalidated", invalidated);
  window.addEventListener("meawketting:business-session-verified", verified);
  if (options.initial !== false) void refresh("initial");
  else if (options.intervalMs) schedule(options.intervalMs);
  return { refresh, stop: () => {
    stopped = true; clear(); controller?.abort();
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("meawketting:business-data-invalidated", invalidated);
    window.removeEventListener("meawketting:business-session-verified", verified);
  } };
}
