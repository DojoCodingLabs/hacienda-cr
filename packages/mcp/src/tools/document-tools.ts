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
import { DOCUMENT_TYPE_NAMES } from "@dojocoding/hacienda-shared";
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
                `Sequence: ${parsed.sequence}`,
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
        const message = error instanceof Error ? error.message : String(error);
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
  server.tool(
    "list_documents",
    "List recent electronic documents. " +
      "Optionally filter by date range, emisor, or receptor. " +
      "Returns a summary list with clave, date, type, and status. " +
      "Requires a configured profile (run `hacienda auth login` first).",
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe("Maximum number of documents to return (1-100, default 10)"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset (default 0)"),
      emisorIdentificacion: z
        .string()
        .optional()
        .describe("Filter by issuer identification number"),
      receptorIdentificacion: z
        .string()
        .optional()
        .describe("Filter by receiver identification number"),
      fechaDesde: z.string().optional().describe("Filter by start date (ISO 8601)"),
      fechaHasta: z.string().optional().describe("Filter by end date (ISO 8601)"),
      profile: z.string().default("default").describe('Config profile name (default: "default")'),
    },
    async (args) => {
      try {
        const httpClient = await createMcpApiClient(args.profile);

        const result = await listComprobantes(httpClient, {
          offset: args.offset,
          limit: args.limit,
          emisorIdentificacion: args.emisorIdentificacion,
          receptorIdentificacion: args.receptorIdentificacion,
          fechaEmisionDesde: args.fechaDesde,
          fechaEmisionHasta: args.fechaHasta,
        });

        const lines = [
          `Document List`,
          ``,
          `Total: ${result.totalRegistros} documents`,
          `Showing: ${result.comprobantes.length} (offset ${result.offset})`,
          ``,
        ];

        if (result.comprobantes.length === 0) {
          lines.push("No documents found matching the criteria.");
        } else {
          for (const doc of result.comprobantes) {
            lines.push(
              `- ${doc.clave}`,
              `  Date: ${doc.fechaEmision} | Status: ${doc.estado}`,
              `  Emisor: ${doc.emisor.numeroIdentificacion}`,
              ``,
            );
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: lines.join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing documents: ${message}`,
            },
          ],
          isError: true,
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
    "Get full details of an electronic document by its 50-digit clave numerica. " +
      "Returns the document metadata, status, and XML content. " +
      "Requires a configured profile (run `hacienda auth login` first).",
    {
      clave: z
        .string()
        .length(50)
        .describe("The 50-digit clave numerica of the document to retrieve"),
      profile: z.string().default("default").describe('Config profile name (default: "default")'),
    },
    async (args) => {
      try {
        // Validate the clave by parsing it
        const parsed = parseClave(args.clave);
        const docTypeName =
          DOCUMENT_TYPE_NAMES[parsed.documentType as DocumentTypeCode] ??
          `Unknown (${parsed.documentType})`;

        // Authenticate and fetch document
        const httpClient = await createMcpApiClient(args.profile);
        const doc = await getComprobante(httpClient, args.clave);

        // Decode the submitted XML if available
        let xmlContent: string | undefined;
        if (doc.comprobanteXml) {
          try {
            xmlContent = Buffer.from(doc.comprobanteXml, "base64").toString("utf-8");
          } catch {
            xmlContent = "(unable to decode XML)";
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Document Details`,
                ``,
                `Clave: ${doc.clave}`,
                `Document Type: ${docTypeName}`,
                `Taxpayer ID: ${parsed.taxpayerId}`,
                `Emission Date: ${doc.fechaEmision}`,
                `Status: ${doc.estado}`,
                doc.fechaRespuesta ? `Response Date: ${doc.fechaRespuesta}` : null,
                ``,
                `Emisor: ${doc.emisor.tipoIdentificacion} ${doc.emisor.numeroIdentificacion}`,
                doc.receptor
                  ? `Receptor: ${doc.receptor.tipoIdentificacion} ${doc.receptor.numeroIdentificacion}`
                  : null,
                ``,
                `Branch: ${parsed.branch}`,
                `POS: ${parsed.pos}`,
                `Sequence: ${parsed.sequence}`,
                `Situation: ${parsed.situation}`,
                `Security Code: ${parsed.securityCode}`,
                xmlContent ? `\n--- XML ---\n${xmlContent}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
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
