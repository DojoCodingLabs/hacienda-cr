# spec-integrity Specification

## Purpose

Garantiza que el conjunto completo de documentos de especificación de la v4.4 esté vendorizado en `packages/sdk/schemas/` y descrito por un `manifest.json` verificable: superficies oficiales consultadas, sets vendorizados, cuál es el vigente, hash y tamaño por archivo, y los datos del digest de la política de firma.

## Requirements

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

`packages/sdk/schemas/manifest.json` SHALL listar cada superficie oficial consultada con su campo `id`, su `type` (decisión 13) y los campos de direccionamiento propios de ese tipo: `url` para `atv-page` y `cdn-xml-schemas`; `baseUrl` más `knownFiles[]` para `known-file-probe`. Las superficies son: la página ATV (`id: "atv"`, `type: "atv-page"`, `frmAnexosyEstructuras.aspx`, rutas `docs/esquemas/<año>/v<versión>/`), que enumera enlaces y descubre versiones nuevas; OVi (`id: "ovi"`, `type: "known-file-probe"`, `baseUrl: "www.hacienda.go.cr/docs/"`, `knownFiles[]` = los nueve XSD declarados en sus sets), que **no publica un listado parseable** — el portal de tributos es una SPA y la raíz `/docs/` no enlaza comprobantes, por eso OVi se sondea archivo por archivo en lugar de parsearse; y el CDN (`id: "cdn"`, `type: "cdn-xml-schemas"`, `cdn.comprobanteselectronicos.go.cr/xml-schemas/`), que es donde se publican los documentos auxiliares y la política de firma. ATV y OVi son superficies distintas. `sets[].sourceSurface` y `policy.sourceSurface` SHALL ser claves que apuntan al `id` de una superficie declarada, no URLs sueltas; un `id` o `type` nuevo solo existe si el spec y el README se actualizan con él. Cada entrada de `files[]` cuya superficie de origen sea de `type: "known-file-probe"` SHALL estar incluida en el `knownFiles[]` de esa superficie.

#### Scenario: la superficie CDN queda declarada

- **WHEN** se lee `manifest.json`
- **THEN** `cdn.comprobanteselectronicos.go.cr/xml-schemas/` aparece entre las superficies con `id: "cdn"` y `type: "cdn-xml-schemas"`, junto a ATV y OVi

#### Scenario: los documentos auxiliares quedan cubiertos por una superficie declarada

- **WHEN** se comprueba de qué superficie proviene cada archivo vendorizado (`sourceSurface`)
- **THEN** toda superficie referenciada existe en la lista de superficies del manifiesto

#### Scenario: `sourceSurface` es una clave, no una URL

- **WHEN** se leen `sets[].sourceSurface` o `policy.sourceSurface`
- **THEN** su valor coincide con el `id` de alguna entrada de `surfaces[]` (`atv`, `ovi` o `cdn`)

#### Scenario: OVi se declara como sondeo de archivos conocidos, no como listado

- **WHEN** se lee la entrada `ovi` de `surfaces[]`
- **THEN** su `type` es `known-file-probe`, declara `baseUrl` y `knownFiles[]` con los nueve XSD de sus sets, y no declara campo `url` ni `ovi-list`

#### Scenario: los `knownFiles` coinciden con los archivos declarados de su superficie

- **WHEN** se cruzan `knownFiles[]` de `ovi` con los `files[]` cuyo `sourceSurface` es `ovi`
- **THEN** los nombres coinciden: cada `files[]` de una superficie sondeo está en `knownFiles[]` y cada `knownFiles[]` tiene su entrada en `files[]`

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

### Requirement: Toda entrada de archivo registra identidad y hash

Por cada documento vendorizado, la entrada correspondiente en `manifest.json` SHALL registrar: ruta relativa en estilo POSIX (identidad del archivo), SHA-256 en hexadecimal de 64 caracteres, tamaño exacto en bytes y `vendored: true`. Todo archivo vendorizado existente SHALL tener exactamente una entrada, y dos entradas no SHALL compartir ruta. Las entradas de `files[]` SHALL estar ordenadas lexicográficamente por `path` (orden determinista para diffs limpios).

#### Scenario: entrada completa por archivo

- **WHEN** se recorre `manifest.files`
- **THEN** cada entrada tiene `path`, `sha256` (64 hex), `bytes` (entero ≥ 0) y `vendored: true`, sin rutas duplicadas, y la lista está ordenada por `path`

#### Scenario: un documento nuevo entra con su entrada en el mismo commit

- **WHEN** un commit añade, sustituye o elimina un documento vendorizado bajo `packages/sdk/schemas/`
- **THEN** el mismo commit actualiza la entrada afectada de `manifest.json` (hash, tamaño y/o presencia)

### Requirement: El manifiesto registra el digest de la política de firma

`manifest.json` SHALL incluir un bloque con los datos de la política de firma
de la v4.4 (5.2/5.7): URL identificadora publicada en el Anexo 2, algoritmo
(`http://www.w3.org/2001/04/xmlenc#sha256`), codificación (Base64), valor del
digest (`DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=`), la cita del
documento donde aparece (Anexo 2 del `ANEXOS Y ESTRUCTURAS_V4.4.pdf`) y el
estado de migración del SDK (`sdkStatus`). El bloque describe lo que la
especificación exige; mientras el SDK declare una política distinta,
`sdkStatus` SHALL indicar que la migración está pendiente, y cuando las
constantes publicadas del SDK coincidan con el bloque `policy`, `sdkStatus`
SHALL ser `aligned`; el README SHALL explicar ambos estados y el gate que
los hace cumplir. `sdkStatus` SHALL estar presente y usar uno de los valores
conocidos (`pending-sdk-migration`, `aligned`); un valor nuevo solo existe si
el README y el gate se actualizan con él en el mismo commit. El valor Base64
del manifiesto y el SHA-256 hex del archivo de la política SHALL corresponder
al mismo contenido, y **`pnpm spec:verify` SHALL hacer cumplir esa
correspondencia en cada corrida** — recomputando el SHA-256 en Base64 sobre
los bytes vendorizados del PDF de la política y contrastándolo con
`policy.digestValue` mediante comparación exacta de strings, en la forma
Base64 estándar con padding `=` que imprime el Anexo 2, sin normalización —
en lugar de depender únicamente de la constatación puntual del acto de
vendorizar.

