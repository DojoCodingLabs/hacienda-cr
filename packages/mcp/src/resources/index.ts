/**
 * Resource registration barrel.
 *
 * Registers all MCP resources with the server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerFacturaSchemaResource } from "./factura-schema.js";
import { registerDocumentTypesResource } from "./document-types.js";
import { registerTaxCodesResource } from "./tax-codes.js";
import { registerIdTypesResource } from "./id-types.js";

/**
 * Register all resources with the MCP server.
 */
export function registerResources(server: McpServer): void {
  registerFacturaSchemaResource(server);
  registerDocumentTypesResource(server);
  registerTaxCodesResource(server);
  registerIdTypesResource(server);
}
