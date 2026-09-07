import { lstatSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const artifactPattern = /^\.be3-test-[A-Za-z0-9_-]+$/;

function cleanupDurabilityArtifacts() {
  for (const name of readdirSync(projectRoot)) {
    if (!artifactPattern.test(name)) continue;
    const target = resolve(projectRoot, name);
    if (dirname(target) !== projectRoot) throw new Error(`Unsafe BE3 test cleanup target: ${target}`);
    if (lstatSync(target).isSymbolicLink()) throw new Error(`Refusing to clean BE3 test symlink: ${target}`);
    rmSync(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
}

cleanupDurabilityArtifacts();
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", "tests/be3.test.ts"], {
  cwd: projectRoot,
  stdio: "inherit",
});
cleanupDurabilityArtifacts();

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
