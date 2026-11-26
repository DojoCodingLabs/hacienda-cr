# Migration guide

## Next: opt-in HALF_UP rounding for the legacy Number calculators

Nothing changes unless you opt in. `round5`, `calculateTaxAmount`,
`calculateLineItemTotals`, `calculateInvoiceSummary` and MCP `create_invoice`
keep producing the same bytes as before.

**Background.** The legacy Number calculators round with `Number.toFixed(5)`,
which rounds the binary value. When the nearest double of an exact
sixth-decimal half lies just below the half, it rounds down: `20.203515`
becomes `20.20351`. Hacienda's rule is decimal HALF_UP at five decimals
("Anexos y Estructuras" v4.4, section II, p. 13-14), which gives `20.20352`.
The Anexo's own example (`20.203518 → 20.20352`) is not an exact half, so it
comes out the same under both rules. In a 2-million-case fuzz, 13% IVA on
2-decimal bases never diverged, 13% IVA on 5-decimal bases diverged in 0.32%
of cases (`80074.1975` → `10409.64567` instead of `10409.64568`), and
3-decimal quantity × price diverged in 2.9% (`0.999 × 1802.455` →
`1800.65254` instead of `1800.65255`).

**Recommended: the exact path.** `calculateDecimalDocument`,
`calculateDecimalLineItemTotals`, `calculateDecimalInvoiceSummary`,
`buildDecimalDocumentXml`, the `calculateExact*` builders, MCP
`create_invoice_exact` and `hacienda draft` already compute on bounded decimal
text with BigInt and round HALF_UP. Prefer them for new integrations; they need
no rounding option.

**Opt-in on the legacy path.** If you must stay on the Number API, select the
mode explicitly:

```ts
import { createLegacyCalculator } from "@dojocoding/hacienda-sdk";

const calculator = createLegacyCalculator({ roundingMode: "half-up" });
const lines = items.map(calculator.calculateLineItemTotals);
const summary = calculator.calculateInvoiceSummary(lines);
```

- `roundingMode: "legacy-tofixed"` (the default) is byte-identical to the
  standalone functions. `"half-up"` uses `round5HalfUp`, the shared exact
  kernel (`scaledFromNumber` + `formatScaledDecimal`).
- Use one calculator for the lines and the summary of a document, so modes
  never mix.
- In `"half-up"`, `NaN` and `±Infinity` throw `MonetaryValueError`. In
  `"legacy-tofixed"` they still pass through (`round5(NaN)` is `NaN`).
  Negative values round half away from zero.
- The existing consistency checks use the selected mode. In `"half-up"`, a
  caller-supplied IVA `monto` next to its `tarifa`, or an alcohol
  `proporcion`, must equal the HALF_UP result (within the same `0.000001`).
  A value precomputed with `toFixed` on an exact half is rejected.
- MCP `create_invoice` accepts `roundingMode: "legacy-tofixed" | "half-up"`
  (default `"legacy-tofixed"`).
- The CLI has no flag: `hacienda draft` already uses the exact HALF_UP path,
  and `hacienda submit`/`validate` do not recompute legacy Number amounts.
- `validateFacturaInput` still recomputes with `round5` and its existing
  `0.001` tolerance. HALF_UP documents differ by at most `0.00001` per rounded
  field, so they pass today. This interacts with the planned removal of that
  tolerance; the validator will need the same mode before it compares exactly.

**When to choose `"half-up"`.** Choose it for new documents whose amounts
come from fractional quantities or prices or 5-decimal bases, when you cannot
yet move to the exact path. Keep `"legacy-tofixed"` when you regenerate,
reconcile or re-sign historical documents: switching changes the bytes of
exact-half amounts, so a regenerated XML would no longer match what was
originally issued and accepted.

**Deprecation.** `"legacy-tofixed"` remains the default for every 0.x release.
It may stop being the default only in a future major release (1.0). If it
does, pass `{ roundingMode: "legacy-tofixed" }` explicitly wherever you need
historical bytes, and the release notes will say so.

## Next: endurecimiento de `InformacionReferencia` (referencias)

Los paquetes `@dojocoding/hacienda-shared` y `@dojocoding/hacienda-sdk` endurecen la entrada aceptada para `InformacionReferencia`. Esta es una corrección de validación que rompe consumidores que dependían de la permisividad anterior (paquetes pre-1.0: cambio `minor`).

