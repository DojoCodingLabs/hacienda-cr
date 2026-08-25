# @dojocoding/hacienda-sdk

## 0.3.0

### Minor Changes (BREAKING — pre-1.0)

- **Builders now emit the official Hacienda v4.4 document structure.** Previous releases emitted the v4.3 body under v4.4 namespaces and were rejected by schema validation. All 8 document types now validate against the official XSDs (both the 2024 base and the April 2026 revision, vendored under `schemas/`), enforced by an xmllint conformance suite in CI:
  - `ProveedorSistemas` and `CodigoActividadEmisor` emitted at the root; `MedioPago` inside `ResumenFactura`; `CodigoCABYS`/`CodigoTarifaIVA` renames; `TotalDesgloseImpuesto` and NoSujeto totals; per-document variants (REP reduced schema, FEE line shape, NC/ND `PartidaArancelaria`).
  - Namespaces corrected to the official lowerCamelCase fragments and `schemaLocation` to `*_V4.4.xsd`.
  - Clave layer: v4.4 document-type codes (05 FEC / 06 FEE / 07 REP — the stale v4.3 confirmation codes are gone) and alphanumeric taxpayer segment per the April 2026 revision.
  - Tax calculator: v4.4 exoneration semantics (`tarifaExonerada` tariff points), synthetic exempt-IVA entry for untaxed lines, `totalDesgloseImpuesto` computation, and clear errors for legacy v4.3-shaped inputs.
  - Validator: v4.4 business rules; `totalImpuesto` required whenever line items carry tax.
- Requires `@dojocoding/hacienda-shared@0.3.0`. See `MIGRATION.md` at the repository root.

### Patch Changes

- Updated dependencies
  - @dojocoding/hacienda-shared@0.3.0

## 0.2.0

### Minor Changes

- Rename npm scope from `@hacienda-cr` to `@dojocoding` for DojoCoding ecosystem branding. All packages now published under the `@dojocoding` org. No API changes.

### Patch Changes

- Updated dependencies
  - @dojocoding/hacienda-shared@0.2.0

## 0.1.0

### Minor Changes

- Initial public release of hacienda-cr — TypeScript SDK, CLI, and MCP Server for Costa Rica electronic invoicing (Hacienda API v4.4).

  **@dojocoding/hacienda-shared** — Shared types, Zod schemas, and constants for all 7 document types, tax codes, and identification types.

  **@dojocoding/hacienda-sdk** — Core SDK with OAuth2 authentication, 50-digit clave generation/parsing, XML builder, XAdES-EPES digital signing, API client with submission/polling, and document builders for all 7 electronic document types.

  **@dojocoding/hacienda-cli** — `hacienda` CLI binary for login, invoice drafting, validation, signing, submission, status checking, and document listing.

  **@dojocoding/hacienda-mcp** — MCP Server exposing invoice creation, status checking, document retrieval, taxpayer lookup, and reference data as AI-accessible tools and resources.

### Patch Changes

- Updated dependencies
  - @dojocoding/hacienda-shared@0.1.0
