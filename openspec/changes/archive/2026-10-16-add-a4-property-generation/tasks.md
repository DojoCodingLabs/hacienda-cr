## 1. Parser XML → documento

- [x] 1.1 Configurar el `XMLParser` de `fast-xml-parser` espejo del builder (`attributeNamePrefix: "@_"`, `cdataPropName: "#cdata"`, `ignoreAttributes: false`, `trimValues: true`, `parseTagValue: false`, `parseAttributeValue: false`) en `packages/sdk/src/documents/`
- [x] 1.2 Implementar el decodificador tipado inverso de los sub-builders: montos → `Money.fromString`, `cantidad`/`tarifa`/`factorCalculoIVA`/`articulo`/`inciso`/`numeroLinea` → `number`, `tipoCambio` → `number`, clave y códigos → `string`
- [x] 1.3 Implementar `parseDocumentXml(xml)` que identifica el tipo por el elemento raíz y devuelve `{ rootElement, document }` para los siete tipos de comprobante, reutilizando `checkXmlInput` y `XMLValidator` y lanzando `ValidationError`
- [x] 1.4 Preservar la ausencia de elementos opcionales (no fabricar campos que el XML no trae) y aceptar que los defaults del builder (`BaseImponible`, `ImpuestoNeto`, `ImpuestoAsumidoEmisorFabrica`, `CodigoTipoMoneda`) se materialicen al reserializar
- [x] 1.5 Exportar `parseDocumentXml` y sus tipos desde el barrel del SDK (`packages/sdk/src/index.ts`)
- [x] 1.6 Probar el parser: cada raíz conocida, raíz desconocida, XML malformado, entrada fuera de límites y una entidad externa que no debe resolverse (fracaso tipado, sin leer archivos)

## 2. Generador de documentos

- [x] 2.1 Crear arbitrarios `fast-check` de línea (cantidad, precio unitario, tarifa, exoneración parcial/total, múltiples descuentos e impuestos) en `packages/sdk/src/__fixtures__/`
- [x] 2.2 Derivar los totales de cada caso con `calculateLineItemTotals` y `calculateInvoiceSummary` (coherencia por construcción)
- [x] 2.3 Ensamblar los siete tipos de documento a partir de las líneas y de `DOCUMENT_VARIANTS` (requeridos por tipo, REP reducido, FEE sin impuesto neto/base imponible, receptor según variante)
- [x] 2.4 Cubrir las variantes del brief: hasta cuatro medios de pago, moneda extranjera con `tipoCambio` y notas de crédito/débito con `informacionReferencia` a un documento previo
- [x] 2.5 Restringir el generador a entradas representables: texto libre sin espacios de borde, códigos con ceros a la izquierda válidos y fechas/clave dentro de los límites del v4.4

## 3. Propiedades

- [x] 3.1 Aseverar que todo documento generado pasa la validación de entrada del SDK (protege contra una propiedad XSD que pase por vacuidad)
- [x] 3.2 Aseverar que el XML generado valida contra el XSD oficial con `validateDocumentXml`, caso a caso y de forma secuencial
- [x] 3.3 Aseverar el punto fijo: serializar, parsear y volver a serializar produce bytes idénticos, incluidos montos de hasta cinco decimales y ausencia de campos opcionales
- [x] 3.4 Aseverar la ida y vuelta de la clave (`buildClave` → `parseClave`) sobre los insumos normalizados, con fechas límite (incluido 29/02 bisiesto y 31/12), secuencia máxima `9999999999` y cédula alfanumérica
- [x] 3.5 Añadir casos adversariales (montos extremos, hasta 30 líneas, descuentos máximos, tarifas mixtas) a las propiedades

## 4. Corpus dorado

- [x] 4.1 Definir la estructura y el registro del corpus (una entrada por tipo de documento) bajo `packages/sdk/src/`
- [x] 4.2 Escribir las fixtures de entrada por tipo con `Money.fromString`, incluyendo las variantes del brief (exoneración, descuentos múltiples, medios de pago múltiples, moneda extranjera, NC/ND con referencia)
- [x] 4.3 Probar la igualdad byte a byte entre la salida del constructor y el XML dorado, y validar el XML dorado contra el XSD
- [x] 4.4 Documentar e implementar el procedimiento de regeneración deliberada del corpus, de modo que un cambio de salida falle hasta que el dorado se reescriba

## 5. Integración en CI

- [x] 5.1 Añadir el suite de A4 como target de `scripts/run-properties-tests.mjs` y dar a los casos XSD un presupuesto propio configurable (miles de casos, secuencial)
- [x] 5.2 Verificar que `pnpm verify` queda verde de extremo a extremo con las tres propiedades y el corpus
- [x] 5.3 Confirmar que las fixtures, los generadores y el corpus no entran al paquete publicado (`files` limita el artefacto a `dist`/`examples`)

## 6. Changeset y documentación

- [x] 6.1 Crear un Changeset `minor` para `@dojocoding/hacienda-sdk` por la superficie pública del parser
- [x] 6.2 Documentar en el README el parseo XML → documento, el corpus dorado y cómo se ejecutan las propiedades
- [x] 6.3 Formatear únicamente los archivos tocados por este cambio

## 7. Especificaciones delta (OpenSpec)

- [x] 7.1 Verificar que `openspec validate add-a4-property-generation` pasa (cada requisito con al menos un `#### Scenario:`)
- [x] 7.2 Verificar que `openspec validate --specs` no presenta regresiones tras el cambio
