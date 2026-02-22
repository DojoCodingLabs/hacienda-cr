/**
 * MCP tools: check_status, list_documents, get_document
 *
 * These tools provide access to document status checking and retrieval.
 * Currently returns placeholder responses as the API client submission
 * flow is not yet fully implemented.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { parseClave } from "@hacienda-cr/sdk";
import { DOCUMENT_TYPE_NAMES } from "@hacienda-cr/shared";
import type { DocumentTypeCode } from "@hacienda-cr/shared";

// ---------------------------------------------------------------------------
// check_status
// ---------------------------------------------------------------------------

export function registerCheckStatusTool(server: McpServer): void {
  server.tool(
    "check_status",
    "Check the processing status of an electronic document by its 50-digit clave numerica. " +
      "Returns the current status from Hacienda (recibido, procesando, aceptado, rechazado).",
    {
      clave: z.string().length(50).describe("The 50-digit clave numerica of the document to check"),
    },
    async (args) => {
      try {
        // Validate the clave by parsing it
        const parsed = parseClave(args.clave);
        const docTypeName =
          DOCUMENT_TYPE_NAMES[parsed.documentType as DocumentTypeCode] ??
          `Unknown (${parsed.documentType})`;

        // Placeholder response — real implementation will call the Hacienda API
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Document Status (placeholder — API client not yet connected)`,
                ``,
                `Clave: ${args.clave}`,
                `Document Type: ${docTypeName}`,
                `Taxpayer ID: ${parsed.taxpayerId}`,
                `Date: ${parsed.dateRaw}`,
                `Sequence: ${parsed.sequence}`,
                ``,
                `Status: pending (placeholder)`,
                ``,
                `Note: This is a placeholder response. Once the API client ` +
                  `is fully connected, this tool will query the Hacienda ` +
                  `API for the real-time status.`,
              ].join("\n"),
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
      "Returns a summary list with clave, date, type, and status.",
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
    },
    async (args) => {
      // Placeholder response — real implementation will call the Hacienda API
      return {
        content: [
          {
            type: "text" as const,
            text: [
              `Document List (placeholder — API client not yet connected)`,
              ``,
              `Filters applied:`,
              `  Limit: ${args.limit}`,
              `  Offset: ${args.offset}`,
              args.emisorIdentificacion ? `  Emisor: ${args.emisorIdentificacion}` : null,
              args.receptorIdentificacion ? `  Receptor: ${args.receptorIdentificacion}` : null,
              args.fechaDesde ? `  From: ${args.fechaDesde}` : null,
              args.fechaHasta ? `  Until: ${args.fechaHasta}` : null,
              ``,
              `Results: 0 documents`,
              ``,
              `Note: This is a placeholder response. Once the API client ` +
                `is fully connected, this tool will query the Hacienda ` +
                `API for actual documents.`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      };
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
      "Returns the document metadata, status, and XML content.",
    {
      clave: z
        .string()
        .length(50)
        .describe("The 50-digit clave numerica of the document to retrieve"),
    },
    async (args) => {
      try {
        // Validate the clave by parsing it
        const parsed = parseClave(args.clave);
        const docTypeName =
          DOCUMENT_TYPE_NAMES[parsed.documentType as DocumentTypeCode] ??
          `Unknown (${parsed.documentType})`;

        // Placeholder response
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Document Details (placeholder — API client not yet connected)`,
                ``,
                `Clave: ${args.clave}`,
                `Document Type: ${docTypeName}`,
                `Taxpayer ID: ${parsed.taxpayerId}`,
                `Date: ${parsed.dateRaw}`,
                `Branch: ${parsed.branch}`,
                `POS: ${parsed.pos}`,
                `Sequence: ${parsed.sequence}`,
                `Situation: ${parsed.situation}`,
                `Security Code: ${parsed.securityCode}`,
                ``,
                `Status: pending (placeholder)`,
                `XML: not available (placeholder)`,
                ``,
                `Note: This is a placeholder response. Once the API client ` +
                  `is fully connected, this tool will retrieve the full ` +
                  `document from the Hacienda API.`,
              ].join("\n"),
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
