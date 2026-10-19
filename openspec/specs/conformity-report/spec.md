## Purpose

Hace auditable el informe de conformidad A1: un documento en el repo que confronta cada
tabla de códigos que el SDK define contra las fuentes primarias de Hacienda (PDF de Anexos
y XSD v4.4), con procedencia reproducible, cita verificable por fila, veredicto explícito
y reconciliación contra la auditoría previa.

## Requirements

### Requirement: El informe existe en el repo y declara su procedencia

El repo SHALL mantener un informe de conformidad en `docs/conformity-report.md`. El
informe SHALL declarar, en su cabecera, qué bytes exactos leyó: el set de la especificación
(`2024/v4.4` vigente y `2026/v4.4` observado), el SHA-256 de cada archivo fuente consultado,
la fecha de lectura, el commit del código auditado y las herramientas usadas
(`pdftotext -layout`, `xmllint` u otra). Sin esa declaración, el informe no es auditable.

#### Scenario: Procedencia completa y verificable

- **WHEN** se lee la cabecera del informe
- **THEN** lista commit del código auditado, sets de especificación, SHA-256 por archivo
  fuente y herramientas de lectura

#### Scenario: Los hashes declarados corresponden a los archivos consultados

- **WHEN** se recalcula SHA-256 sobre los archivos fuente usados para el informe
- **THEN** cada valor coincide con el declarado en la cabecera

### Requirement: Una fila por cada tabla de códigos que el SDK define

El informe SHALL incluir una fila por cada tabla de códigos que el SDK define, incluidos
los catálogos escritos a mano (`shared/src/constants/*.ts`,
`packages/sdk/src/api/error-codes.ts`) y el catálogo de la clave numérica. Ninguna tabla
definida por el SDK podrá quedar sin fila; el inventario completo del código auditado
SHALL declararse al inicio de la tabla de resultados.

#### Scenario: Cobertura completa del inventario

- **WHEN** se enumeran las tablas de códigos definidas en el commit auditado
- **THEN** cada una tiene una fila en el informe, con veredicto

#### Scenario: Tabla sin fuente oficial aparente

- **WHEN** una tabla del SDK no corresponde a ninguna enumeración del XSD ni a una tabla
  del PDF de Anexos ni a los documentos auxiliares
- **THEN** su fila declara "sin fuente oficial verificada" y enumera las superficies
  consultadas que no la contienen; no se le asigna veredicto de coincidencia

### Requirement: Cita verificable por fila

Cada fila SHALL citar su fuente primaria de forma reproducible: para el PDF de Anexos,
nota y número de página; para un XSD, archivo y `simpleType` o `element`; para los
documentos auxiliares, archivo y referencia de tabla o fila. Una fila sin cita no puede
llevar veredicto de coincidencia.

#### Scenario: Cita de XSD

- **WHEN** la tabla proviene de una enumeración del XSD
- **THEN** la fila nombra el archivo, el `simpleType` o `element` y el set al que pertenece

#### Scenario: Cita de PDF

- **WHEN** la tabla proviene del PDF de Anexos y Estructuras
- **THEN** la fila nombra la nota y la página, y la cita se reproduce con
  `pdftotext -layout` sobre el archivo cuyo hash declara la cabecera

### Requirement: Veredicto explícito con vocabulario cerrado

Cada fila SHALL llevar un veredicto de un vocabulario cerrado: **coincide**, **no
coincide**, **parcial**, **sin fuente oficial verificada** o **fuera de alcance**. Toda
coincidencia SHALL sustentarse en una comparación efectiva: los códigos se comparan byte
a byte, sin normalización Unicode, sin trim ni cambio de mayúsculas; las descripciones se
comparan con trim y colapso de espacios, y las diferencias de mayúsculas se reportan como
advertencia, no como fallo. Las filas "no coinciden" y "parcial" SHALL mostrar el diff
entre el valor del SDK y el de la fuente.

#### Scenario: Diferencia de mayúsculas entre fuentes

- **WHEN** el XSD y el PDF difieren solo en mayúsculas para el mismo código
- **THEN** el veredicto es "coincide" con advertencia explícita registrada en la fila

#### Scenario: Valor del SDK ausente en la fuente

- **WHEN** el SDK declara un código que la fuente primaria citada no contiene
- **THEN** el veredicto es "no coincide" y la fila muestra ambos conjuntos de valores

### Requirement: Protocolo de independencia declarado

El informe SHALL declarar un protocolo de independencia: qué fuentes secundarias
permanecieron fuera de consulta durante la primera pasada (al menos
`docs/specs/v4.4-compliance.md` y el INDENT), en qué momento se abrieron y qué rol
tuvieron. La primera pasada SHALL realizarse sobre las fuentes primarias y el código
auditado, sin consultar las lecturas previas.

#### Scenario: Cuarentena cumplida

- **WHEN** se revisa el protocolo declarado en el informe
- **THEN** consta la primera pasada sobre fuentes primarias y la apertura posterior de las
  fuentes secundarias, con su momento en el proceso

### Requirement: Reconciliación con la auditoría previa

El informe SHALL reconciliar sus hallazgos contra `docs/specs/v4.4-compliance.md`:
hallazgos en los que ambas lecturas coinciden, desacuerdos explícitos con la posición de
la auditoría y hallazgos nuevos que la auditoría no cubrió. Cada fila afectada SHALL
referenciar la sección correspondiente de la auditoría o declarar que no aplica.

#### Scenario: Hallazgo que la auditoría no cubrió

- **WHEN** el informe encuentra una tabla incorrecta que la auditoría previa no menciona
- **THEN** se lista en la sección de hallazgos nuevos, con su cita de fuente primaria

#### Scenario: Desacuerdo con la auditoría

- **WHEN** la lectura independiente contradice un hallazgo de la auditoría previa
- **THEN** el informe muestra ambas posiciones y cuál sostiene la evidencia citada

### Requirement: Lo no verificable se marca, nunca se adivina

Cuando una afirmación no pueda confirmarse con las fuentes públicas disponibles, el
informe SHALL marcarla como no verificada y nombrar la superficie consultada que faltó.
El informe no SHALL presentar como hallazgo verificado algo no comprobado.

#### Scenario: Supuesto no verificable

- **WHEN** el informe necesita un dato que ninguna fuente disponible confirma
- **THEN** aparece en la sección de supuestos no verificados, con el motivo
