import { logoutSession } from "../../../../_backend/auth";
import { requireSameOrigin } from "../../../../_backend/shared/requestSecurity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    return await logoutSession();
  } catch {
    return new Response(null, { status: 403, headers: { "cache-control": "no-store" } });
  }
}
