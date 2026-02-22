/**
 * `hacienda submit` command.
 *
 * Reads a JSON invoice file, validates it, builds XML, signs it,
 * and submits to the Hacienda API.
 *
 * @module commands/submit
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineCommand } from "citty";
import { FacturaElectronicaSchema } from "@dojocoding/hacienda-shared";
import type { FacturaElectronica } from "@dojocoding/hacienda-shared";
import type { SubmissionRequest } from "@dojocoding/hacienda-shared";
import {
  buildFacturaXml,
  validateFacturaInput,
  signAndEncode,
  submitAndWait,
} from "@dojocoding/hacienda-sdk";
import { success, error, detail, info, outputJson } from "../utils/format.js";
import { createAuthenticatedClient } from "../utils/api-client.js";

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
    profile: {
      type: "string",
      description: "Config profile name",
      default: "default",
    },
    p12: {
      type: "string",
      description: "Path to .p12 certificate file (overrides profile)",
    },
    pin: {
      type: "string",
      description:
        "PIN for the .p12 certificate (prefer HACIENDA_P12_PIN env var — CLI args are visible in process lists)",
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

      // Authenticate
      const { httpClient, config } = await createAuthenticatedClient(args.profile as string);

      // Resolve .p12 path and PIN
      const p12Path =
        (args.p12 as string | undefined) ??
        process.env["HACIENDA_P12_PATH"] ??
        config.profile.p12_path;
      if (!p12Path) {
        error(
          "Missing .p12 certificate path. Use --p12, set HACIENDA_P12_PATH, or configure in profile.",
        );
        process.exitCode = 1;
        return;
      }

      const p12Pin = (args.pin as string | undefined) ?? config.p12Pin;
      if (!p12Pin) {
        error("Missing .p12 PIN. Use --pin or set HACIENDA_P12_PIN environment variable.");
        process.exitCode = 1;
        return;
      }

      // Read the .p12 file
      let p12Buffer: Buffer;
      try {
        p12Buffer = await readFile(resolve(p12Path));
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        error(`Cannot read .p12 file: ${p12Path}: ${detail}`);
        process.exitCode = 1;
        return;
      }

      // Sign and Base64-encode the XML
      if (!args.json) {
        info("Signing XML...");
      }
      const signedXmlBase64 = await signAndEncode(xml, p12Buffer, p12Pin);

      // Build submission request
      const invoiceDoc = validation.data;
      const receptor = invoiceDoc.receptor?.identificacion
        ? {
            tipoIdentificacion: invoiceDoc.receptor.identificacion.tipo,
            numeroIdentificacion: invoiceDoc.receptor.identificacion.numero,
          }
        : undefined;

      const request: SubmissionRequest = {
        clave: invoiceDoc.clave,
        fecha: invoiceDoc.fechaEmision,
        emisor: {
          tipoIdentificacion: invoiceDoc.emisor.identificacion.tipo,
          numeroIdentificacion: invoiceDoc.emisor.identificacion.numero,
        },
        receptor,
        comprobanteXml: signedXmlBase64,
      };

      // Submit and wait for response
      if (!args.json) {
        info("Submitting to Hacienda...");
      }

      const result = await submitAndWait(httpClient, request, {
        onPoll: (status, attempt) => {
          if (!args.json) {
            info(`Polling status (attempt ${attempt}): ${status.status}`);
          }
        },
      });

      if (args.json) {
        outputJson({
          success: result.accepted,
          clave: result.clave,
          status: result.status,
          date: result.date,
          rejectionReason: result.rejectionReason,
          pollAttempts: result.pollAttempts,
        });
      } else if (result.accepted) {
        success("Document accepted by Hacienda!");
        detail("Clave", result.clave);
        detail("Status", result.status);
        if (result.date) detail("Date", result.date);
      } else {
        error(`Document rejected by Hacienda: ${result.status}`);
        detail("Clave", result.clave);
        if (result.rejectionReason) {
          detail("Reason", result.rejectionReason);
        }
        process.exitCode = 1;
      }
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
