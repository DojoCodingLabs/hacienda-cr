#!/usr/bin/env node
/**
 * CLI entry point for the Hacienda CR MCP Server.
 *
 * Starts the server with stdio transport so it can be used as an
 * MCP server in tools like Claude Desktop, Cursor, etc.
 *
 * Usage:
 *   npx hacienda-mcp
 *   node dist/cli.js
 *
 * @module cli
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});
