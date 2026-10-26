## ADDED Requirements

### Requirement: Correcciones sancionadas de paridad con cita de fuente primaria

El requisito de paridad («La API pública existente se conserva; nada se
adivina») rige por defecto y sus escenarios no cambian. Este requisito define
la única excepción: una **corrección sancionada** es una entrada del registro
de parejas de `scripts/codes-generate/` que declara un desvío de paridad con
**(a)** el tipo de desvío (sustituir valor, eliminar clave o valor, renombrar
clave), **(b)** la cita de la fuente primaria del informe de conformidad del
repo (`docs/conformity-report.md`) y **(c)** la referencia a un Changeset
publicado que declare el rompimiento y sus notas de migración. `pnpm
spec:generate` SHALL aplicar las correcciones sancionadas y SHALL reportar
cada desvío aplicado con su tabla, clave y cita; una corrección sancionada
sin cita o sin Changeset de referencia SHALL hacer terminar el comando con
código distinto de cero sin escribir salida parcial. Un desvío de paridad
no declarado como corrección sancionada SHALL seguir haciendo fallar el comando bajo el requisito de paridad, nombrando tabla y clave.

#### Scenario: Una corrección sancionada se aplica y se reporta

- **WHEN** el registro de parejas declara una corrección con tipo y cita para
  una tabla (p. ej. `ExonerationType` sin el valor «12», o `DocumentTypeCode`
  con el catálogo oficial de 10 tipos del ANEXOS V4.4 p. 65 inciso c) y se
  ejecuta `pnpm spec:generate`
- **THEN** el comando termina con código 0, la salida generada refleja el
  desvío declarado (clave eliminada, renombrada o valor sustituido) y el
  reporte lista cada desvío con su tabla, clave y cita

#### Scenario: Corrección sin cita o sin Changeset se rechaza

- **WHEN** el registro de parejas declara un desvío de paridad sin cita de
  fuente primaria o sin referencia a Changeset publicado
- **THEN** el comando termina con código distinto de cero nombrando tabla,
  clave y el campo faltante de la corrección, sin escribir salida parcial

#### Scenario: Un desvío no declarado sigue haciendo fallar

- **WHEN** la tabla generada difiere de la versión escrita a mano en una clave
  o valor que el registro no declara como corrección sancionada
- **THEN** el comando termina con código distinto de cero nombrando tabla,
  clave y tipo de desvío, sin escribir salida parcial
