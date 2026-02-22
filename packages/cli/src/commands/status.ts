/**
 * `hacienda status` command.
 *
 * Checks the processing status of a document by its clave.
 *
 * @module commands/status
 */

import { defineCommand } from "citty";
import { parseClave } from "@hacienda-cr/sdk";
import { warn, error, detail, info, outputJson, colorStatus } from "../utils/format.js";

export const statusCommand = defineCommand({
  meta: {
    name: "status",
    description: "Check document status by clave",
  },
  args: {
    clave: {
      type: "positional",
      description: "50-digit clave numerica",
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
      const clave = args.clave;

      // Validate clave format
      if (!/^\d{50}$/.test(clave)) {
        error("Invalid clave. Must be a 50-digit numeric string.");
        process.exitCode = 1;
        return;
      }

      // Parse the clave to show its components
      const parsed = parseClave(clave);

      // API polling not yet implemented — show parsed clave and stub message
      warn("API status polling is not yet implemented. Showing clave details.");

      if (args.json) {
        outputJson({
          clave,
          parsed: {
            countryCode: parsed.countryCode,
            date: parsed.date.toISOString(),
            taxpayerId: parsed.taxpayerId,
            documentType: parsed.documentType,
            sequence: parsed.sequence,
            situation: parsed.situation,
            securityCode: parsed.securityCode,
          },
          status: "unknown",
          message: "API status polling not yet implemented",
        });
      } else {
        info(`Clave: ${clave}`);
        detail("Country Code", parsed.countryCode);
        detail("Date", parsed.date.toISOString().slice(0, 10));
        detail("Taxpayer ID", parsed.taxpayerId);
        detail("Document Type", parsed.documentType);
        detail("Sequence", String(parsed.sequence));
        detail("Situation", parsed.situation);
        detail("Security Code", parsed.securityCode);
        console.log(`\n  Status: ${colorStatus("unknown")} (API polling not yet implemented)`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      if (args.json) {
        outputJson({ success: false, error: message });
      } else {
        error(message);
      }
      process.exitCode = 1;
    }
  },
});
