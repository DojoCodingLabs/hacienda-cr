/**
 * Generador de los catálogos TypeScript de `shared/src/generated/` a partir
 * de `packages/sdk/schemas/codes.json` (cambio add-codes-generation, D3–D5).
 *
 * Modos:
 * - completo (default): invoca `scripts/codes-extract/extract.mjs` y luego
 *   genera; una extracción fallida termina sin escribir nada.
 * - `--no-extract`: lee el `codes.json` commiteado sin extraer (tolerante a
 *   la ausencia de `pdftotext`); es el modo del candado de `verify`.
 *
 * Contratos (specs/codes-generation):
 * - R2: cabecera `NO EDITAR` como primera línea de cada archivo generado.
 * - R3: paridad código↔clave en ambos sentidos contra la unión de las
 *   `tableKeys` declaradas; cualquier desajuste nombra tabla y código y
 *   termina con código ≠ 0.
 * - R6: la escritura ocurre solo tras renderizar y formatear con éxito.
 * - R7: `names.json` opcional; si existe, los exports que declaran
 *   `namesFrom` generan `*_NAMES` y faltan nombres → fallo nombrando tabla
 *   y código; si no existe, el informe lista lo pendiente con exit 0.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { TABLE_MAP } from "./table-map.mjs";

const root = join(import.meta.dirname, "../..");

const HEADER =
  "// NO EDITAR — generado por `pnpm spec:generate` desde packages/sdk/schemas/codes.json" +
  " y scripts/codes-generate/table-map.mjs; las ediciones manuales se pierden y las detecta el candado de verify.";

export const DEFAULT_PATHS = {
  codesPath: join(root, "packages/sdk/schemas/codes.json"),
  namesPath: join(root, "packages/sdk/schemas/names.json"),
  outDir: join(root, "shared/src/generated"),
  extractPath: join(root, "scripts/codes-extract/extract.mjs"),
};

/** `PaymentMethod` → `PAYMENT_METHOD`; `UNITS_OF_MEASURE` → `UNITS_OF_MEASURE`. */
function namesConstName(exportName) {
  return `${exportName.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase()}_NAMES`;
}

/** Texto seguro para una línea JSDoc: colapsa espacios y neutraliza el cierre. */
function docLine(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/\*\//g, "* /")
    .trim();
}

/** Unión de códigos de las tablas declaradas (primera descripción gana). */
function unionCodes(tables, entry) {
  const union = new Map();
  for (const tableKey of entry.tableKeys) {
    const table = tables.get(tableKey);
    if (!table)
      throw new Error(
        `table-map: tableKey inexistente en codes.json: ${JSON.stringify(tableKey)} (export ${entry.exportName})`,
      );
    for (const value of table.values ?? []) {
      if (!union.has(value.code)) union.set(value.code, value.description ?? "");
    }
  }
  if (union.size === 0)
    throw new Error(
      `table-map: sin códigos la(s) tabla(s) ${entry.tableKeys.join(", ")} (export ${entry.exportName})`,
    );
  return union;
}

/** Tabla (de las declaradas) que contiene el código, para mensajes. */
function owningTable(entry, code) {
  return entry.tableKeys.join(" / ");
}

function renderObject(entry, union) {
  const lines = [HEADER, "", `export const ${entry.exportName} = {`];
  for (const [code, description] of union) {
    const key = entry.keys[code];
    const doc = docLine(description);
    if (doc) lines.push(`  /** ${doc} */`);
    lines.push(`  ${key}: ${JSON.stringify(code)},`);
  }
  lines.push(
    "} as const;",
    "",
    `export type ${entry.exportName} = (typeof ${entry.exportName})[keyof typeof ${entry.exportName}];`,
    "",
  );
  return lines.join("\n");
}

function renderArray(entry, union) {
  const lines = [HEADER, "", `export const ${entry.exportName} = [`];
  for (const code of union.keys()) lines.push(`  ${JSON.stringify(code)},`);
  lines.push("] as const;");
  // emitType: false → el tipo lo re-deriva constants/ cuando una const
  // curada comparte el nombre (p. ej. CurrencyCode accessors).
  if (entry.emitType !== false)
    lines.push("", `export type ${entry.keyType} = (typeof ${entry.exportName})[number];`);
  lines.push("");
  return lines.join("\n");
}

function renderNames(entry, union, names) {
  const table = names[entry.exportName];
  if (table === undefined || table === null || typeof table !== "object")
    throw new Error(`names.json: falta la tabla de nombres de ${entry.exportName}`);
  const missing = [...union.keys()].filter(
    (code) => typeof table[code] !== "string" || table[code].trim() === "",
  );
  if (missing.length)
    throw new Error(
      `names.json: falta nombre legible para ${entry.exportName} en ${owningTable(entry, missing[0])}: ` +
        missing.map((code) => JSON.stringify(code)).join(", "),
    );
  const constName = namesConstName(entry.exportName);
  const recordType = entry.shape === "object" ? entry.exportName : entry.keyType;
  const lines = ["", `export const ${constName}: Record<${recordType}, string> = {`];
  for (const [code, name] of union) {
    const key =
      entry.shape === "object" ? `[${entry.exportName}.${entry.keys[code]}]` : JSON.stringify(code);
    lines.push(`  ${key}: ${JSON.stringify(table[code])},`);
  }
  lines.push("} as const;");
  return lines.join("\n");
}

