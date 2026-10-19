## Why

La fase 1 de `INDENT_Actualizacion_Facturacion.md` (secciones 5.3, 5.5 y 7) exige una verificación offline del build que detecte corrupción, omisiones o archivos no declarados en el árbol vendorizado de `packages/sdk/schemas/`. Hoy el árbol vendorizado y su `manifest.json` se generan una vez y luego solo se confían: una alteración de un byte, un XSD eliminado o un archivo suelto pasaría desapercibida hasta una falla en runtime o en el job mensual. Sin ese guardián, la fuente de verdad del manifiesto no está protegida.

## What Changes

- Nuevo comando de raíz `pnpm spec:verify` (`scripts/spec-verify.mjs`): lee `packages/sdk/schemas/manifest.json` y verifica, sin red y sin escribir, que cada archivo con `vendored: true` exista con el SHA-256 y el tamaño declarados, y que no exista ningún archivo bajo `packages/sdk/schemas/` que el manifiesto no declare (allowlist: `manifest.json`, `README.md`).
- Integración en el pipeline: el `build` del SDK (`packages/sdk`) ejecuta `spec:verify` antes de `tsup`, y `pnpm verify` lo ejecuta como paso propio.
- Mensajes de error con plantillas fijas: nombre de archivo, hash/tamaño esperado, obtenido cuando exista, y la salida sugerida (`git diff`; si el cambio es legítimo, actualizar `manifest.json` — `spec:update` llega en una fase posterior y no se sugiere como comando).
- Pruebas de regresión de script (`scripts/spec-verify.test.mjs`, `node --test`) que cubren los criterios de aceptación de la fase 1: pase en árbol íntegro, fallo al alterar un byte, fallo por archivo no declarado, fallo por archivo `vendored: true` ausente, fallo por manifiesto con campos de primer nivel inválidos y pase con una entrada `vendored: false` ausente.
- Sin cambios de API pública del SDK ni de paquetes publicados; sin Changeset.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `spec-integrity`: se añade la exigencia de que el build y `pnpm verify` ejecuten una verificación offline `spec:verify` que falle ante discrepancias entre `manifest.json` y el árbol de `packages/sdk/schemas/` (hash, tamaño, ausencia, archivos no declarados). La capacidad `spec-integrity` la introduce el cambio en vuelo `vendorize-policy-and-code-tables` (todavía no archivado en `openspec/specs/`); este cambio añade requirements sobre ella en la misma ruta.

## Impact

- **Nuevo:** `scripts/spec-verify.mjs`, `scripts/spec-verify.test.mjs`, entrada `spec:verify` en el `package.json` de raíz.
- **Modificado:** `scripts/verify.mjs` (paso `spec:verify`), `packages/sdk/package.json` (`build`: `spec:verify && tsup`).
- **Consumidores:** `pnpm build`, `pnpm verify`, CI y contribuidores locales; no afecta a consumidores npm del SDK publicado.
- **Fuera de alcance (fases 2 y 3 del INDENT):** regeneración/verificación de `codes.json` y tipos generados; verificación del digest de la política contra el PDF vendorizado y el SDK.