#### Scenario: los datos de política citan su fuente

- **WHEN** se lee el bloque de política en `manifest.json`
- **THEN** incluye identificador, algoritmo, valor, cita del Anexo 2 y
  `sdkStatus`, y el valor coincide con el hash del PDF vendorizado

#### Scenario: el manifiesto no se confunde con el SDK

- **WHEN** se compara el bloque `policy` con las constantes publicadas del SDK
  mientras estas aún declaren otra política
- **THEN** `sdkStatus` marca la migración como pendiente y el README explica
  la discrepancia

#### Scenario: el SDK alineado declara `aligned`

- **WHEN** las constantes publicadas de la política de firma coinciden con el
  bloque `policy` (identificador, algoritmo y digest)
- **THEN** `sdkStatus` es `aligned` y el README no describe ninguna
  discrepancia pendiente

#### Scenario: el gate hace cumplir la correspondencia, no solo la declara

- **WHEN** se edita `manifest.policy.digestValue` a cualquier otro string no
  vacío sin alterar el PDF de la política vendorizado
- **THEN** `pnpm spec:verify` termina con código de salida distinto de cero
  nombrando el campo, el valor esperado (recomputado desde el PDF) y el valor
  declarado en el manifiesto

### Requirement: Las constantes publicadas de la política de firma coinciden con el manifiesto

Las constantes que el SDK publica para la política XAdES-EPES de la v4.4
(`shared/src/constants/xades-policy.ts`: identificador/URI de la política,
algoritmo del digest y valor del digest) SHALL coincidir con el bloque
`policy` del manifiesto: la URI SHALL ser el identificador publicado en el
Anexo 2, el algoritmo SHALL ser `http://www.w3.org/2001/04/xmlenc#sha256` y
el valor SHALL ser `policy.digestValue` en Base64 con padding `=`, por
comparación exacta de strings sin normalización. La verificación del repositorio
(ejecutada en el gate de `pnpm verify`) SHALL comparar las constantes
publicadas contra `manifest.policy` y terminar con código distinto de cero
nombrando campo, valor publicado y valor esperado cuando difieran. La
corrección que alinee las constantes SHALL venir acompañada de su Changeset
con notas de migración: cambia el XAdES-EPES que el SDK emite.

#### Scenario: constantes alineadas con el manifiesto

- **WHEN** se comparan las constantes publicadas de la política con
  `manifest.policy`
- **THEN** identificador, algoritmo y digest coinciden byte a byte y la
  verificación termina con código 0

#### Scenario: divergencia entre constantes y manifiesto falla la verificación

- **WHEN** la constante publicada de la URI, el algoritmo o el digest difiere
  de `manifest.policy` (p. ej. el SDK aún declara la política v4.1 con SHA-1
  `Ohixl6upD6av8N7pEvDABhEL6hM=`)
- **THEN** la verificación termina con código distinto de cero nombrando el
  campo, el valor publicado y el valor esperado desde el manifiesto

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

### Requirement: La verificación offline del árbol vendorizado (`spec:verify`) falla ante discrepancias con el manifiesto

El repositorio SHALL disponer de un comando `pnpm spec:verify` que, sin acceso a red y sin escribir en disco, compare cada archivo declarado con `vendored: true` en `packages/sdk/schemas/manifest.json` contra el árbol real de `packages/sdk/schemas/`, y falle con código de salida distinto de cero si:

- el SHA-256 o el tamaño de un archivo vendorizado no coincide con el declarado;
- un archivo declarado con `vendored: true` no existe;
- existe un archivo bajo `packages/sdk/schemas/` que el manifiesto no declara, salvo `manifest.json`, `README.md` y `codes.json` en la raíz de esa carpeta;
- existe un enlace simbólico bajo `packages/sdk/schemas/` (la caminata no los sigue);
- el documento de la política no puede identificarse entre los archivos declarados con `vendored: true` (ninguno o más de uno coincide con el nombre del `policy.identifier` publicado);
- el SHA-256 en Base64 recomputado sobre los bytes vendorizados del PDF de la política no coincide con `manifest.policy.digestValue` (comparación exacta de strings, en Base64 estándar con padding `=`; no se normaliza y no se acepta la forma sin `=`);
- `manifest.policy.digestMethod` no es la URI SHA-256 de XML-ENC que declara el Anexo 2 (comparación exacta, sensible a mayúsculas), o `manifest.policy.sdkStatus` está ausente, vacío o no pertenece a los valores conocidos del manifiesto;
- el manifiesto no pasa la validación cerrada de primer nivel: `schemaVersion` distinto de 1, `currentSet` sin correspondencia en `sets[]`, algún `sourceSurface` sin correspondencia en `surfaces[]`, `policy` sin `identifier`/`digestMethod`/`digestValue`/`sdkStatus`, o `files[]` con campos ausentes, malformados o rutas duplicadas.

El mensaje de error SHALL nombrar el archivo o campo afectado, el valor esperado, el valor obtenido cuando exista, y SHALL sugerir revisar `git diff`; si el cambio es legítimo, SHALL indicar que se aplica con `pnpm spec:update`, hoy disponible como comando soportado. Para los fallos del bloque `policy`, el mensaje SHALL además aclarar que `spec:update` no recalcula `policy.*` (no escribe `digestValue`, `digestMethod` ni `sdkStatus`) y apuntar la corrección concreta del caso: recalcular el digest desde el PDF vendorizado, corregir `digestMethod` contra el Anexo 2, corregir `sdkStatus` contra los valores admitidos, o revisar que `policy.identifier` y el nombre vendorizado describan el mismo documento.

Este chequeo SHALL referenciar las constantes del SDK **solo en lectura**: `spec:verify` NO SHALL exigir que `XADES_POLICY_HASH` (`shared/src/constants/xades-policy.ts`) sea igual a `policy.digestValue`. Las dos magnitudes describen documentos y algoritmos distintos hasta la fase 3 — SHA-1 sobre la política v4.1 frente a SHA-256 sobre la política v4.4 — y esa divergencia ya está registrada por `policy.sdkStatus`; exigir igualdad mantendría el gate en rojo permanente y confundiría la verificación del manifiesto con la migración del firmador.

