/**
 * `hacienda status` command.
 *
 * Checks the processing status of a document by its clave.
 *
 * @module commands/status
 */

import { defineCommand } from "citty";
import { parseClave, getStatus, extractRejectionReason } from "@hacienda-cr/sdk";
import { error, detail, info, outputJson, colorStatus } from "../utils/format.js";
import { createAuthenticatedClient } from "../utils/api-client.js";

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
    profile: {
      type: "string",
      description: "Config profile name",
      default: "default",
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

      // Authenticate and query status
      const { httpClient } = await createAuthenticatedClient(args.profile as string);
      const status = await getStatus(httpClient, clave);

      // Extract rejection reason if available
      let rejectionReason: string | undefined;
      if (status.responseXml) {
        rejectionReason = extractRejectionReason(status.responseXml);
      }

      if (args.json) {
        outputJson({
          clave,
          status: status.status,
          date: status.date,
          rejectionReason,
          parsed: {
            countryCode: parsed.countryCode,
            date: parsed.date.toISOString(),
            taxpayerId: parsed.taxpayerId,
            documentType: parsed.documentType,
            sequence: parsed.sequence,
            situation: parsed.situation,
            securityCode: parsed.securityCode,
          },
        });
      } else {
        info(`Clave: ${clave}`);
        console.log(`  Status: ${colorStatus(status.status)}`);
        if (status.date) detail("Date", status.date);
        if (rejectionReason) detail("Reason", rejectionReason);
        console.log("");
        detail("Country Code", parsed.countryCode);
        detail("Taxpayer ID", parsed.taxpayerId);
        detail("Document Type", parsed.documentType);
        detail("Sequence", String(parsed.sequence));
        detail("Situation", parsed.situation);
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
