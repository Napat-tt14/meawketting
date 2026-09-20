import { env } from "cloudflare:workers";
import { PostgresBe1Repository } from "../../_backend/be1/postgresRepository";
import { asBe1Error } from "../../_backend/be1/errors";
import { resolveIdentity } from "../../_backend/be1/identity";
import { createRequestMetadata } from "../../_backend/be1/metadata";
import { database as getDatabase } from "../../_backend/runtime";
import type { Be1ApiFailure, Be1ApiSuccess } from "../../_backend/be1/contracts";
import { Be2Application } from "../../_backend/be2/application";
import { PostgresBe2Repository } from "../../_backend/be2/postgresRepository";
import { parseBe2Operation } from "../../_backend/be2/validation";

import { readJson } from "../../_backend/shared/http";
import { requireSameOrigin } from "../../_backend/shared/requestSecurity";

export const dynamic = "force-dynamic";

function responseHeaders(requestId: string, correlationId: string) {
  return {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-request-id": requestId,
    "x-correlation-id": correlationId,
  };
}

export async function POST(request: Request) {
  const metadata = createRequestMetadata(request.headers);
  try {
    requireSameOrigin(request);
    const database = getDatabase();
    const identity = await resolveIdentity(request, env.MEAWKETTING_AUTH_MODE, database);
    const application = new Be2Application(
      new PostgresBe1Repository(database),
      new PostgresBe2Repository(database),
    );
    const actor = await application.resolvePerson(identity.personId);
    const requestBody = await readJson(request);
    const operation = parseBe2Operation(requestBody);
    const data = await application.executeBe2(actor, operation, metadata);
    const body: Be1ApiSuccess = {
      ok: true,
      data,
      meta: { requestId: metadata.requestId, correlationId: metadata.correlationId },
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: responseHeaders(metadata.requestId, metadata.correlationId),
    });
  } catch (error) {
    const failure = asBe1Error(error);
    const body: Be1ApiFailure = {
      ok: false,
      error: { code: failure.code, message: failure.message },
      meta: { requestId: metadata.requestId, correlationId: metadata.correlationId },
    };
    return new Response(JSON.stringify(body), {
      status: failure.status,
      headers: responseHeaders(metadata.requestId, metadata.correlationId),
    });
  }
}
