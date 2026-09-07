import { BE1_DEV_ACTOR_HEADER } from "./contracts";
import { be1Error } from "./errors";

export type AuthenticatedIdentity = {
  personId: string;
  provider: "dev-test";
};

export interface IdentityAdapter {
  resolve(request: Request): Promise<AuthenticatedIdentity>;
}

/**
 * Explicitly non-production identity bridge for local development and tests.
 * The caller-controlled header is accepted only when the server environment
 * opts into `dev-test`; it must never be treated as a production login.
 */
export class DevTestIdentityAdapter implements IdentityAdapter {
  private readonly mode: string | undefined;

  constructor(mode: string | undefined) {
    this.mode = mode;
  }

  async resolve(request: Request): Promise<AuthenticatedIdentity> {
    if (this.mode !== "dev-test") throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
    const personId = request.headers.get(BE1_DEV_ACTOR_HEADER)?.trim();
    if (!personId) throw be1Error("UNAUTHENTICATED");
    return { personId, provider: "dev-test" };
  }
}
