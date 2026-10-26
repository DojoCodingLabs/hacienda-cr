## Context

Ver `proposal.md` — Why. El repositorio ya tiene tres piezas que condicionan el
diseño:

1. `shared/src/monetary/decimal-text.ts` define la frontera canónica (patrón,
   cotas, normalización y errores) y `packages/sdk/src/tax/exact-decimal.ts` es el
   kernel único de aritmética escalada con la regla 5 decimales/HALF_UP.
2. Las familias exact narrow (`exact-fe`, `exact-te`, `exact-nc`, `exact-nd`,
   `exact-fec`, `exact-fe-replacement`, etc.) ya son aditivas, estrictas y
   orientadas a un `caseCode`; no cubren el camino público general ni todos los
   regímenes que el camino `Number` acepta.
3. El CLI ya emite un draft FE de texto decimal con un schema local
   (`draft-document.ts` + `draft-money.ts`), mientras el SDK y el MCP siguen
   usando `Number`. Esa duplicación es el principal riesgo de deriva.

El contrato de la rama (`AGENTS.md`) exige preservar las APIs `Number` y no
normalizar a `Number`; el change es aditivo. El runtime de esquemas y la
autoridad 2024/2026 son un workstream separado (`align-runtime-to-2024-schemas`);
este diseño no cambia esa autoridad.

## Goals / Non-Goals

**Goals:**

- Publicar una familia decimal pública, completa y estricta para los siete
  documentos y `MensajeReceptor`, con fuente y calculado separados.
- Reutilizar la frontera y el kernel existentes; no introducir una segunda regla
  de redondeo ni una segunda representación monetaria.
- Reutilizar el mapeo XML y las variantes por familia para que la ruta decimal y
  la ruta `Number` no diverjan en orden de campos ni en identidad.
- Migrar CLI y MCP a la familia compartida sin cambiar las APIs `Number`.
- Dejar evidencia ejecutable de paridad fiscal, exactitud JSON/XML y conformidad
  XSD antes de promover 1.0.

**Non-Goals:**

- Cambiar la firma o el comportamiento de `FacturaElectronicaSchema`,
  `calculateLineItemTotals`, `calculateInvoiceSummary` o los builders actuales.
- Generalizar las familias exact narrow ni reinterpretar sus `caseCode`.
- Definir semántica fiscal de REP, conciliación de pagos o aceptación de
  `MensajeReceptor`.
- Cambiar la autoridad de esquemas, la validación de firma o response trust.
- Publicar, etiquetar o promover 1.0.

## Decisions

