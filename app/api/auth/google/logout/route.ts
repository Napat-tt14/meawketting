import { env } from "cloudflare:workers";
import { logoutGoogleSession } from "../../../../_backend/googleAuth";
import type { GoogleAuthEnvironment } from "../../../../_backend/googleAuth";
import { requireSameOrigin } from "../../../../_backend/shared/requestSecurity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    return await logoutGoogleSession(request, env as unknown as GoogleAuthEnvironment);
  } catch {
    return new Response(null, { status: 403, headers: { "cache-control": "no-store" } });
  }
}
