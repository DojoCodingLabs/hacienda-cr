/**
 * `hacienda submit` command.
 *
 * Reads a JSON invoice file, validates it, builds XML, and submits to Hacienda.
 * Signing is stubbed until the signing module is complete.
 *
 * @module commands/submit
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineCommand } from "citty";
import { FacturaElectronicaSchema } from "@hacienda-cr/shared";
import type { FacturaElectronica } from "@hacienda-cr/shared";
import { buildFacturaXml, validateFacturaInput } from "@hacienda-cr/sdk";
import { success, error, detail, warn, outputJson } from "../utils/format.js";

export const submitCommand = defineCommand({
  meta: {
    name: "submit",
    description: "Submit an electronic invoice to Hacienda",
  },
  args: {
    file: {
      type: "positional",
      description: "Path to JSON invoice file",
      required: true,
    },
    "dry-run": {
      type: "boolean",
      description: "Validate and build XML without submitting",
      default: false,
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

      // Read and parse the JSON file
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

      // Validate with Zod schema
      const validation = FacturaElectronicaSchema.safeParse(invoiceData);
      if (!validation.success) {
        const issues = validation.error.issues.map(
          (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
        );
        if (args.json) {
          outputJson({
            success: false,
            error: "Validation failed",
            issues: validation.error.issues,
          });
        } else {
          error("Invoice validation failed:");
          for (const issue of issues) {
            console.log(issue);
          }
        }
        process.exitCode = 1;
        return;
      }

      // Also validate with the SDK's validator
      const sdkValidation = validateFacturaInput(validation.data);
      if (!sdkValidation.valid) {
        if (args.json) {
          outputJson({
            success: false,
            error: "SDK validation failed",
            issues: sdkValidation.errors,
          });
        } else {
          error("Invoice SDK validation failed:");
          for (const err of sdkValidation.errors) {
            console.log(`  - ${err.path}: ${err.message}`);
          }
        }
        process.exitCode = 1;
        return;
      }

      // Build XML — cast to FacturaElectronica since Zod infers string
      // for enums while the type uses branded enum types
      const xml = buildFacturaXml(validation.data as unknown as FacturaElectronica);

      if (args["dry-run"]) {
        if (args.json) {
          outputJson({
            success: true,
            dryRun: true,
            clave: validation.data.clave,
            xml,
          });
        } else {
          success("Validation passed (dry run)");
          detail("Clave", validation.data.clave);
          detail("Consecutivo", validation.data.numeroConsecutivo);
          detail("XML Length", `${xml.length} bytes`);
          console.log("\n--- Generated XML ---");
          console.log(xml);
        }
        return;
      }

      // Submission requires signing and API client — stub for now
      warn(
        "Signing and API submission are not yet implemented. Use --dry-run to validate and preview XML.",
      );
      if (args.json) {
        outputJson({
          success: false,
          error: "Submission not yet implemented. Use --dry-run to validate.",
          clave: validation.data.clave,
          xml,
        });
      } else {
        detail("Clave", validation.data.clave);
        detail("Consecutivo", validation.data.numeroConsecutivo);
        console.log(
          "\nOnce signing is implemented, this command will sign the XML and submit it to the Hacienda API.",
        );
      }
      process.exitCode = 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      if (args.json) {
        outputJson({ success: false, error: message });
      } else {
        error(`Submit failed: ${message}`);
      }
      process.exitCode = 1;
    }
  },
});