| Decisión                                                                       | Racional                                                                                                                                                           | Alternativas consideradas                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **Familia nueva `DecimalDocument*`, no mutación de los tipos legacy**          | El contrato de la rama exige preservar `Number`; una familia nueva permite migrar sin romper y retirar después en un major                                         | Cambiar `FacturaElectronica` a `string` ahora (breaking prematuro)                            |
| **Schemas por tipo + unión discriminada con `tipoDocumento`**                  | Cada root tiene reglas propias; la unión permite despacho único y rechazo de tipos desconocidos. Los schemas por tipo se pueden usar sin discriminante (CLI draft) | Un solo schema laxo con campos opcionales (aceptaría documentos inválidos)                    |
| **Fuente vs calculado**                                                        | Los totales son derivados; aceptarlos permitiría documentos incoherentes. El calculado es un DTO de salida JSON-safe                                               | Aceptar el DTO completo del llamador y “verificar” después (más surface y confianza indebida) |
| **Ser estrictos en todos los niveles**                                         | Un campo desconocido no debe perderse en silencio en un documento fiscal; el camino legacy conserva su laxitud                                                     | Reutilizar `.extend()` de schemas legacy sin `.strict()` (proyección silenciosa)              |
| **Reutilizar `MONETARY_TEXT_PATTERN`, cotas y `MonetaryValueError`**           | Una sola definición de límites evita que schema y kernel discrepen                                                                                                 | Regex y constantes locales por familia (el defecto que el change anterior eliminó)            |
| **Escalas por campo, no una escala única**                                     | El XSD distingue dinero (5), cantidad (3), tarifa (2), factor (4), proporción (5); una escala única rechazaría datos válidos o aceptaría inválidos                 | Forzar todo a 5 decimales (no representa cantidades ni factores correctamente)                |
| **Port exacto del orden de cálculo legacy**                                    | La paridad fiscal es un requisito; cambiar el orden cambia redondeos. El kernel ya ofrece `multiply`, `percent` y `ratio`                                          | Reescribir la semántica “más limpia” (rompe paridad y el baseline)                            |
| **XML: mapeo compartido, valores `string \| number`**                          | Evita duplicar el orden de elementos y las variantes; el mapper sólo serializa, no calcula                                                                         | Un mapper decimal paralelo (deriva de orden y de variantes)                                   |
| **Calculado canónico sin ceros forzados; XML monetario con 5 decimales fijos** | JSON legible y estable; XML cumple `fractionDigits` y es determinista. Coincide con el precedente exact FE                                                         | JSON con 5 fijos (ruido) o XML trimado (bytes variables)                                      |
| **REP y `MensajeReceptor`: representación y consistencia, sin inferencia**     | El workstream REP/receptor es separado; este change no debe inventar asignación de pagos ni aceptación                                                             | Calcular REP como una factura (semántica no establecida)                                      |
| **CLI: schema FE compartido sin discriminante**                                | Mantiene el JSON del draft y elimina la aritmética local; `draft`, `validate` y `submit` comparten una sola verdad                                                 | Añadir `tipoDocumento` al draft (cambio de salida innecesario)                                |
| **MCP: herramienta nueva `create_invoice_exact`**                              | Aditivo y explícito; `create_invoice` conserva su contrato y sus consumidores                                                                                      | Cambiar `create_invoice` para aceptar texto (rompe expectativas de salida y mezcla caminos)   |
| **Cambio menor de paquetes, sin 1.0**                                          | Es aditivo; 1.0 requiere además response trust y la decisión de retirar `Number`                                                                                   | Promover 1.0 aquí (promesa que el propio repo prohíbe)                                        |

### Layout propuesto

- `shared/src/schemas/decimal-fields.ts`: schemas de dinero, cantidad, tarifa,
  porcentaje, factor, tipo de cambio, impuesto, descuento, exoneración,
  `DatosImpuestoEspecifico`, otros cargos y medios de pago.
- `shared/src/schemas/decimal-document.ts`: schemas fuente/calculado por tipo y
  la unión discriminada; tipos inferidos.
- `shared/src/schemas/decimal-recipient.ts`: `MensajeReceptor` exacto.
- `shared/src/schemas/index.ts` y `shared/src/index.ts`: barrels.
- `packages/sdk/src/tax/decimal-document.ts`: calculador general.
- `packages/sdk/src/documents/decimal-document-builder.ts` y
  `decimal-recipient-builder.ts`: builders y mapper.
- `packages/cli/src/utils/draft-document.ts` y `draft-money.ts`: wrappers
  delgados sobre shared/SDK, sin aritmética propia.
- `packages/mcp/src/tools/create-invoice-exact.ts` y
  `packages/mcp/src/resources/factura-exact-schema.ts`.

### Orden de cálculo

El calculador reproduce el orden de `calculateLineItemTotals` y
`calculateInvoiceSummary`, sustituyendo cada operación por el primitivo exacto:

1. `MontoTotal = round(cantidad × precioUnitario, 5)`.
2. Descuentos: suma exacta de `montoDescuento` y `SubTotal = MontoTotal − descuentos`.
3. `BaseImponible = SubTotal + Σ impuestos específicos 02/04/05 calculados sobre SubTotal`.
4. Cada impuesto: base = `BaseImponible` para códigos IVA, `SubTotal` para el resto.
   Se conservan las fórmulas de 03–06, el monto explícito de 05, el ISC 02 y la
   validación de tarifa/monto del camino legacy.
5. Exoneración: porción = `round(base × tarifaExonerada / 100, 5)`; impuesto neto
   = `max(0, bruto − porción)`.
6. `ImpuestoNeto = round(Σ netos, 5)`; `MontoTotalLinea = round(SubTotal + ImpuestoNeto, 5)`.
7. Resumen: clasificación gravado/exento/exonerado, totales por servicio/mercancía,
   descuentos, desglose por `(codigo, codigoTarifaIVA)`, otros cargos y pagos.
8. Cada resultado se valida contra la cota antes de continuar; el total de pagos
   debe cuadrar con `TotalComprobante`.

