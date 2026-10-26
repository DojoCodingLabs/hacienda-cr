## Why

El SDK parsea XML de otras personas (facturas entrantes, respuestas de Hacienda) y expone un parser público (`parseDocumentXml`). Hoy el blindaje es parcial: hay límites de entrada y un test de XXE, pero no existe un corpus de fuzzing versionado, no se prueba la expansión de entidades o el `billion-laughs`, y no hay mutation testing sobre los módulos de parsing e impuestos. A6 convierte esa superficie en algo verificable y repetible en CI.

## What Changes

- **Corpus de fuzzing versionado** en el repo (`packages/sdk/src/xml/fuzzing.corpus.ts` o equivalente) con casos estáticos (XXE, entity expansion, deep nesting, huge counts, truncated, bad UTF-8, CDATA con markup, quoted attributes) y un spec que itera el corpus y exige fallo tipado (`ValidationError`/`SigningError`) sin crashes ni leaks.
- **Fuzzing dinámico** con `fast-check` sobre tamaños, profundidades, encodings y asserts de no-cuelgue ni error crudo (budget modesto en PRs).
- **Completar XXE y entity expansion** con prueba explícita de `billion-laughs` y verificación de que `checkXmlInput` devuelve el mensaje correcto; extender la matriz a `parseDocumentXml` y `signXml`.
- **Redacción de secretos en rutas de error**: extender `logging/security.spec.ts` con helper que capture `stderr` de `validateDocumentXml`, `parseDocumentXml`, `signXml`, `loadP12` con inputs hostiles + secreto y asserts de que el secreto no aparece en `Error.message` ni en logs.
- **Mutation testing** con Stryker (o equivalente) limitado a `packages/sdk/src/documents/parser.ts`, `packages/sdk/src/xml/*.ts` y `packages/sdk/src/tax/calculator.ts`, con score mínimo acordado (sugiero 70 % inicial, 80 % ideal), ejecutado en un job separado de CI.
- **Configuración y scripts**: `pnpm test:fuzz`, `pnpm test:mutation`, integración en `pnpm verify` (fuzz) y job CI (mutation).
- **Documentación**: README con los límites de entrada, el corpus y cómo correr fuzz/mutation.

**BREAKING**: ninguno; solo endurecimiento y tests.

## Capabilities

### New Capabilities

- `xml-hostile-inputs`: blindaje del SDK contra entradas XML hostiles (XXE, entity expansion, límites de tamaño/profundidad, redacción de secretos y mutation testing) con corpus versionado y puertas en CI.

### Modified Capabilities

Ninguna. A6 sólo añade tests y endurecimiento; no cambia contratos de entrada ni constructores.

## Impact

- **Código afectado**: `packages/sdk/src/xml/*` (security.spec, fuzzing corpus, mutation config), `packages/sdk/src/documents/parser.ts` (límites), `packages/sdk/src/logging/security.spec.ts`, `scripts/verify.mjs`, `package.json` (scripts/devDeps).
- **Dependencias**: añadir `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`, `@stryker-mutator/typescript-checker` como devDeps (mutation).
- **Validación offline**: el fuzzing corre con `xmllint-wasm` y `fast-check`; no requiere red ni credenciales.
- **CI**: el corpus estático corre en `pnpm verify`; mutation en job separado para no ralentizar PRs.
- **Riesgo residual**: mutation puede generar falsos positivos por límites de `xmllint-wasm` (64 MiB); se documenta el scope limitado y los umbrales iterativos.
