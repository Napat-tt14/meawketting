import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { after } from "node:test";
import { connectPostgres, PostgresDatabase } from "../app/_backend/postgres";

export const projectRoot = resolve(import.meta.dirname, "..");
const testUrl = process.env.MEAWKETTING_TEST_DATABASE_URL;
if (!testUrl) throw new Error("Run through scripts/test-postgres.mjs with an isolated test database.");

/** Synchronous test inspection only. Runtime repositories use the async native driver. */
export class TestSql {
  readonly schema: string;
  constructor(key: string = randomUUID()) {
    this.schema = `test_${createHash("sha256").update(key === ":memory:" ? randomUUID() : key).digest("hex").slice(0, 24)}`;
  }
  exec(query: string) {
    const result = spawnSync(process.execPath, [resolve(projectRoot, "scripts/test-query.mjs")], {
      encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024,
      env: process.env, input: JSON.stringify({ query, schema: this.schema }),
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr.trim());
    return result.stdout.trim();
  }
  prepare(query: string) {
    const execute = (values: unknown[], rows: boolean) => {
      let index = 0;
      const bound = query.replace(/'(''|[^'])*'|\?/g, token => {
        if (token !== "?") return token;
        const value = values[index++];
        if (value === null) return "NULL";
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
        if (typeof value !== "string") throw new Error("Invalid test binding");
        return `'${value.replaceAll("'", "''")}'`;
      });
      return rows ? JSON.parse(this.exec(`SELECT coalesce(json_agg(q),'[]') FROM (${bound}) q`)) as Record<string, unknown>[] : this.exec(bound);
    };
    return {
      all: (...values: unknown[]) => execute(values, true) as Record<string, unknown>[],
      get: (...values: unknown[]) => (execute(values, true) as Record<string, unknown>[])[0],
      run: (...values: unknown[]) => execute(values, false),
    };
  }
  close() { /* Connections are per inspection command; schema lives until the runner drops its test database. */ }
}
export class TestPostgres extends PostgresDatabase {
  constructor(readonly inspect: TestSql) {
    const database = connectPostgres(testUrl!, inspect.schema);
    super(database.sql, inspect.schema);
    after(() => this.close());
  }
}
export function migrate(db: TestSql) {
  db.exec(`CREATE SCHEMA "${db.schema}"`);
  for (const f of readdirSync(resolve(projectRoot, "supabase/migrations")).filter(f => f.endsWith(".sql")).sort()) {
    db.exec(readFileSync(resolve(projectRoot, "supabase/migrations", f), "utf8"));
  }
}
