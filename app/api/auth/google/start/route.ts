import { businessLoginRequest } from "../../../../_backend/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return businessLoginRequest(request, "google");
}
