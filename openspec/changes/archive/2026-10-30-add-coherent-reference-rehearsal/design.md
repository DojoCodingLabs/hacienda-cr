## Context

El camino exact (`shared/src/schemas/exact-nc.ts`, `exact-nd.ts`, `exact-recipient-message.ts`) ya modela la coherencia como encadenamiento tipado: `original: ExactFeInput` y validaciones de igualdad de clave/fecha. La coherencia del grafo completo (FE→{NC,ND,FEC,MR}) no está modelada ni validada en ningún lugar. Los fixtures usan `fixtureClave(...)` desde `__fixtures__/identity.ts`, que no es reutilizable fuera de tests.

Ver `proposal.md` - Why.

## Goals / Non-Goals

**Goals:**

- Generar un escenario de ensayo con referencias coherentes por construcción.
- Validar un grafo ya construido sin red ni firma.
- Distinguir ensayo de evidencia fiscal mediante la etiqueta `rehearsal`.

**Non-Goals:**

- No añadir binding `original` a REP. REP usa `InformacionReferencia` genérico, no el binding `original` tipado que tienen NC/ND/MR en los schemas exactos. La validación de REP requiere un check adicional sobre `InformacionReferencia` que se difiere a un change futuro. (Nota: MR sí tiene binding `original` en `exact-recipient-message.ts`.)
- No modificar el SDK ni el shared.
- No generar evidencia fiscal sin FE aceptada.
- No modelar pares fuera de la tabla D7 (`ND ← NC`, `ND ← ND`, `TE ← NC`, `FEC ← NC`, `FEE ← NC`, `TE ← TE`) ni REP. El validador y el generador los rechazan de forma fail-closed ("par no cubierto"); cubrirlos requiere análisis de Nota 9/10 caso por caso y se difiere a un change futuro.

## Decisions

### D1: Generador por encadenamiento, no por claves

El generador no inventa claves: recibe una FE ya preparada (con su clave real) y construye NC/ND/FEC encadenando `original = fe` (o el comprador para FEC), reutilizando los schemas exactos existentes. Las claves de NC/ND se generan con `buildClave` (identidad del emisor) y secuencias distintas; FEC usa `buildClave` con la identidad del comprador. **MR no tiene clave propia de 50 dígitos: su campo `Clave` referencia la clave del original, y su identificación propia es `NumeroConsecutivoReceptor` (20 dígitos, tipo 05/06/07 + secuencia), generado por el receptor.** El binding `original: ExactFeInput` ya existe en `exact-recipient-message.ts` para validación.

**NC/ND/MR por builders exactos; FEC por builder genérico.** Verificado en Task 0.2/0.6: `buildExactNotaCreditoTotalXml`, `buildExactNotaDebitoXml` y `buildExactMensajeReceptorXml` encadenan la coherencia vía el binding `original` de los schemas exactos. La variante exact-FEC (`ExactFecInputSchema`) restringe `TipoDocIR` a `06, 07, 14, 99` (compra respaldada por nota de despacho/contingencia; el XSD 2026 FEC sí enumera `01` pero el schema exact del caseCode lo rechaza — verificado en Task 0.6). La pata FEC del generador (compra respaldada por la FE del proveedor, par `("08","01")`) usa el builder genérico `buildFacturaCompraXml` con referencia `{tipoDoc: "01", numero: clave FE, fechaEmision: FE, codigo: "04", razon}` validada con `InformacionReferenciaSchema` y sellada por `validateDocumentXml` contra el XSD del FEC.

Alternativa considerada: generar claves "a mano" por string — descartada porque reproduce el anti-patrón de fixtures y no valida contra el SDK.

### D2: Validador de grafo independiente

El validador recibe el escenario como datos (documentos + claves + referencias) y aplica las reglas de coherencia sin depender del generador. Esto permite validar escenarios construidos a mano o por otros caminos. Devuelve lista de violaciones (vacía = coherente).

