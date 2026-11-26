## MODIFIED Requirements

### Requirement: El manifiesto declara los sets, cuál está en vigor y cuál entra después

`manifest.json` SHALL declarar los sets vendorizados con `id`, año, versión, fecha de descarga (`downloadedAt`) y superficie de origen. `downloadedAt` SHALL significar la fecha de la **última descarga del set desde su superficie cuyos bytes se confirmaron idénticos a los vendorizados** (fecha de descarga verificada: puede avanzar sin que ningún archivo cambie; una descarga que detecta una diferencia en cambio detiene la vendorización; un set que no se descargó conserva su fecha). El manifiesto SHALL incluir `lastSyncedAt` de primer nivel = fecha de la última regeneración y verificación completa del manifiesto; con `spec:check`/`spec:update` disponibles, el README SHALL declararlo como la fecha de la **última ejecución de `spec:update`** (único comando que escribe el manifiesto) y advertirá que la semántica cambiará a "última ejecución del job" cuando exista un job que ejecute `spec:update` (fase 2). El job mensual de fase 1 solo ejecuta `spec:check` y reporta deriva: su existencia por sí sola SHALL no alterar esta semántica ni la advertencia del README. El campo `currentSet` SHALL identificar el set **en vigor hoy** (decisión 15, semántica: "vigente" = que rige, no "último publicado") y SHALL apuntar a un set declarado que no esté marcado como `policyOnly`. Desde el 2026-11-01 el set en vigor es `2026/v4.4` (comunicado de Hacienda `ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf`); `2024/v4.4` SHALL permanecer en `sets[]` como set previo. Cuando exista un set publicado cuya obligatoriedad empieza después, `manifest.json` SHALL registrarlo como `nextSet` con su `id` y su `effectiveFrom`; hasta esa fecha `nextSet` no puede ser `currentSet`, y cuando no haya próximo set la clave `nextSet` SHALL omitirse (nunca `null`). Un set MAY declarar `effectiveFrom` y `authority` (fuentes primarias con URL, SHA-256 y fecha de comprobación) como datos informativos. El campo opcional `codesSet` SHALL nombrar un set declarado: es el set del que `codes:extract` lee XSD y auxiliares, y por defecto es `currentSet`. `spec:verify` SHALL rechazar un `currentSet` `policyOnly`, un `nextSet` fuera de `sets[]`, igual a `currentSet`, `null` o con `effectiveFrom` que no sea `AAAA-MM-DD`, y un `codesSet` fuera de `sets[]`. Los documentos auxiliares `Codigodemoneda_V4.4` y `Codificacionubicacion_V4.4` son parte de la especificación v4.4 (decisión 16) y comparten el set de los XSD del mismo número de versión. `xmldsig-core-schema.xsd`, que no pertenece a ningún set de Hacienda, SHALL quedar registrado sin pertenencia a set.

#### Scenario: `currentSet` apunta a un set existente en vigor

- **WHEN** se lee el campo `currentSet` de `manifest.json`
- **THEN** coincide con el `id` de un set declarado en la lista `sets` y ese set no está marcado como `policyOnly`

#### Scenario: la revisión de 2026 rige desde su fecha de obligatoriedad

- **WHEN** la fecha es posterior al 2026-11-01
- **THEN** `currentSet` es `2026/v4.4`, la clave `nextSet` no existe, `2024/v4.4` sigue en `sets[]` y el set `2026/v4.4` registra `effectiveFrom: "2026-11-01"`

#### Scenario: no hay próximo set

- **WHEN** todos los sets publicados ya están en vigor o no hay fecha futura conocida
- **THEN** la clave `nextSet` no existe en el manifiesto (no es `null` ni un objeto vacío)

#### Scenario: `nextSet` o `codesSet` incoherentes fallan

- **WHEN** `nextSet` es `null`, no está en `sets[]`, es igual a `currentSet` o su `effectiveFrom` no es `AAAA-MM-DD`, o `codesSet` no está en `sets[]`
- **THEN** `spec:verify` termina con código distinto de cero y nombra el campo

#### Scenario: los auxiliares viajan con su set

- **WHEN** se localiza la entrada de `Codigodemoneda_V4.4.pdf` o `Codificacionubicacion_V4.4.rar`
- **THEN** su campo `set` identifica un set declarado y vigente o de la misma versión v4.4

### Requirement: `spec:check` es un chequeo de solo lectura con salida distinto de cero ante diferencias

El repositorio SHALL disponer de un comando `pnpm spec:check` (implementado bajo `scripts/spec-watch/`) que, con acceso a red y **sin escribir en disco**, descarga las superficies oficiales declaradas en `packages/sdk/schemas/manifest.json`, las contrasta contra el manifiesto y los archivos vendorizados, imprima un informe de diferencias y termine con código de salida 0 **únicamente** cuando no haya diferencias ni fallos. SHALL terminar con código de salida distinto de cero cuando haya alguna diferencia o cuando el propio chequeo falle (canario, superficie inaccesible). El contraste de hashes SHALL cubrir los archivos del `currentSet` y el PDF de la política de firma; los enlaces de otros sets se identifican pero no se descargan, de modo que un set previo que su superficie ya no sirve no aborta el chequeo. El comando SHALL mantener intactos los vendorizados, `manifest.json` (incluidos `downloadedAt` y `lastSyncedAt`) y cualquier otro archivo del repositorio: verificar no es sincronizar.

