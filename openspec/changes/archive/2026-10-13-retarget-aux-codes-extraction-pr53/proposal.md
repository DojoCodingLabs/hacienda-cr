# Proposal: retarget-aux-codes-extraction-pr53

## Why

El PR #53 (`feat: extract aux code catalogs to codes.json`) está
`CONFLICTING` (`mergeState: DIRTY`). La causa es la misma que ya se arregló
en #52 por `fix-codes-extraction-pr52`: su rama `feat/add-aux-codes-extraction`
(`e6aa2aa`) arrastra la historia pre-squash huérfana de #51 (`e460822`,
`d42b9a7`) y los commits de #52 con hashes viejos (`c9b3892`, `e579540`).

- `git merge-base e6aa2aa 07d5fb9` (su base actual, el head de #52) y
  `git merge-base e6aa2aa origin/main` **ambos** devuelven `a8afe2e` (#50).
- El historial de #53 contiene los mismos cambios que su base, con hashes
  distintos tras el reasado de #52, así que `git merge-tree` reporta
  «changed in both» sobre decenas de archivos: es un falso conflicto de
  historia duplicada, no de contenido.
- El diff real de #53 es **un solo commit** (`e6aa2aa`, 11 archivos,
  +37707/−626): los `lib/aux-*.mjs`, el crecimiento de `codes.json` con las
  tablas auxiliares y el lockfile de `exceljs`/`node-unrar-js`.

Además, retargetear #52 a `main` sin reasar #53 deja a esta apilada sobre
una base que ya no es ancestora de `main`, de modo que aunque se resolviera
el merge manualmente quedaría `CONFLICTING` otra vez al entrar #52.

## What Changes

- Reasar `feat/add-aux-codes-extraction` sobre el nuevo head de #52
  (`07d5fb9`) reproduciendo **solo** su commit propio `e6aa2aa` — misma
  técnica probada en `fix-codes-extraction-pr52`:
  `git rebase --onto 07d5fb9 e6aa2aa feat/add-aux-codes-extraction`.
- Verificar la forma del resultado: la rama = `07d5fb9` + exactamente un
  commit, diff reducido a los 11 archivos de `e6aa2aa`, sin nada de la
  cadena pre-squash ni de #52.
- Correr la verificación offline y dejar constancia de la dependencia de
  `pdftotext` en el runner de CI (ver Dependencies), declarándola en
  `ci.yml` para que la prueba de frescura pase en verde.
- Empujar con `--force-with-lease`; el PR #53 conserva su base
  `feat/add-codes-extraction` y debe quedar `MERGEABLE` de nuevo.

Fuera de alcance: mergear #52 o #53, reasadd `feat/add-codes-generation`
(una rama local con un solo commit propio, `1cb83c3`, que se reasadd en su
propia sesión cuando #53 entre), y cambiar la semántica del extractor o el
contenido de `codes.json`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `codes-extraction`: la verificación de frescura de `codes.json`, ya
  existente desde #52, pasa a regenerar desde el set completo del árbol
  (XSD **y** auxiliares vendorizados) porque el extractor de #53 consume
  también ANEXOS/moneda PDF y ubicaciones RAR→XLSX. Esa regeneración sigue
  siendo solo lectura (temp, no escribe el artefacto) pero su corrida real
  invoca `pdftotext`, así que `pnpm verify` requiere ese binario en el
  entorno. Se aclara que la dependencia se declara en el runner de CI (igual
  que `xmllint` para `spec:verify`), sin integrar la extracción en
  `spec:update` ni en el workflow de deriva.

## Impact

- **CI / git**: se reescribe la rama de #53 (`e6aa2aa` → hash nuevo sobre
  `07d5fb9`); rollback = el puntero actual `e6aa2aa`, que sigue existiendo
  en el remoto. `ci.yml` gana la instalación de `poppler-utils`.
- **Tests**: ningún test nuevo — se reutiliza la prueba de frescura ya
  presente, que `copyRealSet` copia el set completo (no filtra XSD) y por
  tanto absorbe los auxiliares.
- **Sin cambio de comportamiento publicado**: los paquetes no cambian de
  versión → sin Changeset.
- **OpenSpec local**: la spec de `codes-extraction` aclara la dependencia
  de `pdftotext` en la verificación; sin requisitos de runtime nuevos.
