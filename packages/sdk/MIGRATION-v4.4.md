# Audit-fix migration notes

## Next additive exact total NC API (unreleased)

Existing numeric and exact FE inputs remain unchanged. New shared
`ExactNcTotalInputSchema` and SDK `calculateExactNcTotal` /
`buildExactNotaCreditoTotalXml` support only full cancellation of one ordinary
IVA13 FE in CRC/USD. Supply the unchanged strict exact original, independent
NC 03 identity/emission and one explicit matching FE 01 reference with code 01 and
a nonblank 3–180-Unicode-character reason. All monetary/quantity/payment/FX values remain strings;
caller-supplied NC totals or separate credit lines are rejected. Credit values
are positive full-original magnitudes, not a refund or signed ledger amount.

Applications must independently prove accepted immutable source authority,
unused credit amount, permissions and durable idempotency. No SDK boolean
establishes acceptance. Partial credits, ND and rejected-FE replacement remain
separate cases. The minor Changeset is not a published release; adopt only after
reviewed linked release artifacts exist. See the repository
`docs/specs/exact-total-nc.md` for primary XSD/reference evidence and limits.

NC source chronology preserves every accepted fractional-second digit and
timezone equivalence. NC-inapplicable sale conditions 09/11/12/13 and party
identification 05/06 are rejected; credit conditions 02/10 require positive
explicit days. These NC-only checks do not rewrite the original or change FE 0.6.
The caller must enforce the current annex's ten-year reference limit against
trusted actual issuance/submission time. The deterministic SDK has no hidden
clock, reference-age proof or invented 29 February anniversary policy; unresolved
calendar boundaries must block app activation.

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

## Additive exact ordinary FE API (0.6.0)

`calculateExactFe` and `buildExactFacturaXml` accept the new `ExactFeInput`;
shared exports its `ExactFeInputSchema` and calculated-output schema. This is
an opt-in, source-fact API; existing numeric DTOs/calculators/builders and the
CLI/MCP behavior are unchanged. Do not cast a Number DTO into this input or
convert exact strings to Number at JSON/XML boundaries.

Use decimal strings for quantity (XSD16 significant digits/up to3 decimals),
price/discount/payment/exchange amounts (up to5 decimals, max9999999999999.99999)
and percentage discounts (up to5 decimals). The explicit case code is
`FE-domestic-ordinary-iva13-v1`: IVA01/tariff08/rate string13, normal transaction
omitted or01, positive unit/gross/net, CABYS-consistent service/goods and fully
allocated payments. Gift/bonus discount01/02/03, other taxes, exonerations,
free/special transactions, other charges and references are rejected.

The exact calculator uses documented per-line five-decimal HALF_UP boundaries
and returns JSON-safe decimal strings. The XML builder recalculates from source
facts, rejects supplied totals and emits exact decimal text. It does not prove
CABYS catalog existence, tax applicability, legal signing or real Hacienda
acceptance. Preserve immutable source/provenance and first signed bytes in the
consumer. Broader fiscal cases require their own reviewed contract.

## Pending minor release: observed history metadata

The next reviewed pre-1.0 minor release corrects `listComprobantes` and `getComprobante` without changing fiscal FE/NC calculation, XML/signing or POST contracts. Lists return one bounded metadata page and raw observed range headers; detail returns metadata/references, not original XML, status or response bytes. Dates and old identification filter names are rejected before auth. Use combined domestic `emisor` / `receptor`, preserve exact string identifiers and current alphanumeric claves, and use `getStatus` separately.

See the [complete migration and limits](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/history-contract.md). Applications must review adoption separately from historical immutable SDK 0.7 FE/NC proofs and cases; a new package version does not relabel stored evidence, enable fiscal transport or certify backfill coverage. Published 0.7.0 remains unchanged until release authorization.

## October 2026 compatibility updates

The legal entity identification (`tipo: "02"`) accepts exactly ten ASCII
alphanumeric characters, without separators. Other supported identification
types retain their numeric formats. The existing alphanumeric clave support is retained. Claves remain 50 characters: legal entity
IDs occupy positions 10–21 with two leading zeros. Dates, consecutive numbers,
situation and security codes remain numeric. No letters are removed or converted.
Use the actual ID issued by Registro Nacional; support in the SDK does not imply
that an invented alphanumeric ID is registered with Hacienda.

Phone numbers accept ordinary 8–20 digit numbers and three-digit special service
numbers such as `911`. The MCP invoice tool now accepts optional issuer and
receiver `telefono` objects too.

`Impuesto.tarifa` remains optional for amount-only ISC and non-tariff taxes.
For `calculateLineItemTotals`, use `{ codigo: "02", monto: 100 }` for an explicit
ISC amount, or `{ codigo: "02", tarifa: 5 }` for a percentage. Supplying both
requires the amount to agree with the percentage calculation.

Alcohol tax (`04`) uses the following structure instead of a percentage tarifa:

```ts
{
  codigo: "04",
  datosImpuestoEspecifico: {
    cantidadUnidadMedida: 333.33,
    porcentaje: 12.34,
    proporcion: 41.13292,
    impuestoUnidad: 1,
  },
}
```

`proporcion` supports five decimal places (10 total digits) and must equal
`cantidadUnidadMedida * porcentaje / 100`, rounded to five decimals. The tax is
`cantidad * proporcion * impuestoUnidad`, rounded only after multiplication.
The SDK serializes `DatosImpuestoEspecifico` in official XSD order. Codes 03,
05 and 06 also accept their structured data. The calculator requires an explicit
`monto` for code 05 because beverages and toilet soap have different formulas.

Recalculate existing mixed-tax lines and summaries: the IVA base includes ISC
and taxes 04/05; `impuestoNeto`, line totals and invoice totals include all net
taxes. The previous implementation counted only IVA in these totals. These
calculations cover ordinary detail lines; surtidos and taxes assumed by the
issuer or collected at the factory need their own document modeling.

Reference document types 19/20 and reasons 13–16 were already included in the
bundled official schemas. Reason 17 remains exclusive to REP. Hacienda's
implementation notice sets November 1, 2026 for the new reference codes;
the provider's October 21 release date is not a separate schema version.

Sources: [Hacienda notice](https://www.hacienda.go.cr/docs/ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf),
[Anexos y Estructuras v4.4](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf).

These updates apply to the legacy Number APIs. The additive exact APIs retain
their existing supported-case boundaries and strict input contracts.
