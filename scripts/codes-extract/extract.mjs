#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scanXsd } from "./lib/scan.mjs";
import { mergeTables, renderCodesJson } from "./lib/render.mjs";
import { parseAnexos, parseMoneda } from "./lib/aux-pdf.mjs";
import { buildAuxTables, mergeAuxiliary } from "./lib/aux-merge.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function fatal(message) {
  const error = new Error(message);
  error.codesExtractFatal = true;
  return error;
}

/**
 * Seam defaults point at the real implementations in lib/aux-*.mjs.
 * Tests inject stubs so the suite never spawns pdftotext nor reads the
 * vendored .rar/.xlsx. Imports are lazy: a seam is only resolved when it
 * will actually be used by the auxiliary step of the pipeline.
 */
export async function resolveSeams(seams = {}) {
  const runPdftotext = seams.runPdftotext ?? (await import("./lib/aux-pdf.mjs")).runPdftotext;
  const extractRar = seams.extractRar ?? (await import("./lib/aux-rar.mjs")).extractRar;
  const readXlsx = seams.readXlsx ?? (await import("./lib/aux-xlsx.mjs")).readXlsx;
  return { runPdftotext, extractRar, readXlsx };
}

export async function extractCodes({ schemasDir, seams = {}, stderr = process.stderr } = {}) {
  const dir = schemasDir
    ? resolve(schemasDir)
    : process.env.CODES_EXTRACT_SCHEMAS_DIR
      ? resolve(process.cwd(), process.env.CODES_EXTRACT_SCHEMAS_DIR)
      : join(root, "packages", "sdk", "schemas");
  const outPath = join(dir, "codes.json");

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  } catch (error) {
    throw fatal(
      error.code === "ENOENT"
        ? "falta packages/sdk/schemas/manifest.json"
        : `manifest.json inválido: ${error.message}`,
    );
  }

  if (typeof manifest.currentSet !== "string" || manifest.currentSet === "") {
    throw fatal("manifest.json sin currentSet");
  }

  const setDir = join(dir, manifest.currentSet);
  let setFiles;
  try {
    setFiles = readdirSync(setDir);
  } catch {
    throw fatal(
      `directorio del set vigente inexistente: packages/sdk/schemas/${manifest.currentSet}`,
    );
  }

  const xsdNames = setFiles.filter((name) => name.endsWith(".xsd")).sort();
  if (xsdNames.length === 0) {
    throw fatal(`sin archivos .xsd en packages/sdk/schemas/${manifest.currentSet}`);
  }

  const fileResults = [];
  for (const name of xsdNames) {
    const abs = join(setDir, name);
    const relPath = join(manifest.currentSet, name).replaceAll("\\", "/");
    let content;
    try {
      content = readFileSync(abs, "utf8");
    } catch (error) {
      throw fatal(`${relPath}: ilegible: ${error.message}`);
    }
    try {
      const { tables } = scanXsd(content, relPath);
      fileResults.push({ relPath, tables });
    } catch (error) {
      if (error.codesExtractFatal) throw error;
      throw fatal(`${relPath}: XML inválido: ${error.message}`);
    }
  }

  const { tables: xsTables, warnings: xsWarnings } = mergeTables(fileResults);

  const auxPaths = {
    anexos: join(manifest.currentSet, "ANEXOS Y ESTRUCTURAS_V4.4.pdf").replaceAll("\\", "/"),
    moneda: join(manifest.currentSet, "Codigodemoneda_V4.4.pdf").replaceAll("\\", "/"),
    ubicacion: join(manifest.currentSet, "Codificacionubicacion_V4.4.rar").replaceAll("\\", "/"),
  };
  const { runPdftotext, extractRar, readXlsx } = await resolveSeams(seams);

  const runPdf = (relPath) => {
    try {
      return runPdftotext(join(dir, relPath));
    } catch (error) {
      if (error.codesExtractFatal) throw error;
      throw fatal(`${relPath}: pdftotext falló: ${error.message}`);
    }
  };
  const anexos = parseAnexos(runPdf(auxPaths.anexos), auxPaths.anexos);
  const moneda = parseMoneda(runPdf(auxPaths.moneda), auxPaths.moneda);

  let rar;
  try {
    rar = await extractRar(join(dir, auxPaths.ubicacion));
  } catch (error) {
    if (error.codesExtractFatal) throw error;
    throw fatal(`${auxPaths.ubicacion}: ${error.message}`);
  }
  let ubicacion;
  try {
    ubicacion = await readXlsx(rar.xlsxPath);
  } catch (error) {
    if (error.codesExtractFatal) throw error;
    throw fatal(`${auxPaths.ubicacion}: ${error.message}`);
  } finally {
    rar.cleanup();
  }

  const auxTables = buildAuxTables({
    xsTables,
    anexos,
    moneda,
    ubicacion,
    paths: auxPaths,
  });
  const { tables, warnings: auxWarnings } = mergeAuxiliary({ xsTables, auxTables });

  for (const warning of [...xsWarnings, ...moneda.warnings, ...auxWarnings]) {
    stderr.write(`${warning}\n`);
  }

  const generatedFrom = [
    ...xsdNames.map((name) => join(manifest.currentSet, name).replaceAll("\\", "/")),
    auxPaths.anexos,
    auxPaths.moneda,
    auxPaths.ubicacion,
  ];
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

  return { currentSet: manifest.currentSet, generatedFrom, outPath };
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    await extractCodes();
  } catch (error) {
    process.stderr.write(`codes:extract: ${error.message}\n`);
    process.exit(1);
  }
}
