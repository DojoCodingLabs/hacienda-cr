## Context

`InformacionReferenciaSchema` en `shared/src/schemas/factura.ts` es un `z.object` plano: los campos `tipoDocOtros` y `codigoOtros` son opcionales sin condición. El XSD v4.4 los documenta como obligatorios solo cuando el código correspondiente es `"99"`, pero el esquema no lo impone. El patrón de refinación bicondicional ya existe en `shared/src/schemas/exact-fec.ts` (`ExactFecReferenceSchema`) y sirve de referencia.

Los catálogos de referencias (`REFERENCE_DOC_TYPES`, `REFERENCE_CODES`, `REP_REFERENCE_CODES`) en `shared/src/constants/document-references.ts` están curados a mano y coinciden con el XSD 2026, pero no hay test que lo verifique. `codes.json` sigue anclado al set 2024 porque `scripts/codes-extract/extract.mjs` exige auxiliares (ANEXOS, Codigodemoneda, Codificacionubicacion) no presentes en el set 2026; por eso los catálogos de referencias no se regeneran todavía.

`ReciboElectronicoPago` usa `InformacionReferencia` y por tanto no puede expresar el motivo `"17"` que el XSD del REP admite. El validador de negocio (`validateFacturaInput`) solo cruza `tarifa` con `codigoTarifaIVA` cuando `tax.codigo === TaxCode.IVA` (`"01"`); los códigos `"07"` y `"08"` no se verifican.

## Goals / Non-Goals

**Goals:**

- Imponer las condiciones "99 → Otros" en el esquema base, en el validador de negocio y en el builder/parser de REP.
- Permitir el motivo 17 en REP y rechazarlo en documentos no-REP.
- Exigir presencia de `codigoTarifaIVA` para `"01"` y `"07"`, correspondencia `tarifa === IVA_RATE_PERCENTAGES[codigoTarifaIVA]` solo para `"01"`, y exigir `factorCalculoIVA` para `"08"`.
- Añadir un candado de paridad entre las constantes de referencias y los XSD 2026 vendorizados.
- Añadir guardas de suite: anti-`.fails` y coherencia de claves de fixture.

**Non-Goals:**

- No se regenera `codes.json` ni se flippa `manifest.json` al set 2026 (deuda documentada: faltan auxiliares del set 2026).
- No se añaden reglas de tarifa para impuestos no-IVA (02, 03, 04, 05, 06).
- No se tocan los esquemas exact (`exact-fec`, `exact-nc`, etc.) que ya tienen su refinación.

## Decisions

### D1 — Refinación sobre objeto estricto, no sobre `z.object` plano

`InformacionReferenciaSchema` se define como `InformacionReferenciaObject.strict().superRefine(refineReferenceConditions)`, manteniendo el `.strict()` para rechazar claves desconocidas. `DecimalReferenceSchema` deja de llamar `.strict()` (ya lo hereda del objeto refinado) y pasa a ser `InformacionReferenciaSchema`. Alternativa descartada: aplicar la refinación en cada padre (factura, NC, ND, FEC, REP, decimal). Se descarta por duplicación y por riesgo de olvido.

**Contrato implícito:** `InformacionReferenciaSchema` y `DecimalReferenceSchema` pasan de `ZodObject` a `ZodEffects<ZodObject>`. El método `.strict()` desaparece del tipo resultante (aunque ya era un no-op sobre el objeto estricto). Auditar consumidores por `.strict()` explícito sobre la referencia antes de implementar; si existen, ajustarlos o exponer el objeto base por separado.

`codigo` permanece opcional en el tipo y en el esquema (XSD: `Codigo minOccurs="0"`); no hay divergencia tipo/runtime porque no se impone ninguna condición sobre `codigo` más allá de la bicondicional 99↔Otros.

### D2 — Variante REP por tipo, no por enum amplio

Se crea `RepInformacionReferenciaSchema` y `RepInformacionReferencia` (derivado de `InformacionReferencia` por `Omit<"codigo">` con `codigo?: RepReferenceCode`; `tipoDoc` hereda `REFERENCE_DOC_TYPES` completo), en lugar de ampliar `ReferenceCode` con 17. Alternativa descartada: un único tipo `ReferenceCode | "17"`; se descarta porque debilitaría el tipado de documentos no-REP y permitiría 17 donde no aplica.

