## Why

Una vez que una FE sintética queda preparada, firmada y (cuando la ruta funcione) aceptada, los demás tipos de comprobante (NC, ND, FEC, MR) deben referenciarla con datos coherentes: la clave real, el tipo de documento real, el motivo legal para ese par, la fecha original y, para NC/ND, la condición de que el original esté válidamente emitido (Resolución art. 9). Hoy esa coherencia solo existe en fixtures (`packages/sdk/src/__fixtures__/document-fixtures.ts` usa `fixtureClave(...)` desde `__fixtures__/identity.ts`) y no hay un generador de escenario ni un validador de grafo. El camino exact ya modela la coherencia como encadenamiento tipado (`original: ExactFeInput`), pero no cubre todos los tipos (REP no tiene binding `original`) y no existe para el escenario sandbox.

Este change añade un generador de escenario de **ensayo** (rehearsal) que produce FE → {NC, ND, FEC, MR} con referencias coherentes por construcción, más un validador de grafo que rechaza incoherencias. REP queda fuera (no entra en este change, por decisión explícita). El escenario se etiqueta como ensayo no fiscal: NC/ND solo se generan si la FE referenciada está `ACCEPTED` (o si se declara explícitamente `rehearsal: true`, en cuyo caso el bundle resultante se marca `rehearsal: true` y no puede presentarse como evidencia fiscal).

Depende del formato de bundle definido en `add-sandbox-evidence-bundle` (change 1): cada documento del escenario produce su propio bundle.

## What Changes

- Se añade un generador de escenario de ensayo (herramienta interna, en `scripts/` o `packages/sdk/src` según la decisión de implementación) que, dado un emisor real, actividad, proveedor de sistemas, receptor y CABYS, produce una FE y los documentos dependientes con referencias coherentes por construcción.
- Se añade un validador de grafo que verifica: `numero` ∈ claves del escenario; `tipoDoc` === tipo real del documento referenciado; `codigo` ∈ whitelist del par `(tipoDocumento de la clave, TipoDocIR)` según la tabla D7 (Nota 9/10), fail-closed para pares no cubiertos; `fechaEmisionIR` === fecha del original; NC/ND solo si el original está `ACCEPTED` (o `rehearsal: true` explícito); MR dentro de 8 días hábiles del mes siguiente (Resolución art. 10).
- Se documenta el grafo y las reglas de coherencia en `docs/testing/sdk-sandbox-validation.md`.
- REP no se incluye: usa `InformacionReferencia` genérico (no binding `original` tipado). La validación de REP requiere un check adicional sobre `InformacionReferencia` que se difiere a un change futuro. (Nota: MR sí tiene binding `original` en `exact-recipient-message.ts`.)
- No se modifica el SDK ni el shared. Sin changeset.

## Capabilities

### New Capabilities

- `coherent-reference-rehearsal`: generador de escenario de ensayo FE→{NC,ND,FEC,MR} con referencias coherentes por construcción y validador de grafo.

### Modified Capabilities

- (ninguna: `reference-integrity` cubre el catálogo y las condiciones de "Otros", no el grafo de documentos).

## Non-Goals

- No se modelan pares fuera de la tabla D7 del design (`ND ← NC`, `ND ← ND`, `TE ← NC`, `FEC ← NC`, `FEE ← NC`, `TE ← TE`) ni REP (`REP ← FE`). El generador y el validador los rechazan de forma fail-closed con "par no cubierto"; cubrirlos requiere análisis de Nota 9/10 caso por caso y se difiere a un change futuro.
- No se valida REP: usa `InformacionReferencia` genérico (sin binding `original` tipado) y requiere un check adicional que se difiere.
- No se cierra el ítem 3 del audit (ver Nota de alcance).

## Impact

- Nueva herramienta interna (scripts o módulo SDK) + documentación.
- Sin cambios en `packages/*`, sin changeset, sin bump.
- Depende de `add-sandbox-evidence-bundle` para el formato de evidencia por documento.
- La aceptación fiscal de los tipos dependientes sigue bloqueada por la ruta sandbox (403) y por la condición ACCEPTED del original.

**Nota de alcance:** este change NO cierra el ítem 3 del audit. Cierra la infraestructura de referencias coherentes, pero la verificación real contra Hacienda sigue bloqueada por el 403 del gateway. El ítem se cierra cuando el 403 se resuelva, el change 1 esté mergeado, y se capture una aceptación o rechazo controlado real de al menos un tipo dependiente.
