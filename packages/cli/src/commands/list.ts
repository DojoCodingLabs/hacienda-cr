/**
 * `hacienda list` command.
 *
 * Lists recent comprobantes from the Hacienda API.
 *
 * @module commands/list
 */

import { defineCommand } from "citty";
import { stripVTControlCharacters } from "node:util";
import { listComprobantes, sanitizeLogString } from "@dojocoding/hacienda-sdk";
import { ComprobantesQuerySchema } from "@dojocoding/hacienda-shared";
import { error, outputJson, formatTable } from "../utils/format.js";
import type { TableColumn } from "../utils/format.js";
import { createAuthenticatedClient } from "../utils/api-client.js";

/** Column definitions for the comprobantes table. */
const COMPROBANTE_COLUMNS: TableColumn[] = [
  { header: "CLAVE", key: "clave", minWidth: 20 },
  { header: "DATE", key: "fecha", minWidth: 12 },
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
    emisor: {
      type: "string",
      description: "Combined domestic issuer type + ID (preserve leading zeros)",
    },
    receptor: {
      type: "string",
      description: "Combined domestic receiver type + ID (preserve leading zeros)",
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
      if (
        Object.keys(args).some(
          (key) => !["limit", "offset", "emisor", "receptor", "profile", "json", "_"].includes(key),
        )
      )
        throw new Error(
          "Unsupported history option; dates and legacy identification filters are not supported.",
        );
      if (!/^\d+$/.test(args.limit) || !/^\d+$/.test(args.offset))
        throw new Error("Invalid pagination; use integer offset and limit.");
      const parsed = ComprobantesQuerySchema.safeParse({
        offset: Number(args.offset),
        limit: Number(args.limit),
        ...(args.emisor !== undefined ? { emisor: args.emisor } : {}),
        ...(args.receptor !== undefined ? { receptor: args.receptor } : {}),
      });
      if (!parsed.success)
        throw new Error(
          "Invalid history filters; limit must be 1–50 and IDs must include a supported domestic type.",
        );
      const { httpClient } = await createAuthenticatedClient(args.profile as string);

      const result = await listComprobantes(httpClient, parsed.data);
      const printableHeader = (value: string | null) =>
        stripVTControlCharacters(sanitizeLogString(value ?? "not observed")).replace(
          /[\p{Cc}\p{Cf}]/gu,
          "",
        );

      if (args.json) {
        outputJson({
          success: true,
          limit: result.limit,
          pagination: result.pagination,
          offset: result.offset,
          comprobantes: result.comprobantes,
        });
      } else {
        if (result.comprobantes.length === 0) {
          console.log("No comprobantes found.");
        } else {
          console.log(
            `\nObserved ${result.comprobantes.length} metadata records (requested offset ${result.offset}, limit ${result.limit}).\n`,
          );
          console.log(
            formatTable(
              COMPROBANTE_COLUMNS,
              result.comprobantes as unknown as Record<string, unknown>[],
            ),
          );
        }
        console.log(
          `HTTP ${result.pagination.httpStatus}; Accept-Range: ${printableHeader(result.pagination.acceptRange)}; Content-Range: ${printableHeader(result.pagination.contentRange)}`,
        );
        console.log("Observed page only; no complete-history or fiscal-status claim.");
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