#### Scenario: Árbol vendorizado íntegro pasa sin red

- **WHEN** se ejecuta `pnpm spec:verify` en un checkout donde cada archivo de `packages/sdk/schemas/` coincide con `manifest.json` (hash, tamaño y presencia)
- **THEN** el comando termina con código de salida 0 y no realiza peticiones de red ni modifica archivos

#### Scenario: Un byte alterado en un archivo vendorizado hace fallar la verificación

- **WHEN** se modifica un solo byte de un XSD, del PDF de Anexos, de `Codigodemoneda_V4.4.pdf` o de `Codificacionubicacion_V4.4.rar` bajo `packages/sdk/schemas/`
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra el archivo, el SHA-256 esperado del manifiesto y el SHA-256 obtenido

#### Scenario: Un archivo `vendored: true` ausente hace fallar la verificación

- **WHEN** se elimina del árbol un archivo que el manifiesto declara con `vendored: true`
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra el archivo faltante

#### Scenario: Un archivo no declarado hace fallar la verificación

- **WHEN** se agrega un archivo que no está en `files[]` del manifiesto dentro de `packages/sdk/schemas/` (incluido un subdirectorio)
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra el archivo no declarado, indica la allowlist de la raíz y sugiere revisar `git diff`

#### Scenario: `codes.json` en la raíz no hace fallar la verificación

- **WHEN** existe `packages/sdk/schemas/codes.json` (artefacto derivado generado por `pnpm codes:extract`) y el resto del árbol coincide con el manifiesto
- **THEN** `pnpm spec:verify` termina con código de salida 0

#### Scenario: El documento de la política no localizable hace fallar

- **WHEN** ningún archivo declarado con `vendored: true` corresponde al nombre publicado en `policy.identifier`, o dos archivos declarados le corresponden
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra `policy.identifier` y la cantidad de candidatos encontrados, sin comparar digests contra un archivo indeterminado

#### Scenario: El digest Base64 de la política divergente hace fallar

- **WHEN** `manifest.policy.digestValue` no coincide con el SHA-256 en Base64 recomputado sobre los bytes del PDF de la política vendorizado (ya sea porque el campo se editó a mano —incluida la forma sin `=` final, que no debe aceptarse— o porque el PDF fue reemplazado por uno distinto)
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra `policy.digestValue`, el valor esperado obtenido del PDF y el declarado

#### Scenario: Un `digestMethod` distinto de la URI SHA-256 hace fallar

- **WHEN** `manifest.policy.digestMethod` declara otro algoritmo, p. ej. `http://www.w3.org/2000/09/xmldsig#sha1`
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra el campo con la URI esperada y la obtenida

#### Scenario: Un `sdkStatus` ausente o fuera del conjunto conocido hace fallar

- **WHEN** `manifest.policy.sdkStatus` está ausente, vacío o contiene un valor que no es `pending-sdk-migration` ni `aligned`
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra el campo (con los valores admitidos en el caso de un valor desconocido)

#### Scenario: Un `policy.identifier` percent-encoded localiza el PDF

- **WHEN** `manifest.policy.identifier` trae percent-encoding en su nombre, como el publicado por el Anexo 2 (`Resoluci%C3%B3n_General_sobre_disposiciones_…`), y el archivo vendorizado correspondiente está declarado con `vendored: true`
- **THEN** el nombre se percent-decodifica y se pliega hasta coincidir con el vendorizado, y `pnpm spec:verify` compara el digest contra ese archivo

#### Scenario: La divergencia conocida con el SDK no hace fallar el gate

- **WHEN** el PDF vendorizado coincide con `policy.digestValue` y el bloque `policy` pasa su validación, mientras `XADES_POLICY_HASH` del SDK sigue declarando SHA-1 sobre la política v4.1 (estado vigente, `sdkStatus: pending-sdk-migration`)
- **THEN** `pnpm spec:verify` termina con código de salida 0: la constante del SDK se lee como referencia y no se compara por igualdad

#### Scenario: Un manifiesto con campos de primer nivel inválidos hace fallar

- **WHEN** `manifest.json` carece de `schemaVersion`, `currentSet` apunta a un `id` ausente de `sets[]`, un `sourceSurface` no existe en `surfaces[]` o `policy` carece de `digestValue`
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra el campo inválido

#### Scenario: Un enlace simbólico en el árbol hace fallar la verificación

- **WHEN** existe un symlink bajo `packages/sdk/schemas/`
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra el enlace como no soportado

#### Scenario: El mensaje de error orienta la recuperación

- **WHEN** `spec:verify` falla por cualquier discrepancia
- **THEN** el mensaje incluye el nombre del archivo o campo, el valor esperado, el obtenido cuando exista, y las instrucciones de revisar `git diff` y, si el cambio es legítimo, ejecutar `pnpm spec:update`

### Requirement: El build del SDK y `pnpm verify` ejecutan `spec:verify`

El pipeline de verificación del repositorio SHALL ejecutar `spec:verify` antes de considerar el build o la verificación exitosos: el `build` del paquete SDK lo ejecuta antes de generar sus artefactos, y `pnpm verify` lo incluye como paso propio. Un fallo de `spec:verify` SHALL abortar el build o la verificación con código de salida distinto de cero.

#### Scenario: El build del SDK aborta si el árbol vendorizado está alterado

- **WHEN** se ejecuta el build del SDK con un archivo vendorizado alterado respecto de `manifest.json`
- **THEN** el build falla antes de generar artefactos y el error identifica el archivo discrepante

#### Scenario: `pnpm verify` incluye la verificación offline

- **WHEN** se ejecuta `pnpm verify` en un checkout íntegro
- **THEN** el paso `spec:verify` se ejecuta dentro de la secuencia de verificación y termina con éxito sin red

#### Scenario: Una verificación fallida detiene la cadena de verificación

- **WHEN** `spec:verify` falla durante `pnpm verify`
- **THEN** `pnpm verify` termina con código de salida distinto de cero y no continúa con los pasos posteriores

### Requirement: `spec:check` es un chequeo de solo lectura con salida distinto de cero ante diferencias

