import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { Be1Application } from "../app/_backend/be1/application.ts";
import {
  BE1_DEV_ACTOR_HEADER,
  BE1_DEV_OWNER_PERSON_ID,
  BE1_WEEKDAYS,
  type BranchConfigurationInput,
  type OperatingHoursView,
} from "../app/_backend/be1/contracts.ts";
import { D1Be1Repository } from "../app/_backend/be1/d1Repository.ts";
import { Be1Error } from "../app/_backend/be1/errors.ts";
import { DevTestIdentityAdapter } from "../app/_backend/be1/identity.ts";
import type { RequestMetadata } from "../app/_backend/be1/metadata.ts";
import type { D1DatabaseLike, D1PreparedStatementLike, D1ResultLike } from "../app/_backend/be1/repository.ts";

const projectRoot = resolve(import.meta.dirname, "..");
const migrations = readdirSync(resolve(projectRoot, "drizzle")).filter((name) => name.endsWith(".sql")).sort();
const seedSql = readFileSync(resolve(projectRoot, "scripts", "seed-be1-dev.sql"), "utf8");
const OWNER = BE1_DEV_OWNER_PERSON_ID;
const MANAGER = "prs_01k47meawketting000000002";
const STAFF = "prs_01k47meawketting000000003";
const INACTIVE_MEMBER = "prs_01k47meawketting000000004";
const OUTSIDER = "prs_01k47meawketting000000005";
const INACTIVE_PERSON = "prs_01k47meawketting000000006";
const WHISKER = "business-whisker-rest";
const PAW = "business-paw-partner";
const ARI = "whisker-ari";
const THONGLOR = "whisker-thonglor";
const ONNUT = "partner-onnut";

class NodeD1Statement implements D1PreparedStatementLike {
  private values: SQLInputValue[] = [];
  readonly database: DatabaseSync;
  readonly query: string;

  constructor(database: DatabaseSync, query: string) {
    this.database = database;
    this.query = query;
  }

  bind(...values: unknown[]) {
    const next = new NodeD1Statement(this.database, this.query);
    next.values = values as SQLInputValue[];
    return next;
  }

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const row = this.database.prepare(this.query).get(...this.values) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async all<T = Record<string, unknown>>(): Promise<D1ResultLike<T>> {
    const results = this.database.prepare(this.query).all(...this.values) as T[];
    return { success: true, results };
  }

  async run<T = Record<string, unknown>>(): Promise<D1ResultLike<T>> {
    const result = this.database.prepare(this.query).run(...this.values);
    return { success: true, results: [], meta: { changes: Number(result.changes) } };
  }
}

class NodeD1Database implements D1DatabaseLike {
  readonly sqlite: DatabaseSync;

  constructor(sqlite: DatabaseSync) {
    this.sqlite = sqlite;
  }

  prepare(query: string) {
    return new NodeD1Statement(this.sqlite, query);
  }

