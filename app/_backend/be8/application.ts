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
import { projectSummary } from "./summaries";

export class Be8Application extends BusinessApplication {
  constructor(repository: Be1Repository, private readonly db: Database, private readonly clock = () => new Date().toISOString()) { super(repository); }
  async executeBe8(actor: PersonView, raw: Be8Operation, metadata: RequestMetadata) {
    const op = parseBe8Operation(raw), now = this.clock(), context = await this.scope(actor, op.businessId, op.branchId, metadata, now);
    const all = op.type.startsWith("crm.") || (op.type === "reports.get" && op.options.branchScope === "all");
    const branches = all ? await this.listPermittedBranchesForMembership(context.membership, context.membership.role === "OWNER") : [context.branch];
    const range = op.type === "reports.get" ? reportRange(op.options, now, context.branch.timezone) : { startDate: dateInZone(now, context.branch.timezone), endDate: dateInZone(now, context.branch.timezone) };
    const scope = { context, branches, now, ...range };
    const result = await (op.type === "reports.get" ? projectReport(this.db, scope, op.options)
      : op.type === "home.summary" || op.type === "billing.summary" ? projectSummary(this.db, scope, op.type === "home.summary")
        : projectCrm(this.db, scope, op.type === "crm.get" ? { customerId: op.customerId, before: op.before } : op));
    return { ...result, readScope: { personId: context.actor.id, membershipId: context.membership.id, role: context.membership.role, membershipUpdatedAt: context.membership.updatedAt, branches: branches.map(b => ({ id: b.id, updatedAt: b.updatedAt })) } };
  }
}
