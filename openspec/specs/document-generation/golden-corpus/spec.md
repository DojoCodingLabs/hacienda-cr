# document-generation/golden-corpus Specification

## Purpose

Corpus versionado de documentos conocidos-buenos junto con su XML esperado, uno por cada tipo de comprobante, de modo que cualquier cambio que altere la salida obligue a actualizar conscientemente un archivo dorado y las regresiones silenciosas de serialización se vuelvan ruidosas.

## Requirements

### Requirement: El corpus dorado cubre cada tipo de documento

El repositorio SHALL mantener un corpus dorado versionado con, al menos, una entrada por cada uno de los siete tipos de comprobante. Cada entrada SHALL constar de un documento de entrada y su XML esperado, de modo que la entrada sea reproducible sin credenciales ni red.

#### Scenario: Una entrada por tipo de documento

- **WHEN** se enumeran las entradas del corpus dorado
- **THEN** están presentes los siete tipos de comprobante

#### Scenario: Cada entrada empareja documento y XML esperado

- **WHEN** se inspecciona una entrada del corpus
- **THEN** contiene tanto el documento de entrada como el XML esperado con el que se compara la salida

### Requirement: Una regresión silenciosa de salida es ruidosa

La verificación del repositorio SHALL comparar, para cada entrada del corpus, el XML que produce el constructor contra el XML dorado, byte a byte. Un cambio que altere la salida SHALL hacer fallar la verificación hasta que el archivo dorado se actualice de forma deliberada.

#### Scenario: Una salida alterada falla hasta actualizar el dorado

- **WHEN** un cambio en el código altera el XML producido para una entrada del corpus
- **THEN** la verificación falla señalando la entrada cuya salida cambió

#### Scenario: El XML dorado conforma al XSD

- **WHEN** se valida el XML esperado de una entrada contra el XSD oficial
- **THEN** conforma, de modo que el corpus no fija una salida inválida como referencia

#### Scenario: La actualización del dorado es deliberada

- **WHEN** un cambio de salida es intencional y se regenera el corpus con el procedimiento documentado
- **THEN** los archivos dorados se reescriben y la verificación vuelve a pasar, dejando el cambio de salida visible en la revisión

### Requirement: El corpus es reproducible y sin firma

Las entradas del corpus dorado SHALL ser de XML sin firma, deterministas y reproducibles: serializar la misma entrada dos veces SHALL producir los mismos bytes. La firma digital NO SHALL formar parte de la comparación dorada, porque su hora y sus identificadores no son deterministas; la verificación criptográfica de firmas corresponde a su propio cambio. El corpus SHALL fijar el formato de los montos en el XML (notación decimal plana, sin ceros forzados ni notación científica) para que un cambio de representación monetaria sea visible como diff del corpus y no como una diferencia silenciosa.

#### Scenario: Doble serialización idéntica

- **WHEN** se serializa dos veces el documento de una entrada del corpus
- **THEN** los bytes coinciden

#### Scenario: El XML dorado no contiene firma

- **WHEN** se inspecciona el XML esperado de una entrada del corpus
- **THEN** no contiene una firma digital ni marcas de tiempo ni identificadores aleatorios

#### Scenario: El formato del monto queda fijado

- **WHEN** se lee el XML esperado de una entrada del corpus
- **THEN** sus montos aparecen en notación decimal plana, sin ceros forzados, con a
  lo sumo cinco decimales
