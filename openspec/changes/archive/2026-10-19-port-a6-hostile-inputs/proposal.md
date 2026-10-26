## Why

A6 (entradas hostiles) existe localmente con corpus de fuzzing, config de Stryker y un job de CI; `main` no tiene nada de eso, aunque sí tiene una regresión adversarial del advisory de `node-forge` (GHSA-86w9-cpqp-85rv) que este port **no debe duplicar**. Además, el brief exige que el job de deriva de A2 sea **semanal** y hoy tanto `main` como la línea local programs **mensual** (`0 12 1 * *`): una DoD incumplida que conviene cerrar en el mismo paso.

Al portar, el corpus debe apuntar a los módulos **reales** del árbol vigente (los nombres de archivo cambiaron: `tax/calculator.ts` es ahora el kernel legacy y el nuevo es `tax/exact-*.ts`).

## What Changes

- **Corpus de fuzzing portado**: casos estáticos de XXE, expansión de entidades, anidamiento profundo, contajes gigantes, XML truncado, UTF-8 inválido, CDATA con markup, atributos con markup falso y XInclude, ejecutados contra `validateDocumentXml`, `parseDocumentXml` y `signXml`.
- **Límites de entrada reutilizados**: el corpus verifica que `checkXmlInput` corta antes de cualquier parseo costoso.
- **Redacción de secretos en rutas de error**: se prueba que un secreto embebido en un payload hostil no aparece ni en el mensaje de error ni en el log.
- **Mutation testing** sobre los módulos de parsing e impuestos del árbol vigente, con score mínimo acordado y job de CI separado.
- **Job de deriva semanal**: el cron de `spec-drift` pasa de mensual a semanal, cerrando la DoD de A2 ("un job programado que re-descargue los XSD publicados cada semana").

**BREAKING**: ninguno.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `xml-hostile-inputs`: el corpus y el mutation testing pasan a apuntar a los módulos del árbol vigente, se cubre la redacción de secretos en rutas de error y se añade el calendario semanal del job de deriva.

## Impact

- **Código afectado**: `packages/sdk/src/xml/fuzzing.corpus.ts`, `packages/sdk/src/xml/fuzzing.spec.ts`, `packages/sdk/src/xml/hostile-inputs.spec.ts`, `packages/sdk/stryker.config.mjs`, `.github/workflows/mutation.yml`, `.github/workflows/spec-drift.yml`.
- **CI**: el mutation testing corre en su propio workflow (no ralentiza PRs); el corpus corre dentro de `pnpm verify`.
- **Cron**: `spec-drift` pasa a semanal; revisar el coste (descarga de XSD publicados) antes de activarlo.
- **Riesgo residual**: el advisory de `node-forge` no se re-implementa; se reutiliza la regresión adversarial de `main`.
