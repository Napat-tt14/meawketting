import { env } from "cloudflare:workers";
import { PostgresBe1Repository } from "../../_backend/be1/postgresRepository";
import { database as getDatabase } from "../../_backend/runtime";
import { Be8Application } from "../../_backend/be8/application";
import { parseBe8Operation } from "../../_backend/be8/validation";
import { businessRequest } from "../../_backend/shared/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const db = getDatabase();
  return businessRequest(request, env.MEAWKETTING_AUTH_MODE, async (personId, body, metadata) => {
    const app = new Be8Application(new PostgresBe1Repository(db), db);
    return app.executeBe8(await app.resolvePerson(personId), parseBe8Operation(body), metadata);
  }, db);
}
