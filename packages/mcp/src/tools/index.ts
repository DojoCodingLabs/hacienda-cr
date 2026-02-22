/**
 * Tool registration barrel.
 *
 * Registers all MCP tools with the server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerCreateInvoiceTool } from "./create-invoice.js";
import {
  registerCheckStatusTool,
  registerListDocumentsTool,
  registerGetDocumentTool,
} from "./document-tools.js";
import { registerLookupTaxpayerTool, registerDraftInvoiceTool } from "./lookup-tools.js";

/**
 * Register all tools with the MCP server.
 */
export function registerTools(server: McpServer): void {
  registerCreateInvoiceTool(server);
  registerCheckStatusTool(server);
  registerListDocumentsTool(server);
  registerGetDocumentTool(server);
  registerLookupTaxpayerTool(server);
  registerDraftInvoiceTool(server);
}
