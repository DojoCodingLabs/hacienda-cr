## 1. Línea base

- [x] 1.1 Confirmar con `pnpm why node-forge` que el advisory entra sólo por `packages/sdk` y que el único import de producción es `packages/sdk/src/signing/p12-loader.ts`; registrar la salida.
- [x] 1.2 Ejecutar el test focalizado actual de `p12-loader` y dejar constancia del estado verde de partida.
- [x] 1.3 Confirmar que `@types/node-forge` está en `devDependencies` y que ni `P12Credentials` ni `packages/sdk/dist/index.d.ts` exponen tipos de `node-forge`.

## 2. RED — pruebas que deben fallar primero

- [x] 2.1 Crear `packages/sdk/src/signing/p12-loader-missing-dep.spec.ts` con un `vi.mock("node-forge", …)` que rechace la resolución; `vi.resetModules()` + import dinámico del loader; afirmar `SigningError`, mensaje con `node-forge` y el comando de instalación, y ausencia del PIN en el mensaje. Correrlo y confirmar que falla.
- [x] 2.2 Crear el spec de invariante de manifiesto: `node-forge` ausente de `dependencies`, presente en `peerDependencies`, `peerDependenciesMeta["node-forge"].optional === true`, y presente en `devDependencies`. Correrlo y confirmar que falla.
- [x] 2.3 En `scripts/verify-packages.mjs`, agregar un consumidor mínimo sin parser que importe el SDK, invoque `loadP12` y espere `SigningError` accionable, y que afirme que `node-forge` no está instalado en ese consumidor. Correr `pnpm test:packages` y confirmar que falla.

## 3. GREEN — implementación mínima

- [x] 3.1 Mover `node-forge` de `dependencies` a `peerDependencies` con `peerDependenciesMeta` opcional, y declararlo en `devDependencies`; mantener `@types/node-forge` en `devDependencies`.
- [x] 3.2 Reemplazar el import estático por una resolución perezosa memoizada a nivel de módulo, con interop CJS/ESM (`mod.default ?? mod`), que lance `SigningError` accionable cuando la resolución falle; no tocar la lógica de extracción ni las validaciones.
- [x] 3.3 Reconstruir el paquete y verificar con `grep` que el `.d.ts` emitido no menciona `node-forge`.
- [x] 3.4 Ajustar `scripts/verify-packages.mjs`: el consumidor que firma instala `node-forge` explícitamente (camino opt-in real) y el consumidor sin parser queda mínimo.
- [x] 3.5 Correr las tres pruebas de la sección 2 y confirmar que pasan.

## 4. Verificación de regresión

- [x] 4.1 Ejecutar el comando de test focalizado del SDK y confirmar cero fallos y cero tests nuevos omitidos.
- [x] 4.2 Ejecutar `pnpm test:packages` completo.
- [x] 4.3 Ejecutar `pnpm verify` completo.
- [x] 4.4 En el consumidor sin parser, comprobar `npm ls node-forge` vacío y `npm audit --omit=dev` sin el advisory.

## 5. Documentación y metadatos de release

- [x] 5.1 Actualizar `packages/sdk/README.md`: instalar `node-forge` es requisito sólo para quien carga `.p12`; mostrar el error accionable.
- [x] 5.2 Agregar nota de ruptura y remedio en `MIGRATION.md`.
- [x] 5.3 Actualizar `docs/forge-reachability-audit.md` y `docs/security-hardening.md`: el advisory sale del árbol por defecto, permanece para consumidores opt-in y el issue #69 sigue abierto.
- [x] 5.4 Agregar el changeset `minor` de `@dojocoding/hacienda-sdk` describiendo el opt-in y la acción requerida.
- [x] 5.5 Formatear sólo los archivos tocados (no el repositorio completo).

## 6. Cierre

- [x] 6.1 Revisar `git status` y stagear sólo los archivos del cambio, incluido `dist/` reconstruido si está versionado; no tocar artefactos ajenos.
- [x] 6.2 Si se autoriza explícitamente, dejar un comentario de estado en el issue #69 sin cerrarlo; sin autorización, sólo registrar la propuesta en el resumen del cambio.
- [x] 6.3 Confirmar que no se ejecutó ninguna publicación npm y dejar constancia de que publicar requiere autorización separada.
