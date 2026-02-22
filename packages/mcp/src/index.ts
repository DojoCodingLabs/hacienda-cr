/**
 * @dojocoding/hacienda-mcp
 *
 * MCP Server for Costa Rica electronic invoicing.
 * Exposes SDK functionality as AI-accessible tools via the Model Context Protocol.
 *
 * Tools:
 * - create_invoice — Build a Factura Electronica XML from structured input
 * - check_status — Check document processing status by clave
 * - list_documents — List recent electronic documents
 * - get_document — Get full document details by clave
 * - lookup_taxpayer — Look up taxpayer info by identification number
 * - draft_invoice — Generate a draft invoice template with sensible defaults
 *
 * Resources:
 * - hacienda://schemas/factura — JSON schema for invoice creation
 * - hacienda://reference/document-types — Document types, codes, and descriptions
 * - hacienda://reference/tax-codes — Tax codes, IVA rates, and units of measure
 * - hacienda://reference/id-types — Identification types and validation rules
 */

export const PACKAGE_NAME = "@dojocoding/hacienda-mcp" as const;

export { createServer } from "./server.js";
