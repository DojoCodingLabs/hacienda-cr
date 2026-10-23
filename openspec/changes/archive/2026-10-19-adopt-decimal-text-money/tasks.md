## 1. Fundaciones del modelo decimal

- [x] 1.1 Documentar el kernel `packages/sdk/src/tax/exact-decimal.ts`: escala, cota máxima y el rol de `scaled`/`round`/`money`/`sum`, con un mapa de generalización que declare qué primitivo se añade y cuál se preserva.
- [x] 1.2 Definir las primitivas de texto decimal acotado en `shared/src/monetary/decimal-text.ts` con los límites del XSD oficial `DecimalDineroType` (`totalDigits` 18, `fractionDigits` 5, `minInclusive` 0, `maxInclusive` 9999999999999.99999), sin signo, sin exponencial, sin ceros enteros a la izquierda, y con la precisión por encima de la escala rechazada en vez de redondeada.
- [x] 1.3 Escribir la prueba que demuestra que la frontera rechaza no-finitos, `NaN`, exponenciales, fuera de cota y precisión excesiva, y que conserva cinco decimales y la equivalencia `number` ↔ texto.

## 2. Frontera de entrada compartida

- [x] 2.1 Publicar `MonetaryTextSchema`, `MoneyInputSchema`, `MontoSchema` y `MontoPositiveSchema` en `shared/src/schemas/common.ts`, con normalización a texto acotado y sin `toNumber()` en ninguna rama.
- [x] 2.2 Exportar las primitivas y los esquemas desde los barrels (`shared/src/monetary/index.ts`, `shared/src/index.ts`, `shared/src/schemas/index.ts`).
- [x] 2.3 Verificar que los esquemas legacy (`shared/src/schemas/linea-detalle.ts`, `shared/src/schemas/factura.ts`) NO cambian: los contratos `Number` legacy permanecen intactos.
- [x] 2.4 Añadir la prueba de no-regresión: el mismo valor como `number` y como texto produce el mismo texto, y la representación interna nunca es binaria.

## 3. Kernel generalizado

- [x] 3.1 Añadir al kernel `parse` (texto estricto a entero escalado), `text` (entero escalado a texto plano, sin ceros forzados), `fromNumber` (número finito a entero escalado por su representación más corta), `multiply`, `percent` y `ratio`, con redondeo `HALF_UP` en la escala destino.
- [x] 3.2 No alterar `scaled`, `round`, `money` ni `sum`: su comportamiento debe quedar byte a byte igual.
- [x] 3.3 Ejecutar la regresión de compatibilidad (`exact-ordinary-compatibility.spec.ts`) y confirmar que los hashes del baseline publicado 0.9.0 siguen coincidiendo.

## 4. Propiedades monetarias (DoD de A3)

- [x] 4.1 Añadir `fast-check` como devDependency de `@dojocoding/hacienda-sdk` y actualizar el lockfile.
- [x] 4.2 Implementar el oráculo independiente: aritmética decimal sobre texto (no `BigInt` escalado), con su propia implementación de suma, resta, multiplicación, división y redondeo `HALF_UP`.
- [x] 4.3 Escribir `packages/sdk/src/tax/exact-decimal.properties.spec.ts` con las invariantes del camino exacto: cantidad × precio redondeado a 5 decimales, descuento porcentual aplicado a la bruta y no de forma secuencial, subtotal = bruta − descuentos, IVA = subtotal × 13/100, agregados = suma de enteros cuantizados, y asignación de pago igual al total.
- [x] 4.4 Cubrir los casos adversariales: montos diminutos, cantidades de 16 dígitos significativos, descuento del 100 %, bruto redondeado a cero, valor fuera de cota y pago no asignado.
- [x] 4.5 Verificar que una mutación del kernel (redondeo a la baja, base de descuento secuencial, mínimo de pago) hace fallar la batería.

## 5. Documentación

- [x] 5.1 Añadir la sección de adopción a `MIGRATION.md`: tabla de equivalencias `number` ↔ texto, casos de borde (`0.1`, `113000`, `1.000005`, `1e-7`) y la advertencia de que un `number` es binario y su valor exacto ya se perdió antes de entrar.
- [x] 5.2 Declarar en la misma sección que las APIs `Number` legacy se preservan y que la adopción es opt-in.
- [x] 5.3 Dejar la regla de redondeo (5 decimales, `HALF_UP`) documentada con su cita del Anexo (p. 13-14) en el único sitio que la aplica: `shared/src/monetary/decimal-text.ts`.
- [x] 5.4 Añadir el changeset del paquete compartido y del SDK (aditivo, sin ruptura).

## 6. OpenSpec

- [x] 6.1 Verificar que `openspec validate adopt-decimal-text-money` pasa.
- [x] 6.2 Verificar que `openspec validate --specs` no presenta regresiones.

## 7. Puertas

- [x] 7.1 Ejecutar `pnpm verify` y confirmar que la batería de propiedades corre dentro.
- [x] 7.2 Confirmar que el cambio no toca `shared/src/types/documents.ts`, `packages/sdk/src/tax/calculator.ts`, `packages/sdk/src/xml/validator.ts`, `packages/cli/**` ni `packages/mcp/**`.
