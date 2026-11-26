/**
 * `hacienda status` command.
 *
 * Checks the processing status of a document by its clave.
 *
 * @module commands/status
 */

import { defineCommand } from "citty";
import { parseClave, getStatus, extractRejectionReason } from "@dojocoding/hacienda-sdk";
import { error, detail, info, outputJson, colorStatus } from "../utils/format.js";
import { createAuthenticatedClient } from "../utils/api-client.js";

/** Shown when the positional clave does not have the v4.4 (2026) shape. */
export const CLAVE_FORMAT_ERROR =
  "Invalid clave. Expected 50 characters: digits only, except the 12-character " +
  "taxpayer ID segment (characters 10-21), which may also contain letters " +
  "(alphanumeric cédula jurídica, Anexos y Estructuras v4.4 revision of April 2026).";

export const statusCommand = defineCommand({
  meta: {
    name: "status",
    description: "Check document status by clave",
  },
  args: {
    clave: {
      type: "positional",
      description: "50-character clave numerica",
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

      // Validate clave format. Since the April 2026 revision of Anexos y
      // Estructuras v4.4 (mandatory 2026-11-01) the taxpayer segment may hold
      // an alphanumeric cédula jurídica; every other segment stays numeric.
      if (!/^\d{9}[A-Za-z0-9]{12}\d{29}$/.test(clave)) {
        error(CLAVE_FORMAT_ERROR);
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
