## 0. Verificación de prerrequisitos

- [x] 0.1 Confirmar que `scaledFromNumber` y `formatScaledDecimal` existen en `shared/src/monetary/decimal-text.ts` con las firmas asumidas (`(value: number, scale: number) => bigint` / `(scaled: bigint, scale: number) => string`), que `scaledFromNumber` convierte vía round-trip `String(value)` (ya verificado en planning contra decimal-text.ts:110-118), y documentar la cadena de signo: escala del valor absoluto + re-sign del `bigint` (líneas 114-117) y restauración de `-` en `formatScaledDecimal` (líneas 97-98); si difieren del descrito, ajustar D1.
- [x] 0.2 Confirmar rutas: suite oráculo objetivo en `packages/sdk/src/tax/`; golden corpus en `packages/sdk/src/golden-corpus/golden-corpus.spec.ts` (regenerable con `GOLDEN_CORPUS_UPDATE=1`); `decimal-document-parity.spec.ts` y `validator.spec.ts` en `packages/sdk/src/{tax,xml}/`; `MIGRATION.md` en raíz y `packages/sdk/MIGRATION-v4.4.md`; `.changeset/` en raíz. Confirmar que `normalizeMonetaryInput` y `MonetaryValueError` existen y lanzan fuera de cota (ya verificado en planning: decimal-text.ts:44-49, 167-183); si difieren, ajustar D5 antes de implementar. Confirmar el contenido de `.changeset/config.json` — tipo (`linked`), grupo (`[["@dojocoding/*"]]`), y cómo propaga versiones en release (ya inspeccionado en planning); documentar el resultado porque Task 3.4 depende de él; si el grupo no incluye SDK o shared, ajustar Task 3.4.
- [x] 0.3 Reconstruir `shared` (`pnpm --filter @dojocoding/hacienda-shared build`) antes de typecheck del SDK, porque el workspace consume `dist`.
- [x] 0.4 Auditar consumidores de `round5` y de `amountsEqual` en `packages/**/*.ts` y `shared/**/*.ts`: lista de verificación en planning — `calculator.ts` (~40 call sites internos), `xml/validator.ts` (5+ call sites computando expecteds, barridos `tax/index.ts` y `sdk/src/index.ts` como barrels), `amountsEqual` solo en `validator.ts` y NO invoca `round5` (tolerancia sobre diferencia cruda). Confirmar la lista en apply; documentar en el changeset que el delta del fix en el validador (expecteds exact-half) queda absorbido por la tolerancia `0.001` (|Δ| = 0.00001 < 0.001) y que los barrels solo re-exportan.

## 1. Corrección de redondeo

- [x] 1.1 Redefinir `round5` en `packages/sdk/src/tax/calculator.ts` para usar `scaledFromNumber` + `formatScaledDecimal` (HALF_UP) en lugar de `Number.toFixed(5)`. Importar desde `@dojocoding/hacienda-shared`.
- [x] 1.2 Reescribir el JSDoc de `round5` (hoy dice "Uses JavaScript `Number.toFixed(5)`…") citando el Anexo p. 13-14, explicando que `toFixed` opera sobre la representación binaria sin coincidir consistentemente con HALF_UP decimales, y documentando que el retorno `number` pierde exactitud al reconstruir el binario (la exactitud bit-a-bit la garantiza el path exacto) y que el signo se preserva (negativos intermedios incluidos).
- [x] 1.3 Añadir comentario sobre la tolerancia `0.001` documentándola como deuda explícita: sin respaldo oficial directo (la tolerancia actual es `0.001`, 3 decimales; no hay respaldo oficial para ninguna tolerancia de comparación de montos en 5 decimales); se mantiene por la regla del audit ("no cambiar tolerancias sin respaldo"); el Anexo v4.1 (p. 12) habla de márgenes para sistemas de 2 decimales y NO se cita como justificación. No cambiar el valor.

## 2. Oráculo decimal en casos límite

- [x] 2.1 Crear `packages/sdk/src/tax/calculator.limits.spec.ts` con la siguiente grilla (los valores legacy de la tabla fueron verificados empíricamente con node durante planning, iteración 2; Task 2.2 los re-corrobora antes de commitear):

  | input          | legacy `toFixed(5)` real | Anexo HALF_UP | ¿diverge?              |
  | -------------- | ------------------------ | ------------- | ---------------------- |
  | `20.203515`    | `20.20351`               | `20.20352`    | sí                     |
  | `0.123455`     | `0.12345`                | `0.12346`     | sí                     |
  | `1.234565`     | `1.23456`                | `1.23457`     | sí                     |
  | `8.686375`     | `8.68637`                | `8.68638`     | sí                     |
  | `-20.203515`   | `-20.20351`              | `-20.20352`   | sí                     |
  | `-0.123455`    | `-0.12345`               | `-0.12346`    | sí                     |
  | `0.000005`     | `0.00001`                | `0.00001`     | no (control)           |
  | `-0.000005`    | `-0.00001`               | `-0.00001`    | no (control)           |
  | `0.1 + 0.2`    | `0.30000`                | `0.30000`     | no (control computado) |
  | `-(0.1 + 0.2)` | `-0.30000`               | `-0.30000`    | no (control computado) |
  | `1 / 3`        | `0.33333`                | `0.33333`     | no (control computado) |
  | `2 / 3`        | `0.66667`                | `0.66667`     | no (control computado) |
  | `0.7 + 0.1`    | `0.80000`                | `0.80000`     | no (control computado) |

  Cada caso compara `round5(value)` contra `Number(formatScaledDecimal(scaledFromNumber(value, 5), 5))`; los 6 divergentes (4 positivos + 2 negativos) demuestran el fix y la simetría del signo, los controles anclan la ausencia de drift en insumos computados. Orden de dependencias explícito: el changeset (Task 3.4) y `MIGRATION.md` (Task 3.5) se escriben DESPUÉS de la corrección de Task 2.2, no antes; si algún valor de la tabla se corrigiera en apply, la lista de casos en el changeset usa los valores corregidos.

