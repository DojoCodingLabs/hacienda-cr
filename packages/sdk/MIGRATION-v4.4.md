# Audit-fix migration notes

## 0.4.2 → 0.5.0

All four linked `@dojocoding/hacienda-{shared,sdk,cli,mcp}` packages advance to
0.5.0. This pre-1.0 minor changes signing policy wire bytes and rejects two
incorrect catalog inputs; review these changes before upgrading.

- Generated XAdES uses the official `/xml-schemas/` policy identifier and SHA-256
  digest of the reviewed PDF. The signer now passes the precomputed digest via
  xadesjs' supported `digestValue`; the previous nested `hash.value` was ignored.
  Independently validate signatures rather than comparing the old policy bytes.
- Exoneration 12 is unsupported by the unchanged official XSD and is rejected.
  Code 06 uses `SERVICIOS_TURISTICOS_ICT`; the old `TRANSITORIO_IX` accessor remains
  deprecated. Ohm uses the exact official U+2126 `Ω`, not Greek U+03A9 `Ω`.
- Corrected 0.4.2 document codes remain FEC 08, FEE 09, REP 10. Historical aliases
  retain those values. Claves remain 50 numeric digits; identity/date/consecutive/rate
  validation introduced in 0.4.2 is preserved.
- `verifyHaciendaResponseXml` now authenticates a bounded MensajeHacienda root,
  expected frozen clave/issuer/receiver/decimal total and explicit reviewed
  current leaf-certificate pins before returning accepted/rejected. Embedded
  KeyInfo and API JSON status do not establish trust. Import
  `ResponseVerificationError` to handle safe reason codes; retain original
  response bytes/hash and keep unverified evidence unknown.
- Applications must separately approve institutional pin provenance/rotation,
  distrust/revocation policy and real response acceptance. The API does not
  automatically acquire a production trust store or validate a CA chain.
- Public monetary Number DTOs are unchanged. Full exact-decimal DTO/calculation
  migration remains separate; never coerce unsupported values to Number merely
  to pass validation. SDK issue 69 still tracks the unpatched node-forge advisory.

For the complete verifier contract and source provenance, see
[response verification](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/specs/hacienda-response-verification.md)
and [A2 readiness](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/specs/a2-policy-catalog-readiness.md).
Offline verification does not establish live Hacienda acceptance.

[SDK reference](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/reference.md) · [Sandbox walkthrough](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/sandbox-guide.md) · [Production integration](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/production-integration.md)

Continue using the v4.4 fields introduced in the root `MIGRATION.md`.
The MCP `create_invoice` tool now requires `proveedorSistemas`: supply the actual
invoicing system provider identification number. Draft templates leave it as a
placeholder instead of assuming the issuer is the provider.

Invoice summaries now use gross sales and deduct discounts once. Recalculate
stored summaries for discounted invoices. Input validation reconciles sales,
discounts, net sales, and other charges with the document detail.

`validateDocumentXml(xml)` validates offline against the existing vendored 2026
v4.4 XSDs, bundled into the SDK. Unsigned drafts are allowed by default. Pass
`{ requireSignature: true }` for submission. Present signatures are structurally
validated; cryptographic verification and Hacienda acceptance remain separate.
The CLI checks unsigned and signed XML before sending, and rejected submissions
return a nonzero exit code in both text and JSON modes.

Sequence resets and increments share a lock. A timeout does not remove another
writer's lock. After a crash, verify no writer is running before manually
removing the reported lock directory.

## HTTP and submission behavior in 0.4.0

`submitAndWait` applies its timeout to submission and polling together. Pass an
`AbortSignal` through its options to cancel the operation. HTTP requests default
to a 30-second budget including authentication, retries and response reads; use
`HttpClientOptions.requestTimeoutMs` to configure it. Token requests have an
independent 30-second cap. Authenticated requests reject redirects.

POST/PATCH calls are no longer automatically retried. After an ambiguous failure,
query status with the same clave before deciding whether to resubmit; a lost
response does not mean Hacienda did not receive the document.

Validation/signing rejects XML over 8 MiB, more than 128 levels or 100,000
elements, DTD/entity declarations, and malformed signing input. At most four XSD
validations run concurrently; retry a busy result after one completes. API
responses are capped at 8 MiB and token responses at 64 KiB. Signing requires a
currently valid RSA certificate of at least 2048 bits with a matching private key;
PKCS#12 input is capped at 1 MiB.

See the [security scope and remaining boundaries](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/security-hardening.md),
including the unpatched Forge verification advisory. These checks do not establish
certificate-chain trust or real Hacienda acceptance.
