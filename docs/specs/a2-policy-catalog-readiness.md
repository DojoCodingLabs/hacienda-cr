# Reviewed A2 policy and catalog runtime slice

This focused change starts from SDK 0.4.2/main `1ab7d2e` and uses the original PR #59 proposal as prior evidence, without merging its unsafe A3 Money boundary or overwriting maintenance identity/rate/date/consecutive guards. PR #57's broader generation pipeline and PR #58's historical conformity report retain their independent ownership. Current document codes08/09/10 and deprecated aliases are preserved; this is not a claim they remained unfixed after 0.4.2.

## Primary-source provenance

Reviewed 17 October 2026:

- [Official current Annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf), Annex 2 printed p. 85 and policy example printed p. 88: exact `xml-schemas` URL (including hyphen), SHA256 method and policy digest. Do not remove a hyphen while joining a PDF-wrapped URL. HTTP403 from the old typo alone would not establish the contract; the official identifier is the source.
- [Official policy PDF](https://cdn.comprobanteselectronicos.go.cr/xml-schemas/Resoluci%C3%B3n_General_sobre_disposiciones_t%C3%A9cnicas_comprobantes_electr%C3%B3nicos_para_efectos_tributarios.pdf): verified200 using system TLS/curl; 163479 bytes; SHA256hex `0d6c629f5c5639e23c3ae5905dace1e158cb5806822c003de787a6ec3321d21f`; Base64 `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=`. These bytes equal the unchanged vendored resolution file. No new legal/PDF content was invented or reformatted.
- Catalog values are compared directly with named `TipoExoneracionType` and `UnidadMedidaType` in the unchanged vendored 2026 FE XSD; byte/hash manifest checks remain mandatory. Unsupported12 is removed;06 is Servicios turísticos ICT; the official Ohm token is U+2126, not U+03A9. The06 old accessor remains a deprecated alias, not a new fiscal category.

Current official annex bytes differ from the retained historical 98-page annex: current 99-page SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`, retained SHA256 `2e36bd1101bbcabbb391ab1ec8ffc3773b93031341c7d98a05a5d0f0887d4305`. This slice verifies the policy contract and selected unchanged XSD tokens; it does not silently refresh every schema or assert whole-annex parity. A broader source refresh requires a separately reviewed semantic diff. The [official adjustment communication](https://www.hacienda.go.cr/docs/ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf) remains relevant to that review.

## Actual signature correction and oracle

Changing constants alone is insufficient. xadesjs 2.6.8 ignores a `value` nested in hash options; absent its documented `digestValue`, it hashes the Identifier XML instead. An initial expected-red regression observed emitted `J1xW9BIa/pQfzIeQt2wGCfL3sX+8CcvGbgOhcuuGEW8=` instead of the policy PDF's digest. The signer now uses typed `hash:SHA-256` and `digestValue`, with no cast. The HTTPS identifier no longer carries an OIDAsURN qualifier absent from the official example.

The offline oracle uses native libxml2 `xmllint --c14n` (including ancestor namespace context), computes document and SignedProperties reference hashes independently, and verifies RSA-SHA256 with OpenSSL against the generated synthetic certificate. It rejects modified document, policy and SignatureValue bytes. This is independent from xadesjs signing/verification, uses no credential/network, and requires native xmllint plus OpenSSL in verification environments. Temporary synthetic public/signature files are cleaned. It does **not** establish institutional certificate trust or real Hacienda acceptance.

Manifest tests compare emitted constants/algorithm/identifier to the manifest, independently hash the retained PDF, and reject the path typo. Packed consumers check the actual signed XML and shared catalogs after native ESM installation; source-only tests are not the package release gate.

## Migration and release boundary

Policy identifier/hash/method wire bytes change; independently validating consumers must review the new official policy. Invalid exoneration 12 is rejected before XML; correct caller treatment rather than coercing it to another code. Replace GreekOmega U+03A9 with the exact reviewed Ohm token U+2126 only where Ohm is the intended unit. Use `SERVICIOS_TURISTICOS_ICT` for 06; the historical alias remains. `COMPRA_PAGO`/`GASTO_VIAJE` still map08/09 as in0.4.2; no accidental numeric rollback or alias removal.

The user-approved release plan treats this pre-1.0 breaking wire/catalog correction as a minor release 0.5.0 across linked packages; it does not promote 1.0 while Money and response trust work remain pending. No version preparation or publication occurs before that review. Public numeric DTOs remain the 0.4.2 interface: this change does not solve their full valid-domain exactness. A separately reviewed exact string/decimal DTO schema→calculation→XML→JSON round-trip migration is required; PR #59's normalization back to Number is not imported.

Institutional response verification/trust policy is a following focused SDK slice; a self-signed mathematical verification never proves Hacienda origin. Keep node-forge advisory issue #69 visible and re-audit its actual call paths. No dependency override, live authentication/submission, cloud resource, app enablement or production trust configuration follows from these tests.

## Verification checkpoint

On the isolated A2 branch, `pnpm verify` passed: formatting, 23-file source manifest, lint/types/build, shared230 + SDK1051 + CLI71 + MCP47 tests, 118 script regressions and installed tarball ESM/TypeScript/CLI/MCP checks including actual policy emission. The four live-authentication tests remained intentionally skipped by the offline gate. `openspec validate --all --strict` passed the scoped change. The independent oracle passed positive signature/reference checks and document/policy/SignatureValue tamper rejection. No real fiscal call, original dirty-checkout edit, version preparation or publication occurred. `pnpm test:coverage` also passed all eight tasks (shared 100%, SDK 95.86% statements; four intentional live skips). Independent review remains a release prerequisite.
