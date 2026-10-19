# Design: rebase-aux-codes-pr53-onto-main

## Context

Ver `proposal.md` — Why para la motivación. Aquí solo el estado y las
restricciones que condicionan el cómo.

**Refs planificados** (resolver al ejecutar, ver D7):

| Ref                                    | Valor      | Nota                                   |
| -------------------------------------- | ---------- | -------------------------------------- |
| `origin/main`                          | `18ee989`  | hijo de `2aa3664` = squash de #52      |
| `origin/feat/add-aux-codes-extraction` | `97b5e73`  | `head` de la PR #53, punto de rollback |
| `2aa3664`                              | squash #52 | `git diff 07d5fb9 2aa3664` → **vacío** |

**Historia de la rama:** `96e1836` (#51) ← `3dc61ef` ← `08618fc` ← `07d5fb9` ←
`cd284c9` ← `97b5e73`. `git rev-list --left-right --count origin/main…rama` =
`0` atrás / `5` adelante, y `merge-base` = `96e1836`.

**El conflicto es de historia, no de contenido.**
`git merge-tree --write-tree --name-only origin/main
origin/feat/add-aux-codes-extraction` devuelve cinco entradas:

- `packages/sdk/schemas/README.md` (contenido)
- `packages/sdk/schemas/codes.json`, `scripts/codes-extract/codes-extract.test.mjs`,
  `scripts/codes-extract/extract.mjs`, `scripts/codes-extract/lib/render.mjs` (agregar/agregar)

Los cuatro «agregar/agregar» son el mismo archivo añadido por #52 (via squash) y
por la rama (via sus copias pre-squash): el tres-puntos no puede saber que son
la misma cosa. El hecho que lo demuestra es que `07d5fb9` y `2aa3664` tienen el
**mismo árbol**.

**Commits propios a reproducir:** `cd284c9` (11 archivos, +37 707/−626) y
`97b5e73` (`.github/workflows/ci.yml`, +3).

**Verificación hecha al planificar** (worktree scratch desechable, sin tocar el
repo): `git rebase --onto origin/main 07d5fb9` aplicó los dos commits **sin un
solo conflicto**; el resultado es `main` + 2 commits, `git diff --name-only
origin/main HEAD` = **12 archivos** (+37 710/−626) y `docs/npm-downloads.json`
queda idéntico a `main`. La técnica está probada; el plan no depende de
adivinar conflictos.

**Restricciones operativas:**

- `git worktree list` muestra la registración vieja `/tmp/opencode/codes-rebuild`
  — directorio ya inexistente (`prunable`) — **reteniendo**
  `feat/add-aux-codes-extraction`. Mientras exista, git se niega a checkear la
  rama en cualquier otro lado. Hay que podarla.
- El checkout principal está en `feat/add-codes-generation` (árbol limpio, 6
  commits sobre `main`, cambio `add-codes-generation` completado). No se mueve.
- Entorno: Node v24.19.0 (CI usa `.nvmrc` = 22), pnpm 9.15.4, `xmllint` y
  `pdftotext` presentes.

## Goals / Non-Goals

**Goals:**

- #53 pase de `CONFLICTING / DIRTY / sin checks` a `MERGEABLE` con el workflow
  completo corriendo y en verde.
- Que el diff de la PR muestre **solo** el trabajo propio de #53 (12 archivos),
  sin un solo rastro de la cadena pre-squash ni de `docs/npm-downloads.json`.
- Que el contenido de `cd284c9` + `97b5e73` llegue byte a byte.
- Que ni el checkout principal ni ninguna otra rama se muevan.

**Non-Goals:**

- Revisar los extractores (`aux-pdf` / `aux-rar` / `aux-xlsx` / `aux-merge`) ni
  el delta de +37 000 renglones de `codes.json` — diferido hasta que #53 esté en
  verde (decisión del usuario, coherente con el comentario del bot).
- Mergear #53, retargetear cualquier PR o tocar `main`.
- Cambiar el contenido de `cd284c9` o la semántica del extractor.
- Añadir requisitos de spec (`skip_specs`), Changesets ni operaciones en vivo
  (`pnpm test:sandbox`).

## Decisions

**D1 — Reasar en un worktree scratch tras `git worktree prune`, no en el
checkout principal.**
El predecesor directo (`fix-aux-codes-pr53-rebase`, D1) descartó el worktree
scratch porque la rama estaba checkeada en el checkout principal y git prohíbe
checkearla dos veces. **Esa precondición ya no se cumple:** hoy la rama está
retenida por una registración muerta en `/tmp/opencode/codes-rebuild`, cuyo
directorio no existe. Podarla libera la rama y devuelve la vía aislada que
usaron los cambios de #51 y #52.
Alternativas descartadas: (a) checkear la rama en el checkout principal —
mueve el HEAD del usuario y obliga a restaurar `feat/add-codes-generation`
después, con el riesgo de dejarlo en otra rama si algo se corta; (b) `reset
--hard` sobre la rama en sitio — operación destructiva explícita y sin el
reflog que da `git rebase`.

**D2 — Upstream explícito `07d5fb9`, nunca un rebase ingenuo.**
`git rebase --onto origin/main 07d5fb9` replaya exactamente
`07d5fb9..97b5e73` = los dos commits propios. El argumento de upstream importa:
un `git rebase` sin `--onto` usaría el merge-base `96e1836` y reaplicaría los
tres commits de #52 sobre un `main` que ya los contiene — reaplicar `3dc61ef`
es intentar _crear_ `codes.json` donde ya existe, que es exactamente el
«agregar/agregar» que GitHub reporta. Tampoco sirve `origin/main` como upstream:
`18ee989..97b5e73` incluye los cinco commits porque `18ee989` no es ancestro de
la rama.
`git merge origin/main` descartado: introduce un commit de merge y conserva la
cadena huérfana en la historia, que el stack mantiene lineal por convención (lo
mismo se decidió en #51, #52 y en el reasado anterior de #53). Cherry-pick
manual sobre una rama nueva produce el mismo árbol pero a mano, sin el reflog ni
la continuidad de rama que da `rebase`.

**D3 — Los tres commits se descartan por evidencia de árbol, no por mensaje.**
`git diff 07d5fb9 2aa3664` vacío es la prueba de que `3dc61ef`, `08618fc` y
`07d5fb9` no aportan nada que `main` no tenga. No hay nada que `--skip`: con el
upstream de D2 ni siquiera entran en el rango. La verificación de forma posterior
(`git log --oneline origin/main..HEAD` = exactamente dos líneas) es lo que
confirma que se cayeron los tres correctos y no uno propio.

**D4 — Verificación de contenido en el mismo worktree, en paridad con CI.**
Las comprobaciones de forma (commits, `--name-only`) confirman _qué_ se replayó,
no que el árbol sea el correcto. El contenido se valida con
`pnpm install --frozen-lockfile` (el lockfile de `cd284c9` añade
`exceljs`/`node-unrar-js`) y `pnpm verify` completo, que incluye la prueba de
frescura de `codes.json`: regenera el artefacto **desde el set completo del
árbol** (XSD y auxiliares vendorizados, vía `copyRealSet`) con `pdftotext` y lo
compara normalizado, en una carpeta temp de solo lectura. Si el replay hubiera
perdido un `lib/aux-*.mjs` o un fragmento de las 35 337 líneas auxiliares, la
regeneración no coincidiría. `xmllint` y `pdftotext` ya están en el entorno, y
`ci.yml` — que se reprodujo en esta misma rama — instala ambos en el runner.

**D5 — Push con `--force-with-lease` esperando `97b5e73`.**
El lease es la única red: si alguien empujó a la rama mientras se verificaba,
el push falla y se reporta en lugar de pisar trabajo ajeno. Nunca `--force` a
secas.

**D6 — El gate es CI verde, y los checks se esperan, no se fabrican.**
Tras el push, re-consultar `gh pr view 53 --json mergeable,mergeStateStatus,statusCheckRollup`.
El evento `pull_request` (`synchronize`) se dispara solo con el force-push. Si
GitHub tarda en recalcular `mergeable` o en poblar el rollup, se re-consulta
hasta que aparezca; **no** se añade otro commit de «trigger» — ese es
precisamente el anti-patrón que `07d5fb9` (`ci: trigger PR checks after
retarget to main`) introduce y que este rebase elimina de la historia. Y no se
mergea hasta verde y limpio.

**D7 — La punta de `main` se resuelve al ejecutar.**
El valor planificado es `18ee989`; el comando usa `origin/main` en el momento de
correr. Si otro PR entra a `main` durante la ejecución, D2 sigue valiendo con el
mismo upstream (`07d5fb9`) y un nuevo `--onto`, y el lease de D5 impide que el
push pise lo que haya aparecido en la rama remota.

## Risks / Trade-offs

- **[R1] El rebase se interrumpe en el worktree scratch]** → el checkout
  principal ni se entera; `git rebase --abort` siempre disponible y `97b5e73`
  registrado como rollback antes de empezar; ninguna otra rama se mueve.
- **[R2] La rama sigue retenida y git la rechaza]** → `git worktree prune`
  es el paso 1 y su efecto se verifica con `git worktree list` antes de crear el
  scratch; si aún apareciera retenida, detenerse a reportar en lugar de forzar.
