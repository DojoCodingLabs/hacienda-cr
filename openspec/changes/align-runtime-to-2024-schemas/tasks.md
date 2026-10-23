## 1. Manifiesto y autoridad documentada

- [x] 1.1 Quitar la clave `nextSet` de `packages/sdk/schemas/manifest.json`, manteniendo `2026/v4.4` en `sets[]` y `currentSet: "2024/v4.4"`.
- [x] 1.2 Revisar `packages/sdk/src/__testing__/manifest.spec.ts` y `scripts/spec-watch/spec-watch.test.mjs` para que ningún fixture o aserción exija `nextSet`; ajustar solo lo que dependa del manifiesto real.
- [x] 1.3 Actualizar `packages/sdk/schemas/README.md`: 2024 autoritativo, 2026 referencia no adoptada, sin fecha de obligatoriedad; corregir la semántica de `currentSet`/`nextSet`.
- [x] 1.4 Cerrar la decisión en `docs/specs/v4-4-schema-provenance.md`: 2024 autoritativo, 2026 no adoptado, SDK embebe 2024 y no se afirma el 2026-11-01.
- [x] 1.5 Actualizar `docs/specs/v4.4-compliance.md` (2.1, 2.8 y estado de implementación) para describir 2024 como vigente y 2026 solo como referencia.

## 2. Runtime y build contra 2024

- [x] 2.1 Cambiar los imports de `packages/sdk/src/xml/schemas/index.ts` de `schemas/2026/v4.4/` a `schemas/2024/v4.4/`.
- [x] 2.2 Cambiar el valor por defecto de `validateAgainstXsd` en `packages/sdk/src/__testing__/xsd.ts` a `"2024"` y actualizar sus comentarios; conservar `"2026"` solo para pruebas negativas.
- [x] 2.3 Verificar que no quede ningún import ni default de runtime que apunte a `2026/v4.4` (incluido `catalog-alignment.spec.ts`).

## 3. Clave numérica

- [x] 3.1 Restringir `shared/src/schemas/clave.ts` a cédula y clave de solo dígitos (`\d{50}`); actualizar comentarios.
- [x] 3.2 Restringir `packages/sdk/src/clave/build-clave.ts` (`taxpayerId` de 1–12 dígitos) y `packages/sdk/src/clave/parse-clave.ts` a `\d{50}`.
- [x] 3.3 Actualizar `shared/src/schemas/factura.ts` y demás comentarios que afirmen clave alfanumérica.
- [x] 3.4 Ajustar `shared/src/schemas/clave.spec.ts` y las pruebas de `packages/sdk/src/clave/` para afirmar que una clave con letras se rechaza.

## 4. Referencias y API de sustitución

- [x] 4.1 Quitar `TipoDocReferencia` 19–20 de `shared/src/constants/document-references.ts` y de `REFERENCE_DOC_TYPES`.
- [x] 4.2 Quitar `CodigoReferencia` 13–16 de `REFERENCE_CODES` y el 17 de `REP_REFERENCE_CODES`; eliminar `CODIGO_REFERENCIA_PAGO_COMPROBANTE` si queda sin uso.
- [x] 4.3 Retirar `ExactFeReplacementInputSchema`, `ExactFeReplacementReferenceSchema`, `calculateExactFeReplacement`, `buildExactFacturaReplacementXml` y sus exports de `shared`/`packages/sdk`.
- [x] 4.4 Retirar el fixture y las pruebas de `exact-credit-extensions` que dependen del código 16; ajustar o eliminar `packages/sdk/src/documents/exact-fe-replacement-builder.ts`.
- [x] 4.5 Actualizar `shared/src/index.spec.ts` y cualquier prueba que afirme la presencia de 19/20, 13–17 o REP 17.

## 5. Pruebas de conformidad y rechazo

- [x] 5.1 Reescribir `packages/sdk/src/documents/xsd-conformance.integration.spec.ts`: aceptación solo contra 2024 y casos negativos que demuestren rechazo de clave alfanumérica y refs 13–17/19–20.
- [x] 5.2 Ajustar las pruebas de builders que iteran `["2024", "2026"]` para que la aceptación sea 2024 y, si aplica, 2026 solo como rechazo.
- [x] 5.3 Convertir o retirar `packages/sdk/src/xml/updates-2026.spec.ts`; ninguna prueba debe afirmar aceptación por defecto de una construcción 2026.
- [x] 5.4 Revisar las propiedades de clave en la suite de property-based y actualizar el generador para no producir cédulas alfanuméricas.

## 6. Changeset y verificación

- [x] 6.1 Añadir un changeset con bump **major** y notas de migración para clave alfanumérica, refs 13–17/19–20 y retiro de la sustitución con código 16.
- [x] 6.2 Ejecutar `pnpm spec:verify` y confirmar que el manifiesto sin `nextSet` sigue siendo válido.
- [x] 6.3 Ejecutar las pruebas afectadas (`pnpm test` o el filtro equivalente) y corregir cualquier expectativa que aún asuma 2026.
- [x] 6.4 Ejecutar `pnpm verify` completo y confirmar que la conformidad por defecto es 2024.