Condiciones que ahora se rechazan:

1. `tipoDoc === "99"` sin `tipoDocOtros` (5-100 caracteres), o `tipoDocOtros` con `tipoDoc !== "99"`.
2. `codigo === "99"` sin `codigoOtros` (5-100 caracteres), o `codigoOtros` con `codigo !== "99"`.
3. En un documento que no sea `ReciboElectronicoPago`, referencia con `codigo === "17"` (motivo exclusivo del REP).
4. En el `ReciboElectronicoPago` exacto (`DecimalRepReferenceSchema` / `RepInformacionReferenciaSchema`), referencia sin `numero`: el XSD del REP exige `Numero`.

Además, IVA `"07"` (cálculo especial) exige `codigoTarifaIVA`; IVA `"08"` (bienes usados) exige `factorCalculoIVA`. La correspondencia numérica `tarifa` ↔ `codigoTarifaIVA` solo aplica a `"01"`.

`codigo` sigue siendo opcional para cualquier `tipoDoc` (XSD: `Codigo minOccurs="0"`), por lo que una referencia sin `codigo` sigue aceptándose. El esquema legado `InformacionReferenciaSchema` (y `FacturaElectronicaSchema`) sigue descartando claves desconocidas; solo la familia exacta (`DecimalReferenceSchema`) las rechaza.

Corrección típica:

```ts
// Antes (ahora rechazado): tipoDoc 99 sin su texto libre.
{ tipoDoc: "99", fechaEmision: "2025-07-27T10:30:00-06:00", codigo: "04" }

// Después:
{ tipoDoc: "99", tipoDocOtros: "Contrato de servicios", fechaEmision: "2025-07-27T10:30:00-06:00", codigo: "04" }

// Sigue aceptado (codigo es opcional):
{ tipoDoc: "01", fechaEmision: "2025-07-27T10:30:00-06:00" }

// REP: Numero es obligatorio.
{ tipoDoc: "01", numero: "<clave del comprobante pagado>", fechaEmision: "2025-07-27T10:30:00-06:00", codigo: "17" }
```

Consulta el change `fix-reference-catalog-semantics` y `docs/testing/sdk-robustness-audit.md` (Ítem 1) para el contexto completo.

## Next: reviewed additive SDK contracts

- Legacy Number inputs/calculators remain unchanged. New shared monetary schemas accept bounded decimal text or explicit rounding of an already binary Number. SDK kernel helpers remain internal.
- `parseDocumentXml` only inverts unsigned legacy-builder bytes without loss. It rejects alternate serialization, signed XML, unknown fields and amounts that cannot survive a Number DTO; it is not a general fiscal XML importer.
- New signatures retain the library-generated Id so QualifyingProperties Target identifies the same signature. The strict new EPES verifier rejects historical documents with mismatched Target; do not rewrite or re-sign historical fiscal documents to silence that check.
- Civil-calendar helpers cover only official 2026 dates. They do not determine exceptional closures or legal deadline origins.
- Persistent submit requires an explicit store. After an uncertain POST, resume queries by the same clave and bytes; no automatic resend. Durable issuance uses one canonical ledger shared with legacy counters, and reset cannot reuse issued numbers. See docs/open-pr-remediation.md for recovery and operational limits.
- Once durable issuance writes the versioned ledger, all writers sharing that config directory must use this SDK version. Older binaries only understand flat counters and must not share the upgraded directory; back up local state before deliberate adoption. There is no automatic downgrade or replay.

### `node-forge` becomes an optional peer dependency

`node-forge` is no longer a required runtime dependency of the SDK: it is an
optional peer resolved lazily inside `loadP12`. Consumers that never load a
`.p12` do not install it. Signing consumers need `node-forge` 1.4.4 or later.

**Action required** if you call `loadP12` or `signXml` directly: add
`node-forge` to your project's dependencies.

```bash
npm install node-forge
```

The CLI declares `node-forge` as its own dependency, so `hacienda sign` and
`hacienda submit` keep working from a default install.

Without the parser, the SDK installs and imports normally, but `loadP12`
rejects with an actionable `SigningError` before reading the file. Parsing, the
validations (1 MiB, RSA >= 2048, validity period, key/certificate match) and
signing are unchanged when the parser is present. Since 0.14.0 the peer and CLI
ranges require `node-forge` `^1.4.4`, which fixes the advisories reported against
1.4.0–1.4.2 (including GHSA-86w9-cpqp-85rv and GHSA-jc66-7q78-782g).

