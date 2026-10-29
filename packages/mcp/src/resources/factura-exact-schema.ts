/**
 * MCP resource: hacienda://schemas/factura-exact
 *
 * JSON Schema for create_invoice_exact. All monetary, quantity, rate and
 * exchange-rate fields are decimal text; JSON numbers are not accepted.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CreateInvoiceExactInputSchema } from "../tools/create-invoice-exact.js";

const FACTURA_EXACT_SCHEMA = {
  ...z.toJSONSchema(CreateInvoiceExactInputSchema, { io: "input" }),
  title: "Factura Electronica exact decimal-text input",
  description:
    "Input schema for create_invoice_exact. Amounts, quantities, rates and exchange rates are bounded decimal text.",
};

export function registerFacturaExactSchemaResource(server: McpServer): void {
  server.resource(
    "factura-exact-schema",
    "hacienda://schemas/factura-exact",
    {
      description:
        "JSON Schema for the exact Factura Electronica input format. " +
        "Use it when you need bounded decimal-text amounts instead of JSON numbers.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "hacienda://schemas/factura-exact",
          mimeType: "application/json",
          text: JSON.stringify(FACTURA_EXACT_SCHEMA, null, 2),
        },
      ],
    }),
  );
}
