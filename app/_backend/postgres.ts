import postgres, { type Sql } from "postgres";
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
  constructor(readonly sql: Sql, readonly schema = "public") {
    if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error("Invalid database schema");
  }
  prepare(query: string) { return new Statement(this, query); }
  async batch(statements: PreparedStatement[]): Promise<QueryResult[]> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.sql.begin("isolation level serializable", async tx => {
          await tx.unsafe(`SET LOCAL search_path TO "${this.schema}", pg_catalog`);
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
            const rows = await tx.unsafe(query, values as never[]);
            results.push({ success: true, results: [...rows], meta: { changes: rows.count } });
          }
          return results;
        }) as QueryResult[];
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (attempt >= 4 || (code !== "40001" && code !== "40P01")) throw error;
      }
    }
  }
  async close() { await this.sql.end({ timeout: 5 }); }
}

export function connectPostgres(url: string, schema = "public") {
  const parsed = new URL(url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  return new PostgresDatabase(postgres(url, { prepare: false, max: 4, idle_timeout: 5, connect_timeout: 10,
    ssl: local ? false : "verify-full", onnotice: () => {},
    types: { bigint: { to: 20, from: [20, 1700], serialize: String, parse: (value: string) => {
      const number = Number(value);
      if (!Number.isSafeInteger(number)) throw new Error("Unsafe database integer");
      return number;
    } } },
  }), schema);
}
