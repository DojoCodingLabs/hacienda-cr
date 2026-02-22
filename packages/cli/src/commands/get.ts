/**
 * `hacienda get` command.
 *
 * Gets full details of a document by its clave.
 *
 * @module commands/get
 */

import { defineCommand } from "citty";
import { parseClave, getComprobante } from "@dojocoding/hacienda-sdk";
import { error, detail, info, outputJson, colorStatus } from "../utils/format.js";
import { createAuthenticatedClient } from "../utils/api-client.js";

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

      // Parse the clave for supplementary info
      const parsed = parseClave(clave);

      // Authenticate and fetch document
      const { httpClient } = await createAuthenticatedClient(args.profile as string);
      const doc = await getComprobante(httpClient, clave);

      if (args.json) {
        outputJson({
          clave: doc.clave,
          fechaEmision: doc.fechaEmision,
          estado: doc.estado,
          emisor: doc.emisor,
          receptor: doc.receptor,
          fechaRespuesta: doc.fechaRespuesta,
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
        info(`Document: ${doc.clave}`);
        console.log(`  Status: ${colorStatus(doc.estado)}`);
        detail("Emission Date", doc.fechaEmision);
        detail("Emisor", `${doc.emisor.tipoIdentificacion}: ${doc.emisor.numeroIdentificacion}`);
        if (doc.receptor) {
          detail(
            "Receptor",
            `${doc.receptor.tipoIdentificacion}: ${doc.receptor.numeroIdentificacion}`,
          );
        }
        if (doc.fechaRespuesta) detail("Response Date", doc.fechaRespuesta);
        console.log("");
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
