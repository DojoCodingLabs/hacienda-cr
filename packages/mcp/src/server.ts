/**
 * MCP Server for Costa Rica electronic invoicing.
 *
 * Sets up an McpServer instance with all tools and resources registered.
 * This module is the primary export — consumers can either use the
 * `createServer()` factory (e.g. for testing) or run the stdio transport
 * via the CLI entry point.
 *
 * @module server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";

// ---------------------------------------------------------------------------
// Server metadata
// ---------------------------------------------------------------------------

const SERVER_NAME = "hacienda-cr";
const SERVER_VERSION = "0.0.1";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates and configures the MCP server with all tools and resources.
 *
 * @returns A fully configured McpServer ready to be connected to a transport.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions:
        "Hacienda CR MCP Server — tools and reference data for Costa Rica electronic invoicing (comprobantes electronicos). " +
        "Use the tools to create invoices, check document status, and look up reference data. " +
        "Resources provide schemas and reference tables for document types, tax codes, and identification types.",
    },
  );

  registerTools(server);
  registerResources(server);

  return server;
}
