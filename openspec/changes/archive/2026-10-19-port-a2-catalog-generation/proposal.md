## Why

`origin/main` conserva los catálogos de códigos **escritos a mano** en `shared/src/constants/`, mientras que la línea de trabajo local los tiene **generados** desde `packages/sdk/schemas/codes.json` (`shared/src/generated/` + `scripts/codes-generate/` + candado de literales). El review de `main` (PR #59) señala que el trabajo del generador sigue pendiente y que el catálogo vigente de `main` preserva aliases deprecados (`COMPRA_PAGO`, `GASTO_VIAJE`) que el generador actual **no emite**. Sin este port, `main` conserva dos fuentes de verdad para los mismos códigos y el candado de literales no existe allí.

## What Changes

- **El código generado pasa a ser la fuente de verdad**: `shared/src/generated/**` se genera desde `codes.json`; `shared/src/constants/*` queda como **fachada** que reexporta lo generado y conserva a mano sólo los alias deprecados y los mapas de nombres curados.
- **Alias deprecados preservados**: `COMPRA_PAGO` ("08"), `GASTO_VIAJE` ("09") y los códigos de estado/situación sobreviven a la generación y quedan documentados como alias, no como catálogos nuevos.
- **Candado de literales en `main`**: la regla `no-restricted-syntax` sobre literales de 1–2 dígitos entra en la config de lint del árbol vigente, con allowlist explícita y sus motivos, y con la prueba automatizada que demuestra detección, excepción y allowlist.
- **Candado de deriva (candado 1)**: `pnpm verify` regenera y falla ante divergencia entre el árbol y la regeneración, con el diff acotado a las rutas generadas.
- **Paridad estricta**: el registro de parejas declara cada tabla→export con su clave; un código sin clave configurada o una clave sin código hace fallar el comando nombrando tabla y código.
- **Correcciones sancionadas**: los desvíos de paridad aceptados (exoneración sin `12`, `06` renombrada, Ohm `U+2126`, catálogo oficial de 10 tipos de documento) se declaran con cita de fuente primaria y referencia a Changeset.

**BREAKING**: ninguno en los valores publicados; sólo cambia quién es la fuente.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `codes-generation`: el generador pasa a ser la fuente de verdad sobre el árbol vigente, la fachada de constantes conserva aliases, y el candado de literales se instala con su allowlist y su prueba.

## Impact

- **Código afectado**: `shared/src/generated/**` (nuevo en `main`), `shared/src/constants/*` (pasa a fachada), `scripts/codes-generate/**`, `scripts/codes-lint-lock/**`, `eslint.config.mjs`, `scripts/verify.mjs`, `package.json`.
- **Conflicto**: `shared/src/constants/document-types.ts` y `tax-codes.ts` de `main` (71 y 279 líneas) se convierten en fachadas; el contenido canónico pasa a `shared/src/generated/**` (593 líneas).
- **Riesgo de paridad**: los alias deprecados no están en el generador; se conservan a mano y la prueba de paridad los excluye explícitamente.
- **CI**: el candado de literales hace fallar cualquier literal nuevo fuera de la carpeta generada; hay que migrar los literales existentes de `main` o declararlos en el allowlist con motivo.
