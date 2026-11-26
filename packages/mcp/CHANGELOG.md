# @dojocoding/hacienda-mcp

## 0.14.0

### Minor Changes

- 4d12b71: Add additive exact decimal-text document DTOs, calculation and XML builders for all seven v4.4 documents and `MensajeReceptor` in the shared/SDK API. The CLI (draft validation/submission) and MCP (`create_invoice_exact`) exact inputs are Factura Electrónica (01) only. Decimal bounds follow the official XSD (`TarifaExonerada` and the alcohol `Porcentaje` allow 4 digits with 2 decimals) and an IVA `tarifa` must match its `codigoTarifaIVA`. Like the current exact family, line discounts cascade on the remaining base (each strictly smaller than it) and `medioPago` is required unless the sale condition is 02, 08 or 10. CLI drafts saved by 0.13.0 with a numeric `tarifa` keep loading and keep their verbatim XML bytes. Existing `Number` APIs and published bytes remain unchanged; this change does not promote 1.0.

### Patch Changes

- 207a71f: Add an explicit `Scope` (`ScopeSchema`, `ScopeEnvironmentSchema`, `ScopeIssuerSchema`, `fingerprintScope`) for multi-tenant SDK consumers, and scope-aware MCP client caching.

  `Scope` carries an optional `tenantId`, the `environment` and the issuer
  (`idType` validated with `CedulaTypeSchema`). It is meant for services built on
  the SDK; the CLI and MCP tools do not accept a scope and derive it from the
  selected profile. The MCP client cache now validates the derived scope with
  `ScopeSchema`, rejects a scope that does not match the profile with
  `SCOPE_IDENTITY_MISMATCH`, keys clients by profile and scope, and keeps at most
  16 authenticated clients (least recently used evicted). Numbering is unchanged:
  `tenantId` is not part of any sequence key.

