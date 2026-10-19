# Tasks: retarget-aux-codes-extraction-pr53

## 1. Confirmar precondiciones

- [x] 1.1 `git fetch origin` y confirmar: #51 sigue mergeado en `origin/main`,
      y el head vigente de #52 (`feat/add-codes-extraction`) sigue en
      `07d5fb9` — registrar `e6aa2aa` como punto de rollback de #53
- [x] 1.2 Verificar que `e6aa2aa` es el único commit propio de #53 y que su
      merge-base con `07d5fb9` es `a8afe2e` (historia huérfana, el motivo del
      `CONFLICTING`)

## 2. Reasar `feat/add-aux-codes-extraction` sobre el nuevo head de #52

- [x] 2.1 Reasar con upstream explícito: `git rebase --onto 07d5fb9 e6aa2aa
feat/add-aux-codes-extraction`; si se detiene, caer a rama scratch desde
      `07d5fb9` + `git cherry-pick e6aa2aa` y resolver el contexto sobre el
      texto actual, sin arrastrar la cadena pre-squash
- [x] 2.2 Verificar la forma (D3): `git log --oneline 07d5fb9..HEAD` muestra
      **exactamente un** commit y `git diff 07d5fb9 HEAD --name-only` lista
      los 11 archivos de `e6aa2aa` (`codes.json`, `scripts/codes-extract/*`,
      `package.json`, `pnpm-lock.yaml`, `render.mjs`, el README de schemas)
- [x] 2.3 Verificar el contenido negativo: el diff **no** contiene nada bajo
      `scripts/spec-watch/`, `.github/workflows/spec-drift.yml` ni
      `docs/npm-downloads.json` — si aparece, la cadena pre-squash siguió
      arrastrada y hay que repetir 2.1
- [x] 2.4 Verificar el lockfile (D3): `pnpm install` regenera un
      `pnpm-lock.yaml` cuya única diferencia son `exceljs` y `node-unrar-js`;
      si difiere en algo más, detenerse y revisar

## 3. Declarar la dependencia de `pdftotext` en CI

- [x] 3.1 Añadir a `ci.yml` (job `ci`, junto al paso de `libxml2-utils`) la
      instalación de `poppler-utils` para que `pdftotext` esté disponible
      cuando `test:scripts` corra la frescura con el extractor auxiliar real
- [x] 3.2 Confirmar que la prueba de frescura usa `copyRealSet` (set completo,
      auxiliares incluidos) y no `copySchemasFixture` (solo `.xsd`), para que
      la regeneración de comparación cubra los auxiliares
- [x] 3.3 Confirmar que la ausencia de `pdftotext` se reporta como error que
      nombra el binario (dependencia de entorno) y no como deriva de
      `codes.json`, sin escribir en el artefacto

## 4. Gate y publicación

- [x] 4.1 `pnpm install --frozen-lockfile && pnpm verify` sobre la rama
      reasada con `pdftotext` disponible (prueba de frescura en verde)
- [x] 4.2 Empujar con `--force-with-lease` a
      `feat/add-aux-codes-extraction`; dejar que el lease falle antes que
      pisar cualquier push posterior (rollback = `e6aa2aa`)
- [x] 4.3 Verificar el PR #53: `MERGEABLE` de nuevo, base aún en
      `feat/add-codes-extraction`, diff reducido a los 11 archivos
- [ ] 4.4 Dejar correr CI en #53 y verificarla verde antes de cualquier merge
      — la base de #53 es `feat/add-codes-extraction`, no `main`, así que el
      workflow `pull_request` de `ci.yml` no se dispara hasta que #52 mergée
      a `main`; verificar al retargetear la base o tras el merge de #52
- [x] 4.5 Confirmar que `main`, #51 y #52 no se tocaron, y dejar nota de que
      `feat/add-codes-generation` (rama local, `1cb83c3`) queda pendiente de
      reasadd sobre el nuevo head de #53 en su propia sesión
