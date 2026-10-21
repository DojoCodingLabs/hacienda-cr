# @dojocoding/hacienda-cli

## 0.12.0

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

### Patch Changes

- de74384: Complete October 2026 v4.4 compatibility in the legacy Number APIs: accept ten-character alphanumeric legal entity IDs and special three-digit phones; expose specific-tax data with five-decimal alcohol proportions and amount-only ISC calculation; include applicable specific taxes in the IVA base and all net taxes in totals. Carry updated fields through MCP and allow alphanumeric claves in CLI document queries. Preserve existing reference catalogs, public v4.4 field names, foreign-ID handling, and strict exact-API boundaries.

  Recalculate stored mixed-tax totals. Offline XSD validation does not establish live Hacienda acceptance.

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

- 7c800ab: Accept the full IDP username issued by Tico Factura without changing hyphens or the environment domain. SDK credentials support `username` plus `password`, with the existing identification-based format retained as a fallback. CLI login accepts `--username` or `HACIENDA_USERNAME`, saves the username separately from the taxpayer ID, and shared CLI/MCP bootstrap restores it (with an environment override). Profiles may omit a configured signing certificate by using an empty certificate path, allowing login to save successfully.
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

### Patch Changes

- 4e89886: Harden cancellation, submission deadlines, response/XML limits, certificate
  readiness, secret-safe diagnostics and retry semantics. Fix standalone MCP ESM
  startup and validate inputs before sequence allocation. Update security-sensitive
  dependencies and add hostile-input, cryptographic, local HTTP lifecycle,
  multiprocess sequence and installed-package regression suites.

  Submission timeout now covers POST and polling; POST/PATCH are not automatically
  retried. HTTP requests default to a 30-second deadline and reject redirects.
  See docs/security-hardening.md for input caps and remaining trust boundaries.

- Updated dependencies [eaf7cff]
- Updated dependencies [4e89886]
  - @dojocoding/hacienda-sdk@0.4.0
  - @dojocoding/hacienda-shared@0.4.0

## 0.3.0

### Minor Changes (BREAKING — pre-1.0)

- Draft wizard and templates produce v4.4-shaped documents (`proveedorSistemas`, `codigoActividadEmisor`, emisor `ubicacion`, payment methods inside `resumenFactura`). Tax-free lines carry the required exempt IVA entry and foreign receivers are collected as ID type 05, so `hacienda draft` output always passes `hacienda submit` validation. Pickers include the v4.4 payment methods (05/06/07) and IVA rates 09–11.

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
