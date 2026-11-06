## MODIFIED Requirements

### Requirement: Los contratos Number legacy se preservan

Las funciones, schemas, tipos y builders que hoy aceptan `number` SHALL conservar
su firma y su comportamiento publicado, con una única excepción documentada: la
corrección del redondeo de `round5` a `HALF_UP` (5 decimales) respaldada por el
Anexo de Hacienda (p. 13–14), que sustituye el redondeo binario de
`Number.toFixed(5)` (que no coincide consistentemente con ninguna regla decimal
exacta, porque depende del último bit del float) por el redondeo oficial. La ruta decimal SHALL ser adicional
y no SHALL modificar los bytes ni los cálculos del baseline existente, salvo los
casos exact-half afectados por la corrección anterior, que se documentan en el
changeset y en `MIGRATION.md`. Un consumidor NO SHALL verse obligado a migrar
para seguir usando la API `Number`.

#### Scenario: La API Number sigue funcionando

- **WHEN** un consumidor llama a `calculateLineItemTotals`, `calculateInvoiceSummary` o un builder con montos `number`
- **THEN** obtiene el mismo resultado que antes del change, salvo en los casos exact-half donde el redondeo oficial (`HALF_UP`) difiera del binario anterior (`toFixed`)

#### Scenario: El baseline publicado no cambia

- **WHEN** se ejecuta la regresión de bytes y cálculos publicados
- **THEN** los hashes del camino `Number` coinciden con los registrados, excepto en los casos exact-half afectados por la corrección de redondeo a `HALF_UP`, documentados en el changeset con cita al Anexo

#### Scenario: La adopción es opt-in

- **WHEN** un consumidor no usa la nueva familia decimal
- **THEN** su código sigue compilando y ejecutándose sin cambios

## ADDED Requirements

### Requirement: Oráculo decimal en casos límite

La suite SHALL incluir un test (`calculator.limits.spec.ts`) con una grilla de
valores exact-half en dos grupos: casos divergentes verificados empíricamente
(`20.203515` → legacy `20.20351` / Anexo `20.20352`, `0.123455`, `1.234565`,
`8.686375`, y sus espejos negativos `-20.203515`, `-0.123455`) y controles
negativos que NO divergen (`0.000005`, `-0.000005`, `0.1 + 0.2`, `-(0.1 + 0.2)`,
`1/3`, `2/3`, `0.7 + 0.1`), comparando el resultado de `round5` contra el
oráculo exacto `scaledFromNumber` (HALF_UP, vía representación decimal
round-trip). Todo valor de la grilla SHALL pasar tras la corrección; si alguno
falla, la suite identifica el valor y la divergencia. La suite SHALL además
documentar el comportamiento en la frontera de `DecimalDineroType` del XSD
oficial mediante aserciones con valores representables (sin throw ni clipping,
según D5) y SHALL incluir un test de idempotencia de la grilla. La tolerancia
de comparación `amountsEqual` (0.001) NO SHALL cambiarse en este change.

#### Scenario: La grilla de casos límite pasa

- **WHEN** se ejecuta `calculator.limits.spec.ts`
- **THEN** todos los valores de la grilla coinciden entre `round5` y el oráculo exacto

#### Scenario: Un nuevo caso límite que diverge falla

- **WHEN** se añade un valor a la grilla para el que `round5` y el oráculo exacto difieran
- **THEN** el test falla e identifica el valor y la divergencia

#### Scenario: La tolerancia no cambia

- **WHEN** se revisa `amountsEqual` tras el change
- **THEN** su tolerancia sigue siendo `0.001` y el comentario la documenta como deuda sin respaldo oficial directo, sin citar el Anexo v4.1 (márgenes para sistemas de 2 decimales) como justificación

#### Scenario: La frontera DecimalDineroType queda documentada

- **WHEN** se revisa `calculator.limits.spec.ts` tras el change
- **THEN** existen casos límite de redondeo en frontera con el XSD `DecimalDineroType` (`fractionDigits=5`, `maxInclusive=9999999999999.99999`, `minInclusive=0`), y está documentado que `round5` no clippea ni lanza: el dominio lo imponen schemas/normalización
