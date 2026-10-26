## Why

Las aritméticas monetarias en el SDK usan `number` de JavaScript, que representa fracciones en binario. Esto provoca tres problemas que el brief de A3 considera inaceptables:

1. **Inconsistencia de redondeo:** `Number.toFixed(5)` decide los empates sobre el `double` binario, no sobre el valor decimal, así que no reproduce de forma fiable la regla de Hacienda. El código actual no garantiza ninguna regla concreta.
2. **Aritmética silenciosamente incorrecta:** `0.1 + 0.2 !== 0.3` en JavaScript. Cualquier ruta de dinero que acumule subtotales puede desviarse de los valores esperados, y el brief exige que "no quede aritmética con `number` en ninguna ruta de dinero".
3. **Falta de cita de la regla:** No existía en el repo ninguna fuente que documentara dónde la especificación (Hacienda/XSD) fija la regla de redondeo. El brief requiere que "la regla de redondeo está documentada con su fuente" (resuelto abajo).

---

## What Changes

- **Nueva representación decimal** para todos los campos monetarios en `shared/src/types/documents.ts` y en la capa de cálculo del SDK (`packages/sdk/src/tax/calculator.ts`). Los tipos `number` pasan a ser la clase `Money` sobre `decimal.js`, con `Money.fromNumber(n)` como constructor migratorio.
- **Regla de redondeo explícita** de 5 decimales, `ROUND_HALF_UP`, con la cita de la fuente: Anexo vendorizado v4.4 (`packages/sdk/schemas/2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf`, "II. Especificaciones técnicas y formato de los comprobantes electrónicos", p. 13–14).
- **Consistencia de totales por construcción**: la capa de cálculo deriva `montoTotalLinea` y los totales del resumen de las líneas (y la validación rechaza documentos incoherentes), de modo que un documento construido por esa vía no puede tener totales inconsistentes.
- **Pruebas de propiedades**: una batería de 10 000 casos aleatorios por propiedad (más casos adversariales) con un oráculo entero independiente, que verifica la exactitud decimal de `plus`/`times`/`round`, la consistencia del resumen y que ninguna salida monetaria sea un `number` puro.

**BREAKING**: Los tipos públicos de `@dojocoding/hacienda-shared` y `@dojocoding/hacienda-sdk` cambian: los campos antes `number` ahora son `Money`. Se incluye `Money.fromNumber(n)` para migración automática desde números puros.

---

## Capabilities

### New Capabilities

- `monetary/integral`: Capa de representación y aritmética decimal para montos fiscales. Garante que ninguna operación monetaria use `number` puro salvo en la frontera de entrada (esquemas Zod que aceptan `number | Money` y normalizan), que la regla de redondeo es decidida y citada, y que las propiedades de suma y producto se cumplen en miles de casos aleatorios, incluyendo escenarios adversariales. Crea los siguientes spec files:
  - `specs/monetary/integral/spec.md` — definición de la clase `Money`, sus operadores, la regla de redondeo citada, la serialización XML y la consistencia de totales.
  - `specs/monetary/integral-codesgen/spec.md` — frontera de entrada: los esquemas Zod aceptan `number | Money` y normalizan, y el generador de catálogos sigue ajeno a los montos y determinista.

### Modified Capabilities

Dejar vacío (no hay capacidades existentes cuyo comportamiento de requisitos cambie sin ser nuevas). Si se listan capacidades modificadas, cada una necesitaría un archivo delta `specs/<ruta>/spec.md`.

---

## Impact

- **API pública**: `number` → `Money` en tipos compartidos y SDK. Breaking mayor para `@dojocoding/hacienda-shared` y `@dojocoding/hacienda-sdk`; `cli` y `mcp` minor.
- **Consumidores**: el código que **calcula** con montos debe usar `Money.fromNumber(n)`/`Money.fromString(s)` y los operadores `.plus()`, `.minus()`, `.times()`, `.dividedBy()`, `.equals()`. La frontera de entrada (esquemas Zod, CLI, MCP, ejemplo de sandbox) sigue aceptando `number` y normaliza, así que las entradas JSON existentes no cambian.
- **Tests**: las fixtures y specs del SDK, el ejemplo de sandbox (`packages/sdk/examples/sandbox.mjs`) y las pruebas de scripts se actualizaron a la API `Money`; se añade el suite de propiedades (`pnpm test:properties`, integrado en `pnpm verify`).
- **Cambio de dependencia**: `decimal.js` se añade a `package.json` como dependencia directa de `shared` (versión final `^10.6.0`, sin tree-shaking penalty notable para el uso que le daremos).
- **Validación**: `openspec validate --specs` debe pasar sobre los nuevos spec files sin errores.

---

## Impact (runtime)

- **Serialización XML**: Los montos se escribirán al XML con a lo sumo 5 decimales en notación plana (`0.1` se mantiene como `0.1`, `113000` como `113000`) y cualquier excedente más allá del quinto decimal se redondea con `ROUND_HALF_UP`. Esto cumple el XSD `xs:decimal` con `fractionDigits: 5` (que acota la fracción, no exige ceros forzados). Se añade una utilidad `Money.toXMLString()` al builder.
- **Fixtures**: Las fixtures de test que usen montos hardcodeados en `number` deberán convertirse a `Money.fromNumber(...)`.

---
