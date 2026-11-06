## Context

See proposal.md - Why. El path legacy (`round5`) usa `Number.toFixed(5)`, que opera sobre la representación binaria del float sin coincidir consistentemente con HALF_UP decimales; el path exacto y la regla oficial usan `HALF_UP`. El path exacto ya es correcto y no se toca. El change es quirúrgico: `round5` (cambio de comportamiento), `amountsEqual` (solo comentario, sin cambio de valor) y una suite nueva, más documentación.

## Goals / Non-Goals

**Goals:**

- Alinear `round5` con la regla oficial `HALF_UP` (Anexo p. 13-14) reutilizando el kernel exacto.
- Documentar la divergencia preexistente con una suite de oráculo en casos límite (incluye controles negativos: valores que NO divergen).
- Verificar la conformidad de los valores redondeados con la frontera de `DecimalDineroType` del XSD oficial.
- Documentar la tolerancia `0.001` como deuda explícita **sin** citar fuentes que no la respalden.

**Non-Goals:**

- No migrar `validator.ts` a exact-decimal (eso es un change aparte; aquí solo se corrige el redondeo).
- No cambiar la tolerancia `amountsEqual` (sin respaldo oficial para 5 decimales, ni para apretar ni para aflojar).
- No tocar `scaledFromPlainDecimal`, `exact-decimal.ts`, `scaledFromNumber` ni la familia `DecimalDocument*` (ya correctos).
- No meter lógica de dominio `DecimalDineroType` (clipping/throw) dentro de `round5`; el dominio se impone en la frontera de schema/normalización, como hoy.
- No tocar golden-corpus expected bytes salvo casos exact-half documentados (el corpus es regenerable por diseño, ver D3).
- **Deuda declarada**: la frontera `DecimalDineroType` en la capa de schema/normalización NO queda con candado de test en este change (Task 2.4b es opcional). Si no cabe, se declara como deuda diferida en el changeset y se hereda al change futuro de migrar `validator.ts` a exact-decimal, que ya tocará esa capa (D2/D5 la anticipan); nunca como omisión silenciosa.

## Decisions

### D1 - Reusar el kernel exacto, cuya premisa está verificada

`round5(value)` se redefine como `Number(formatScaledDecimal(scaledFromNumber(value, 5), 5))`. **Topología verificada**: las primitivas de representación (`expandExponential`, `scaledFromPlainDecimal`, `formatScaledDecimal`, `scaledFromNumber`) viven en `shared/src/monetary/decimal-text.ts`; `packages/sdk/src/tax/exact-decimal.ts` es el kernel aritmético del SDK que las consume. La premisa, verificada leyendo `decimal-text.ts:110-118`: `scaledFromNumber` lee el número a través de su **representación decimal round-trip** (`expandExponential(String(Math.abs(value)))`) y aplica `HALF_UP` decimales sobre texto plano vía `scaledFromPlainDecimal` (líneas 73-88: incrementa si el primer dígito descartado es ≥ 5). Los artefactos binarios (`0.1 + 0.2` → `0.30000000000000004`) no sobreviven la conversión porque el redondeo se hace sobre el texto round-trip, no sobre `value * 10**scale`. Este reuso solo es correcto porque el kernel opera sobre la representación decimal round-trip; si algún día se reimplementara con multiplicación binaria, D1 dejaría de ser válido.

Cadena de signo (verificada en el código): `scaledFromNumber` escala el valor absoluto y re-singnea el `bigint` resultante (líneas 114-117: `negative ? -scaled : scaled`); `formatScaledDecimal` restaura el prefijo `-` (líneas 97-98); el `Number(...)` final preserva el signo. `round5(-20.203515)` → `-20.20352` (la divergencia es simétrica a la de positivos, verificada con node), mientras el binario legacy daba `-20.20351`. `round5` recibe negativos en la práctica (diferencias intermedias como `montoTotal - totalDescuento` en calculator.ts:256) y el kernel los maneja sin throw.

Caveat (exactitud): `round5` sigue devolviendo `number`. La conversión final `Number(...)` reintroduce la representación binaria más cercana al decimal correcto. La corrección alinea el **valor decimal** con HALF_UP; la exactitud bit-a-bit solo la garantiza el path exacto (`DecimalDocument*`). La migración del validator a exact-decimal sigue siendo Non-Goal.

