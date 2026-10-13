#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { loadManifest } from "./lib/manifest.mjs";
import { runUpdate } from "./lib/update-core.mjs";

function parseArgs(argv) {
  const options = { set: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--set") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--"))
        throw new Error("spec:update: --set requiere un id");
      options.set = value;
      index += 1;
    } else {
      throw new Error(`spec:update: argumento no reconocido: ${arg}`);
    }
  }
  return options;
}

const override = process.env.SPEC_WATCH_SCHEMAS_DIR;
const schemasDir = override
  ? resolve(process.cwd(), override)
  : resolve(import.meta.dirname, "..", "..", "packages", "sdk", "schemas");

const options = parseArgs(process.argv.slice(2));
const manifest = loadManifest(schemasDir);

const result = await runUpdate({
  manifest,
  schemasDir,
  setFlag: options.set,
  verifyFn: () => {
    execFileSync(process.execPath, [resolve(import.meta.dirname, "..", "spec-verify.mjs")], {
      env: { ...process.env, SPEC_VERIFY_SCHEMAS_DIR: schemasDir },
      stdio: "inherit",
    });
  },
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.code);
