# Design: fix-aux-codes-pr53-rebase

## Context

`feat/add-aux-codes-extraction` es `cc904cb` sobre `43a4d53`, y `43a4d53` cuelga de
`4607cc7` — el commit propio de #52 **antes** de que #52 se reasara. Medido contra la
base nueva (`e579540`):

- `git merge-base origin/feat/add-codes-extraction origin/feat/add-aux-codes-extraction`
  = `139d574`, o sea que el three-dot diff del PR arranca por debajo del squash de
  #50: por eso el diff se disparó de 12 a 45 archivos y el PR pasa a
  `CONFLICTING / DIRTY`.
- Commits propios a reproducir: `43a4d53` (11 archivos) y `cc904cb` (1 archivo).
- `git diff e460822 cc904cb -- .github/workflows/spec-drift.yml` = **0 líneas**: el
  contenido de `cc904cb` ya está en la base.
- Intersección `diff(4607cc7→e579540) ∩ diff(4607cc7→43a4d53)` = `README.md` y
  `codes-extract.test.mjs`. Son **candidatos** a conflicto, no certeza (ver D4).

Restricción operativa: `feat/add-aux-codes-extraction` está checkeada en el
checkout principal, y git prohíbe checkear la misma rama en dos worktrees — no
existe la vía aislada que usaron los cambios de #51 y #52.

## Goals / Non-Goals

**Goals:**

- Que el diff de #53 muestre solo el trabajo propio de #53 (11 archivos) y que el
  PR vuelva a `MERGEABLE`.
- Que el contenido de `43a4d53` llegue íntegro, sin arrastrar nada de la cadena
  pre-squash ni perder nada por resolución de conflictos.
- Que la verificación de frescura de #52 pase sobre el árbol con extractor
  auxiliar.

**Non-Goals:**

- Cambiar el contenido de `43a4d53` (la extracción auxiliar ya está implementada y
  revisada en su propio cambio).
- Revisar, retargetear o mergear #51, #52 o `main`.
- Añadir requisitos de spec (ver `skip_specs` en la propuesta).
- Ejecutar `pnpm test:sandbox` u otra operación en vivo.

## Decisions

**D1 — Reasar en el checkout principal, con pre-flight y punto de rollback.**
Alternativas descartadas: worktree scratch (git rechaza checkear la rama dos veces)
y _temp branch + `reset --hard`_ (mueve la rama del usuario con una operación
destructiva explícita y sin la recuperación por reflog que da `git rebase`). El
checkout está limpio hoy, así que el procedimiento es: confirmar `git status
--short` vacío, registrar `cc904cb` como rollback, reasar en sitio. Ninguna otra
rama cambia.

**D2 — Upstream explícito `4607cc7`, nunca un rebase ingenuo.** Un
`git rebase` sin `--onto` usa el merge-base (`139d574`) y reviviría la cadena
pre-squash: reaplicaría los `scripts/spec-watch/*` que #50 endureció (quita el
rechazo de esquemas sin TLS y el tope de descarga por stream) y el `spec-drift.yml`
de 138 líneas. Es la misma trampa que ya derribó #51 y #52. Un `git merge`
descartado: introduce commit de merge y conserva la cadena vieja en la historia
del stack, que es lineal por convención.

**D3 — `cc904cb` se suelta cuando quede vacío.** La evidencia es el diff de 0
líneas: aplicarlo solo puede dar un commit vacío (o un conflicto). Mantenerlo como
commit vacío aporta ruido y reclama un fix que la base ya trae; reescribirlo para
que diga otra cosa sería falso. Si el rebase se detiene por el commit vacío,
`git rebase --skip` — comportamiento alineado con lo ya prometido en el comentario
de #53 («the usual rebase … will supersede this commit»).

**D4 — Resolución de conflictos: conservar los dos lados, cada uno gobernado por un
requisito existente.** El análisis de hunks dice:

| Archivo                                        | Hunks de #53                                                      | Hunks que movió la base                                     | Choque                                 |
| ---------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| `packages/sdk/schemas/README.md`               | `@@ -28,7` y `@@ -42,6` (sección `## codes.json`)                 | `d42b9a7`: `@@ -82,8` y `@@ -123,6` (nota `lastSyncedAt`)   | improbable: ~35 líneas de separación   |
| `scripts/codes-extract/codes-extract.test.mjs` | `@@ -12,7` (imports) y `@@ -363,44 +368,563` (hasta el EOF viejo) | mi test de frescura, líneas 407–449 (después del EOF viejo) | posible: el hunk llega justo al límite |

