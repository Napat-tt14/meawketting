import { env } from "cloudflare:workers";
import { D1Be1Repository } from "../../_backend/be1/d1Repository";
import type { D1DatabaseLike } from "../../_backend/be1/repository";
import { Be8Application } from "../../_backend/be8/application";
import { parseBe8Operation } from "../../_backend/be8/validation";
import { businessRequest } from "../../_backend/shared/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const db = env.DB as unknown as D1DatabaseLike;
  return businessRequest(request, env.MEAWKETTING_AUTH_MODE, async (personId, body, metadata) => {
    const app = new Be8Application(new D1Be1Repository(db), db);
    return app.executeBe8(await app.resolvePerson(personId), parseBe8Operation(body), metadata);
  }, db);
}
