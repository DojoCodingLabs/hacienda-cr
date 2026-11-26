/**
 * Guarda anti-regresión: impide que reaparezcan casos esperados a fallar
 * (`it.fails(` / `test.fails(`) en la suite de specs.
 *
 * Uso: `node scripts/check-no-expected-failures.mjs [--root <dir>]`
 * Sale con código 1 si encuentra algún `.fails(` no exceptuado o si no puede
 * leer un archivo de spec (un archivo ilegible no se omite en silencio).
 *
 * Una línea se exceptúa cuando ella misma o la inmediatamente anterior
 * contienen `// allowed-fails`.
 *
 * Recorre el árbol con `readdir` en lugar de `fs.promises.glob`, que sigue
 * siendo experimental en Node 22 (versión mínima del repositorio).
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

/** Directorios escaneados y el patrón de nombre de archivo de cada uno. */
const SCAN = [
  { dir: "packages", file: /\.(?:spec|test)\.(?:ts|mjs)$/ },
  { dir: "shared", file: /\.(?:spec|test)\.(?:ts|mjs)$/ },
  { dir: "scripts", file: /\.test\.mjs$/ },
];
const SKIP_DIRS = new Set(["node_modules", "dist", "coverage", ".turbo", ".git"]);
const FAILS_RE = /\b(it|test)\.fails\(/;
const ALLOWED_RE = /\/\/ allowed-fails/;

async function collect(root, dir, pattern, files) {
  let entries;
  try {
    entries = await readdir(join(root, dir), { withFileTypes: true });
  } catch (error) {
    // Un directorio raíz ausente (p. ej. en un árbol de prueba) no es un fallo.
    if (error?.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await collect(root, path, pattern, files);
    } else if (pattern.test(entry.name)) files.add(path.split(sep).join("/"));
  }
}

/**
 * Devuelve `{ offending, unreadable }` para el árbol en `root`.
 * Cada ruta es relativa a `root` y usa `/`.
 */
export async function findExpectedFailures(root) {
  const files = new Set();
  for (const { dir, file } of SCAN) await collect(root, dir, file, files);

  const offending = [];
  const unreadable = [];
  for (const file of [...files].sort()) {
    let content;
    try {
      content = await readFile(join(root, file), "utf-8");
    } catch (error) {
      unreadable.push({ file, reason: error instanceof Error ? error.message : String(error) });
      continue;
    }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!FAILS_RE.test(lines[i])) continue;
      const sameLineAllowed = ALLOWED_RE.test(lines[i]);
      const prevLineAllowed = i > 0 && ALLOWED_RE.test(lines[i - 1]);
      if (!sameLineAllowed && !prevLineAllowed) offending.push({ file, line: i + 1 });
    }
  }
  return { offending, unreadable, scanned: files.size };
}

async function main(argv) {
  const rootIndex = argv.indexOf("--root");
  const root =
    rootIndex < 0 ? resolve(import.meta.dirname, "..") : resolve(argv[rootIndex + 1] ?? ".");
  const { offending, unreadable, scanned } = await findExpectedFailures(root);

  if (unreadable.length > 0) {
    console.error("check-no-expected-failures: no se pudieron leer archivos de spec:");
    for (const { file, reason } of unreadable) console.error(`  ${file}: ${reason}`);
  }
  if (offending.length > 0) {
    console.error(
      "check-no-expected-failures: se encontraron casos esperados a fallar (.fails) no exceptuados:",
    );
    for (const { file, line } of offending) console.error(`  ${file}:${line}`);
    console.error(
      "Si el caso es intencional, añade `// allowed-fails` en esa línea o en la anterior.",
    );
  }
  if (unreadable.length > 0 || offending.length > 0) return 1;
  console.log(
    `check-no-expected-failures: OK (${String(scanned)} archivos, sin .fails no exceptuados; raíz ${relative(process.cwd(), root) || "."})`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2));
}
