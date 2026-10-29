## Why

El ítem 1 del audit de robustez (`INDENTS/sdk-robustness-audit.md`, 15-oct) pide cerrar la integridad de claves y fixtures, la correspondencia de tarifas y el catálogo de referencias, con regresiones que dejen de ser `it.fails`. El estado de HEAD ya resolvió la identidad de claves y los `it.fails`, pero quedan tres vacíos reales sin candado: el catálogo de referencias no tiene paridad verificada contra los XSD 2026 vendorizados (`codes.json` sigue anclado al set 2024), el esquema base de `InformacionReferencia` no impone las condiciones "99 → Otros" del XSD (que solo existen en los esquemas exact), y el `ReciboElectronicoPago` no puede expresar el motivo 17 aunque su XSD admite 17. Además, la regla de tarifas solo cruza `tarifa` con `codigoTarifaIVA` para el impuesto 01; los códigos 07/08 carecen de verificación o del mandato de `FactorCalculoIVA`.

## What Changes

- Añadir refinación condicional al esquema base de referencia: `tipoDoc === "99"` ⇔ `tipoDocOtros` presente (5–100 chars) y `codigo === "99"` ⇔ `codigoOtros` presente (5–100 chars), replicando el patrón de `ExactFecReferenceSchema`. `codigo` permanece opcional para todo `tipoDoc` (XSD: `Codigo minOccurs="0"`); la condición que lo hacía obligatorio salvo `tipoDoc === "13"` (facturación mes vencido) se descartó por no tener respaldo en el XSD ni en los Anexos 2026. `numero` y `razon` no cambian en este change (ver D3).
- Introducir una variante REP del esquema/tipo de referencia cuyo catálogo de códigos es `REP_REFERENCE_CODES` (incluye 17 "pago de comprobante") y cuyo catálogo de tipos de documento es el `REFERENCE_DOC_TYPES` completo (el XSD del REP admite todos los tipos), aplicada al input decimal REP, al builder y al parser de REP. `codigo` se declara opcional en schema y tipo; el refine (c) lo exige salvo cuando `tipoDoc === "13"` (ver D2). `numero` y `razon` no cambian en este change (ver D3).
- Exigir presencia de `codigoTarifaIVA` para `"07"` (IVA cálculo especial) y mantener la correspondencia numérica `tarifa === IVA_RATE_PERCENTAGES[codigoTarifaIVA]` solo para `"01"`; exigir `factorCalculoIVA` para `"08"` (IVA bienes usados), espejado en `validateFacturaInput`.
- Corregir los comentarios de procedencia en `shared/src/constants/document-references.ts` y `scripts/codes-generate/table-map.mjs`: el XSD 2026 vendorizado SÍ contiene los códigos 19/20 (TipoDoc) y 13–16 (Código); `codes.json` permanece en el set 2024 porque faltan los auxiliares de ese set.
- Añadir un test de paridad que lee los XSD 2026 vendorizados y exige que `REFERENCE_DOC_TYPES`, `REFERENCE_CODES` y `REP_REFERENCE_CODES` coincidan exactamente con las enumeraciones del XSD (candado provisional mientras `codes.json` no se regenera).
- Añadir guardas de integridad de suite: una regla que falle si reaparece `.fails(` en specs de `packages/`, `shared/` y `scripts/`, y un test que verifique la coherencia clave↔documento de cada fixture del paquete SDK.
- Añadir un Changeset para los paquetes publicados (`@dojocoding/hacienda-shared`, `@dojocoding/hacienda-sdk`) por el cambio en el input aceptado.

## Capabilities

### New Capabilities

- `reference-integrity`: reglas semánticas de `InformacionReferencia` (condicionales 99↔Otros), catálogo REP con motivo 17, presencia de `codigoTarifaIVA` para IVA 01/07, correspondencia tarifa↔código solo para 01, y mandato de factor para 08.
- `test-integrity`: guardas contra regresiones silenciadas (`it.fails`) y claves de fixture incoherentes en la suite.

### Modified Capabilities

- `codes-generation`: el catálogo de referencias vendido a mano en `shared/src/constants/document-references.ts` queda bloqueado por paridad contra los XSD vendorizados, y la documentación de procedencia debe describir el estado real (XSD 2026 trae 19/20 y 13–16; `codes.json` sigue en 2024 sin auxiliares de 2026).

## Impact

- **Fuentes**: `shared/src/schemas/factura.ts` (refinación + variante REP), `shared/src/schemas/decimal-fields.ts` y `shared/src/schemas/decimal-document.ts` (REP usa el esquema variante), `shared/src/types/documents.ts` (`RepInformacionReferencia`, REP usa su tipo), `packages/sdk/src/xml/validator.ts` (99↔Otros, tarifas, factor), `packages/sdk/src/documents/parser.ts` (refs REP tipadas con 17), `scripts/verify.mjs` (guarda anti-`.fails`).
- **Documentación**: comentarios de procedencia en `document-references.ts` y `table-map.mjs`; sección en `MIGRATION.md` (o `packages/sdk/MIGRATION-v4.4.md`) con las condiciones que ahora se rechazan y snippet de corrección de input.
- **Tests**: nuevos `reference-catalog.spec.ts`, `fixtures.spec.ts`, guard script; ampliar `factura.spec.ts` y `validator.spec.ts`.
- **Compatibilidad**: la refinación 99↔Otros hace más estricto el input aceptado por `InformacionReferenciaSchema` (rompe a quienes enviaban 99 sin el campo Otros u Otros sin 99); `codigo` permanece opcional para todo `tipoDoc` (XSD: `Codigo minOccurs="0"`), por lo que no se rompe a quienes omitían `codigo`; la variante REP mantiene `codigo` opcional y admite el motivo 17; ningún fixture existente usa impuesto 07 sin `codigoTarifaIVA` ni impuesto 08, y no hay `codigoOtros`/`tipoDocOtros` presentes sin código 99 en fixtures. Los campos `numero` y `razon` permanecen opcionales (decisión D3): no hay cambio de comportamiento en ellos. El change asume que `validateDocumentIdentity` existe y está cableado en `validateFacturaInput`; la tarea 2.6 lo verifica antes de cerrar el ítem 1 del audit.
- **Sin cambios**: `packages/sdk/schemas/codes.json` y `manifest.json` (el flip a 2026 queda como deuda documentada).
