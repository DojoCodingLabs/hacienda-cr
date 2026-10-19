## MODIFIED Requirements

### Requirement: El parser es la inversa fiel de los constructores

El documento devuelto por el parser SHALL reconstruirse a bytes idénticos cuando se vuelve a serializar con el constructor del mismo tipo. Los montos SHALL reconstruirse con el tipo monetario que el constructor de ese tipo declara —texto decimal acotado en el camino exacto, número en los constructores legacy, cuyo contrato `Number` la rama preserva— y sin pérdida: el valor reconstruido representa exactamente el valor que el XML declara. Las tarifas y cantidades como números, y la ausencia de elementos opcionales en el XML SHALL traducirse en ausencia de los campos correspondientes en el documento.

#### Scenario: Reconstruir devuelve los mismos bytes

- **WHEN** se parsea un XML válido y se vuelve a serializar el documento resultante
- **THEN** el XML resultante es byte a byte idéntico al XML de entrada

#### Scenario: Los montos se reconstruyen como el tipo monetario

- **WHEN** se parsea un XML con montos decimales a cinco cifras
- **THEN** los campos monetarios del documento llevan el valor decimal exacto que declara el XML, con el tipo que el constructor de ese tipo espera, y su serialización reproduce el mismo texto

#### Scenario: Un elemento opcional ausente no se reintroduce

- **WHEN** se parsea un XML que omite un elemento opcional
- **THEN** el documento resultante no fabrica ese campo y su reserialización sigue omitiendo el elemento
