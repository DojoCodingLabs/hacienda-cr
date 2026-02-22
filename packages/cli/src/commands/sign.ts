/**
 * `hacienda sign` command.
 *
 * Signs an XML document with XAdES-EPES using a .p12 certificate.
 * Uses the SDK signing module for the actual cryptographic operations.
 *
 * @module commands/sign
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineCommand } from "citty";
import { signXml } from "@hacienda-cr/sdk";
import { success, error, outputJson } from "../utils/format.js";

export const signCommand = defineCommand({
  meta: {
    name: "sign",
    description: "Sign an XML document with a .p12 certificate (XAdES-EPES)",
  },
  args: {
    file: {
      type: "positional",
      description: "Path to XML file to sign",
      required: true,
    },
    p12: {
      type: "string",
      description: "Path to .p12 certificate file (or set HACIENDA_P12_PATH env var)",
      required: false,
    },
    pin: {
      type: "string",
      description: "PIN for the .p12 file (or set HACIENDA_P12_PIN env var)",
      required: false,
    },
    output: {
      type: "string",
      description: "Output path for signed XML (defaults to stdout)",
      required: false,
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    try {
      // Resolve the .p12 path from args or environment
      const p12Path = args.p12 ?? process.env["HACIENDA_P12_PATH"];
      if (!p12Path) {
        error("No .p12 certificate path provided. Use --p12 or set HACIENDA_P12_PATH.");
        process.exitCode = 1;
        return;
      }

      // Resolve PIN from args or environment
      const pin = args.pin ?? process.env["HACIENDA_P12_PIN"];
      if (!pin) {
        error("No .p12 PIN provided. Use --pin or set HACIENDA_P12_PIN.");
        process.exitCode = 1;
        return;
      }

      // Read the XML file
      const xmlPath = resolve(args.file);
      let xmlContent: string;
      try {
        xmlContent = await readFile(xmlPath, "utf-8");
      } catch {
        error(`Cannot read XML file: ${xmlPath}`);
        process.exitCode = 1;
        return;
      }

      // Read the .p12 file
      const resolvedP12Path = resolve(p12Path);
      let p12Buffer: Buffer;
      try {
        p12Buffer = await readFile(resolvedP12Path);
      } catch {
        error(`Cannot read .p12 file: ${resolvedP12Path}`);
        process.exitCode = 1;
        return;
      }

      // Sign the XML
      const signedXml = await signXml(xmlContent, p12Buffer, pin);

      // Output result
      if (args.output) {
        const outputPath = resolve(args.output);
        await writeFile(outputPath, signedXml, "utf-8");

        if (args.json) {
          outputJson({ success: true, outputPath, bytes: signedXml.length });
        } else {
          success(`Signed XML written to ${outputPath}`);
        }
      } else if (args.json) {
        outputJson({ success: true, signedXml, bytes: signedXml.length });
      } else {
        // Write signed XML to stdout
        process.stdout.write(signedXml);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      if (args.json) {
        outputJson({ success: false, error: message });
      } else {
        error(`Signing failed: ${message}`);
      }
      process.exitCode = 1;
    }
  },
});
