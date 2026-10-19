## MODIFIED Requirements

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

## ADDED Requirements

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
