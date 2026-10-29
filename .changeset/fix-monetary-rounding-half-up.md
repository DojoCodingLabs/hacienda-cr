---
"@dojocoding/hacienda-sdk": minor
---

Corrige el redondeo de `round5` de binario (`Number.toFixed(5)`) a `HALF_UP` (Anexo v4.4, p. 13-14), alineando el path legacy con la regla oficial y con el kernel exacto (`shared/src/monetary/decimal-text.ts`).

**Comportamiento afectado (casos exact-half):** `20.203515`, `0.123455`, `1.234565`, `8.686375` y sus espejos negativos pasan de `...1`/`...5`/`...6`/`...7` a `...2`/`...6`/`...7`/`...8`. El golden corpus no contiene casos exact-half divergentes (14/14 siguen pasando sin regeneración). `decimal-document-parity.spec.ts` (19/19) y `validator.spec.ts` (72/72) pasan; el delta de expecteds en el validador queda absorbido por la tolerancia `0.001` (|Δ| = 0.00001).

**No cambia:** la tolerancia de `amountsEqual` (0.001) se mantiene; se documenta como deuda sin respaldo oficial. `round5` sigue devolviendo `number` (contrato preservado); la exactitud bit-a-bit solo la garantiza el path exacto (`DecimalDocument*`).

**Nuevos artefactos:** `packages/sdk/src/tax/calculator.limits.spec.ts` (oráculo decimal: 6 divergentes + 7 controles + idempotencia + candado de frontera `DecimalDineroType`).

`@dojocoding/hacienda-shared` no recibe changeset: su código no cambia (el kernel exacto ya existía). Configuración `linked: [["@dojocoding/*"]]` en `.changeset/config.json` se re-verificó en apply.
