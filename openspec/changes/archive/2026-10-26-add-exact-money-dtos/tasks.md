## 1. Frontera y campos decimales en `shared`

- [x] 1.1 Añadir `shared/src/schemas/decimal-fields.ts` con schemas de monto no negativo y positivo sobre `MONETARY_TEXT_PATTERN`, cantidad (16 dígitos/3 decimales), tarifa (2), factor (4), porcentaje (2), proporción (5) y tipo de cambio; reutilizar cotas y `MonetaryValueError`, sin regex locales.
- [x] 1.2 Definir los schemas decimales de `Impuesto`, `DatosImpuestoEspecifico`, `Exoneracion`, `Descuento`, `OtroCargo`, `MedioPago`, `TotalDesgloseImpuesto` y `CodigoTipoMoneda`, con mensajes que nombren el límite y sin `number` en campos monetarios.
- [x] 1.3 Añadir pruebas de `decimal-fields.spec.ts`: texto válido, número rechazado, exponencial, signo, ceros a la izquierda, precisión excesiva, fuera de cota y límites por escala.
- [x] 1.4 Exportar los schemas y tipos nuevos desde `shared/src/schemas/index.ts` y `shared/src/index.ts`.

## 2. DTOs de documento y `MensajeReceptor`

- [x] 2.1 Implementar fuente y calculado de Factura Electrónica y Tiquete en `shared/src/schemas/decimal-document.ts`, con `.strict()` en raíz y subestructuras y sin campos derivados en la fuente.
- [x] 2.2 Implementar fuente y calculado de Nota de Crédito y Nota de Débito, incluyendo referencias obligatorias y los campos de línea propios de cada familia.
- [x] 2.3 Implementar fuente y calculado de Factura Electrónica de Compra y Factura Electrónica de Exportación, respetando las variantes de línea y los campos obligatorios de cada root.
- [x] 2.4 Implementar fuente y calculado de Recibo Electrónico de Pago: importes por línea como hechos, sin cantidad/precio, con agregación y comprobación de coherencia.
- [x] 2.5 Implementar `shared/src/schemas/decimal-recipient.ts` para `MensajeReceptor`, con montos de texto, sin cálculo ni inferencia.
- [x] 2.6 Publicar la unión discriminada `DecimalDocumentInputSchema`/`DecimalDocumentCalculatedSchema` por `tipoDocumento` y los schemas por tipo usables sin discriminante.
- [x] 2.7 Añadir pruebas de aceptación/rechazo para los siete tipos y `MensajeReceptor`: tipo ausente/desconocido, campos de otra familia, totales inyectados, campos desconocidos y JSON/`structuredClone`.

## 3. Cálculo decimal general en el SDK

- [x] 3.1 Implementar `calculateDecimalLineItemTotals` en `packages/sdk/src/tax/decimal-document.ts` con el orden de cálculo del diseño: bruto, descuentos, subtotal, base, impuestos, exoneración, neto y total de línea.
- [x] 3.2 Implementar el cálculo de impuestos específicos 03–06, ISC 02, IVA por tarifa y la validación de monto/tarifa, conservando la semántica legacy en la escala exacta.
- [x] 3.3 Implementar `calculateDecimalInvoiceSummary` con clasificación gravado/exento/exonerado, totales por servicio/mercancía, descuentos, desglose por código/tarifa, otros cargos y medios de pago.
- [x] 3.4 Implementar `calculateDecimalDocument` como dispatcher por tipo, con validación de fuente, cálculo de líneas/resumen y derivación del total del comprobante.
- [x] 3.5 Implementar la validación de coherencia de REP y `MensajeReceptor` sin inferir pagos, impuestos ni aceptación.
- [x] 3.6 Añadir `decimal-document.spec.ts` con casos de IVA, ISC, impuesto específico, exoneración parcial, descuentos, otros cargos, pagos y errores de cota.
- [x] 3.7 Añadir pruebas de paridad contra `calculateLineItemTotals`/`calculateInvoiceSummary` para entradas exactamente representables y documentar las diferencias por tolerancia legacy.
- [x] 3.8 Añadir `decimal-document.properties.spec.ts` con `fast-check` y el oráculo independiente existente, cubriendo suma de líneas, impuesto por línea, descuentos, exoneraciones y pagos.

