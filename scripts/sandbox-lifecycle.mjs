import { execFileSync } from "node:child_process";
if (process.env.HACIENDA_SANDBOX_E2E !== "1")
  throw new Error("Explicitly set HACIENDA_SANDBOX_E2E=1 to authorize a real sandbox submission.");
for (const name of [
  "HACIENDA_USERNAME",
  "HACIENDA_PASSWORD",
  "HACIENDA_P12_PATH",
  "HACIENDA_P12_PIN",
  "HACIENDA_SANDBOX_INVOICE",
])
  if (!process.env[name]) throw new Error(`Missing sandbox test variable: ${name}`);
execFileSync("pnpm", ["build"], { stdio: "inherit" });
execFileSync(
  "pnpm",
  ["--filter", "@dojocoding/hacienda-sdk", "exec", "vitest", "run", "src/api/e2e-pipeline.spec.ts"],
  { stdio: "inherit" },
);
