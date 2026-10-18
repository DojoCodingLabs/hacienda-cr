/**
 * `hacienda get` command.
 *
 * Gets full details of a document by its clave.
 *
 * @module commands/get
 */

import { ComprobanteClaveSchema } from "@dojocoding/hacienda-shared";
import { defineCommand } from "citty";
import { parseClave, getComprobante } from "@dojocoding/hacienda-sdk";
import { error, detail, info, outputJson } from "../utils/format.js";
import { createAuthenticatedClient } from "../utils/api-client.js";

export const getCommand = defineCommand({
  meta: {
    name: "get",
    description: "Get observed document metadata by clave (not XML/status)",
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
      if (!ComprobanteClaveSchema.safeParse(clave).success) {
        error("Invalid clave. Use the current 50-character clave format.");
        process.exitCode = 1;
        return;
      }

      // Parse the clave for supplementary info
      const parsed = parseClave(clave);

      // Authenticate and fetch document
      const { httpClient } = await createAuthenticatedClient(args.profile as string);
      const doc = await getComprobante(httpClient, clave);

      if (args.json) {
        outputJson({
          clave: doc.clave,
          fecha: doc.fecha,
          emisor: doc.emisor,
          receptor: doc.receptor,
          notasCredito: doc.notasCredito,
          notasDebito: doc.notasDebito,
          parsed: {
            countryCode: parsed.countryCode,
            date: parsed.date.toISOString(),
            taxpayerId: parsed.taxpayerId,
            documentType: parsed.documentType,
            sequence: clave.slice(31, 41),
            situation: parsed.situation,
            securityCode: parsed.securityCode,
          },
        });
      } else {
        info(`Document: ${doc.clave}`);
        detail("Document Date", doc.fecha);
        detail("Emisor", `${doc.emisor.tipoIdentificacion}: ${doc.emisor.numeroIdentificacion}`);
        if (doc.receptor) {
          detail(
            "Receptor",
            `${doc.receptor.tipoIdentificacion}: ${doc.receptor.numeroIdentificacion}`,
          );
        }
        detail("Credit references", JSON.stringify(doc.notasCredito ?? []));
        detail("Debit references", JSON.stringify(doc.notasDebito ?? []));
        info("Metadata only. Use hacienda status for a separate status/response observation.");
        console.log("");
        detail("Document Type", parsed.documentType);
        detail("Sequence", clave.slice(31, 41));
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
