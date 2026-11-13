## Why

La representación monetaria ya está decidida: el camino exacto usa texto decimal
acotado sobre enteros escalados (`2026-10-19-adopt-decimal-text-money`). Pero el
camino público general sigue exponiendo `number` en los DTOs de `shared`, en
`calculateLineItemTotals`/`calculateInvoiceSummary`, en los builders del SDK y en
`create_invoice` del MCP. Sólo el `draft` del CLI y las familias exact narrow lo
evitan. Un consumidor que quiera exactitud hoy debe reimplementar schemas, cálculo
y serialización, o aceptar la pérdida binaria que el estándar decidió eliminar.

Este change lleva el estándar decidido al camino público **de forma aditiva**:
publica DTOs, cálculo y builders exactos para los siete documentos v4.4 y
`MensajeReceptor`, y migra los adaptadores que aún usan `Number`. No promueve 1.0
ni retira las APIs `Number`: eso queda para el release major posterior.

## What Changes

- **DTOs públicos exactos en `shared/`**: familia `DecimalDocument*` para los
  siete documentos v4.4 (`01`, `02`, `03`, `04`, `08`, `09`, `10`) y
  `DecimalMensajeReceptor*`, con montos, cantidades, tarifas, porcentajes,
  factores y tipos de cambio como texto decimal acotado. Sin `number` en campos
  monetarios y sin coerción a `Number`. Separación explícita entre fuente (sólo
  hechos) y calculado (totales derivados); ambos JSON-safe y clonables con
  `structuredClone`.
- **Cálculo exacto general en el SDK**: `calculateDecimalLineItemTotals`,
  `calculateDecimalInvoiceSummary` y `calculateDecimalDocument` reproducen la
  semántica fiscal de las funciones `Number` actuales (IVA, ISC, impuestos
  específicos, exoneraciones, descuentos, otros cargos y medios de pago) sobre el
  kernel `BigInt`, con la regla única de 5 decimales/HALF_UP. Los totales se
  derivan de las líneas; el builder no acepta totales del llamador.
- **Builders XML exactos**: `buildDecimalDocumentXml` emite los siete tipos con
  texto decimal canónico, reutiliza identidad, orden de campos y variantes por
  familia, y valida contra el XSD oficial. `buildDecimalMensajeReceptorXml`
  cubre el acuse. Los builders y bytes `Number` publicados no cambian.
- **Migración de adaptadores**: el CLI deja de mantener su schema draft local y
  usa la familia compartida en `draft`, `validate` y `submit`; el MCP gana
  `create_invoice_exact` y el recurso de schema correspondiente, sin alterar
  `create_invoice` ni `draft_invoice`.
- **Pruebas y documentación**: propiedades con oráculo decimal independiente,
  conformidad XSD nativa para los ocho roots, round-trip JSON/XML exacto, rechazo
  de exponenciales/fuera de cota/precisión excesiva, regresión del baseline
  publicado y consumidor empaquetado; guía de migración de `number` a texto y
  límites de soporte.
- **Sin BREAKING**: los schemas, tipos, calculadores, builders y herramientas
  `Number` siguen existiendo y con su comportamiento; la ruta exacta nueva es
  adicional.

Fuera de alcance: promover 1.0, borrar o deprecar formalmente las APIs `Number`,
definir nueva semántica fiscal de REP o de mensajes de receptor, implementar
response trust, publicar el mock, o habilitar llamadas fiscales reales.

## Capabilities

### New Capabilities

- `monetary-public-dtos`: contratos públicos de documento con representación
  monetaria exacta (texto decimal acotado), cálculo derivado y serialización
  schema → cálculo → XML → JSON, incluidos los adaptadores CLI y MCP.

### Modified Capabilities

- `monetary-integral`: el tipo monetario del camino público general también es
  texto decimal acotado y su aritmética se delega en el kernel único; la regla de
  redondeo y sus límites no se duplican en schemas, calculadores ni builders.

## Impact

- **Código**: `shared/src/schemas/**` (familia decimal y barrels),
  `shared/src/types/**` (tipos derivados), `packages/sdk/src/tax/**` (cálculo
  general exacto), `packages/sdk/src/documents/**` (builder decimal y mapeo),
  `packages/sdk/src/index.ts`, `packages/cli/src/{commands,utils}/**`,
  `packages/mcp/src/{tools,resources}/**`.
- **API pública**: exports nuevos en `@dojocoding/hacienda-shared` y
  `@dojocoding/hacienda-sdk`; `create_invoice` y `draft_invoice` del MCP intactos
  y una herramienta exacta adicional. Sin retiros ni cambios de firma en las APIs
  `Number`.
- **Datos y bytes**: los DTOs decimales son JSON-safe; los montos conservan sus
  dígitos al serializar/clonar. El baseline de bytes del camino `Number` y de las
  familias exact narrow sigue siendo la referencia de no regresión.
- **Tests**: unitarios de schema y rechazo, propiedades con oráculo
  independiente, conformidad XSD, round-trip JSON/XML, integración CLI/MCP,
  consumidor empaquetado y regresión de baseline.
- **Docs**: `MIGRATION.md`, README del SDK, guía de la nueva API decimal y notas
  de release; se declara que la adopción es opt-in y que 1.0 no se promueve aquí.
- **Riesgo residual**: dos caminos monetarios coexisten mientras dure la
  transición; la documentación debe impedir que un consumidor mezcle DTOs
  `number` con la ruta decimal o crea que la aceptación del schema equivale a
  aceptación fiscal.
