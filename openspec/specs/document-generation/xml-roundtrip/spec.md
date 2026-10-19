# document-generation/xml-roundtrip Specification

## Purpose

Lectura de un comprobante electrónico v4.4 desde su XML a un documento tipado, como inversa fiel de los constructores del SDK. Habilita consumir comprobantes recibidos y, en el propio repositorio, comprobar que la serialización es un punto fijo.

## Requirements

### Requirement: El SDK expone un parser XML → documento

El SDK SHALL exponer de forma pública un parser que tome un XML de comprobante v4.4 y devuelva el tipo de documento identificado por el elemento raíz junto con el documento tipado correspondiente, para los siete tipos de comprobante. El elemento raíz del XML SHALL determinar el tipo; el parser NO SHALL adivinar el tipo por el contenido.

#### Scenario: Cada raíz conocida se parsea a su tipo

- **WHEN** se parsea el XML de cada uno de los siete tipos de comprobante
- **THEN** el resultado declara el elemento raíz correcto y un documento del tipo tipado correspondiente

#### Scenario: El parser invierte el constructor

- **WHEN** se parsea el XML producido por un constructor del SDK
- **THEN** el documento resultante conserva los mismos valores de negocio que el documento de entrada (clave, partes, líneas, impuestos, descuentos, resumen y referencias)

### Requirement: El parser es la inversa fiel de los constructores

El documento devuelto por el parser SHALL reconstruirse a bytes idénticos cuando se vuelve a serializar con el constructor del mismo tipo. Los montos SHALL reconstruirse como el tipo monetario del SDK (no como números crudos) y las tarifas y cantidades como números, y la ausencia de elementos opcionales en el XML SHALL traducirse en ausencia de los campos correspondientes en el documento.

#### Scenario: Reconstruir devuelve los mismos bytes

- **WHEN** se parsea un XML válido y se vuelve a serializar el documento resultante
- **THEN** el XML resultante es byte a byte idéntico al XML de entrada

#### Scenario: Los montos se reconstruyen como el tipo monetario

- **WHEN** se parsea un XML con montos decimales a cinco cifras
- **THEN** los campos monetarios del documento son del tipo monetario del SDK con el valor decimal exacto y su serialización reproduce el mismo texto

#### Scenario: Un elemento opcional ausente no se reintroduce

- **WHEN** se parsea un XML que omite un elemento opcional
- **THEN** el documento resultante no fabrica ese campo y su reserialización sigue omitiendo el elemento

### Requirement: El parser falla con error tipado ante XML inválido

El parser SHALL rechazar XML malformado, XML cuya raíz no corresponda a un comprobante v4.4 conocido y XML que exceda los límites de entrada del SDK, con un error tipado que nombre la causa. NO SHALL lanzar errores no controlados ni devolver un documento parcial en esos casos.

#### Scenario: XML malformado

- **WHEN** se parsea una cadena que no es XML bien formado
- **THEN** el parser falla con un error tipado que describe el defecto y no con un error crudo del analizador

#### Scenario: Raíz desconocida

- **WHEN** se parsea un XML bien formado cuyo elemento raíz no es un comprobante v4.4
- **THEN** el parser falla con un error tipado que nombra la raíz no soportada

#### Scenario: Entrada fuera de límites

- **WHEN** se parsea un XML que excede los límites de entrada del SDK
- **THEN** el parser falla con el error tipado de límites y no consume recursos sin cota

### Requirement: El parser no resuelve entidades ni recursos externos

El parser SHALL analizar el XML sin resolver entidades externas ni leer archivos del disco, de modo que una declaración de entidad externa o una referencia a un recurso no provoque lectura de archivos ni acceso a red. Esta capacidad NO SHALL asumir la responsabilidad del endurecimiento exhaustivo y del fuzzing de entradas hostiles, que corresponde a su propio cambio, pero el valor por defecto del parser SHALL ser seguro desde su introducción.

#### Scenario: Una entidad externa no se resuelve

- **WHEN** se parsea un XML que declara una entidad externa apuntando a un archivo local
- **THEN** el contenido del archivo no se lee ni se incorpora al documento y el parser falla o ignora la entidad, sin exponer el nombre del archivo
