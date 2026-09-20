import EmbeddedPostgres from "embedded-postgres";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";

// This runner only creates/deletes its own named test database in its own cluster.
mkdirSync("work", { recursive: true });
const probe = createServer();
await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const password = randomUUID();
const pg = new EmbeddedPostgres({ databaseDir: resolve("work", `pg-${randomUUID()}`), user: "postgres", password,
  port, persistent: true, initdbFlags: ["--locale=C", "--encoding=UTF8"], postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: console.error });
await pg.initialise();
await pg.start();
const database = `test_${randomUUID().replaceAll("-", "")}`;
try {
  await pg.createDatabase(database);
  const files = process.argv.slice(2);
  const child = spawn(process.execPath, ["--import", "tsx", "--test", ...(files.length ? files : Array.from({length: 8}, (_,i) => `tests/be${i+1}.test.ts`))], {
    stdio: "inherit", windowsHide: true, env: { ...process.env,
      MEAWKETTING_TEST_DATABASE_URL: `postgres://postgres:${password}@127.0.0.1:${port}/${database}` },
  });
  process.exitCode = await new Promise((resolve, reject) => { child.on("exit", resolve); child.on("error", reject); });
} finally { await pg.dropDatabase(database); await pg.stop(); }
process.exit(process.exitCode ?? 0);
