import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TestSql, TestD1, migrate, projectRoot } from "./d1TestKit";
export { migrate, projectRoot };
export function seededDatabase() {
  const inspect = new TestSql();
  migrate(inspect);
  for (const phase of [1, 2, 3]) inspect.exec(readFileSync(resolve(projectRoot, "tests/fixtures/d1", `seed-be${phase}-dev.sql`), "utf8"));
  inspect.exec(readFileSync(resolve(projectRoot, "tests/fixtures/d1/seed-execution-plans.sql"), "utf8"));
  inspect.exec(readFileSync(resolve(projectRoot, "tests/fixtures/d1/seed-be4-dev.sql"), "utf8"));
  return new TestD1(inspect);
}
export const OWNER = "prs_01k47meawketting000000001", MANAGER = "prs_01k47meawketting000000002", STAFF = "prs_01k47meawketting000000003", INACTIVE = "prs_01k47meawketting000000004", OUTSIDER = "prs_01k47meawketting000000005";
export const WHISKER = "business-whisker-rest", PAW = "business-paw-partner", ARI = "whisker-ari", THONGLOR = "whisker-thonglor", ONNUT = "partner-onnut";
export function metadata() { const requestId = `req_${crypto.randomUUID()}`; return { requestId, correlationId: requestId, receivedAt: "2026-08-20T04:00:00.000Z" }; }
