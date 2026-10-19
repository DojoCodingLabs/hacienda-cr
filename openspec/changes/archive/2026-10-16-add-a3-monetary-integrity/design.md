## Context

El SDK `hacienda-cr` usa `number` de JavaScript para todos los campos monetarios en `shared/src/types/documents.ts` y en la capa de cálculo (`packages/sdk/src/tax/calculator.ts`). Esto causa tres problemas identificados en el brief A3:

1. **Inconsistencia de redondeo:** `Number.toFixed(5)` no garantiza un comportamiento concreto en valores `.5`; depende de la representación binaria.
2. **Aritmética silenciosamente incorrecta:** `0.1 + 0.2 !== 0.3` en JavaScript; las acumulaciones de subtotales pueden desviarse.
3. **Falta de cita:** No existe en el repo ninguna fuente que documente la regla de redondeo que exige la especificación Hacienda.

La solución designada es el **Diseño B**: introducir una clase `Money` wrapper sobre `decimal.js` que preserve el decimal exacto (sin escala entera), con redondeo explícito a 5 decimales donde corresponde, y citar la regla de redondeo en el Changeset.

---

## Goals / Non-Goals

**Goals:**

- Sustituir `number` por `Money` en todos los tipos monetarios públicos.
- Garantizar que la aritmética monetaria use reglas de redondeo decimal explicitas y citadas.
- Hacer que los totales de un documento sean consistentes por construcción (la capa de cálculo los deriva de las líneas y la validación rechaza incoherencias).
- Incluir un test suite de propiedades que jure los invariantes monetarios en miles de casos aleatorios.

**Non-Goals:**

- Preservar la compatibilidad de tipos: este cambio **es** un breaking `major` (`number` → `Money`), documentado con Changeset `major` y guía de migración. `Money.fromNumber(n)` facilita la transición, pero la firma pública cambia.
- Migrar automáticamente el código existente de `number` a `Money`: la migración es manual y verificada (`pnpm verify` verde en cada incremento).
- Soportar `big.js` como alternativa: se usa `decimal.js` como dependencia directa.

---

## Decisions

| Decision                                              | Rationale                                                                                                                                                                                                                                                                                                    | Alternatives Considered                                                                                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clase `Money` sobre `decimal.js`**                  | `Money` almacena el decimal **exacto** (`new Decimal(value)`, sin escala entera), con precisión suficiente para los 5 decimales que exige Hacienda.                                                                                                                                                          | `big.js` (peso en bundle), `number` + saneamiento interno (no cumple el brief literal).                                                                                                |
| **Redondeo `ROUND_HALF_UP` explícito**                | `Money.round(dp)` usa `Decimal.toDecimalPlaces(dp, ROUND_HALF_UP)`; coincide con el método de redondeo del Anexo de Hacienda (`ANEXOS Y ESTRUCTURAS_V4.4.pdf`, p. 13–14: incrementar cuando el sexto decimal es ≥ 5). `Number.toFixed(5)` no es fiable en empates porque redondea sobre el `double` binario. | `ROUND_HALF_EVEN`, que el Anexo no establece y no coincide con el `toFixed` existente en empates.                                                                                      |
| **Sin escala entera**                                 | Se descarta multiplicar por 10⁵: `Money.fromString("123.45")` y `toString()` deben preservar el valor decimal literal; la precisión la garantiza `decimal.js`.                                                                                                                                               | Escala fija ×10⁵ (diseño previo): rompería `toString`/`fromString` y no la usa el código actual.                                                                                       |
| **`Money.fromNumber(n)` como constructor migratorio** | Acepta `number` puro sin escalarlo, lo que permite migraciones graduales; se prefiere `Money.fromString(s)` cuando se conoce el literal decimal.                                                                                                                                                             | Constructor `Money(n)` solo con `Decimal`; rompería la compatibilidad de entrada.                                                                                                      |
| **`toXMLString()` con hasta 5 decimales**             | Los montos se serializan al XML en notación plana con a lo sumo 5 decimales (`0.1`, `113000`), redondeando el excedente con `ROUND_HALF_UP`; válidos para `xs:decimal` con `fractionDigits: 5`, que acota la fracción sin exigir ceros forzados.                                                             | Serializar `number` crudo (puede emitir notación científica en valores extremos) o forzar exactamente 5 decimales (`0.10000`), que no aporta conformidad y rompe comparaciones de XML. |
| **Test suite de propiedades**                         | SHALL incluirse en el Changeset y validarse con `pnpm test:properties`; jura invariantes en miles de casos aleatorios, incluyendo adversariales.                                                                                                                                                             | No incluir tests properties; dejar la validación solo en `openspec validate`.                                                                                                          |

