import { beginGoogleLogin } from "../../../../_backend/supabaseAuth";

export const dynamic = "force-dynamic";

function failureRedirect(request: Request, code: "not-configured" | "try-again") {
  const location = new URL("/business/login", request.url);
  location.searchParams.set("error", code);
  return Response.redirect(location, 302);
}

export async function GET(request: Request) {
  try {
    return await beginGoogleLogin();
  } catch {
    return failureRedirect(request, "not-configured");
  }
}
