/**
 * `hacienda get` command.
 *
 * Gets full details of a document by its clave.
 * Currently stubbed — requires authenticated API client.
 *
 * @module commands/get
 */

import { defineCommand } from "citty";
import { parseClave } from "@hacienda-cr/sdk";
import { warn, error, detail, info, outputJson } from "../utils/format.js";

export const getCommand = defineCommand({
  meta: {
    name: "get",
    description: "Get full details of a document by clave",
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

      // Parse the clave to show available info
      const parsed = parseClave(clave);

      // API document retrieval requires authentication — show parsed clave
      warn("Document retrieval requires authentication. Run `hacienda auth login` first.");

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
          message: "API document retrieval not yet implemented",
        });
      } else {
        info(`Document: ${clave}`);
        detail("Country Code", parsed.countryCode);
        detail("Date", parsed.date.toISOString().slice(0, 10));
        detail("Taxpayer ID", parsed.taxpayerId);
        detail("Document Type", parsed.documentType);
        detail("Sequence", String(parsed.sequence));
        detail("Situation", parsed.situation);
        detail("Security Code", parsed.securityCode);
        console.log("\nFull document details will be available after authentication.");
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
