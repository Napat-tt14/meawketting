import { env } from "cloudflare:workers";
import { finishGoogleLogin } from "../../../../_backend/googleAuth";
import type { GoogleAuthEnvironment } from "../../../../_backend/googleAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return finishGoogleLogin(request, env as unknown as GoogleAuthEnvironment);
}
