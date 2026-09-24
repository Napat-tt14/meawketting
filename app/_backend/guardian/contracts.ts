import type { PersonView } from "../be1/contracts";
import type { GuardianGrantService } from "../be5/authority";

/** PLANNED server contracts only. No adapter, session or authority provisioning here.
 * See docs/GUARDIAN_LINE_MINIAPP.md. These types are never trusted browser input.
 */
export type VerifiedExternalIdentity = Readonly<{
  provider: string;
  issuer: string;
  subject: string;
  verifiedAt: string;
}>;

/** Verify provider proof, expiry, audience and request binding server-side.
 * Never trust a browser subject/Person ID or infer Pet authority from identity.
 * Fail closed; return no provider tokens. Implementation remains planned.
 */
export interface GuardianIdentityAdapter {
  verify(request: Request): Promise<VerifiedExternalIdentity>;
}

/** Server-only projection; recheck mapping, Person and per-object authority.
 * A linked session never carries Pet permissions.
 */
export type GuardianSession =
  | { state: "unauthenticated" }
  | { state: "unlinked" }
  | { state: "linked"; personId: PersonView["id"]; expiresAt: string };

/** Future API delegates to existing BE5 with server-resolved Person and
 * verified-provider mode. Never expose personId as browser authority.
 * Other actions remain documented pending approved policies and safe DTOs.
 */
export type GuardianGrantCommands = Pick<GuardianGrantService, "issue" | "decide">;
