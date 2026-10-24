# Proposal: fix-spec-watch-review-findings

## Why

La revisión automatizada del PR #50 (`feat/add-spec-watch-commands`) encontró cuatro
debilidades reales en `scripts/spec-watch/`, verificadas una a una contra el código:

- **Path traversal en los writes de `spec:update`**: `basenameOf()` decodifica el último
  segmento de los `href` scrapeados de ATV con `decodeURIComponent`, y
  `update-core.mjs` escribe con `join(schemasDir, set/basename)` sin validar. Un enlace
  `..%2F..%2F..%2Fevil.xsd` en una superficie allowlist escapa de
  `packages/sdk/schemas/`. El guard ya existe en `probe.mjs:5` para los `knownFiles` del
  manifiesto, pero no se aplica a los nombres scrapeados ni al path final del write.
- **Caída `https → http` en redirecciones**: `http.mjs:29` solo valida `hosts.has(host)`.
- **`maxBytes` aplicado después de bufferizar**: `http.mjs:55` hace `arrayBuffer()` entero
  y recién en la línea 56 mide el tamaño.
- **Semántica de fallo del gate sin documentar**: `update-core.mjs:171-196` escribe
  vendorizados y manifiesto antes de correr `spec:verify`, sin rollback; `docs/testing.md`
  documenta "never commits or stages" pero no el estado intermedio.

Además, la rama del PR está apilada sobre los commits pre-squash de #48/#49 y quedó
`CONFLICTING` tras el merge de esos PRs a `main`: el PR necesita rebase para que CI
vuelva a correr.

## What Changes

- `spec:update` rechaza cualquier nombre o ruta de escritura que, tras decodificar,
  contenga `/`, `\` o `..`, y además verifica que la ruta resuelta final quede **dentro**
  de `packages/sdk/schemas/` antes de escribir (dos capas: validación del nombre +
  contención de la ruta resuelta).
- Las descargas rechazan redirecciones que bajen de `https` a `http` (o que apunten a
  cualquier protocolo distinto de `https:`), manteniendo la allowlist de hosts del
  manifiesto.
- El límite `maxBytes` se aplica **antes** de bufferizar el cuerpo: chequeo de
  `Content-Length` cuando existe y, en paralelo, lectura en stream con corte duro en el
  máximo (un `Content-Length` spoofeable no es suficiente).
- `docs/testing.md` y el README de `packages/sdk/schemas/` declaran que el gate
  `spec:verify` corre **después** de escribir, que un fallo del gate deja el diff en disco
  para revisión humana (sin rollback automático) y cómo revertirlo a mano (`git checkout --
packages/sdk/schemas/`).
- Rebase de la rama `feat/add-spec-watch-commands` sobre `main` (proceso, sin cambio de
  comportamiento).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `spec-integrity`: endurece los requisitos de descarga y escritura de `spec:check` /
  `spec:update` — nombres de archivo seguros, contención de rutas de escritura bajo
  `packages/sdk/schemas/`, redirecciones sin downgrade de protocolo, y límite de tamaño
  aplicado antes de bufferizar. Añade el escenario de fallo del gate `spec:verify` sin
  rollback, ya previsto por el requisito existente ("deja el árbol consistente con el
  manifiesto que escribió") pero nunca descrito.

## Impact

- **Código**: `scripts/spec-watch/lib/util.mjs` (`basenameOf`), `update-core.mjs`
  (validación de escritura), `http.mjs` (redirecciones y `maxBytes`). Nueva prueba
  regresiva en `scripts/spec-watch/spec-watch.test.mjs`.
- **Docs**: `docs/testing.md` (sección "Spec watching commands"),
  `packages/sdk/schemas/README.md`.
- **Proceso**: rama `feat/add-spec-watch-commands` (PR #50) — rebase sobre `main`; los
  archivos sobrepuestos con #48/#49 se cancelan.
- **Sin cambios**: formato del informe de `spec:check`, códigos de salida 0/1/2, el
  workflow de drift, `spec:verify`, el manifiesto y los vendorizados.
- **Dependencias**: ninguna nueva; sigue siendo Node 22+ y `node:fs`/`node:path`.
