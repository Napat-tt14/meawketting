import { beginBusinessLogin } from "../../../../_backend/supabaseAuth";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return await beginBusinessLogin("custom:line"); }
  catch { return Response.redirect(new URL("/business/login?error=not-configured", request.url), 302); }
}