### D3: Etiqueta `rehearsal` propagada

Si algún documento se genera con `rehearsal: true`, **todo el escenario se propaga a ensayo** (no se puede tener mezcla de documentos `rehearsal` y no-`rehearsal`). El generador rechaza escenarios con documentos `rehearsal: true` y documentos no-`rehearsal` en el mismo escenario. El validador no elimina la etiqueta. Un bundle `rehearsal: true` no puede presentarse como evidencia fiscal.

El formato de entrada del validador (`DocumentoInput`) incluye `rehearsal: boolean` **obligatorio** (no opcional, para eliminar la ambigüedad de `undefined`). El validador rechaza cualquier escenario que mezcle `true` y `false` entre documentos. Un escenario fiscal usa `false` en todos los documentos; un escenario de ensayo usa `true` en todos.

### D4: Ubicación — herramienta interna

El generador y el validador viven en `scripts/` (o un módulo interno no exportado) para no convertirlos en API pública del SDK. Si más adelante se publican, se requerirá un change propio con changeset.

Alternativa considerada: `packages/sdk/src/scenario/` exportado — descartada por la respuesta 1 (herramienta interna) y para evitar superficie pública prematura.

### D5: NC/ND solo con FE aceptada (o ensayo explícito)

Regla derivada de Resolución art. 9: un comprobante válidamente emitido no puede anularse; NC/ND solo sobre comprobante válido. El generador falla si se pide NC/ND sobre FE no ACCEPTED salvo `rehearsal: true`. El generador lee el estado ACCEPTED del `manifest.json` de change 1 (`outcome.class === "ACCEPTED"`), o del parámetro `state: "ACCEPTED" | "REJECTED" | "REHEARSAL"` si se construye offline. En cualquier caso, la fuente debe ser explícita en la invocación, no inferida.

**FE sin manifest (run anterior a change 1):** si la FE tiene un run pero sin `manifest.json`, el generador rechaza la generación fiscal con mensaje `"FE pre-change-1 sin manifest: usar state explícito para construcciones offline, o re-ejecutar la FE con change 1 para obtener manifest"`. En modo `rehearsal: true`, el manifest es opcional.

### D6: MR dentro de 8 días hábiles

Resolución art. 10: el receptor debe confirmar en ≤ 8 días hábiles desde el primer día del mes siguiente a la transacción. El validador comprueba `fechaEmisionDoc` ≥ `fechaEmision` del original y dentro del plazo. El módulo de días hábiles vive en `packages/sdk/src/calendar` (verificar ruta exacta en apply). Si es importable desde `scripts/`, se usa directamente. Si no, se implementa localmente en el validador (duplicando lógica) para no dejar el check de 8 días sin candado. La duplicación se documenta como deuda con disparador: cuando el módulo se exponga por barrel público, el validador lo importa.

**Resuelto en Task 0.2:** el módulo es importable desde `scripts/` vía el barrel del SDK (`checkBusinessDayDeadline`) — sin duplicación. El check del MR usa `checkBusinessDayDeadline({businessDays: 8, startDate: primer día del mes siguiente a la FE, referenceDate: fechaEmisionDoc del MR})`; el 8 es el literal de la Resolución (no `DEFAULT_DEADLINE_BUSINESS_DAYS`, que pertenece al plazo de presentación de comprobante: `{normal: 0, sin_internet: 2, contingencia: 2}`).

### D7: Tabla de pares (códigos reales) y whitelist de códigos

El validador y el generador usan esta tabla para decidir si un par de referencia es válido y qué `Codigo` acepta. La tabla es una **whitelist cerrada** de los pares que este change modela; no es un catálogo exhaustivo de todos los pares posibles.

**Dos sistemas de códigos, no uno.** La clave del par combina dos enumeraciones distintas y no intercambiables:

