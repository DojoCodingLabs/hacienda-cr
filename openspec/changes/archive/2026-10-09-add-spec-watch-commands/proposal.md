## Why

La fase 1 de `INDENT_Actualizacion_Facturacion.md` (secciones 5.4, 5.5 y 7) exige comparar las superficies oficiales declaradas en `manifest.json` contra lo vendorizado y detectar deriva de la especificación. Hoy el repo solo verifica offline lo que ya está en disco (`spec:verify`): nadie descubre que Hacienda publicó una versión nueva (4.5), reemplazó un archivo in place con la misma etiqueta, o añadió/eliminó un documento del set vigente. Sin `spec:check` no hay detección; sin `spec:update` la actualización sería una vendorización manual sin guardas.

## What Changes

- Nuevo comando de raíz `pnpm spec:check` (`scripts/spec-watch/`): **solo lectura** (red sí, escritura no). Descarga las superficies declaradas en el manifiesto por su `type`: la página ATV (`atv-page`) se lee por HTML, extrayendo los enlaces bajo `docs/esquemas/<año>/v<versión>/`, deduciendo la versión del **texto del enlace o de la ruta** (nunca de los `id` ni de los `title`) y comparándola numéricamente (`4.10 > 4.9`); OVi (`known-file-probe`) **no tiene listado parseable** (el portal es una SPA y `www.hacienda.go.cr/docs/` no enlaza los comprobantes), así que se sondea por `baseUrl` + `knownFiles[]` declarados en el manifiesto (HEAD → `Last-Modified`/`Content-Length` contra lo registrado; si difieren o falta línea base, GET + SHA-256). Reporta, en este orden: (1) versión nueva publicada, (2) hash distinto en un archivo del set vigente o declarado en una superficie `known-file-probe`, (3) archivo agregado o eliminado, (4) cambio en auxiliares con revisión humana prioritaria. Sale con código distinto de cero si hay diferencias o si el propio chequeo falla.
- **Canario** en `spec:check`: falla (no reporta "sin cambios") si el parseo de una superficie que enumera extrae cero enlaces o menos de un mínimo declarado (`MIN_LINKS`), si falta un archivo conocido del set vigente en su superficie de origen — incluidos `Codigodemoneda_V4.4` y `Codificacionubicacion_V4.4` —, o si en una superficie `known-file-probe` algún `knownFiles[]` no responde 200. También falla si una superficie declarada no es accesible. No consulta versiones anteriores a la vigente.
- Nuevo comando de raíz `pnpm spec:update` (`scripts/spec-watch/`): con red y **con escritura**, descarga el set vigente y los documentos declarados, actualiza los vendorizados de `packages/sdk/schemas/` y `manifest.json` (hash, tamaño, `downloadedAt`, `lastSyncedAt`), y **no commitea**: la revisión humana del diff precede al commit. Un cambio de set vigente solo ocurre con este comando explícito.
- Pruebas de regresión con fixtures sintéticos y HTTP mockeado (`scripts/spec-watch/*.test.mjs`, `node --test`), sin llamadas reales a Hacienda.
- `manifest.json`: la superficie `ovi` cambia de `type: "ovi-list"` a `type: "known-file-probe"` con `baseUrl` y `knownFiles[]` (los nueve XSD del set `2026/v4.4` que solo publica OVi). Es un cambio de vocabulario del manifiesto, no de sus sets ni de `currentSet`.
- Actualización de la pista de recuperación de `spec:verify`: con `spec:update` disponible, sugerirlo como camino soportado cuando el cambio es legítimo.
- Ajuste del README de `packages/sdk/schemas/`: la semántica de `lastSyncedAt` deja de ser "escritura manual" al existir `spec:update`.
- Sin cambios de API pública del SDK ni de paquetes publicados; `spec-watch` es tooling interno — sin Changeset.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `spec-integrity`: se añaden requirements para los comandos de vigilancia `spec:check` (solo lectura, informe ordenado, canario, sin versiones anteriores) y `spec:update` (escritura de vendorizados y manifiesto, sin commit, con revisión humana). Se modifica el requirement de vocabulario de superficies (`ovi-list` → `known-file-probe` con `baseUrl`/`knownFiles`), el requirement de formato estable/semánticas del README (`lastSyncedAt` ya no es solo escritura manual) y la pista de recuperación del requirement de `spec:verify` (sugiere `spec:update` cuando el cambio es legítimo).

## Impact

- **Nuevo:** `scripts/spec-watch/` (comandos y librería compartida, incluido el sondeo `known-file-probe`), pruebas `scripts/spec-watch/*.test.mjs`, entradas `spec:check` y `spec:update` en el `package.json` de raíz.
- **Modificado:** `packages/sdk/schemas/manifest.json` (superficie `ovi` → `known-file-probe`), `scripts/spec-verify.mjs` (pista de recuperación), `packages/sdk/schemas/README.md` (semántica de `lastSyncedAt`, comandos nuevos y por qué OVi es sondeo y no listado), `scripts/run-script-tests.mjs` si las pruebas nuevas no quedan cubiertas por su glob actual, `docs/testing.md`.
- **Consumidores:** contribuidores locales y el job mensual futuro (fuera de alcance aquí); no afecta a consumidores npm del SDK publicado. `pnpm verify` **no** ejecuta `spec:check` (requiere red).
- **Estado del árbol:** `scripts/spec-verify.mjs` y su test están sin commitear en el working tree (cambio `add-spec-verify` archivado sin commit); este cambio debe preservarlos y editarlos encima.
- **Fuera de alcance (resto de la fase 1):** el workflow mensual de GitHub Actions y la apertura/deduplicación de issues con etiqueta `spec-drift` (INDENT 5.4, "Aviso"); el diff estructurado de tablas de códigos y `codes.json` (fase 2, INDENT 5.6); la política de firma (fase 3, INDENT 5.7).
