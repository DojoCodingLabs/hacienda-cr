## Why

`hacienda-cr` mide cobertura con Vitest, pero no la exige: `pnpm verify` ejecuta
`turbo run … test`, cuyo script es `vitest run` sin `--coverage`, y
`coverage.thresholds` solo se evalúa cuando la cobertura está activa. Además la
medición del SDK incluye el bundle construido: `crash-harness.spec.ts` importa
`@dojocoding/hacienda-sdk` y `dist/` aporta el 47.8% de los statements medidos.
Sin atribución correcta ni puerta, la cobertura no impide regresiones donde el
error cuesta pérdida de secuencia u operación incompleta.

## What Changes

- Corregir la atribución: cada paquete declara `coverage.include: ["src/**/*.ts"]`
  y excluye specs y fixtures. En el SDK eso retira `dist/` y sube la medición de
  48.30% a 80.45% de statements en la referencia inicial.
- Medir un baseline reproducible por paquete en Node 22 (la versión de CI) y
  registrarlo con su comando y fecha.
- Añadir `coverage.thresholds` (statements, branches, functions, lines) por
  paquete, derivados del baseline y redondeados a la baja, con umbrales más
  estrictos por glob en módulos críticos.
- Hacer que `pnpm verify` falle por cobertura: reemplazar `test` por
  `test:coverage` en `scripts/verify.mjs` y corregir `turbo.json` para que `test`
  no declare salidas de cobertura que no produce.
- Añadir specs propias a los nueve schemas exact de `shared` que hoy no tienen
  (`exact-fec`, `exact-fec-foreign-service`, `exact-fec-used-personal`,
  `exact-fe-replacement`, `exact-nc-partial`, `exact-party-name`,
  `exact-recipient-message`, `history`, `receptor`).
- Ejercitar el outbox (`delivery`) y el camino persistente del orquestador desde
  specs del SDK, con escritura solo en directorios temporales y limpieza.
- Ejercitar `run()` de `sign`, `lookup`, `status`, `switch` y `draft` con red
  mockeada, salida capturada y `configDir` temporal; el `.p12` se genera en
  runtime porque los certificados están ignorados por git.
- Añadir al consumidor empaquetado un smoke runtime del outbox (persistencia,
  transición y reintento) en vez de una "cobertura" inexistente en tarballs.
- Documentar la puerta en `docs/testing.md` y `CONTRIBUTING.md`.
- No cambiar runtime, API pública, XSD, lógica de firma ni dependencias. Solo
  infraestructura de testing y métricas.

## Capabilities

### New Capabilities

- `testing/coverage`: atribución correcta de la cobertura por paquete, umbrales
  declarados y puerta de verificación offline que impide regresiones, con specs
  propios para módulos críticos que hoy solo se ejercitan de forma indirecta.

### Modified Capabilities

- (ninguno — no cambia comportamiento del dominio; el delta solo añade el
  contrato de la nueva capacidad)

## Impact

- `vitest.config.ts` de `shared/`, `packages/sdk/`, `packages/cli/`,
  `packages/mcp/` y `packages/mock/`.
- `scripts/verify.mjs`, `turbo.json` y `scripts/verify-packages.mjs`.
- `packages/sdk/src/delivery/`, `packages/sdk/src/api/orchestrator.ts`,
  `packages/cli/src/commands/` y `shared/src/schemas/`.
- `packages/mock/src/sdk-e2e.spec.ts` (aislamiento del outbox de prueba).
- `docs/testing.md` y `CONTRIBUTING.md`.
- Sin dependencias nuevas, sin cambios de API pública y sin changeset: los
  cambios no alteran artefactos publicados (`files` solo publica `dist`).
