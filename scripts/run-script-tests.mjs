import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
const root = resolve(import.meta.dirname, "..");
const tests = readdirSync(join(root, "scripts"))
  .filter((file) => file.endsWith(".test.mjs"))
  .sort()
  .map((file) => join(root, "scripts", file));
if (!tests.length) throw new Error("No script tests found.");
execFileSync(process.execPath, ["--test", ...tests], { cwd: root, stdio: "inherit" });