/**
 * Genera los catálogos. Devuelve el informe; lanza Error con mensaje claro
 * (el CLI lo atribuye a `spec:generate`) sin haber escrito nada.
 */
export async function generate({
  noExtract = false,
  codesPath = DEFAULT_PATHS.codesPath,
  namesPath = DEFAULT_PATHS.namesPath,
  outDir = DEFAULT_PATHS.outDir,
  extractPath = DEFAULT_PATHS.extractPath,
  tableMap = TABLE_MAP,
  env = process.env,
} = {}) {
  if (!noExtract) {
    const run = spawnSync(process.execPath, [extractPath], { stdio: "inherit", env });
    if (run.status !== 0)
      throw new Error(
        `la extracción (codes:extract) falló con estado ${run.status ?? "señal"} — nada se escribió`,
      );
  }

  let codes;
  try {
    codes = JSON.parse(readFileSync(codesPath, "utf8"));
  } catch (error) {
    throw new Error(`no se pudo leer el catálogo ${codesPath}: ${error.message}`);
  }
  const tables = new Map((codes.tables ?? []).map((table) => [table.key, table]));

  let names = null;
  if (existsSync(namesPath)) {
    try {
      names = JSON.parse(readFileSync(namesPath, "utf8"));
    } catch (error) {
      throw new Error(`no se pudo leer ${namesPath}: ${error.message}`);
    }
  }

  const rendered = new Map();
  let unionCount = 0;
  for (const entry of tableMap) {
    if (entry.shape !== "object" && entry.shape !== "array")
      throw new Error(
        `table-map: shape desconocido ${JSON.stringify(entry.shape)} (export ${entry.exportName})`,
      );
    const union = unionCodes(tables, entry);
    let body;
    if (entry.shape === "object") {
      const missingKeys = [...union.keys()].filter((code) => !(code in entry.keys));
      if (missingKeys.length)
        throw new Error(
          `paridad: ${entry.tableKeys.join(" / ")}: código(s) sin clave en table-map para ${entry.exportName}: ` +
            `${missingKeys.map((code) => JSON.stringify(code)).join(", ")} — revisar el nombre (nunca inventarlo)`,
        );
      const strayKeys = Object.keys(entry.keys).filter((code) => !union.has(code));
      if (strayKeys.length)
        throw new Error(
          `paridad: table-map declara clave(s) sin código en codes.json para ${entry.exportName}: ` +
            `${strayKeys.map((code) => JSON.stringify(code)).join(", ")}`,
        );
      body = renderObject(entry, union);
    } else {
      body = renderArray(entry, union);
    }
    if (entry.namesFrom && names) body += `\n${renderNames(entry, union, names)}`;
    rendered.set(
      `${entry.exportName
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/_/g, "-")
        .toLowerCase()}.ts`,
      body,
    );
    unionCount += union.size;
  }

  const barrel = [HEADER, ""];
  for (const file of [...rendered.keys()].sort())
    barrel.push(`export * from "./${file.replace(/\.ts$/, ".js")}";`);
  barrel.push("");
  rendered.set("index.ts", barrel.join("\n"));

  // R6: formatear todo en memoria antes de la primera escritura.
  const formatted = new Map();
  for (const [file, source] of rendered) {
    const path = join(outDir, file);
    const config = (await resolveConfig(path)) ?? {};
    formatted.set(file, await format(source, { ...config, filepath: path }));
  }
  mkdirSync(outDir, { recursive: true });
  for (const [file, source] of formatted) writeFileSync(join(outDir, file), source);
  for (const file of readdirSync(outDir)) {
    // poda de archivos huérfanos de generaciones previas
    if (file.endsWith(".ts") && !formatted.has(file)) rmSync(join(outDir, file));
  }

  const pairedTables = new Set(tableMap.flatMap((entry) => entry.tableKeys));
  return {
    written: formatted.size,
    pairs: unionCount,
    unpaired: codes.tables
      .filter((table) => !pairedTables.has(table.key))
      .map((table) => table.key),
    pendingNames: tableMap
      .filter((entry) => !entry.namesFrom || !names)
      .map((entry) => entry.exportName),
    namesPath: names ? namesPath : null,
  };
}

function printReport(report) {
  console.log(
    `spec:generate: escritos ${report.written} archivos (${report.pairs} pares) en shared/src/generated/`,
  );
  if (report.unpaired.length)
    console.log(
      `spec:generate: informe — ${report.unpaired.length} tabla(s) de codes.json sin pareja (documentado en table-map.mjs):\n  ${report.unpaired.join("\n  ")}`,
    );
  if (report.pendingNames.length)
    console.log(
      `spec:generate: informe — ${report.pendingNames.length} export(s) pendientes de nombre legible (sin names.json): ${report.pendingNames.join(", ")}`,
    );
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const args = process.argv.slice(2).filter((arg) => arg !== "--"); // pnpm reenvía el separador literal
  const unknown = args.filter((arg) => arg !== "--no-extract");
  if (unknown.length) {
    console.error(
      `spec:generate falló: argumento(s) desconocido(s): ${unknown.join(" ")} (uso: --no-extract)`,
    );
    process.exit(2);
  }
  try {
    printReport(await generate({ noExtract: args.includes("--no-extract") }));
  } catch (error) {
    console.error(`spec:generate falló: ${error.message}`);
    process.exit(1);
  }
}
