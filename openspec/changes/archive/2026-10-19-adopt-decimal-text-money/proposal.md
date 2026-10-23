## Why

El review de `main` sobre PR #59 rechazó la frontera monetaria de A3 ("without
merging its unsafe A3 Money boundary"): su esquema de entrada normalizaba a
`Number` —perdía exactitud, admitía `Infinity` y no acotaba el dominio— y
`Money.toJSON` serializaba por `Number`, incompatible con `structuredClone`.

`main` ya publica el modelo correcto para sus familias exactas: **texto decimal
acotado** con esquema estricto y kernel `BigInt`. Y su contrato de rama fija el
alcance con estas palabras (`AGENTS.md`, `docs/specs/exact-ordinary-fe.md`):

> Preserve legacy Number APIs. The additive exact FE API supports only its named
> ordinary IVA13/full-payment case; financial strings must remain exact through
> strict schema, BigInt calculation, JSON and XML. Do not normalize to Number…

> This API is additional to `FacturaElectronica`, `buildFacturaXml`,
> `calculateLineItemTotals` and `calculateInvoiceSummary`. Those legacy Number
> contracts and CLI/MCP adapters are unchanged. It is not the broad unmerged
> PR59 monetary rewrite…

Dos cosas quedan entonces, y son las que este change entrega:

1. **La frontera estricta de texto decimal no es reutilizable ni está
   documentada.** Hoy el esquema estricto vive como una expresión regular local
   dentro de `shared/src/schemas/exact-fe.ts`; no hay primitivas públicas que
   pueda reutilizar un consumidor que quiera moverse de `number` a texto
   sin degradar la exactitud.
2. **El DoD de A3 no está cubierto en `main`.** A3 exige una batería de pruebas
   de propiedades sobre las invariantes monetarias. `main` no tiene ninguna, y
   su propio contrato pide conservar un oráculo independiente.

Lo que este change **no** hace — y por diseño: reescribir los contratos `Number`
legacy. Eso es "the broad unmerged PR59 monetary rewrite", y el contrato de
`main` lo excluye.

## What Changes

- **Primitivas de texto decimal acotado en `shared/`**: `parse`, `format`,
  `normalize` y comparación, con los límites del XSD oficial
  (`DecimalDineroType`: `totalDigits` 18, `fractionDigits` 5, `minInclusive` 0,
  `maxInclusive` 9999999999999.99999), sin signo, sin exponencial, sin ceros
  enteros a la izquierda, y **precisión por encima de la escala rechazada, no
  redondeada en silencio**.
- **Frontera de entrada reutilizable**: `MonetaryTextSchema` (texto estricto),
  `MoneyInputSchema` (acepta el `number` heredado **o** texto y normaliza a
  texto acotado exacto), `MontoSchema` y `MontoPositiveSchema`, publicados como
  piezas de construcción. Rechazan `Infinity`, `NaN`, exponencial y fuera de
  cota nombrando la causa, y **nunca normalizan a `Number`**.
- **Kernel `BigInt` generalizado**: `packages/sdk/src/tax/exact-decimal.ts` gana
  `parse`, `text`, `fromNumber`, `multiply`, `percent` y `ratio`, con un mapa
  de generalización documentado. `scaled`, `round`, `money` y `sum` quedan
  **byte a byte iguales**: el baseline publicado 0.9.0 depende de ellos.
- **Batería de propiedades (DoD de A3)**: invariantes del camino exacto
  verificados sobre miles de casos, con un **oráculo entero independiente**
  —una segunda implementación, escrita con otra representación, para que un
  defecto compartido no pueda ocultarse— y casos adversariales (montos
  diminutos, cantidades de 16 dígitos significativos, descuento del 100 %, bruto
  redondeado a cero, fuera de cota, pago no asignado).
- **Regla de redondeo en un solo sitio, con su cita**: 5 decimales, `HALF_UP`,
  incrementando cuando el sexto decimal es mayor o igual que 5, citado del
  Anexo de Hacienda (p. 13-14, `20.203518 ≈ 20.20352`).
- **Guía de adopción opt-in**: `MIGRATION.md` explica cómo llevar un consumidor
  de `number` a texto decimal, con tabla de equivalencias y casos de borde,
  declarando explícitamente que las APIs `Number` legacy se preservan.

**BREAKING**: ninguno. El cambio es aditivo: sólo publica exports nuevos. Las
APIs `Number` legacy, los adaptadores CLI/MCP y los bytes publicados 0.9.0 no
cambian.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `monetary/integral`: el tipo monetario público del camino exacto es texto
  decimal acotado; la clase `Money` no se porta; el kernel posee una sola regla
  de redondeo; las invariantes se juzgan por propiedades contra un oráculo
  independiente.
- `monetary/integral-codesgen`: la frontera compartida acepta `number` o texto y
  normaliza a texto acotado exacto sin `toNumber()`; los esquemas legacy
  conservan su contrato `Number`; el generador de catálogos sigue ajeno a los
  montos.

## Impact

- **Código afectado**: `shared/src/monetary/**` (nuevo), `shared/src/schemas/common.ts`
  (nuevos exports), `shared/src/index.ts` y `shared/src/schemas/index.ts` (barrels),
  `packages/sdk/src/tax/exact-decimal.ts` (kernel generalizado),
  `packages/sdk/src/tax/exact-decimal.properties.spec.ts` (nuevo),
  `packages/sdk/package.json` y `pnpm-lock.yaml` (`fast-check` como devDependency).
- **Sin efecto en**: `shared/src/types/documents.ts`, `shared/src/schemas/{linea-detalle,factura}.ts`,
  `packages/sdk/src/tax/calculator.ts`, `packages/sdk/src/xml/validator.ts`,
  `packages/sdk/src/documents/**`, `packages/cli/**`, `packages/mcp/**` — los
  contratos `Number` legacy quedan intactos.
- **Bytes publicados**: el baseline `exact-ordinary-090-baseline.json` sigue
  verde; `money()` no cambia.
- **Riesgo residual**: la frontera compartida es _opt-in_; un consumidor que la
  use sobre un `number` obtiene el valor redondeado a 5 decimales con `HALF_UP`,
  que puede no coincidir con el redondeo binario histórico. La guía de
  migración lo dice y da la tabla de equivalencias.
