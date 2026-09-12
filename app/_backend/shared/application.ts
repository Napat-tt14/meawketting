import { Be1Application } from "../be1/application";
import type { PersonView } from "../be1/contracts";
import { be1Error } from "../be1/errors";
import type { RequestMetadata } from "../be1/metadata";
import type { Be1Repository } from "../be1/repository";
import { validateId } from "../be1/validation";

export class BusinessApplication extends Be1Application {
  constructor(repository: Be1Repository) { super(repository); }

  async scope(actor: PersonView, businessId: string, branchId: string, metadata: RequestMetadata, now: string, write = false) {
    const currentActor = await this.resolvePerson(actor.id);
    const { membership } = await this.resolveMembership(currentActor, validateId(businessId));
    const branch = await this.getBranch(currentActor, businessId, validateId(branchId));
    if (write && branch.status !== "active") throw be1Error("FORBIDDEN");
    return { actor: currentActor, membership, branch, metadata, occurredAt: now };
  }
}
