import { env } from "cloudflare:workers";
import { PostgresBe1Repository } from "../../_backend/be1/postgresRepository";
import { database as getDatabase } from "../../_backend/runtime";
import { Be6Application } from "../../_backend/be6/application";
import { PostgresBe6Repository } from "../../_backend/be6/postgresRepository";
import { parseBe6Operation } from "../../_backend/be6/validation";
import { businessRequest } from "../../_backend/shared/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const db = getDatabase();
  return businessRequest(request, env.MEAWKETTING_AUTH_MODE, async (personId, body, metadata) => {
    const mode = process.env.NODE_ENV === "development" && env.MEAWKETTING_AUTH_MODE === "dev-test" ? "dev-test" : "verified-provider";
    const app = new Be6Application(new PostgresBe1Repository(db), new PostgresBe6Repository(db, mode));
    return app.executeBe6(await app.resolvePerson(personId), parseBe6Operation(body), metadata);
  }, db);
}
