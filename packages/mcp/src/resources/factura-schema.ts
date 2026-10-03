/**
 * MCP resource: hacienda://schemas/factura
 *
 * Exposes the Factura Electronica JSON schema as a readable resource
 * for AI assistants to understand the invoice structure.
 */

import { z } from "zod";
import { CreateInvoiceInputSchema } from "../tools/create-invoice.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const FACTURA_SCHEMA = {
  ...z.toJSONSchema(CreateInvoiceInputSchema, { io: "input" }),
  title: "Factura Electronica (Costa Rica)",
  description: "Input schema for the create_invoice tool, including required v4.4 fields.",
};

export function registerFacturaSchemaResource(server: McpServer): void {
  server.resource(
    "factura-schema",
    "hacienda://schemas/factura",
    {
      description:
        "JSON Schema for the Factura Electronica (electronic invoice) input format. " +
        "Use this to understand the required fields and structure for creating invoices.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "hacienda://schemas/factura",
          mimeType: "application/json",
          text: JSON.stringify(FACTURA_SCHEMA, null, 2),
        },
      ],
    }),
  );
}
