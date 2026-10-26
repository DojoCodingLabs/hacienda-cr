## MODIFIED Requirements

### Requirement: El manifiesto registra el digest de la política de firma

`manifest.json` SHALL incluir un bloque con los datos de la política de firma de la v4.4 (5.2/5.7): URL identificadora publicada en el Anexo 2, algoritmo (`http://www.w3.org/2001/04/xmlenc#sha256`), codificación (Base64), valor del digest (`DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=`), la cita del documento donde aparece (Anexo 2 del `ANEXOS Y ESTRUCTURAS_V4.4.pdf`) y el estado de migración del SDK (`sdkStatus`). El bloque describe lo que la especificación exige; mientras el SDK declare una política distinta, `sdkStatus` SHALL indicar que la migración está pendiente y el README SHALL explicar la discrepancia. `sdkStatus` SHALL estar presente y usar uno de los valores conocidos (`pending-sdk-migration`, `aligned`); un valor nuevo solo existe si el README y el gate se actualizan con él en el mismo commit. El valor Base64 del manifiesto y el SHA-256 hex del archivo de la política SHALL corresponder al mismo contenido, y **`pnpm spec:verify` SHALL hacer cumplir esa correspondencia en cada corrida** — recomputando el SHA-256 en Base64 sobre los bytes vendorizados del PDF de la política y contrastándolo con `policy.digestValue` mediante comparación exacta de strings, en la forma Base64 estándar con padding `=` que imprime el Anexo 2, sin normalización — en lugar de depender únicamente de la constatación puntual del acto de vendorizar.

#### Scenario: los datos de política citan su fuente

- **WHEN** se lee el bloque de política en `manifest.json`
- **THEN** incluye identificador, algoritmo, valor, cita del Anexo 2 y `sdkStatus`, y el valor coincide con el hash del PDF vendorizado

#### Scenario: el manifiesto no se confunde con el SDK

- **WHEN** se compara el bloque `policy` con las constantes actuales del SDK
- **THEN** `sdkStatus` marca la migración como pendiente y el README explica que el SDK aún declara otra política (corrección = fase 3)

#### Scenario: el gate hace cumplir la correspondencia, no solo la declara

- **WHEN** se edita `manifest.policy.digestValue` a cualquier otro string no vacío sin alterar el PDF de la política vendorizado
- **THEN** `pnpm spec:verify` termina con código de salida distinto de cero nombrando el campo, el valor esperado (recomputado desde el PDF) y el valor declarado en el manifiesto

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
