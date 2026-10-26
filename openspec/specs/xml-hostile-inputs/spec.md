# xml-hostile-inputs Specification

## Purpose

Blinda el SDK contra entradas XML hostiles: rechaza XXE y expansión de entidades, limita tamaño y profundidad, redacta secretos en errores y añade un corpus de fuzzing más mutation testing en CI, de modo que ningún byte hostil cuelgue, lea archivos o filtre credenciales.

## Requirements

### Requirement: Límites de entrada para XML no confiable

El SDK SHALL aplicar `checkXmlInput` antes de parsear cualquier XML de entrada (validación XSD, firma, parser de documentos), rechazando payloads que excedan 8 MiB, 128 niveles de anidamiento o 100 000 elementos, y SHALL rechazar declaraciones `<!DOCTYPE` y `<!ENTITY` con un error tipado que nombre la causa.

#### Scenario: Un XML con DOCTYPE se rechaza

- **WHEN** se valida o parsea un XML que contiene `<!DOCTYPE` o `<!ENTITY`
- **THEN** el SDK devuelve o lanza un error tipado que contiene "DOCTYPE" sin leer archivos ni red

#### Scenario: El límite de bytes se aplica antes de parsear

- **WHEN** el XML supera 8 MiB en bytes UTF-8
- **THEN** el SDK rechaza la entrada con el mensaje de límite de bytes

#### Scenario: El límite de anidamiento se aplica antes de parsear

- **WHEN** el XML supera 128 niveles de anidamiento
- **THEN** el SDK rechaza la entrada con el mensaje de límite de anidamiento

### Requirement: XXE y expansión de entidades quedan deshabilitadas

El SDK SHALL parsear XML sin resolver entidades externas ni leer archivos del disco. Un intento de XXE, expansión `billion-laughs` o XInclude SHALL fallar con un error tipado, y el contenido referenciado no SHALL aparecer en el documento ni en el mensaje de error.

#### Scenario: Una entidad externa no se resuelve

- **WHEN** se parsea un XML que declara una entidad externa apuntando a un archivo local
- **THEN** el contenido del archivo no se lee ni se incorpora y el parser falla o ignora la entidad

#### Scenario: Billion-laughs no expande

- **WHEN** se parsea un XML con expansión recursiva de entidades internas
- **THEN** el SDK rechaza la entrada por DOCTYPE/ENTITY y no agota memoria

#### Scenario: XInclude no lee su target

- **WHEN** se parsea un XML con un nodo `xi:include` referenciando un recurso externo
- **THEN** la validación XSD o el parser rechaza el documento sin leer el recurso

### Requirement: Redacción de secretos en rutas de error

Las rutas de error del SDK (validación XSD, parser de documentos, firma y carga de certificados) SHALL redactar los secretos presentes en la entrada (credenciales, tokens, PIN y claves) antes de incluirlos en un mensaje de error o en un log. Una entrada hostil que contenga un secreto SHALL producir un error tipado cuyo mensaje y cuyo log NO contengan ese secreto.

#### Scenario: Un secreto en el payload no se filtra

- **WHEN** un XML hostil contiene un secreto y la operación falla
- **THEN** el mensaje de error no contiene el secreto y nombra la causa real

#### Scenario: Un secreto no aparece en el log

- **WHEN** la misma operación falla y el SDK escribe en el log
- **THEN** la línea de log no contiene el secreto

### Requirement: Corpus de fuzzing versionado en el repo

El repositorio SHALL mantener un corpus de fuzzing versionado (estático y/o generador `fast-check`) que incluya, al menos, los casos de XXE, entity expansion, deep nesting, contajes gigantes, XML truncado, UTF-8 inválido, CDATA con markup, atributos con markup falso, XInclude y namespaces extraños. El corpus SHALL apuntar a los módulos de parsing del árbol vigente y SHALL ejecutarse en CI dentro de `pnpm verify` (o un target dedicado) y cada caso SHALL esperar fallo tipado o validación fallida, no crash ni error crudo. El corpus SHALL cubrir el parser de documentos, la validación XSD y la firma.

#### Scenario: El corpus se ejecuta en CI

- **WHEN** se ejecuta la verificación completa del repositorio
- **THEN** el corpus de fuzzing corre y todos los casos esperados fallan de forma tipada

#### Scenario: Un caso nuevo se añade al corpus

- **WHEN** un desarrollador añade un caso hostil al corpus
- **THEN** el test falla hasta que el SDK lo rechace tipadamente

#### Scenario: El corpus cubre todos los puntos de entrada XML

- **WHEN** se revisa el corpus
- **THEN** cada caso se ejecuta contra la validación XSD, el parser de documentos y
  la firma

### Requirement: Mutation testing sobre parsing e impuestos

El repositorio SHALL disponer de una configuración de mutation testing (Stryker o equivalente) limitada a los módulos de parsing y de impuestos del árbol vigente (el parser de documentos, los módulos de XML y el kernel decimal de cálculo), con un score mínimo acordado (sugiero 70 % inicial, 80 % ideal), ejecutada en un job separado de CI para no ralentizar PRs. La configuración SHALL apuntar a rutas que existen en el árbol vigente, de modo que un mutante sobre una condición de parsing o de redondeo sea matado por la suite.

#### Scenario: El score mínimo se cumple

- **WHEN** se ejecuta mutation testing sobre los módulos cubiertos
- **THEN** el score alcanza o supera el umbral acordado y, si no, falla la puerta

#### Scenario: Un mutante que rompe parsing no pasa

- **WHEN** un mutante altera una condición del parser (p. ej. `>` por `>=`)
- **THEN** al menos un test del corpus de fuzzing o de parsing lo mata

#### Scenario: Un mutante que rompe el redondeo no pasa

- **WHEN** un mutante altera la regla de redondeo del kernel decimal
- **THEN** la batería de propiedades lo mata

### Requirement: Límites de entrada para otros parsers del SDK

Los parsers del SDK que consuman XML no confiable (`parseDocumentXml`, `signXml`, `validateDocumentXml`) SHALL reutilizar `checkXmlInput` antes de parsear y SHALL devolver o lanzar errores tipados cuando la entrada sea inválida, sin exponer el payload ni rutas de archivo.

#### Scenario: Todos los parsers rechazan la entrada inválida

- **WHEN** se pasa un XML inválido a cualquiera de los parsers del SDK
- **THEN** cada uno falla con un error tipado y no consume recursos sin cota
