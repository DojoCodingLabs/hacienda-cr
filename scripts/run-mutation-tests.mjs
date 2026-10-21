import { MUTATION_FLOORS } from "./verify-mutation-report.mjs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const cwd = resolve(import.meta.dirname, "..");
const env = { ...process.env };
for (const key of ["HACIENDA_USERNAME", "HACIENDA_PASSWORD", "HACIENDA_SANDBOX_E2E"])
  delete env[key];
const scope = process.env.MUTATION_FILE;
if (scope !== undefined && !Object.hasOwn(MUTATION_FLOORS, scope))
  throw new Error("Unknown mutation scope");
const args = [
  "--filter",
  "@dojocoding/hacienda-sdk",
  "test:mutation",
  ...(scope ? ["--mutate", scope] : []),
];
execFileSync("pnpm", args, {
  cwd,
  env,
  stdio: "inherit",
  timeout: 60 * 60 * 1000,
});
execFileSync(
  process.execPath,
  [
    resolve(import.meta.dirname, "verify-mutation-report.mjs"),
    resolve(cwd, "packages/sdk/reports/mutation/mutation.json"),
    ...(scope ? [scope] : []),
  ],
  {
    cwd,
    env,
    stdio: "inherit",
  },
);
