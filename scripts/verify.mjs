import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const env = { ...process.env };
// Default verification never enables live authentication or submission tests.
for (const key of ["HACIENDA_USERNAME", "HACIENDA_PASSWORD", "HACIENDA_SANDBOX_E2E"])
  delete env[key];
execFileSync("xmllint", ["--version"], { stdio: "ignore" });
for (const args of [
  ["format"],
  ["exec", "turbo", "run", "lint", "typecheck", "build", "test"],
  ["test:scripts"],
  ["test:packages"],
])
  execFileSync("pnpm", args, { cwd: root, env, stdio: "inherit" });
