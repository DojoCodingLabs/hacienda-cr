# Design: retarget-aux-codes-extraction-pr53

## Context

`feat/add-aux-codes-extraction` (`e6aa2aa`) es un único commit propio cuyo
padre es `e579540` (el head **viejo** de #52 antes del reasado). Su base en
GitHub es la rama `feat/add-codes-extraction`, cuyo head actual (`07d5fb9`)
ya no comparte historia con `e6aa2aa`: el merge-base de ambos es `a8afe2e`
(#50). El motivo se detalla en `proposal.md — Why`.

Restricciones que moldean el enfoque:

- #52 ya se reasó sobre `main` con la técnica `git rebase --onto` y quedó
  verde; #53 debe seguir el mismo patrón para que la pila vuelva a ser
  lineal.
- El commit propio de #53 toca 11 archivos, incluido `pnpm-lock.yaml`
  (crece con `exceljs`/`node-unrar-js`), de modo que cualquier reproducción
  del commit debe preservarlo byte a byte salvo conflictos reales de contexto.
- La prueba de frescura (heredada de #52) usa `copyRealSet`, que copia el
  set **completo** — no filtra `.xsd` — y corre el extractor real vía
  `spawnExtract`. Con el extractor de #53 eso invoca `pdftotext`, que
  `ci.yml` hoy no instala.

## Goals / Non-Goals

**Goals:**

- Que #53 vuelva a `MERGEABLE` con base `feat/add-codes-extraction` y diff
  reducido a sus 11 archivos, sin cadena pre-squash.
- Que `pnpm verify` (vía `test:scripts`) pase en verde en CI con el
  extractor auxiliar real, incluida la prueba de frescura.
- Dejar documentada la dependencia del runner y un rollback explícito.

**Non-Goals:**

- Mergear #52 o #53.
- Reasadd `feat/add-codes-generation` (rama local, un commit propio) — se
  hace en su propia sesión cuando #53 entre.
- Cambiar la semántica del extractor, el contenido de `codes.json`, o meter
  `codes:extract` en `spec:update`/deriva.

## Decisions

**D1 — Reasar con `git rebase --onto 07d5fb9 e6aa2aa
feat/add-aux-codes-extraction`, no un merge ni un rebase normal.** El
upstream explícito le dice a git que replique **solo** `e6aa2aa` sobre el
nuevo head de #52 y descarte `e460822`/`d42b9a7`/`c9b3892`/`e579540`. Es la
misma técnica que arregló #52. Alternativa descartada: un merge manual —
resuelve el falso conflicto pero mantiene la historia duplicada y deja el
diff del PR con 20+ archivos en vez de 11.

**D2 — Declarar `poppler-utils` en `ci.yml`, no degradar la prueba.** La
frescura debe regenerar con el extractor real (si no, no detectaría deriva
de auxiliares). Como el runner no trae `pdftotext`, se añade un paso
`apt-get install poppler-utils` junto al existente de `libxml2-utils`. La
alternativa — inyectar seams sintéticos en la fresh-result — se descarta:
comprometería la igualdad byte a byte al no usar el camino real. La
extracción sigue fuera de `spec:update` y de la deriva.

**D3 — Verificación del reasado antes de empujar (D6 del cambio previo).**
Tras el rebase se exige: (a) la rama es `07d5fb9` + exactamente un commit;
(b) `git diff 07d5fb9 HEAD --name-only` son los 11 archivos de `e6aa2aa`;
(c) no hay nada de la cadena pre-squash; (d) `pnpm spec:verify` y la prueba
de frescura pasan; (e) el lockfile difiere solo por los dos paquetes nuevos.

**D4 — Rollback = puntero `e6aa2aa`.** El head actual sigue existiendo en
el remoto hasta el push; `git push --force-with-lease origin
e6aa2aa:feat/add-aux-codes-extraction` restaura el estado previo.

## Risks / Trade-offs

- [Rebase sin verificar repetiría el error original de la pila] → D3 obliga
  a comprobar forma y diff antes de empujar.
- [El lockfile puede no reconstruirse idéntico] → se regenera con el mismo
  `pnpm install` y se compara; si difiere en algo más allá de
  `exceljs`/`node-unrar-js`, se detiene y se revisa.
- [`pdftotext` añade tiempo de CI] → `apt-get install` de un binario
  pequeño; el costo marginal es despreciable frente al parsing ya existente.
- [#53 hereda la frescura de #52] → `copyRealSet` ya copia auxiliares, así
  que no hay que tocar el test; se verifica con la corrida real.
- [Un `spec:update` deja CI rojo hasta regenerar] → es el comportamiento
  deseado de la frescura; el error nombra el remedio.

## Migration Plan

1. Confirmar #51 mergeado y el head vigente de #52 (`07d5fb9`).
2. Reasar `feat/add-aux-codes-extraction` sobre `07d5fb9` con upstream
   explícito `e6aa2aa`; si se detiene, rama scratch + cherry-pick.
3. Ejecutar la verificación de D3 (forma, diff, `spec:verify`, frescura).
4. Añadir `poppler-utils` a `ci.yml` y confirmar verde local con `pdftotext`.
5. `pnpm verify` completo antes de empujar (`--force-with-lease`).
6. Dejar correr CI en #53 y verificar verde antes de cualquier merge.

## Open Questions

- Si `codes:extract` debe acabar dentro de `spec:update` (fase 2). Cambiaría
  la composición del pipeline, no este diseño; queda fuera.
