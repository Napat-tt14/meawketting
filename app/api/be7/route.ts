import { env } from "cloudflare:workers";
import { D1Be1Repository } from "../../_backend/be1/d1Repository";
import type { D1DatabaseLike } from "../../_backend/be1/repository";
import { Be7Application } from "../../_backend/be7/application";
import { D1Be7Repository } from "../../_backend/be7/d1Repository";
import { parseBe7Operation } from "../../_backend/be7/validation";
import { businessRequest } from "../../_backend/shared/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return businessRequest(request, env.MEAWKETTING_AUTH_MODE, async (personId, body, metadata) => {
    const db = env.DB as unknown as D1DatabaseLike;
    // No Payment Provider has been selected or configured. Manual recording is separate.
    const app = new Be7Application(new D1Be1Repository(db), new D1Be7Repository(db));
    return app.executeBe7(await app.resolvePerson(personId), parseBe7Operation(body), metadata);
  });
}
