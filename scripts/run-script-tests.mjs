import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
const root = resolve(import.meta.dirname, "..");
function collect(dir) {
  const tests = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) tests.push(...collect(full));
    else if (entry.name.endsWith(".test.mjs")) tests.push(full);
  }
  return tests;
}
const tests = collect(join(root, "scripts")).sort();
if (!tests.length) throw new Error("No script tests found.");
execFileSync(process.execPath, ["--test", ...tests], { cwd: root, stdio: "inherit" });
