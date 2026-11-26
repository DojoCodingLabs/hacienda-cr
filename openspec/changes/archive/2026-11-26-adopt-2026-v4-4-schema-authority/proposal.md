# Declarar `2026/v4.4` como autoridad de esquema vigente

## Why

El manifiesto seguía declarando `currentSet: "2024/v4.4"` con `2026/v4.4` como
`nextSet` (`effectiveFrom: "2026-11-01"`), aunque esa fecha ya pasó y el build
del SDK ya embebe los XSD de 2026. El registro de procedencia (#118) dejó la
autoridad de `2026/v4.4` como decisión abierta porque ATV no lo publicaba. Las
fuentes primarias la cierran: el comunicado de Hacienda
`ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf` (2026-04-21) exige los
códigos nuevos "a partir del 1.º de noviembre" y remite a OVi; el PDF oficial de
Anexos lleva la "Bitácora de Ajustes al 22/04/2026"; y los nueve XSD que sirve
OVi hoy son byte a byte los de `2026/v4.4/`. ATV, el portal heredado, responde
404 por cada archivo de `2024/v4.4`, lo que además hacía abortar `spec:check`.
Recupera la parte útil del PR #120, cuya premisa (volver a 2024) era incorrecta.

## What Changes

- `manifest.json`: `currentSet: "2026/v4.4"`, sin `nextSet`; `2024/v4.4` queda
  en `sets[]` como set previo. El set 2026 registra `effectiveFrom` y
  `authority` (URLs, SHA-256 y fecha de comprobación de las fuentes primarias);
  sus XSD registran `lastModified`.
- Campo opcional `codesSet` (default `currentSet`): el set que lee
  `codes:extract`, fijado en `2024/v4.4` porque solo ese set tiene los
  auxiliares vendorizados. `codes.json` registra `codesSet` en lugar de
  `currentSet`.
- `spec:verify` valida además `currentSet` no `policyOnly`, la coherencia de
  `nextSet` y `codesSet`.
- `spec:check`/`spec:update` solo descargan y comparan el set vigente (y la
  política de firma); un set previo que su superficie ya no sirve no aborta la
  comprobación, y su `downloadedAt` no avanza.
- Prueba golden del SDK: `currentSet`, ausencia de `nextSet`, hashes de los
  nueve XSD de 2026 fijados en la prueba y set embebido = `currentSet`.
- Registro de procedencia y cumplimiento: decisión de #118 cerrada.
- Textos de usuario: error de clave de `hacienda status`, descripción y regla de
  `proveedorSistemas` en las herramientas MCP `create_invoice` y
  `create_invoice_exact` (alfanumérico 9–20).
- `ProveedorSistemas` en la CLI: `provider_id` opcional en el perfil
  (`hacienda auth login --provider-id`); `hacienda draft` lo usa y, si falta,
  conserva la identificación del emisor con una advertencia.

## Impact

- Specs: `spec-integrity` (manifiesto y procedencia), `codes-extraction`.
- Código: `scripts/spec-verify.mjs`, `scripts/spec-watch/lib/{analyze,update-core}.mjs`,
  `scripts/codes-extract/`, `packages/sdk/src/config/types.ts`,
  `packages/cli/src/{commands/draft.ts,commands/status.ts,commands/auth/*,utils/provider-id.ts}`,
  `packages/mcp/src/tools/create-invoice*.ts`.
- Sin cambios en bytes vendorizados ni en el runtime de validación XML.
