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
La cabecera SHALL distinguir el **anexo oficial vigente** (SHA-256
`6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`, 99 páginas) del
**anexo histórico retenido** en el repo (SHA-256
`2e36bd1101bbcabbb391ab1ec8ffc3773b93031341c7d98a05a5d0f0887d4305`, 98 páginas), y SHALL
declarar que la diferencia de source-set entre ambos no está reconciliada.
La cabecera SHALL registrar además los commits contra los que se hizo la pasada de
reconciliación —la base revisada (`cf1db1e4bde37498643f77c8259c0a29e51033a1`) y la
cabeza revisada (`81c6e42179320bbacaf5c74c6fe8973fd871159b`)— para que la
reconciliación sea atribuible a un estado concreto del árbol, sin sustituir al commit
auditado del apéndice.

#### Scenario: Procedencia completa y verificable

- **WHEN** se lee la cabecera del informe
- **THEN** lista commit del código auditado, sets de especificación, SHA-256 por archivo
  fuente y herramientas de lectura

#### Scenario: Los hashes declarados corresponden a los archivos consultados

- **WHEN** se recalcula SHA-256 sobre los archivos fuente usados para el informe
- **THEN** cada valor coincide con el declarado en la cabecera

#### Scenario: Los dos anexos se distinguen

- **WHEN** se lee la cabecera del informe
- **THEN** nombra el SHA-256 del anexo oficial vigente (99 páginas) y el del anexo
  histórico retenido (98 páginas) y declara que no son los mismos bytes

#### Scenario: La reconciliación es atribuible a un árbol concreto

- **WHEN** se lee la cabecera del informe
- **THEN** declara la base y la cabeza revisadas en la pasada de reconciliación
  (`cf1db1e4…` y `81c6e421…`), y declara aparte el commit auditado del apéndice
  (`597a556`), sin mezclarlos

### Requirement: El apéndice de estado se etiqueta como evidencia histórica

El apéndice de estado del informe SHALL declarar el commit auditado al que corresponde
(`597a556`) y SHALL presentarse como evidencia histórica, nunca como estado actual del
código. Cada fila del apéndice SHALL seguir siendo atribuible a la lectura que la originó.

#### Scenario: El apéndice declara su commit

- **WHEN** se lee el apéndice de estado
- **THEN** declara el commit auditado y se titula como histórico

#### Scenario: Ninguna fila se reescribe como observación nueva

- **WHEN** una corrección posterior al commit auditado cambió un valor de catálogo
- **THEN** la fila del apéndice conserva la lectura original y el cambio aparece en la
  reconciliación, no en el apéndice

### Requirement: Reconciliación explícita con el main vigente

El informe SHALL incluir una reconciliación contra el main vigente que enumere, por
hallazgo, si quedó resuelto (citando el PR y la evidencia que lo resolvió), si sigue
abierto, o si cambió de estado por trabajo posterior. La reconciliación SHALL referenciar
el trabajo pendiente de generación de catálogos (`#57`) y la evidencia que `main` aporta:
el oráculo nativo de política (`packages/sdk/src/__testing__/policy-oracle.spec.ts`), la
alineación de catálogos (`catalog-alignment.spec.ts`) y las APIs de FE/NC exactas
(`shared/src/schemas/exact-fe.ts`, `exact-nc.ts`). La reconciliación SHALL declarar
explícitamente lo que no se puede verificar con fuentes públicas: la procedencia de los
códigos de estado y de rechazo del API, y la procedencia de los códigos de los endpoints.
La reconciliación SHALL ser concisa: una tabla de estado por hallazgo, no una reauditoría.

#### Scenario: Un hallazgo resuelto queda trazado

- **WHEN** un hallazgo marcado abierto en el apéndice fue resuelto en `main` (p. ej. el
  valor `12` de exoneración retirado o el identificador de política con guion)
- **THEN** la reconciliación lo marca como resuelto citando el PR y la evidencia

#### Scenario: Lo no reconciliable se declara

- **WHEN** una diferencia de source-set o una procedencia de API no puede verificarse
- **THEN** la reconciliación lo declara como no reconciliado en vez de omitirlo

#### Scenario: La procedencia desconocida queda nombrada

- **WHEN** se revisa la reconciliación
- **THEN** enumera como procedencia no verificada los códigos de estado y de rechazo
  del API y los códigos de los endpoints, en lugar de afirmar un valor

#### Scenario: La evidencia vigente de main queda citada

- **WHEN** se revisa la reconciliación
- **THEN** cita el oráculo nativo de política, la prueba de alineación de catálogos y
  las APIs de FE/NC exactas como evidencia del estado actual

#### Scenario: La reconciliación es concisa

- **WHEN** se mide la extensión de la reconciliación
- **THEN** es una tabla de estado por hallazgo, no una reauditoría de las fuentes

### Requirement: El informe delimita lo que no afirma

El informe SHALL declarar explícitamente sus límites: NO SHALL afirmar elegibilidad de
régimen (entero o parcial) ni aceptación real por parte de Hacienda, y SHALL declarar que
la reconciliación documental NO es precondición del trabajo acotado de corrección de la NC
exacta (0.7). El informe SHALL presentarse como evidencia histórica más delta, nunca como
certificación de conformidad vigente.

#### Scenario: El informe no afirma elegibilidad de régimen

- **WHEN** se lee el informe completo
- **THEN** declara que no establece elegibilidad de régimen, ni total ni parcial

#### Scenario: El informe no afirma aceptación real

- **WHEN** se lee el informe completo
- **THEN** declara que no constituye aceptación real por Hacienda y que probar conformidad
  de código no equivale a aceptación fiscal

#### Scenario: La reconciliación no bloquea el trabajo 0.7

- **WHEN** se revisa el alcance de la reconciliación
- **THEN** declara que no es precondición de la corrección acotada de la NC exacta (0.7)

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
