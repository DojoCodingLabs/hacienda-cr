import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createExtractorFromFile } from "node-unrar-js";

function fatal(message) {
  const error = new Error(message);
  error.codesExtractFatal = true;
  return error;
}

/**
 * Extracts the .xlsx from the vendored .rar into an mkdtemp directory
 * (never the repo). Returns { xlsxPath, cleanup }; the caller must call
 * cleanup() in a finally block. Missing archive or extractor failure is
 * a fatal error naming the file and the reason.
 */
export async function extractRar(rarPath) {
  const name = basename(rarPath);
  if (!existsSync(rarPath)) {
    throw fatal(`falta ${name}`);
  }

  const targetPath = mkdtempSync(join(tmpdir(), "codes-extract-rar-"));
  try {
    let extractor;
    try {
      extractor = await createExtractorFromFile({ filepath: rarPath, targetPath });
    } catch (error) {
      throw fatal(`${name}: descompresor falló: ${error.message}`);
    }

    let xlsxName;
    try {
      for (const header of extractor.getFileList().fileHeaders) {
        if (header.name.toLowerCase().endsWith(".xlsx") && !header.name.endsWith("/")) {
          xlsxName = header.name;
          break;
        }
      }
    } catch (error) {
      throw fatal(`${name}: ilegible como archivo RAR: ${error.message}`);
    }
    if (xlsxName === undefined) {
      throw fatal(`${name}: sin archivo .xlsx interno`);
    }

    try {
      for (const file of extractor.extract({ files: [xlsxName] }).files) {
        void file.fileHeader;
      }
    } catch (error) {
      throw fatal(`${name}: fallo al extraer ${xlsxName}: ${error.message}`);
    }

    const xlsxPath = join(targetPath, xlsxName);
    if (!existsSync(xlsxPath) || statSync(xlsxPath).size === 0) {
      throw fatal(`${name}: ${xlsxName} extraído vacío o ausente`);
    }

    return {
      xlsxPath,
      cleanup: () => rmSync(targetPath, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(targetPath, { recursive: true, force: true });
    throw error;
  }
}
