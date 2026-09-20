import { env } from "cloudflare:workers";
import { PostgresBe1Repository } from "../../_backend/be1/postgresRepository";
import { database as getDatabase } from "../../_backend/runtime";
import { PostgresBe2Repository } from "../../_backend/be2/postgresRepository";
import { PostgresBe3Repository } from "../../_backend/be3/postgresRepository";
import { Be4Application } from "../../_backend/be4/application";
import { PostgresBe4Repository } from "../../_backend/be4/postgresRepository";
import { parseBe4Operation } from "../../_backend/be4/validation";
import { businessRequest } from "../../_backend/shared/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const db = getDatabase();
  return businessRequest(request, env.MEAWKETTING_AUTH_MODE, async (personId, body, metadata) => {
    const application = new Be4Application(new PostgresBe1Repository(db), new PostgresBe2Repository(db), new PostgresBe3Repository(db), new PostgresBe4Repository(db));
    return application.executeBe4(await application.resolvePerson(personId), parseBe4Operation(body), metadata);
  }, db);
}