- [x] 2.2 Verificar empíricamente en apply (con node) el comportamiento legacy de cada input antes de commitear el test, para asegurar que la suite demuestra el fix y no simplemente pasa.
- [x] 2.3 Añadir test de idempotencia: `round5(round5(x)) === round5(x)` para toda la grilla (positivos y negativos); documentar cualquier limitación de idempotencia si existiera.
- [x] 2.4a Candado de frontera superior por aserción, con valores representables en float64 (verificación de planning: los literales `9999999999999.999994`/`.999995` colapsan a `10000000000000`, ULP ≈ 0.002 en esa magnitud): asertar que `round5(10000000000000)` (input ya más allá del máximo XSD `9999999999999.99999`) devuelve `10000000000000` sin throw ni clipping, y que `round5(9999999999999.5)` devuelve `9999999999999.5` sin throw; el comentario que referencia D5 es secundario al test. Documentar además el colapso inherente del contrato `number` en magnitudes grandes (a partir de ~6.87e10 el ULP excede 1e-5 y decimales distintos colapsan a un mismo float; p. ej. `9999999999999.123455` colapsa a `...123`), como limitación propia del path legacy que el kernel no puede curar.
- [x] 2.4b (opcional; puede ir a change aparte si el acoplamiento del schema lo complica) test de integración de frontera: un documento con monto igual al máximo redondeado hacia arriba es rechazado por la capa de validación (schema/XSD), no por `round5`; si no cabe, documentar el rechazo como propiedad sin test nuevo y declararlo como deuda diferida (ver Non-Goals de design.md) — no como omisión silenciosa.

## 3. Regresión, baseline y documentación

- [x] 3.1 Ejecutar la suite del golden corpus (`pnpm --filter @dojocoding/hacienda-sdk test src/golden-corpus`); identificar los casos exact-half cuyo XML cambia por HALF_UP. Ampliar la lista con cualquier test de consumidor (Task 0.4) que dependa del comportamiento legacy.
- [x] 3.2 Regenerar goldens con el mecanismo oficial del spec (`GOLDEN_CORPUS_UPDATE=1`, "Regeneración deliberada") y commitear el diff; listar cada archivo/campo afectado en el changeset. Rechazar cualquier cambio que no se justifique con HALF_UP. El flujo es circular, no lineal: si el corpus expone un caso exact-half que no está en la grilla de Task 2.1, añadirlo a la grilla (ampliar la tabla), regenerar goldens de nuevo, y re-documentar el changeset.
- [x] 3.3 Ejecutar `decimal-document-parity.spec.ts` completo y confirmar que pasa. Verificar que pasa para (a) los casos de la grilla `calculator.limits.spec.ts` y (b) documentos completos. Documentar que tras el fix la paridad legacy/exact es por construcción (ambos comparten kernel) y que el test queda como regresión contra futuras modificaciones de `round5`.
- [x] 3.3b Ejecutar `packages/sdk/src/xml/validator.spec.ts` con foco en casos exact-half y confirmar empíricamente la afirmación de Impact: el delta entre el `expected` recalculado con HALF_UP y el `actual` del input queda dentro de la tolerancia `0.001` (planning estima |Δ| = 0.00001). Si algún caso excede la tolerancia, listarlo como breaking adicional en el changeset (Task 3.4) y en `MIGRATION.md` (Task 3.5), con el diagnóstico: ¿drift acumulado multiplataforma o expected sin actualizar?
- [x] 3.4 Crear changeset `minor` para `@dojocoding/hacienda-sdk` únicamente: `shared` no recibe changeset porque su código no cambia (`linked: [["@dojocoding/*"]]` ya presente en `.changeset/config.json`, verificado en planning y re-confirmado en Task 0.2; verificar en apply cómo la configuración de linked propaga versiones en release y documentar el resultado — no crear changeset vacío para `shared`). Incluir la corrección de redondeo, la diferencia de comportamiento (HALF_UP vs binario), el contraste Anexo/XSD, la lista de goldens y consumers afectados, y las deudas diferidas (frontera `DecimalDineroType` sin candado en capa schema si Task 2.4b no se ejecuta).
- [x] 3.5 Añadir sección a `MIGRATION.md` (raíz) con la corrección y los casos afectados; complementar con `packages/sdk/MIGRATION-v4.4.md` si toca el contrato v4.4.

## 4. Spec y verificación

- [x] 4.1 Verificar `openspec validate fix-monetary-rounding-half-up` válido.
- [x] 4.2 Ejecutar `pnpm verify` y confirmar exit 0.
