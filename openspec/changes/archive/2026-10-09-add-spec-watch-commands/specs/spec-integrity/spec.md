## ADDED Requirements

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

Para cada superficie declarada con `type: "known-file-probe"` (hoy solo OVi), `spec:check` SHALL sondear cada nombre de `knownFiles[]` contra `baseUrl` en lugar de parsear un listado: **HEAD** y comparación de los validadores devueltos (`Content-Length` contra `bytes`, `Last-Modified` contra el `lastModified` registrado en la entrada de `files[]`) contra lo que el manifiesto registra; cuando los validadores **difieren o cuando el manifiesto aún no registre línea base**, SHALL descargar el archivo con GET y comparar su SHA-256 con el declarado. Un hash distinto SHALL reportarse como diferencia (sección 2 del informe). Un nombre de `knownFiles[]` que responda 200 pero no tenga entrada en `files[]` SHALL reportarse como agregado (sección 3). El sondeo **no enumera el directorio**: archivos o versiones nuevos publicados bajo `baseUrl` pero no declarados en `knownFiles[]` no se descubren por esta superficie — esa detección queda en la superficie que enumera (`atv-page`), y las revisiones de un mismo número de versión se detectan por el hash de los archivos declarados. `spec:update` SHALL registrar `lastModified` en `files[]` cuando una descarga lo confirme, como línea base del sondeo.

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

### Requirement: `spec:update` actualiza vendorizados y manifiesto y deja el commit a la revisión humana

El repositorio SHALL disponer de un comando `pnpm spec:update` (bajo `scripts/spec-watch/`) que, con acceso a red: ejecute el mismo descubrimiento, deducción de versiones, sondeo `known-file-probe` y canario que `spec:check`; descargue los archivos watcheados desde las superficies declaradas — incluidos los que el sondeo detectó con derivas, pertenezcan al set vigente o no; y **solo cuando todas las descargas y el canario hayan terminado sin fallo**, escriba los vendorizados afectados de `packages/sdk/schemas/` y `manifest.json` (hash, tamaño, `downloadedAt` verificado de cada set descargado y `lastSyncedAt`), registrando además `lastModified` como línea base del sondeo cuando la descarga lo confirme. El comando SHALL terminar con los cambios **sin commitear ni hacer stage**: la revisión humana del diff precede siempre al commit. Si el canario falla o alguna superficie no es accesible, `spec:update` SHALL terminar con código distinto de cero **sin haber escrito nada**. El comando SHALL dejar el árbol consistente con el manifiesto que escribió (verificable con `spec:verify`). `currentSet` SHALL cambiar solo mediante una ejecución explícita de `spec:update` que lo indique: la publicación de una versión nueva por sí sola nunca cambia el set vigente.

#### Scenario: Descarga verificada sin cambios de contenido

- **WHEN** se ejecuta `pnpm spec:update` y las descargas confirman bytes idénticos a los vendorizados
- **THEN** el comando termina con código 0, actualiza `downloadedAt` y `lastSyncedAt` en `manifest.json`, no altera ningún archivo vendorizado y deja el diff del manifiesto sin commitear

#### Scenario: Un cambio real queda como diff para revisión humana

- **WHEN** la superficie ofrece bytes distintos a los vendorizados y `spec:update` los descarga
- **THEN** el comando termina con código 0 con los archivos y `manifest.json` actualizados, sin commit ni stage, y `git diff` muestra exactamente los cambios para que una persona los revise antes de commitear

#### Scenario: Canario fallido no escribe nada

- **WHEN** el canario falla durante `spec:update` (parseo vacío, mínimo insuficiente o archivo conocido faltante)
- **THEN** el comando termina con código distinto de cero y el árbol vendorizado y `manifest.json` quedan byte a byte como estaban

#### Scenario: Superficie inaccesible no escribe nada

- **WHEN** alguna superficie declarada no es accesible durante `spec:update`
- **THEN** el comando termina con código distinto de cero sin modificar vendorizados ni manifiesto

#### Scenario: Una versión nueva publicada no cambia el set vigente por sí sola

- **WHEN** se ejecuta `spec:update` mientras las superficies publican una versión mayor que la vigente
- **THEN** el comando actualiza los archivos del set vigente declarado y mantiene `currentSet`; la adopción de la versión nueva ocurre solo con una ejecución explícita que lo indique

#### Scenario: Una derivada detectada por sondeo se vendoriza sin tocar `currentSet`

