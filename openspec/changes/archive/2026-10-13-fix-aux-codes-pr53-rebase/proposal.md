# Proposal: fix-aux-codes-pr53-rebase

## Why

El PR #53 (`feat: extract aux code catalogs to codes.json`) pasó de `MERGEABLE` a
`CONFLICTING / DIRTY` y su diff se disparó de 12 a **45 archivos** por una causa de
proceso, no de contenido: su `head` `cc904cb` sigue colgando del histórico viejo de
#52 (`4607cc7`), que se reescribió al reconstruir #52 sobre `e460822`. El
`merge-base` entre #53 y su base nueva es `139d574` (`docs: update npm lifetime
downloads`), varias generaciones por debajo, así que el three-dot diff del PR
empieza a contar desde antes del squash de #50: incluye los seis archivos
`scripts/spec-watch/*` que #50 endureció, el `spec-drift.yml` de 138 líneas y
`docs/npm-downloads.json`, mezclados con el trabajo propio de #53. Ni se puede
revisar ni se puede mergear.

## What Changes

- Reasar `feat/add-aux-codes-extraction` sobre la cabeza actual de #52 con upstream
  explícito — `git rebase --onto <head-de-#52> 4607cc7 feat/add-aux-codes-extraction`
  — reproduciendo **solo** `43a4d53` (`feat: extract aux code catalogs to codes.json`,
  11 archivos: los cuatro módulos `lib/aux-*.mjs`, `extract.mjs`, `render.mjs`,
  `codes-extract.test.mjs`, `codes.json`, `pnpm-lock.yaml`, `package.json` y el
  README de schemas). La cabeza de destino se resuelve al ejecutar; `e579540` es el
  valor verificado al planificar.
- **Descartar `cc904cb`** (`fix(ci): truncate the drift issue body at a UTF-8
boundary`): `git diff e460822 cc904cb -- .github/workflows/spec-drift.yml` da
  **0 líneas**, o sea que la base nueva ya trae ese contenido vía `e460822`. El
  cherry-pick resulta un commit vacío y se suelta. El fix queda **heredado, no
  duplicado** — exactamente lo que el comentario en #53 anunció («the usual rebase
  … will supersede this commit»).
- Resolver los **dos únicos conflictos previstos** conservando los dos lados, cada
  uno gobernado por un requisito existente que este cambio no modifica:
  - `packages/sdk/schemas/README.md` — la nota `lastSyncedAt` de `spec-integrity`
    (añadida por `e460822`) y el párrafo de procedencia auxiliar de #53.
  - `scripts/codes-extract/codes-extract.test.mjs` — el test de frescura que #52
    añadió al final del archivo y los tests auxiliares de #53.
- Comprobar que el test de frescura de #52 **pasa sobre el árbol con extractor
  auxiliar**: su helper copia el set completo (no filtra `.xsd`), decisión que
  estaba pensada precisamente para el punto en que las fuentes auxiliares entren.
- Empujar con `--force-with-lease`, verificar que el PR vuelve a `MERGEABLE` y que
  su diff baja de 45 a 11 archivos, y dejar un comentario en #53 explicando el
  descarte de `cc904cb` y el resultado del reasado.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none) — `skip_specs: true`.

Este cambio **no altera ningún requisito**: es un reasado. El contenido que #53
aporta sobre su base se reproduce idéntico (`43a4d53` byte a byte), y el único
contenido que desaparece (`cc904cb`) ya está en la base. Mergeado el stack en
orden, el árbol resultante es el mismo que el que este stack siempre pretendió
producir; lo que cambia es la base, no el comportamiento. Los requisitos
existentes que **constriñen** la resolución de conflictos — `spec-integrity`
(semántica de `lastSyncedAt` en el README) y `codes-extraction` (procedencia
auxiliar, regeneración y verificación de frescura de `codes.json`) — siguen
vigentes sin redacción nueva; inventar un requisito aquí solo para que
`validate` pase sería precisamente lo que la guía del artefacto prohíbe.

## Impact

- **Rama/PR:** `feat/add-aux-codes-extraction` (#53), historia reescrita de 2
  commits a 1; `head` pasa de `cc904cb` al commit reproducido.
- **Diff del PR:** 45 archivos → 11. Los 6 `scripts/spec-watch/*`, el
  `spec-drift.yml` y `docs/npm-downloads.json` dejan de aparecer.
- **Código:** sin cambios de comportamiento. El único delta real sobre el árbol
  actual es perder el workflow, que la base ya contiene.
- **Fuera de alcance:** `main`, #51 y #52 no se tocan; #52 ya está en
  `e579540 / MERGEABLE` y se deja como está.
- **Dependencia de secuencia:** si #51 se mergea (con squash, como #50) antes de
  ejecutar, #52 se retargetea y su cabeza cambia → resolver la base al ejecutar y
  reasarse sobre esa, no sobre el valor planificado.
- **Sin Changesets:** nada publicado cambia (D7 del cambio hermano: CI y docs
  únicamente).
