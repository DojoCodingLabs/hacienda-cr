## MODIFIED Requirements

### Requirement: El manifiesto declara los sets, cuál está en vigor y cuál entra después

`manifest.json` SHALL declarar los sets vendorizados con `id`, año, versión, fecha de descarga (`downloadedAt`) y superficie de origen. `downloadedAt` SHALL significar la fecha de la **última descarga del set desde su superficie cuyos bytes se confirmaron idénticos a los vendorizados** (fecha de descarga verificada: puede avanzar sin que ningún archivo cambie; una descarga que detecta una diferencia en cambio detiene la vendorización). El manifiesto SHALL incluir `lastSyncedAt` de primer nivel = fecha de la última regeneración y verificación completa del manifiesto; con `spec:check`/`spec:update` disponibles, el README SHALL declararlo como la fecha de la **última ejecución de `spec:update`** (único comando que escribe el manifiesto) y advertirá que la semántica cambiará a "última ejecución del job" cuando exista un job que ejecute `spec:update` (fase 2). El job mensual de fase 1 solo ejecuta `spec:check` y reporta deriva: su existencia por sí sola SHALL no alterar esta semántica ni la advertencia del README. El campo `currentSet` SHALL identificar el set **en vigor hoy** (decisión 15, semántica: "vigente" = que rige, no "último publicado") y SHALL apuntar a un set declarado que no esté marcado como `policyOnly`. Cuando exista un set publicado cuya obligatoriedad empieza después, `manifest.json` SHALL registrarlo como `nextSet` con su `id` y su `effectiveFrom`; hasta esa fecha `nextSet` no puede ser `currentSet`, y cuando no haya próximo set la clave `nextSet` SHALL omitirse (nunca `null`). Los documentos auxiliares `Codigodemoneda_V4.4` y `Codificacionubicacion_V4.4` son parte de la especificación v4.4 (decisión 16) y comparten el set de los XSD del mismo número de versión. `xmldsig-core-schema.xsd`, que no pertenece a ningún set de Hacienda, SHALL quedar registrado sin pertenencia a set.

#### Scenario: `currentSet` apunta a un set existente en vigor

- **WHEN** se lee el campo `currentSet` de `manifest.json`
- **THEN** coincide con el `id` de un set declarado en la lista `sets` y ese set no está marcado como `policyOnly`

#### Scenario: revisión publicada pero aún no obligatoria

- **WHEN** la fecha es anterior a `nextSet.effectiveFrom` (por ejemplo, 2026-10-08 con `nextSet.effectiveFrom: "2026-11-01"`)
- **THEN** `currentSet` sigue apuntando al set en vigor (`2024/v4.4`) y la revisión aparece solo como `nextSet`, con su fecha de entrada en vigor

#### Scenario: no hay próximo set

- **WHEN** todos los sets publicados ya están en vigor o no hay fecha futura conocida
- **THEN** la clave `nextSet` no existe en el manifiesto (no es `null` ni un objeto vacío)

#### Scenario: los auxiliares viajan con su set

- **WHEN** se localiza la entrada de `Codigodemoneda_V4.4.pdf` o `Codificacionubicacion_V4.4.rar`
- **THEN** su campo `set` identifica un set declarado y vigente o de la misma versión v4.4

#### Scenario: `lastSyncedAt` documentado con la semántica de `spec:update`

- **WHEN** se lee `packages/sdk/schemas/README.md` después de este cambio
- **THEN** `lastSyncedAt` se declara como la fecha de la última ejecución de `spec:update`, con la advertencia de que la semántica pasará a "última ejecución del job" cuando exista un job que ejecute `spec:update`

#### Scenario: El job de fase 1 no cambia la semántica de `lastSyncedAt`

- **WHEN** existe el job mensual de fase 1 (`.github/workflows/spec-drift.yml`), que solo ejecuta `spec:check` y reporta deriva en issues
- **THEN** `lastSyncedAt` sigue declarándose como la fecha de la última ejecución de `spec:update`, y el README deja explícito que la fase 2 (un job que ejecute `spec:update`) aún no existe
