import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { D1DatabaseAdapter } from "../app/_backend/d1";

export const projectRoot = resolve(import.meta.dirname, "..");
export class TestSql {
  readonly sqlite: DatabaseSync;
  onQuery?: (query: string) => void;
  constructor(file = ":memory:") { this.sqlite = new DatabaseSync(file); this.sqlite.exec("PRAGMA foreign_keys=ON"); }
  exec(query: string) { this.sqlite.exec(query); }
  prepare(query: string) {
    const statement = this.sqlite.prepare(query);
    return {
      all: (...values: unknown[]) => statement.all(...values as never[]).map(row => ({ ...row })),
      get: (...values: unknown[]) => { const row = statement.get(...values as never[]); return row ? { ...row } : undefined; },
      run: (...values: unknown[]) => statement.run(...values as never[]),
    };
  }
  close() { this.sqlite.close(); }
}

class LocalStatement {
  constructor(readonly db: TestSql, readonly query: string, readonly values: unknown[] = []) {}
  bind(...values: unknown[]) { return new LocalStatement(this.db, this.query, values); }
  execute(): D1Result {
    this.db.onQuery?.(this.query);
    const started = performance.now(), statement = this.db.sqlite.prepare(this.query);
    const rows = statement.all(...this.values as never[]).map(row => ({ ...row }));
    const changes = /^\s*(SELECT|WITH|EXPLAIN)\b/i.test(this.query) ? 0 : Number(this.db.prepare("SELECT changes() n").get()!.n);
    return { success: true, results: rows, meta: { changes, duration: performance.now() - started, last_row_id: 0, changed_db: changes > 0, size_after: 0, rows_read: rows.length, rows_written: changes } };
  }
  async first(column?: string) { const row = this.execute().results[0] as Record<string, unknown> | undefined; return row ? column ? row[column] : row : null; }
  async all() { return this.execute(); }
  async run() { return this.execute(); }
}

export function localBinding(inspect: TestSql): D1Database {
  return {
    prepare: (query: string) => new LocalStatement(inspect, query),
    batch: async (statements: LocalStatement[]) => {
      inspect.exec("BEGIN");
      try { const result = statements.map(statement => statement.execute()); inspect.exec("COMMIT"); return result; }
      catch (error) { inspect.exec("ROLLBACK"); throw error; }
    },
  } as unknown as D1Database;
}
export class TestD1 extends D1DatabaseAdapter {
  private closed = false;
  constructor(readonly inspect: TestSql, signal?: AbortSignal) { super(localBinding(inspect), signal); }
  set onQuery(observer: ((query: string) => void) | undefined) { this.inspect.onQuery = observer; }
  async close() { if (!this.closed) { this.inspect.close(); this.closed = true; } }
}
export function migrate(db: TestSql) {
  for (const file of readdirSync(resolve(projectRoot, "migrations/d1")).filter(file => file.endsWith(".sql")).sort()) {
    db.exec(readFileSync(resolve(projectRoot, "migrations/d1", file), "utf8"));
  }
}
