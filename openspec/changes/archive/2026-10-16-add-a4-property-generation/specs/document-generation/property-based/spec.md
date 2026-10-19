## Purpose

Generación aleatoria de documentos electrónicos estructuralmente válidos y aseveración, sobre todo lo que el generador produce, de que el XML resultante conforma al XSD oficial, de que la serialización es un punto fijo y de que la clave numérica se descompone de vuelta en sus insumos. La capacidad evita que un ejemplo fijo dé la ilusión de cobertura: los invariantes se juzgan sobre miles de casos de todo el espacio.

## ADDED Requirements

### Requirement: El generador cubre todo el espacio de documentos

El generador de pruebas SHALL producir documentos estructuralmente válidos de los siete tipos de comprobante (Factura Electrónica, Tiquete Electrónico, Nota de Crédito, Nota de Débito, Factura Electrónica de Compra, Factura Electrónica de Exportación y Recibo Electrónico de Pago), y SHALL cubrir en su espacio, como mínimo: cada tarifa de impuesto aplicable, exoneraciones parciales y totales, múltiples descuentos, hasta cuatro medios de pago con su monto, moneda extranjera con su tipo de cambio, y notas de crédito y débito que referencian un documento previo. El generador NO SHALL producir documentos con campos obligatorios ausentes ni con combinaciones que la validación de entrada rechace.

#### Scenario: Se cubren los siete tipos de documento

- **WHEN** se ejecuta el generador sobre un número arbitrario de casos
- **THEN** aparecen casos de los siete tipos de comprobante, cada uno serializable a XML

#### Scenario: Se cubren las variantes de cada tipo

- **WHEN** se revisan los casos generados
- **THEN** hay casos con cada tarifa de impuesto, exoneración parcial y total, más de un descuento, más de un medio de pago, moneda extranjera con tipo de cambio, y notas de crédito o débito con información de referencia a un documento previo

#### Scenario: Un documento generado no es inválido

- **WHEN** el generador produce un documento y se valida con la validación de entrada del SDK
- **THEN** la validación lo acepta; un documento generado que la validación rechace hace fallar la corrida, de modo que la conformidad XSD no pasa por vacuidad

### Requirement: El XML generado valida contra el XSD oficial, sin excepciones

Para todo documento producido por el generador, el XML serializado SHALL validar contra el XSD oficial del v4.4 mediante la validación offline de esquemas del SDK. NO SHALL existir ningún caso, ni siquiera adversarial (montos extremos, muchas líneas, descuentos máximos, tarifas mixtas), para el cual el XML generado no conforme.

#### Scenario: Cada documento generado conforma al XSD

- **WHEN** se serializa un documento generado y se valida contra el XSD oficial
- **THEN** la validación reporta el documento como válido

#### Scenario: Un caso que no conforme falla ruidosamente

- **WHEN** un documento generado produce XML que no conforma al XSD
- **THEN** la propiedad falla mostrando el contraejemplo serializado y su diagnóstico de validación

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

### Requirement: La clave de 50 dígitos se descompone de vuelta en sus insumos

Para toda entrada válida al constructor de la clave numérica, descomponer la clave producida SHALL devolver exactamente los insumos normalizados que la generaron (país, fecha, cédula con relleno, sucursal, terminal, tipo de documento, secuencia, situación y código de seguridad). La propiedad SHALL cubrir fechas límite y valores máximos, e incluir el 29 de febrero de años bisiestos, el 31 de diciembre, la secuencia máxima de diez dígitos y cédulas alfanuméricas.

#### Scenario: Ida y vuelta de la clave

- **WHEN** se construye una clave a partir de insumos válidos y se descompone
- **THEN** cada componente devuelto coincide con el insumo normalizado correspondiente

#### Scenario: Fechas límite

- **WHEN** el insumo incluye el 29 de febrero de un año bisiesto y el 31 de diciembre
- **THEN** la clave se descompone de vuelta en esa misma fecha

#### Scenario: Valores máximos

- **WHEN** el insumo incluye la secuencia máxima (`9999999999`) y una cédula alfanumérica de doce caracteres
- **THEN** la descomposición devuelve la secuencia máxima y la cédula normalizada

### Requirement: Las tres propiedades corren en CI sobre miles de casos

Las tres propiedades SHALL ejecutarse en CI sobre al menos unos miles de casos generados por propiedad, a través del mismo comando de pruebas de propiedades integrado en la verificación del repositorio, y NO SHALL depender de credenciales ni de red.

#### Scenario: La verificación del repositorio ejecuta las propiedades

- **WHEN** se ejecuta la verificación completa del repositorio
- **THEN** las tres propiedades de A4 corren dentro de ella con un presupuesto de miles de casos por propiedad

#### Scenario: El presupuesto es configurable

- **WHEN** se ajusta la variable de entorno del presupuesto de casos
- **THEN** el número de casos por propiedad cambia en consecuencia y una corrida con pocos casos sigue juzgando las mismas propiedades
