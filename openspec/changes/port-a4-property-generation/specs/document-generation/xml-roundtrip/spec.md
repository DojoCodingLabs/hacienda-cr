## MODIFIED Requirements

### Requirement: El parser es la inversa fiel de los constructores

El documento devuelto por el parser SHALL reconstruirse a bytes idénticos cuando se vuelve a serializar con el constructor del mismo tipo. Los montos SHALL reconstruirse como texto decimal acotado (no como números crudos ni como representación binaria) y las tarifas y cantidades como números, y la ausencia de elementos opcionales en el XML SHALL traducirse en ausencia de los campos correspondientes en el documento.

#### Scenario: Reconstruir devuelve los mismos bytes

- **WHEN** se parsea un XML válido y se vuelve a serializar el documento resultante
- **THEN** el XML resultante es byte a byte idéntico al XML de entrada

#### Scenario: Los montos se reconstruyen como el tipo monetario

- **WHEN** se parsea un XML con montos decimales a cinco cifras
- **THEN** los campos monetarios del documento son del tipo monetario del SDK con el valor decimal exacto y su serialización reproduce el mismo texto

#### Scenario: Un elemento opcional ausente no se reintroduce

- **WHEN** se parsea un XML que omite un elemento opcional
- **THEN** el documento resultante no fabrica ese campo y su reserialización sigue omitiendo el elemento
