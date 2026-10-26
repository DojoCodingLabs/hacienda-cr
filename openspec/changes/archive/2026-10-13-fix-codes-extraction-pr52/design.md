# Design: fix-codes-extraction-pr52

## Context

`feat/add-codes-extraction` es `4607cc7` cuyo padre es `3fdeddf` — el commit del
workflow en la cadena pre-squash de #51. Desde que #51 se reconstruyó sobre `main`
(`e460822`), esa rama quedó huérfana:

- `git merge-base origin/feat/add-codes-extraction origin/feat/add-spec-drift-workflow`
  = `139d574` (`docs: update npm lifetime downloads`), muy por debajo de la base
  actual.
- `git diff --name-status e460822 origin/feat/add-codes-extraction` = 19 archivos, de
  los cuales 6 son `scripts/spec-watch/*` **revertidos**: la rama no tiene los fixes
  de revisión de #50 (`3c805c9`, `6e2433b`, `5dbefbe`), que sí están en `main` vía el
  squash `a8afe2e`. Mergearla tal cual quita el rechazo de esquemas sin TLS y el
  tope de descarga por stream.
- Además reintroduce `.github/workflows/spec-drift.yml` (138 líneas, sin el corte
  UTF-8 seguro que #51 ya publicó) y `docs/npm-downloads.json`.

El commit propio de la rama es solo `4607cc7`: 10 archivos, +3666/−6
(`packages/sdk/schemas/codes.json`, el extractor bajo `scripts/codes-extract/`, el
script `codes:extract`, el `ALLOWLIST` de `codes.json` en `spec-verify.mjs` y en
`manifest.spec.ts`, y su documentación).

El segundo hallazgo de la revisión es que ese `ALLOWLIST` deja al artefacto sin
verificación: `spec-verify` coteja el árbol contra `manifest.json`, `codes.json` no
está en el manifiesto (es derivado), y el test de integración actual
(`copySchemasFixture`, línea 371) copia **solo** los `.xsd` a un temp y comprueba
idempotencia — no igualdad con lo commiteado. Motivación en `proposal.md` — Why.

## Goals / Non-Goals

**Goals:**

- Que el diff de #52 sea únicamente la extracción de códigos, sin tocar
  `scripts/spec-watch/` ni el workflow de deriva.
- Que un `codes.json` desactualizado haga fallar `pnpm verify` nombrando el archivo y
  el remedio.
- Que la solución siga siendo válida cuando #53 añada las fuentes auxiliares.

**Non-Goals:**

- Mergear #51 o #52, o retargetear antes de que #51 entre.
- Cambiar el contenido de `codes.json` ni la semántica del extractor.
- Meter `codes:extract` en `spec:update` ni en el workflow de deriva.
- Reescribir #53 (su backport del workflow ya se hizo; su base se toca cuando #52
  mergée).

## Decisions

**D1 — Reasar la rama con `git rebase --onto e460822 3fdeddf`, no un rebase
normal.** Con el upstream explícito, git reproduce **solo** `4607cc7` sobre la base
nueva y descarta la cadena pre-squash sin tener que adivinar patch-ids. Un
`git rebase origin/main` a secas reproduciría los seis commits de #50 y generaría
conflictos add/add cuya resolución a mano es justamente cómo se revierte el
endurecimiento. Alternativa equivalente: rama scratch desde `e460822` +
`git cherry-pick 4607cc7`; se usa si el rebase se detiene. En ambos casos el guard
real es la verificación de D6, no la herramienta.

**D2 — El chequeo de frescura va en `scripts/codes-extract/codes-extract.test.mjs`
(`test:scripts`), no en `spec-verify.mjs`.** `spec:verify` es una comprobación
offline árbol↔manifiesto; meterle regeneración lo acoplaría al extractor y obligaría
a mover también los requisitos de `spec-integrity`. En cambio `pnpm verify` ya corre
`test:scripts`, y el archivo de test ya tiene `spawnExtract` (env
`CODES_EXTRACT_SCHEMAS_DIR`) y los fixtures. Alternativa considerada: un modo
`--check` de `pnpm codes:extract` cableado en `pnpm verify` — superficie pública
nueva e integración explícita que la spec trataba de diferir; descartada.