## 4. Builders XML decimales

- [x] 4.1 Parametrizar el mapper de `packages/sdk/src/documents/shared-xml-helpers.ts` para aceptar valores monetarios `string | number` sin realizar aritmética, conservando el orden de elementos y las variantes.
- [x] 4.2 Implementar `buildDecimalDocumentXml` con despacho por `tipoDocumento`, identidad, namespace, root y serialización monetaria a 5 decimales fijos.
- [x] 4.3 Implementar `buildDecimalMensajeReceptorXml` con la misma identidad y validación de campos.
- [x] 4.4 Añadir pruebas de conformidad XSD para los ocho roots y casos negativos de identidad incoherente, campo no admitido y monto fuera de cota.
- [x] 4.5 Añadir pruebas de round-trip: fuente → JSON → fuente → cálculo → XML estable, calculado → JSON → calculado idéntico y ausencia de `bigint` serializado.
- [x] 4.6 Exportar calculadores, builders y tipos desde `packages/sdk/src/tax/index.ts`, `packages/sdk/src/documents/index.ts` y `packages/sdk/src/index.ts`.

## 5. Migración del CLI

- [x] 5.1 Reemplazar el schema monetario local de `packages/cli/src/utils/draft-document.ts` por el schema FE compartido, conservando el JSON de salida del draft sin `tipoDocumento`.
- [x] 5.2 Reducir `packages/cli/src/utils/draft-money.ts` a wrappers de presentación sobre el cálculo del SDK; eliminar la aritmética y la regla de redondeo locales.
- [x] 5.3 Migrar `validate` y `submit` para detectar documentos de texto decimal y usar la validación, el cálculo y el builder decimales.
- [x] 5.4 Eliminar `draftForXml` y cualquier cast que oculte el cambio de representación; ajustar los tipos de `draft`.
- [x] 5.5 Actualizar las pruebas del CLI: draft, validate, submit dry-run, descuentos y rechazo de montos inválidos; verificar que el camino `Number` sigue pasando.

## 6. Ruta exacta del MCP

- [x] 6.1 Crear `packages/mcp/src/tools/create-invoice-exact.ts` con un input schema de texto para emisor, receptor, líneas, impuestos, descuentos, otros cargos y medios de pago.
- [x] 6.2 Implementar la herramienta `create_invoice_exact`: secuencia persistida, cálculo decimal, builder, validación XSD y respuesta con XML y totales.
- [x] 6.3 Añadir `packages/mcp/src/resources/factura-exact-schema.ts` y registrar el recurso `hacienda://schemas/factura-exact`.
- [x] 6.4 Registrar la herramienta y el recurso en los barrels del MCP sin modificar `create_invoice` ni `draft_invoice`.
- [x] 6.5 Añadir pruebas de la herramienta exacta: entrada válida, número rechazado, XML válido, totales exactos y herramienta legacy intacta.

## 7. Compatibilidad, documentación y release

- [x] 7.1 Ejecutar la regresión del baseline publicado del camino `Number` y de las familias exact narrow; confirmar que no hay cambios de bytes ni de cálculo.
- [x] 7.2 Añadir una prueba de consumidor empaquetado que importe los nuevos exports desde `dist` y construya un documento decimal.
- [x] 7.3 Añadir el changeset **minor** para `shared`, SDK, CLI y MCP con la nota de ruta aditiva y sin promoción de 1.0.
- [x] 7.4 Actualizar `MIGRATION.md` con la tabla `number` → texto, los límites de precisión, el ejemplo fuente/calculado y las diferencias de tolerancia.
- [x] 7.5 Actualizar README del SDK y la guía de API con la familia `DecimalDocument*`, la herramienta MCP exacta y la aclaración de que schema/XSD no equivale a aceptación fiscal.
- [x] 7.6 Ejecutar `pnpm verify` completo, corregir cualquier regresión y confirmar que el camino `Number`, la autoridad de esquemas y las pruebas de firma siguen intactos.