El XSD del REP admite todos los `TipoDocReferenciaType` del base (01–20, 99) — no restringe tipos — y su `CodigoReferenciaType` añade `"17"`. Por eso la variante REP comparte `tipoDoc: z.enum(REFERENCE_DOC_TYPES)` con el base y usa `codigo: z.enum(REP_REFERENCE_CODES).optional()` (XSD: `Codigo minOccurs="0"`). No hay divergencia tipo/runtime en REP.

### D7 (bis) — Changeset obligatorio

`AGENTS.md` exige un Changeset por cambio visible en paquetes publicados. Este change hace más estricto el input aceptado por `@dojocoding/hacienda-shared` y `@dojocoding/hacienda-sdk`, por lo que requiere un Changeset. Semver: **minor** para ambos paquetes. Aunque el cambio corrige un bug (validación incompleta), endurece el input aceptado y por tanto rompe consumidores que dependían de la permisividad anterior. En paquetes pre-1.0 (`0.x.y`), `0.x → 0.(x+1)` es la convención de breaking. Un `patch` sería incorrecto: rompería la promesa de no-breaking. El cuerpo del Changeset describe las dos condiciones que ahora se rechazan (99 sin Otros, Otros sin 99) y remite a la propuesta. La opción `patch` se descarta explícitamente. La tarea 5.4 crea el Changeset.

### D3 — Espejo en el validador de negocio

`validateFacturaInput` valida 99↔Otros, la condición tipoDoc 13 (si `tipoDoc` está presente y `tipoDoc !== "13"`, entonces `codigo` debe estar presente) y las reglas de tarifa en el mismo loop de `informacionReferencia`/`impuesto`, para cubrir inputs que no pasan por Zod (p. ej. XML parseado). El builder REP emite `CodigoReferenciaOTRO` solo si `codigoOtros` está presente; el parser REP tipa `codigo` como `RepReferenceCode`.

Los campos `numero`, `codigo` y `razon` permanecen opcionales en el esquema (XSD: `minOccurs="0"` para los tres). El XSD no documenta ninguna obligatoriedad condicional para `codigo` (en particular, no la excepción `tipoDoc === "13"`). El ítem 1 del audit no menciona `numero`/`razon`/`codigo` como obligatorios (se centra en 99↔Otros y en el catálogo REP). Se deja su enforcement como follow-up explícito para no expandir el scope del change; la regla `codigo` obligatorio salvo `tipoDoc === "13"` se descartó por no tener respaldo en el XSD ni en los Anexos 2026. Un lector no debe confundir "decidido" con "olvidado": `numero`, `codigo` y `razon` no cambian en este change.

La prohibición preexistente de tarifas transitorias 05/06/07 para FE nueva se preserva y se cubre con test de regresión en Task 5.2; no es scope nuevo.

### D4 (bis) — Fallback para el código 17 en el catálogo base

El candado de paridad (D4) debe resolver dos escenarios:

- Si `2026/v4.4/FacturaElectronica_V4.4.xsd` (`CodigoReferenciaType`) contiene `"17"`, se mueve `"17"` a `REFERENCE_CODES` y `REP_REFERENCE_CODES` deja de ser una extensión (queda como alias del base, o se elimina).
- Si no lo contiene, se mantiene la variante REP-only actual.

La tarea 4.1 incluye este chequeo antes de afirmar la paridad.

### D4 — Candado de catálogo por lectura de XSD en test

El test `reference-catalog.spec.ts` importa los XSD 2026 con `?raw` (Vite/Vitest los sirven como string) y extrae las enumeraciones con regex, sin xmllint. Alternativa descartada: regenerar `codes.json` al set 2026. Se descarta porque el extractor exige auxiliares (ANEXOS, Codigodemoneda, Codificacionubicacion) no vendorizados en el set 2026.

### D5 — Guarda anti-`.fails` como script separado

Se añade `scripts/check-no-expected-failures.mjs`, invocado desde `scripts/verify.mjs`, que escanea `packages/**/*.{spec,test}.{ts,mjs}`, `shared/**/*.{spec,test}.{ts,mjs}` y `scripts/**/*.test.mjs` y falla si encuentra `/\b(it|test)\.fails\(/`. Se mantiene separado del lint para que el mensaje sea inequívoco y no se confunda con un fallo de ESLint.