- **[R3] El push pisa trabajo ajeno en la rama remota]** → `--force-with-lease`
  con lease = `97b5e73` (D5); el falla antes que pisar.
- **[R4] La frescura falla sobre el árbol auxiliar]** → siendo el replay byte a
  byte y el árbol de #52 idéntico, no debería fallar: si falla, es señal de que
  el replay **no** reprodujo el contenido, y hay que volver al grupo de forma
  antes que a cualquier otra cosa. El remedio, si fuera deriva real del
  artefacto, es el que el propio test indica (`pnpm codes:extract` y commitear);
  no se debilita el test ni se relaja la comparación.
- **[R5] `pnpm install --frozen-lockfile` rechaza el lockfile]** → el reasado no
  está completo: `pnpm-lock.yaml` no está en la intersección entre la base y los
  commits propios, así que el parche debe aplicar limpio.
- **[R6] Los checks no aparecen o `mergeable` no se recalcula]** → D6: esperar y
  re-consultar, nunca otro commit de trigger; reportar si persiste.
- **[R7] `main` avanza durante la ejecución]** → D7: la punta se resuelve al
  correr y el lease protege el push; si se movió, se repite el reasado sobre la
  nueva punta con el mismo upstream.
- **[R8] El rebase destruye los SHAs de la PR]** → es el punto (los commits
  viejos son los que causan el conflicto); el diff revisable es el mismo, y el
  rollback remoto es el mismo `97b5e73`.

