# Design: fix-spec-drift-workflow-rebase

## Context

`feat/add-spec-drift-workflow` (PR #51) está apilada sobre `a9c8949`, el commit de los
watchers previo al squash de #50. `main` ya contiene el resultado de #48/#49 y, gracias al
cambio anterior, #50 está mergeable y en verde.

Dos hechos condicionan el enfoque (ver `proposal.md — Why` para el detalle):

1. **El patch-id miente.** `git cherry` marca `f47f44d`, `a9c8949` y `3fdeddf` como ya
   aplicados porque `main` guardó los merges #43/#44/#45 y después sus reverts
   (`86cca65` revierte exactamente el workflow de `3fdeddf`). `git rebase` usa patch-id
   para descartar, así que un rebase normal borraría los tres commits.
2. **Las anclas de los docs se movieron.** `3fdeddf` edita `docs/testing.md` anclándose en
   la línea "counterpart is `node scripts/spec-verify.mjs`, which `pnpm verify` already
   runs." y `packages/sdk/schemas/README.md` en dos zonas contiguas; el commit `5dbefbe`
   de #50 reescribió exactamente esa región.

Restricciones del repo: los jobs con `set -euo pipefail` convierten cualquier código
distinto de cero en fallo del paso; no se ejecutan operaciones vivas (dispatch del
workflow contra las superficies de Hacienda) sin autorización explícita.

## Goals / Non-Goals

**Goals:**

- El diff del PR #51 queda reducido a `.github/workflows/spec-drift.yml` + sus docs.
- La historia de la rama queda legible: `main` + un commit de workflow.
- El truncado del cuerpo del issue produce siempre UTF-8 válido.
- El resultado es verificable sin tocar las superficies de Hacienda.

**Non-Goals:**

- Rebasear #52 o #53 (se hace cuando sus padres estén mergeados).
- Cambiar `spec:check`, el manifiesto, los vendorizados o `scripts/`.
- Añadir funcionalidad al job (fase 2: correr `spec:update` desde el job).
- Ejecutar el workflow en vivo desde la rama.

## Decisions

### 1. `checkout -B` + `cherry-pick`, no `rebase`

```
git checkout -B feat/add-spec-drift-workflow feat/add-spec-watch-commands
git cherry-pick 3fdeddf
```

_Base (decisión de secuencia posterior al diseño inicial):_ la revisión pidió rebasear
#51 **después** de mergear #50, pero #50 espera su propia revisión y aún no se puede
mergear. La rama se reconstruye por tanto apilada sobre `feat/add-spec-watch-commands`
(`5dbefbe`), que es donde vive el texto duro con el que se resuelven los conflictos. Así
la resolución ocurre una sola vez contra el texto final: cuando #50 se mergée y se rebasese
esta rama, los commits de #50 se descartan por patch-id (ahí sí coincide, porque el contenido
es idéntico, no revertido) y el replay del workflow ya no choca. El coste es que el diff del
PR contra `main` muestra todavía el contenido de #50 hasta ese rebase; colapsa después al
workflow más sus docs.

`cherry-pick` aplica el diff real del commit y no consulta patch-ids, así que el commit
se reaplica aunque `main` ya lo contenga revertido.

_Alternativa descartada:_ `git rebase --onto origin/main a9c8949` — acota el replay a
`3fdeddf`, pero `git rebase` sigue filtrando por patch-id y puede volver a descartarlo
("se ha saltado el commit aplicado previamente"), que es exactamente el fallo silencioso
que queremos evitar.

_Alternativa descartada:_ `git rebase --reapply-cherry-picks` — reaplica también
`f47f44d` y `a9c8949`, que ya están en `main` como squash: conflictos de contenido sin
ninguna ganancia.

_Alternativa descartada:_ recrear el archivo a mano desde `git show 3fdeddf:...` — pierde
la autoría y el historial del commit, y hace del diff algo no reproducible.

### 2. Los conflictos de docs se resuelven conservando el texto endurecido de #50

Al hacer cherry-pick se espera conflicto en `docs/testing.md` (ancla reescrita por
`5dbefbe`) y posiblemente en `packages/sdk/schemas/README.md` (hunks adyacentes a nuestro
párrafo nuevo). La resolución es mecánica: se conserva el párrafo endurecido de #50 y se
añade después la sección del job programado de `3fdeddf`, sin mezclar ni duplicar texto.

