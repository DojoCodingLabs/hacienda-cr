## 1. Atribución de cobertura

- [ ] 1.1 Añadir `coverage.include: ["src/**/*.ts"]` y excluir specs y fixtures en `shared/vitest.config.ts`
- [ ] 1.2 Añadir el mismo `include`/`exclude` en `packages/sdk/vitest.config.ts`
- [ ] 1.3 Añadir el mismo `include`/`exclude` en `packages/cli/vitest.config.ts`
- [ ] 1.4 Añadir el mismo `include`/`exclude` en `packages/mcp/vitest.config.ts`
- [ ] 1.5 Añadir el mismo `include`/`exclude` en `packages/mock/vitest.config.ts`
- [ ] 1.6 Ejecutar la cobertura del SDK y confirmar que `coverage-summary.json` no tiene claves `dist/**` ni `__fixtures__/**` y que incluye todas las fuentes

## 2. Baseline inicial

- [ ] 2.1 Construir dependencias del workspace antes de medir (`pnpm build`)
- [ ] 2.2 Medir cobertura por paquete en Node 22 con `test:coverage` y registrar comando, fecha y valores en `design.md` (Context)
- [ ] 2.3 Confirmar que las fuentes antes no medidas de shared, CLI y MCP aparecen ahora en el reporte con su cobertura real

## 3. Specs propias de shared

- [ ] 3.1 Añadir spec para `shared/src/schemas/exact-fec.ts` con valores aceptados, rechazados y decimales exactos
- [ ] 3.2 Añadir spec para `shared/src/schemas/exact-fec-foreign-service.ts`
- [ ] 3.3 Añadir spec para `shared/src/schemas/exact-fec-used-personal.ts`
- [ ] 3.4 Añadir spec para `shared/src/schemas/exact-fe-replacement.ts`
- [ ] 3.5 Añadir spec para `shared/src/schemas/exact-nc-partial.ts`
- [ ] 3.6 Añadir spec para `shared/src/schemas/exact-party-name.ts` incluyendo límites de longitud y caracteres
- [ ] 3.7 Añadir spec para `shared/src/schemas/exact-recipient-message.ts`
- [ ] 3.8 Añadir spec para `shared/src/schemas/history.ts` incluyendo validación estricta de filtros previa a autenticación
- [ ] 3.9 Añadir spec para `shared/src/schemas/receptor.ts`
- [ ] 3.10 Confirmar que ningún spec nuevo duplica la cobertura existente de `exact-fe.spec.ts` ni del schema base

## 4. Outbox y orquestador contra fuentes del SDK

- [ ] 4.1 Añadir spec de `src/delivery/state-machine.ts` con transiciones válidas e inválidas, situación inmutable y coincidencia clave-situación
- [ ] 4.2 Añadir spec de `src/delivery/file-store.ts` con persistencia, lectura, actualización, reemplazo atómico, archivo corrupto y clave hostil
- [ ] 4.3 Ejercitar `submitAndWait` con `persist: true` y un almacén, verificando el orden persistir-antes-de-enviar y la transición final
- [ ] 4.4 Ejercitar `resumePending` y el reintento de documentos almacenados, verificando que solo se reintentan los estados reintentables
- [ ] 4.5 Sustituir `baseDir: "./.delivery-test-linkdown"` por `mkdtemp` y limpieza en `finally` en `packages/mock/src/sdk-e2e.spec.ts`
- [ ] 4.6 Ejecutar las suites de persistencia y confirmar que `git status` no gana archivos; no borrar el `.delivery-test-linkdown` preexistente

## 5. Handlers del CLI

- [ ] 5.1 Añadir un fixture del CLI que genere un `.p12` sintético en runtime con node-forge y PIN conocido
- [ ] 5.2 Ejecutar `run()` de `sign` con XML y `.p12` temporales, verificando lectura, firma y escritura
- [ ] 5.3 Ejecutar `run()` de `sign` sin PIN y verificar error y código de salida distinto de cero
- [ ] 5.4 Ejecutar `run()` de `lookup` con red mockeada y `configDir` temporal
- [ ] 5.5 Ejecutar `run()` de `status` con red mockeada y `configDir` temporal
- [ ] 5.6 Ejecutar `run()` de `switch` con perfiles temporales
- [ ] 5.7 Ejecutar `run()` de `draft` cubriendo éxito, error de validación y salida JSON
- [ ] 5.8 Capturar stdout/stderr y restablecer `process.exitCode` y `configDir` entre specs

## 6. Consumidor empaquetado

- [ ] 6.1 Añadir al contrato TypeScript del consumidor los exports del outbox
- [ ] 6.2 Añadir un smoke runtime del outbox empaquetado en `mkdtemp`: persistir, leer, transicionar y reintentar, con limpieza final

## 7. Umbrales definitivos

- [ ] 7.1 Repetir el baseline por paquete en Node 22 después de añadir los specs
- [ ] 7.2 Fijar thresholds globales de statements, branches, functions y lines en los cinco paquetes, redondeando 1–2 puntos por debajo de lo medido
- [ ] 7.3 Fijar thresholds por glob para clave, firma, entrega y schemas exact, más estrictos que el piso del paquete
- [ ] 7.4 Registrar en `design.md` los valores finales, el comando y la fecha de medición

## 8. Puerta de verificación

- [ ] 8.1 Reemplazar `test` por `test:coverage` en la invocación de Turbo dentro de `scripts/verify.mjs`
- [ ] 8.2 Quitar `coverage/**` de las salidas de la tarea `test` en `turbo.json`
- [ ] 8.3 Demostrar la falla: elevar temporalmente un umbral 1 punto, ejecutar `pnpm verify`, confirmar salida distinta de cero y revertir el cambio
- [ ] 8.4 Confirmar que una ejecución normal de `pnpm verify` termina en cero con los umbrales vigentes

## 9. Documentación

- [ ] 9.1 Actualizar `docs/testing.md` con la puerta, los comandos de medición y la distinción entre cobertura y conformidad fiscal
- [ ] 9.2 Actualizar `CONTRIBUTING.md` para dejar de presentar la cobertura como métrica solo informativa

## 10. Verificación final

- [ ] 10.1 Ejecutar `pnpm verify` completo en Node 22 y confirmar que pasa
- [ ] 10.2 Revisar el reporte por paquete y confirmar que no hay `dist/` ni fixtures y que los módulos críticos superan su umbral
- [ ] 10.3 Confirmar `git status` sin artefactos temporales ni certificados
- [ ] 10.4 Confirmar que no hay cambios de API pública, dependencias ni changeset necesario
