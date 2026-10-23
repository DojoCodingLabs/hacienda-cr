## MODIFIED Requirements

### Requirement: El manifiesto declara los sets, cuál está en vigor y cuál entra después

`manifest.json` SHALL declarar los sets vendorizados con `id`, año, versión, fecha de descarga (`downloadedAt`) y superficie de origen. `downloadedAt` SHALL significar la fecha de la **última descarga del set desde su superficie cuyos bytes se confirmaron idénticos a los vendorizados** (fecha de descarga verificada: puede avanzar sin que ningún archivo cambie; una descarga que detecta una diferencia en cambio detiene la vendorización). El manifiesto SHALL incluir `lastSyncedAt` de primer nivel = fecha de la última regeneración y verificación completa del manifiesto; con `spec:check`/`spec:update` disponibles, el README SHALL declararlo como la fecha de la **última ejecución de `spec:update`** (único comando de sincronización que escribe el manifiesto; una decisión de autoridad revisada puede retirar `nextSet` manualmente y `spec:verify` SHALL validar el resultado) y advertirá que la semántica cambiará a "última ejecución del job" cuando exista un job que ejecute `spec:update` (fase 2). El job mensual de fase 1 solo ejecuta `spec:check` y reporta deriva: su existencia por sí sola SHALL no alterar esta semántica ni la advertencia del README. El campo `currentSet` SHALL identificar el set **en vigor hoy** (decisión 15, semántica: "vigente" = que rige, no "último publicado") y SHALL apuntar a un set declarado que no esté marcado como `policyOnly`. La clave `nextSet` SHALL existir únicamente cuando una superficie oficial con autoridad para publicar el esquema (ATV) haya publicado un set con fecha de entrada en vigor confirmada; en ese caso SHALL incluir `id` y `effectiveFrom`, y `nextSet` no puede ser `currentSet`. Cuando no exista un próximo set confirmado, `nextSet` SHALL omitirse (nunca `null`). Una publicación de otra superficie sin autoridad ATV ni fecha confirmada SHALL NOT representarse como `nextSet`; el set puede permanecer en `sets[]` como referencia vendorizada. En el estado actual, `currentSet` SHALL ser `2024/v4.4` y `manifest.json` SHALL NOT declarar `nextSet` para `2026/v4.4`. Los documentos auxiliares `Codigodemoneda_V4.4` y `Codificacionubicacion_V4.4` son parte de la especificación v4.4 (decisión 16) y comparten el set de los XSD del mismo número de versión. `xmldsig-core-schema.xsd`, que no pertenece a ningún set de Hacienda, SHALL quedar registrado sin pertenencia a set.

#### Scenario: `currentSet` apunta a un set existente en vigor

- **WHEN** se lee el campo `currentSet` de `manifest.json`
- **THEN** coincide con el `id` de un set declarado en la lista `sets` y ese set no está marcado como `policyOnly`

#### Scenario: revisión publicada pero aún no obligatoria

- **WHEN** ATV publica un set con fecha de entrada en vigor futura y confirmada
- **THEN** `currentSet` sigue apuntando al set en vigor (`2024/v4.4`) y la revisión aparece solo como `nextSet`, con su fecha de entrada en vigor

#### Scenario: Una publicación sin autoridad confirmada no se declara como próximo set

- **WHEN** `2026/v4.4` está vendorizado pero ATV no lo publica ni existe una fecha de entrada en vigor confirmada
- **THEN** `manifest.json` no contiene la clave `nextSet`, `currentSet` sigue apuntando a `2024/v4.4` y `2026/v4.4` permanece en `sets[]` solo como referencia

#### Scenario: `nextSet` solo existe con autoridad y fecha confirmadas

- **WHEN** ATV publica un set nuevo y confirma su fecha de entrada en vigor
- **THEN** `manifest.json` lo registra como `nextSet` con `id` y `effectiveFrom`, y `currentSet` no cambia hasta esa fecha

#### Scenario: no hay próximo set

- **WHEN** no hay un set publicado con autoridad ATV y fecha de entrada en vigor confirmada
- **THEN** la clave `nextSet` no existe en el manifiesto (no es `null` ni un objeto vacío)

#### Scenario: retiro editorial de un `nextSet` sin autoridad confirmada

- **WHEN** una decisión de autoridad revisada cierra que el set vendorizado no se adopta y no existe una fecha de entrada en vigor confirmada
- **THEN** `nextSet` se retira mediante una edición revisada del manifiesto (no mediante `spec:update`, que exige un set con `effectiveFrom`), `currentSet` no cambia, el set permanece en `sets[]` como referencia y `pnpm spec:verify` pasa

#### Scenario: los auxiliares viajan con su set

- **WHEN** se localiza la entrada de `Codigodemoneda_V4.4.pdf` o `Codificacionubicacion_V4.4.rar`
- **THEN** su campo `set` identifica un set declarado y vigente o de la misma versión v4.4

#### Scenario: `lastSyncedAt` documentado con la semántica de `spec:update`

- **WHEN** se lee `packages/sdk/schemas/README.md` después de este cambio
- **THEN** `lastSyncedAt` se declara como la fecha de la última ejecución de `spec:update`, con la advertencia de que la semántica pasará a "última ejecución del job" cuando exista un job que ejecute `spec:update`

#### Scenario: El job de fase 1 no cambia la semántica de `lastSyncedAt`

