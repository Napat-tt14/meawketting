import { env } from "cloudflare:workers";
import { D1Be1Repository } from "../../_backend/be1/d1Repository";
import type { D1DatabaseLike } from "../../_backend/be1/repository";
import { D1Be2Repository } from "../../_backend/be2/d1Repository";
import { D1Be3Repository } from "../../_backend/be3/d1Repository";
import { Be4Application } from "../../_backend/be4/application";
import { D1Be4Repository } from "../../_backend/be4/d1Repository";
import { parseBe4Operation } from "../../_backend/be4/validation";
import { businessRequest } from "../../_backend/shared/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return businessRequest(request, env.MEAWKETTING_AUTH_MODE, async (personId, body, metadata) => {
    const db = env.DB as unknown as D1DatabaseLike;
    const application = new Be4Application(new D1Be1Repository(db), new D1Be2Repository(db), new D1Be3Repository(db), new D1Be4Repository(db));
    return application.executeBe4(await application.resolvePerson(personId), parseBe4Operation(body), metadata);
  });
}
