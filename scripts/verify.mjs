import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const env = { ...process.env };
// Default verification never enables live authentication or submission tests.
for (const key of ["HACIENDA_USERNAME", "HACIENDA_PASSWORD", "HACIENDA_SANDBOX_E2E"])
  delete env[key];
execFileSync("xmllint", ["--version"], { stdio: "ignore" });
for (const args of [["format"], ["spec:verify"]])
  execFileSync("pnpm", args, { cwd: root, env, stdio: "inherit" });

// Candado de catálogos (add-codes-generation, D7): regenera los catálogos
// desde codes.json en modo sin extraer y exige que el commiteado no tenga
// drift. Un fallo del paso de generación se distingue del diff.
try {
  execFileSync("pnpm", ["spec:generate", "--", "--no-extract"], {
    cwd: root,
    env,
    stdio: "inherit",
  });
} catch {
  console.error(
    "verify: la generación de catálogos falló (spec:generate); no se ejecuta el diff de shared/src/generated.",
  );
  process.exit(1);
}
try {
  execFileSync("git", ["diff", "--exit-code", "--", "shared/src/generated"], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  const untracked = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard", "--", "shared/src/generated"],
    { cwd: root, env, encoding: "utf8" },
  ).trim();
  if (untracked) {
    console.error(`verify: catálogos generados sin commitear:\n${untracked}`);
    throw new Error("drift");
  }
} catch {
  console.error(
    "verify: la regeneración produjo diff en shared/src/generated — ejecuta `pnpm spec:generate` y commitea el resultado.",
  );
  process.exit(1);
}

for (const args of [
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
