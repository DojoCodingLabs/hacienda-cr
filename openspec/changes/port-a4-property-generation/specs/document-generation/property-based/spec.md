## MODIFIED Requirements

### Requirement: El generador cubre todo el espacio de documentos

El generador de pruebas SHALL producir documentos estructuralmente válidos de los siete tipos de comprobante (Factura Electrónica, Tiquete Electrónico, Nota de Crédito, Nota de Débito, Factura Electrónica de Compra, Factura Electrónica de Exportación y Recibo Electrónico de Pago), y SHALL cubrir en su espacio, como mínimo: cada tarifa de impuesto aplicable, exoneraciones parciales y totales, múltiples descuentos, hasta cuatro medios de pago con su monto, moneda extranjera con su tipo de cambio, y notas de crédito y débito que referencian un documento previo. El generador NO SHALL producir documentos con campos obligatorios ausentes ni con combinaciones que la validación de entrada rechace. Los montos que el generador produzca SHALL construirse con la capa de cálculo decimal-text vigente y SHALL ser representables exactamente, sin pasar por coma flotante.

#### Scenario: Se cubren los siete tipos de documento

- **WHEN** se ejecuta el generador sobre un número arbitrario de casos
- **THEN** aparecen casos de los siete tipos de comprobante, cada uno serializable a XML

#### Scenario: Se cubren las variantes de cada tipo

- **WHEN** se revisan los casos generados
- **THEN** hay casos con cada tarifa de impuesto, exoneración parcial y total, más de un descuento, más de un medio de pago, moneda extranjera con tipo de cambio, y notas de crédito o débito con información de referencia a un documento previo

#### Scenario: Un documento generado no es inválido

- **WHEN** el generador produce un documento y se valida con la validación de entrada del SDK
- **THEN** la validación lo acepta; un documento generado que la validación rechace hace fallar la corrida, de modo que la conformidad XSD no pasa por vacuidad

#### Scenario: Los montos generados son exactos

- **WHEN** el generador produce un caso con un monto de cinco decimales
- **THEN** el monto del documento es el texto decimal exacto y no una
  representación binaria redondeada

### Requirement: Construir → parsear → construir es un punto fijo

Serializar un documento generado, leer ese XML de vuelta a un documento y volver a serializarlo SHALL producir bytes idénticos a los de la primera serialización, para todo caso del generador. La igualdad SHALL ser de bytes, no de equivalencia estructural.

#### Scenario: Bytes idénticos tras el ciclo completo

- **WHEN** se toma un documento generado, se serializa, se parsea el resultado y se vuelve a serializar
- **THEN** la segunda serialización es byte a byte idéntica a la primera

#### Scenario: Los montos sobreviven el ciclo exactamente

- **WHEN** un documento con montos decimales (incluidos valores con hasta cinco decimales y ceros significativos) recorre construir → parsear → construir
- **THEN** los montos reconstruidos son exactamente los originales y su representación XML no cambia

#### Scenario: La ausencia de campos opcionales se preserva

- **WHEN** un documento generado omite un campo opcional (por ejemplo, un receptor, un segundo descuento o los otros cargos)
- **THEN** el documento reconstruido también lo omite y el XML no gana ni pierde elementos

### Requirement: Las tres propiedades corren en CI sobre miles de casos

Las tres propiedades SHALL ejecutarse en CI sobre al menos unos miles de casos generados por propiedad, a través del mismo comando de pruebas de propiedades integrado en la verificación del repositorio, y NO SHALL depender de credenciales ni de red. Los casos que invocan la validación XSD SHALL tener un presupuesto propio y configurable, por ser más caros que el resto.

#### Scenario: La verificación del repositorio ejecuta las propiedades

- **WHEN** se ejecuta la verificación completa del repositorio
- **THEN** las tres propiedades de A4 corren dentro de ella con un presupuesto de miles de casos por propiedad

#### Scenario: El presupuesto es configurable

- **WHEN** se ajusta la variable de entorno del presupuesto de casos
- **THEN** el número de casos por propiedad cambia en consecuencia y una corrida con pocos casos sigue juzgando las mismas propiedades

#### Scenario: El presupuesto de los casos XSD es propio

- **WHEN** se ajusta el presupuesto específico de los casos con validación XSD
- **THEN** esos casos cambian de cantidad sin alterar el presupuesto de las
  propiedades baratas
