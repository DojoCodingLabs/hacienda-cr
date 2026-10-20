## Why

Las obligaciones que A8 tiene que cumplir están contadas en **días hábiles** contra el calendario de feriados costarricense: el Reglamento 44739-H (arts. 21 y 23) fija "2 días hábiles" para transmitir un comprobante "sin internet" y para emitir el electrónico que sustituye a un provisional de contingencia. El SDK no tiene hoy ninguna noción de día hábil: quien implemente ese plazo cuenta días calendario o adivina, y el resultado es una infracción (art. 24) que nadie detecta hasta una auditoría.

Además el calendario no es un detalle del código: es un dato público que cambia con el calendario de otra persona — el mismo argumento que justificó el trabajo de A2 con los catálogos del gobierno. Si el calendario vive hardcodeado, el SDK vuelve a ser "correcto porque alguien lo leyó con cuidado".

## What Changes

- **El calendario de feriados entra como dato vendorizado, no como código**: la tabla 2026–2030 en `packages/sdk/schemas/feriados/`, con su manifiesto, su hash y su verificación de frescura, entrando por la misma puerta que los XSD y que el job de deriva ya existente.
- **La aritmética de días hábiles, en `America/Costa_Rica`**: `isBusinessDay`, `addBusinessDays`, `businessDaysBetween` y el cálculo de un plazo, con la zona explícita y sin aritmética de coma flotante sobre instantes.
- **El feriado se cuenta en su fecha observada, no en la nominal**: el que cae en martes o miércoles se traslada al lunes anterior; el que cae de jueves a domingo, al lunes siguiente. La regla y su fuente quedan declaradas junto al dato.
- **El plazo es un parámetro del contrato, no una constante escondida**: el "2 días hábiles" del reglamento se pasa explícitamente, para que A8.2 lo componga con la máquina de estados sin duplicar el número.
- **Verificación contra la tabla real**: las pruebas usan las fechas del calendario vendorizado (Semana Santa de 2026, el feriado nuevo de 2030, los traslados a lunes) y no fechas inventadas.

**BREAKING**: ninguno (superficie nueva).

## Capabilities

### New Capabilities

- `business-days`: el calendario de feriados vendorizado y la aritmética de días hábiles en `America/Costa_Rica` con la que se resuelven los plazos del reglamento.

### Modified Capabilities

Ninguna.

## Impact

- **Código afectado**: `packages/sdk/src/calendar/**` (nuevo), `packages/sdk/src/index.ts` (exports), `scripts/spec-verify.mjs` (el calendario entra en la verificación de frescura).
- **Datos afectados**: `packages/sdk/schemas/feriados/` (nuevo): la tabla 2026–2030, su procedencia y su hash.
- **Riesgo de fuente, declarado**: el calendario disponible hoy viene de un sitio de terceros (`calendariocostarica.com`) y trae las fechas **nominales**, sin los traslados a lunes. La fuente oficial y la regla de traslado se trackerizan en la issue #105; hasta que cierre, el dato se documenta como "procedencia externa, no oficial" y el SDK no lo presenta como la lista que exige el reglamento.
- **Dependencia**: esta change no depende de A8.2 ni de A8.3; es la que desbloquea el plazo de A8.2.
