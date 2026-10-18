# @dojocoding/hacienda-shared

## 0.10.0

### Minor Changes

- 7d5891a: Add exact-string ordinary partial NC amount correction and independently valid
  FE replacement with an explicit institutionally rejected FE reference. Preserve
  existing current/retained and Number APIs. Source math/XML does not establish
  acceptance, cumulative credit authority, legal age, cash receipt or live activation.
- e7c4fdc: Add a bounded exact domestic ordinary IVA13 FEC source/calculator/XML API. Preserve actual supplier Emisor and buyer Receptor, buyer-owned 08 identity, mandatory buyer activity and explicit supporting evidence. Derived amounts remain decimal text. Existing FE/TE/ND/NC and legacy behavior remain unchanged; foreign 05 and used-goods 06/condition 13 need separate reviewed source contracts. No publication, supplier qualification, VAT eligibility or app activation is implied.
- a59d968: Add an exact ordinary domestic FE-reference ND amount-increment source contract, independent decimal calculation and genuine ND02 XML builder. Explicit original line/reference binding preserves original facts while calculating only positive incremental amounts. Also align the unreleased exact TE issuer-name minimum with native XSD (five Unicode characters); ND copied issuer/receiver/commercial names enforce their own native Unicode bounds. Existing FE/NC/current/retained and Number APIs remain unchanged. This contributes to the single coherent domestic V1 release tracked in #85; no publication, legal-age eligibility or app activation is implied.
- 6381143: Add source-only exact ordinary domestic TE schemas, calculation and XML building with optional actual receiver. Monetary strings never pass through Number. Existing FE/current/retained and legacy Number APIs remain compatible. No new family activation, retained signing builder or live acceptance is implied; this source slice contributes to the coherent domestic V1 release tracked in issue #85.
- 6297a5b: Add an explicitly selected foreign-service ordinary IVA13 FEC source/calculator/XML
  contract. Preserve actual supplier 05 and foreign address/reference 16/reason 11,
  buyer-owned 08 identity, positive exact allocations and existing family outputs.
  Supplier identity does not establish tax liability, eligibility, creditability or
  acceptance; used-goods06/condition 13 and other regimes remain separately required.
  No publication or app activation is implied.
- 43feefa: Add source-bound exact recipient confirmation for ordinary domestic FE, with
  original full tax/total and buyer-owned message consecutive. Preserve legacy
  Number APIs. Source/native/signature structure does not establish tax entitlement,
  institutional acceptance, legal timing or recipient transport/recovery authority.
- e8fa2ed: Add an explicitly selected exact non-subject personal-used-goods FEC source with
  supplier06, buyer-owned08 identity, condition13, tariff11, ordinary commercial
  discounts and exact positive allocations. This does not infer qualification,
  credit, tax payment, resale treatment, acceptance or transport authority.
- a1e0e1c: Validate current exact FE party names against native Unicode bounds and require
  positive supplied payment allocations (including new exact TE). Preserve the
  separate historical source/math and calculated-output decoding contracts, actual
  0.9 originals and legacy Number APIs. A future reviewed published producer tuple
  must distinguish this stricter current contract from retained 0.9; no release,
  app adoption or fiscal acceptance follows from the source change.

## 0.9.0

### Minor Changes

- 72a7670: Require positive one-to-five-digit credit days for current exact FE conditions 02/10 and reject any explicitly supplied zero term while preserving valid leading-zero lexemes. Preserve the existing REP-only 09/11 exclusion and additionally reject FEC-only 13 in current exact FE inputs, while preserving other valid FE conditions and historical read-only 13 compatibility. Add an explicitly read-only retained exact FE schema/calculator for independently bound historical 0.6–0.8 source facts; it does not provide an XML builder or grant signing/transport authority. Legacy Number APIs are unchanged. CLI/MCP participate in the coordinated linked release; no new adapter endpoint or fiscal activation is introduced.

## 0.8.0

### Minor Changes

- 813e329: Correct the read-only Hacienda history contract across all four packages. Lists consume metadata arrays, combined domestic party filters and observed 200/206 range headers; details return metadata/references rather than promised XML/status. Reject unsupported date/legacy filters before authentication and propagate SDK request cancellation and MCP history-request signals (preexisting shared MCP bootstrap remains internally time-bounded, not caller-cancelled). Preserve wrapper names and exact identifier strings, with an explicit pre-1.0 minor migration for removed fictional total/status/XML fields. No automatic paging, completeness claim, live Hacienda verification or fiscal mutation changes.

## 0.7.0

### Minor Changes

- cf1db1e: Add a strict exact-string total credit note for one ordinary domestic IVA13 FE in CRC/USD. Preserve existing numeric and exact FE contracts. New source-only calculator/builder require a matching original FE reference and an independent NC identity; no partial credit, rejected-document replacement, refund or fiscal acceptance is inferred.

  Compare full ISO fractional-second chronology, require the current annex's 3–180-character reason and reject NC-inapplicable copied sale/party/credit-term facts. The caller must independently enforce the ten-year reference limit using its trusted actual issuance/submission clock; no hidden clock or invented leap-anniversary rule is added.

## 0.6.0

### Minor Changes

- f5db7b8: Add `ExactFeInputSchema`/`ExactFeCalculatedSchema`, string-only monetary/quantity
  schemas and `calculateExactFe`/`buildExactFacturaXml` for explicitly named
  `FE-domestic-ordinary-iva13-v1`. Use scaled BigInt with documented five-decimal
  half-up boundaries and canonical exact XML strings. Preserve legacy Number APIs;
  reject unsupported regimes, coercion, overflow and inconsistent full payment
  allocation. Exclude special transaction02–13, gift/bonus discount01–03 and zero-net/free lines; enforce the declared CABYS service/goods prefix classification without claiming a full catalog lookup. No fiscal activation or CLI/MCP migration is implied.

## 0.5.0

### Minor Changes

- 3d9b0df: Align the reviewed A2 runtime subset with official policy/catalog evidence, without importing the unmerged Money migration. Generated XAdES now contains the exact `/xml-schemas/` policy identifier and SHA256 of the retained official PDF. The signer uses xadesjs' supported precomputed `digestValue`; the previous `hash.value` cast was ignored and hashed the identifier XML instead.

  Release compatibility: signed policy wire bytes change. Exoneration12 (unsupported by the official XSD) and the wrong Ohm homograph are rejected. Use U+2126 for Ohm and the canonical `SERVICIOS_TURISTICOS_ICT` accessor for 06; its historical alias remains deprecated. Corrected0.4.2 document codes and aliases remain intact. Public monetary number DTOs and maintenance identity/rate guards are unchanged.

  Independent libxml2/OpenSSL checks verify reference digests/RSA and reject tampering; packed consumers verify actual policy emission. This does not establish institutional response trust, certificate-chain/revocation status, full exact-decimal DTO integrity or real Hacienda acceptance. See docs/specs/a2-policy-catalog-readiness.md and existing advisory issue #69 before release/activation.

## 0.4.2

### Patch Changes

- b6b25b4: Correct shared fiscal document codes, preserve current official schema provenance, enforce document identity and tax consistency, and use Costa Rica calendar dates in claves. Scope MCP invoice numbering by issuer/environment and invalidate authenticated clients after profile or credential changes. Preserve existing HTTP cancellation and redirect protections, make token deadlines configurable, disable mutation replays by default, and redact diagnostic secrets. Add regression coverage and document actual sandbox reception failures separately from offline test success. Live acceptance of all document families remains a release gate.

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
