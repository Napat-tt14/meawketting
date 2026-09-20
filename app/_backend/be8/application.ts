import type { PersonView } from "../be1/contracts";
import type { RequestMetadata } from "../be1/metadata";
import type { Be1Repository, Database } from "../be1/repository";
import { BusinessApplication } from "../shared/application";
import { dateInZone } from "../shared/time";
import type { Be8Operation } from "./contracts";
import { parseBe8Operation } from "./validation";
import { reportRange } from "./projections";
import { projectReport } from "./reports";
import { projectCrm } from "./crm";

export class Be8Application extends BusinessApplication {
  constructor(repository: Be1Repository, private readonly db: Database, private readonly clock = () => new Date().toISOString()) { super(repository); }
  async executeBe8(actor: PersonView, raw: Be8Operation, metadata: RequestMetadata) {
    const op = parseBe8Operation(raw), now = this.clock(), context = await this.scope(actor, op.businessId, op.branchId, metadata, now);
    const all = op.type !== "reports.get" || op.options.branchScope === "all";
    const branches = all ? await this.listPermittedBranches(context.actor, op.businessId, context.membership.role === "OWNER") : [context.branch];
    const range = op.type === "reports.get" ? reportRange(op.options, now, context.branch.timezone) : { startDate: dateInZone(now, context.branch.timezone), endDate: dateInZone(now, context.branch.timezone) };
    const scope = { context, branches, now, ...range };
    return op.type === "reports.get" ? projectReport(this.db, scope, op.options) : projectCrm(this.db, scope, op.type === "crm.get" ? { customerId: op.customerId, before: op.before } : { afterId: op.afterId, limit: op.limit });
  }
}
