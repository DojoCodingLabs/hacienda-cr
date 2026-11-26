## Why

El calendario de feriados que resuelve los plazos en días hábiles (Reglamento
44739-H, arts. 21 y 23) tiene hoy tres problemas que la issue #105 dejó
abiertos: cubre sólo 2026, su procedencia es una carta oficial pero la tabla
de terceros que se usó antes era incorrecta, y el spec exige una **regla de
traslado a lunes** que ya no está vigente. Un feriado mal puesto mueve una
fecha fiscal en cualquiera de las dos direcciones.

La investigación de las fuentes cambia el diagnóstico: la Ley 9875 no es una
regla, es un transitorio "por única vez" que enumeró los traslados de 2020 a
2024 y venció. Las cartas MTSS de 2025 y 2026 listan las fechas nominales como
"DÍA DE DISFRUTE"; el proyecto 23.981 (traslado permanente de cuatro feriados)
sigue dictaminado, sin votaciones. Por eso el trabajo no es construir un motor
de reglas: es **vendorizar la fuente oficial, corregir el contrato y dejar un
procedimiento verificable para el año siguiente**.

Ahora es el momento porque las cartas oficiales de 2025 y 2026 existen en un
patrón de URL estable, la 2027 todavía no se publica, y el SDK hoy falla de
forma explícita fuera de 2026: ampliar la cobertura y fijar el proceso es más
barato que descubrir el desfase en un vencimiento.

## What Changes

- **Vendorizar las cartas oficiales del MTSS de 2025 y 2026** en
  `packages/sdk/schemas/feriados/`, junto con su transcripción revisada, su
  hash en el manifiesto y su procedencia declarada. La cobertura pasa de
  `2026–2026` a `2025–2026`.
- **Quitar del spec la regla de traslado obligatoria.** La fecha observada es
  igual a la nominal salvo que una fuente oficial enumere un traslado; en ese
  caso se registra como **override explícito en los datos**, no como fórmula.
  Para 2025–2026 no hay overrides.
- **Corregir la documentación y la fuente única del rango**: el docstring de
  `calculateObservedDate` describe una regla que el código ya no aplica; el
  `CALENDAR_RANGE` de `types.ts` duplica el `yearRange` del JSON.
- **Agregar un procedimiento de refresco, fuera del runtime**: un script que
  sondea el año en curso (control) y el año siguiente, distingue "aún no
  publicado" de "cambió la ruta", descarga el PDF y produce un diff para
  revisión humana. Un cron lo ejecuta desde fines de noviembre; el SDK sigue
  offline y determinista.
- **Cubrir con pruebas** 2025, 2026, un año desconocido y la coincidencia entre
  la tabla revisada y el PDF vendorizado.
- **Aclarar la frescura**: los feriados no están atados a un set del
  `spec-watch`; la verificación remota es el job de refresco, no `spec:check`.
  El spec deja de prometer una frescura que hoy no ocurre.

**BREAKING**: ninguno. La API pública no cambia; se amplía el rango aceptado y
se corrige el contrato del spec. Las fechas 2026 conservan su comportamiento.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `business-days`: cambia el requisito de fecha observada (sin traslado
  obligatorio; override explícito sólo si una fuente oficial lo enumera), se
  amplía la cobertura a 2025–2026, se corrige la procedencia/frescura del
  calendario y se actualizan las pruebas contra la tabla real.

## Impact

- **Código afectado**: `packages/sdk/src/calendar/holidays.ts` (docstring y
  derivación del rango), `packages/sdk/src/calendar/types.ts`
  (`CALENDAR_RANGE`), `packages/sdk/src/calendar/observed.spec.ts` y las
  pruebas de días hábiles.
- **Datos afectados**: `packages/sdk/schemas/feriados/` (PDF y JSON de 2025;
  actualización del README de procedencia), `packages/sdk/schemas/manifest.json`
  (nuevas entradas y hashes).
- **Herramientas afectadas**: nuevo `scripts/holidays-watch.mjs`, su entrada en
  `package.json` y el workflow de CI que lo ejecuta desde noviembre.
- **Documentación afectada**: `openspec/specs/business-days/spec.md`,
  `packages/sdk/schemas/feriados/README.md` y el runbook de actualización.
- **Dependencias**: ninguna nueva. El sondeo usa `fetch` nativo y la
  transcripción se revisa con `pdftotext`, sin agregar una dependencia de PDF
  al SDK.
- **Riesgo legal declarado**: la vigencia del traslado se apoya en el texto de
  la Ley 9875 (transitorio 2020–2024) y en las cartas MTSS de 2025 y 2026; el
  proyecto 23.981 puede cambiar el escenario 2027. La fuente y la fecha de
  revisión quedan escritas junto al dato.
