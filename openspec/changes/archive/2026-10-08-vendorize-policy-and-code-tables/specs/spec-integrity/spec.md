## Purpose

Garantiza que el conjunto completo de documentos de especificación de la v4.4 esté vendorizado en `packages/sdk/schemas/` y descrito por un `manifest.json` verificable: superficies oficiales consultadas, sets vendorizados, cuál es el vigente, hash y tamaño por archivo, y los datos del digest de la política de firma.

## ADDED Requirements

### Requirement: Set vendorizable completo bajo `packages/sdk/schemas/`

El repo SHALL mantener en `packages/sdk/schemas/` el conjunto vendorizable de la v4.4 (decisión 9): los nueve XSD de `2024/v4.4/`, los nueve XSD de `2026/v4.4/`, `ANEXOS Y ESTRUCTURAS_V4.4.pdf`, `Codigodemoneda_V4.4.pdf`, `Codificacionubicacion_V4.4.rar` y `Resolucion_General_sobre_disposiciones_tecnicas_comprobantes_electronicos_para_efectos_tributarios.pdf` en `2024/v4.4/`, y `xmldsig-core-schema.xsd` en la raíz de la carpeta. La estructura `<año>/<versión>/` SHALL conservarse (decisión 4); no se crearán copias de estos documentos en otra parte del repo.

#### Scenario: checkout limpio contiene el set completo

- **WHEN** se revisa un checkout limpio de `packages/sdk/schemas/`
- **THEN** cada uno de los documentos listados existe en su ruta declarada

#### Scenario: el PDF de la política coincide con el digest del Anexo 2

- **WHEN** se calcula SHA-256 en Base64 sobre los bytes exactos del PDF de la Resolución General vendorizado
- **THEN** el resultado es `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=` (Anexo 2, `ds:DigestMethod` = `http://www.w3.org/2001/04/xmlenc#sha256`)

#### Scenario: el digest publicado no coincide con el archivo descargado

- **WHEN** el PDF descargado de `cdn.comprobanteselectronicos.go.cr` produce un digest distinto del valor del Anexo 2
- **THEN** la vendorización NO avanza: la discrepancia se registra con ambos valores y superficie consultada, esperando revisión humana

### Requirement: El manifiesto declara las superficies oficiales consultadas

`packages/sdk/schemas/manifest.json` SHALL listar cada superficie oficial consultada con sus campos `id`, `url` y `type` (decisión 13): la página ATV (`id: "atv"`, `type: "atv-page"`, `frmAnexosyEstructuras.aspx`, rutas `docs/esquemas/<año>/v<versión>/`), el listado OVi (`id: "ovi"`, `type: "ovi-list"`, `www.hacienda.go.cr/docs/`, rutas planas) y el CDN (`id: "cdn"`, `type: "cdn-xml-schemas"`, `cdn.comprobanteselectronicos.go.cr/xml-schemas/`), que es donde se publican los documentos auxiliares y la política de firma. ATV y OVi son superficies distintas. `sets[].sourceSurface` y `policy.sourceSurface` SHALL ser claves que apuntan al `id` de una superficie declarada, no URLs sueltas; un `id` o `type` nuevo solo existe si el spec y el README se actualizan con él.

#### Scenario: la superficie CDN queda declarada

- **WHEN** se lee `manifest.json`
- **THEN** `cdn.comprobanteselectronicos.go.cr/xml-schemas/` aparece entre las superficies con `id: "cdn"` y `type: "cdn-xml-schemas"`, junto a ATV y OVi

#### Scenario: los documentos auxiliares quedan cubiertos por una superficie declarada

- **WHEN** se comprueba de qué superficie proviene cada archivo vendorizado (`sourceSurface`)
- **THEN** toda superficie referenciada existe en la lista de superficies del manifiesto

#### Scenario: `sourceSurface` es una clave, no una URL

- **WHEN** se leen `sets[].sourceSurface` o `policy.sourceSurface`
- **THEN** su valor coincide con el `id` de alguna entrada de `surfaces[]` (`atv`, `ovi` o `cdn`)

### Requirement: El manifiesto declara los sets, cuál está en vigor y cuál entra después

`manifest.json` SHALL declarar los sets vendorizados con `id`, año, versión, fecha de descarga (`downloadedAt`) y superficie de origen. `downloadedAt` SHALL significar la fecha de la **última descarga del set desde su superficie cuyos bytes se confirmaron idénticos a los vendorizados** (fecha de descarga verificada: puede avanzar sin que ningún archivo cambie; una descarga que detecta una diferencia en cambio detiene la vendorización). El manifiesto SHALL incluir `lastSyncedAt` de primer nivel = fecha de la última regeneración y verificación completa del manifiesto; mientras `spec:check`/`spec:update` no existan, el README SHALL declararlo como fecha de escritura manual y advertir que la semántica cambiará a "última ejecución del job" cuando ese job exista. El campo `currentSet` SHALL identificar el set **en vigor hoy** (decisión 15, semántica: "vigente" = que rige, no "último publicado") y SHALL apuntar a un set declarado que no esté marcado como `policyOnly`. Cuando exista un set publicado cuya obligatoriedad empieza después, `manifest.json` SHALL registrarlo como `nextSet` con su `id` y su `effectiveFrom`; hasta esa fecha `nextSet` no puede ser `currentSet`, y cuando no haya próximo set la clave `nextSet` SHALL omitirse (nunca `null`). Los documentos auxiliares `Codigodemoneda_V4.4` y `Codificacionubicacion_V4.4` son parte de la especificación v4.4 (decisión 16) y comparten el set de los XSD del mismo número de versión. `xmldsig-core-schema.xsd`, que no pertenece a ningún set de Hacienda, SHALL quedar registrado sin pertenencia a set.

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

