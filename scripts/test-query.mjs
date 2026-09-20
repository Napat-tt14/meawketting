// Synchronous test inspection bridge, executed in a child process (never in Worker).
import postgres from "postgres";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const { query, schema } = JSON.parse(input);
if (!/^test_[a-f0-9]{24}$/.test(schema)) throw Error("Invalid test schema");
const sql = postgres(process.env.MEAWKETTING_TEST_DATABASE_URL, { max: 1, onnotice: () => {}, connection: { search_path: `${schema},pg_catalog` } });
try {
  const rows = await sql.unsafe(query).simple();
  if (query.startsWith("SELECT coalesce(json_agg(q)")) process.stdout.write(JSON.stringify(rows[0].coalesce));
} catch (error) { process.stderr.write(error.message); process.exitCode = 1; }
finally { await sql.end(); }
