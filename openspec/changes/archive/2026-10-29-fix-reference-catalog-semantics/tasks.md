## 0. Verificación de prerrequisitos

- [x] 0.1 Verificar que `decodeInfoRef`, `parseClave` y `validateDocumentIdentity` existen con la firma asumida; ajustar tasks si difieren.
- [x] 0.2 Auditar consumidores de `DecimalReferenceSchema` por `.strict()` o `.shape` explícitos (contrato ZodEffects); ajustar si existen.

## 1. Esquema base de referencia y variante REP

- [x] 1.1 Extraer `InformacionReferenciaObject = z.object({...}).strict()` en `shared/src/schemas/factura.ts` y definir `InformacionReferenciaSchema = InformacionReferenciaObject.superRefine(refineReferenceConditions)` (sin segundo `.strict()`).
- [x] 1.2 Implementar `refineReferenceConditions` con: (a) `tipoDoc === "99"` ⇔ `tipoDocOtros` presente (`z.string().min(5).max(100)`); (b) `codigo === "99"` ⇔ `codigoOtros` presente (`z.string().min(5).max(100)`). `codigo` permanece opcional para todo `tipoDoc` (XSD: `Codigo minOccurs="0"`); la condición (c) (obligatorio salvo `tipoDoc === "13"`) se descartó por no tener respaldo en el XSD ni en los Anexos 2026 (ver D8). (Sin refine de trim: se alinea con el XSD, que solo exige 5–100 caracteres.)
- [x] 1.3 Definir `RepInformacionReferenciaSchema = z.object({...}).strict().superRefine(refineReferenceConditions)` en `shared/src/schemas/factura.ts` con `tipoDoc: z.enum(REFERENCE_DOC_TYPES)` (mismo enum que el base: el XSD del REP admite todos los TipoDoc) y `codigo: z.enum(REP_REFERENCE_CODES).optional()` (opcional: el refine (c) lo exige salvo tipoDoc 13). No hay `REP_REFERENCE_DOC_TYPES` separada; el XSD del REP no restringe tipos de documento.
- [x] 1.4 Actualizar `shared/src/schemas/decimal-fields.ts`: `DecimalReferenceSchema = InformacionReferenciaSchema` y añadir `DecimalRepReferenceSchema = RepInformacionReferenciaSchema`.
- [x] 1.5 Actualizar `shared/src/types/documents.ts`: definir `RepInformacionReferencia extends Omit<InformacionReferencia, "codigo"> { codigo?: RepReferenceCode }`; `ReciboElectronicoPago.informacionReferencia` mantiene tipo base `InformacionReferencia[]` (TS covariancia: `RepReferenceCode` incluye "17", no es subtipo de `ReferenceCode`; la regla REP se impone en runtime vía Zod schema).
- [x] 1.6 Actualizar `shared/src/schemas/decimal-document.ts`: el esquema REP fuente y calculado usan `DecimalRepReferenceSchema`.

## 2. SDK: validador, builder y parser

- [x] 2.1 En `packages/sdk/src/xml/validator.ts`, espejar 99↔Otros en el loop de `informacionReferencia` (`codigo` no se exige para ningún `tipoDoc`).
- [x] 2.2 En `packages/sdk/src/xml/validator.ts`, exigir `codigoTarifaIVA` para los impuestos `"01"` y `"07"`; aplicar correspondencia `tarifa === IVA_RATE_PERCENTAGES[codigoTarifaIVA]` **solo** para `"01"`; exigir `factorCalculoIVA` para `"08"`; verificar que la prohibición de tarifas transitorias 05/06/07 para FE nueva siga vigente y añadir test de regresión en Task 5.2.
- [x] 2.3 Asegurar rechazo de `codigo === "17"` fuera de REP en el validador (no confundir con `tipoDoc === "17"`, que es válido en documentos no-REP, típicamente NC/ND referenciando una NC de FEC), tanto para inputs Zod como para XML parseado. Si ya existe, añadir un test de regresión; si no, implementarlo.
- [x] 2.4 En `packages/sdk/src/documents/parser.ts`, parametrizar `decodeInfoRef(o, rep?)` para tipar `codigo` como `RepReferenceCode` cuando `rep === true`. (Tipo de retorno se mantiene `InformacionReferencia` por covariancia del array en ReciboElectronicoPago; la regla REP se impone en runtime vía Zod schema.)
- [x] 2.5 Verificar que `buildReciboPagoXml` emite `CodigoReferenciaOTRO` solo si `codigoOtros` está presente y acepta `codigo = "17"`.
- [x] 2.6 Verificar que `validateDocumentIdentity` existe en `packages/sdk/src/xml/document-identity.ts` y que `validateFacturaInput` lo invoca; si no existe, añadir la corrección antes de cerrar el ítem 1 del audit.

