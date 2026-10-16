---
"@dojocoding/hacienda-shared": major
"@dojocoding/hacienda-sdk": major
"@dojocoding/hacienda-cli": minor
"@dojocoding/hacienda-mcp": minor
---

A3 — dinero que no miente: `Money` en todos los campos monetarios

BREAKING (tipos): los campos monetarios de los tipos de documento pasan de
`number` a la clase `Money` (`shared/src/types/documents.ts`). Afecta a
`LineaDetalle` (`precioUnitario`, `montoTotal`, `subTotal`, `baseImponible`,
`impuestoNeto`, `montoTotalLinea`), `Impuesto.monto`, `Descuento.montoDescuento`,
`Exoneracion.montoExoneracion`, `ResumenFactura.*`, `TotalDesgloseImpuesto.totalMontoImpuesto`,
`MedioPago.totalMedioPago`, `OtroCargo.montoCargo` y los montos de
`MensajeReceptor`. La aritmética monetaria del SDK (`calculateLineItemTotals`,
`calculateInvoiceSummary`, `round5`) opera sobre `Money` de extremo a extremo.

Tabla de migración:

| Antes (`number`)       | Ahora (`Money`)                      |
| ---------------------- | ------------------------------------ |
| `100000`               | `Money.fromNumber(100000)`           |
| `123.45`               | `Money.fromString("123.45")`         |
| `a + b`                | `a.plus(b)`                          |
| `a - b`                | `a.minus(b)`                         |
| `a * b`                | `a.times(b)`                         |
| `a / b`                | `a.dividedBy(b)`                     |
| `a > b` / `a < b`      | `a.greaterThan(b)` / `a.lessThan(b)` |
| `a === b`              | `a.equals(b)`                        |
| `Number(x.toFixed(5))` | `x.round(5)`                         |
| `x` (al XML)           | `x.toXMLString()`                    |

`Money.fromNumber(n)` es el constructor migratorio: acepta `number` sin
escalarlo. Preferí `Money.fromString(s)` cuando conozcas el literal decimal.
La frontera de entrada no cambia: los esquemas Zod, la CLI y el MCP siguen
aceptando `number` (los esquemas aceptan `number | Money` y normalizan a
`number`).

Regla de redondeo (documentada y citada): **5 decimales con `ROUND_HALF_UP`**
(se incrementa cuando el sexto decimal es mayor o igual que 5), tomada del Anexo
de Hacienda vendorizado
(`packages/sdk/schemas/2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf`,
"II. Especificaciones técnicas y formato de los comprobantes electrónicos",
p. 13–14: `20.203518 ≈ 20.20352`). `Money.round(dp)` aplica esa regla sobre el
valor decimal exacto, no sobre el `double` binario; `Number.toFixed(5)` puede
discrepar en empates exactos.

Serialización XML: los montos se escriben con `Money.toXMLString()`, en notación
plana y con **hasta** 5 decimales (sin ceros forzados ni notación científica),
lo que satisface `xs:decimal` con `fractionDigits: 5` (`DecimalDineroType`).
`TipoCambio` se serializa con la misma regla porque el XSD lo tipa como
`DecimalDineroType`.

Dependencia nueva: `decimal.js@^10.6.0` como dependencia directa de
`@dojocoding/hacienda-shared` (antes figuraba solo en la raíz del monorepo, que
no lo importaba). `npm ls decimal.js` no reporta vulnerabilidades. Se añade
`fast-check@^4.10.2` como devDependency de `shared` y `sdk` para las pruebas de
propiedades.

Pruebas de propiedades (`pnpm test:properties`, integrado en `pnpm verify`):
20 propiedades en 2 suites (`shared`: aritmética y redondeo de `Money`; `sdk`:
consistencia del resumen y contrato de impuestos) × 10 000 casos aleatorios por
propiedad = **200 000 casos** generados (incluye casos adversariales: montos
diminutos, montos extremos, hasta 30 líneas, descuentos del 100 %, tarifas
mixtas y exoneraciones parciales/totales). Resultado: **OK, 200/200 propiedades
pasan** en ~28 s. Invariantes cubiertos: la suma de `montoTotalLinea` iguala
`totalComprobante` (neto de otros cargos); la descomposición del resumen cuadra
exactamente; cada impuesto es `round5(base × tarifa / 100)`; `impuestoNeto`
queda entre 0 y el impuesto pleno; el desglose por tarifa suma lo mismo que los
impuestos de línea; y **ninguna salida monetaria es un `number` puro**.

Los consumidores que construían documentos con literales numéricos deben migrar
según la tabla; la CLI y el MCP no cambian de interfaz.