### D6 — Coherencia de fixtures

`packages/sdk/src/__fixtures__/fixtures.spec.ts` recorre los fixtures publicados en `packages/sdk/src/__fixtures__/*.ts` y en specs con claves hardcodeadas conocidas (`known-integrity-gaps.spec.ts`), excluyendo transport fixtures con claves opacas (documentados con comentario), parsea cada `clave` con `parseClave` y reconcilia emisor, tipo de documento, fecha y consecutivo contra los campos del fixture, usando `validateDocumentIdentity` como oráculo. **Prerrequisito (tarea 2.6):** verificar que `validateDocumentIdentity` existe en `packages/sdk/src/xml/document-identity.ts` y que `validateFacturaInput` lo invoca; si no, el fixture test no demuestra lo que se quiere y el ítem 1 del audit queda abierto. Los transport fixtures (mocks con claves opacas) quedan fuera del alcance; se documentan con comentario.

### D7 — Deuda explícita

El flip de `manifest.json` a `2026/v4.4` y la regeneración de `codes.json` quedan como deuda con disparador: vendorizar los auxiliares del set 2026. No se tocan en este change.

### D8 — Regla `codigo` obligatorio descartada por ausencia de oráculo

El Anexos 2024 (p. 57) documenta una obligatoriedad condicional de `Codigo` con excepción para `tipoDoc === "13"` (facturación mes vencido). El Anexos 2026 (`.md` vigente) y la resolución MH-DGT-RES-0027-2024 no mencionan la regla, y el XSD estructural declara `Codigo minOccurs="0"` sin excepción. Se elimina el refine (c) para alinearse con la autoridad vigente (Anexos 2026 + XSD). Si el equipo confirma que la regla sigue vigente en 2026, se reabre como follow-up con cita explícita. `codigo` queda opcional para todo `tipoDoc`.

## Risks / Trade-offs

- [Refinación más estricta] → rompe a consumidores que envíen 99 sin "Otros" o viceversa. Mitigación: ningún fixture actual usa esa combinación incoherente; se documenta como cambio de compatibilidad en la propuesta.
- [Código 17 en el catálogo base] → si el XSD 2026 base incluye 17, la variante REP-only queda obsoleta y hay que moverlo a `REFERENCE_CODES`. Mitigación: la tarea 4.1 resuelve el escenario antes de afirmar paridad; el candado falla de forma legible si no se actualiza.
- [Consumidores de `DecimalReferenceSchema`] → pasa de `ZodObject` a `ZodEffects`. Mitigación: auditar `.strict()`/`.shape` explícitos sobre la referencia en task 2.6; si existen, ajustarlos.
- [`ZodEffects` sin `.strict()` en el padre] → si un futuro consumidor añade campos desconocidos, el refinamiento no los rechaza. Mitigación: el `.strict()` se aplica en el objeto base antes de `.superRefine`, por lo que se conserva.
- [Test de paridad atado al XSD 2026] → si se vendoriza un XSD nuevo, el test puede fallar por códigos añadidos. Mitigación: ese es el comportamiento deseado (fuerza actualización consciente); el disparador está documentado.
- [Guarda anti-`.fails` demasiado amplia] → podría romper specs futuros que usen `.fails` legítimamente. Mitigación: el patrón se limita a `it`/`test` y el script permite excepciones vía comentario `// allowed-fails` si se justifica.

## Migration Plan

1. Aplicar D1–D3 en shared y SDK.
2. Actualizar comentarios de procedencia.
3. Añadir test de paridad, guardas y tests de reglas.
4. Ejecutar gates: `pnpm --filter @dojocoding/hacienda-sdk test`, `pnpm --filter @dojocoding/hacienda-shared test`, `pnpm typecheck`, `pnpm lint`, `pnpm verify`, `pnpm spec:verify`.
5. No hay migración de datos ni de API pública en cuanto a tipos salvo el tipado REP; el hardening del input se documenta en `MIGRATION.md` con las condiciones que ahora se rechazan y un snippet de corrección.

## Open Questions

Ninguna; todas las decisiones que afectan specs, enfoque o tareas están resueltas en este documento.
