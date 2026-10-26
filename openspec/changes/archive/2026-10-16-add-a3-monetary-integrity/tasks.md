## 1. Money class implementation

- [x] 1.1 Crear clase `Money` en `shared/src/types/money.ts` con constructor `fromNumber`, `plus`, `minus`, `times` (sin getter `scaled`: se descartó la escala entera ×10⁵, ver `design.md`)
- [x] 1.2 Implementar operaciones aritméticas usando `decimal.js` internamente
- [x] 1.3 Probar que `Money.fromNumber(0.1).plus(Money.fromNumber(0.2))` es `Money.fromNumber(0.3)` (no binario)
- [x] 1.4 Fijar el redondeo explícito `ROUND_HALF_UP` en `Money.round(dp)` y probar empates exactos (`.5`)

## 2. decimal.js dependency

- [x] 2.1 Declarar `decimal.js` en las dependencias de `shared/package.json` (hoy solo está en la raíz del monorepo, que no lo importa)
- [x] 2.2 Verificar que `npm ls decimal.js` no muestra vulnerabilidades críticas (`decimal.js@10.6.0`, sin hallazgos; `pnpm audit --prod` reporta un hallazgo previo en `node-forge`, ajeno a este cambio)
- [x] 2.3 Documentar la versión usada en el Changeset (`decimal.js@^10.6.0`)

## 3. Tipos públicos actualizados

- [x] 3.1 Reemplazar `number` por `Money` en `shared/src/types/documents.ts` (campos: monto, importe, descuento, tarifa)
- [x] 3.2 Actualizar los consumidores del SDK que manejan esos campos (`packages/sdk/src/tax/calculator.ts`, `packages/sdk/src/documents/shared-xml-helpers.ts`, fixtures, `packages/sdk/examples/sandbox.mjs`) — `packages/sdk/src/types/` no existe
- [x] 3.3 Actualizar barrel exports (`shared/src/index.ts`, `packages/sdk/src/index.ts`) para exportar `Money`

## 4. XML builder changes

- [x] 4.1 Asegurar que la capa de cálculo derive `montoTotalLinea` y los totales del resumen (`totalServGravados`, etc.) de las líneas; retirar la derivación muerta de totales en `packages/sdk/src/xml/builder.ts` (inyectaba elementos raíz inválidos y ningún consumidor la usaba)
- [x] 4.2 Añadir utilidad `Money.toXMLString()` que formatee hasta 5 decimales en notación plana (sin ceros forzados ni notación científica) para `xs:decimal` válido
- [x] 4.3 Probar que el XML generado valida contra XSD con `fractionDigits: 5` (cinco decimales conforman, seis se rechazan)
- [x] 4.4 Serializar los montos del builder con `Money.toXMLString()` (hasta 5 decimales) en vez de `number` crudo

## 5. Test suite de propiedades

- [x] 5.1 Crear `scripts/run-properties-tests.mjs` y el script `test:properties` en `package.json`; ejecuta 10000 casos aleatorios por propiedad (`PROPERTY_RUNS`, configurable)
- [x] 5.2 Implementar invariantes: suma de líneas = total del resumen, impuesto = base × tarifa bajo redondeo, y ninguna salida monetaria es `number` puro
- [x] 5.3 Probar casos adversariales (montos extremos, decimales diminutas, hasta 30 líneas, tarifas mixtas, descuentos máximos, exoneraciones totales/parciales)
- [x] 5.4 Integrar `test:properties` en el ciclo de CI habitual (`scripts/verify.mjs`)

## 6. Changeset major

- [x] 6.1 Crear Changeset `a3-monetary-types.md` con bump `major` para `@dojocoding/hacienda-shared` y `@dojocoding/hacienda-sdk`
- [x] 6.2 Incluir tabla de migración: `number` → `Money` con `Money.fromNumber(n)` como constructor migratorio
- [x] 6.3 Documentar la regla de redondeo y su fuente (Anexo de Hacienda vendorizado v4.4, p. 13–14, `ROUND_HALF_UP`)
- [x] 6.4 Incluir reporte del test suite `test:properties` (20 propiedades × 10000 casos = 200 000 casos, OK en ~28 s)
- [x] 6.5 Actualizar `cli` y `mcp` con bump `minor`

## 7. Especificaciones delta (OpenSpec)

- [x] 7.1 Crear el delta `specs/monetary/integral/spec.md` con la clase `Money`, la regla de redondeo citada, las propiedades y la derivación de totales
- [x] 7.2 Crear el delta `specs/monetary/integral-codesgen/spec.md` para la frontera de entrada (esquemas Zod que aceptan `number | Money` y normalizan) y la no regresión del generador de catálogos
- [x] 7.3 Verificar que `openspec validate add-a3-monetary-integrity` pasa (cada requisito con al menos un `#### Scenario:`)
- [x] 7.4 Retirar los specs principales obsoletos `openspec/specs/monetary/*`: eran inválidos, contradecían el diseño implementado (escala ×10⁵, `ROUND_HALF_EVEN`, «exactamente 5 decimales», tipos generados con `Money`) y hacían abortar `openspec archive` con «already exists»; al declarar la propuesta ambas capacidades como nuevas, se crean desde los deltas al archivar. Respaldo hecho fuera del árbol antes de retirarlos, y `openspec validate --specs` (4/4) queda verde

## 8. Documentación y ejemplos

- [x] 8.1 Actualizar `README.md` con los nuevos tipos `Money` y ejemplos de uso
- [x] 8.2 Migrar fixtures que usen `number` puro a `Money.fromNumber(...)`