La regla es la misma en ambos: **los dos lados se quedan**. En el README, la nota
`lastSyncedAt` (la exige `spec-integrity`) y el párrafo de procedencia auxiliar (lo
exige `codes-extraction`) tienen que coexistir al final; en el test file, la suite
de frescura de #52 y los tests auxiliares de #53, sin que ninguna de las dos
desaparezca. Aunque el merge salga limpio, la verificación posterior greps ambos
marcadores: un merge limpio que se lleva por delante un lado sigue violando spec.

**D5 — La base se resuelve al ejecutar.** El valor planificado es `e579540`; el
comando usa `git rev-parse origin/feat/add-codes-extraction` en el momento de
ejecutar. Si #51 se mergea primero (con squash, como #50), #52 cambia de cabeza y
habrá que reasarse sobre esa — misma técnica, distinto valor. No se retargetea nada
desde este cambio.

**D6 — El test de frescura es la validación de contenido más fuerte del reasado.**
Las comprobaciones de forma (`git log e579540..HEAD`, `--stat`) confirman qué
commits hay, pero no que el replay reprodujera el contenido. El test de frescura
regenera `codes.json` **desde el árbol commiteado** y lo compara normalizado; si el
reasado perdiera el extractor auxiliar, un módulo `lib/aux-*.mjs` o un fragmento de
los 35 337 renglones que `43a4d53` añade al artefacto, la regeneración no coincidiría
y el test fallaría. Su helper copia el set completo (no filtra `.xsd`) — la decisión
de D3 del cambio de #52 estaba pensada justo para este punto.

## Risks / Trade-offs

- **[R1] El rebase se interrumpe en el checkout del usuario]** → árbol limpio
  verificado antes, `cc904cb` registrado como rollback, `git rebase --abort` siempre
  disponible; ninguna otra rama se mueve.
- **[R2] La resolución se lleva una de las dos caras del README]** → violaría
  `spec-integrity` o `codes-extraction` sin que el compilador se entere → grep
  post-merge obligatorio de `lastSyncedAt` y de la procedencia auxiliar, además de
  `pnpm spec:verify`.
- **[R3] `cc904cb` aplica sin quedar vacío]** → el workflow quedaría distinto de la
  base por un fix ya heredado → comprobación final
  `git diff --quiet e460822 HEAD -- .github/workflows/spec-drift.yml`.
- **[R4] El test de frescura falla sobre el árbol auxiliar]** → puede ser que el
  `codes.json` de #53 estuviera desactualizado respecto de su propio extractor. El
  remedio es el que el propio test indica (`pnpm codes:extract` y commitear); no se
  debilita el test ni se relaja la comparación para que pase.
- **[R5] `pnpm-lock.yaml` trae dependencias nuevas]** → si `pnpm install
--frozen-lockfile` rechaza el lockfile reproducido, el reasado no está completo:
  el lockfile era idéntico entre `4607cc7` y `e579540` (no aparece en la
  intersección), así que el parche debe aplicarse limpio.
- **[R6] #51 se mergea durante la ejecución]** → la cabeza de #52 se mueve → D5
  manda resolver la base de nuevo antes de empujar; el push va con
  `--force-with-lease` y dejará de pisar nada ajeno si el remoto avanzó.

## Migration Plan

1. Pre-flight: árbol limpio, rollback `cc904cb`, cabeza actual de #52 resuelta.
2. `git rebase --onto <head-#52> 4607cc7 feat/add-aux-codes-extraction`
   (`--skip` si se detiene por `cc904cb`).
3. Resolver los conflictos conservando los dos lados (D4).
4. Verificación de forma (D6) + greps de ambos marcadores + `pnpm install
--frozen-lockfile` + `pnpm verify` completo.
5. Push `--force-with-lease`; comprobar PR (`MERGEABLE`, 11 archivos, base en
   `feat/add-codes-extraction`); confirmar que `main`, #51 y #52 no se movieron;
   comentario en #53.

**Rollback:** antes del push, `git reset --hard cc904cb` (punto registrado en el
paso 1). Después del push, la rama remota se restaura desde el mismo punto con
`--force-with-lease` apuntando a `cc904cb`.

## Open Questions

Ninguna. La secuencia respecto de #51 queda resuelta en D5 (se resuelve la base al
ejecutar), y el destino de `cc904cb` en D3.
