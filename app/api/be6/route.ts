import { env } from "cloudflare:workers";
import { D1Be1Repository } from "../../_backend/be1/d1Repository";
import type { D1DatabaseLike } from "../../_backend/be1/repository";
import { Be6Application } from "../../_backend/be6/application";
import { D1Be6Repository } from "../../_backend/be6/d1Repository";
import { parseBe6Operation } from "../../_backend/be6/validation";
import { businessRequest } from "../../_backend/shared/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return businessRequest(request, env.MEAWKETTING_AUTH_MODE, async (personId, body, metadata) => {
    const db = env.DB as unknown as D1DatabaseLike;
    const mode = process.env.NODE_ENV === "development" && env.MEAWKETTING_AUTH_MODE === "dev-test" ? "dev-test" : "verified-provider";
    const app = new Be6Application(new D1Be1Repository(db), new D1Be6Repository(db, mode));
    return app.executeBe6(await app.resolvePerson(personId), parseBe6Operation(body), metadata);
  });
}
