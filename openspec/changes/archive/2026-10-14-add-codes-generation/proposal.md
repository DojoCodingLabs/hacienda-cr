# Proposal: add-codes-generation

## Why

`codes.json` ya extrae de los XSD y auxiliares vendorizados las 52 tablas de
códigos de Hacienda (8 288 valores), pero el código publicado sigue duplicando
catálogos escritos a mano en `shared/src/constants/*.ts`: dos fuentes para el
mismo dato, con deriva real ya observable (por ejemplo, el XSD publica
`"Cedula Fisica"` y `"SAN JOSÉ"`, mientras la constante curada dice
`"Cédula física"` y `"San José"`). La duplicación no tiene detectores: nada
comprueba que `PaymentMethod.TARJETA = "02"` siga coincidiendo con el XSD
vendorizado, ni que una nueva enumeración del set vigente llegue al SDK. El
INDENT 5.8/8/7 (fase 2) pide tipar y constatar los catálogos desde el artefacto
extraído; con el extractor y su candado de frescura ya en verde, es el momento.

## What Changes

- **`pnpm spec:generate`**: comando nuevo que regenera `codes.json`
  (invocando `codes:extract`) **y** escribe el código TypeScript generado bajo
  `shared/src/generated/`, cada archivo con cabecera `NO EDITAR` que apunta a
  las fuentes. Determinista y sin red, como su predecesor. Expone dos modos:
  el completo (extrae y genera) y `--no-extract` (genera desde el
  `codes.json` commiteado, sin invocar la extracción — la única vía a
  `pdftotext`), de modo que la verificación no dependa de los binarios del
  entorno de extracción.
- **El código generado vive solo en `shared/`** (`@dojocoding/hacienda-shared`):
  único hogar, sin duplicación entre paquetes; el SDK y el resto siguen
  consumiéndolo por el depende workspace que ya existe. `codes.json` permanece
  en `packages/sdk/schemas/` como fuente de datos y no se publica en ningún
  tarball (los valores viajan ya incrustados en el JS generado).
- **Reemplazo de las tablas escritas a mano**: las constantes y tipos de
  código de `shared/src/constants/` con pareja explícita en el registro (p.
  ej. `PaymentMethod`, `SaleCondition`, `TaxCode`, `CURRENCY_CODES`) pasan a
  generarse. **Los nombres de export y los valores se conservan idénticos a
  los actuales** — paridad obligatoria y verificada por prueba —; lo que NO se
  genera son los nombres legibles (`*_NAMES`), los mapas derivados curados
  (`IVA_RATE_PERCENTAGES`, `IDENTIFICATION_LENGTHS`, subconjuntos `REP_*`,
  `XADES_*`, entornos) y los exports sin pareja en el registro
  (`UNITS_OF_MEASURE`, `CurrencyCode` como acceso curado, `DocumentTypeCode`,
  `REFERENCE_*`, `ExonerationType`), que siguen a mano.
- **Preparación para `names.json` (fase futura)**: el generador aceptará
  `packages/sdk/schemas/names.json` como fuente opcional de nombres legibles.
  Sin inventar emparejamientos: la pareja tabla→export vive en un registro
  explícito versionado; un código que aparezca sin clave configurada, una
  tabla sin pareja evidente, o una ausencia de nombre legible se **señalan
  para revisión** (conteo en el informe de generación) en lugar de adivinarse.
- **Candado 1 (CI)**: `scripts/verify.mjs` gana los pasos `spec:generate
--no-extract` y `git diff --exit-code` acotado a `shared/src/generated/**` —
  si el árbol commiteado no coincide con lo que el generador produce desde el
  `codes.json` commiteado, `pnpm verify` (y por tanto CI) falla, distinguiendo
  en su mensaje "la generación falló" de "la regeneración produjo diff". La
  frescura de `codes.json` frente a sus fuentes vendorizadas sigue siendo
  responsabilidad de la prueba de frescura del extractor (existente).
- **Candado 2 (lint, obligatorio)**: regla de ESLint que prohíbe literales de
  código de uno o dos dígitos (p. ej. `"01"`, `"02"`, `"1"`) fuera de
  `shared/src/generated/**`; sin ella, el "no escrito a mano" solo protegería
  los archivos generados, no el resto del codebase. Excepciones acotadas y
  documentadas en la config, incluidas las categorías fuera del candado
  (códigos de ubicación compuestos y monedas de tres letras) con su motivo.
- **Changeset obligatorio con decisión semver explícita** porque cambia
  comportamiento de un paquete publicado: **`minor`** para
  `@dojocoding/hacienda-shared` (aditivo: exportaciones nuevas; las
  existentes byte-idénticas por construcción de la prueba de paridad). Sería
  `major` si algún export existente cambiara nombre o valor — y la prueba de
  paridad impide que eso llegue en silencio. El grupo `linked` de Changesets
  propaga la versión al resto de paquetes `@dojocoding/*`.

## Capabilities

### New Capabilities

- `codes-generation`: contrato de `spec:generate`, del código generado (cabecera
  `NO EDITAR`, determinismo, paridad con las tablas actuales, preparación para
  `names.json`) y de los dos candados (drift en `verify.mjs` y regla de lint).

### Modified Capabilities

_(ninguna: `codes-extraction` mantiene intacto su contrato de `codes:extract`;
`spec-integrity` no cambia)_

## Impact

- **Paquetes publicados**: `@dojocoding/hacienda-shared` (v0.4.1) — exports
  nuevos + paridad de los existentes (Changeset `minor`); `@dojocoding/hacienda-sdk`
  y los adapters solo reempaquetan (grupo `linked`).
- **Código**: nuevo `scripts/codes-generate/`; `shared/src/generated/` nuevo;
  `shared/src/constants/*` reducidos a curaduría (nombres y derivados);
  `shared/src/index.ts` reexporta el barrel generado.
- **Tooling**: `package.json` (+`spec:generate`), `scripts/verify.mjs`
  (+2 pasos), `eslint.config.mjs` (+regla), `.changeset/*.md`.
- **Fuera de alcance**: extraer `names.json` (fase futura), generar las tablas
  auxiliares gigantes de ubicación (`Barrio` 7 087, `Distrito` 492 — sin
  consumidor hoy; `codes.json` sigue siendo su forma consultable), publicar
  `codes.json` en un tarball, y meter catálogos no-XSD (p. ej. códigos de
  rechazo de la API) en la generación.

## Referencias

INDENT 5.8, 8, 7 (fase 2). Trabajo previo: `codes-extraction` (extracción +
candado de frescura de `codes.json`, #52) y la rama auxiliar (#53).
