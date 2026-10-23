## Why

`node-forge@1.4.0` conserva un advisory high sin parche publicado (`GHSA-86w9-cpqp-85rv`, ver issue #69 y `docs/forge-reachability-audit.md`). El SDK sólo usa forge para parsear PKCS#12 en `loadP12`, pero lo declara como dependencia runtime obligatoria: cualquier consumidor — incluido el MCP de sólo lectura, validadores y consumidores que nunca cargan un `.p12` — hereda el hallazgo en `npm audit --omit=dev`. Hoy la única mitigación es documentar que la ruta vulnerable (verificación RSA) no se ejecuta; eso no limpia el audit de terceros.

## What Changes

- Mover `node-forge` de `dependencies` a **peer dependency opcional** (`peerDependencies` + `peerDependenciesMeta.optional = true`) y declararlo en `devDependencies` para los tests del repo. No se usa `optionalDependencies`: se instala por defecto y no limpia el audit.
- `loadP12` resuelve forge de forma perezosa con `await import("node-forge")` y lanza un `SigningError` tipado, con mensaje accionable, cuando no está instalado. Sin cambios en la firma pública ni en el comportamiento cuando forge está presente.
- Agregar tests de comportamiento y de empaquetado: `loadP12` falla cerrado sin forge, sigue extrayendo llave/certificado con forge, y el manifiesto publicado no exige un parser PKCS#12 en la instalación.
- Documentar el opt-in (README del SDK, `MIGRATION.md` y `docs/forge-reachability-audit.md`) y actualizar la disposición del issue #69 sin cerrarlo.
- **BREAKING** para consumidores que llaman `loadP12` sin instalar `node-forge`: deben agregarlo explícitamente. Requiere changeset y nota de migración.

## Capabilities

### New Capabilities

- `p12-loading`: contrato del cargador de credenciales `.p12` — resolución opcional y perezosa de la dependencia, fallo tipado cuando falta, extracción sin cambios cuando está presente, y la invariante de empaquetado de que el SDK no exige un parser PKCS#12 al instalarse.

### Modified Capabilities

<!-- Ninguna: no existe spec vigente de `signing` con requisitos de carga de P12. -->

## Impact

- `packages/sdk/src/signing/p12-loader.ts` (import dinámico y error tipado)
- `packages/sdk/package.json` y `pnpm-lock.yaml` (peer opcional + devDependency)
- `packages/sdk/src/signing/p12-loader.spec.ts` y nuevo test de empaquetado/consumidor
- `scripts/verify-packages.mjs` y `pnpm test:packages` (verificar consumidor instalado sin forge)
- `packages/sdk/README.md`, `MIGRATION.md`, `docs/forge-reachability-audit.md`, `docs/security-hardening.md`
- Issue #69: se mantiene abierto como prerequisite rastreado; este cambio no lo cierra
- Sin cambios en `signXml`, XAdES, verificación de respuestas ni en el oráculo nativo