El repositorio SHALL disponer de un comando `pnpm spec:check` (implementado bajo `scripts/spec-watch/`) que, con acceso a red y **sin escribir en disco**, descarga las superficies oficiales declaradas en `packages/sdk/schemas/manifest.json`, las contrasta contra el manifiesto y los archivos vendorizados, imprima un informe de diferencias y termine con código de salida 0 **únicamente** cuando no haya diferencias ni fallos. SHALL terminar con código de salida distinto de cero cuando haya alguna diferencia o cuando el propio chequeo falle (canario, superficie inaccesible). El comando SHALL mantener intactos los vendorizados, `manifest.json` (incluidos `downloadedAt` y `lastSyncedAt`) y cualquier otro archivo del repositorio: verificar no es sincronizar.

#### Scenario: Superficies idénticas al manifiesto terminan con éxito

- **WHEN** se ejecuta `pnpm spec:check` y cada superficie declarada ofrece exactamente los archivos, rutas y contenidos que declara `manifest.json`
- **THEN** el comando termina con código de salida 0, no modifica ningún archivo y no imprime diferencias

#### Scenario: Cualquier diferencia produce salida distinto de cero

- **WHEN** se ejecuta `pnpm spec:check` y el contraste detecta al menos una diferencia (versión nueva, hash distinto, archivo agregado o eliminado, o cambio en auxiliares)
- **THEN** el comando termina con código de salida distinto de cero e imprime el informe

#### Scenario: El chequeo no toca el manifiesto ni los vendorizados

- **WHEN** se ejecuta `pnpm spec:check`, haya o no diferencias
- **THEN** `manifest.json` y todos los archivos bajo `packages/sdk/schemas/` quedan byte a byte idénticos a como estaban antes de la ejecución

### Requirement: La página ATV enumera enlaces, deduce la versión del texto o la ruta y la compara numéricamente

Para cada superficie del manifiesto que **enumera** en HTML (`type: "atv-page"`), `spec:check` SHALL extraer los `href` que apunten bajo `docs/esquemas/<año>/v<versión>/`. La versión de cada enlace SHALL deducirse del **texto del enlace o de su ruta**, nunca de los atributos `id` ni `title` de la marca (los identificadores y títulos son inconsistentes y pueden cambiar). Las versiones deducidas SHALL compararse **numéricamente** (`4.10` es mayor que `4.9`, no alfabéticamente). Solo se consideran los enlaces con versión mayor o igual a la vigente declarada en el manifiesto: las versiones anteriores **no se descargan, no se hashean ni se reportan**. El descubrimiento de versiones nuevas (mayores que la vigente) ocurre en esta superficie: OVi no enumera, así que una versión nueva se reporta cuando la publica la página ATV.

#### Scenario: La versión de la página ATV se deduce de la ruta

- **WHEN** la superficie `atv-page` enlaza `docs/esquemas/2024/v4.4/FacturaElectronica_V4.4.xsd`
- **THEN** la versión deducida para ese enlace es `4.4`, obtenida de la ruta

#### Scenario: Los `id` y `title` no determinan la versión

- **WHEN** un enlace de la página ATV tiene `id="version_43"` y `title="zip"`, pero su texto y su `href` apuntan a `docs/esquemas/2024/v4.4/...`
- **THEN** la versión deducida es `4.4` (de la ruta), ignorando el `id` y el `title`

#### Scenario: La comparación de versiones es numérica

- **WHEN** se comparan las versiones deducidas `4.10` y `4.9` con la vigente
- **THEN** `4.10` se considera mayor que `4.9` y, si `4.9` fuera la vigente, se reporta como versión nueva

#### Scenario: Las versiones anteriores a la vigente no se consultan

- **WHEN** la página ATV también enlaza `docs/esquemas/2016/v4.1/...` y `docs/esquemas/2016/v4.2/...` mientras la vigente es `4.4`
- **THEN** esos enlaces no se descargan, no se hashean y no aparecen en el informe

#### Scenario: Una versión nueva publicada en la página ATV se reporta aunque OVi no la conozca

- **WHEN** la página ATV enlaza `docs/esquemas/2024/v4.5/FacturaElectronica_V4.5.xsd` y la superficie OVi solo sondea sus `knownFiles` declarados (sin ningún `4.5`)
- **THEN** `spec:check` reporta la versión nueva `4.5`

#### Scenario: Un auxiliar con versión nueva se reporta aunque los XSD sigan en la vigente

- **WHEN** la página ATV publica `Codigodemoneda_V4.5` o `Codificacionubicacion_V4.5` mientras los XSD siguen en `4.4`
- **THEN** `spec:check` reporta la versión nueva del auxiliar con la misma severidad que un XSD

### Requirement: La superficie `known-file-probe` sondea los archivos declarados y no enumera

Para cada superficie declarada con `type: "known-file-probe"` (hoy solo OVi), `spec:check` SHALL sondeer cada nombre de `knownFiles[]` contra `baseUrl` en lugar de parsear un listado: **HEAD** y comparación de los validadores devueltos (`Content-Length` contra `bytes`, `Last-Modified` contra el `lastModified` registrado en la entrada de `files[]`) contra lo que el manifiesto registra; cuando los validadores **difieren o cuando el manifiesto aún no registre línea base**, SHALL descargar el archivo con GET y comparar su SHA-256 con el declarado. Un hash distinto SHALL reportarse como diferencia (sección 2 del informe). Un nombre de `knownFiles[]` que responda 200 pero no tenga entrada en `files[]` SHALL reportarse como agregado (sección 3). El sondeo **no enumera el directorio**: archivos o versiones nuevos publicados bajo `baseUrl` pero no declarados en `knownFiles[]` no se descubren por esta superficie — esa detección queda en la superficie que enumera (`atv-page`), y las revisiones de un mismo número de versión se detectan por el hash de los archivos declarados. `spec:update` SHALL registrar `lastModified` en `files[]` cuando una descarga lo confirme, como línea base del sondeo.

#### Scenario: Validadores coincidentes no obligan a descargar

- **WHEN** el HEAD de un `knownFiles[]` devuelve `Last-Modified` y `Content-Length` idénticos a los registrados en su entrada de `files[]`
- **THEN** `spec:check` no descarga ese archivo y no reporta diferencia para él

#### Scenario: Validador distinto obliga a descargar y hashear