- `tipoDocumento` — código de la **clave numérica** (`DocumentTypeCode` en `shared/src/constants/document-types.ts`): `01` FE, `02` ND, `03` NC, `04` TE, `08` FEC, `09` FEE, `10` REP.
- `TipoDocIR` — código **Nota 10** (`REFERENCE_DOC_TYPES`): `01` FE, `02` ND, `03` NC, `04` TE, `05` Nota de despacho, …, `18` ND a FEC, `19` FEE, `20` REP, `99` Otros.

Coinciden en `01–04` y **divergen desde `05`**: `08` es FEC en la clave y "comprobante emitido en contingencia" en Nota 10; `10` es REP en la clave y "comprobante rechazado por Hacienda" en Nota 10. El validador nunca compara izquierda contra derecha: la izquierda identifica el documento que referencia, la derecha es el `TipoDocIR` del referenciado.

**Notación:** `A ← B` significa "B contiene `InformacionReferencia` hacia A". Clave del par: `(tipoDocumento de B, TipoDocIR de A)`. Ejemplo: `01 FE ← 03 NC` ⇒ `("03", "01")`.

| Par (referenciado ← referencia) | clave del par  | códigos aceptados        | motivo documentado                                                                                                                                                                             |
| ------------------------------- | -------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01 FE ← 03 NC`                 | `("03", "01")` | {01, 02, 13, 14, 15, 16} | 01 anula la FE; 02 corrige monto (XSD: "corrige texto"); 13 anula por error material; 14 corrige monto por error material; 15 sustituye por error material; 16 sustituye comprobante rechazado |
| `01 FE ← 02 ND`                 | `("02", "01")` | {02}                     | 02 ajusta monto. `13–16` no se aceptan con ND (fail-closed)                                                                                                                                    |
| `03 NC ← 02 ND`                 | `("02", "03")` | {02}                     | 02 ajusta monto. `13–16` no se aceptan con ND (fail-closed)                                                                                                                                    |
| `03 NC ← 03 NC`                 | `("03", "03")` | {01, 02, 13, 14, 15, 16} | 01 anula; 02 corrige monto (XSD: "corrige texto"); 13 anula por error material; 14 corrige monto por error material; 15 sustituye por error material; 16 sustituye comprobante rechazado       |
| `01 FE ← 08 FEC`                | `("08", "01")` | {04}                     | 04 referencia a otro documento                                                                                                                                                                 |

Los conjuntos de la columna `códigos aceptados` son la whitelist **sin** `99`. Conjunto efectivo: `efectivo(par) = conjunto(par) ∪ {"99"}`, sujeto a la condición de `codigoOtros` descrita abajo. `99` no se repite en cada fila para no duplicar la regla.

**Caso especial: MR.** El Mensaje Receptor no tiene `tipoDocumento` propio en la clave numérica ni usa `InformacionReferencia`: referencia el original con el campo directo `Clave`, lo valida con `NumeroCedulaEmisor` y se identifica con `NumeroConsecutivoReceptor` (tipo `05`/`06`/`07`). Por eso MR **no aparece en la tabla de pares**: el validador lo valida con regla propia (D1, D6) y no verifica `codigo`.

**Fuera de la tabla (no validado por este change):** REP (`REP ← FE`) usa `InformacionReferencia` genérico sin binding `original` y queda fuera por Non-Goal, no por omisión de la tabla.

**Pares no listados:** el validador rechaza con `"par (tipoDocumento, TipoDocIR) no cubierto por la tabla D7"`. Es una política **fail-closed**: la tabla cubre exactamente los pares que el escenario produce. Pares como `ND ← NC`, `ND ← ND`, `TE ← NC`, `FEC ← NC`, `FEE ← NC` y `TE ← TE` son alcanzables (ambas enumeraciones admiten esos `TipoDocIR`), pero no están modelados: se rechazan y se difieren a un change futuro (ver Non-Goals del proposal). No hay tercera categoría "pendiente": o el par está en la tabla, o se rechaza.

**Código `99` (Otros):** se suma a todos los conjuntos de la tabla (`efectivo(par) = conjunto(par) ∪ {"99"}`), con la condición adicional `codigoOtros` presente (XML: `CodigoReferenciaOTRO`; Zod: `codigoOtros`; mínimo 5 caracteres), verificada por el schema `InformacionReferencia` (capability `reference-integrity`). No es un par comodín: el par debe seguir estando en la tabla.

**Generación XSD activa (decide los códigos 13–16).** El SDK valida contra `packages/sdk/schemas/2026/v4.4` (`packages/sdk/src/xml/schemas/index.ts` importa las 9 XSD de 2026; `validateAgainstXsd` usa `generation ?? "2026"`). Esa generación enumera `13–16` en `CodigoReferenciaType` y `19–20` en `TipoDocReferenciaType`. La copia `2024/v4.4` **no** los enumera: `CodigoReferenciaType` termina en `12` y `TipoDocReferenciaType` en `18`. Como este change fija la generación 2026, los conjuntos de las filas cuyo documento que referencia es NC incluyen `13–16` (tabla arriba). Las filas con ND no los incluyen: un ND con `13–16` se rechaza (fail-closed) y se difiere. Si Task 0.6 encontrara que el runner valida contra 2024, esas mismas filas deben perder `13–16` y esta sección debe registrar el cambio; no se aceptan documentos con códigos ausentes en la generación activa.

**Divergencia de descripción de `02`:** el XSD dice "Corrige texto de documento de referencia" y la Nota 9 del digest dice "Corrige monto". La tabla usa la descripción del digest. La diferencia no afecta la verificación estructural (solo compara pertenencia al conjunto), y el generador **no infiere un ajuste de monto del código**: el monto lo define el contenido del documento, no el `Codigo`.

Esta tabla se verifica contra `CodigoReferenciaType` y `TipoDocReferenciaType` de `2026/v4.4` (Task 0.6).

**Enumeraciones extraídas (Task 0.6, XSD vendidos, sin asumir):** 2026 `CodigoReferenciaType`: `01, 02, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 99` (`17` sólo en el XSD propio del REP). 2026 `TipoDocReferenciaType`: `01–20, 99`. 2024 `CodigoReferenciaType`: `01, 02, 04–12, 99`. 2024 `TipoDocReferenciaType`: `01–18, 99` (`13` ya existía como TipoDoc en 2024). El XSD `FacturaElectronicaCompra_V4.4.xsd` 2026 enumera los mismos `TipoDocReferenciaType` (incluye `01`), aunque el schema exact-FEC del caseCode restringe a `06/07/14/99` — la pata FEC del generador usa el builder genérico por eso (ver D1).

## Risks / Trade-offs

- [Risk] El módulo de días hábiles puede no estar disponible para el validador offline. → Mitigation: si no es importable desde scripts, el validador lo implementa localmente (duplicando lógica), documentado como deuda con disparador: cuando el módulo se exponga por barrel público, el validador lo importa. El check de 8 días nunca queda sin candado.
- [Risk] Generar NC/ND manualmente (sin el generador) puede saltarse la coherencia. → Mitigation: el validador de grafo es el gate; el bundle solo se considera válido si el validador devuelve vacío.
- [Risk] REP queda sin validación de coherencia. → Mitigation: REP usa `InformacionReferencia` genérico (no binding `original`); su validación requiere un check adicional sobre `InformacionReferencia` que se difiere a un change futuro. MR sí tiene binding `original` en `exact-recipient-message.ts` y está cubierto.

## Migration Plan

No aplica: herramienta interna. Los escenarios previos (fixtures) siguen válidos; el validador puede ejecutarse sobre ellos para detectar incoherencias heredadas.

## Open Questions

- Ninguna que cambie specs o approach. La ubicación exacta (`scripts/` vs módulo interno) se resuelve en la implementación sin afectar el contrato.