- **WHEN** el sondeo de `ovi` detecta bytes distintos en un XSD del set `2026/v4.4` (que no es el vigente) y `spec:update` lo descarga
- **THEN** el comando actualiza el vendorizado y su entrada en `files[]` (incluida su línea base `lastModified`), y `currentSet` sigue apuntando a `2024/v4.4`

## MODIFIED Requirements

### Requirement: El manifiesto declara los sets, cuál está en vigor y cuál entra después

`manifest.json` SHALL declarar los sets vendorizados con `id`, año, versión, fecha de descarga (`downloadedAt`) y superficie de origen. `downloadedAt` SHALL significar la fecha de la **última descarga del set desde su superficie cuyos bytes se confirmaron idénticos a los vendorizados** (fecha de descarga verificada: puede avanzar sin que ningún archivo cambie; una descarga que detecta una diferencia en cambio detiene la vendorización). El manifiesto SHALL incluir `lastSyncedAt` de primer nivel = fecha de la última regeneración y verificación completa del manifiesto; con `spec:check`/`spec:update` disponibles, el README SHALL declararlo como la fecha de la **última ejecución de `spec:update`** (único comando que escribe el manifiesto) y advertirá que la semántica cambiará a "última ejecución del job" cuando ese job exista. El campo `currentSet` SHALL identificar el set **en vigor hoy** (decisión 15, semántica: "vigente" = que rige, no "último publicado") y SHALL apuntar a un set declarado que no esté marcado como `policyOnly`. Cuando exista un set publicado cuya obligatoriedad empieza después, `manifest.json` SHALL registrarlo como `nextSet` con su `id` y su `effectiveFrom`; hasta esa fecha `nextSet` no puede ser `currentSet`, y cuando no haya próximo set la clave `nextSet` SHALL omitirse (nunca `null`). Los documentos auxiliares `Codigodemoneda_V4.4` y `Codificacionubicacion_V4.4` son parte de la especificación v4.4 (decisión 16) y comparten el set de los XSD del mismo número de versión. `xmldsig-core-schema.xsd`, que no pertenece a ningún set de Hacienda, SHALL quedar registrado sin pertenencia a set.

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
- **THEN** `lastSyncedAt` se declara como la fecha de la última ejecución de `spec:update`, con la advertencia de que la semántica pasará a "última ejecución del job" cuando el job exista

### Requirement: La verificación offline del árbol vendorizado (`spec:verify`) falla ante discrepancias con el manifiesto

El repositorio SHALL disponer de un comando `pnpm spec:verify` que, sin acceso a red y sin escribir en disco, compare cada archivo declarado con `vendored: true` en `packages/sdk/schemas/manifest.json` contra el árbol real de `packages/sdk/schemas/`, y falle con código de salida distinto de cero si:

- el SHA-256 o el tamaño de un archivo vendorizado no coincide con el declarado;
- un archivo declarado con `vendored: true` no existe;
- existe un archivo bajo `packages/sdk/schemas/` que el manifiesto no declara, salvo `manifest.json` y `README.md` en la raíz de esa carpeta;
- existe un enlace simbólico bajo `packages/sdk/schemas/` (la caminata no los sigue);
- el manifiesto no pasa la validación cerrada de primer nivel: `schemaVersion` distinto de 1, `currentSet` sin correspondencia en `sets[]`, algún `sourceSurface` sin correspondencia en `surfaces[]`, `policy` sin `identifier`/`digestMethod`/`digestValue`, o `files[]` con campos ausentes, malformados o rutas duplicadas.

El mensaje de error SHALL nombrar el archivo o campo afectado, el valor esperado, el valor obtenido cuando exista, y SHALL sugerir revisar `git diff`; si el cambio es legítimo, SHALL indicar que se aplica con `pnpm spec:update`, hoy disponible como comando soportado.

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

#### Scenario: Un manifiesto con campos de primer nivel inválidos hace fallar

- **WHEN** `manifest.json` carece de `schemaVersion`, `currentSet` apunta a un `id` ausente de `sets[]`, un `sourceSurface` no existe en `surfaces[]` o `policy` carece de `digestValue`
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra el campo inválido

#### Scenario: Un enlace simbólico en el árbol hace fallar la verificación

- **WHEN** existe un symlink bajo `packages/sdk/schemas/`
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra el enlace como no soportado

#### Scenario: El mensaje de error orienta la recuperación

- **WHEN** `spec:verify` falla por cualquier discrepancia
- **THEN** el mensaje incluye el nombre del archivo o campo, el valor esperado, el obtenido cuando exista, y las instrucciones de revisar `git diff` y, si el cambio es legítimo, ejecutar `pnpm spec:update`

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
