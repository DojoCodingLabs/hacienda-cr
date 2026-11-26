# Document-family support matrix

What this repository can build, validate, sign and submit for each Hacienda
document family, and which real Hacienda evidence exists. Reviewed 2026-11-26
against `main` after 0.14.0.

The machine-readable source is the SDK's `getFamilySupport()`. The CLI prints it
with `hacienda support [--json]`, and the MCP server exposes it as the
`hacienda://reference/family-support` resource. Keep this page and that function
in step.

Each column is separate evidence. Passing input validation, XSD conformance or a
local signature check does not establish Hacienda acceptance. A sandbox
acceptance does not establish production acceptance.

## Matrix

| Family                            | Codes    | Legacy Number builder | Decimal-text builder | Exact builder (named cases)                                         | XSD conformance¹ | Signing² | Submit      | Sandbox evidence      | Production evidence |
| --------------------------------- | -------- | --------------------- | -------------------- | ------------------------------------------------------------------- | ---------------- | -------- | ----------- | --------------------- | ------------------- |
| FE Factura Electrónica            | 01       | yes                   | yes                  | ordinary IVA13 (`buildExactFacturaXml`), replacement                | yes              | tested   | allowed     | accepted, SDK 0.12.1³ | none                |
| TE Tiquete Electrónico            | 04       | yes                   | yes                  | `buildExactTiqueteXml`                                              | yes              | tested   | allowed     | accepted, SDK 0.12.1³ | none                |
| NC Nota de Crédito                | 03       | yes                   | yes                  | total and partial                                                   | yes              | tested   | unverified  | none                  | none                |
| ND Nota de Débito                 | 02       | yes                   | yes                  | `buildExactNotaDebitoXml`                                           | yes              | tested   | unverified  | none                  | none                |
| FEC Factura Electrónica de Compra | 08       | yes                   | yes                  | domestic ordinary IVA13, foreign-service IVA13, used personal goods | yes              | tested   | unverified⁴ | none                  | none                |
| FEE Factura de Exportación        | 09       | yes                   | yes                  | none                                                                | yes              | untested | unverified  | none                  | none                |
| REP Recibo Electrónico de Pago    | 10       | yes                   | yes                  | none                                                                | yes              | untested | **refused** | none                  | none                |
| MR Mensaje Receptor               | 05/06/07 | yes                   | yes                  | source-only (`buildExactMensajeReceptorXml`)                        | yes              | tested   | **refused** | none                  | none                |

1. The legacy builder fixtures validate against both vendored official XSD
   generations (2024 and 2026) with native `xmllint`
   (`packages/sdk/src/documents/xsd-conformance.integration.spec.ts`). The exact
   builders have their own native XSD tests. Conformance covers the fixtures, not
   every possible input.
2. The signer (`signXml`, XAdES-EPES) is generic. "tested" means a synthetic
   signed document of that family passes signed-XSD validation in the test suite.
   A synthetic certificate proves XML mechanics, not signer authority.
3. A factura and a tiquete built and signed with SDK 0.12.1 reached a terminal
   `aceptado` in the sandbox. See [sandbox 403 investigation](testing/sandbox-403-debug.md).
