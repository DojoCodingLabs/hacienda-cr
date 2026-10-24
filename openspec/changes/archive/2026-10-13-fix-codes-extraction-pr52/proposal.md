# Proposal: fix-codes-extraction-pr52

## Why

El PR #52 (`feat: extract Hacienda code catalogs to codes.json`) está `CONFLICTING`
con `checks: DIRTY`, y su revisión automatizada lo bloqueó. La causa de proceso es
que la rama `feat/add-codes-extraction` es `4607cc7` encima de `3fdeddf` — el estado
pre-squash de #51 — y la base (`feat/add-spec-drift-workflow`) se le movió debajo
cuando #51 se reconstruyó sobre `main` (`e460822`). Medido contra la base nueva, #52
**revierte el endurecimiento de la revisión de #50** en seis archivos de
`scripts/spec-watch/` (quita el rechazo de esquemas sin TLS y el tope de descarga por
stream) y reintroduce el `spec-drift.yml` de 138 líneas; por eso la pila no se puede
mergear ni revisar.

El segundo hallazgo es de fondo: `codes.json` está en el `ALLOWLIST` de
`scripts/spec-verify.mjs` (`["manifest.json", "README.md", "codes.json"]`) y en el de
`packages/sdk/src/__testing__/manifest.spec.ts`, así que queda **exento de toda
verificación de integridad**. El único test que lo toma (`integration: real set
produces structural codes.json idempotently`) copia a un directorio temporal **solo
los `.xsd`** y comprueba que dos corridas seguidas producen lo mismo; nunca compara
contra el artefacto commiteado. Después de un `spec:update` que cambie los XSD, el
`codes.json` del repo queda obsoleto en silencio — exactamente la deriva que esta
serie de cambios existe para detectar.

## What Changes

- Reconstruir `feat/add-codes-extraction` sobre `feat/add-spec-drift-workflow` @
  `e460822`, reproduciendo **solo** su commit propio `4607cc7` (10 archivos,
  +3666/−6). El resultado hereda el endurecimiento de #50 y el workflow corregido de
  #51, y su diff queda reducido a la extracción de códigos.
- Añadir la verificación de frescura: regenerar `codes.json` en un directorio
  temporal a partir del árbol commiteado, aplicar a ambos lados el formateo del
  repo (el artefacto commiteado pasa por `prettier` en el commit, la salida cruda
  del extractor no) y comparar **byte a byte** con
  `packages/sdk/schemas/codes.json`. Corre dentro de `test:scripts`, que `pnpm
verify` ya ejecuta, así que CI lo cubre sin infraestructura nueva.
- Afinar el requisito de la spec que difería la integración («Este comando no SHALL
  integrarse en `pnpm verify`, `spec:verify`, `spec:update` ni en el workflow de
  deriva **en este cambio**»): la exclusión se mantiene para **escrituras** y para
  `spec:update`/deriva, pero la verificación por regeneración deja de estar excluida.
- Mantener la base de #52 en `feat/add-spec-drift-workflow` y retargetearla a `main`
  **cuando #51 mergée** — recién ahí corre CI, porque `ci.yml` solo triggerea con
  `pull_request: branches: [main]`.

Fuera de alcance: mergear #51 o #52, retargetear antes de que #51 entre, y #53
(`feat/add-aux-codes-extraction`) — que sigue apilado sobre #52 y recibe el mismo
tratamiento cuando este mergée.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `codes-extraction`: el requisito «`codes.json` es un artefacto derivado commiteado
  y documentado» pasa a exigir que la verificación del repositorio detecte un
  artefacto que ya no coincide con una regeneración fresca, con dos escenarios
  (regeneración idéntica pasa; divergencia falla nombrando el archivo y el
  remediador), y la exclusión de integración se restringe a escrituras y al pipeline
  de actualización, no a la verificación.

## Impact

- **CI / git**: la rama de #52 se reconstruye y luego se retargetea; el diff del PR
  pasa de 19 archivos (incluidos 6 de `spec-watch` que revertían endurecimiento) a
  los 10 de la extracción.
- **Tests**: un caso nuevo en `scripts/codes-extract/codes-extract.test.mjs`, dentro
  de `pnpm verify` vía `test:scripts`; sin red y sin tocar el árbol commiteado
  (regenera en un temp).
- **Sin cambio de comportamiento publicado**: el SDK aún no consume `codes.json`, y
  los paquetes no cambian de versión → sin Changeset.
- **OpenSpec local**: un solo requisito de `codes-extraction` se aclara; no se
  agregan requisitos nuevos de runtime.
