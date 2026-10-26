# add-aux-codes-extraction

## Why

`codes.json` (fase 2.1) solo cubre lo que los XSD enumeran: la tabla de moneda llega con 168 códigos sin descripciones y las tablas de ubicación (provincias, cantones, distritos, barrios) ni siquiera existen en los XSD — Hacienda las publica solo en los documentos auxiliares vendorizados. Sin extraerlos, `codes.json` no puede servir de catálogo consultable para validación de comprobantes ni alimentar las fases INDENT 4.2/5.6/7.6/11.

## What Changes

- Extender `pnpm codes:extract` (bajo `scripts/codes-extract/`) para que, además de los XSD, lea los auxiliares vendorizados del set vigente:
  - `ANEXOS Y ESTRUCTURAS_V4.4.pdf` — notas 5, 6, 8, 8.1, 9, 10, 10.1, 16, 20, 22, 23 (tablas que no están en los XSD).
  - `Codigodemoneda_V4.4.pdf` — nota 13.1 (descripciones de la tabla de moneda).
  - `Codificacionubicacion_V4.4.rar` → `Codificacionubicacion_V4.4.xlsx` interno — nota 14 (tabla de ubicación). No existe CSV publicado; el `.xlsx` dentro del `.rar` es la fuente (decisión de vendorización 2026-10-08).
- PDF se parsea con `pdftotext -layout` (binario nativo, presente en la máquina de desarrollo); el `.rar` se descomprime y el `.xlsx` se lee como ZIP/XML. Todos los parámetros de extracción (flag `-layout`, rutas de auxiliares, manejo rar/xlsx) viven en el extractor, **no** en `manifest.json` (decisión de revisión: el manifiesto no cambia).
- Jerarquía de fuentes: el XSD sigue siendo fuente primaria de **estructura** (claves, forma de los datos); los auxiliares son fuente primaria de las **tablas que el XSD no enumera** y de las descripciones que el XSD omite. Si una descripción del auxiliar contradice al XSD → advertencia en stderr, exit 0 (divergencia cosmética documentada, no fallo).
- Códigos: igualdad estrictamente byte a byte, igual que la fase 2.1 (sin normalización Unicode ni case-folding).
- Procedencia por entrada: una misma tabla puede provenir de varias fuentes (p. ej. moneda: XSD + PDF); cada entrada de valor registra su origen (`source`), y cada tabla mantiene `sources[]`.
- Salida: un solo `packages/sdk/schemas/codes.json` regenerado completo, idempotente y determinista. `pnpm verify` y `spec:verify` **no** cambian.
- Referencias: INDENT 4.3, 5.6, 11.9–11.12.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `openspec/specs/codes-extraction/`: la capacidad existente crece de "extraer solo enumeraciones de XSD" a "extraer de XSD + auxiliares vendorizados", con reglas de precedencia de fuentes, procedencia por entrada, advertencia de contradicción y nuevas dependencias nativas (`pdftotext`, lectura de rar/xlsx) declaradas en los errores del comando.

## Impact

- `scripts/codes-extract/` (`extract.mjs`, `lib/scan.mjs`, `lib/render.mjs`): nuevos módulos de extracción PDF y rar/xlsx; fusión por clave con precedencia; `sources[]` y `source` por entrada.
- `scripts/codes-extract/codes-extract.test.mjs`: fixtures PDF/XLSX sintéticas, prueba de contradicción, idempotencia sobre los auxiliares reales.
- `packages/sdk/schemas/codes.json`: regenerado con las tablas nuevas y descripciones enriquecidas (artefacto derivado, commiteado).
- `packages/sdk/schemas/README.md`: sección de `codes.json` ampliada (origen auxiliar, dependencia `pdftotext`, regeneración).
- Dependencias nuevas: binario `pdftotext` (poppler) y descompresión de `.rar` (herramienta de sistema o librería) — requisito documentado para ejecutar `pnpm codes:extract`; `pnpm verify` no lo invoca, así que CI sin estos binarios no se ve afectado.
- **Sin cambios** en `manifest.json`, `spec:verify`, `spec:update`, `spec:check` ni en la capacidad `spec-integrity`.
