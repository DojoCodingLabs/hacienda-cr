# @hacienda-cr/mcp

## 0.1.0

### Minor Changes

- Initial public release of hacienda-cr — TypeScript SDK, CLI, and MCP Server for Costa Rica electronic invoicing (Hacienda API v4.4).

  **@hacienda-cr/shared** — Shared types, Zod schemas, and constants for all 7 document types, tax codes, and identification types.

  **@hacienda-cr/sdk** — Core SDK with OAuth2 authentication, 50-digit clave generation/parsing, XML builder, XAdES-EPES digital signing, API client with submission/polling, and document builders for all 7 electronic document types.

  **@hacienda-cr/cli** — `hacienda` CLI binary for login, invoice drafting, validation, signing, submission, status checking, and document listing.

  **@hacienda-cr/mcp** — MCP Server exposing invoice creation, status checking, document retrieval, taxpayer lookup, and reference data as AI-accessible tools and resources.

### Patch Changes

- Updated dependencies
  - @hacienda-cr/shared@0.1.0
  - @hacienda-cr/sdk@0.1.0
