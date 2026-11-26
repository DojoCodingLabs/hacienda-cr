# @dojocoding/hacienda-sdk

## 0.14.0

### Minor Changes

- 4d12b71: Add additive exact decimal-text document DTOs, calculation and XML builders for all seven v4.4 documents and `MensajeReceptor` in the shared/SDK API. The CLI (draft validation/submission) and MCP (`create_invoice_exact`) exact inputs are Factura Electrónica (01) only. Decimal bounds follow the official XSD (`TarifaExonerada` and the alcohol `Porcentaje` allow 4 digits with 2 decimals) and an IVA `tarifa` must match its `codigoTarifaIVA`. Like the current exact family, line discounts cascade on the remaining base (each strictly smaller than it) and `medioPago` is required unless the sale condition is 02, 08 or 10. CLI drafts saved by 0.13.0 with a numeric `tarifa` keep loading and keep their verbatim XML bytes. Existing `Number` APIs and published bytes remain unchanged; this change does not promote 1.0.
- 207a71f: Add a callback envelope parser (`parseCallbackPayload`, `validateCallbackPayload`, `CallbackEnvelopeSchema`) for Hacienda callback payloads.

  The parser reads Hacienda's hyphenated keys (`clave`, `fecha`, `ind-estado`,
  `respuesta-xml`), validates the clave with the shared schema and `ind-estado`
  against `HaciendaStatus`, and throws `ValidationError` on malformed JSON,
  oversize bodies, non-strict Base64 or invalid UTF-8. `parseCallbackPayload`
  additionally requires the decoded response to be a `MensajeHacienda` that
  passes XSD validation with a required signature and whose `Clave` equals the
  envelope clave. Structural validation does not authenticate the signature; use
  `verifyHaciendaResponseXml` before trusting the response.

- eb28cd7: Correct two exact-family rules against Anexos v4.4.

  **Discounts cascade on the remaining base.** In every current exact
  calculator (FE, TE, total and partial NC, ND, FEC, FEC foreign service, FE
  replacement and FEC used-personal goods), each line discount now applies to the
  base that remains after the previous discount. Percentages are rounded HALF_UP
  to five decimals; absolute amounts are carried unchanged. Only lines where a
  percentage discount follows another discount change; for them `montoDescuento`,
  `subTotal`, `baseImponible`, tax and totals differ. Example: a line
  of 100 with two 10% discounts was 10.00000 + 10.00000 (subtotal 80.00000,
  total 90.40000) and is now 10.00000 + 9.00000 (subtotal 81.00000, total
  91.53000). Callers that computed `medioPago` from the old rule must recompute
  it, or the payment reconciliation rejects the document. A discount that
  consumes the whole remaining base still throws the same `RangeError`.

  `calculateRetainedExactFe` keeps its frozen historical rule: every percentage
  is computed on the line gross, and the line is rejected with the same
  `RangeError` as before when the sum of the discounts reaches the gross.

  **`medioPago` is conditional.** It is required unless the governing sale
  condition is 02, 08 or 10. When present it still holds 1–4 allocations that
  must equal the invoice total. When it is absent or empty, the calculated summary
  has no `medioPago` and the XML has no `MedioPago` node. The governing condition
  is the document's own for FE, TE, FEC, FEC foreign service and FE replacement,
  the original's for total NC, partial NC and ND, and the literal 13 (never
  exempt) for FEC used-personal goods.

  This is a type-level change. `medioPago` is now optional in `ExactFeInput`,
  `ExactTeInput`, `ExactFecInput`, `ExactFecForeignServiceIva13Input`,
  `ExactNcPartialInput` and `ExactNdInput`, and in the FE they carry (`original`
  of `ExactNcTotalInput`, `ExactNcPartialInput` and `ExactNdInput`; `replacement`
  of `ExactFeReplacementInput`). It is also optional in
  `ExactFeSummarySchema`, so `ExactFeCalculated["resumenFactura"]["medioPago"]`
  and the calculated types derived from it may be `undefined`. Code that reads
  `resumenFactura.medioPago` must handle that case. The FEC used-personal goods
  calculated summary still requires at least one allocation.

  New shared export: `RetainedExactFeCalculatedSchema` (and the
  `RetainedExactFeCalculated` type), which requires the non-empty historical
  allocation of the retained calculator's output. The broad
  `ExactFeCalculatedSchema` decoder still reads historical zero allocations.

