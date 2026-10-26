## ADDED Requirements

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

## MODIFIED Requirements

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
