# Proposal: fix-spec-drift-workflow-rebase

## Why

El PR #51 (`ci: monthly spec-drift reporting workflow`) está `CONFLICTING`: la rama
`feat/add-spec-drift-workflow` está apilada sobre el historial pre-squash de #48/#49/#50,
y la revisión automatizada lo bloqueó hasta que #50 se mergeara (ya mergeable y en verde).
Rebasear la rama "a la usanza" la **destruye**: `git cherry` marca `f47f44d`, `a9c8949` y
`3fdeddf` como ya aplicados porque `main` contiene los merges #43/#44/#45 seguidos de sus
reverts (`86cca65 Revert "ci: add monthly spec-drift reporting workflow (#45)"`), así que un
`git rebase origin/main` descarta los tres commits y deja la rama idéntica a `main`,
perdiendo el workflow en silencio — y el único commit que hay que conservar es justamente
el que git descarta.

## What Changes

- Reconstruir `feat/add-spec-drift-workflow` apilada sobre la rama de #50
  (`feat/add-spec-watch-commands`) + cherry-pick del commit `3fdeddf` (el workflow),
  aplicando el diff real en lugar de confiar en el patch-id. Se apila porque #50 aún
  espera revisión y no se puede mergear antes de rebasear; la rama se rebasa de nuevo
  cuando eso ocurra.
- Resolver los conflictos que ese cherry-pick produce en `docs/testing.md` y
  `packages/sdk/schemas/README.md`: sus anclas de contexto cambiaron por los commits de
  endurecimiento de #50 (`3c805c9`, `6e2433b`, `5dbefbe`), de modo que se conserva el texto
  ya endurecido de #50 y encima se añade la sección del job programado.
- Truncar el cuerpo del issue **en un límite de carácter UTF-8 válido**: `head -c 61440`
  puede cortar una secuencia multibyte por la mitad y dejar el cuerpo con un byte suelto.
- Force-push con `--force-with-lease` para que el diff del PR quede reducido al workflow y
  a los docs, y CI vuelva a correr sobre el contenido correcto.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `spec-integrity`: el requisito del issue de deriva pasa a exigir que el truncado de un
  informe demasiado largo respete límites de carácter UTF-8, sin cortar secuencias
  multibyte, manteniendo la nota explícita de truncamiento y el informe completo en el log
  de la corrida.

## Impact

- **CI**: `.github/workflows/spec-drift.yml` (único archivo funcional del PR; no corre en
  este repo hasta merge — es `schedule` + `workflow_dispatch`).
- **Docs**: `docs/testing.md` (sección "Scheduled drift job (phase 1)") y
  `packages/sdk/schemas/README.md` (campos de superficie y semántica del job) — su contenido
  viaja desde `3fdeddf`, resuelto contra el texto de #50.
- **Rama / PR**: historia de `feat/add-spec-drift-workflow` reescrita; PR #51 pasa de
  `CONFLICTING` a mergeable con diff mínimo. Sin cambios en `main`, en el manifiesto, en los
  vendorizados ni en `scripts/`.
- **Fuera de alcance**: #52 y #53 siguen apilados sobre esta rama y se rebasean cuando sus
  padres estén mergeados (cada merge vuelve a mover `main`).