- **WHEN** el HEAD de un `knownFiles[]` devuelve un `Last-Modified` distinto del registrado (o la entrada no registra línea base)
- **THEN** `spec:check` descarga el archivo, calcula su SHA-256 y, si difiere del declarado, lo reporta en la sección 2 con ambos hashes

#### Scenario: Un `knownFiles` sin entrada en `files[]` se reporta como agregado

- **WHEN** un nombre declarado en `knownFiles[]` responde 200 en `baseUrl` pero `files[]` no lo declara
- **THEN** `spec:check` lo reporta en la sección 3 como agregado

#### Scenario: El sondeo no descubre archivos no declarados

- **WHEN** la superficie `known-file-probe` publica bajo `baseUrl` un archivo que no está en `knownFiles[]`
- **THEN** `spec:check` no lo reporta: el sondeo solo cubre lo declarado en el manifiesto

### Requirement: El informe de `spec:check` sigue un orden fijo de severidad

El informe de `spec:check` SHALL presentar las diferencias en este orden: **(1)** versión nueva publicada, mayor que la vigente, en cualquier superficie que enumere; **(2)** archivo del set vigente, o archivo declarado en una superficie `known-file-probe`, con hash distinto del declarado en el manifiesto; **(3)** archivo agregado o eliminado en el set vigente; **(4)** cambio en un documento auxiliar del set vigente (`Codigodemoneda_V4.4`, `Codificacionubicacion_V4.4`), con aviso de **revisión humana prioritaria**. Cada entrada SHALL nombrar el archivo o la ruta afectada y, cuando exista, el valor esperado y el obtenido. Un cambio de hash en un auxiliar SHALL reportarse únicamente en la sección 4, no duplicado en la sección 2. Un cambio de hash en `ANEXOS Y ESTRUCTURAS_V4.4.pdf` o en la Resolución General de la política SHALL reportarse en la sección 2 marcado como revisión humana prioritaria. El veredicto `sin cambios` solo SHALL emitirse cuando las cuatro secciones estén vacías y el canario haya pasado.

#### Scenario: Las cuatro categorías aparecen en el orden fijado

- **WHEN** una respuesta simulada de las superficies produce a la vez una versión nueva, un XSD con hash distinto, un archivo agregado y un auxiliar cambiado
- **THEN** el informe lista en ese orden: primero la versión nueva, después el hash distinto, después el archivo agregado o eliminado y al final el cambio en auxiliares

#### Scenario: Un XSD con hash distinto va en la sección 2

- **WHEN** la superficie de origen de un XSD del set vigente ofrece bytes cuyo SHA-256 difiere del declarado
- **THEN** el informe lo reporta en la sección 2 con la ruta y ambos hashes

#### Scenario: Un archivo agregado o eliminado va en la sección 3

- **WHEN** la superficie de origen de un archivo watcheado que no pertenece al conjunto canario ofrece un archivo que el manifiesto no declara, o deja de ofrecer uno que sí declara
- **THEN** el informe lo reporta en la sección 3 como agregado o eliminado, según el caso

#### Scenario: Un auxiliar cambiado va en la sección 4 con revisión prioritaria

- **WHEN** `Codigodemoneda_V4.4.pdf` o `Codificacionubicacion_V4.4.rar` se publican con bytes distintos a los vendorizados
- **THEN** el informe los reporta en la sección 4 con aviso de revisión humana prioritaria y no los repite en la sección 2, y el comando sale con código distinto de cero

#### Scenario: Sin diferencias no hay secciones y el veredicto es `sin cambios`

- **WHEN** el canario pasa y las cuatro secciones del informe quedan vacías
- **THEN** `spec:check` imprime el veredicto `sin cambios` y termina con código de salida 0

### Requirement: El canario de `spec:check` falla ante parseo vacío, mínimo insuficiente, archivos conocidos faltantes o falta de acceso

`spec:check` SHALL fallar con código de salida distinto de cero, con un mensaje claro y **nunca** con el veredicto `sin cambios`, cuando se dé cualquiera de estas condiciones: **(a)** el parseo de una superficie que enumera extrae cero enlaces; **(b)** el parseo extrae menos enlaces que el mínimo establecido para esa superficie; **(c)** un **archivo conocido del set vigente** no aparece en la superficie de la que proviene según el manifiesto — el conjunto conocido incluye los XSD del set, `ANEXOS Y ESTRUCTURAS_V4.4.pdf`, `Codigodemoneda_V4.4` y `Codificacionubicacion_V4.4`; **(d)** una superficie declarada no es accesible (red, certificado, bloqueo o error 5xx); **(e)** en una superficie `known-file-probe`, algún nombre de `knownFiles[]` no responde 200 (incluido 404/410): una rotura del sondeo nunca es "sin cambios". El mensaje SHALL nombrar la superficie afectada y, en los casos (c) y (e), también el archivo faltante. La ausencia de un archivo conocido SHALL tratarse como fallo del canario (no como una mera línea del informe), de modo que una rotación del formato de una superficie nunca se interprete como "sin cambios".

#### Scenario: Superficie sin enlaces hace fallar

- **WHEN** una respuesta simulada de una superficie declarada contiene HTML sin ningún enlace extraíble
- **THEN** `spec:check` termina con código distinto de cero y el mensaje nombra la superficie como parseo vacío, sin imprimir `sin cambios`

#### Scenario: Menos enlaces que el mínimo hace fallar

- **WHEN** el parseo de una superficie declarada extrae una cantidad de enlaces inferior al mínimo establecido para esa superficie
- **THEN** `spec:check` termina con código distinto de cero y el mensaje nombra la superficie y el mínimo esperado

#### Scenario: Falta `Codigodemoneda_V4.4` en su superficie

- **WHEN** la respuesta simulada de la superficie de origen de `Codigodemoneda_V4.4` no contiene ningún enlace hacia ese archivo
- **THEN** `spec:check` termina con código distinto de cero y el mensaje nombra `Codigodemoneda_V4.4` como archivo conocido faltante

#### Scenario: Falta `Codificacionubicacion_V4.4` en su superficie

- **WHEN** la respuesta simulada de la superficie de origen de `Codificacionubicacion_V4.4` no contiene ningún enlace hacia ese archivo
- **THEN** `spec:check` termina con código distinto de cero y el mensaje nombra `Codificacionubicacion_V4.4` como archivo conocido faltante