Alternativa descartada: implementar HALF_UP manualmente con `Math.round(value * 10**5)` — duplica la regla y padece el mismo defecto binario que `toFixed` (`20.203515 * 100000` ≈ `2020351.4999…`).

### D2 - Tolerancia documentada como deuda, con cita honesta

`amountsEqual` mantiene `0.001`. No existe respaldo oficial directo para una tolerancia de 5 decimales. El Anexo v4.1 (p. 12) habla de "márgenes de error" para que **sistemas de 2 decimales** puedan seguir operando — una concesión para legacy, no una tolerancia de 5 decimales — y **no** se citará como justificación directa de `0.001`. El comentario en código dirá: la tolerancia no tiene respaldo oficial directo; se mantiene la actual porque el audit pide no cambiar tolerancias sin respaldo, y se documenta como deuda. Aprieta (p. ej. a 1e-5) requeriría un change aparte con evidencia.

### D3 - Baseline actualizado solo en casos exact-half; el corpus es regenerable

Resolución de la incertidumbre del planning: el golden corpus es **regenerable por diseño** — así lo declara `golden-corpus.spec.ts` ("Regeneración deliberada"): `GOLDEN_CORPUS_UPDATE=1 pnpm --filter @dojocoding/hacienda-sdk test src/golden-corpus`, y los bytes regenerados son el artefacto de revisión del change. Los casos que cambien por HALF_UP se regeneran por ese mecanismo y se listan en el changeset. No se "arregla" ningún test para hacer pasar valores que no correspondan al Anexo.

### D4 - Suite de oráculo como evidencia, no como gate de comportamiento

`calculator.limits.spec.ts` compara `round5` vs el oráculo exacto para una grilla de valores exact-half, organizada en dos grupos: (a) **casos divergentes pre-corrección** — verificados empíricamente con node durante planning: `20.203515` → legacy `20.20351` / Anexo `20.20352`; `0.123455` → `0.12345` / `0.12346`; `1.234565` → `1.23456` / `1.23457`; `8.686375` → `8.68637` / `8.68638`; (b) **controles negativos** que no divergen (`0.000005`, `0.1+0.2`, `1/3`, `2/3`, `0.7+0.1`) — anclan el comportamiento correcto sin falsificaciones y prueban que `scaledFromNumber` no introduce drift en insumos computados. Tras D1 todos deben pasar; la suite queda como regresión contra futuras modificaciones de `round5`.

### D5 - `round5` no aplica la frontera `DecimalDineroType` ni clipping

El XSD `DecimalDineroType` define `totalDigits=18, fractionDigits=5, maxInclusive=9999999999999.99999, minInclusive=0` (verificado en `FacturaElectronica_V4.4.xsd`). La función `round5` es una primitiva aritmética, no un validador de dominio: no hace clipping ni lanza por rango, y no cambia ese rol con este change. El dominio se impone donde ya hoy se impone: schemas/normalización (`normalizeMonetaryInput` → `MonetaryValueError` fuera de cota, existencia y comportamiento verificados en `shared/src/monetary/decimal-text.ts` líneas 44-49 y 167-183) y validación XSD del XML generado. La suite límite sí documenta el comportamiento en frontera: un valor que HALF_UP cruza el máximo (p. ej. insumo ≥ `9999999999999.999995`) produce un valor que el XSD rechaza — se documenta como propiedad y se responde con test, aunque el caso es inalcanzable en la práctica por las cotas del propio SDK (sumas ya acotadas antes de entrar al redondeo). Alternativa descartada: hacer que `round5` lane — duplicaría la validación de dominio en dos capas con semánticas distintas.

## Risks / Trade-offs

- [Riesgo] El golden corpus puede tener más casos exact-half de los esperables → bytes cambian. Mitigación: el corpus es regenerable por diseño y los bytes son el artefacto de revisión; revisar el diff antes de commitear y aceptar solo cambios HALF_UP.
- [Riesgo] Consumidores que dependían del redondeo binario previo. Mitigación: changeset `minor` + sección en `MIGRATION.md` + la regla oficial respalda el cambio.
- [Trade-off] `round5` sigue devolviendo `number` (contrato preservado); la exactitud total solo se logra en el path exacto; la paridad legacy/exact queda por construcción.