  async batch(statements: D1PreparedStatementLike[]) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results: D1ResultLike[] = [];
      for (const statement of statements) results.push(await statement.run());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

function migrate(database: DatabaseSync) {
  database.exec("PRAGMA foreign_keys = ON");
  for (const migration of migrations) {
    database.exec(readFileSync(resolve(projectRoot, "drizzle", migration), "utf8").replaceAll("--> statement-breakpoint", ""));
  }
}

function fixture(file?: string) {
  const sqlite = new DatabaseSync(file ?? ":memory:");
  migrate(sqlite);
  sqlite.exec(seedSql);
  const database = new NodeD1Database(sqlite);
  const repository = new D1Be1Repository(database);
  let sequence = 0;
  const application = new Be1Application(repository, {
    now: () => `2026-09-05T12:00:${String(sequence++).padStart(2, "0")}.000Z`,
    id: () => `brn_01k47meawketting${String(sequence++).padStart(9, "0")}`,
  });
  return { sqlite, database, repository, application };
}

function metadata(correlationId = "corr-be1-test-0001"): RequestMetadata {
  return {
    requestId: `req-be1-test-${correlationId}`,
    correlationId,
    receivedAt: "2026-09-05T11:59:59.000Z",
  };
}

function hours(open = "09:00", close = "20:00"): OperatingHoursView[] {
  return BE1_WEEKDAYS.map((day) => ({ day, closed: false, open, close }));
}

function branchInput(name = "ลาดพร้าว"): BranchConfigurationInput {
  return {
    businessId: WHISKER,
    name,
    area: "ลาดพร้าว",
    address: "กรุงเทพมหานคร",
    phone: "02-000-0000",
    email: "ladprao@example.test",
    timezone: "Asia/Bangkok",
    enabledModules: ["grooming", "daycare"],
    operatingHours: hours(),
  };
}

async function actor(application: Be1Application, personId: string) {
  return application.resolvePerson(personId);
}

function hasCode(code: Be1Error["code"]) {
  return (error: unknown) => error instanceof Be1Error && error.code === code;
}

test("explicit dev/test identity resolves a persisted Person and production remains unconfigured", async () => {
  const { sqlite, application } = fixture();
  try {
    const request = new Request("http://localhost/api/be1", { headers: { [BE1_DEV_ACTOR_HEADER]: OWNER } });
    const identity = await new DevTestIdentityAdapter("dev-test").resolve(request);
    assert.equal(identity.personId, OWNER);
    assert.equal((await application.resolvePerson(identity.personId)).displayName, "คุณนนท์");
    await assert.rejects(new DevTestIdentityAdapter(undefined).resolve(request), hasCode("AUTHENTICATION_NOT_CONFIGURED"));
    await assert.rejects(application.resolvePerson(INACTIVE_PERSON), hasCode("PERSON_INACTIVE"));
  } finally {
    sqlite.close();
  }
});

test("membership resolution rejects absent and inactive memberships", async () => {
  const { sqlite, application } = fixture();
  try {
    const manager = await actor(application, MANAGER);
    assert.equal((await application.resolveMembership(manager, WHISKER)).membership.role, "MANAGER");
    await assert.rejects(application.resolveMembership(manager, PAW), hasCode("FORBIDDEN"));
    await assert.rejects(application.resolveMembership(await actor(application, INACTIVE_MEMBER), PAW), hasCode("MEMBERSHIP_INACTIVE"));
    await assert.rejects(application.resolveSession(await actor(application, OUTSIDER)), hasCode("FORBIDDEN"));
  } finally {
    sqlite.close();
  }
});

test("Owner has Business-wide Branch access while Manager and Staff remain grant-scoped", async () => {
  const { sqlite, application } = fixture();
  try {
    const owner = await actor(application, OWNER);
    const manager = await actor(application, MANAGER);
    const staff = await actor(application, STAFF);
    assert.deepEqual((await application.listPermittedBranches(owner, WHISKER, true)).map((branch) => branch.id), [ARI, THONGLOR]);
    assert.deepEqual((await application.listPermittedBranches(manager, WHISKER)).map((branch) => branch.id), [ARI]);
    assert.deepEqual((await application.listPermittedBranches(staff, WHISKER)).map((branch) => branch.id), [THONGLOR]);
    await assert.rejects(application.getBranch(manager, WHISKER, THONGLOR), hasCode("NOT_FOUND"));
    await assert.rejects(application.getBranch(staff, WHISKER, ARI), hasCode("NOT_FOUND"));
    await assert.rejects(application.listPermittedBranches(manager, WHISKER, true), hasCode("FORBIDDEN"));
    sqlite.prepare(`
      UPDATE membership_branch_access
      SET status = 'inactive', updated_at = ?
      WHERE membership_id = ? AND business_id = ? AND branch_id = ?
    `).run("2026-09-05T02:00:00.000Z", "mem_01k47meawketting000000003", WHISKER, ARI);
    assert.deepEqual(await application.listPermittedBranches(manager, WHISKER), []);
    await assert.rejects(application.getBranch(manager, WHISKER, ARI), hasCode("NOT_FOUND"));
  } finally {
    sqlite.close();
  }
});

test("server scope rejects wrong Business, wrong Branch, spoofed ids, and forbidden role actions", async () => {
  const { sqlite, application } = fixture();
  try {
    const owner = await actor(application, OWNER);
    const manager = await actor(application, MANAGER);
    await assert.rejects(application.getBranch(manager, PAW, ONNUT), hasCode("FORBIDDEN"));
    await assert.rejects(application.getBranch(owner, PAW, ARI), hasCode("NOT_FOUND"));
    await assert.rejects(application.getBranch(manager, WHISKER, "branch_spoofed_00000001"), hasCode("NOT_FOUND"));
    await assert.rejects(application.updateBusiness(manager, {
      businessId: WHISKER,
      name: "Spoofed",
      contactName: "",
      phone: "",
      email: "",
      description: "",
      address: "",
    }, metadata()), hasCode("FORBIDDEN"));
  } finally {
    sqlite.close();
  }
});

test("Business and Branch configuration persists with modules, hours, audit, and correlation metadata", async () => {
  const { sqlite, application, repository } = fixture();
  try {
    const owner = await actor(application, OWNER);
    const business = await application.updateBusiness(owner, {
      businessId: WHISKER,
      name: "Whisker Rest Thailand",
      contactName: "คุณนนท์",
      phone: "02-114-8899",
      email: "hello@whiskerrest.example",
      description: "ทีมดูแลสัตว์เลี้ยง",
      address: "กรุงเทพมหานคร",
    }, metadata("corr-business-update"));
    assert.equal(business.name, "Whisker Rest Thailand");
    assert.equal((await repository.getBusiness(WHISKER))?.phone, "02-114-8899");

    const created = await application.createBranch(owner, branchInput(), metadata("corr-branch-create"));
    assert.match(created.id, /^brn_/);
    assert.deepEqual(created.enabledModules, ["grooming", "daycare"]);
    assert.equal(created.operatingHours.length, 7);

    const updated = await application.updateBranch(owner, {
      ...branchInput("ลาดพร้าวเหนือ"),
      branchId: created.id,
      enabledModules: ["hotel"],
      operatingHours: hours("08:00", "19:00"),
    }, metadata("corr-branch-update"));
    assert.equal(updated.name, "ลาดพร้าวเหนือ");
    assert.deepEqual((await repository.getBranch(WHISKER, created.id))?.enabledModules, ["hotel"]);
    assert.equal((await repository.getBranch(WHISKER, created.id))?.operatingHours[0]?.open, "08:00");

    const modules = await application.updateEnabledModules(owner, WHISKER, created.id, ["grooming", "hotel", "daycare"], metadata("corr-modules"));
    assert.deepEqual(modules.enabledModules, ["grooming", "hotel", "daycare"]);
    const changedHours = hours("10:00", "18:00");
    changedHours[6] = { ...changedHours[6]!, closed: true };
    const operating = await application.updateOperatingHours(owner, WHISKER, created.id, changedHours, metadata("corr-hours"));
    assert.equal(operating.operatingHours[6]?.closed, true);

    const audits = sqlite.prepare("SELECT action, actor_person_id, business_id, branch_id, correlation_id FROM audit_events ORDER BY occurred_at, action").all();
    assert.ok(audits.length >= 5);
    assert.ok(audits.some((entry) => entry.correlation_id === "corr-business-update" && entry.actor_person_id === OWNER));
    assert.ok(audits.some((entry) => entry.correlation_id === "corr-hours" && entry.branch_id === created.id));
  } finally {
    sqlite.close();
  }
});

test("Branch deactivation preserves history and atomically guards the last active Branch", async () => {
  const { sqlite, application, repository } = fixture();
  try {
    const owner = await actor(application, OWNER);
    const inactive = await application.setBranchActive(owner, WHISKER, ARI, false, metadata("corr-deactivate-ari"));
    assert.equal(inactive.status, "inactive");
    assert.equal((await repository.getBranch(WHISKER, ARI))?.status, "inactive", "historical Branch is retained");
    assert.deepEqual((await application.listPermittedBranches(owner, WHISKER)).map((branch) => branch.id), [THONGLOR]);
    await assert.rejects(application.setBranchActive(owner, WHISKER, THONGLOR, false, metadata("corr-last-branch")), hasCode("LAST_ACTIVE_BRANCH"));
    assert.equal((await repository.getBranch(WHISKER, THONGLOR))?.status, "active");
    await assert.rejects(application.setBranchActive(owner, PAW, ONNUT, false, metadata("corr-paw-last")), hasCode("LAST_ACTIVE_BRANCH"));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM branches WHERE business_id = ?").get(WHISKER)?.count, 2);
  } finally {
    sqlite.close();
  }
});

test("relational constraints reject invalid roles, cross-Business access, and invalid hours", () => {
  const { sqlite } = fixture();
  try {
    assert.throws(() => sqlite.prepare(`
      INSERT INTO business_memberships (id, person_id, business_id, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run("mem_01k47invalidrole00000001", OUTSIDER, WHISKER, "ADMIN", "2026-09-05T01:00:00.000Z", "2026-09-05T01:00:00.000Z"), /CHECK constraint/i);
    assert.throws(() => sqlite.prepare(`
      INSERT INTO membership_branch_access (membership_id, business_id, branch_id, status, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?)
    `).run("mem_01k47meawketting000000003", PAW, ONNUT, "2026-09-05T01:00:00.000Z", "2026-09-05T01:00:00.000Z"), /FOREIGN KEY constraint/i);
    assert.throws(() => sqlite.prepare(`
      UPDATE membership_branch_access SET status = 'revoked'
      WHERE membership_id = ? AND branch_id = ?
    `).run("mem_01k47meawketting000000003", ARI), /CHECK constraint/i);
    assert.throws(() => sqlite.prepare(`
      INSERT INTO branch_operating_hours (business_id, branch_id, weekday, closed, opens_at, closes_at, updated_at)
      VALUES (?, ?, ?, 0, '20:00', '09:00', ?)
    `).run(WHISKER, ARI, "holiday", "2026-09-05T01:00:00.000Z"), /CHECK constraint/i);
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    sqlite.close();
  }
});

test("migration-backed writes survive a database reopen", async () => {
  const directory = mkdtempSync(join(tmpdir(), "meawketting-be1-"));
  const path = join(directory, "be1.sqlite");
  try {
    const first = fixture(path);
    const owner = await actor(first.application, OWNER);
    const created = await first.application.createBranch(owner, branchInput("รัชดา"), metadata("corr-durable"));
    first.sqlite.close();

    const reopened = new DatabaseSync(path);
    reopened.exec("PRAGMA foreign_keys = ON");
    const repository = new D1Be1Repository(new NodeD1Database(reopened));
    const durable = await repository.getBranch(WHISKER, created.id);
    assert.equal(durable?.name, "รัชดา");
    assert.deepEqual(durable?.enabledModules, ["grooming", "daycare"]);
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
