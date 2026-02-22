/**
 * `hacienda validate` command.
 *
 * Validates an invoice JSON file against the Zod schemas without submitting.
 *
 * @module commands/validate
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineCommand } from "citty";
import { FacturaElectronicaSchema } from "@hacienda-cr/shared";
import { validateFacturaInput } from "@hacienda-cr/sdk";
import { success, error, outputJson } from "../utils/format.js";

export const validateCommand = defineCommand({
  meta: {
    name: "validate",
    description: "Validate an invoice JSON file against schemas",
  },
  args: {
    file: {
      type: "positional",
      description: "Path to JSON invoice file",
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

      // Read and parse
      let fileContent: string;
      try {
        fileContent = await readFile(filePath, "utf-8");
      } catch {
        error(`Cannot read file: ${filePath}`);
        process.exitCode = 1;
        return;
      }

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

        if (args.json) {
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
        if (args.json) {
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

      if (args.json) {
        outputJson({ valid: true, clave: zodResult.data.clave });
      } else {
        success(`Validation passed for ${filePath}`);
        console.log(`  Clave: ${zodResult.data.clave}`);
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
