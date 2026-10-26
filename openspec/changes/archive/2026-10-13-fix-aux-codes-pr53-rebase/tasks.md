# Tasks: fix-aux-codes-pr53-rebase

## 1. Reasar `feat/add-aux-codes-extraction` sobre la base nueva

- [x] 1.1 `git fetch origin` y resolver la base al ejecutar:
      `BASE=$(git rev-parse origin/feat/add-codes-extraction)` (valor planificado
      `e579540`; si #51 ya se mergeó, la cabeza pudo moverse — D5); confirmar que
      `origin/feat/add-aux-codes-extraction` = `cc904cb` y que `43a4d53` es el
      commit propio a reproducir; registrar `cc904cb` como punto de rollback;
      exigir `git status --short` vacío antes de tocar nada (D1)
- [x] 1.2 Reasar con upstream explícito: `git rebase --onto $BASE 4607cc7
feat/add-aux-codes-extraction`. Si se detiene porque `cc904cb` quedó vacío,
      `git rebase --skip` (D3). Si un conflicto no se resuelve con claridad,
      `git rebase --abort` y detenerse a reportar en lugar de adivinar
- [x] 1.3 Resolver los conflictos **conservando los dos lados** (D4):
      `packages/sdk/schemas/README.md` (nota `lastSyncedAt` + párrafo de
      procedencia auxiliar) y `scripts/codes-extract/codes-extract.test.mjs` (suite
      de frescura de #52 + tests auxiliares de #53)
- [x] 1.4 Verificar la forma: `git log --oneline $BASE..HEAD` muestra
      **exactamente un** commit (el reproducido de `43a4d53`) y
      `git diff $BASE HEAD --stat` lista **11 archivos** (`package.json`,
      `packages/sdk/schemas/README.md`, `packages/sdk/schemas/codes.json`,
      `pnpm-lock.yaml`, `scripts/codes-extract/codes-extract.test.mjs`,
      `scripts/codes-extract/extract.mjs`, los cuatro `lib/aux-*.mjs` y
      `lib/render.mjs`)
- [x] 1.5 Verificar el contenido negativo: el diff **no** contiene nada bajo
      `scripts/spec-watch/`, ni `docs/npm-downloads.json`, ni
      `.github/workflows/spec-drift.yml`; y
      `git diff --quiet e460822 HEAD -- .github/workflows/spec-drift.yml` confirma
      que el workflow quedó byte-idéntico a la base (R3)
- [x] 1.6 Verificar que **ninguno de los dos lados** se perdió en la resolución
      (R2): el README contiene a la vez la nota `lastSyncedAt` con su semántica y el
      párrafo que dice que `codes.json` se extrae de los XSD **y de las fuentes
      auxiliares vendorizadas**; el test file contiene a la vez
      `freshness: committed codes.json` y los tests auxiliares (`CodificacionUbicacion/Barrio`)

## 2. Verificación de contenido

- [x] 2.1 `pnpm install --frozen-lockfile` sobre el lockfile reproducido — si
      rechaza, el reasado no está completo (R5)
- [x] 2.2 Correr el test de frescura aislado
      (`node --test --test-name-pattern="freshness" scripts/codes-extract/codes-extract.test.mjs`)
      y dejar constancia de su salida en verde sobre el árbol con extractor auxiliar
      (D6)
- [x] 2.3 _(no aplicó: el test pasó a la primera, sin regenerar nada)_ — Si el test de frescura **falla**, investigar antes de tocar nada: si la
      regeneración demuestra que el `codes.json` commiteado estaba desactualizado
      respecto de su extractor, aplicar el remedio que indica el propio test
      (`pnpm codes:extract` y commitear el resultado). No debilitar el test ni
      relajar la comparación para que pase (R4)
- [x] 2.4 `pnpm verify` completo en verde (formato, lint, tipos, build, tests de
      scripts y de paquetes, checks de paquetes instalados) — exit 0 en un
      worktree de paridad CI sobre `e6aa2aa` (`/tmp/opencode/aux-rebuild`, sin
      `openspec/` porque está gitignorado). En el checkout principal, ademas de
      los mismos pasos en verde, el `prettier --check` sobre ficheros trackeados
      pasa; solo fallan 3 ficheros archivados pre-existentes de
      `openspec/changes/archive/2026-10-12-*`, ajenos a este cambio y no tocados
      (AGENTS.md: no formatear trabajo ajeno)
- [x] 2.5 Confirmar que la verificación no escribió en el repo: `git status
--short` limpio y `packages/sdk/schemas/codes.json` con el mismo `sha256`
      antes y después de las corridas

## 3. Gate y publicación

- [x] 3.1 Empujar con `--force-with-lease` a `feat/add-aux-codes-extraction`, con
      el lease esperando `cc904cb`; dejar que el lease falle antes que pisar
      cualquier push posterior
- [x] 3.2 Verificar el PR #53: `mergeable = MERGEABLE`, diff de **11 archivos**
      (bajando de los 45 actuales), base aún `feat/add-codes-extraction`, head igual
      al commit local
- [x] 3.3 Confirmar que `main`, #51 y #52 no se tocaron: `origin/main` sigue en su
      commit, `origin/feat/add-spec-drift-workflow` en `e460822` y
      `origin/feat/add-codes-extraction` en la cabeza resuelta en 1.1
- [x] 3.4 Dejar un comentario en #53: el reasado se hizo con upstream explícito
      `4607cc7` para no revivir la cadena pre-squash, por qué `cc904cb` se descarta
      (su contenido ya está en la base, como anunció el comentario anterior), la
      bajada de 45 a 11 archivos, y que la verificación de frescura pasa sobre el
      árbol auxiliar

## 4. Post-condición: si la base de #53 vuelve a moverse (tras el merge de #51)

- [x] 4.1 _(evaluada: la base NO se movió, sigue en `e579540` — detenerse aquí, no hay nada que rehacer; volver a evaluar si #51 se mergea y retargetea #52)_ Precondición: comprobar si `origin/feat/add-codes-extraction` sigue en la
      cabeza resuelta en 1.1. Si no se movió, detenerse aquí — no hay nada que
      rehacer (D5). Si se movió (retarget de #52 a `main`, con squash como #50),
      repetir el grupo 1 con la nueva cabeza: `git rebase --onto <nueva-base> <la
anterior-base> feat/add-aux-codes-extraction`
- [x] 4.2 _(no aplicó: no hubo repetición)_ Si hubo repetición, re-ejecutar el grupo 2 (instalación, frescura,
      `pnpm verify`) y el 3.2 (PR `MERGEABLE`) antes de considerar terminado el
      cambio
