# @dojocoding/hacienda-shared

## 0.4.1

### Patch Changes

- Align the shared package with the coordinated 0.4.1 SDK, CLI, and MCP patch release. No shared schema or runtime behavior changes are included.

## 0.4.0

- Declare Node.js 22+ and public package metadata; verify installed TypeScript consumers and ship corrected upgrade documentation.

### Patch Changes

- 4e89886: Harden cancellation, submission deadlines, response/XML limits, certificate
  readiness, secret-safe diagnostics and retry semantics. Fix standalone MCP ESM
  startup and validate inputs before sequence allocation. Update security-sensitive
  dependencies and add hostile-input, cryptographic, local HTTP lifecycle,
  multiprocess sequence and installed-package regression suites.

  Submission timeout now covers POST and polling; POST/PATCH are not automatically
  retried. HTTP requests default to a 30-second deadline and reject redirects.
  See docs/security-hardening.md for input caps and remaining trust boundaries.

## 0.3.0

### Minor Changes (BREAKING — pre-1.0)

- **Hacienda v4.4 structural compliance.** Types, Zod schemas, and constants now model the official v4.4 "Anexos y Estructuras" exactly (verified against the official XSDs):
  - `codigoActividad` renamed to `codigoActividadEmisor`; new required `proveedorSistemas`; optional `codigoActividadReceptor` and `condicionVentaOtros`.
  - `medioPago` moved from the document root into `resumenFactura.medioPago` — entries of `{ tipoMedioPago, medioPagoOtros?, totalMedioPago }` (up to 4).
  - `Impuesto.codigoTarifa` renamed to `codigoTarifaIVA`; IVA rate codes 09–11 added; `Exoneracion` uses the v4.4 shape (`tarifaExonerada`, coded `nombreInstitucion`, `tipoDocumentoOtros`, `articulo`/`inciso`).
  - `Descuento` requires `codigoDescuento`; `OtroCargo` uses `tipoDocumento`/`identificacionTercero`/`montoCargo`; `InformacionReferencia` gains `tipoDocOtros`/`codigoOtros` with codes from the April 2026 revision (13–16, 17 REP-only, doc types 19–20).
  - `Emisor.ubicacion` required (no `fax`); `Receptor` drops `identificacionExtranjero` in favor of ID type `05` + `otrasSenasExtranjero`; identification types `05`/`06` added.
  - Official catalogs vendored verbatim: 101 units of measure, full ISO-4217 currency list, v4.4 sale conditions (REP-only 09/11 in `REP_SALE_CONDITIONS`).
  - Clave schemas accept an alphanumeric taxpayer segment (April 2026 revision, mandatory 2026-11-01); all other segments stay numeric.
  - Fixed sandbox API base URL (`recepcion-sandbox` path) and production logout URL.
- Catalog schemas are now derived from the constants (`TaxCodeSchema`, `IvaRateCodeSchema`, `PaymentMethodSchema`, `SaleConditionSchema`, `ExonerationTypeSchema`), so catalog additions happen in one place.

See `MIGRATION.md` at the repository root for the 0.2 → 0.3 migration guide.

## 0.2.0

### Minor Changes

- Rename npm scope from `@hacienda-cr` to `@dojocoding` for DojoCoding ecosystem branding. All packages now published under the `@dojocoding` org. No API changes.

## 0.1.0

### Minor Changes

- Initial public release of hacienda-cr — TypeScript SDK, CLI, and MCP Server for Costa Rica electronic invoicing (Hacienda API v4.4).

  **@dojocoding/hacienda-shared** — Shared types, Zod schemas, and constants for all 7 document types, tax codes, and identification types.

  **@dojocoding/hacienda-sdk** — Core SDK with OAuth2 authentication, 50-digit clave generation/parsing, XML builder, XAdES-EPES digital signing, API client with submission/polling, and document builders for all 7 electronic document types.

  **@dojocoding/hacienda-cli** — `hacienda` CLI binary for login, invoice drafting, validation, signing, submission, status checking, and document listing.

  **@dojocoding/hacienda-mcp** — MCP Server exposing invoice creation, status checking, document retrieval, taxpayer lookup, and reference data as AI-accessible tools and resources.
