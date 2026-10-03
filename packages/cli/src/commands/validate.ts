/**
 * `hacienda validate` command.
 *
 * Validates invoice files against schemas and business rules.
 * Supports both JSON (Zod schema + business rules) and XML
 * (structural validation of root element and required fields).
 *
 * @module commands/validate
 */

import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { defineCommand } from "citty";
import { FacturaElectronicaSchema } from "@dojocoding/hacienda-shared";
import { validateFacturaInput, validateDocumentXml } from "@dojocoding/hacienda-sdk";
import { success, error, info, outputJson } from "../utils/format.js";

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

export const validateCommand = defineCommand({
  meta: {
    name: "validate",
    description: "Validate an invoice file (JSON or XML) against schemas",
  },
  args: {
    file: {
      type: "positional",
      description: "Path to JSON or XML invoice file",
      required: true,
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const filePath = resolve(args.file);
      const ext = extname(filePath).toLowerCase();

      // Read file
      let fileContent: string;
      try {
        fileContent = await readFile(filePath, "utf-8");
      } catch {
        error(`Cannot read file: ${filePath}`);
        process.exitCode = 1;
        return;
      }

      // Route by file extension
      if (ext === ".xml") {
        await validateXml(fileContent, filePath, args.json);
      } else {
        await validateJson(fileContent, filePath, args.json);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      if (args.json) {
        outputJson({ valid: false, error: message });
      } else {
        error(`Validation error: ${message}`);
      }
      process.exitCode = 1;
    }
  },
});

// ---------------------------------------------------------------------------
// JSON validation
// ---------------------------------------------------------------------------

async function validateJson(
  fileContent: string,
  filePath: string,
  jsonOutput: boolean,
): Promise<void> {
  let invoiceData: unknown;
  try {
    invoiceData = JSON.parse(fileContent);
  } catch {
    error("Invalid JSON in the input file.");
    process.exitCode = 1;
    return;
  }

  // Zod validation
  const zodResult = FacturaElectronicaSchema.safeParse(invoiceData);
  if (!zodResult.success) {
    const issues = zodResult.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    if (jsonOutput) {
      outputJson({ valid: false, stage: "schema", issues });
    } else {
      error("Schema validation failed:");
      for (const issue of issues) {
        console.log(`  - ${issue.path}: ${issue.message}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  // SDK business-rule validation
  const sdkResult = validateFacturaInput(zodResult.data);
  if (!sdkResult.valid) {
    if (jsonOutput) {
      outputJson({
        valid: false,
        stage: "business-rules",
        issues: sdkResult.errors,
      });
    } else {
      error("Business rule validation failed:");
      for (const err of sdkResult.errors) {
        console.log(`  - ${err.path}: ${err.message}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  if (jsonOutput) {
    outputJson({ valid: true, format: "json", clave: zodResult.data.clave });
  } else {
    success(`Validation passed for ${filePath}`);
    console.log(`  Clave: ${zodResult.data.clave}`);
  }
}

// ---------------------------------------------------------------------------
// XML validation
// ---------------------------------------------------------------------------

async function validateXml(
  fileContent: string,
  filePath: string,
  jsonOutput: boolean,
): Promise<void> {
  const result = await validateDocumentXml(fileContent);

  if (jsonOutput) {
    outputJson({
      valid: result.valid,
      format: "xml",
      rootElement: result.rootElement,
      hasSignature: result.hasSignature,
      issues: result.issues.length > 0 ? result.issues : undefined,
    });
  } else {
    if (result.valid) {
      success(`XML validation passed for ${filePath}`);
      info(`Root element: <${result.rootElement ?? "unknown"}>`);
      info(`Signature: ${result.hasSignature ? "present" : "not found"}`);
    } else {
      error("XML validation failed:");
      for (const issue of result.issues) {
        console.log(`  - ${issue}`);
      }
    }
  }

  if (!result.valid) {
    process.exitCode = 1;
  }
}
