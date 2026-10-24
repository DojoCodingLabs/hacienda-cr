## 1. Corpus de fuzzing estático

- [x] 1.1 Crear `packages/sdk/src/xml/fuzzing.corpus.ts` (o equivalente) con el array de casos hostiles: XXE, entity expansion, deep nesting, contajes gigantes, XML truncado, UTF-8 inválido, CDATA con markup, atributos con markup falso, XInclude, namespaces extraños.
- [x] 1.2 Crear `packages/sdk/src/xml/fuzzing.spec.ts` que itere el corpus y exija fallo tipado (`ValidationError`/`SigningError`) en `validateDocumentXml`, `parseDocumentXml` y `signXml`, sin crashes ni leaks.
- [x] 1.3 Verificar que cada caso devuelve un error con el mensaje esperado (DOCTYPE, element limit, nesting, malformed, etc.).

## 2. XXE y entity expansion

- [x] 2.1 Añadir test de `billion-laughs` con expansión recursiva y asserts de que `checkXmlInput` devuelve el mensaje correcto.
- [ ] 2.2 Verificar que `parseDocumentXml` y `signXml` rechazan entidades externas (no resuelven archivos ni red).
- [ ] 2.3 Verificar que `processEntities` de `fast-xml-parser` no expande entidades internas (configuración segura).

## 3. Redacción de secretos en rutas de error

- [x] 3.1 Extender `logging/security.spec.ts` con helper que capture `stderr` de `validateDocumentXml`, `parseDocumentXml`, `signXml`, `loadP12` con inputs hostiles + secreto.
- [x] 3.2 Asegurar que `ValidationError` y `SigningError` no incluyan el payload original ni rutas de archivo.
- [x] 3.3 Verificar que el logger redacta secretos en todas las rutas de error (parsing, validación, firma, carga de cert.).

## 4. Mutation testing

- [x] 4.1 Añadir dependencias `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`, `@stryker-mutator/typescript-checker` como devDeps.
- [x] 4.2 Crear `packages/sdk/stryker.conf.json` (o `.mjs`) con `mutate` limitado a `parser.ts`, `xml/*.ts`, `calculator.ts`.
- [x] 4.3 Configurar umbrales: `high: 80`, `low: 70`, `break: 60` (ajustar según baseline).
- [x] 4.4 Añadir script `pnpm test:mutation` en raíz.
- [ ] 4.5 Integrar mutation en job separado de CI (GitHub Actions).

## 5. Fuzzing dinámico

- [x] 5.1 Añadir `fast-check` dinámico en `fuzzing.spec.ts` para generar XML hostil (tamaño, profundidad, encoding) con seeds fijos.
- [x] 5.2 Verificar que no cuelga ni lanza error crudo (budget modesto en PRs).
- [x] 5.3 Documentar el presupuesto y el seed en el spec.

## 6. Integración y documentación

- [x] 6.1 Integrar fuzzing estático en `pnpm verify` (target de vitest).
- [x] 6.2 Documentar en `packages/sdk/README.md` los límites de entrada, el corpus y cómo correr fuzz/mutation.
- [x] 6.3 Formatear únicamente los archivos tocados por este cambio.

## 7. OpenSpec

- [x] 7.1 Verificar que `openspec validate add-a6-hostile-inputs` pasa.
- [x] 7.2 Verificar que `openspec validate --specs` no presenta regresiones tras el cambio.

## 8. Puertas

- [x] 8.1 Ejecutar `pnpm verify` y documentar budget/tiempos.
- [ ] 8.2 Ejecutar `pnpm test:mutation` y documentar score baseline.