**D3 — El fixture de frescura copia el set completo, no solo los `.xsd`.**
`copySchemasFixture` filtra `name.endsWith(".xsd")` a propósito: varios tests de
negativo necesitan ausencia de auxiliares. Reutilizarlo haría que la igualdad byte a
byte sea correcta hoy (#52 lee solo XSD) y **falsa** mañana, cuando #53 haga crecer
`codes.json` con las tablas auxiliares. Se agrega un copiado aparte que replica el
árbol commiteado tal cual, que es lo que «regenerar a partir de las fuentes del
árbol» significa.

**D4 — Igualdad byte a byte del texto serializado, no `deepStrictEqual` de JSON.**
El requisito exige reemplazo completo y el renderizador fija orden de claves; la
comparación textual también detecta deriva de orden que `deepStrictEqual` pasaría
por alto.

La comparación se hace **tras aplicar `.prettierrc` a ambos lados**. El artefacto
commiteado no es texto crudo del extractor: `render.mjs` emite
`JSON.stringify(doc, null, 2)` (arrays siempre expandidos), pero el hook de commit
(`lint-staged: {"*": "prettier --write --ignore-unknown"}`) lo reformatea e inlinea
los arrays cortos — 132 líneas de diferencia en un árbol correcto. Se resuelve la
config desde la ruta del artefacto commiteado (`.prettierrc`, no la config por
defecto que prettier hallaría en un directorio temporal). La deriva de formato pura
la cubre `prettier --check`, que `verify` ya ejecuta; este test cubre deriva de
contenido y de orden de claves.

**D5 — Base de #52 = `feat/add-spec-drift-workflow` hasta que #51 mergée, y
retarget a `main` en esa misma sesión.** Así lo pide la propia revisión. Retargetear
antes dejaría a #52 `CONFLICTING` contra `main` y compitiendo con #51 por los
mismos archivos; retargetear tarde deja una ventana sin CI.

**D6 — El reasado se verifica, no se confía.** Tras reproducir el commit se exige:
(a) la rama es `e460822` + exactamente el commit reproducido de `4607cc7`, sin nada
de la cadena pre-squash; (b) `git diff e460822 HEAD --name-only` son los 10 archivos
de `4607cc7`; (c) el diff **no** contiene nada de `scripts/spec-watch/` ni
`.github/workflows/spec-drift.yml`; (d) `codes.json` está presente; (e) `spec:verify`
y `pnpm verify` pasan sobre el resultado.

La cláusula (a) protege el **reasado** (tarea 1.3), no el contenido final: el test
de frescura del grupo 2 se añade como **commit aparte** sobre ese reasado, porque es
una respuesta al hallazgo de la revisión y no parte de `4607cc7`, y su mensaje lleva
el porqué (artefacto en el allowlist, normalización por prettier). El estado final es
`e460822` + 2 commits y el diff del PR sigue reducido a los mismos 10 archivos.

**D7 — Sin Changeset.** Nada publicado cambia: los paquetes no se versionan y el SDK
todavía no consume `codes.json`.

## Risks / Trade-offs

- [Conflicto del cherry-pick en `package.json`, `spec-verify.mjs` o
  `manifest.spec.ts` si `main` movió esas líneas] → las ediciones son adiciones de
  una entrada al `ALLOWLIST` y un script; si hay conflicto se re-aplica sobre el
  texto actual de `main`, sin tocar el resto.
- [El test nuevo alarga `pnpm verify`] → es parsing XML local sin red (el test de
  integración existente ya corre una extracción completa); el costo marginal es una
  corrida más.
- [#53 hereda el test] → D3 hace que el fixture siga siendo correcto cuando el
  extractor lea auxiliares; si #53 aterriza primero, el mismo caso aplica igual.
- [Un `spec:update` deja CI rojo hasta regenerar `codes.json`] → es el comportamiento
  deseado: el error nombra el remedio, y esa es precisamente la deriva que el
  hallazgo quería cerrar.
- [Reasar sin verificar repetiría el error original] → D6 obliga a comprobar el
  contenido del diff antes de empujar.

## Migration Plan

1. Reasar `feat/add-codes-extraction` sobre `e460822` con el upstream explícito
   `3fdeddf`, o rama scratch + cherry-pick si el rebase se detiene.
2. Ejecutar la verificación de D6 y, sobre ese resultado, añadir el test de frescura
   hasta que pase y también falle correctamente contra un `codes.json` alterado.
3. `pnpm verify` completo antes de empujar (`--force-with-lease`).
4. Cuando #51 mergée: retargetear #52 a `main`, dejar correr CI y solo entonces
   mergear.
5. Rollback: el puntero previo `4607cc7` sigue existiendo en el remoto hasta el
   push; `git push --force-with-lease origin 4607cc7:feat/add-codes-extraction`
   restaura el estado.

## Open Questions

- Si `codes:extract` debe acabar dentro de `spec:update` (fase 2, junto con el job
  que vendoriza). Cambiaría la composición del pipeline, no este diseño; queda fuera.
