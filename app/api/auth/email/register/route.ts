import { emailPasswordRequest } from "../../../../_backend/supabaseAuth";

export const dynamic = "force-dynamic";
export const POST = (request: Request) => emailPasswordRequest(request, "register");