#### Scenario: Superficies idénticas al manifiesto terminan con éxito

- **WHEN** se ejecuta `pnpm spec:check` y cada superficie declarada ofrece exactamente los archivos, rutas y contenidos que declara `manifest.json`
- **THEN** el comando termina con código de salida 0, no modifica ningún archivo y no imprime diferencias

#### Scenario: Cualquier diferencia produce salida distinto de cero

- **WHEN** se ejecuta `pnpm spec:check` y el contraste detecta al menos una diferencia (versión nueva, hash distinto, archivo agregado o eliminado, o cambio en auxiliares)
- **THEN** el comando termina con código de salida distinto de cero e imprime el informe

#### Scenario: Un set previo retirado de su superficie no aborta el chequeo

- **WHEN** `currentSet` es `2026/v4.4` y la página ATV sigue listando los archivos de `2024/v4.4` pero cada uno responde 404
- **THEN** el comando no descarga esos archivos, compara el set vigente y la política de firma, y termina con código 0 si no hay diferencias

#### Scenario: El chequeo no toca el manifiesto ni los vendorizados

- **WHEN** se ejecuta `pnpm spec:check`, haya o no diferencias
- **THEN** `manifest.json` y todos los archivos bajo `packages/sdk/schemas/` quedan byte a byte idénticos a como estaban antes de la ejecución

### Requirement: La procedencia de cada set v4.4 se documenta con evidencia verificable por superficie

La documentación de `packages/sdk/schemas/` SHALL incluir un registro de
procedencia que, para cada set vendorizado, identifique la superficie oficial de
origen (`id` del manifiesto), la URL exacta consultada, el `Last-Modified`
observado, el SHA-256 y el tamaño verificados, la fecha de la comprobación y el
rol declarado del set. Cuando dos superficies oficiales publiquen bytes distintos
para el mismo año y versión, el registro SHALL declarar la divergencia, enumerar
los archivos afectados y las diferencias de restricciones observadas, y
identificar qué set toma el proyecto como vigente y con qué fuentes primarias.
La autoridad de un set SHALL apoyarse en fuentes primarias de Hacienda
(comunicados, PDF oficial de Anexos y Estructuras, bytes servidos por la
superficie oficial), registradas con URL, `Last-Modified`, SHA-256 y fecha de
comprobación; una publicación más reciente de otra superficie SHALL NOT tratarse
como sustitución del esquema vigente sin esa evidencia. El registro no cambia
el manifiesto ni los bytes vendorizados por sí mismo: un cambio de `currentSet`
SHALL reflejarse en el manifiesto, en el set embebido por el build del SDK y en
sus pruebas en el mismo cambio.

#### Scenario: Los bytes vendorizados coinciden con la superficie ATV

- **WHEN** se comparan los archivos de `2024/v4.4/` con los publicados bajo
  `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/`
- **THEN** el registro declara que el SHA-256 y el tamaño de cada archivo
  coincidían en la fecha de la comprobación, con el `Last-Modified` observado,
  y registra que ATV dejó de servirlos (404) desde el 2026-11-26

#### Scenario: Los bytes vendorizados coinciden con la superficie OVi

- **WHEN** se comparan los archivos de `2026/v4.4/` con los publicados bajo
  `https://www.hacienda.go.cr/docs/`
- **THEN** el registro atribuye esos bytes a la superficie OVi, declara su fecha
  de publicación, la fecha de la última comprobación y su rol de set vigente

#### Scenario: La divergencia se enumera archivo por archivo

- **WHEN** se contrastan los dos sets de la misma versión nominal
- **THEN** el registro enumera los archivos cuyos bytes difieren y describe las
  diferencias de restricciones observadas, sin calificarlas como error de
  vendorización

#### Scenario: La autoridad se declara con fuentes primarias

- **WHEN** la documentación describe el set `2026/v4.4` y su fecha de
  obligatoriedad
- **THEN** cita el comunicado de Hacienda y el PDF oficial de Anexos (URL,
  `Last-Modified`, SHA-256, fecha de comprobación y el texto que fija la fecha
  2026-11-01), declara `2026/v4.4` como `currentSet` y `2024/v4.4` como set
  previo, y registra como cerrada la decisión que dejó abierta #118

#### Scenario: Una nueva comprobación actualiza la evidencia

- **WHEN** una superficie cambia el `Last-Modified` o el hash de un archivo
  declarado en el registro
- **THEN** el registro se actualiza con el valor nuevo y la fecha de la nueva
  comprobación, conservando la referencia al valor anterior