### Requirement: Toda entrada de archivo registra identidad y hash

Por cada documento vendorizado, la entrada correspondiente en `manifest.json` SHALL registrar: ruta relativa en estilo POSIX (identidad del archivo), SHA-256 en hexadecimal de 64 caracteres, tamaño exacto en bytes y `vendored: true`. Todo archivo vendorizado existente SHALL tener exactamente una entrada, y dos entradas no SHALL compartir ruta. Las entradas de `files[]` SHALL estar ordenadas lexicográficamente por `path` (orden determinista para diffs limpios).

#### Scenario: entrada completa por archivo

- **WHEN** se recorre `manifest.files`
- **THEN** cada entrada tiene `path`, `sha256` (64 hex), `bytes` (entero ≥ 0) y `vendored: true`, sin rutas duplicadas, y la lista está ordenada por `path`

#### Scenario: un documento nuevo entra con su entrada en el mismo commit

- **WHEN** un commit añade, sustituye o elimina un documento vendorizado bajo `packages/sdk/schemas/`
- **THEN** el mismo commit actualiza la entrada afectada de `manifest.json` (hash, tamaño y/o presencia)

### Requirement: El manifiesto registra el digest de la política de firma

`manifest.json` SHALL incluir un bloque con los datos de la política de firma de la v4.4 (5.2/5.7): URL identificadora publicada en el Anexo 2, algoritmo (`http://www.w3.org/2001/04/xmlenc#sha256`), codificación (Base64), valor del digest (`DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=`), la cita del documento donde aparece (Anexo 2 del `ANEXOS Y ESTRUCTURAS_V4.4.pdf`) y el estado de migración del SDK (`sdkStatus`). El bloque describe lo que la especificación exige; mientras el SDK declare una política distinta, `sdkStatus` SHALL indicar que la migración está pendiente y el README SHALL explicar la discrepancia. `sdkStatus` SHALL usar uno de los valores conocidos (`pending-sdk-migration`, `aligned`); un valor nuevo solo existe si el README se actualiza con él. El valor Base64 del manifiesto y el SHA-256 hex del archivo de la política SHALL corresponder al mismo contenido.

#### Scenario: los datos de política citan su fuente

- **WHEN** se lee el bloque de política en `manifest.json`
- **THEN** incluye identificador, algoritmo, valor, cita del Anexo 2 y `sdkStatus`, y el valor coincide con el hash del PDF vendorizado

#### Scenario: el manifiesto no se confunde con el SDK

- **WHEN** se compara el bloque `policy` con las constantes actuales del SDK
- **THEN** `sdkStatus` marca la migración como pendiente y el README explica que el SDK aún declara otra política (corrección = fase 3)

### Requirement: Formato estable y supuestos marcados como no verificados

`manifest.json` SHALL mantener un orden de claves fijo y un formato estable que pase el formateador del repo, de modo que los diffs reflejen solo cambios de contenido. `packages/sdk/schemas/README.md` SHALL documentar como **supuestos no verificados** la redistribución de estos documentos dentro del repo (decisiones 7 y 11) y el acceso a las superficies desde CI (decisión 8), además de la procedencia de cada documento vendorizado, y SHALL explicar la semántica de los campos del manifiesto: `currentSet` (en vigor hoy) vs `nextSet` (publicado con `effectiveFrom`), `lastSyncedAt` (con su semántica temporal), `downloadedAt` (fecha de descarga verificada) y los valores posibles de `sdkStatus`.

#### Scenario: el formateador no produce cambios

- **WHEN** se ejecuta el chequeo de formato del repo sobre `manifest.json`
- **THEN** no hay diferencias

#### Scenario: los supuestos aparecen como no verificados

- **WHEN** se lee `packages/sdk/schemas/README.md`
- **THEN** la redistribución sin restricciones y el acceso desde CI figuran explícitamente como supuestos sin verificar, con su referencia de decisión

#### Scenario: la semántica de los campos queda escrita

- **WHEN** se lee `packages/sdk/schemas/README.md`
- **THEN** están definidos `currentSet`/`nextSet`, `lastSyncedAt` (con su semántica temporal), `downloadedAt` (fecha de descarga verificada) y el conjunto de valores de `sdkStatus`, con la nota de que el SDK aún no usa la política del bloque `policy`