### `hacienda draft` en texto decimal exacto

El modo interactivo de `hacienda draft` emite `cantidad` y todos los montos como
texto decimal acotado (máximo 3 y 5 decimales respectivamente). Calcula con el
kernel BigInt del SDK y suma el resumen como enteros exactos, sin `number`,
`parseFloat` ni un `round5` local. La precisión superior a la escala declarada se
rechaza; no se redondea en silencio.

`hacienda submit` y `hacienda validate` detectan estos borradores y los validan
por la ruta exacta, incluida la validación XSD. Los archivos legacy con `number`
conservan el esquema, el validador y el constructor de XML publicados.

La regla de redondeo es cinco decimales, `HALF_UP`, según el Anexo de Hacienda
v4.4 (p. 13-14). La regla y su cita viven en
`shared/src/monetary/decimal-text.ts`. La exactitud offline no constituye
aceptación real por Hacienda.

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
  to pass validation. SDK issue 69 tracked the node-forge advisory; it is fixed in 1.4.1 and SDK 0.14.0 requires `node-forge` `^1.4.4`.

For the complete verifier contract and source provenance, see
[response verification](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/specs/hacienda-response-verification.md)
and [A2 readiness](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/specs/a2-policy-catalog-readiness.md).
Offline verification does not establish live Hacienda acceptance.

## Historical migration: 0.2.x → 0.3.0

