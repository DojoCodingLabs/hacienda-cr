## Why

El informe de conformidad (A1) quedó congelado sobre el commit `597a556` y su apéndice de estado marca como "abiertos" hallazgos que desde entonces se resolvieron en `origin/main` (#60/#70: identificador de política con guion, valor `12` de exoneración retirado, `06` renombrado, Ohm `U+2126`). El revisor de `main` pidió dos cosas concretas: **etiquetar el apéndice como evidencia histórica** y **añadir una reconciliación concisa con el main vigente**, preservando los hashes de fuente originales y distinguiendo el anexo retenido de 98 páginas del anexo oficial actual de 99 páginas.

Además, `origin/main` está 55 commits por delante de la línea de trabajo y ya no contiene este informe: sin reconciliación, publicar A1 tal cual presentaría como "conformidad actual" conclusiones que el código vigente ya contradice.

El review fue una revisión **de sólo lectura** contra la base `cf1db1e4bde37498643f77c8259c0a29e51033a1`, con cabeza revisada `81c6e42179320bbacaf5c74c6fe8973fd871159b`, y **no ejecutó merge, cierre ni edición de fuente**. Este change produce el estado que el review exige para que el PR #58 sea mergeable, y deja el merge en manos de otra persona.

## What Changes

- **Anexo de estado etiquetado como histórico**: el apéndice §10 deja de presentarse como estado actual y declara el commit auditado (`597a556`) al que corresponde, con sus hashes.
- **Reconciliación con el main vigente**: sección nueva que enumera, por hallazgo, si quedó resuelto (con el PR y la evidencia que lo resolvió), si sigue abierto, o si cambió de estado por trabajo posterior.
- **Distinción de anexos**: el informe declara que el anexo retenido en el repo (SHA-256 `2e36bd11…`, 98 páginas) **no** es el anexo oficial vigente (SHA-256 `6e093226…`, 99 páginas), y que esa diferencia de source-set no está reconciliada.
- **Procedencia preservada**: los hashes de cada archivo fuente que el informe leyó se conservan intactos y atribuibles a su lectura original; ninguna relectura se reescribe como observación nueva.
- **Procedencia de la pasada de reconciliación**: la cabecera registra la base revisada (`cf1db1e4…`) y la cabeza revisada (`81c6e421…`), sin mezclarlas con el commit auditado del apéndice.
- **Lo que el informe delimita**: una sección declara que el informe **no** afirma elegibilidad de régimen (ni total ni parcial) ni aceptación real por Hacienda, y que la reconciliación documental **no** es precondición del trabajo acotado de la NC exacta (0.7).
- **Puente con el generador**: la reconciliación referencia el trabajo pendiente de generación de catálogos (`#57`) y la evidencia de oráculo nativo que `main` ya aporta.

**BREAKING**: ninguno; es documentación.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `conformity-report`: el informe pasa a declarar el carácter histórico de su apéndice, a reconciliar sus hallazgos con el main vigente, a distinguir el anexo retenido del anexo oficial actual y a delimitar lo que no afirma.

## Impact

- **Código afectado**: ninguno. Sólo `docs/conformity-report.md` y la referencia en `AGENTS.md`.
- **Proceso**: el informe deja de ser "la foto del momento" y pasa a ser "foto + delta contra main". La foto conserva sus hashes; el delta es la única parte viva.
- **Publicación**: el cambio del informe es revisable por separado de los cambios de código, que es lo que pidió el review.
- **Riesgo residual**: si `main` avanza otra vez, la reconciliación queda desactualizada; por eso el apéndice se declara histórico y el delta es la única parte viva.
- **No es precondición de 0.7**: la reconciliación documental no bloquea ni habilita la corrección acotada de la NC exacta; ambas avanzan en paralelo.
- **Frontera de la afirmación**: el informe no puede leerse como certificación de conformidad vigente; por eso declara sus límites en el propio documento y no sólo en la discusión del PR.
