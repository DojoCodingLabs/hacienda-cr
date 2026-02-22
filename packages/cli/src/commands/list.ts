/**
 * `hacienda list` command.
 *
 * Lists recent comprobantes from the Hacienda API.
 *
 * @module commands/list
 */

import { defineCommand } from "citty";
import { listComprobantes } from "@hacienda-cr/sdk";
import { error, outputJson, formatTable, colorStatus } from "../utils/format.js";
import type { TableColumn } from "../utils/format.js";
import { createAuthenticatedClient } from "../utils/api-client.js";

/** Column definitions for the comprobantes table. */
const COMPROBANTE_COLUMNS: TableColumn[] = [
  { header: "CLAVE", key: "clave", minWidth: 20 },
  { header: "DATE", key: "fechaEmision", minWidth: 12 },
  {
    header: "STATUS",
    key: "estado",
    minWidth: 12,
    format: (v) => colorStatus(String(v)),
  },
];

export const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List recent comprobantes from Hacienda",
  },
  args: {
    limit: {
      type: "string",
      description: "Number of results per page",
      default: "20",
    },
    offset: {
      type: "string",
      description: "Pagination offset",
      default: "0",
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
      const { httpClient } = await createAuthenticatedClient(args.profile as string);

      const result = await listComprobantes(httpClient, {
        offset: Number(args.offset),
        limit: Number(args.limit),
      });

      if (args.json) {
        outputJson({
          success: true,
          totalRegistros: result.totalRegistros,
          offset: result.offset,
          comprobantes: result.comprobantes,
        });
      } else {
        if (result.comprobantes.length === 0) {
          console.log("No comprobantes found.");
        } else {
          console.log(
            `\nShowing ${result.comprobantes.length} of ${result.totalRegistros} comprobantes:\n`,
          );
          console.log(
            formatTable(
              COMPROBANTE_COLUMNS,
              result.comprobantes as unknown as Record<string, unknown>[],
            ),
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      if (args.json) {
        outputJson({ success: false, error: message });
      } else {
        error(`List failed: ${message}`);
      }
      process.exitCode = 1;
    }
  },
});
