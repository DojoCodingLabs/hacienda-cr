# Proposal: rebase-aux-codes-pr53-onto-main

## Why

El PR #53 (`feat: extract aux code catalogs to codes.json`) está
`CONFLICTING` (`mergeable=false`, `mergeStateStatus=DIRTY`) y **sin ningún check
en el rollup**, así que no se puede revisar ni mergear. La causa es de proceso,
no de contenido: #52 entró a `main` por squash (`2aa3664`, árbol **idéntico** al
del `head` pre-squash `07d5fb9` — `git diff 07d5fb9 2aa3664` = vacío), la base de
#53 se retargeteó a `main`, pero el historial de la rama sigue arrastrando los
tres commits pre-squash de #52. El `merge-base` entre #53 y `main` quedó en
`96e1836` (#51), dos generaciones por debajo de la punta `18ee989`, de modo que
el merge de tres puntos de GitHub vuelve a calcular un diff sobre una base que ya
no existe y reporta «changed in both» sobre cinco archivos añadidos por ambos
lados: es historia duplicada, no divergencia de contenido.

Es la misma trampa que ya derribaron `fix-codes-extraction-pr52` y
`retarget-aux-codes-extraction-pr53`, y el propio `tasks.md` de
`fix-aux-codes-pr53-rebase` lo había anticipado en su tarea 4.1 («si #52 se
mergea y retargetea #53, repetir el grupo 1 con la nueva cabeza»). Se repite
porque esta vez #52 llegó a `main` con **squash**, no como la rama que #53 tenía
como base.

## What Changes

- Reasar `feat/add-aux-codes-extraction` sobre `main` con upstream explícito —
  `git rebase --onto origin/main 07d5fb9 feat/add-aux-codes-extraction` —
  reproduciendo **solo** los dos commits propios de #53:
  - `cd284c9` (`feat: extract aux code catalogs to codes.json`, 11 archivos:
    los cuatro módulos `lib/aux-*.mjs`, `extract.mjs`, `render.mjs`,
    `codes-extract.test.mjs`, `codes.json`, `pnpm-lock.yaml`, `package.json` y
    el README de schemas).
  - `97b5e73` (`ci: install poppler-utils for codes.json freshness check`,
    `.github/workflows/ci.yml` +3).
- **Descartar `3dc61ef`, `08618fc` y `07d5fb9`**: los tres son #52 y su árbol
  ya está en `2aa3664` (diff vacío), así que no hay nada que reaplicar —
  reproducirlos es lo que revienta el merge de tres puntos.
- Orden de trabajo: `git worktree prune` primero, porque la registración vieja
  `/tmp/opencode/codes-rebuild` (directorio ya inexistente) sigue reteniendo la
  rama y git se niega a checkearla en otro lado; después reasar en un worktree
  scratch clonado de la punta actual, dejando el checkout principal —que está en
  `feat/add-codes-generation`— intacto.
- Verificación de forma (12 archivos, sin cadena pre-squash) y de contenido
  (`pnpm install --frozen-lockfile` + `pnpm verify` en paridad con CI, que
  regenera `codes.json` con el extractor auxiliar real).
- Empujar con `--force-with-lease` esperando `97b5e73`, confirmar que #53 vuelve
  a `MERGEABLE` y que **sí** corren los checks, dejar un comentario en #53 y
  **no mergear** hasta que estén en verde.

Fuera de alcance: la revisión diferida de los extractores
(`aux-pdf` / `aux-rar` / `aux-xlsx` / `aux-merge`) y del delta de +37 000
renglones de `codes.json`, que el propio comentario del bot difiere hasta que el
reasado aterrice — revisar sobre un árbol sucio solo puntúa basura. También
fuera de alcance: mergear #53, retargetear nada, tocar `main` ni reasar
`feat/add-codes-generation`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none) — `skip_specs: true`.

Este cambio **no altera ningún requisito**: es un reasado. El contenido que #53
aporta sobre su base se reproduce idéntico (`cd284c9` + `97b5e73`, byte a byte)
y el único contenido que desaparece (`3dc61ef`, `08618fc`, `07d5fb9`) ya está en
la base. Mergeado el stack, el árbol resultante es el mismo que el que este stack
siempre pretendió producir; lo que cambia es la base, no el comportamiento. Los
requisitos existentes que **constriñen** la verificación — `codes-extraction`
(procedencia auxiliar, regeneración y frescura de `codes.json`, dependencia de
`pdftotext`) y `spec-integrity` (integridad del manifiesto) — siguen vigentes sin
redacción nueva. Inventar un requisito aquí solo para que `validate` pase sería
precisamente lo que la guía del artefacto prohíbe; la predecesora directa de este
cambio (`fix-aux-codes-pr53-rebase`) resolvió igual.

## Impact

- **Rama/PR:** `feat/add-aux-codes-extraction` (#53), historia reescrita de 5
  commits a 2; `head` pasa de `97b5e73` a hashes nuevos sobre `18ee989`.
- **Diff del PR:** 13 archivos → 12 (`docs/npm-downloads.json` desaparece porque
  la rama hereda la actualización más reciente de `main`), +37 710 / −626.
- **CI:** #53 pasa de _sin checks_ a correr el workflow completo (`pnpm verify`
  con `xmllint` y `poppler-utils`, más el matriz de paquetes en Node 22/24).
- **Código:** sin cambios de comportamiento. Ninguna rama ajena se mueve:
  `origin/main`, `feat/add-codes-generation` y el resto del stack quedan donde
  están.
- **OpenSpec local:** sin deltas de spec; artefactos de planificación nada más.
- **Sin Changesets:** nada publicado cambia — git y CI únicamente.
