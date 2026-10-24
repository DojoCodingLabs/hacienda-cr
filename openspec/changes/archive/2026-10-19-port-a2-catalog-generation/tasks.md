## 1. Generador sobre el árbol vigente

- [x] 1.1 Portar `scripts/codes-generate/{generate.mjs,table-map.mjs}` al árbol de `main` y apuntarlos al `codes.json` vigente de `main` (set 2026).
- [x] 1.2 Declarar en el registro de parejas cada tabla→export con su clave y su tipo de desvío cuando aplique.
- [x] 1.3 Declarar la lista de aliases deprecados (alias, valor canónico, motivo) y excluirlos de la paridad de valor.
- [x] 1.4 Portar `scripts/codes-generate/codes-generate.test.mjs` y ajustarlo al `codes.json` de `main`.

## 2. Fachada de constantes

- [x] 2.1 Convertir `shared/src/constants/document-types.ts` y `tax-codes.ts` en fachada que reexporta `shared/src/generated/**`.
- [x] 2.2 Mover a la fachada los aliases deprecados y los códigos de estado/situación, conservando su API pública.
- [x] 2.3 Mantener en la fachada los mapas de nombres legibles curados (`DOCUMENT_TYPE_NAMES`, `IVA_RATE_NAMES`, `IDENTIFICATION_TYPE_NAMES`).
- [x] 2.4 Verificar que los 13 archivos que importan `shared/src/constants` siguen compilando sin cambios.

## 3. Candados

- [x] 3.1 Instalar la regla `no-restricted-syntax` de literales de 1–2 dígitos en el `eslint.config.mjs` de `main`.
- [x] 3.2 Declarar el allowlist con motivo por archivo y la exclusión de códigos compuestos y alfabéticos.
- [x] 3.3 Portar `scripts/codes-lint-lock/codes-lint-lock.test.mjs` y verificar que la regla queda demostrada.
- [x] 3.4 Conectar el candado 1 (deriva) a `scripts/verify.mjs` de `main` con el diff acotado a las rutas generadas.

## 4. Integración

- [x] 4.1 Añadir el script `spec:generate` y el de paridad al `package.json` de `main`.
- [x] 4.2 Correr `pnpm spec:generate -- --no-extract` y commitear el árbol generado resultante.
- [x] 4.3 Verificar que el tarball de `shared` no incluye `shared/src/generated/**` si no corresponde.

## 5. OpenSpec

- [x] 5.1 Verificar que `openspec validate port-a2-catalog-generation` pasa.
- [x] 5.2 Verificar que `openspec validate --specs` no presenta regresiones.

## 6. Puertas

- [x] 6.1 Ejecutar `pnpm verify` sobre el árbol resultante.
- [x] 6.2 Documentar el árbol de alias en el README del repo.