## Migration Plan

1. **Pre-flight:** `git fetch origin`; `git status --short` vacío; registrar
   `97b5e73` como rollback; resolver la punta de `origin/main` (planificada
   `18ee989`); `git worktree prune` y confirmar con `git worktree list` que
   `feat/add-aux-codes-extraction` queda libre.
2. **Aislar:** `git worktree add /tmp/opencode/pr53-rebase
feat/add-aux-codes-extraction` (checkout principal intacto).
3. **Reasar:** `git rebase --onto origin/main 07d5fb9` dentro del scratch.
   Esperado: dos commits, cero conflictos. Ante cualquier parada inesperada:
   `git rebase --abort` y reportar, no improvisar resoluciones.
4. **Forma (D3):** `git log --oneline origin/main..HEAD` = exactamente `ci:
install poppler-utils…` y `feat: extract aux code catalogs…`;
   `git diff --name-only origin/main HEAD` = los 12 archivos;
   `git diff --quiet origin/main HEAD -- docs/npm-downloads.json` y ningún
   rastro de `scripts/spec-watch/` ni de los commits pre-squash.
5. **Contenido (D4):** `pnpm install --frozen-lockfile` + `pnpm verify` en verde
   en el scratch; confirmar después que la verificación no escribió nada
   (`git status --short` limpio, `codes.json` con el mismo hash).
6. **Publicar (D5):** `git push --force-with-lease origin
HEAD:feat/add-aux-codes-extraction` esperando `97b5e73`; después
   `git worktree remove /tmp/opencode/pr53-rebase`.
7. **Gate (D6):** `gh pr view 53` → `MERGEABLE`, diff de 12 archivos, checks
   apareciendo; **esperar verde**; dejar el comentario en #53 (qué se descartó y
   por qué el árbol no cambió). No mergear desde este cambio.

**Rollback:** antes del push, `git rebase --abort` (o `git reset --hard
97b5e73` en el scratch) y borrar el worktree — la rama local no se movió. Después
del push, restaurar el remoto con
`git push --force-with-lease origin 97b5e73:feat/add-aux-codes-extraction`
apuntando el lease a `97b5e73`.

## Open Questions

Ninguna que afecte el enfoque ni el desglose de tareas. La revisión diferida de
los extractores y del delta de `codes.json` queda como cambio aparte, a abrir
cuando #53 esté en verde.
