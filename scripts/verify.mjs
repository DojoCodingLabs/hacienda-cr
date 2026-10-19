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
  ["spec:verify"],
  ["exec", "turbo", "run", "lint", "typecheck", "build", "test"],
  // The exhaustive property pass: thousands of generated documents checked
  // against the XSD, the round-trip fixed point and the key round-trip. The
  // same suites run inside `turbo run test` with a small budget; this is the
  // CI-gated pass, and it needs neither credentials nor network.
  ["test:properties"],
  ["test:scripts"],
  ["test:packages"],
])
  execFileSync("pnpm", args, { cwd: root, env, stdio: "inherit" });