#### Scenario: Superficie inaccesible hace fallar

- **WHEN** una superficie declarada no responde (error de red, certificado, bloqueo o 5xx)
- **THEN** `spec:check` termina con código distinto de cero con un error claro que nombra la superficie, aunque las demás superficies sí respondan

#### Scenario: Un `knownFiles` que responde 404 hace fallar el sondeo

- **WHEN** algún nombre declarado en `knownFiles[]` de la superficie `ovi` responde 404 (o 410)
- **THEN** `spec:check` termina con código distinto de cero y el mensaje nombra la superficie `ovi` y el archivo sin responder, sin imprimir `sin cambios`

### Requirement: Las descargas del watcher son acotadas en host, protocolo y tamaño

Las descargas que `spec:check` y `spec:update` realizan contra las superficies declaradas
en `packages/sdk/schemas/manifest.json` SHALL limitarse a hosts presentes en la allowlist
derivada del propio manifiesto, y cada petición — incluidas las que siguen una
redirección — SHALL usar el esquema `https:`. Una redirección que descienda a `http:` o apunte a
otro esquema SHALL tratarse como error operativo (código de salida 2), no como contenido.
El límite de tamaño por respuesta (`maxBytes`) SHALL aplicarse **antes** de retener el
cuerpo completo en memoria: si el `Content-Length` declarado lo excede, la respuesta SHALL
rechazarse sin descargarla; si el header falta o miente, la lectura SHALL cortarse en el
máximo y la respuesta tratarse como error, de modo que ninguna superficie pueda hacer
acumular memoria ilimitada en el proceso.

#### Scenario: Una redirección a otro host sigue rechazada

- **WHEN** una superficie declarada responde una redirección hacia un host distinto de los
  declarados en el manifiesto
- **THEN** la petición falla con un error operativo que nombra el host destino y no se
  descarga ningún cuerpo

#### Scenario: Una caída de `https` a `http` se rechaza

- **WHEN** una superficie declarada responde una redirección hacia la misma host pero con
  esquema `http:`
- **THEN** la petición falla con un error operativo que nombra el esquema rechazado

#### Scenario: Un `Content-Length` excesivo se rechaza sin descargar

- **WHEN** la respuesta declara un `Content-Length` mayor que `maxBytes`
- **THEN** la petición falla con un error operativo y el cuerpo no se descarga

#### Scenario: Un cuerpo sin `Content-Length` se corta en el máximo

- **WHEN** la respuesta no declara `Content-Length` (o lo declara falso) y el cuerpo
  supera `maxBytes` durante la lectura
- **THEN** la lectura se corta, la petición falla con un error operativo y no se retiene
  más que el límite declarado

#### Scenario: Una descarga dentro de los límites sigue funcionando

- **WHEN** una superficie declarada responde con `https:`, en un host de la allowlist y
  con un cuerpo menor que `maxBytes`
- **THEN** la descarga se completa igual que antes y el informe no cambia

### Requirement: `spec:update` actualiza vendorizados y manifiesto y deja el commit a la revisión humana

