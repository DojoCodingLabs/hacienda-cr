## 1. Portar el paquete al árbol de destino

- [x] 1.1 Portar `packages/mock/src/server.ts` y su suite al árbol de destino, sin dependencias de runtime.
- [x] 1.2 Migrar el mock al SDK del árbol de destino: usar sus tipos y funciones públicas en vez de duplicar la lógica de dominio.
- [x] 1.3 Adaptar las respuestas grabadas al formato vigente de `MensajeHacienda` y a montos en texto decimal acotado.
- [x] 1.4 Publicar el barrel del paquete (`@dojocoding/hacienda-mock`) con su API pública.

## 2. Release como quinto paquete

- [x] 2.1 Añadir `packages/mock` a `packagePaths` en `scripts/package-artifacts.mjs`.
- [x] 2.2 Actualizar la validación de versión compartida (`scripts/release-core.mjs` y el grupo `linked` de changesets) para los cinco paquetes.
- [x] 2.3 Actualizar `scripts/verify-packages.mjs`: 5 tarballs y un consumidor que importe el mock.
- [x] 2.4 Verificar que el tarball del mock no arrastra dependencias de workspace (`dependencies: {}`, sólo devDependencies).

## 3. CLI y E2E

- [x] 3.1 Exponer la CLI `hacienda-mock` para levantar el servidor como proceso aparte.
- [x] 3.2 Apuntar la suite E2E del SDK al mock por defecto (`HACIENDA_E2E_TARGET=mock`, `HACIENDA_MOCK_URL`).
- [x] 3.3 Verificar que la suite E2E corre sin credenciales ni red.

## 4. Documentación

- [x] 4.1 Actualizar `docs/releasing.md` y `docs/architecture.md` para cinco paquetes.
- [x] 4.2 Documentar que el mock es de desarrollo y no sustituye la prueba contra el sandbox real.

## 5. OpenSpec

- [x] 5.1 Verificar que `openspec validate port-a7-hacienda-mock` pasa.
- [x] 5.2 Verificar que `openspec validate --specs` no presenta regresiones.

## 6. Puertas

- [x] 6.1 Ejecutar `pnpm verify` y la suite E2E contra el mock.
- [x] 6.2 Ejecutar la verificación de paquetes publicados con los cinco tarballs.
