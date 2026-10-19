## 1. Corpus de fuzzing

- [ ] 1.1 Portar `packages/sdk/src/xml/fuzzing.corpus.ts` con los casos hostiles (XXE, entity expansion, deep nesting, contajes gigantes, truncado, UTF-8 inválido, CDATA, atributos falsos, XInclude, namespaces).
- [ ] 1.2 Portar `fuzzing.spec.ts` y ejecutarlo contra validación XSD, parser de documentos y firma.
- [ ] 1.3 Declarar el error esperado por caso y comprobar que el límite se aplica antes del parseo costoso.

## 2. Redacción de secretos

- [ ] 2.1 Portar `hostile-inputs.spec.ts` y capturar `stderr` de las rutas con un secreto embebido.
- [ ] 2.2 Verificar que ni el mensaje de error ni el log contienen el secreto.
- [ ] 2.3 Cerrar cualquier fuga encontrada antes de dar por verde el requisito.

## 3. Mutation testing

- [ ] 3.1 Añadir las devDependencies de Stryker.
- [ ] 3.2 Crear `packages/sdk/stryker.config.mjs` apuntando al parser de documentos, los módulos de XML y el kernel decimal del árbol vigente.
- [ ] 3.3 Fijar umbrales (70 % inicial, 80 % ideal) y registrar el score baseline.
- [ ] 3.4 Crear `.github/workflows/mutation.yml` con el job separado.

## 4. Deriva semanal

- [ ] 4.1 Cambiar el cron de `spec-drift` de mensual a semanal, con el comentario que explique la DoD de A2.
- [ ] 4.2 Verificar que el job sigue siendo de sólo lectura y que un fallo operativo no reporta "sin cambios".

## 5. OpenSpec

- [ ] 5.1 Verificar que `openspec validate port-a6-hostile-inputs` pasa.
- [ ] 5.2 Verificar que `openspec validate --specs` no presenta regresiones.

## 6. Puertas

- [ ] 6.1 Ejecutar `pnpm verify` con el corpus dentro.
- [ ] 6.2 Ejecutar `pnpm test:mutation` y documentar el score.