---

## Risks / Trade-offs

- **[Risk: Rompe la API pública]** → Mitigation: Changeset major documentado con tabla de migración `number` → `Money`; constructor `Money.fromNumber(n)` acepta número para transición gradual.
- **[Risk: Olvidar actualizar instancias existentes]** → Mitigation: el test suite de propiedades recorre 10 000 casos aleatorios por propiedad con un oráculo entero (`BigInt`) independiente de la aritmética binaria, y un invariante exige que ninguna salida monetaria sea un `number` puro; cualquier ruta no migrada falla.
- **[Risk: Incompatibilidad con instancias `number` puros en el código existente]** → Mitigation: la frontera de entrada (esquemas Zod, CLI, MCP, ejemplos) acepta `number | Money` y normaliza, así que las entradas JSON existentes siguen funcionando; solo el código que **calcula** con montos debe usar `Money` (tabla del Changeset).

---

## Migration Plan

1. **Cambios mayor (`Changeset major`):** `number` → `Money` en tipos públicos de `@dojocoding/hacienda-shared` y `@dojocoding/hacienda-sdk`.
2. **Añadir dependencia `decimal.js`** a `package.json`.
3. **Crear clase `Money`** en `shared/src/types/money.ts` con `fromNumber`, `fromString`, `plus`, `minus`, `times`, `round`, `toXMLString` (sin getter `scaled`: no hay escala entera).
4. **Actualizar tipos en `shared/src/types/documents.ts`:** reemplazar `number` por `Money` en los campos monetarios. (`packages/sdk/src/types/` no existe: los tipos de dominio viven en `shared`; el SDK consume `LineaDetalle` y define interfaces de entrada propias en `packages/sdk/src/tax/calculator.ts`.)
5. **Añadir test suite `test:properties`:** 10000+ casos aleatorios (incluyendo adversariales) que juran los invariantes monetarios.
6. **Consistencia de totales:** la capa de cálculo (`calculateLineItemTotals`, `calculateInvoiceSummary`) deriva `montoTotalLinea` y los totales del resumen de las líneas, y la validación de entrada rechaza documentos incoherentes. La derivación muerta e inválida que vivía en `packages/sdk/src/xml/builder.ts` se retiró: el builder solo serializa lo que recibe.
7. **Documentar la regla de redondeo** en el Changeset con cita de la fuente (Anexo vendorizado v4.4, p. 13–14 → `ROUND_HALF_UP`).

---

## Open Questions

- **Regla de redondeo:** verificada en el Anexo vendorizado (`packages/sdk/schemas/2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf`, "II. Especificaciones técnicas y formato de los comprobantes electrónicos", p. 13–14): se incrementa cuando el sexto decimal es mayor o igual que 5 → `ROUND_HALF_UP`. `Money` conserva el decimal exacto; el redondeo solo aplica al fijar decimales.
- **`test:properties` en este Changeset:** sí; el cambio es `major` sobre tipos públicos, por lo que el test suite de propiedades se incluye aquí.
- **Compatibilidad con `round5`:** el `round5` exportado por `packages/sdk/src/tax/calculator.ts` opera sobre `Money`; el validador XML conserva un `round5(value: number): number` privado porque valida entradas ya normalizadas por Zod, no montos en tránsito. Fuera de esa frontera de entrada (esquemas Zod + validador), el único punto que aún calcula montos con `number` es el comando interactivo `packages/cli/src/commands/draft.ts` (campos `number` y `round5` con `Math.round`), que arma el JSON de entrada y no usa la capa de cálculo; se declara explícitamente **fuera de alcance** de este cambio y se migrará, si corresponde, en un cambio aparte. El resto de la cadena de dinero (capa de cálculo y serialización XML) opera solo con `Money`.
- **Ubicación de `decimal.js`:** debe declararse en `shared/package.json` (quien lo importa), no solo en la raíz del monorepo.

---
