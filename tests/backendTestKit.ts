import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { D1DatabaseLike, D1PreparedStatementLike, D1ResultLike } from "../app/_backend/be1/repository";

export const projectRoot = resolve(import.meta.dirname, "..");
class Statement implements D1PreparedStatementLike {
  constructor(readonly db: DatabaseSync, readonly sql: string, readonly values: SQLInputValue[] = []) {}
  bind(...values: unknown[]) { return new Statement(this.db, this.sql, values as SQLInputValue[]); }
  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const result = this.db.prepare(this.sql).get(...this.values);
    return result ? (columnName ? result[columnName] : result) as T : null;
  }
  async all<T = Record<string, unknown>>(): Promise<D1ResultLike<T>> { return { success: true, results: this.db.prepare(this.sql).all(...this.values) as T[] }; }
  async run<T = Record<string, unknown>>(): Promise<D1ResultLike<T>> { return { success: true, results: [], meta: { changes: Number(this.db.prepare(this.sql).run(...this.values).changes) } }; }
}

/** D1 batches serialize writes; application reads can still race before CAS. */
export class TestD1 implements D1DatabaseLike {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly sqlite: DatabaseSync) {}
  prepare(sql: string) { return new Statement(this.sqlite, sql); }
  async batch(statements: D1PreparedStatementLike[]) {
    const result = this.queue.then(async () => {
      this.sqlite.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const statement of statements) results.push(statement instanceof Statement && /^\s*(SELECT|WITH)\b/i.test(statement.sql) ? await statement.all() : await statement.run());
        this.sqlite.exec("COMMIT");
        return results;
      } catch (error) { this.sqlite.exec("ROLLBACK"); throw error; }
    });
    this.queue = result.catch(() => undefined);
    return result;
  }
}

export function migrate(sqlite: DatabaseSync) {
  sqlite.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync(resolve(projectRoot, "drizzle")).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(resolve(projectRoot, "drizzle", file), "utf8"));
}
export function seededDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  migrate(sqlite);
  for (const phase of [1, 2, 3, 4]) sqlite.exec(readFileSync(resolve(projectRoot, "scripts", `seed-be${phase}-dev.sql`), "utf8"));
  return new TestD1(sqlite);
}
export const OWNER = "prs_01k47meawketting000000001", MANAGER = "prs_01k47meawketting000000002", STAFF = "prs_01k47meawketting000000003", INACTIVE = "prs_01k47meawketting000000004", OUTSIDER = "prs_01k47meawketting000000005";
export const WHISKER = "business-whisker-rest", PAW = "business-paw-partner", ARI = "whisker-ari", THONGLOR = "whisker-thonglor", ONNUT = "partner-onnut";
export function metadata() { const requestId = `req_${crypto.randomUUID()}`; return { requestId, correlationId: requestId, receivedAt: "2026-08-20T04:00:00.000Z" }; }