El repositorio SHALL disponer de un comando `pnpm spec:update` (bajo `scripts/spec-watch/`)
que, con acceso a red: ejecute el mismo descubrimiento, deducción de versiones, sondeo
`known-file-probe` y canario que `spec:check`; descargue los archivos watcheados desde las
superficies declaradas — incluidos los que el sondeo detectó con derivas, pertenezcan al
set vigente o no; y **solo cuando todas las descargas y el canario hayan terminado sin
fallo**, escriba los vendorizados afectados de `packages/sdk/schemas/` y `manifest.json`
(hash, tamaño, `downloadedAt` verificado de cada set descargado y `lastSyncedAt`),
registrando además `lastModified` como línea base del sondeo cuando la descarga lo
confirme. Todo nombre de archivo que llegue desde una superficie — scrapeado o sondeado —
SHALL validarse antes de usarse como ruta de escritura: un nombre que, tras decodificarlo,
contenga `/`, `\` o `..` SHALL rechazarse como fallo operativo sin escribir nada, y la ruta
resuelta de cada escritura SHALL permanecer bajo `packages/sdk/schemas/`. El comando SHALL
terminar con los cambios **sin commitear ni hacer stage**: la revisión humana del diff
precede siempre al commit. Si el canario falla o alguna superficie no es accesible,
`spec:update` SHALL terminar con código distinto de cero **sin haber escrito nada**. El
comando SHALL dejar el árbol consistente con el manifiesto que escribió (verificable con
`spec:verify`). Si esa verificación posterior falla, `spec:update` SHALL terminar con
código distinto de cero nombrando el fallo, **sin deshacer** los archivos ya escritos, y
la documentación SHALL explicar que el diff queda en disco para revisión humana y cómo
revertirlo a mano. `currentSet` SHALL cambiar solo mediante una ejecución explícita de
`spec:update` que lo indique: la publicación de una versión nueva por sí sola nunca cambia
el set vigente.

#### Scenario: Descarga verificada sin cambios de contenido

- **WHEN** se ejecuta `pnpm spec:update` y las descargas confirman bytes idénticos a los
  vendorizados
- **THEN** el comando termina con código 0, actualiza `downloadedAt` y `lastSyncedAt` en
  `manifest.json`, no altera ningún archivo vendorizado y deja el diff del manifiesto sin
  commitear

#### Scenario: Un cambio real queda como diff para revisión humana

- **WHEN** la superficie ofrece bytes distintos a los vendorizados y `spec:update` los
  descarga
- **THEN** el comando termina con código 0 con los archivos y `manifest.json` actualizados,
  sin commit ni stage, y `git diff` muestra exactamente los cambios para que una persona
  los revise antes de commitear

#### Scenario: Canario fallido no escribe nada

- **WHEN** el canario falla durante `spec:update` (parseo vacío, mínimo insuficiente o
  archivo conocido faltante)
- **THEN** el comando termina con código distinto de cero y el árbol vendorizado y
  `manifest.json` quedan byte a byte como estaban

#### Scenario: Superficie inaccesible no escribe nada

- **WHEN** alguna superficie declarada no es accesible durante `spec:update`
- **THEN** el comando termina con código distinto de cero sin modificar vendorizados ni
  manifiesto

#### Scenario: Un nombre de archivo con ruta escapatoria se rechaza

- **WHEN** una superficie enlaza un nombre que, tras decodificar su último segmento,
  contiene `/`, `\` o `..` (por ejemplo `..%2F..%2F..%2Fevil.xsd`)
- **THEN** el comando termina con código distinto de cero nombrando el archivo rechazado,
  no escribe ningún vendorizado ni el manifiesto y no crea directorios fuera de
  `packages/sdk/schemas/`

#### Scenario: La ruta resuelta de toda escritura queda bajo `packages/sdk/schemas/`

- **WHEN** `spec:update` prepara cualquier escritura en `packages/sdk/schemas/`
- **THEN** la ruta resuelta del destino está contenida en `packages/sdk/schemas/`; si no
  lo está, la escritura se bloquea y el comando termina con código distinto de cero sin
  haber escrito nada

#### Scenario: El gate `spec:verify` fallido deja el diff en disco

- **WHEN** los vendorizados y `manifest.json` ya se escribieron y la verificación posterior
  falla
- **THEN** el comando termina con código distinto de cero nombrando el fallo, no deshace
  los archivos escritos y la documentación indica cómo revertirlos a mano con `git`

#### Scenario: Una versión nueva publicada no cambia el set vigente por sí sola

- **WHEN** se ejecuta `spec:update` mientras las superficies publican una versión mayor
  que la vigente
- **THEN** el comando actualiza los archivos del set vigente declarado y mantiene
  `currentSet`; la adopción de la versión nueva ocurre solo con una ejecución explícita
  que lo indique

#### Scenario: Una derivada detectada por sondeo se vendoriza sin tocar `currentSet`

- **WHEN** el sondeo de `ovi` detecta bytes distintos en un XSD del set `2026/v4.4` (que no
  es el vigente) y `spec:update` lo descarga
- **THEN** el comando actualiza el vendorizado y su entrada en `files[]` (incluida su línea
  base `lastModified`), y `currentSet` sigue apuntando a `2024/v4.4`

### Requirement: Un workflow programado mensual ejecuta `spec:check`

El repositorio SHALL disponer de un workflow de GitHub Actions que ejecute `pnpm spec:check` mensualmente en un checkout del repo y también bajo invocación manual (`workflow_dispatch`). El job SHALL usar únicamente las superficies declaradas en `packages/sdk/schemas/manifest.json`, sin credenciales de Hacienda, y SHALL terminar con el mismo código de salida que `spec:check` (0 sin diferencias, 1 con diferencias, 2 fallo operativo).

#### Scenario: Ejecución mensual programada

- **WHEN** llega la fecha mensual programada del workflow
- **THEN** el job ejecuta `pnpm spec:check` en un checkout limpio del repositorio

#### Scenario: Ejecución manual

- **WHEN** un maintainer dispara el workflow manualmente
- **THEN** el job ejecuta `pnpm spec:check` con el mismo comportamiento que en la ejecución programada

#### Scenario: El job no requiere credenciales de Hacienda

- **WHEN** el job consulta las superficies declaradas
- **THEN** lo hace con acceso público, sin secretos de usuario/contraseña de Hacienda

### Requirement: Una deriva detectada abre un issue etiquetado `spec-drift` con el informe pegado

Cuando la ejecución del workflow termina con código 1 (diferencias detectadas por `spec:check`), el job SHALL abrir un issue en el repositorio con la etiqueta `spec-drift` y un cuerpo que contenga el informe completo de `spec:check` pegado como texto. El issue SHALL identificar de qué comando proviene el informe. Cuando la ejecución termina con código 0, el job SHALL **no** abrir ni comentar ningún issue. La etiqueta `spec-drift` SHALL existir en el repo; si falta, el job SHALL crearla antes de abrir el issue. Cuando el informe supere el límite de tamaño del cuerpo de un issue, el job SHALL truncar el cuerpo sin cortar una secuencia multibyte UTF-8 por la mitad: el punto de corte SHALL caer en un límite de carácter válido, y la nota explícita de truncamiento SHALL añadirse después de ese corte.

#### Scenario: Deriva produce un issue con el informe

- **WHEN** `spec:check` termina con código 1 durante la ejecución del workflow
- **THEN** el job abre un issue con la etiqueta `spec-drift` cuyo cuerpo contiene el informe completo de `spec:check`

#### Scenario: Sin diferencias no hay issue

- **WHEN** `spec:check` termina con código 0 durante la ejecución del workflow
- **THEN** el job no abre ni comenta ningún issue

#### Scenario: La etiqueta `spec-drift` está disponible

- **WHEN** el repo no tiene aún la etiqueta `spec-drift`
- **THEN** el job la crea antes de abrir el issue de deriva

#### Scenario: Un informe muy largo se trunca con nota

- **WHEN** el informe de `spec:check` supera el límite de tamaño del cuerpo de un issue de GitHub
- **THEN** el job trunca el cuerpo con una nota explícita de truncamiento y el informe completo permanece en el log de la corrida

#### Scenario: El punto de corte no parte un carácter multibyte

- **WHEN** el byte que ocupa el límite de truncado cae en medio de una secuencia UTF-8 de varios bytes (por ejemplo un carácter acentuado de un nombre de archivo)
- **THEN** el cuerpo truncado termina en el último carácter completo anterior al límite y no contiene bytes UTF-8 incompletos

#### Scenario: Un informe corto no se trunca

- **WHEN** el informe de `spec:check` cabe dentro del límite de tamaño del cuerpo de un issue
- **THEN** el cuerpo se envía íntegro, sin nota de truncamiento

#### Scenario: Un issue nuevo referencia issues abiertos relacionados

- **WHEN** el job abre un issue nuevo y ya existen otros issues abiertos con la etiqueta `spec-drift`
- **THEN** el cuerpo del issue nuevo los menciona como relacionados

### Requirement: Un issue abierto con la misma huella del informe se comenta en lugar de duplicarse

Antes de abrir un issue por deriva, el job SHALL calcular una **huella determinista** del informe (mismo informe → misma huella) y buscar issues **abiertos** con la etiqueta `spec-drift` cuyo cuerpo original contenga esa misma huella. Si existe al menos uno, el job SHALL añadir el informe actual como **comentario** en ese issue en lugar de abrir uno nuevo. Si el issue con esa huella está cerrado, el job SHALL abrir un issue nuevo. Issues abiertos con huella distinta no bloquean la apertura de un issue nuevo. Un issue cuyo cuerpo **no** contenga el marcador de huella (creado a mano o anterior al job) SHALL ignorarse en la comparación sin fallar la corrida.

#### Scenario: Misma deriva dos meses seguidos comenta, no duplica

- **WHEN** el informe de esta corrida tiene la huella de un issue `spec-drift` aún abierto
- **THEN** el job comenta el informe actual en ese issue y no abre uno nuevo

#### Scenario: Deriva distinta abre un issue nuevo

- **WHEN** el informe de esta corrida tiene una huella que no coincide con ningún issue `spec-drift` abierto
- **THEN** el job abre un issue nuevo con la etiqueta y el informe

#### Scenario: El issue anterior fue cerrado

- **WHEN** existe un issue cerrado con la misma huella pero no hay issue abierto con esa huella
- **THEN** el job abre un issue nuevo (el deduplicador solo considera issues abiertos)

#### Scenario: Un issue abierto sin marcador de huella se ignora

- **WHEN** hay un issue abierto con la etiqueta `spec-drift` pero su cuerpo no contiene el marcador de huella
- **THEN** el job lo excluye de la comparación y continúa sin fallar

### Requirement: El job de deriva no muta el repositorio

El workflow SHALL ser de **solo reporte**: no cambia `currentSet`, no ejecuta `spec:update`, no commitea, no hace push y no abre pull requests. Su único efecto secundario permitido son las operaciones de issue (abrir, comentar, crear la etiqueta). La revisión humana del diff y la vendorización siguen siendo pasos posteriores manuales (`pnpm spec:update`).

#### Scenario: Ningún commit ni PR sale del job

- **WHEN** el workflow termina (con o sin deriva)
- **THEN** no se ha creado ningún commit,rama o pull request, y `manifest.json` y los vendorizados no han sido modificados

#### Scenario: El set vigente no cambia por sí solo

- **WHEN** el workflow detecta una versión nueva publicada
- **THEN** el job solo reporta la deriva; `currentSet` permanece intacto hasta una ejecución explícita de `spec:update` con `--set`

### Requirement: Un fallo operativo falla el job y nunca reporta "sin cambios"

Si durante la ejecución del workflow alguna superficie declarada resulta inaccesible (o el canario de `spec:check` falla, código 2), el job SHALL terminar fallando con un mensaje que nombre la superficie afectada y la causa, y SHALL **no** abrir ni comentar issues de deriva (no hay diagnóstico de deriva posible). Cuando **todas** las superficies fallan, el job SHALL fallar igualmente y en ningún caso SHALL imprimir ni publicar el veredicto `sin cambios`: la indisponibilidad total no es ausencia de deriva. Cualquier código de salida de `spec:check` distinto de 0 y 1 SHALL tratarse como fallo operativo, con el código original en el mensaje y el job terminando con código 2. Si las operaciones de reporte en GitHub (`gh`) fallan (token, API caída, rate limit), el job SHALL terminar con un error claro que identifique la operación fallida y código 2 — un fallo del canal de reporte no es "sin cambios" ni "sin deriva".

#### Scenario: Una superficie caída falla el job nombrándola

- **WHEN** una superficie declarada no responde durante `spec:check` en el workflow
- **THEN** el job termina fallando con un mensaje que nombra la superficie, y no abre ni comenta issues de deriva

#### Scenario: Todas las superficies caídas no producen "sin cambios"

- **WHEN** ninguna superficie declarada es accesible durante la ejecución
- **THEN** el job falla con error claro y no emite el veredicto `sin cambios` ni crea issues de deriva

#### Scenario: Código de salida inesperado de `spec:check`

- **WHEN** `spec:check` termina con un código distinto de 0, 1 y 2 (p. ej. 127)
- **THEN** el job falla como fallo operativo con el código original incluido en el mensaje de error y sale con código 2, no abre ni comenta issues de deriva, y no emite el veredicto `sin cambios`

#### Scenario: Fallo de GitHub al reportar la deriva

- **WHEN** `spec:check` termina con código 1 pero una operación de `gh` (crear etiqueta, abrir issue o comentar) falla
- **THEN** el job termina fallando con un error que identifica la operación fallida, y no emite el veredicto `sin cambios`

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
Toda autoridad no confirmada por la superficie ATV SHALL quedar registrada como
decisión abierta, con su efecto pendiente sobre `nextSet` y sobre el set que
embebe el build del SDK.

#### Scenario: Los bytes vendorizados coinciden con la superficie ATV

- **WHEN** se comparan los archivos de `2024/v4.4/` con los publicados bajo
  `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/`
- **THEN** el registro declara que el SHA-256 y el tamaño de cada archivo
  coinciden, junto con la fecha de la comprobación y el `Last-Modified` observado

#### Scenario: Los bytes vendorizados coinciden con la superficie OVi

- **WHEN** se comparan los archivos de `2026/v4.4/` con los publicados bajo
  `https://www.hacienda.go.cr/docs/`
- **THEN** el registro atribuye esos bytes a la superficie OVi, no a ATV, y
  declara su fecha de publicación y su rol como revisión publicada fuera de ATV

#### Scenario: La divergencia se enumera archivo por archivo

- **WHEN** se contrastan los dos sets de la misma versión nominal
- **THEN** el registro enumera los archivos cuyos bytes difieren y describe las
  diferencias de restricciones observadas, sin calificarlas como error de
  vendorización

#### Scenario: La autoridad no se transfiere en silencio

- **WHEN** la documentación describe el set `2026/v4.4` y su fecha de
  obligatoriedad
- **THEN** declara que ATV no publica ese set y registra como decisión abierta
  su efecto sobre `nextSet`, sobre el set embebido y sobre la fecha de
  obligatoriedad, manteniendo `currentSet` en `2024/v4.4`

#### Scenario: Una nueva comprobación actualiza la evidencia

- **WHEN** una superficie cambia el `Last-Modified` o el hash de un archivo
  declarado en el registro
- **THEN** el registro se actualiza con el valor nuevo y la fecha de la nueva
  comprobación, conservando la referencia al valor anterior