### 3. Truncado UTF-8: `head -c` + `iconv -c`, con el `|| true` obligatorio

```
head -c "$MAX_BYTES" "$REPORT" | iconv -f UTF-8 -t UTF-8 -c > "$BODY" || true
```

Verificado localmente con un informe de prueba (`Informe de deriva: Café, Muñoz, año`):

| corte                      | salida cruda               | salida con `iconv -c`             |
| -------------------------- | -------------------------- | --------------------------------- |
| 23 (deja un `0xC3` suelto) | termina en byte incompleto | `Informe de deriva: Caf` — válido |
| 24 (cierra `é`)            | `…Café`                    | igual — válido                    |
| 25 (`Café,`)               | `…Café,`                   | igual — válido                    |

**Trampa descubierta y confirmada:** `iconv -c` sale con código **1** cuando descarta una
secuencia incompleta (`iconv exit=1` con `n=23`, `0` con `n=24`). El paso "Report drift"
usa `set -euo pipefail`, así que sin `|| true` un informe que se corte sobre un carácter
acentuado **fallaría el job entero** — de cosmético a outage. La salida sí se escribe
antes de fallar, por lo que `|| true` es suficiente.

_Alternativa descartada:_ `python3` para truncar por carácter — determinista y sin el
trampa del exit code, pero añade un intérprete a un paso que hoy es solo shell.
_Alternativa descartada:_ `jq -Rs '.[0:N]'` — trunca por caracteres, no por bytes, así que
con texto multibyte podría superar el límite de 60 KB que el issue acepta.

### 4. Verificación sin superficies vivas

- `bash -n` sobre el workflow para el syntax check.
- Un caso de prueba local con un archivo que contiene caracteres multibyte (los tres cortes
  de la tabla) que confirma salida UTF-8 válida y `exit 0` de la tubería completa.
- Revisión de que la huella (`sha256` del informe con whitespace final recortado) y el
  marcador no cambian de forma: el deduplicador de issues depende de que la huella siga
  siendo estable.
- **No** se dispara `workflow_dispatch` contra la rama: ese paso ejecuta `pnpm spec:check`
  en vivo y puede abrir un issue real. Requiere autorización explícita si se quiere.

## Risks / Trade-offs

- **Force-push a una rama con PRs apilados encima** (#52, #53) → sus refs no se mueven, así
  que sus diffs no cambian; conservan el contenido viejo (sin los tres fixes de #50) hasta
  que se les haga el mismo tratamiento. Riesgo conocido, anotado en la propuesta.
- **`iconv -c` puede descartar más de un byte** si el corte cae dentro de un carácter de
  cuatro bytes → se pierde como mucho un carácter al final del informe truncado; el informe
  íntegro queda en el log del job, como ya exige el requisito.
- **El paso de truncado solo corre con informes > 60 KB** → el camino normal (informe
  corto) no pasa por `iconv`; se cubre con el caso de prueba local, no con la corrida real.
- **La rama reescrita invalida el SHA que citan comentarios del PR** → la revisión ya
  apunta al estado viejo; tras el push conviene responder señalando el nuevo HEAD.

## Migration Plan

1. Rebase de la rama con la receta de la decisión 1.
2. Resolución de conflictos de docs (decisión 2) y del truncado UTF-8 (decisión 3).
3. Verificación local (decisión 4) y `pnpm verify` completo.
4. Commits separados: (a) reaplicar el workflow sobre `main`, (b) el fix de truncado, si
   se decide no plegarlo en (a).
5. `git push --force-with-lease origin feat/add-spec-drift-workflow` y comprobación en el
   PR de que el diff quedó en los archivos esperados y CI vuelve a verde.

_Rollback:_ el SHA actual (`3fdeddf`) sigue en el repo; `git push --force-with-lease
origin 3fdeddf:feat/add-spec-drift-workflow` restaura el estado previo.

## Open Questions

- Si #52 y #53 se rebasean con la misma receta ahora o esperan a que #50 y #51 se
  mergen (cada merge vuelve a mover `main`). La propuesta los deja fuera de alcance.
