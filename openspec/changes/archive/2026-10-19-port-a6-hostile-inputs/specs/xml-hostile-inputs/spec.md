## MODIFIED Requirements

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

### Requirement: Redacción de secretos en rutas de error

Las rutas de error del SDK (validación XSD, parser de documentos, firma y carga de certificados) SHALL redactar los secretos presentes en la entrada (credenciales, tokens, PIN y claves) antes de incluirlos en un mensaje de error o en un log. Una entrada hostil que contenga un secreto SHALL producir un error tipado cuyo mensaje y cuyo log NO contengan ese secreto.

#### Scenario: Un secreto en el payload no se filtra

- **WHEN** un XML hostil contiene un secreto y la operación falla
- **THEN** el mensaje de error no contiene el secreto y nombra la causa real

#### Scenario: Un secreto no aparece en el log

- **WHEN** la misma operación falla y el SDK escribe en el log
- **THEN** la línea de log no contiene el secreto