Las diferencias de tolerancia del camino legacy (`1e-6`) se resuelven comparando
en la escala exacta del campo y rechazando lo que no sea representable; se
documenta como diferencia de precisión, no como cambio de régimen.

### Esquema y serialización

- La fuente acepta texto decimal plano, incluidos ceros finales; el calculado
  emite la forma canónica sin ceros finales. El XML monetario usa 5 decimales
  fijos; cantidad, tarifa, factor y porcentaje usan su escala canónica.
- `DecimalMensajeReceptor*` conserva `montoTotalImpuesto`,
  `montoTotalImpuestoAcreditar`, `montoTotalDeGastoAplicable` y `totalFactura`
  como texto; no calcula.
- REP fuente lleva los importes por línea como hechos (no hay cantidad/precio) y
  el calculador sólo agrega y verifica coherencia; no infiere pagos.
- El XML se valida con el mismo `validateDocumentXml`/XSD y las mismas variantes
  por root; el builder rechaza identidad incoherente antes de emitir.
- El mapper compartido se tipa estructuralmente para aceptar `string | number` en
  los campos monetarios. Es un cambio interno: no altera la firma pública de los
  builders `Number`.

### Adaptadores

- **CLI**: `draft` usa `DecimalFacturaInputSchema` y el calculador/builder del
  SDK; `validate` y `submit` detectan texto decimal y usan la misma ruta. Se
  elimina `draftForXml` y se conserva el JSON de salida actual.
- **MCP**: `create_invoice_exact` recibe texto, usa la secuencia persistida igual
  que `create_invoice`, calcula, construye XML y valida XSD. `create_invoice` y
  `draft_invoice` no cambian. El recurso `hacienda://schemas/factura-exact`
  publica el schema de entrada exacto.

### Compatibilidad y verificación

- Changeset **minor** para `shared`, SDK, CLI y MCP (grupo linked).
- Regresión de baseline `Number` y de las familias exact narrow sin cambios.
- Propiedades con el oráculo independiente existente
  (`packages/sdk/src/__testing__/decimal-oracle.ts`) y paridad contra el
  calculador legacy para entradas representables.
- Conformidad XSD de los ocho roots, round-trip JSON/XML y consumidor empaquetado.
- `pnpm verify` como puerta; no se publica ni se etiqueta.

## Risks / Trade-offs

- **[Dos caminos conviven y pueden divergir]** → kernel y frontera compartidos,
  mapper único y pruebas de paridad explícitas; la ruta `Number` queda congelada.
- **[El port de semántica legacy introduce un redondeo distinto]** → mismo orden
  documentado, pruebas de paridad con valores representables y casos adversariales.
- **[Los schemas estrictos rechazan documentos que el camino legacy acepta]** →
  es opt-in y la guía de migración enumera los campos y las diferencias.
- **[REP/MR se confunden con semántica fiscal completa]** → spec y docs declaran
  que sólo representan, validan y serializan; no hay inferencia ni aceptación.
- **[Los consumidores esperan números en JSON]** → la ruta decimal es nueva y
  explícita; el JSON de la ruta `Number` no cambia.
- **[BigInt y propiedades elevan el costo de test]** → presupuesto configurable
  (`PROPERTY_RUNS`/`XSD_RUNS`) y reutilización del oráculo y generadores actuales.
- **[La migración del CLI rompe el draft]** → el schema FE compartido conserva
  los nombres de campo y el JSON de salida; pruebas de contrato del comando.

## Migration Plan

1. Publicar schemas y tipos decimales en `shared`, con tests de aceptación y
   rechazo, antes de tocar el SDK.
2. Implementar calculador y builders en el SDK; verificar paridad y XSD.
3. Refactorizar el CLI para consumir shared/SDK; conservar la salida del draft.
4. Añadir la herramienta y el recurso exactos del MCP; dejar `create_invoice`
   intacto.
5. Añadir propiedades, round-trip, consumidor empaquetado, docs y changeset.
6. Ejecutar `pnpm verify`. Rollback: retirar los exports y la herramienta nuevos;
   como no se modifica el camino `Number`, no hay migración de datos ni de API.

## Open Questions

Ninguna que cambie el alcance o las decisiones. La sintaxis exacta de los
mensajes de error y el nombre final de los helpers internos se pueden ajustar
durante la implementación sin alterar los contratos públicos.
