/**
 * `hacienda list` command.
 *
 * Lists recent comprobantes from the Hacienda API.
 * Currently stubbed — requires authenticated API client.
 *
 * @module commands/list
 */

import { defineCommand } from "citty";
import { warn, outputJson, formatTable, colorStatus } from "../utils/format.js";
import type { TableColumn } from "../utils/format.js";

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
  { header: "TYPE", key: "type", minWidth: 10 },
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
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    // API listing not yet implemented — show stub
    warn(
      "API listing is not yet implemented. This command will list recent comprobantes once the API client is connected.",
    );

    // Show example of what the output will look like
    const exampleData = [
      {
        clave: "50601012400310123456700100001010000000001199999999",
        fechaEmision: "2024-01-12",
        estado: "aceptado",
        type: "FE",
      },
      {
        clave: "50601012400310123456700100001010000000002199999998",
        fechaEmision: "2024-01-12",
        estado: "procesando",
        type: "FE",
      },
    ];

    if (args.json) {
      outputJson({
        success: false,
        error: "API listing not yet implemented",
        exampleFormat: {
          totalRegistros: 0,
          offset: Number(args.offset),
          limit: Number(args.limit),
          comprobantes: [],
        },
      });
    } else {
      console.log("\nExample output format:\n");
      console.log(formatTable(COMPROBANTE_COLUMNS, exampleData));
      console.log("\n(This is placeholder data. The API client is not yet connected.)");
    }
  },
});