- 39dfb47: Raise dependency floors past published security advisories.

  - `node-forge` `^1.4.4` (SDK optional peer, CLI dependency). Forge 1.4.1–1.4.4
    fix the advisories reported against 1.4.0–1.4.2, including GHSA-jc66-7q78-782g
    (PKCS#12 MAC forgery and constant-key PBE with a zero iteration count, which is
    reachable through `loadP12`), GHSA-6qrw-m8cv-hcxf and GHSA-86w9-cpqp-85rv (RSA
    PKCS#1 v1.5 DigestInfo forgery), GHSA-7wch-p9px-956x (PEM decoding ReDoS) and
    GHSA-rhr8-3pm8-cq29 (ASN.1 BIT STRING resource exhaustion). Consumers that call
    `loadP12` or `signXml` must have `node-forge` 1.4.4 or later.
  - `zod` `^4.6.7` in every package (GHSA-mrhx-c7xc-m3w5, memory exhaustion
    while validating oversized constrained collections).
  - `fast-xml-parser` `^5.12.0` in the SDK (GHSA-474x-hrwr-fgx4, quadratic scan of
    unterminated stop-node tags).
  - `@modelcontextprotocol/sdk` `^1.32.2` in the MCP server. The lockfile now resolves
    patched `body-parser`, `hono`, `@hono/node-server`, `qs`, `fast-uri` and
    `ip-address` within the existing transitive ranges; no runtime override is added.

  No API, signing behavior or XML output changes.

- Updated dependencies [4d12b71]
- Updated dependencies [207a71f]
- Updated dependencies [eb28cd7]
- Updated dependencies [207a71f]
- Updated dependencies [207a71f]
- Updated dependencies [0b034cc]
- Updated dependencies [207a71f]
- Updated dependencies [8eabd30]
- Updated dependencies [b82fd93]
- Updated dependencies [2b38188]
- Updated dependencies [b5a1fea]
- Updated dependencies [39dfb47]
- Updated dependencies [207a71f]
- Updated dependencies [446e6a7]
  - @dojocoding/hacienda-shared@0.14.0
  - @dojocoding/hacienda-sdk@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [a2e45f0]
- Updated dependencies [884f6b8]
- Updated dependencies [a97627e]
  - @dojocoding/hacienda-sdk@0.13.0
  - @dojocoding/hacienda-shared@0.13.0

## 0.12.1

### Patch Changes

- Normalize malformed XML namespace failures to safe structured signature-verification
  errors, suppress parser diagnostics and keep legacy XML errors generic. Preserve
  explicit pinning and all valid-signature checks. Keep the four public package
  versions aligned. The v0.12.0 publication workflow was cancelled and its tag is
  preserved; this correction uses a new immutable 0.12.1 release identity.
- Updated dependencies
  - @dojocoding/hacienda-shared@0.12.1
  - @dojocoding/hacienda-sdk@0.12.1

## 0.12.0

Prepared release; its publication workflow was cancelled. Included in 0.12.1.

### Minor Changes

- 40ed072: Add generated catalogs and opt-in bounded decimal schemas while preserving legacy Number APIs.
  Add strict legacy builder XML inversion, pinned EPES document verification, a bounded official
  2026 civil calendar and explicit persistent delivery. Fix the signer Signature Id/Target binding.
  Persist sequence and signed document bytes in one synchronized ledger; never reuse issued numbers.
  The transport simulator stays a private workspace tool. No new fiscal acceptance claims or
  automatic replay after ambiguous submission are introduced.

### Patch Changes

- Updated dependencies [40ed072]
  - @dojocoding/hacienda-shared@0.12.0
  - @dojocoding/hacienda-sdk@0.12.0

## 0.11.0

### Minor Changes

- de74384: Complete October 2026 v4.4 compatibility in the legacy Number APIs: accept ten-character alphanumeric legal entity IDs and special three-digit phones; expose specific-tax data with five-decimal alcohol proportions and amount-only ISC calculation; include applicable specific taxes in the IVA base and all net taxes in totals. Carry updated fields through MCP and allow alphanumeric claves in CLI document queries. Preserve existing reference catalogs, public v4.4 field names, foreign-ID handling, and strict exact-API boundaries.

  Recalculate stored mixed-tax totals. Offline XSD validation does not establish live Hacienda acceptance.

### Patch Changes

- Updated dependencies [de74384]
  - @dojocoding/hacienda-sdk@0.11.0
  - @dojocoding/hacienda-shared@0.11.0

## 0.10.0

### Patch Changes

- Updated dependencies [7d5891a]
- Updated dependencies [e7c4fdc]
- Updated dependencies [a59d968]
- Updated dependencies [6381143]
- Updated dependencies [6297a5b]
- Updated dependencies [43feefa]
- Updated dependencies [e8fa2ed]
- Updated dependencies [a1e0e1c]
  - @dojocoding/hacienda-shared@0.10.0
  - @dojocoding/hacienda-sdk@0.10.0

## 0.9.0

### Minor Changes

- 72a7670: Require positive one-to-five-digit credit days for current exact FE conditions 02/10 and reject any explicitly supplied zero term while preserving valid leading-zero lexemes. Preserve the existing REP-only 09/11 exclusion and additionally reject FEC-only 13 in current exact FE inputs, while preserving other valid FE conditions and historical read-only 13 compatibility. Add an explicitly read-only retained exact FE schema/calculator for independently bound historical 0.6–0.8 source facts; it does not provide an XML builder or grant signing/transport authority. Legacy Number APIs are unchanged. CLI/MCP participate in the coordinated linked release; no new adapter endpoint or fiscal activation is introduced.

### Patch Changes

- Updated dependencies [72a7670]
  - @dojocoding/hacienda-shared@0.9.0
  - @dojocoding/hacienda-sdk@0.9.0

## 0.8.0

### Minor Changes

- 813e329: Correct the read-only Hacienda history contract across all four packages. Lists consume metadata arrays, combined domestic party filters and observed 200/206 range headers; details return metadata/references rather than promised XML/status. Reject unsupported date/legacy filters before authentication and propagate SDK request cancellation and MCP history-request signals (preexisting shared MCP bootstrap remains internally time-bounded, not caller-cancelled). Preserve wrapper names and exact identifier strings, with an explicit pre-1.0 minor migration for removed fictional total/status/XML fields. No automatic paging, completeness claim, live Hacienda verification or fiscal mutation changes.

### Patch Changes

- Updated dependencies [813e329]
  - @dojocoding/hacienda-shared@0.8.0
  - @dojocoding/hacienda-sdk@0.8.0

## 0.7.0

### Patch Changes

- Updated dependencies [cf1db1e]
  - @dojocoding/hacienda-shared@0.7.0
  - @dojocoding/hacienda-sdk@0.7.0

## 0.6.0

### Patch Changes

- Updated dependencies [f5db7b8]
  - @dojocoding/hacienda-shared@0.6.0
  - @dojocoding/hacienda-sdk@0.6.0

## 0.5.0

### Minor Changes

- 3d9b0df: Align the reviewed A2 runtime subset with official policy/catalog evidence, without importing the unmerged Money migration. Generated XAdES now contains the exact `/xml-schemas/` policy identifier and SHA256 of the retained official PDF. The signer uses xadesjs' supported precomputed `digestValue`; the previous `hash.value` cast was ignored and hashed the identifier XML instead.

  Release compatibility: signed policy wire bytes change. Exoneration12 (unsupported by the official XSD) and the wrong Ohm homograph are rejected. Use U+2126 for Ohm and the canonical `SERVICIOS_TURISTICOS_ICT` accessor for 06; its historical alias remains deprecated. Corrected0.4.2 document codes and aliases remain intact. Public monetary number DTOs and maintenance identity/rate guards are unchanged.

  Independent libxml2/OpenSSL checks verify reference digests/RSA and reject tampering; packed consumers verify actual policy emission. This does not establish institutional response trust, certificate-chain/revocation status, full exact-decimal DTO integrity or real Hacienda acceptance. See docs/specs/a2-policy-catalog-readiness.md and existing advisory issue #69 before release/activation.

### Patch Changes

- Updated dependencies [eab0cef]
- Updated dependencies [3d9b0df]
  - @dojocoding/hacienda-sdk@0.5.0
  - @dojocoding/hacienda-shared@0.5.0

## 0.4.2

### Patch Changes

- b6b25b4: Correct shared fiscal document codes, preserve current official schema provenance, enforce document identity and tax consistency, and use Costa Rica calendar dates in claves. Scope MCP invoice numbering by issuer/environment and invalidate authenticated clients after profile or credential changes. Preserve existing HTTP cancellation and redirect protections, make token deadlines configurable, disable mutation replays by default, and redact diagnostic secrets. Add regression coverage and document actual sandbox reception failures separately from offline test success. Live acceptance of all document families remains a release gate.
- Updated dependencies [b6b25b4]
  - @dojocoding/hacienda-sdk@0.4.2
  - @dojocoding/hacienda-shared@0.4.2

## 0.4.1

### Patch Changes

- Updated dependencies
- Updated dependencies [7c800ab]
- Updated dependencies [682bce8]
  - @dojocoding/hacienda-shared@0.4.1
  - @dojocoding/hacienda-sdk@0.4.1

## 0.4.0

- Declare Node.js 22+ and public package metadata; verify installed TypeScript consumers and ship corrected upgrade documentation.
- Report the package manifest version in CLI/MCP metadata instead of a hardcoded version.

### Minor Changes

- eaf7cff: Validate XML offline against the vendored Hacienda v4.4 schemas before submission.
  Fix discount totals, reconcile summaries with detail, serialize sequence resets
  and increments, and enforce concurrent API rate limits. Return nonzero CLI exit
  codes for rejected submissions. MCP invoice creation requires the actual system
  provider ID and validates generated documents; its JSON schema resource now
  reflects the tool input schema.
- 4e89886: Harden cancellation, submission deadlines, response/XML limits, certificate
  readiness, secret-safe diagnostics and retry semantics. Fix standalone MCP ESM
  startup and validate inputs before sequence allocation. Update security-sensitive
  dependencies and add hostile-input, cryptographic, local HTTP lifecycle,
  multiprocess sequence and installed-package regression suites.

  Submission timeout now covers POST and polling; POST/PATCH are not automatically
  retried. HTTP requests default to a 30-second deadline and reject redirects.
  See docs/security-hardening.md for input caps and remaining trust boundaries.

### Patch Changes

- Updated dependencies [eaf7cff]
- Updated dependencies [4e89886]
  - @dojocoding/hacienda-sdk@0.4.0
  - @dojocoding/hacienda-shared@0.4.0

## 0.3.0

### Minor Changes (BREAKING — pre-1.0)

- `create_invoice` and `draft_invoice` tools and the `factura-schema` resource now speak the v4.4 contract (`proveedorSistemas`, `codigoActividadEmisor`, required emisor `ubicacion`, single `medioPago` code emitted inside `ResumenFactura`, `codigoTarifaIVA`, `codigoDescuento`, ID types 05/06). `unidadMedida` is validated against the official catalog and location fields enforce the v4.4 bounds.

### Patch Changes

- Updated dependencies
  - @dojocoding/hacienda-sdk@0.3.0
  - @dojocoding/hacienda-shared@0.3.0

## 0.2.0

### Minor Changes

- Rename npm scope from `@hacienda-cr` to `@dojocoding` for DojoCoding ecosystem branding. All packages now published under the `@dojocoding` org. No API changes.

### Patch Changes

- Updated dependencies
  - @dojocoding/hacienda-shared@0.2.0
  - @dojocoding/hacienda-sdk@0.2.0

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
  - @dojocoding/hacienda-sdk@0.1.0
