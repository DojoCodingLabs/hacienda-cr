# Migration guide

## Next: reviewed additive SDK contracts

- Legacy Number inputs/calculators remain unchanged. New shared monetary schemas accept bounded decimal text or explicit rounding of an already binary Number. SDK kernel helpers remain internal.
- `parseDocumentXml` only inverts unsigned legacy-builder bytes without loss. It rejects alternate serialization, signed XML, unknown fields and amounts that cannot survive a Number DTO; it is not a general fiscal XML importer.
- New signatures retain the library-generated Id so QualifyingProperties Target identifies the same signature. The strict new EPES verifier rejects historical documents with mismatched Target; do not rewrite or re-sign historical fiscal documents to silence that check.
- Civil-calendar helpers cover only official 2026 dates. They do not determine exceptional closures or legal deadline origins.
- Persistent submit requires an explicit store. After an uncertain POST, resume queries by the same clave and bytes; no automatic resend. Durable issuance uses one canonical ledger shared with legacy counters, and reset cannot reuse issued numbers. See docs/open-pr-remediation.md for recovery and operational limits.
- Once durable issuance writes the versioned ledger, all writers sharing that config directory must use this SDK version. Older binaries only understand flat counters and must not share the upgraded directory; back up local state before deliberate adoption. There is no automatic downgrade or replay.

### `node-forge` pasa a peer dependency opcional

`node-forge` ya no es una dependencia runtime obligatoria del SDK: es un peer
opcional y se resuelve de forma perezosa dentro de `loadP12`. Quien nunca carga
un `.p12` no lo instala y no hereda su advisory abierto.

**Acción requerida** si llamás `loadP12` o `signXml`:

```bash
npm install node-forge
```

Sin el parser, el paquete se instala e importa normalmente, pero `loadP12`
rechaza con un `SigningError` accionable antes de leer el archivo. El parseo,
las validaciones (1 MiB, RSA ≥ 2048, vigencia, correspondencia clave/certificado)
y la firma no cambian cuando el parser está presente. El issue #69 sigue abierto:
esto reduce la exposición, no reemplaza la librería ni cierra el hallazgo.

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
  to pass validation. SDK issue 69 still tracks the unpatched node-forge advisory.

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
- Sandbox base URL constant corrected to `https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1`.

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
