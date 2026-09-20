import { logoutSupabase } from "../../../../_backend/supabaseAuth";
import { requireSameOrigin } from "../../../../_backend/shared/requestSecurity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    return await logoutSupabase();
  } catch {
    return new Response(null, { status: 403, headers: { "cache-control": "no-store" } });
  }
}
