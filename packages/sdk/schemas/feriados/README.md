# Feriados costarricenses 2026–2030 (vendorizados)

Este directorio contiene el calendario de feriados como **dato vendorizado**, no como código. Entrar en la verificación de frescura (`pnpm spec:verify`) y en el job de deriva (`spec-drift`) igual que los esquemas XSD.

## Archivos

- `feriados-2026-2030.json` — tabla de feriados con fechas **nominales** por año
- `manifest.json` — (en el directorio padre `schemas/`) declara hash, bytes y procedencia

## Procedencia

| Campo    | Valor                                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fuente   | `calendariocostarica.com` (sitio de terceros)                                                                                                                                                                            |
| URL      | `https://www.calendariocostarica.com/feriados/`                                                                                                                                                                          |
| Tipo     | Externa, **no oficial**                                                                                                                                                                                                  |
| Rango    | 2026–2030 (inclusive)                                                                                                                                                                                                    |
| Garantía | El dato reproduce lo publicado por ese sitio al momento de vendorizar. **No** es la lista que exige el Reglamento 44739-H. La fuente oficial y la confirmación de la regla de traslado se trackean en la **issue #105**. |

> **Importante**: Mientras la issue #105 no se cierre, este calendario se declara explícitamente como de **procedencia externa, no oficial**. El SDK no lo presenta como la lista que exige el reglamento.

## Fechas nominales vs. observadas

La tabla vendorizada declara las **fechas nominales** (la fecha calendaria del feriado según la ley o tradición). La **fecha observada** —el día en que efectivamente no se trabaja— se **deriva** de la nominal mediante la **regla de traslado** declarada abajo. **No** se escriben las observadas a mano en la tabla.

### Regla de traslado (fecha observada)

| Día de la semana de la fecha nominal | Fecha observada |
| ------------------------------------ | --------------- |
| Lunes                                | El mismo lunes  |
| Martes                               | Lunes anterior  |
| Miércoles                            | Lunes anterior  |
| Jueves                               | Lunes siguiente |
| Viernes                              | Lunes siguiente |
| Sábado                               | Lunes siguiente |
| Domingo                              | Lunes siguiente |

La regla se implementa en `packages/sdk/src/calendar/observed.ts` y se prueba exhaustivamente (7 casos, uno por día de la semana).

## Cobertura de años

La tabla cubre **2026–2030 inclusive**. Fechas fuera de este rango son **rechazadas explícitamente** por la aritmética de días hábiles (no se cuentan como día hábil ni se asumen libres).

## Verificación de frescura

El archivo entra en `pnpm spec:verify` a través del `manifest.json` del directorio `schemas/`. Cualquier edición manual del JSON hace fallar la verificación por hash.

El job de deriva mensual (`.github/workflows/spec-drift.yml`) compara el hash contra una nueva descarga de la fuente y abre un issue si hay diferencias.

## Actualización

1. Descargar la tabla actualizada de la fuente
2. Reemplazar `feriados-2026-2030.json` (o extender el rango de años)
3. Ejecutar `pnpm spec:update` — reescribe hashes, bytes y `lastSyncedAt` en `manifest.json`
4. Revisar el diff y commitear

> La tabla no se reformatea: se commitea byte-for-byte como se descarga.
