# Tasks: fix-spec-watch-review-findings

## 1. Preparación y rebase

- [x] 1.1 Actualizar `main` local (`git fetch origin` + fast-forward) y verificar que ya
      no aparecen los reverts de #42/#43/#44
- [x] 1.2 Rebasear `feat/add-spec-watch-commands` sobre `origin/main`; confirmar que los
      commits apilados de #48/#49 se vuelven vacíos y caen, y resolver conflictos hacia la
      versión de `main` para los archivos compartidos (`turbo.json`, `package.json`,
      `packages/sdk/schemas/README.md`, `manifest.json`, `AGENTS.md`)
- [x] 1.3 Ejecutar `pnpm verify` tras el rebase para confirmar que el contenido apilado se
      canceló y la rama está en verde antes de tocar código

## 2. Rutas de escritura seguras (hallazgo 2)

- [x] 2.1 Denegar en el helper de nombre (`basenameOf()`/`safeBasename()` de
      `scripts/spec-watch/lib/util.mjs`) los segmentos que, tras `decodeURIComponent`,
      contengan `/`, `\` o `..`, con un error que nombre el origen
- [x] 2.2 Aplicar la misma denegación a los `knownFiles` de `probe.mjs` a través del helper
      compartido, eliminando la duplicación del regex actual
- [x] 2.3 Añadir en `update-core.mjs` la contención de la ruta resuelta bajo
      `packages/sdk/schemas/` antes de cada `writeFileSync` (incluido el del
      `manifest.json`), abortando la ejecución completa sin escribir nada si no se cumple
- [x] 2.4 Registrar regresiones en `scripts/spec-watch/spec-watch.test.mjs`: un `href` de
      ATV con `..%2F..%2F..%2Fevil.xsd` produce exit 2 sin escribir ni crear directorios
      fuera de `schemas/`, y los nombres reales del set (con espacios y acentos) siguen
      pasando

## 3. Canal de descarga acotado (hallazgos 3 y 4)

- [x] 3.1 Exigir `target.protocol === "https:"` en cada hop del loop de redirecciones de
      `http.mjs`, con error operativo que nombra el esquema rechazado
- [x] 3.2 Rechazar respuestas con `Content-Length` mayor que `maxBytes` antes de leer el
      cuerpo
- [x] 3.3 Reemplazar la lectura completa por un reader en stream con corte duro en
      `maxBytes` que aborte la lectura al superarlo, manteniendo las firmas actuales de
      `getText`/`getBytes`/`getMeta`
- [x] 3.4 Actualizar el doble de red de `spec-watch.test.mjs` para servir cuerpos en
      stream y añadir casos: redirect a `http:` rechazado, `Content-Length` excesivo
      rechazado sin descargar, cuerpo sin `Content-Length` cortado en el máximo

## 4. Documentación del gate sin rollback (hallazgo 5)

- [x] 4.1 Explicitar en `docs/testing.md` (sección "Spec watching commands") que el gate
      `spec:verify` corre después de escribir, que un fallo deja el diff en disco sin
      deshacerlo, y el comando de recuperación manual con `git`
- [x] 4.2 Añadir la misma nota en `packages/sdk/schemas/README.md`, junto a la semántica
      de `lastSyncedAt`

## 5. Verificación y cierre

- [x] 5.1 Ejecutar `pnpm test:scripts` y confirmar que los tests del watcher y de
      `spec-verify` pasan con los cambios nuevos
- [x] 5.2 Ejecutar `pnpm verify` completo (formato, lint, types, build, tests, paquetes
      instalados) y confirmar que `spec:verify` sigue OK con los 23 archivos
- [x] 5.3 Commitear por hallazgo con mensajes convencionales y hacer push con
      `--force-with-lease` a `feat/add-spec-watch-commands`
- [x] 5.4 Verificar en el PR #50 que los checks de CI vuelven a pasar y que el estado
      deja de ser `CONFLICTING`
