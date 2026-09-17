import { env } from "cloudflare:workers";
import { D1Be1Repository } from "../../_backend/be1/d1Repository";
import type { D1DatabaseLike } from "../../_backend/be1/repository";
import { Be5Application } from "../../_backend/be5/application";
import { D1Be5Repository } from "../../_backend/be5/d1Repository";
import { parseBe5Operation } from "../../_backend/be5/validation";
import { businessRequest } from "../../_backend/shared/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const db = env.DB as unknown as D1DatabaseLike;
  return businessRequest(request, env.MEAWKETTING_AUTH_MODE, async (personId, body, metadata) => {
    const mode = process.env.NODE_ENV === "development" && env.MEAWKETTING_AUTH_MODE === "dev-test" ? "dev-test" : "verified-provider";
    const app = new Be5Application(new D1Be1Repository(db), new D1Be5Repository(db, mode));
    return app.executeBe5(await app.resolvePerson(personId), parseBe5Operation(body), metadata);
  }, db);
}