**Why this release exists:** versions ≤ 0.2.0 emitted the Hacienda **v4.3** document body under v4.4 namespaces. Documents built with them fail validation against the official v4.4 XSD schemas and would be rejected by Hacienda. 0.3.0 emits the official v4.4 structure (verified against the government's own schemas, including the April 22, 2026 revision that becomes mandatory on 2026-11-01). **Do not use 0.1.x / 0.2.0 to generate documents.**

## Document input changes

| 0.2.x                                                         | 0.3.0                                                                                                                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codigoActividad: "620100"`                                   | `codigoActividadEmisor: "620100"` (+ optional `codigoActividadReceptor`)                                                                                          |
| —                                                             | `proveedorSistemas: "<cédula del proveedor de sistemas>"` (required, max 20 chars)                                                                                |
| `medioPago: ["01"]` at document root                          | `resumenFactura.medioPago: [{ tipoMedioPago: "01", totalMedioPago: <monto> }]` (1–4 entries, each with its amount)                                                |
| `impuesto[].codigoTarifa`                                     | `impuesto[].codigoTarifaIVA` (codes 01–11)                                                                                                                        |
| `impuesto[].exoneracion.porcentajeExoneracion` (% of the tax) | `impuesto[].exoneracion.tarifaExonerada` (exonerated **tariff points**, 0..tarifa)                                                                                |
| `exoneracion.nombreInstitucion` (free text)                   | coded value `"01"`–`"12"` / `"99"` (+ `nombreInstitucionOtros` when `"99"`)                                                                                       |
| `descuento[]` without code                                    | `descuento[].codigoDescuento` required (`"01"`–`"09"`, `"99"`)                                                                                                    |
| `otrosCargos[].montoOtroCargo`, `numeroIdentidadTercero`      | `montoCargo`, `identificacionTercero: { tipo, numero }`                                                                                                           |
| `receptor.identificacionExtranjero`                           | `receptor.identificacion: { tipo: "05", numero }` + optional `otrasSenasExtranjero`                                                                               |
| `emisor.ubicacion` optional, `emisor.fax`                     | `emisor.ubicacion` **required** (`otrasSenas` required, 5–250 chars; `barrio` is now free text 5–50 chars, not a 2-digit code); `fax` removed                     |
| line `impuesto` optional                                      | **required** (≥ 1 entry; use `{ codigo: "01", codigoTarifaIVA: "01", tarifa: 0, monto: 0 }` for exempt lines — the tax calculator synthesizes this automatically) |

## Other breaking changes

- **Clave document-type codes** now carry their v4.4 meanings everywhere: `08` Factura Electrónica de Compra, `09` Factura Electrónica de Exportación, `10` Recibo Electrónico de Pago (corrected in 0.4.2; earlier documentation listed 05/06/07 incorrectly). The SDK's `DocumentType` members were renamed to match (`FACTURA_ELECTRONICA_COMPRA`, `FACTURA_ELECTRONICA_EXPORTACION`, `RECIBO_ELECTRONICO_PAGO`, ...). Claves built with ≤ 0.2.0 for doc types 05–09 encoded the wrong meaning.
- **Clave format:** current 0.4.2+ requires 50 numeric digits and a correctly zero-padded 12-digit taxpayer segment. The earlier alphanumeric claim in this historical guide was incorrect; do not use it as current input guidance.
- **XML namespaces** are now the official lowerCamelCase fragments (e.g. `…/v4.4/facturaElectronica`). Anything comparing namespaces against the old PascalCase values must be updated.
- **Legacy inputs fail fast:** passing the old `codigoActividad`, root `medioPago`, or `porcentajeExoneracion` shapes now throws a descriptive error instead of silently emitting wrong XML.
- Sandbox base URL constant corrected to `https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1`. Superseded: that route fails at the API gateway, the constant is now `https://api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1`.

## Recommended migration path

1. Upgrade all four packages together (`@dojocoding/hacienda-shared`, `-sdk`, `-cli`, `-mcp`) to 0.3.0 — they are released in lockstep.
2. Rename fields per the table above; add `proveedorSistemas` and `emisor.ubicacion`.
3. Move payment methods into `resumenFactura.medioPago` with amounts.
4. Re-run your test suite: the SDK now ships the official XSDs under `packages/sdk/schemas/` and an xmllint-based conformance helper (`validateAgainstXsd`) you can reuse to assert your documents validate.

## Next reviewed release: history metadata contract

The pending pre-1.0 minor Changeset corrects list/detail metadata, combined filters and observed headers across shared/SDK/CLI/MCP. Published 0.7.0 is unchanged until a separately reviewed release. Follow [the explicit migration](docs/history-contract.md); no real history/retention/original-recovery acceptance is implied.

## Unreleased: additive exact ordinary domestic TE

Existing FE/current/retained, total NC and legacy Number APIs keep their behavior.
New strict `ExactTeInputSchema` and `calculateExactTe` / `buildExactTiqueteXml`
provide the named ordinary TE04 source path with optional actual receiver and
exact decimal amounts. Do not convert existing Number input to a claim of exact
source provenance or use a dummy FE receiver. See [the contract](docs/exact-te.md).
The source PR contributes to SDK #85's one eventual cohesive release; package
versions and app fiscal activation do not change here.

## Unreleased: exact ordinary FE-reference ND increment

Additive `ExactNdInputSchema`, `calculateExactNd` and `buildExactNotaDebitoXml`
accept a positive independent adjustment referencing one unchanged ordinary FE.
Explicit original-line correspondence and current reference02 keep the delta
separate from the original total. Supplied ND allocations must be positive.
Existing FE/TE/NC/current/retained and legacy APIs do not change. Caller source
acceptance, trusted actual age eligibility and concurrency remain required;
see [the ND contract](docs/exact-nd.md). No release or activation follows here.

## Unreleased exact ordinary domestic FEC source

Additive `ExactFecInputSchema` / `calculateExactFec` /
`buildExactFacturaCompraXml` preserve actual supplier Emisor and buyer Receptor,
require buyer-owned 08 identity/activity and explicit supporting evidence, and
calculate ordinary IVA13 decimal strings without Number conversion. This first
case is domestic 01–04 with conditions 01/02; foreign 05, used-goods 06/condition 13
and special tax cases remain separately required. Existing family/legacy APIs
are unchanged. See [exact FEC boundary](docs/exact-fec.md)
for independent eligibility/age/response-oracle and release gates.

### Unreleased exact partial NC and rejected-FE replacement

These are additive named source APIs; existing producer and retained behavior is
unchanged. Use `ExactNcPartialInputSchema` with positive correlated credit facts
and a separately enforced atomic remaining-credit ledger. Use
`ExactFeReplacementInputSchema` with an independently valid new FE, a fresh
consecutive and exact retained institutionally rejected FE reference. Neither
source contract establishes acceptance, cash effects or age eligibility. The
replacement reference requires native 2026 reason 16. See the [full contract and
caller prerequisites](docs/exact-credit-extensions.md) before adopting it.

### Unreleased current FE native-name/payment validation

Current exact FE now refuses issuer names shorter than five, receiver/commercial
names shorter than three, and zero supplied payment allocations. Valid Unicode
lexemes and exact math/XML remain unchanged. `ExactFePaymentSchema` is current
and positive; historical source/math and calculated-output decoding retain their
separate broad shapes. Current TE also inherits the positive allocation check.
Do not use the unchanged economic case string to relabel a historical 0.9
producer. The future exact published tuple and a separate consumer adoption must
distinguish current authority from retained original custody. See [migration and
verification limits](docs/current-fe-native-boundaries.md).

### Unreleased explicit foreign-service IVA13 FEC

Use the separate `ExactFecForeignServiceIva13InputSchema` and matching calculator/
builder only for explicitly selected ordinary taxable services. Actual foreign
supplier 05 remains Emisor, actual buyer owns 08, and foreign address/document
reference 16/reason 11 are required. No local supplier header/address or tax default
is invented. Existing domestic FEC and other APIs are unchanged. See the
[full contract](docs/exact-foreign-service-fec.md); selecting the source case does
not establish legal eligibility, liability, creditability or app activation.

## Unreleased explicit personal-used-goods purchase

The separately named `ExactFecUsedPersonalGoodsNonSubjectInputSchema` and SDK
calculator/XML builder select only the independently qualified non-subject case.
They do not replace ordinary/foreign FEC, infer zero tax from supplier 06, or
produce later resale margin/factor effects. Existing current/retained/Number
outputs remain unchanged. See [case limits](docs/exact-used-personal-goods-fec.md).

## Unreleased: additive exact decimal document DTOs

New `DecimalDocument*` schemas/types, `calculateDecimalDocument`, and
`buildDecimalDocumentXml` provide an opt-in decimal-text path for all seven v4.4
documents and `MensajeReceptor`. Existing `Number` APIs remain unchanged and this
does not promote 1.0.

### `number` to text

| Legacy Number field    | Exact decimal field    | Limit                                                 |
| ---------------------- | ---------------------- | ----------------------------------------------------- |
| `number` amount        | `string` money         | 13 integer digits, 5 decimals, 0..9999999999999.99999 |
| quantity `number`      | `string` quantity      | 16 significant digits, 3 decimals                     |
| tariff `number`        | `string` rate          | 2 decimals, 0..99.99                                  |
| factor `number`        | `string` factor        | 4 decimals, 0..9.9999                                 |
| percentage `number`    | `string` percentage    | 2 decimals, 0..100                                    |
| `tarifaExonerada`      | `string` rate          | 4 digits, 2 decimals, 0..100                          |
| alcohol `porcentaje`   | `string` percentage    | 4 digits, 2 decimals, 0..99.99                        |
| exchange rate `number` | `string` exchange rate | positive money scale                                  |

An IVA `tarifa` must equal the percentage of its `codigoTarifaIVA` (for example
`"13"` for `08`), compared exactly.

The decimal DTOs follow the current exact family: line discounts (explicit
amounts) cascade on the remaining base, and each must be strictly smaller than
it; `medioPago` is required unless the sale condition is `02`, `08` or `10`,
where it may be omitted (0–4 entries) and the XML omits `MedioPago`.

Source DTOs contain only facts; calculated DTOs expose derived totals. The builder
recalculates all totals and rejects supplied totals. Calculated JSON is canonical
trimmed text; XML money uses exactly 5 decimals.

The adapters accept exact input for **Factura Electrónica (01) only**: CLI
`draft`, `validate`, and `submit` use the shared exact path for decimal-text FE
drafts, and MCP gains `create_invoice_exact` (FE only, strict keys). The other
documents are reachable through the shared/SDK API, not the CLI or MCP.

Drafts saved by 0.13.0 (decimal-text money with a JSON-number `"tarifa": 13`)
keep loading: the number is converted exactly to text, the draft is checked
against the exact recalculation, and `submit` keeps their verbatim 0.13.0 XML
bytes. New text-`tarifa` drafts are rebuilt by `buildDecimalDocumentXml`, so
their XML money uses 5 decimals. Legacy `Number` bytes and calculations are
unchanged. Schema/XSD validity is not fiscal acceptance.
