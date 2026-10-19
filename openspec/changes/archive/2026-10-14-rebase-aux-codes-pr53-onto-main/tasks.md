# Tasks: rebase-aux-codes-pr53-onto-main

## 1. Pre-flight

- [x] 1.1 `git fetch origin` y resolver los refs al ejecutar (D7): confirmar que
      `origin/main` sigue en `18ee989` (padre `2aa3664`, el squash de #52) y que
      `origin/feat/add-aux-codes-extraction` = `97b5e73`. Registrar `97b5e73`
      como punto de rollback. Exigir `git status --short` vacío y que el checkout
      principal siga en `feat/add-codes-generation` antes de tocar nada
- [x] 1.2 Confirmar la evidencia de D3: `git diff --stat 07d5fb9 2aa3664` sale
      **vacío** — el árbol de #52 pre-squash y el del squash son el mismo, así
      que los tres commits que la rama arrastra no aportan nada (si no sale
      vacío, detenerse a reportar: el análisis de la propuesta deja de valer)
- [x] 1.3 Confirmar el conflicto de historia de partida: `git merge-base
    origin/main origin/feat/add-aux-codes-extraction` = `96e1836` y
      `git rev-list --left-right --count origin/main…origin/feat/add-aux-codes-extraction`
      = `0` / `5`, coherentes con el `CONFLICTING` de #53
- [x] 1.4 Liberar la rama: `git worktree list` muestra la registración vieja
      `/tmp/opencode/codes-rebuild` (directorio inexistente) reteniendo
      `feat/add-aux-codes-extraction` → ejecutar `git worktree prune` y volver a
      comprobar con `git worktree list` que la rama ya no aparece en ningún
      worktree. Si sigue retenida, detenerse y reportar (R2) en lugar de forzar

## 2. Aislar y reasar (D1, D2)

- [x] 2.1 Crear el worktree scratch sobre la rama:
      `git worktree add /tmp/opencode/pr53-rebase feat/add-aux-codes-extraction`
      y confirmar dentro con `git log --oneline -1` que es `97b5e73`
- [x] 2.2 Reasar con upstream explícito desde el scratch:
      `git rebase --onto origin/main 07d5fb9`. Esperado: aplica
      `cd284c9` y `97b5e73` **sin un solo conflicto**. Ante cualquier parada
      distinta de un rebase limpio: `git rebase --abort` y reportar, sin
      improvisar resoluciones (R1)
- [x] 2.3 Confirmar que ni el checkout principal ni otra rama se movieron:
      `git -C <checkout-principal> status --short` limpio y su HEAD sigue en
      `bfdd48f` (`feat/add-codes-generation`); `git worktree list` no cambió
      salvo por el scratch recién creado

## 3. Verificación de forma (D3)

- [x] 3.1 `git log --oneline origin/main..HEAD` muestra **exactamente dos**
      commits, en este orden: `ci: install poppler-utils for codes.json
    freshness check` y `feat: extract aux code catalogs to codes.json`
- [x] 3.2 Verificar contenido negativo: ninguno de los tres descartados
      (`3dc61ef`, `08618fc`, `07d5fb9`) aparece en `origin/main..HEAD`
- [x] 3.3 `git diff --name-only origin/main HEAD` lista **exactamente 12
      archivos** y `git diff --shortstat origin/main HEAD` da
      `12 files changed, 37710 insertions(+), 626 deletions(-)`:
      `.github/workflows/ci.yml`, `package.json`,
      `packages/sdk/schemas/README.md`, `packages/sdk/schemas/codes.json`,
      `pnpm-lock.yaml`, `scripts/codes-extract/codes-extract.test.mjs`,
      `scripts/codes-extract/extract.mjs` y los cinco
      `scripts/codes-extract/lib/{aux-merge,aux-pdf,aux-rar,aux-xlsx,render}.mjs`
- [x] 3.4 El diff **no** contiene `docs/npm-downloads.json` (verificado además
      con `git diff --quiet origin/main HEAD -- docs/npm-downloads.json`), ni
      nada bajo `scripts/spec-watch/`, ni `.github/workflows/spec-drift.yml`:
      si aparece alguno, la cadena pre-squash sigue arrastrada y hay que volver
      a 2.2

## 4. Verificación de contenido (D4)

- [x] 4.1 `pnpm install --frozen-lockfile` dentro del scratch → exit 0 sobre el
      lockfile reproducido; si el lockfile se regenera con diferencias, detenerse
      y revisar (R5)
- [x] 4.2 Registrar el `sha256` de `packages/sdk/schemas/codes.json`, correr
      `pnpm verify` completo en verde (formato, lint, tipos, build, tests de
      scripts y de paquetes, checks de paquetes instalados, incluida la prueba de
      frescura que regenera `codes.json` desde el set completo con `pdftotext`)
      y confirmar después que el hash no cambió y que `git status --short` sigue
      limpio: la verificación no escribió en el repo
- [x] 4.3 Si la frescura **falla**, no tocar nada más: siendo un replay byte a
      byte, una falla significa que el árbol no se reprodujo → volver a 2.2. Solo
      si el fallo es deriva real del artefacto aplicar el remedio del propio
      test (`pnpm codes:extract` y commitear); nunca debilitar el test ni relajar
      la comparación (R4)

## 5. Publicación (D5)

- [x] 5.1 Pushear con lease esperando el valor registrado en 1.1:
      `git push --force-with-lease origin HEAD:feat/add-aux-codes-extraction`
      con el lease apuntando a `97b5e73`. Si el lease falla, alguien avanzó la
      rama remota → detenerse y reportar, nunca `--force` a secas (R3)
- [x] 5.2 Retirar el scratch: `git worktree remove /tmp/opencode/pr53-rebase` y
      comprobar con `git worktree list` que el conjunto vuelve al de partida
      (sin `/tmp/opencode/pr53-rebase` y sin la registración podada de 1.4)

## 6. Gate: PR en verde, sin mergear (D6)

- [x] 6.1 `gh pr view 53 --json mergeable,mergeStateStatus,statusCheckRollup` →
      `mergeable = MERGEABLE` y `mergeStateStatus` limpio (no `DIRTY`); el diff
      de la PR baja de 13 a **12 archivos** y su `head` es el commit local nuevo
- [x] 6.2 Esperar a que aparezcan los checks (`synchronize` se dispara solo con
      el force-push) y confirmar el rollup **en verde**; re-consultar hasta que
      GitHub termine de calcular. **No** añadir ningún commit de «trigger» si no
      aparecen: reportar en su lugar (R6)
- [x] 6.6 Reparar el hueco real de CI descubierto en 6.2: los dos jobs del
      matriz `packages` corrían `pnpm test:scripts` (que incluye la prueba de
      frescura que spawnea `pdftotext` sobre los PDF auxiliares) sin instalar
      `poppler-utils` — el paso añadido por esta rama solo cubría el job `ci`.
      Ambos fallaron con `spawnSync pdftotext ENOENT` (el job `ci` en verde).
      Añadido `apt-get install poppler-utils` al job `packages` en un commit
      aparte (`0d4ed44`), aprobado por el usuario; no es un commit de trigger,
      es la dependencia de entorno que la spec manda declarar
- [x] 6.3 Confirmar que nada más se movió: `origin/main` sigue en la punta
      resuelta en 1.1 y el resto de ramas del stack (`feat/add-codes-generation`,
      `feat/add-codes-extraction`, `feat/add-spec-drift-workflow`) con sus SHAs
      originales
- [x] 6.4 Dejar un comentario en #53: el reasado usó upstream explícito
      `07d5fb9` para no revivir la cadena pre-squash de #52, qué tres commits se
      descartaron y por qué (árbol idéntico al squash), que el diff quedó en 12
      archivos sin cambios de contenido, y que la verificación local pasó antes
      de esperar CI
- [x] 6.5 **No mergear.** Dejar #53 esperando revisión/review del bot con CI en
      verde; la revisión de los extractores (`aux-*`) y del delta de `codes.json`
      queda diferida a un cambio aparte

## 7. Rollback y post-condición

- [x] 7.1 Rollback antes del push: `git rebase --abort` en el scratch (o
      `git reset --hard 97b5e73`) y `git worktree remove --force` — la rama
      local no se movió en ningún momento. Rollback después del push:
      `git push --force-with-lease origin 97b5e73:feat/add-aux-codes-extraction`
      apuntando el lease a `97b5e73`
- [x] 7.2 Post-condición: si durante la ejecución `origin/main` avanzó (D7),
      repetir 2.2 con la nueva punta usando el **mismo** upstream `07d5fb9` y
      re-ejecutar los grupos 3, 4 y 6 antes de dar el cambio por terminado. Si no
      se movió, detenerse aquí