- 207a71f: Add `classifyOutcome` to classify a status query by clave into a delivery outcome.

  `classifyOutcome(response, error?, { expectedClave? })` reads Hacienda's
  `ind-estado` (from `getStatus`'s `status` or the raw body) and returns a
  discriminated `DeliveryOutcome`: `success` (`aceptado`), `rejected`
  (`rechazado`), `pending` (`recibido`/`procesando`, received and still
  processing; never resubmit), `transport_error` (the query itself failed) or
  `unknown` (missing or unrecognized state, Hacienda `error`, or another clave).
  `classifySendResult` is unchanged.

- 207a71f: Add `reconcileByClave` for durable delivery recovery after an ambiguous submission.

  `reconcileByClave(httpClient, clave)` validates the clave with the shared
  clave schema (alphanumeric taxpayer segment allowed) before any network access,
  queries `GET /recepcion/{clave}` and returns a discriminated `ReconcileResult`:
  `{ kind: "found", status }`, `{ kind: "not_found" }` for 404 (never received,
  safe to resubmit the same clave) or `{ kind: "unknown", error }` for 5xx,
  network errors, timeouts or a response for another clave. It never submits a
  document or allocates a consecutive.

- 0b034cc: Refuerza la validación semántica de `InformacionReferencia` (Ítem 1 de `docs/testing/sdk-robustness-audit.md`):

  - `tipoDoc === "99"` requiere `tipoDocOtros` (y viceversa); `codigo === "99"` requiere `codigoOtros` (y viceversa).
  - `ReciboElectronicoPago` admite el motivo de referencia `"17"` (pago de comprobante); otros documentos lo rechazan.
  - La referencia del REP exacto exige `numero` (el XSD del REP exige `Numero`); `RepInformacionReferenciaSchema` y `DecimalRepReferenceSchema` se exportan.
  - IVA `"07"` (cálculo especial) exige `codigoTarifaIVA`; la correspondencia `tarifa` ↔ `codigoTarifaIVA` solo aplica a `"01"`.
  - IVA `"08"` (bienes usados) exige `factorCalculoIVA`.

  Es un endurecimiento de entrada: documentos que antes se aceptaban con `tipoDoc`/`codigo` `"99"` sin su texto `*Otros` (o con `*Otros` sin `"99"`), con `codigo` `"17"` fuera del REP, o con una referencia REP exacta sin `numero`, ahora se rechazan. `codigo` sigue siendo opcional para cualquier `tipoDoc`, y el esquema legado sigue descartando claves desconocidas. En paquetes pre-1.0 esto es un cambio de ruptura (`minor`). Consulta `MIGRATION.md` para los patrones de corrección.

- 207a71f: Add an explicit `Scope` (`ScopeSchema`, `ScopeEnvironmentSchema`, `ScopeIssuerSchema`, `fingerprintScope`) for multi-tenant SDK consumers, and scope-aware MCP client caching.

  `Scope` carries an optional `tenantId`, the `environment` and the issuer
  (`idType` validated with `CedulaTypeSchema`). It is meant for services built on
  the SDK; the CLI and MCP tools do not accept a scope and derive it from the
  selected profile. The MCP client cache now validates the derived scope with
  `ScopeSchema`, rejects a scope that does not match the profile with
  `SCOPE_IDENTITY_MISMATCH`, keys clients by profile and scope, and keeps at most
  16 authenticated clients (least recently used evicted). Numbering is unchanged:
  `tenantId` is not part of any sequence key.

- 8eabd30: Load PKCS#12 credentials only when the parser is installed.

  `node-forge` is now an optional peer dependency instead of a required runtime
  dependency. Consumers that never call `loadP12` no longer install it and no
  longer inherit its open advisory in `npm audit --omit=dev`.

  **Action required:** consumers that call `loadP12` or `signXml` (which loads the
  `.p12` through `loadP12`) must now add `node-forge` to their own dependencies:

  ```bash
  npm install node-forge
  ```

  Without it, `loadP12` rejects with an actionable `SigningError` before reading
  the file and never echoes the PIN. Parsing, the 1 MiB limit, RSA >= 2048,
  certificate validity, key/certificate matching and signing behavior are
  unchanged when the parser is present. Issue #69 remains open: this reduces
  exposure, it does not replace the library.

- 207a71f: Add a shared `fetchWithTimeout` (and `FetchWithTimeoutOptions`) exported from the package root, use it in `HttpClient` and `TokenManager`, and sanitize secrets when SDK errors are constructed.

  `fetchWithTimeout` bounds a request until its headers arrive, defaults to
  `redirect: "error"`, honours an external `init.signal` and removes its timer
  and abort listener when it settles. `TokenManager` keeps one request-scoped
  deadline across the token fetch and every body read, so an IDP that sends
  headers and then stalls the body still fails within `requestTimeoutMs`.
  `HaciendaError`, `ApiError`, `ValidationError` and `AuthError` now redact
  configured credentials and credential syntax from their messages, response
  bodies and details at construction time.

- 446e6a7: Vendor the official 2025–2026 holiday calendar and stop inferring Monday transfers.

  The SDK now accepts civil dates in 2025 and 2026. The calendar keeps the nominal
  date unless an official source enumerates a transfer, in which case an explicit
  per-year `observed` override is used. The previous 2026-only range, the stale
  transfer docstring and the duplicated `CALENDAR_RANGE` are replaced by the
  vendored JSON as the single source of truth.

  `pnpm holidays:watch` is a maintenance job, not a runtime path: it probes a
  control year and the next year, reports whether the letter is unpublished or the
  URL pattern changed, and never edits the calendar without review.

### Patch Changes

- b82fd93: Correct the documented meaning of `reconcileByClave`'s `not_found` result. A 404 doesn't prove Hacienda never received the POST, because the document may not be indexed yet. Re-query with backoff inside a reconciliation window. Resubmit only the same signed bytes under the same clave, and only after that window. Runtime behaviour is unchanged.
- 2b38188: Stop redacting short and boolean-like values of secret-named environment variables.

  Environment-derived redaction previously treated the value of every variable
  whose name contained `PIN`, `TOKEN`, `SECRET` and similar as a secret, with no
  minimum length. `COREPACK_ENABLE_AUTO_PIN=0` therefore replaced every `0` in
  diagnostics (`409` became `4[REDACTED]9`). Known Hacienda credentials
  (`HACIENDA_PASSWORD`, `HACIENDA_P12_PIN`, `HACIENDA_USERNAME`) are still
  redacted from 4 characters; other secret-named variables only from 8
  characters. Boolean-like values (`0`, `1`, `true`, `false`, `yes`, `no`, `on`,
  `off`) are never treated as secrets.

- b5a1fea: Check status by clave when a resend gets 400 without a document store.

  `submitAndWait` without a store now queries `GET /recepcion/{clave}` when reception answers 400. If Hacienda already accepted the document, it returns the accepted result instead of
  throwing. Otherwise the original 400 is thrown unchanged.

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
- Updated dependencies [eb28cd7]
- Updated dependencies [0b034cc]
- Updated dependencies [39dfb47]
  - @dojocoding/hacienda-shared@0.14.0

## 0.13.0

### Minor Changes

- a2e45f0: Expose the exact decimal kernel as additive aliases.

  `multiplyExactDecimal`, `percentExactDecimal`, `sumExactDecimal` and
  `EXACT_MONEY_SCALE` re-export the reviewed `multiply`, `percent`, `sum` and
  `MONEY_SCALE` primitives. They let `hacienda draft` reuse the exact kernel
  without duplicating arithmetic. The existing primitives keep their behaviour.

### Patch Changes

- 884f6b8: Document how to override the sandbox reception host.

  Hacienda has not confirmed the `api-sandbox` host and the v4.4 annex still lists the
  old route. If the host changes again, pass your own `envConfig` with a custom
  `apiBaseUrl` (for example `{ ...getEnvironmentConfig(Environment.Sandbox), apiBaseUrl }`)
  to `TokenManager` and `HttpClient` instead of waiting for a release.

- a97627e: Point the sandbox at `api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1`.

  The previous URL fails at the API gateway with 403 `IncompleteSignatureException`
  for any bearer token, so no document could reach the sandbox.

- Updated dependencies [884f6b8]
- Updated dependencies [a97627e]
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

## 0.11.0

### Minor Changes

- de74384: Complete October 2026 v4.4 compatibility in the legacy Number APIs: accept ten-character alphanumeric legal entity IDs and special three-digit phones; expose specific-tax data with five-decimal alcohol proportions and amount-only ISC calculation; include applicable specific taxes in the IVA base and all net taxes in totals. Carry updated fields through MCP and allow alphanumeric claves in CLI document queries. Preserve existing reference catalogs, public v4.4 field names, foreign-ID handling, and strict exact-API boundaries.

  Recalculate stored mixed-tax totals. Offline XSD validation does not establish live Hacienda acceptance.

### Patch Changes

- Updated dependencies [de74384]
  - @dojocoding/hacienda-shared@0.11.0

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

## 0.9.0

### Minor Changes

- 72a7670: Require positive one-to-five-digit credit days for current exact FE conditions 02/10 and reject any explicitly supplied zero term while preserving valid leading-zero lexemes. Preserve the existing REP-only 09/11 exclusion and additionally reject FEC-only 13 in current exact FE inputs, while preserving other valid FE conditions and historical read-only 13 compatibility. Add an explicitly read-only retained exact FE schema/calculator for independently bound historical 0.6–0.8 source facts; it does not provide an XML builder or grant signing/transport authority. Legacy Number APIs are unchanged. CLI/MCP participate in the coordinated linked release; no new adapter endpoint or fiscal activation is introduced.

### Patch Changes

- Updated dependencies [72a7670]
  - @dojocoding/hacienda-shared@0.9.0

## 0.8.0

### Minor Changes

- 813e329: Correct the read-only Hacienda history contract across all four packages. Lists consume metadata arrays, combined domestic party filters and observed 200/206 range headers; details return metadata/references rather than promised XML/status. Reject unsupported date/legacy filters before authentication and propagate SDK request cancellation and MCP history-request signals (preexisting shared MCP bootstrap remains internally time-bounded, not caller-cancelled). Preserve wrapper names and exact identifier strings, with an explicit pre-1.0 minor migration for removed fictional total/status/XML fields. No automatic paging, completeness claim, live Hacienda verification or fiscal mutation changes.

### Patch Changes

- Updated dependencies [813e329]
  - @dojocoding/hacienda-shared@0.8.0

## 0.7.0

### Minor Changes

- cf1db1e: Add a strict exact-string total credit note for one ordinary domestic IVA13 FE in CRC/USD. Preserve existing numeric and exact FE contracts. New source-only calculator/builder require a matching original FE reference and an independent NC identity; no partial credit, rejected-document replacement, refund or fiscal acceptance is inferred.

  Compare full ISO fractional-second chronology, require the current annex's 3–180-character reason and reject NC-inapplicable copied sale/party/credit-term facts. The caller must independently enforce the ten-year reference limit using its trusted actual issuance/submission clock; no hidden clock or invented leap-anniversary rule is added.

### Patch Changes

- Updated dependencies [cf1db1e]
  - @dojocoding/hacienda-shared@0.7.0

## 0.6.0

### Minor Changes

- f5db7b8: Add `ExactFeInputSchema`/`ExactFeCalculatedSchema`, string-only monetary/quantity
  schemas and `calculateExactFe`/`buildExactFacturaXml` for explicitly named
  `FE-domestic-ordinary-iva13-v1`. Use scaled BigInt with documented five-decimal
  half-up boundaries and canonical exact XML strings. Preserve legacy Number APIs;
  reject unsupported regimes, coercion, overflow and inconsistent full payment
  allocation. Exclude special transaction02–13, gift/bonus discount01–03 and zero-net/free lines; enforce the declared CABYS service/goods prefix classification without claiming a full catalog lookup. No fiscal activation or CLI/MCP migration is implied.

### Patch Changes

- Updated dependencies [f5db7b8]
  - @dojocoding/hacienda-shared@0.6.0

## 0.5.0

### Minor Changes

- eab0cef: Add an offline, explicitly pinned MensajeHacienda XMLDSig verifier. Validate the
  exact signed root, expected document/party/total context, SHA-256/RSA references,
  leaf pin and certificate validity before returning accepted/rejected. Embedded
  KeyInfo never authorizes a signer. Applications must provision independently
  reviewed institutional pins; CA-chain, revocation and live acceptance remain
  separate operational requirements. No implicit terminal status from API JSON.
- 3d9b0df: Align the reviewed A2 runtime subset with official policy/catalog evidence, without importing the unmerged Money migration. Generated XAdES now contains the exact `/xml-schemas/` policy identifier and SHA256 of the retained official PDF. The signer uses xadesjs' supported precomputed `digestValue`; the previous `hash.value` cast was ignored and hashed the identifier XML instead.

  Release compatibility: signed policy wire bytes change. Exoneration12 (unsupported by the official XSD) and the wrong Ohm homograph are rejected. Use U+2126 for Ohm and the canonical `SERVICIOS_TURISTICOS_ICT` accessor for 06; its historical alias remains deprecated. Corrected0.4.2 document codes and aliases remain intact. Public monetary number DTOs and maintenance identity/rate guards are unchanged.

  Independent libxml2/OpenSSL checks verify reference digests/RSA and reject tampering; packed consumers verify actual policy emission. This does not establish institutional response trust, certificate-chain/revocation status, full exact-decimal DTO integrity or real Hacienda acceptance. See docs/specs/a2-policy-catalog-readiness.md and existing advisory issue #69 before release/activation.

### Patch Changes

- Updated dependencies [3d9b0df]
  - @dojocoding/hacienda-shared@0.5.0

## 0.4.2

### Patch Changes

- b6b25b4: Correct shared fiscal document codes, preserve current official schema provenance, enforce document identity and tax consistency, and use Costa Rica calendar dates in claves. Scope MCP invoice numbering by issuer/environment and invalidate authenticated clients after profile or credential changes. Preserve existing HTTP cancellation and redirect protections, make token deadlines configurable, disable mutation replays by default, and redact diagnostic secrets. Add regression coverage and document actual sandbox reception failures separately from offline test success. Live acceptance of all document families remains a release gate.
- Updated dependencies [b6b25b4]
  - @dojocoding/hacienda-shared@0.4.2

## 0.4.1

### Patch Changes

- 7c800ab: Accept the full IDP username issued by Tico Factura without changing hyphens or the environment domain. SDK credentials support `username` plus `password`, with the existing identification-based format retained as a fallback. CLI login accepts `--username` or `HACIENDA_USERNAME`, saves the username separately from the taxpayer ID, and shared CLI/MCP bootstrap restores it (with an environment override). Profiles may omit a configured signing certificate by using an empty certificate path, allowing login to save successfully.
- 682bce8: Reject unsupported simplified sandbox-example fields instead of silently dropping them, require boolean service classification, block partial submission snapshots before authentication, and verify polling responses match the saved document identity.
- Updated dependencies
  - @dojocoding/hacienda-shared@0.4.1

## 0.4.0

- Declare Node.js 22+ and public package metadata; verify installed TypeScript consumers and ship corrected upgrade documentation.

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

- Updated dependencies [4e89886]
  - @dojocoding/hacienda-shared@0.4.0

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