## 3. Documentación de procedencia

- [x] 3.1 Reescribir el bloque de comentarios de `shared/src/constants/document-references.ts` con la procedencia real (XSD 2026 trae 19/20 y 13–16; `codes.json` sigue en 2024 por falta de auxiliares).
- [x] 3.2 Reescribir el comentario de `scripts/codes-generate/table-map.mjs` con la misma procedencia real.

## 4. Candados de integridad

- [x] 4.1 Crear `packages/sdk/src/xml/reference-catalog.spec.ts`: paridad `REFERENCE_DOC_TYPES` ⇔ TipoDocReferenciaType (base+REP), `REFERENCE_CODES` ⇔ base CodigoReferenciaType, `REP_REFERENCE_CODES` ⇔ REP CodigoReferenciaType (base + "17"); fallback si base contiene "17". (Comprobación de excepción tipoDoc 13 eliminada: el XSD vendorizado no documenta esa excepción en texto; comportamiento se cubre en Task 5.1.)
- [x] 4.2 Crear `scripts/check-no-expected-failures.mjs` (usa `node:fs/promises.glob`, disponible en Node 24) y engancharlo en `scripts/verify.mjs`.
- [x] 4.3 Crear `packages/sdk/src/__fixtures__/fixtures.spec.ts` que recorra los fixtures publicados en `packages/sdk/src/__fixtures__/*.ts` y en specs con claves hardcodeadas conocidas (`known-integrity-gaps.spec.ts`), excluyendo transport fixtures con claves opacas (documentados con comentario), y verifique coherencia clave↔documento (emisor, tipo, fecha, consecutivo). Antes de añadir el spec, corregir `SIMPLE_INVOICE` (regenerar clave coherente con `fechaEmision` y emisor) para que la suite quede en verde; documentar en el commit qué fixtures quedan excluidos y por qué.

## 5. Tests de reglas

- [x] 5.1 Ampliar `shared/src/schemas/factura.spec.ts`: 99 sin Otros falla; Otros sin 99 falla; ambos válidos; cualquier `tipoDoc` sin `codigo` es válido (XSD: `Codigo minOccurs="0"`); REP acepta 17; REP admite solo los `tipoDoc` permitidos por el XSD del REP; FE rechaza 17. (Sin casos de trim: el esquema se alinea con el XSD, solo min/max 5–100.)
- [x] 5.2 Ampliar `packages/sdk/src/xml/validator.spec.ts`: 99 sin Otros; 07 con `codigoTarifaIVA` ausente; 08 sin factor; 17 fuera de REP; regresión de prohibición de tarifas transitorias 05/06/07 para FE nueva (si preexistente). (`codigo` no se exige para ningún `tipoDoc`.)
- [x] 5.3a Añadir test de builder REP con codigo=17 que emita XML y pase XSD 2026.
- [x] 5.3b Añadir test de builder REP con codigo=99 y codigoOtros presente que emita `CodigoReferenciaOTRO` y pase XSD 2026.
- [x] 5.3c Añadir test de builder FE con tipoDoc=99 que emita `TipoDocRefOTRO` y pase XSD 2026.
- [x] 5.4 Crear un Changeset (`pnpm changeset` o archivo manual en `.changeset/`) para `@dojocoding/hacienda-shared` y `@dojocoding/hacienda-sdk` con semver **minor** (breaking para pre-1.0: endurece input aceptado), justificado en el cuerpo con las tres condiciones que ahora se rechazan y remisión a la propuesta. No usar `patch`.
- [x] 5.5 Añadir sección a `MIGRATION.md` (o `packages/sdk/MIGRATION-v4.4.md`) con las dos condiciones rechazadas (99 sin Otros, Otros sin 99) y el rechazo de `codigo === "17"` fuera de REP, más snippet de corrección de input.

## 6. Verificación

- [x] 6.1 Ejecutar `pnpm --filter @dojocoding/hacienda-shared test`.
- [x] 6.2 Ejecutar `pnpm --filter @dojocoding/hacienda-sdk test`.
- [x] 6.3 Ejecutar `pnpm typecheck`.
- [x] 6.4 Ejecutar `pnpm lint`.
- [x] 6.5 Ejecutar `pnpm verify`.
- [x] 6.6 Ejecutar `pnpm spec:verify` (pasó dentro de `pnpm verify`).
- [x] 6.7 Validar el change con `openspec validate fix-reference-catalog-semantics` → `Change 'fix-reference-catalog-semantics' is valid`.
