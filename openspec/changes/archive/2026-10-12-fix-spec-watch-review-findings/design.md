# Design: fix-spec-watch-review-findings

## Context

`scripts/spec-watch/` (rama `feat/add-spec-watch-commands`, PR #50) implementa
`spec:check` (solo lectura) y `spec:update` (escritura de vendorizados + manifiesto) sobre
las superficies declaradas en `packages/sdk/schemas/manifest.json`. Los cuatro hallazgos
de la revisión y su ubicación exacta están en `proposal.md — Why`.

Restricciones que moldean el enfoque:

- El flujo de escritura de `spec:update` es único: todo write pasa por el loop de
  `update-core.mjs` (`mkdirSync` + `writeFileSync` de vendorizados y del manifiesto). Ese
  es el punto de estrangulamiento natural para una invariante de contención.
- `basenameOf()` se usa en tres sitios: `parse.mjs:42` (nombres scrapeados de ATV),
  `discover.mjs:50` (URL de política del manifiesto) y `manifest.mjs:65` (rutas locales
  del manifiesto, ya normalizadas a POSIX). Cualquier cambio ahí afecta a los tres.
- El nombre legitimo incluye espacios y acentos (`ANEXOS Y ESTRUCTURAS_V4.4.pdf`,
  `Codificacionubicacion_V4.4.rar`), y el decoding de `%20` es correcto y necesario. El
  guard no puede ser una allowlist de caracteres, solo una denegación de separadores.
- Las pruebas mockean `fetch` completo (`spec-watch.test.mjs`, 32 tests): un cambio en cómo
  se lee el cuerpo obliga a actualizar el doble de red del harness, no solo el código.
- El repo prohíbe tocar estado real del usuario y exige fixtures sintéticas; toda prueba
  nueva corre contra `mkdtempSync` o el doble mockeado.

## Goals / Non-Goals

**Goals:**

- Ningún nombre proveniente de una superficie puede producir una escritura fuera de
  `packages/sdk/schemas/`, ni siquiera si la superficie está comprometida.
- Ninguna respuesta puede degradar el canal a `http:` ni hacer acumular memoria ilimitada
  en el proceso.
- Un fallo del gate `spec:verify` posterior a la escritura queda documentado con su
  forma exacta de recuperación manual.
- El PR #50 vuelve a ser mergeable con CI en verde.

**Non-Goals:**

- Implementar rollback automático del gate fallido (ver decisión 4).
- Cambiar el informe de `spec:check`, sus códigos 0/1/2, el workflow de drift ni el
  manifest schema.
- Reescribir el parser de ATV o el sondeo `known-file-probe`.
- Endurecer `spec:verify` (no escribe y no descarga; queda cubierto por su propio
  requisito).

## Decisions

### 1. Doble capa para rutas de escritura: rechazo del nombre + contención de la ruta

Se aplica **ambas** capas, no una:

- **Rechazo del nombre** (temprano, en `basenameOf()` o en una función `safeBasename()`
  que lo use): si el último segmento decodificado contiene `/`, `\` o `..`, se lanza un
  error que nombra el origen. Es el mismo patrón que ya existe en `probe.mjs:5` para los
  `knownFiles`; aplicarlo scrapeo también elimina la asimetría que produjo el finding.
- **Contención de la ruta** (en el choke point de `update-core.mjs`): antes de cada
  `writeFileSync`, `resolve(target)` debe empezar con `resolve(schemasDir) + path.sep`.
  Si no, se aborta la ejecución entera sin escribir nada.

_Alternativa considerada:_ solo la capa de nombre (una línea). Rechazada porque cualquier
futuro origen de nombres (una superficie nueva tipo `atv-page`, un `knownFiles` editado a
mano, un path compuesto en `analyze.mjs`) volvería a abrir el hueco; la contención es la
invariante, el guard del nombre es la UX.

_Alternativa considerada:_ normalizar (`normalize()`) y comparar, aceptando `a/../b`.
Rechazada: normalizar convierte un intento de escape en un nombre válido silencioso. El
comportamiento deseado es rechazo ruidoso, no aceptación.

Detalle: la capa de contención se aplica también al write del `manifest.json` (ruta
constante) para que la invariante sea única y sin excepciones.

### 2. `https:` obligatorio en cada hop, incluido el primero

`resolve()` exige `target.protocol === "https:"` en cada iteración del loop de
redirecciones, junto al chequeo de host existente. Exigirlo también en el primer hop es
gratis (las URLs del manifiesto ya son `https:`) y captura un typo futuro en el manifiesto
sin código adicional.

_Alternativa considerada:_ permitir `http:` para `localhost` en desarrollo. Rechazada: no
existe tal caso de uso; las pruebas usan un `fetch` mockeado y no tocan red.

Los códigos de error existentes se conservan: esto es un fallo operativo (exit 2), igual
que un host fuera de la allowlist.

### 3. Límite de tamaño en dos mecanismos: pre-chequeo + corte en stream

- Si `Content-Length` está presente y excede `maxBytes`, se rechaza sin leer el cuerpo
  (barato, evita la descarga).
- La **garantía** la da el segundo mecanismo: leer `response.body` con un reader y cortar
  en cuanto el acumulado supera `maxBytes`. Un `Content-Length` es spoofable, así que no
  puede ser la única defensa.

`AbortSignal.timeout(timeoutMs)` sigue acotando la duración; el corte por tamaño debe
abortar la lectura también, no solo dejar de acumular.

_Alternativa considerada:_ confiar en `Content-Length`. Rechazada: es el header del
atacante. _Alternativa:_ leer todo y medir después (estado actual). Rechazada por
definición.

Efecto en pruebas: el harness de `spec-watch.test.mjs` sirve cuerpos con
`Content-Length` calculado, así que el pre-chequeo cubre la mayoría de los casos sin tocar
el doble; hace falta un caso nuevo que omita el header y sirva un cuerpo grande para
ejercitar el corte en stream.

### 4. Fallo del gate: documentar, no implementar rollback

`update-core.mjs` escribe vendorizados → manifiesto → gate; si el gate falla, hoy devuelve
exit 2 dejando el diff. Se decide **no** deshacer automáticamente y en cambio documentarlo
(`docs/testing.md` + `packages/sdk/schemas/README.md`) con el comando de recuperación
(`git checkout -- packages/sdk/schemas/`).

_Alternativa considerada:_ stage en directorio temporal y rename atómico. Rechazada por
ahora porque (a) el comando nunca commitea ni hace stage, así que `git` ya es el rollback,
(b) el fallo del gate es excepcional y siempre llega con un diff revisable a mano, y (c)
agregar staging duplica la lógica de escritura en un PR cuyo objetivo es cerrar hallazgos.
Queda registrado como mejor futura en Open Questions.

### 5. Orden del rebase: main primero, endurecimiento encima

1. Actualizar `main` local (está 5 commits detrás de `origin/main`, todavía viendo los
   reverts de #42/#43/#44).
2. `git rebase origin/main` sobre `feat/add-spec-watch-commands`. Los dos commits apilados
   con el contenido de #48/#49 deben volverse vacíos y caer solos; si quedan conflictos en
   `turbo.json`, `package.json`, `packages/sdk/schemas/README.md` o `manifest.json`,
   resolvemos hacia la versión de `main` (ya contiene ese contenido en squash) y
   conservamos intactos los archivos exclusivos del watcher
   (`scripts/spec-watch/**`, `scripts/run-script-tests.mjs`, `docs/testing.md`).
3. Commits de endurecimiento encima, uno por hallazgo, para que la revisión sea
   commit-by-commit.
4. Force-push con `--force-with-lease`.

`AGENTS.md` lleva el bloque gestionado por turbo; si el rebase lo deja duplicado o
desincronizado, se regenera con un comando de turbo en lugar de editarlo a mano.

## Risks / Trade-offs

- **Rechazar un nombre legítimo de Hacienda** (p. ej. si algún día publican un nombre con
  `%2E%2E`) → el guard solo deniega `/`, `\` y `..` después del decoding; los nombres con
  espacios, acentos y `(` siguen pasando. Cubierto con un caso de prueba que usa los
  nombres reales del set.
- **Un nombre rechazado se reporta como "sin cambios"** → nunca: el rechazo es un error
  operativo (exit 2) en `spec:check` y en `spec:update`, siguiendo la regla ya fijada de
  que una superficie hostil o rota nunca se lee como ausencia de deriva.
- **Conflicto residual en archivos compartidos del rebase** (`turbo.json`, `package.json`)
  → resolver hacia `main` y re-aplicar solo las entradas `spec:*`; se verifica con
  `pnpm verify` completo antes del push.
- **El corte en stream cambia la firma interna de lectura** → `getMeta`/`getBytes` siguen
  devolviendo `Buffer`; solo cambia cómo se obtiene. Los tests existentes que mockean
  `arrayBuffer()` deben migrar al cuerpo en stream (o aceptar ambos).
- **`Content-Length` incorrecto pero legítimo** → una respuesta que declare un tamaño
  mayor que el real se rechaza. Aceptable: un servidor que miente sobre su tamaño ya no es
  una superficie confiable para vendorizar.

## Migration Plan

1. Rebase (decisión 5) y `pnpm verify` para confirmar que el contenido apilado se canceló.
2. Commit por hallazgo: (a) rutas seguras, (b) `https:` en redirects, (c) `maxBytes`
   en stream, (d) docs del gate sin rollback.
3. `pnpm test:scripts` (los 32 tests del watcher + los 11 de `spec-verify`) y `pnpm verify`
   completo antes de push; force-push con `--force-with-lease`.
4. Responder al comentario de la revisión en PR #50 con lo aplicado y lo documentado.

_Rollback del propio cambio:_ cada commit es revertible por separado; el manifiesto y los
vendorizados no se tocan, así que no hay estado que restaurar fuera de `git`.

## Open Questions

- Cuando exista la fase 2 del job de drift (el job ejecutando `spec:update` sin supervisión
  humana), convendrá staging en directorio temporal + rename antes de que nadie dependa de
  un diff manual. Hoy no existe, así que se deja fuera.
