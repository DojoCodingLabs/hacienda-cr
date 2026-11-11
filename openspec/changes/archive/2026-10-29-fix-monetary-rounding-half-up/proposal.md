## Why

El path legacy de montos (`packages/sdk/src/tax/calculator.ts::round5`) usa `Number.toFixed(5)`, que opera sobre la representación binaria del float: su resultado no coincide consistentemente ni con half-to-even ni con HALF_UP decimales (depende del último bit del float; el propio audit lo describe como "no implementa por definición redondeo bancario decimal exacto"). La regla oficial de Hacienda (Anexos v4.4, p. 13–14) exige `HALF_UP` (incrementar cuando el sexto decimal es ≥ 5). El path exacto (kernel `packages/sdk/src/tax/exact-decimal.ts`, que consume las primitivas de representación `scaledFromNumber` / `scaledFromPlainDecimal` / `formatScaledDecimal` de `shared/src/monetary/decimal-text.ts`) ya implementa `HALF_UP` correctamente, por lo que los dos paths divergen en los casos límite exactos (p. ej. `20.203515` → oficial `20.20352`, legacy `20.20351`). La auditoría (`INDENTS/sdk-robustness-audit.md`) pide contrastar el XSD oficial, agregar un oráculo decimal y casos límite, y no cambiar tolerancias sin respaldo.

## What Changes

- **Corrección de redondeo (respaldada por el Anexo)**: `round5` deja de usar `Number.toFixed(5)` y pasa a usar el kernel exacto (`scaledFromNumber` + `formatScaledDecimal`), aplicando `HALF_UP` a 5 decimales. Esto alinea el path legacy con la regla oficial y con el path exacto. **BREAKING** a nivel de bytes para casos exact-half (documentado en changeset y `MIGRATION.md`).
- **Oráculo decimal en límites**: nueva suite `calculator.limits.spec.ts` con una grilla de valores que aterrizan exactamente en .5 del sexto decimal, comparando `round5` (tras la corrección) contra `scaledFromNumber`. Documenta cualquier divergencia residual. La revisión planning verificó cuáles valores divergen realmente (`20.203515`, `0.123455`, `1.234565`, `8.686375`) y cuáles son controles negativos (`0.000005`, `0.1+0.2`, `1/3`, `2/3`, `0.7+0.1`).
- **Contraste con el XSD (audit: "contrastar XSD oficiales actuales")**: la regla HALF_UP proviene del Anexo p. 13–14 (no del XSD). El XSD `DecimalDineroType` sí restringe el formato (`totalDigits=18`, `fractionDigits=5`, `maxInclusive=9999999999999.99999`, `minInclusive=0`, verificado en `FacturaElectronica_V4.4.xsd`). El change cubre ambos: la regla por Anexo (fix de `round5`) y la conformidad con `DecimalDineroType` por test de frontera, sin clipping ni throw dentro de `round5` — el dominio se impone en la frontera de schema/normalización (ver D5).
- **Tolerancia documentada, no cambiada**: `amountsEqual` mantiene `0.001`. El Anexo v4.1 menciona márgenes de error para sistemas de 2 decimales, no para 5; no hay respaldo oficial directo para `0.001`. Se mantiene por la regla del audit ("no cambiar tolerancias sin respaldo") y se documenta como deuda explícita; el comentario no citará v4.1 como justificación directa. No se aprieta sin evidencia oficial (requeriría change aparte con evidencia).
- **Baseline actualizado**: los hashes de bytes/cálculo del golden corpus se regeneran solo en los casos afectados por `HALF_UP`; el diff se documenta en el changeset.
- **Spec actualizada**: el requisito "Los contratos Number legacy se preservan" se aclara: las firmas y la API se preservan, pero la corrección de redondeo a `HALF_UP` (respaldada por el Anexo) es una excepción documentada.

## Capabilities

### New Capabilities

- (ninguna — se extiende la capability existente)

### Modified Capabilities

- `monetary-integral`: el requisito "Los contratos Number legacy se preservan" se aclara para permitir la corrección de redondeo a `HALF_UP` respaldada por el Anexo, y se añade un requisito sobre el oráculo decimal en casos límite.

## Impact

- `packages/sdk/src/tax/calculator.ts` (`round5`; ~40 call sites internos).
- `packages/sdk/src/xml/validator.ts` (consumidor de `round5` para expecteds de validación; el delta del fix en exact-half queda absorbido por la tolerancia `0.001`, que es mayor que la divergencia de 0.00001 — sin cambio de valor de tolerancia).
- `packages/sdk/src/tax/calculator.limits.spec.ts` (nuevo).
- `openspec/specs/monetary-integral/spec.md` (delta).
- Golden-corpus expected bytes (solo casos exact-half).
- `.changeset/` (minor solo para `@dojocoding/hacienda-sdk`; `shared` no recibe changeset porque su código no cambia) y `MIGRATION.md`.