- **WHEN** existe el job mensual de fase 1 (`.github/workflows/spec-drift.yml`), que solo ejecuta `spec:check` y reporta deriva en issues
- **THEN** `lastSyncedAt` sigue declarándose como la fecha de la última ejecución de `spec:update`, y el README deja explícito que la fase 2 (un job que ejecute `spec:update`) aún no existe

### Requirement: Formato estable y supuestos marcados como no verificados

`manifest.json` SHALL mantener un orden de claves fijo y un formato estable que pase el formateador del repo, de modo que los diffs reflejen solo cambios de contenido. `packages/sdk/schemas/README.md` SHALL documentar como **supuestos no verificados** la redistribución de estos documentos dentro del repo (decisiones 7 y 11) y el acceso a las superficies desde CI (decisión 8), además de la procedencia de cada documento vendorizado, y SHALL explicar la semántica de los campos del manifiesto: `currentSet` (en vigor hoy), `nextSet` (solo si existe un próximo set con autoridad y fecha confirmadas), `lastSyncedAt` (con su semántica temporal), `downloadedAt` (fecha de descarga verificada) y los valores posibles de `sdkStatus`. El README SHALL declarar que `2024/v4.4` es el set autoritativo y que `2026/v4.4` no se adopta.

#### Scenario: el formateador no produce cambios

- **WHEN** se ejecuta el chequeo de formato del repo sobre `manifest.json`
- **THEN** no hay diferencias

#### Scenario: los supuestos aparecen como no verificados

- **WHEN** se lee `packages/sdk/schemas/README.md`
- **THEN** la redistribución sin restricciones y el acceso desde CI figuran explícitamente como supuestos sin verificar, con su referencia de decisión

#### Scenario: la semántica de los campos queda escrita

- **WHEN** se lee `packages/sdk/schemas/README.md`
- **THEN** están definidos `currentSet`, `nextSet` (solo cuando existe y con su `effectiveFrom` confirmado), `lastSyncedAt` (con su semántica temporal), `downloadedAt` (fecha de descarga verificada) y el conjunto de valores de `sdkStatus`, con la nota de que el SDK aún no usa la política del bloque `policy`

#### Scenario: la autoridad vigente no queda ambigua

- **WHEN** se lee `packages/sdk/schemas/README.md`
- **THEN** declara que `2024/v4.4` es el set autoritativo y que `2026/v4.4` es una publicación de referencia no adoptada, sin presentarla como obligatoria

### Requirement: La procedencia de cada set v4.4 se documenta con evidencia verificable por superficie

La documentación de `packages/sdk/schemas/` SHALL incluir un registro de
procedencia que, para cada set vendorizado, identifique la superficie oficial de
origen (`id` del manifiesto), la URL exacta consultada, el `Last-Modified`
observado, el SHA-256 y el tamaño verificados, la fecha de la comprobación y el
rol declarado del set. Cuando dos superficies oficiales publiquen bytes distintos
para el mismo año y versión, el registro SHALL declarar la divergencia, enumerar
los archivos afectados y las diferencias de restricciones observadas, y
identificar qué superficie toma el proyecto como autoritativa y con qué
justificación. El registro SHALL NOT presentar una publicación más reciente de
una superficie distinta como sustitución oficial del esquema vigente, ni cambiar
`currentSet`, `nextSet`, el manifiesto o los bytes vendorizados por sí mismo.
La decisión de autoridad SHALL quedar cerrada en el registro: `2024/v4.4` es el
set autoritativo y `2026/v4.4` no se adopta. El registro SHALL NOT afirmar una
fecha de obligatoriedad para `2026/v4.4` mientras ATV no publique ese set y
confirme la fecha, y SHALL dejar constancia de que el build del SDK embebe y usa
el set 2024.

#### Scenario: Los bytes vendorizados coinciden con la superficie ATV

- **WHEN** se comparan los archivos de `2024/v4.4/` con los publicados bajo
  `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/`
- **THEN** el registro declara que el SHA-256 y el tamaño de cada archivo
  coinciden, junto con la fecha de la comprobación y el `Last-Modified` observado

#### Scenario: Los bytes vendorizados coinciden con la superficie OVi

- **WHEN** se comparan los archivos de `2026/v4.4/` con los publicados bajo
  `https://www.hacienda.go.cr/docs/`
- **THEN** el registro atribuye esos bytes a la superficie OVi, no a ATV, y
  declara su fecha de publicación y su rol como referencia no adoptada

#### Scenario: La divergencia se enumera archivo por archivo

- **WHEN** se contrastan los dos sets de la misma versión nominal
- **THEN** el registro enumera los archivos cuyos bytes difieren y describe las
  diferencias de restricciones observadas, sin calificarlas como error de
  vendorización

#### Scenario: La autoridad no se transfiere en silencio

- **WHEN** la documentación describe el set `2026/v4.4`
- **THEN** declara que ATV no publica ese set, que la decisión es mantener
  `2024/v4.4` como autoritativo, que el SDK embebe ese set y que `2026/v4.4`
  queda solo como referencia, sin fecha de obligatoriedad afirmada

#### Scenario: Una nueva comprobación actualiza la evidencia

- **WHEN** una superficie cambia el `Last-Modified` o el hash de un archivo
  declarado en el registro
- **THEN** el registro se actualiza con el valor nuevo y la fecha de la nueva
  comprobación, conservando la referencia al valor anterior
