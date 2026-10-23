## MODIFIED Requirements

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
