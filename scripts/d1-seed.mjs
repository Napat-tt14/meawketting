import { readFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// Synthetic fixtures always target the local D1 binding; this command cannot seed remote data.
await mkdir(resolve(".wrangler"), { recursive: true });
const directory = await mkdtemp(resolve(".wrangler/seed-"));
try {
  const files = ["seed-be1-dev.sql", "seed-be2-dev.sql", "seed-be3-dev.sql", "seed-execution-plans.sql", "seed-be4-dev.sql", "seed-be5-dev.sql", "seed-be6-dev.sql", "seed-be7-dev.sql"];
  const source = await Promise.all(files.map(file => readFile(`tests/fixtures/d1/${file}`, "utf8")));
  const file = resolve(directory, "fixtures.sql");
  await writeFile(file, source.join("\n"));
  const result = spawnSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "d1", "execute", "DB", "--local", "--config", "wrangler.d1.json", "--file", file], {
    stdio: "inherit", windowsHide: true, env: { ...process.env, WRANGLER_WRITE_LOGS: "false", WRANGLER_LOG_PATH: resolve(".wrangler/logs") },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Local D1 seed failed");
} finally { await rm(directory, { recursive: true, force: true }); }