4. See [FEC POST party mapping](#fec-post-party-mapping-open-question).

"Submit: allowed" means the SDK submits the family and a real sandbox acceptance
is recorded. "unverified" means the SDK submits it but no real acceptance is
recorded. "refused" means the SDK throws before signing or POST. No family has
production evidence.

Roadmap item P0-9 refers to "family 09/10 (REP)". Code 09 is the export invoice
(FEE), not REP. FEE is not gated; it is unverified.

## Tax-code caveats

IVA 08 (IVA Régimen de Bienes Usados, factor) is computed as
`factorCalculoIVA × subtotal` (Anexos v4.4, pp. 37, 39, 42) by the legacy
Number calculators, the decimal-text `DecimalDocument*` path, the legacy
validator and MCP `create_invoice`. `Tarifa` and `CodigoTarifaIVA` are optional
for 08. Exoneración on an 08 line is refused on every path because the Anexo
does not define its amount ([roadmap](roadmap.md) P0-4c). No exact builder has
an 08 named case, and no 08 document has sandbox evidence.

## Refused families

The SDK throws `UnsupportedDocumentFamilyError` (code
`HaciendaErrorCode.UNSUPPORTED_FAMILY`, with `family`, `reason` and `docsUrl`)
for REP and MR. The check runs:

- in `submitDocument` and `submitAndWait`, before any persistence or network
  access;
- in `hacienda submit`, before reading the certificate or signing;
- in your own code, via `assertSubmittableDocument({ clave, xml })`, before
  signing.

A document is refused when its XML root is `ReciboElectronicoPago` or
`MensajeReceptor`, or when the request carries `consecutivoReceptor`. When the
root is not a known Hacienda document, a clave document type of 10 or 05–07 is
refused instead. An MR carries the original document's clave, so for an MR only
the root or `consecutivoReceptor` can identify it.

The XML builders stay available and are not submittable: `buildReciboPagoXml`,
`buildDecimalReciboPagoXml`, `buildMensajeReceptorXml`,
`buildDecimalMensajeReceptorXml` and `buildExactMensajeReceptorXml`. Use them for
source, XSD and archive work only.

### REP

The exact monetary projection of a real partial payment into the reduced REP
line and summary is unresolved. The annex fixes the field meanings, but several
contradictory mappings pass the native XSD, and no official worked REP 10
example or written clarification selects one. The gate lifts only with that
oracle. See [REP monetary oracle research](rep-monetary-oracle-research.md).

### MR

POST /recepcion requires `consecutivoReceptor` for a confirmation message.
`SubmissionRequest` (`shared/src/types/api.ts`) does not carry it. There is also
no receiver-specific outcome oracle: the status GET and the signed
MensajeHacienda do not distinguish the original invoice's outcome from the
message's. See [MR transport correlation research](mr-transport-correlation-research.md).

## FEC POST party mapping (open question)

Status: **not conclusive.** FEC stays "submit: unverified". The current behavior
is unchanged, and the sandbox runner refuses a live FEC POST without an explicit
acknowledgement.

### What the primary sources settle

Sources retrieved 2026-11-26:

- [Anexos y Estructuras v4.4](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf),
  99 pages, SHA256
  `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`.
- [Reglamento de comprobantes electrónicos 44739-H](https://www.hacienda.go.cr/docs/REGLAMENTO_DE_COMPROBANTES_ELECTRONICOS.pdf),
  SHA256 `32da4200481b6c21522d4ace59e5255e15aae0624be077594dc65195189fe4fc`.
- [Comprobantes Electrónicos API v1](https://www.hacienda.go.cr/docs/ComprobantesElectronicosAPI.html),
  SHA256 `acd185b7e92d58250e835b929e0d3bbc17fe058b5304dc6fd1a1fbcc6f359b0d` on
  this retrieval.

These sources settle three points:

1. **XML Emisor is the supplier; XML Receptor is the buyer.** In the annex,
   Emisor identification type 05 (Extranjero No Domiciliado) is "de uso
   exclusivo" for FEC, and type 06 (No Contribuyente) is allowed only in FEC
   (p. 19). Footnotes 17 and 18 (p. 69) tie both to "los Datos del Emisor de la
   Factura Electrónica de Compra" for purchases from non-domiciled suppliers and
   used goods sold by a non-contributor. Those are the sellers FEC exists for.
2. **The buyer issues, signs and sends the FEC.** The annex says: "En caso de la
   Factura de Compra la misma debe de ser firmada por el Receptor que es quien la
   emite y la envía al validador" (p. 60). The Reglamento defines FEC as the
   "documento electrónico que emite el adquirente" (art. 2, definition 13, PDF p. 7).
3. **The clave taxpayer segment is the buyer's.** The annex says the segment is
   the "número de cédula del emisor" (p. 67). Nota 4.1 (p. 69) gives clave
   formats only for types 01–04, not for 05/06, so a foreign or non-contributor
   supplier cannot fill it. The buyer is the comprobante's legal issuer and owns
   the 08 consecutive. This is an inference, but every source is consistent with
   it. The SDK already enforces it (`validateDocumentIdentity`, type 08), and so
   do the runner's `FAMILY_IDENTITY` and the coherent-reference rehearsal, which
   builds the FEC clave from the buyer.

The P0-7 task brief assumed the reverse ("the XML's Emisor is the buyer"). That
is incorrect: the buyer appears in the XML as Receptor.

### What they leave open

The API documentation's POST body has a required `emisor` and an optional
`receptor`, each `{ tipoIdentificacion (≤2), numeroIdentificacion (≤12) }`. It
defines no FEC-specific mapping, and its one example uses the same
identification for both parties. Nothing says whether `emisor` means the XML
Emisor (supplier) or the comprobante's issuer (buyer, owner of the clave).

One fact points to the buyer. `numeroIdentificacion` is capped at 12
characters, but a type 05 supplier identification can be up to 20 (annex p. 19).
The supplier therefore cannot always be expressed as `emisor`. The same page
still carries legacy v4.2 navigation and predates types 05/06, so the cap may
simply be stale. This is a hint, not a rule.

### Current behavior

- **Sandbox runner** (`scripts/validate-sdk-sandbox.mjs`): sends
  `emisor` = XML Emisor (supplier) and `receptor` = XML Receptor (buyer). The
  clave is bound to the buyer. A live FEC `submit` fails with
  `FEC_PARTY_MAPPING_UNVERIFIED` unless
  `HACIENDA_SANDBOX_FEC_ACK=party-mapping-unverified` is set, in addition to the
  usual submit opt-in.
- **CLI** (`hacienda submit`): builds and submits only FE input, so it never
  sends an FEC. The generic request it composes uses the XML Emisor as
  `emisor`.
- **SDK** (`submitDocument` / `submitAndWait`): sends the caller's
  `SubmissionRequest` unchanged and does not pick FEC parties.
- **Coherent-reference rehearsal**: records the registry `emisor` as the buyer.
  It does not POST.

### What would close it

Either a written Hacienda clarification of the FEC POST `emisor`/`receptor`
semantics, or one separately authorized, controlled sandbox FEC run that
records the accepted mapping. A rejection proves little on its own, because it
can have other causes. Once the rule is known, encode it in one SDK helper
(roadmap P0-7, `buildSubmissionRequest(document)`), add a test per family, and
remove the runner acknowledgement.
