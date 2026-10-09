#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scanXsd } from "./lib/scan.mjs";
import { mergeTables, renderCodesJson } from "./lib/render.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const schemasDir = process.env.CODES_EXTRACT_SCHEMAS_DIR
  ? resolve(process.cwd(), process.env.CODES_EXTRACT_SCHEMAS_DIR)
  : join(root, "packages", "sdk", "schemas");
const outPath = join(schemasDir, "codes.json");

function fatal(message) {
  process.stderr.write(`codes:extract: ${message}\n`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(schemasDir, "manifest.json"), "utf8"));
} catch (error) {
  fatal(
    error.code === "ENOENT"
      ? "falta packages/sdk/schemas/manifest.json"
      : `manifest.json inválido: ${error.message}`,
  );
}

if (typeof manifest.currentSet !== "string" || manifest.currentSet === "") {
  fatal("manifest.json sin currentSet");
}

const setDir = join(schemasDir, manifest.currentSet);
let setFiles;
try {
  setFiles = readdirSync(setDir);
} catch {
  fatal(`directorio del set vigente inexistente: packages/sdk/schemas/${manifest.currentSet}`);
}

const xsdNames = setFiles.filter((name) => name.endsWith(".xsd")).sort();
if (xsdNames.length === 0) {
  fatal(`sin archivos .xsd en packages/sdk/schemas/${manifest.currentSet}`);
}

const fileResults = [];
for (const name of xsdNames) {
  const abs = join(setDir, name);
  const relPath = join(manifest.currentSet, name).replaceAll("\\", "/");
  let content;
  try {
    content = readFileSync(abs, "utf8");
  } catch (error) {
    fatal(`${relPath}: ilegible: ${error.message}`);
  }
  try {
    const { tables } = scanXsd(content, relPath);
    fileResults.push({ relPath, tables });
  } catch (error) {
    if (error.codesExtractFatal) fatal(error.message);
    fatal(`${relPath}: XML inválido: ${error.message}`);
  }
}

const { tables, warnings } = mergeTables(fileResults);
for (const warning of warnings) {
  process.stderr.write(`${warning}\n`);
}

const generatedFrom = xsdNames.map((name) => join(manifest.currentSet, name).replaceAll("\\", "/"));
const output = renderCodesJson({
  currentSet: manifest.currentSet,
  generatedFrom,
  tables,
});

const tmpFile = `${outPath}.tmp-${process.pid}`;
try {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(tmpFile, output);
  renameSync(tmpFile, outPath);
} catch (error) {
  rmSync(tmpFile, { force: true });
  throw error;
}
