import { env } from "cloudflare:workers";
import { PostgresBe1Repository } from "../../_backend/be1/postgresRepository";
import { database as getDatabase } from "../../_backend/runtime";
import { Be5Application } from "../../_backend/be5/application";
import { PostgresBe5Repository } from "../../_backend/be5/postgresRepository";
import { parseBe5Operation } from "../../_backend/be5/validation";
import { businessRequest } from "../../_backend/shared/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const db = getDatabase();
  return businessRequest(request, env.MEAWKETTING_AUTH_MODE, async (personId, body, metadata) => {
    const mode = process.env.NODE_ENV === "development" && env.MEAWKETTING_AUTH_MODE === "dev-test" ? "dev-test" : "verified-provider";
    const app = new Be5Application(new PostgresBe1Repository(db), new PostgresBe5Repository(db, mode));
    return app.executeBe5(await app.resolvePerson(personId), parseBe5Operation(body), metadata);
  }, db);
}
