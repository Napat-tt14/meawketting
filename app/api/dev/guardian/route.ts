import { env } from "cloudflare:workers";
import { database as getDatabase } from "../../../_backend/runtime";
import { be1Error } from "../../../_backend/be1/errors";
import { validateId } from "../../../_backend/be1/validation";
import { GuardianGrantService } from "../../../_backend/be5/authority";
import { GuardianApprovalService } from "../../../_backend/be6/authority";
import { businessRequest } from "../../../_backend/shared/http";
import { choice, integer, object } from "../../../_backend/shared/validation";

/** DEV/TEST adapter only. There is no Guardian login, Mini App or production authority provisioning here. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development" || env.MEAWKETTING_AUTH_MODE !== "dev-test") return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
  return businessRequest(request, "dev-test", async (personId, body) => {
    const service = new GuardianGrantService(getDatabase(), "dev-test"), input = object(body);
    if (input.type === "approval") {
      await new GuardianApprovalService(getDatabase(), "dev-test").decide(personId, validateId(input.businessId), validateId(input.branchId), validateId(input.messageId),
        choice(input.decision, ["approved", "declined"] as const), integer(input.expectedRevision, 1, 2147483647), validateId(input.requestKey));
      return { saved: true };
    }
    if (input.type === "issue") return service.issue(personId, input.input, validateId(input.requestKey));
    if (input.type === "decide") {
      await service.decide(personId, validateId(input.businessId), validateId(input.branchId), validateId(input.grantId),
        choice(input.decision, ["approved", "denied", "revoke"] as const), integer(input.expectedRevision, 1, 2147483647), validateId(input.requestKey));
      return { saved: true };
    }
    throw be1Error("INVALID_INPUT");
  });
}
