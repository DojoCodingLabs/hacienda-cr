import { sanitizeLogString } from "@dojocoding/hacienda-sdk";
/**
 * MCP tools: check_status, list_documents, get_document
 *
 * These tools provide access to document status checking and retrieval
 * via the Hacienda API.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  parseClave,
  getStatus,
  extractRejectionReason,
  listComprobantes,
  getComprobante,
} from "@dojocoding/hacienda-sdk";
import { ComprobantesQuerySchema, DOCUMENT_TYPE_NAMES } from "@dojocoding/hacienda-shared";
import type { DocumentTypeCode } from "@dojocoding/hacienda-shared";
import { createMcpApiClient } from "./api-client.js";

// ---------------------------------------------------------------------------
// check_status
// ---------------------------------------------------------------------------

export function registerCheckStatusTool(server: McpServer): void {
  server.tool(
    "check_status",
    "Check the processing status of an electronic document by its 50-digit clave numerica. " +
      "Returns the current status from Hacienda (recibido, procesando, aceptado, rechazado). " +
      "Requires a configured profile (run `hacienda auth login` first).",
    {
      clave: z.string().length(50).describe("The 50-digit clave numerica of the document to check"),
      profile: z.string().default("default").describe('Config profile name (default: "default")'),
    },
    async (args) => {
      try {
        // Validate the clave by parsing it
        const parsed = parseClave(args.clave);
        const docTypeName =
          DOCUMENT_TYPE_NAMES[parsed.documentType as DocumentTypeCode] ??
          `Unknown (${parsed.documentType})`;

        // Authenticate and query status
        const httpClient = await createMcpApiClient(args.profile);
        const status = await getStatus(httpClient, args.clave);

        // Extract rejection reason if available
        let rejectionReason: string | undefined;
        if (status.responseXml) {
          rejectionReason = extractRejectionReason(status.responseXml);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Document Status`,
                ``,
                `Clave: ${args.clave}`,
                `Document Type: ${docTypeName}`,
                `Taxpayer ID: ${parsed.taxpayerId}`,
                `Date: ${parsed.dateRaw}`,
                `Sequence: ${args.clave.slice(31, 41)}`,
                ``,
                `Status: ${status.status}`,
                status.date ? `Response Date: ${status.date}` : null,
                rejectionReason ? `Rejection Reason: ${rejectionReason}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = sanitizeLogString(error instanceof Error ? error.message : String(error));
        return {
          content: [
            {
              type: "text" as const,
              text: `Error checking status: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

// ---------------------------------------------------------------------------
// list_documents
// ---------------------------------------------------------------------------

export function registerListDocumentsTool(server: McpServer): void {
  server.registerTool(
    "list_documents",
    {
      description:
        "Read one bounded page of observed Hacienda metadata, optionally filtered by combined domestic emisor/receptor. No date filters, status/XML, inferred totals or complete-history claim.",
      inputSchema: ComprobantesQuerySchema.extend({
        profile: z.string().default("default"),
      }).strict(),
    },
    async ({ profile, ...query }, extra) => {
      try {
        // SDK schema validation is also applied before creating an auth client.
        const params = ComprobantesQuerySchema.parse(query);
        extra.signal.throwIfAborted();
        const httpClient = await createMcpApiClient(profile);
        const result = await listComprobantes(httpClient, params, { signal: extra.signal });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                kind: "observed-history-page",
                ...result,
                coverage: "not-established",
                statusAndXml: "not-provided-by-history",
              }),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error listing documents: ${sanitizeLogString(error instanceof Error ? error.message : String(error))}`,
            },
          ],
        };
      }
    },
  );
}

// ---------------------------------------------------------------------------
// get_document
// ---------------------------------------------------------------------------

export function registerGetDocumentTool(server: McpServer): void {
  server.tool(
    "get_document",
    "Get observed document metadata by its current 50-character clave. " +
      "Returns observed metadata and credit/debit references only, without status or XML. Use check_status separately. " +
      "Requires a configured profile (run `hacienda auth login` first).",
    {
      clave: z
        .string()
        .length(50)
        .describe("The current 50-character clave of the document metadata to retrieve"),
      profile: z.string().default("default").describe('Config profile name (default: "default")'),
    },
    async (args, extra) => {
      try {
        extra.signal.throwIfAborted();
        // Validate the clave by parsing it
        const parsed = parseClave(args.clave);
        const docTypeName =
          DOCUMENT_TYPE_NAMES[parsed.documentType as DocumentTypeCode] ??
          `Unknown (${parsed.documentType})`;

        // Authenticate and fetch document
        const httpClient = await createMcpApiClient(args.profile);
        const doc = await getComprobante(httpClient, args.clave, { signal: extra.signal });

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Document Metadata`,
                ``,
                `Clave: ${doc.clave}`,
                `Document Type: ${docTypeName}`,
                `Taxpayer ID: ${parsed.taxpayerId}`,
                `Document Date: ${doc.fecha}`,
                "Metadata only; use check_status for a separate status/response observation.",
                `Credit references: ${JSON.stringify(doc.notasCredito ?? [])}`,
                `Debit references: ${JSON.stringify(doc.notasDebito ?? [])}`,
                ``,
                `Emisor: ${doc.emisor.tipoIdentificacion} ${doc.emisor.numeroIdentificacion}`,
                doc.receptor
                  ? `Receptor: ${doc.receptor.tipoIdentificacion} ${doc.receptor.numeroIdentificacion}`
                  : null,
                ``,
                `Branch: ${parsed.branch}`,
                `POS: ${parsed.pos}`,
                `Sequence: ${args.clave.slice(31, 41)}`,
                `Situation: ${parsed.situation}`,
                `Security Code: ${parsed.securityCode}`,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = sanitizeLogString(error instanceof Error ? error.message : String(error));
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting document: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
