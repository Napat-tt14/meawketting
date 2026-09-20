import { finishGoogleLogin } from "../../../../_backend/supabaseAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return finishGoogleLogin(request);
}
