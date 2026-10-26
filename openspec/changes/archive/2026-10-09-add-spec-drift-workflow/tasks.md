# Tasks: add-spec-drift-workflow

## 1. Workflow base

- [x] 1.1 Crear `.github/workflows/spec-drift.yml` con `runs-on: ubuntu-latest`, `schedule` mensual (`0 12 1 * *` UTC = 06:00 Costa Rica), `workflow_dispatch`, `permissions: contents: read` + `issues: write` y `concurrency: { group: spec-drift, cancel-in-progress: false }` (nota: `schedule` solo corre en la rama por defecto; los forks no heredan el cron — comportamiento estándar, sin lógica extra).
- [x] 1.2 Añadir los pasos de setup: checkout, Node 22, `corepack enable`, `pnpm install --frozen-lockfile` (no hace falta instalar binarios extra: verificado que el camino de `spec:check` — `check-core.mjs` + imports — usa solo `node:*` y `fetch`, sin `child_process`; `xmllint` solo aplica a `pnpm verify`, que este job no corre).
- [x] 1.3 Ejecutar `pnpm spec:check` capturando el informe en un archivo y el código de salida en una variable sin abortar el paso (`set +e` / equivalente).

## 2. Ramificación por código de salida

- [x] 2.1 Rama 0: terminar success sin abrir ni comentar issues.
- [x] 2.2 Rama de fallo operativo: código 2 **y cualquier código distinto de 0 y 1** (p. ej. 127) → imprimir `spec:check falló con código <N>: <stderr>` (el canario siempre nombra la superficie) y salir **siempre con 2** — el código original va en el mensaje, no en el exit code; verificar que el veredicto `sin cambios` nunca se emite en esta rama.
- [x] 2.3 Rama 1: continuar al flujo de reporte (sección 3).

## 3. Reporte de deriva con deduplicación

- [x] 3.1 Calcular la huella SHA-256 del informe normalizado (trim de whitespace final por línea — el informe de `spec:check` no contiene timestamps, verificado en `report.mjs`) e incluirla en el issue como `<!-- spec-drift-fingerprint: <sha> -->`.
- [x] 3.2 Garantizar la etiqueta: `gh label create spec-drift --force --color B60304 --description "Hacienda spec drift detected by spec:check"` (`--force` reaplica la definición si el label ya existe con otro color/descripción; sin él, `gh label create` falla).
- [x] 3.3 Listar issues abiertos con la etiqueta `spec-drift`, extraer huellas con parser defensivo (cuerpos **sin** el marcador se ignoran, no fallan), y si hay match, `gh issue comment` con el informe actual en lugar de abrir issue nuevo.
- [x] 3.4 Sin match: `gh issue create --label spec-drift` con título fijo `[spec-drift] Deriva detectada en superficies de Hacienda`, cuerpo = informe completo + huella (truncado a ~60 KB con nota si excede; el íntegro queda en el log del job) y referencia a otros issues `spec-drift` abiertos si existen ("Relacionado con #N…").
- [x] 3.5 Envolver cada operación de `gh` (label, list, comment, create) con chequeo de su código de salida: ante fallo, error claro que name la operación y **exit 2** (no "distinto de 0": el código 1 significa "encontré deriva", no "fallé al reportar").
- [x] 3.6 Verificar el dedupe con issue cerrado **sin mocks**: en la prueba de 4.5 (deriva simulada), cerrar a mano el issue abierto, re-disparar `workflow_dispatch` en la misma rama y confirmar que se abre un issue **nuevo** (el `--state open` de la query excluye el cerrado).

## 4. Verificación y documentación

- [x] 4.1 Validar la sintaxis del workflow: `actionlint` si está disponible en el entorno; si no, revisión manual del YAML contra la documentación oficial de GitHub Actions (no existe un JSON schema público de workflows) y confirmar que ningún paso tiene permisos de escritura sobre `contents`.
- [x] 4.2 Documentar el job en `docs/testing.md` (sección de spec watching): cadencia (día 1, 06:00 CR), etiqueta `spec-drift`, que es fase 1 (reporte, no vendoriza), ejemplo concreto de reintento manual con `gh workflow run spec-drift.yml --ref <rama>`, y la nota de que un fallo del job (código 2) notifica por email solo al último editor del workflow según la configuración de GitHub — si el equipo quiere un canal más confiable, queda como backlog.
- [x] 4.3 Actualizar `packages/sdk/schemas/README.md`: el job mensual existe y reporta deriva; la semántica "última ejecución del job" de `lastSyncedAt` sigue pendiente hasta la fase 2 (`spec:update` en el job); y el efecto de reformatear el reporter de `spec:check` (huella nueva → un issue nuevo una vez aunque la deriva no cambie).
- [x] 4.4 Ejecutar `pnpm verify` y confirmar que el workflow nuevo no afecta CI existente (lint/types/build/tests siguen verdes).
- [x] 4.5 Antes del merge, disparar `workflow_dispatch` sobre una rama del repo principal y validar los tres caminos: `spec:check` con 0 (success sin issue); **deriva simulada modificando el manifiesto** (cambiar un carácter del `sha256` declarado de un archivo vigilado en `packages/sdk/schemas/manifest.json` en la rama de prueba — el remoto baja igual, el hash obtenido no coincide con el declarado → sección 2 del informe; NO alterar archivos vendorizados locales: `spec:check` compara remoto vs manifiesto, no local) — issue con huella y, en una segunda corrida, comentario en lugar de duplicado; y superficie inaccesible (fallo sin issues, sin "sin cambios").
- [x] 4.6 En la misma corrida de `workflow_dispatch`, confirmar que el runner de GitHub Actions alcanza las **tres** superficies de Hacienda; si alguna falla por WAF/CDN/IP, documentar el error, no mergear y coordinar con el tutor (runner propio o proxy) antes de reintentar.
