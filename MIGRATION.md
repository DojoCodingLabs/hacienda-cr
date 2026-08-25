# Migration guide: 0.2.x → 0.3.0

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

- **Clave document-type codes** now carry their v4.4 meanings everywhere: `05` Factura Electrónica de Compra, `06` Factura Electrónica de Exportación, `07` Recibo Electrónico de Pago. The SDK's `DocumentType` members were renamed to match (`FACTURA_ELECTRONICA_COMPRA`, `FACTURA_ELECTRONICA_EXPORTACION`, `RECIBO_ELECTRONICO_PAGO`, ...). Claves built with ≤ 0.2.0 for doc types 05–09 encoded the wrong meaning.
- **Clave format:** the taxpayer segment (positions 10–21) accepts alphanumerics per the April 2026 revision; all other segments remain numeric.
- **XML namespaces** are now the official lowerCamelCase fragments (e.g. `…/v4.4/facturaElectronica`). Anything comparing namespaces against the old PascalCase values must be updated.
- **Legacy inputs fail fast:** passing the old `codigoActividad`, root `medioPago`, or `porcentajeExoneracion` shapes now throws a descriptive error instead of silently emitting wrong XML.
- Sandbox base URL constant corrected to `https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1`.

## Recommended migration path

1. Upgrade all four packages together (`@dojocoding/hacienda-shared`, `-sdk`, `-cli`, `-mcp`) to 0.3.0 — they are released in lockstep.
2. Rename fields per the table above; add `proveedorSistemas` and `emisor.ubicacion`.
3. Move payment methods into `resumenFactura.medioPago` with amounts.
4. Re-run your test suite: the SDK now ships the official XSDs under `packages/sdk/schemas/` and an xmllint-based conformance helper (`validateAgainstXsd`) you can reuse to assert your documents validate.
