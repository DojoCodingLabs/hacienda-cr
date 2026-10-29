/**
 * Guarda anti-regresión: impide que reaparezcan casos esperados a fallar
 * (`it.fails(` / `test.fails(`) en la suite de specs.
 *
 * Uso: `node scripts/check-no-expected-failures.mjs`
 * Sale con código 1 si encuentra algún `.fails(` no exceptuado.
 *
 * Una línea se exceptúa cuando ella misma o la inmediatamente anterior
 * contienen `// allowed-fails`.
 */

import { glob } from "node:fs/promises";
import { readFile } from "node:fs/promises";

const ROOT = decodeURIComponent(new URL("..", import.meta.url).pathname);
const PATTERNS = [
  "packages/**/*.{spec,test}.{ts,mjs}",
  "shared/**/*.{spec,test}.{ts,mjs}",
  "scripts/**/*.test.mjs",
];
const FAILS_RE = /\b(it|test)\.fails\(/;
const ALLOWED_RE = /\/\/ allowed-fails/;

async function run() {
  const files = new Set();
  for (const pattern of PATTERNS) {
    for await (const file of glob(pattern, { cwd: ROOT })) {
      files.add(file);
    }
  }

  const offending = [];
  for (const file of [...files].sort()) {
    let content;
    try {
      content = await readFile(file, "utf-8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!FAILS_RE.test(lines[i])) continue;
      const sameLineAllowed = ALLOWED_RE.test(lines[i]);
      const prevLineAllowed = i > 0 && ALLOWED_RE.test(lines[i - 1]);
      if (!sameLineAllowed && !prevLineAllowed) {
        offending.push({ file, line: i + 1 });
      }
    }
  }

  if (offending.length > 0) {
    console.error(
      "check-no-expected-failures: se encontraron casos esperados a fallar (.fails) no exceptuados:",
    );
    for (const { file, line } of offending) {
      console.error(`  ${file}:${line}`);
    }
    console.error(
      "Si el caso es intencional, añade `// allowed-fails` en esa línea o en la anterior.",
    );
    return 1;
  }
  console.log("check-no-expected-failures: OK (sin .fails no exceptuados)");
  return 0;
}

void run().then((code) => process.exit(code));
