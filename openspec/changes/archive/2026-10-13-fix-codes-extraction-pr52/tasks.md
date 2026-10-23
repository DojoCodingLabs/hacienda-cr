# Tasks: fix-codes-extraction-pr52

## 1. Reasar `feat/add-codes-extraction` sobre la base nueva

- [x] 1.1 `git fetch origin` y confirmar que `origin/feat/add-spec-drift-workflow` =
      `e460822` (la base nueva de #51) y que `4607cc7` es el commit propio de #52;
      registrar `4607cc7` como punto de rollback
- [x] 1.2 Reasar con upstream explícito: `git rebase --onto e460822 3fdeddf
feat/add-codes-extraction`; si se detiene, caer a rama scratch desde `e460822` +
      `git cherry-pick 4607cc7` y resolver el conflicto sobre el texto actual de
      `main`, sin arrastrar nada de la cadena pre-squash
- [x] 1.3 Verificar la forma del resultado (D6): `git log --oneline e460822..HEAD`
      muestra **exactamente un** commit y `git diff e460822 HEAD --stat` lista los 10
      archivos de `4607cc7` (`codes.json`, `scripts/codes-extract/*`, `package.json`,
      los dos `ALLOWLIST` y el README de schemas)
- [x] 1.4 Verificar el contenido negativo: el diff **no** contiene nada bajo
      `scripts/spec-watch/`, ni `.github/workflows/spec-drift.yml`, ni
      `docs/npm-downloads.json` — si aparece alguno, la cadena pre-squash siguió
      arrastrada y hay que repetir 1.2
- [x] 1.5 Verificar que el endurecimiento de #50 sigue intacto en la rama reasada
      (`https:` rechazado y tope de descarga por stream presentes en
      `scripts/spec-watch/lib/http.mjs`) y que `.github/workflows/spec-drift.yml` es
      byte-idéntico al de `e460822` (corte con `iconv`)
- [x] 1.6 `pnpm spec:verify` sobre la rama reasada: el árbol vendorizado sigue
      consistente con el manifiesto tras el reasado

## 2. Cerrar el hallazgo de frescura de `codes.json`

- [x] 2.1 Agregar en `scripts/codes-extract/codes-extract.test.mjs` un helper que
      copie el **set completo** del árbol commiteado (todos los archivos del
      directorio del set, sin filtrar `.xsd`) más `manifest.json`, a un directorio
      temporal — sin reutilizar `copySchemasFixture`, cuyo filtrado es deliberado para
      los tests de negativo
- [x] 2.2 Agregar el test de frescura: regenerar `codes.json` con `spawnExtract` sobre
      esa copia, aplicar `.prettierrc` a ambos lados —el artefacto commiteado pasa por
      prettier en el commit, la salida cruda del extractor no— y comparar el resultado
      **byte a byte** con `packages/sdk/schemas/codes.json` del repo; al fallar, el
      mensaje nombra `codes.json` y el remedio `pnpm codes:extract` (D4)
- [x] 2.3 Comprobar que el test **falla** cuando el artefacto está obsoleto: alterar
      `codes.json` en una copia temporal y verificar que el caso lo detecta, sin
      dejar rastro en el repo
- [x] 2.4 Comprobar que la verificación no escribe en el repo: tras correr el test,
      `git status --short` queda limpio y `packages/sdk/schemas/codes.json` no cambió
- [x] 2.5 Revisar `packages/sdk/schemas/README.md`: si la sección de `codes.json`
      afirma algo que el nuevo chequeo contradice, ajustarla; si no, no tocarla

## 3. Gate y publicación

- [x] 3.1 `pnpm install --frozen-lockfile && pnpm verify` sobre la rama reasada con
      el test nuevo incluido
- [x] 3.2 Correr el test de frescura aislado para dejar constancia de su salida en
      verde (`node --test scripts/codes-extract/codes-extract.test.mjs`)
- [x] 3.3 Empujar con `--force-with-lease` a `feat/add-codes-extraction`; dejar que
      el lease falle antes que pisar cualquier push posterior
- [x] 3.4 Verificar el PR #52: diff reducido a los 10 archivos de la extracción,
      base aún en `feat/add-spec-drift-workflow`, estado `MERGEABLE`
- [x] 3.5 Confirmar que `main`, #51 y #53 no se tocaron (`origin/main` sigue en el
      mismo commit, y sus ramas sin divergir)
- [x] 3.6 Dejar un comentario en #52 respondiendo a la revisión: el bloqueador de
      proceso (pila pre-squash, revertía #50, CI no corría) y el hallazgo adversarial
      (allowlist sin verificación), con lo que se hizo en cada caso

## 4. Retarget a `main` (tras el merge de #51)

> **Resuelto (2026-10-13):** #51 se mergeó (`96e1836`, squash). El aviso de
> abajo sobre el reasado sí aplicaba: `e460822` no es ancestro de `main`
> (squash), así que 4.2 requirió `git rebase --onto origin/main e460822
feat/add-codes-extraction` **antes** del retarget. El árbol de `96e1836`
> resultó idéntico al de `e460822`, por lo que el reasado fue limpio: rama =
> `origin/main` + exactamente los 2 commits de la extracción, sin cadena
> pre-squash.
>
> El retarget de base solo no emite `pull_request` (solo `base_changed`), así
> que CI no arrancó solo; se reemitió el evento con un commit vacío
> (`07d5fb9`) y los 3 jobs quedaron verdes. Rollback #52 = `e579540`.
>
> **Nota (ya atendida):** este repo hace squash merge (#50 y #51 lo fueron),
> por eso `e460822` no quedó en la historia de `main` y el reasado explícito
> sobre el squash nuevo fue necesario antes del retarget.

- [x] 4.1 Precondición: #51 ya está mergeado en `main`; si no, detenerse aquí —
      retargetear antes deja el PR `CONFLICTING` y compitiendo con #51 por los
      mismos archivos (D5)
- [x] 4.2 Retargetear #52 de `feat/add-spec-drift-workflow` a `main` con
      `gh pr edit 52 --base main`
- [x] 4.3 Dejar correr CI en el PR y verificarla verde antes de cualquier merge (no se hace merge sin revisión)
