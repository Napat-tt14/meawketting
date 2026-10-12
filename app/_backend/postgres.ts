import postgres, { type Sql, type TransactionSql } from "postgres";
import type { Database, PreparedStatement, QueryResult } from "./be1/repository";

/** All statements are parameterized; no SQL dialect translation occurs here. */
class Statement implements PreparedStatement {
  constructor(readonly db: PostgresDatabase, readonly query: string, readonly values: unknown[] = []) {}
  bind(...values: unknown[]) { return new Statement(this.db, this.query, values); }
  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const row = (await this.all<Record<string, unknown>>()).results?.[0];
    return row ? (columnName ? row[columnName] : row) as T : null;
  }
  async all<T = Record<string, unknown>>(): Promise<QueryResult<T>> { return (await this.db.batch([this]))[0] as QueryResult<T>; }
  async run<T = Record<string, unknown>>(): Promise<QueryResult<T>> { return this.all<T>(); }
}

export class PostgresDatabase implements Database {
  private mutationStarted = false;
  constructor(readonly sql: Sql, readonly schema = "public", readonly prepared = false, readonly signal?: AbortSignal,
    private readonly cancelRead?: (pid: number) => Promise<unknown>) {
    if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error("Invalid database schema");
  }
  prepare(query: string) { return new Statement(this, query); }
  async configureTransaction(tx: TransactionSql, readOnly = false) {
    if (!readOnly) this.mutationStarted = true;
    await tx.unsafe(`SET LOCAL search_path TO "${this.schema}", pg_catalog`);
    const settings = await tx.unsafe(`SELECT pg_backend_pid() pid,
      set_config('statement_timeout', CASE WHEN current_setting('statement_timeout')::interval='0'::interval THEN $1::text ELSE (extract(epoch FROM least(current_setting('statement_timeout')::interval,$1::text::interval))*1000)::bigint::text END,true),
      set_config('lock_timeout', CASE WHEN current_setting('lock_timeout')::interval='0'::interval THEN $2::text ELSE (extract(epoch FROM least(current_setting('lock_timeout')::interval,$2::text::interval))*1000)::bigint::text END,true)`,
      [readOnly ? "10s" : "30s", readOnly ? "2s" : "5s"]);
    return Number(settings[0].pid);
  }
  async batch(statements: PreparedStatement[]): Promise<QueryResult[]> {
    const readOnly = statements.every(statement => statement instanceof Statement && /^\s*(SELECT|WITH)\b/i.test(statement.query)
      && !/\b(INSERT|UPDATE|DELETE|MERGE|CALL|FOR\s+UPDATE)\b/i.test(statement.query.replace(/'(''|[^'])*'/g, "")));
    // Once a write can commit, disconnects must not cancel its receipt/acknowledgement path.
    if (!readOnly) this.mutationStarted = true;
    const signal = readOnly && !this.mutationStarted ? this.signal : undefined;
    signal?.throwIfAborted();
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.sql.begin(`isolation level serializable${readOnly ? " read only" : ""}`, async tx => {
          signal?.throwIfAborted();
          const pid = await this.configureTransaction(tx, readOnly);
          const results: QueryResult[] = [];
          for (const statement of statements) {
            if (!(statement instanceof Statement) || statement.db !== this) throw new Error("Foreign statement");
            let parameter = 0;
            const values = [...statement.values];
            // Named batch parameter replaces implicit connection state: always
            // the preceding command's affected row count, scoped to this transaction.
            const query = statement.query.replace(/'(''|[^'])*'|\?|:previous_row_count/g, token => {
              if (token === "?") return `$${++parameter}`;
              if (token === ":previous_row_count") {
                values.push(results.at(-1)?.meta?.changes ?? 0);
                return `$${values.length}`;
              }
              return token;
            });
            signal?.throwIfAborted();
            const pending = tx.unsafe(query, values as never[], { prepare: this.prepared });
            let cancellation: Promise<unknown> | undefined;
            const cancel = () => { cancellation ??= this.cancelRead?.(pid).catch(() => undefined); };
            signal?.addEventListener("abort", cancel, { once: true });
            try {
              const rows = await pending;
              signal?.throwIfAborted();
              results.push({ success: true, results: [...rows], meta: { changes: rows.count } });
            } finally {
              signal?.removeEventListener("abort", cancel);
              // Keep this transaction reserved until cancellation completes, so it cannot hit a pooled connection's next write.
              await cancellation;
            }
          }
          return results;
        }) as QueryResult[];
      } catch (error) {
        signal?.throwIfAborted();
        const code = (error as { code?: string }).code;
        if (attempt >= 4 || (code !== "40001" && code !== "40P01")) throw error;
      }
    }
  }
  async close() { await this.sql.end({ timeout: 5 }); }
}

export function connectPostgres(url: string, schema = "public", hyperdrive = false, signal?: AbortSignal) {
  const parsed = new URL(url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  const createSql = () => postgres(url, { prepare: hyperdrive, fetch_types: !hyperdrive, max: 1, idle_timeout: 5, connect_timeout: 10,
    // Hyperdrive's internal socket terminates TLS at the platform binding; its
    // origin is configured separately with the Supabase CA and verify-full.
    ssl: local || hyperdrive ? false : "verify-full", onnotice: () => {},
    types: { bigint: { to: 20, from: [20, 1700], serialize: String, parse: (value: string) => {
      const number = Number(value);
      if (!Number.isSafeInteger(number)) throw new Error("Unsafe database integer");
      return number;
    } } },
  });
  return new PostgresDatabase(createSql(), schema, hyperdrive, signal, async pid => {
    const cancellation = createSql();
    try { return await cancellation.unsafe("SELECT pg_cancel_backend($1)", [pid]); }
    finally { await cancellation.end({ timeout: 1 }); }
  });
}
