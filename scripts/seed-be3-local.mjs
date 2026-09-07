import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(projectRoot, "scripts", "seed-be3-dev.sql");
const wranglerPath = resolve(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js");
const configPath = resolve(projectRoot, "wrangler.be1.jsonc");
const scratch = mkdtempSync(join(projectRoot, ".be3-seed-"));

if (dirname(scratch) !== projectRoot) throw new Error(`Unsafe BE3 seed scratch directory: ${scratch}`);

try {
  // Miniflare's SQLite compiler can exceed its compound-select limit when the
  // complete seed (including row triggers) is prepared as one import batch.
  // Every statement is INSERT OR IGNORE and ordered by FK dependency, so
  // executing one deterministic statement per local D1 call is retry-safe.
  const statements = readFileSync(sourcePath, "utf8")
    .replace(/^\s*--[^\r\n]*(?:\r?\n|$)/gmu, "")
    .split(/;\s*(?=(?:INSERT|WITH)\b)/iu)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => `${statement.replace(/;\s*$/u, "")};\n`);

  if (statements.length !== 10) {
    throw new Error(`Expected 10 deterministic BE3 seed statements, found ${statements.length}.`);
  }

  statements.forEach((statement, index) => {
    const chunkPath = resolve(scratch, `statement-${String(index + 1).padStart(2, "0")}.sql`);
    if (dirname(chunkPath) !== scratch) throw new Error(`Unsafe BE3 seed chunk path: ${chunkPath}`);
    writeFileSync(chunkPath, statement, "utf8");
    const result = spawnSync(process.execPath, [
      wranglerPath,
      "d1", "execute", "DB",
      "--local",
      "--config", configPath,
      "--file", chunkPath,
    ], { cwd: projectRoot, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`BE3 seed statement ${index + 1} failed with exit code ${result.status ?? "unknown"}.`);
  });
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
}
