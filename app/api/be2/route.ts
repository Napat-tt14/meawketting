import { env } from "cloudflare:workers";
import { D1Be1Repository } from "../../_backend/be1/d1Repository";
import { asBe1Error, be1Error } from "../../_backend/be1/errors";
import { DevTestIdentityAdapter } from "../../_backend/be1/identity";
import { createRequestMetadata } from "../../_backend/be1/metadata";
import type { D1DatabaseLike } from "../../_backend/be1/repository";
import type { Be1ApiFailure, Be1ApiSuccess } from "../../_backend/be1/contracts";
import { Be2Application } from "../../_backend/be2/application";
import { D1Be2Repository } from "../../_backend/be2/d1Repository";
import { parseBe2Operation } from "../../_backend/be2/validation";

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
    const identity = await new DevTestIdentityAdapter(env.MEAWKETTING_AUTH_MODE).resolve(request);
    const database = env.DB as unknown as D1DatabaseLike;
    const application = new Be2Application(
      new D1Be1Repository(database),
      new D1Be2Repository(database),
    );
    const actor = await application.resolvePerson(identity.personId);
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch (error) {
      throw be1Error("INVALID_INPUT", error);
    }
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
