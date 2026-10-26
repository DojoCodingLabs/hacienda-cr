## 1. Setup del paquete mock

- [x] 1.1 Crear `packages/mock/package.json` con bin `hacienda-mock`, scripts `build`, `test`, `lint`, `typecheck`. Nombre publicado `@dojocoding/hacienda-mock`: el release exige que todos los paquetes publicados compartan versión (`release-core.validateRelease`) y el grupo `linked` de changesets es `@dojocoding/*`.
- [x] 1.2 Crear `packages/mock/tsconfig.json` y `packages/mock/vitest.config.ts` (Node 22, ESM).
- [x] 1.3 Añadir `packages/mock` al workspace (`pnpm-workspace.yaml`) y a turbo (`turbo.json`).
- [x] 1.4 Crear `packages/mock/README.md` con quickstart y API.

## 2. Server core

- [x] 2.1 Implementar `createMockServer(options)` con Node `http` (sin deps externas).
- [x] 2.2 Implementar `POST /recepcion` con 201/400/401/409/429 y headers reales.
- [x] 2.3 Implementar `GET /recepcion/{clave}` con transiciones de estado.
- [x] 2.4 Implementar `POST /token` para auth offline.
- [x] 2.5 Implementar rate limiting real con presupuesto y headers `X-Ratelimit-*`.
- [x] 2.6 Implementar callback asíncrono con reintentos (3) y backoff.
- [x] 2.7 Implementar reset de estado por test.

## 3. Respuestas grabadas

- [x] 3.1 Crear `packages/mock/src/fixtures/` con respuestas sanitizadas de sandbox (5-10 casos).
- [x] 3.2 Implementar modo `record`/`replay` para capturar nuevas respuestas.
- [x] 3.3 Documentar el proceso de sanitización.

## 4. Integración con el SDK

- [x] 4.1 Añadir suite E2E del SDK contra el mock (`packages/sdk/src/api/mock-e2e.spec.ts` o equivalente).
- [x] 4.2 Documentar switch `HACIENDA_E2E_TARGET=mock|sandbox` y `HACIENDA_MOCK_URL`.
- [x] 4.3 Verificar que la suite corre en CI sin credenciales ni red.

## 5. Publicación

- [x] 5.1 Publicar `hacienda-mock` con README y quickstart. Preparado (metadata, `files`, bin, CHANGELOG y entrada en `packagePaths`); la publicación a npm ocurre en el release 1.0.0, no en este cambio.
- [x] 5.2 Añadir changeset `minor` para `hacienda-mock`.

## 6. OpenSpec

- [x] 6.1 Verificar que `openspec validate add-a7-hacienda-mock` pasa.
- [x] 6.2 Verificar que `openspec validate --specs` no presenta regresiones tras el cambio.

## 7. Puertas

- [x] 7.1 Ejecutar `pnpm verify` con el mock integrado.
- [x] 7.2 Ejecutar suite E2E contra el mock y documentar resultados.
