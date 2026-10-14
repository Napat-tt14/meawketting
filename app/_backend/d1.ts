import type { Database, PreparedStatement, QueryResult } from "./be1/repository";

export type D1Metrics = { statements: number; batches: number; duration: number; rpcDuration: number; reportedStatements: number; rowsRead: number; rowsWritten: number };

export function chunkIds<T>(ids: readonly T[], size = 80): T[][] {
  if (!Number.isInteger(size) || size < 1 || size > 100) throw new Error("Invalid D1 chunk size");
  return Array.from({ length: Math.ceil(ids.length / size) }, (_, i) => ids.slice(i * size, (i + 1) * size));
}

class Statement implements PreparedStatement {
  constructor(readonly db: D1DatabaseAdapter, readonly native: D1PreparedStatement, readonly readOnly: boolean, readonly query: string) {}
  bind(...values: unknown[]) {
    if (values.length > 100) throw new Error("D1 parameter limit exceeded");
    for (const value of values) {
      if (value !== null && typeof value !== "string" && !(typeof value === "number" && Number.isFinite(value))) throw new Error("Invalid D1 binding");
    }
    return new Statement(this.db, this.native.bind(...values), this.readOnly, this.query);
  }
  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    this.db.before(this.readOnly);
    this.db.metrics.statements++;
    const started = performance.now();
    try {
      const result = columnName === undefined ? await this.native.first<T>() : await this.native.first<T>(columnName);
      this.db.after(this.readOnly);
      return result;
    } finally { this.db.metrics.rpcDuration += performance.now() - started; }
  }
  async all<T = Record<string, unknown>>(): Promise<QueryResult<T>> {
    this.db.before(this.readOnly);
    this.db.metrics.statements++;
    const started = performance.now();
    try {
      const result = await this.native.all<T>();
      this.db.record(result);
      this.db.after(this.readOnly);
      return result;
    } finally { this.db.metrics.rpcDuration += performance.now() - started; }
  }
  async run<T = Record<string, unknown>>(): Promise<QueryResult<T>> {
    this.db.before(this.readOnly);
    this.db.metrics.statements++;
    const started = performance.now();
    try {
      const result = await this.native.run<T>();
      this.db.record(result);
      this.db.after(this.readOnly);
      return result;
    } finally { this.db.metrics.rpcDuration += performance.now() - started; }
  }
}

/** Native D1 statements and atomic batches; SQL remains SQLite at every caller. */
export class D1DatabaseAdapter implements Database {
  readonly metrics: D1Metrics = { statements: 0, batches: 0, duration: 0, rpcDuration: 0, reportedStatements: 0, rowsRead: 0, rowsWritten: 0 };
  private mutationStarted = false;
  constructor(readonly binding: D1Database, private readonly signal?: AbortSignal) {}
  prepare(query: string) {
    const readOnly = /^\s*(SELECT|WITH|EXPLAIN)\b/i.test(query) && !/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(query.replace(/'(''|[^'])*'/g, ""));
    return new Statement(this, this.binding.prepare(query), readOnly, query);
  }
  before(readOnly: boolean) {
    if (!this.mutationStarted) this.signal?.throwIfAborted();
    // Once submitted, a write and its receipt acknowledgement must survive browser disconnects.
    if (!readOnly) this.mutationStarted = true;
  }
  after(readOnly: boolean) { if (readOnly && !this.mutationStarted) this.signal?.throwIfAborted(); }
  record(result: D1Result) {
    this.metrics.reportedStatements++;
    this.metrics.duration += result.meta?.duration ?? 0;
    this.metrics.rowsRead += result.meta?.rows_read ?? 0;
    this.metrics.rowsWritten += result.meta?.rows_written ?? 0;
  }
  async batch(statements: PreparedStatement[]): Promise<QueryResult[]> {
    if (!statements.length) return [];
    const native = statements.map(statement => {
      if (!(statement instanceof Statement) || statement.db !== this) throw new Error("Foreign D1 statement");
      return statement;
    });
    const readOnly = native.every(statement => statement.readOnly);
    this.before(readOnly);
    this.metrics.batches++;
    this.metrics.statements += native.length;
    const started = performance.now();
    try {
      const results = await this.binding.batch<Record<string, unknown>>(native.map(statement => statement.native));
      results.forEach(result => this.record(result));
      this.after(readOnly);
      return results;
    } finally { this.metrics.rpcDuration += performance.now() - started; }
  }
}
