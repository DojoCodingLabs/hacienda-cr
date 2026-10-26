# spec-integrity Delta (add-codes-extraction)

## MODIFIED Requirements

### Requirement: La verificación offline del árbol vendorizado (`spec:verify`) falla ante discrepancias con el manifiesto

El repositorio SHALL disponer de un comando `pnpm spec:verify` que, sin acceso a red y sin escribir en disco, compare cada archivo declarado con `vendored: true` en `packages/sdk/schemas/manifest.json` contra el árbol real de `packages/sdk/schemas/`, y falle con código de salida distinto de cero si:

- el SHA-256 o el tamaño de un archivo vendorizado no coincide con el declarado;
- un archivo declarado con `vendored: true` no existe;
- existe un archivo bajo `packages/sdk/schemas/` que el manifiesto no declara, salvo `manifest.json`, `README.md` y `codes.json` en la raíz de esa carpeta;
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

#### Scenario: `codes.json` en la raíz no hace fallar la verificación

- **WHEN** existe `packages/sdk/schemas/codes.json` (artefacto derivado generado por `pnpm codes:extract`) y el resto del árbol coincide con el manifiesto
- **THEN** `pnpm spec:verify` termina con código de salida 0

#### Scenario: Un manifiesto con campos de primer nivel inválidos hace fallar

- **WHEN** `manifest.json` carece de `schemaVersion`, `currentSet` apunta a un `id` ausente de `sets[]`, un `sourceSurface` no existe en `surfaces[]` o `policy` carece de `digestValue`
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra el campo inválido

#### Scenario: Un enlace simbólico en el árbol hace fallar la verificación

- **WHEN** existe un symlink bajo `packages/sdk/schemas/`
- **THEN** `pnpm spec:verify` sale con código distinto de cero y el mensaje nombra el enlace como no soportado

#### Scenario: El mensaje de error orienta la recuperación

- **WHEN** `spec:verify` falla por cualquier discrepancia
- **THEN** el mensaje incluye el nombre del archivo o campo, el valor esperado, el obtenido cuando exista, y las instrucciones de revisar `git diff` y, si el cambio es legítimo, ejecutar `pnpm spec:update`
