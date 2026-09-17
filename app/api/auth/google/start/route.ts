import { env } from "cloudflare:workers";
import { beginGoogleLogin } from "../../../../_backend/googleAuth";
import type { GoogleAuthEnvironment } from "../../../../_backend/googleAuth";

export const dynamic = "force-dynamic";

function failureRedirect(request: Request, code: "not-configured" | "try-again") {
  const location = new URL("/business/login", request.url);
  location.searchParams.set("error", code);
  return Response.redirect(location, 302);
}

export async function GET(request: Request) {
  try {
    return await beginGoogleLogin(request, env as unknown as GoogleAuthEnvironment);
  } catch {
    return failureRedirect(request, "not-configured");
  }
}
