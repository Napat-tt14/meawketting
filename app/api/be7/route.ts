import { env } from "cloudflare:workers";
import { PostgresBe1Repository } from "../../_backend/be1/postgresRepository";
import { database as getDatabase } from "../../_backend/runtime";
import { Be7Application } from "../../_backend/be7/application";
import { PostgresBe7Repository } from "../../_backend/be7/postgresRepository";
import { parseBe7Operation } from "../../_backend/be7/validation";
import { businessRequest } from "../../_backend/shared/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const db = getDatabase();
  return businessRequest(request, env.MEAWKETTING_AUTH_MODE, async (personId, body, metadata) => {
    // No Payment Provider has been selected or configured. Manual recording is separate.
    const app = new Be7Application(new PostgresBe1Repository(db), new PostgresBe7Repository(db));
    return app.executeBe7(await app.resolvePerson(personId), parseBe7Operation(body), metadata);
  }, db);
}
