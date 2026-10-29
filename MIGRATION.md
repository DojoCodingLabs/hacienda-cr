# Migration guide

## Next: redondeo de `round5` a `HALF_UP` (monetario)

Los paquetes `@dojocoding/hacienda-sdk` corrigen el redondeo de `round5` (path legacy de montos): deja de usar `Number.toFixed(5)` (representación binaria, que no coincide consistentemente con ninguna regla decimal exacta) y pasa a `HALF_UP` a 5 decimales, vía el kernel exacto (`shared/src/monetary/decimal-text.ts`), como exige el Anexo v4.4, p. 13–14 (`20.203518 ≈ 20.20352`).

Es un cambio de ruptura a nivel de bytes para casos exact-half (paquetes pre-1.0: cambio `minor`).

**Casos exact-half que cambian de valor:**

| input       | antes (binario, `toFixed`) | ahora (`HALF_UP`) |
| ----------- | -------------------------- | ----------------- |
| `20.203515` | `20.20351`                 | `20.20352`        |
| `0.123455`  | `0.12345`                  | `0.12346`         |
| `1.234565`  | `1.23456`                  | `1.23457`         |
| `8.686375`  | `8.68637`                  | `8.68638`         |

(y sus espejos negativos). El golden corpus no contenía casos exact-half divergentes (14/14 sin regeneración). `decimal-document-parity.spec.ts` (19/19) y `validator.spec.ts` (72/72) pasan; el delta de expecteds del validador queda absorbido por la tolerancia `0.001` (|Δ| = 0.00001).

**No cambia:**

- La tolerancia de `amountsEqual` (0.001) se mantiene; se documenta como deuda sin respaldo oficial directo (el Anexo v4.1, p. 12, habla de márgenes para sistemas de 2 decimales, no para 5). Apretarla (p. ej. a 1e-5) requiere un change aparte con evidencia.
- `round5` sigue devolviendo `number` (contrato preservado). La exactitud bit-a-bit solo la garantiza el path exacto (`DecimalDocument*` / `exact-decimal.ts`); el kernel no puede curar el colapso inherente del contrato `number` en magnitudes ≥ ~6.87e10 (ULP > 1e-5).
- `round5` no valida dominio `DecimalDineroType` (no clippea ni lanza); el dominio se impone en schema/normalización. La frontera en esa capa queda como deuda declarada (sin candado de test en este change).

**Corrección típica:** no requiere cambio de código del consumidor; si un test verificaba un valor exact-half con `toEqual`, actualízalo al valor HALF_UP de la tabla. Consulta el change `fix-monetary-rounding-half-up` y `sdk-robustness-audit.md` (Ítem 2).

---

## Next: endurecimiento de `InformacionReferencia` (referencias)

Los paquetes `@dojocoding/hacienda-shared` y `@dojocoding/hacienda-sdk` endurecen la entrada aceptada para `InformacionReferencia`. Esta es una corrección de validación que rompe consumidores que dependían de la permisividad anterior (paquetes pre-1.0: cambio `minor`).

Condiciones que ahora se rechazan:

1. `tipoDoc === "99"` sin `tipoDocOtros` (5-100 caracteres), o `tipoDocOtros` con `tipoDoc !== "99"`.
2. `codigo === "99"` sin `codigoOtros` (5-100 caracteres), o `codigoOtros` con `codigo !== "99"`.
3. En un documento que no sea `ReciboElectronicoPago`, referencia con `codigo === "17"` (motivo exclusivo del REP).

Además, IVA `"07"` (cálculo especial) exige `codigoTarifaIVA`; IVA `"08"` (bienes usados) exige `factorCalculoIVA`. La correspondencia numérica `tarifa` ↔ `codigoTarifaIVA` solo aplica a `"01"`.

Corrección típica para cada referencia:

```ts
// Antes (ya rechazado):
{ tipoDoc: "01", fechaEmision: "2025-07-27T10:30:00-06:00" }

// Después:
{ tipoDoc: "01", codigo: "04", fechaEmision: "2025-07-27T10:30:00-06:00", razon: "Referencia a otro documento" }

// tipoDoc 13 sigue permitiendo omitir codigo:
{ tipoDoc: "13", fechaEmision: "2025-07-27T10:30:00-06:00" }
```

Consulta el change `fix-reference-catalog-semantics` y `sdk-robustness-audit.md` (Ítem 1) para el contexto completo.

## Next: reviewed additive SDK contracts

- Legacy Number inputs/calculators remain unchanged. New shared monetary schemas accept bounded decimal text or explicit rounding of an already binary Number. SDK kernel helpers remain internal.
- `parseDocumentXml` only inverts unsigned legacy-builder bytes without loss. It rejects alternate serialization, signed XML, unknown fields and amounts that cannot survive a Number DTO; it is not a general fiscal XML importer.
- New signatures retain the library-generated Id so QualifyingProperties Target identifies the same signature. The strict new EPES verifier rejects historical documents with mismatched Target; do not rewrite or re-sign historical fiscal documents to silence that check.
- Civil-calendar helpers cover only official 2026 dates. They do not determine exceptional closures or legal deadline origins.
- Persistent submit requires an explicit store. After an uncertain POST, resume queries by the same clave and bytes; no automatic resend. Durable issuance uses one canonical ledger shared with legacy counters, and reset cannot reuse issued numbers. See docs/open-pr-remediation.md for recovery and operational limits.
- Once durable issuance writes the versioned ledger, all writers sharing that config directory must use this SDK version. Older binaries only understand flat counters and must not share the upgraded directory; back up local state before deliberate adoption. There is no automatic downgrade or replay.

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
| exchange rate `number` | `string` exchange rate | positive money scale                                  |

Source DTOs contain only facts; calculated DTOs expose derived totals. The builder
recalculates all totals and rejects supplied totals. Calculated JSON is canonical
trimmed text; XML money uses exactly 5 decimals. CLI `draft`, `validate`, and
`submit` use the shared exact path; MCP gains `create_invoice_exact`. Legacy
`Number` bytes and calculations are unchanged. Schema/XSD validity is not fiscal
acceptance.
