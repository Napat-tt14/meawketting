import { env } from "cloudflare:workers";
import { Be1Application } from "../../_backend/be1/application";
import type { Be1ApiFailure, Be1ApiSuccess } from "../../_backend/be1/contracts";
import { D1Be1Repository } from "../../_backend/be1/d1Repository";
import { asBe1Error } from "../../_backend/be1/errors";
import { resolveIdentity } from "../../_backend/be1/identity";
import { createRequestMetadata } from "../../_backend/be1/metadata";
import type { D1DatabaseLike } from "../../_backend/be1/repository";
import { parseBe1Operation } from "../../_backend/be1/validation";

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
    const database = env.DB as unknown as D1DatabaseLike;
    const identity = await resolveIdentity(request, env.MEAWKETTING_AUTH_MODE, database);
    const repository = new D1Be1Repository(database);
    const application = new Be1Application(repository);
    const actor = await application.resolvePerson(identity.personId);
    const requestBody = await readJson(request);
    const operation = parseBe1Operation(requestBody);
    const data = await application.execute(actor, operation, metadata);
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
