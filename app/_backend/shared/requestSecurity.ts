import { be1Error } from "../be1/errors";

/** Same-origin browser commands. Webhooks use signatures and do not call this. */
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin !== null && origin !== new URL(request.url).origin)
    || request.headers.get("sec-fetch-site") === "cross-site"
    || (request.headers.has("cookie") && origin === null)) throw be1Error("FORBIDDEN");
}
