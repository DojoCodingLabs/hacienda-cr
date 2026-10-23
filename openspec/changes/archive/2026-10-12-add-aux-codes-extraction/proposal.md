# Proposal: add-aux-codes-extraction

## Why

`codes.json` hoy solo refleja enumeraciones incrustadas en los XSD vendorizados.
Hay tablas y descripciones oficiales que Hacienda publica solo en documentos
auxiliares (ANEXOS, catálogo de monedas, codificación de ubicación), por lo que
el artefacto carece de tablas como provincia/cantón/distrito y de descripciones
para códigos cuyo XSD no las declara (caso `CodigoMoneda`). INDENT 4.3/5.6 y
11.9–11.12 exigen esas tablas completas para validación y fases posteriores.

## What Changes

- Ampliar `pnpm codes:extract` para que, además de los XSD, parsee fuentes
  auxiliares vendorizadas del set vigente:
  - `ANEXOS Y ESTRUCTURAS_V4.4.pdf` — notas 3, 5, 6, 8, 8.1, 9, 10, 10.1, 16,
    18, 20, 21, 22, 23 (tablas con código + descripción). La nota 3 aporta dos
    tablas que los XSD no enumeran: tipo de comprobante o documento asociado
    (01–10) y situación del comprobante (1/2/3).
  - `Codigodemoneda_V4.4.pdf` — nota 13.1 (descripciones de moneda).
  - `Codificacionubicacion_V4.4.rar` (ya vendorizado con hash en
    `manifest.json`; solo se verifica) → un `.xlsx` interno — nota 14
    (provincia, cantón, distrito y barrio: tablas que los XSD no cubren;
    los códigos de nivel inferior reinician en cada nivel en la fuente,
    así que se publican compuestos `provincia.cantón.distrito.barrio`,
    decisión D5b del design).
- Extracción: PDF con `pdftotext -layout`; RAR con la tooling que fije el
  diseño (sin red); XLSX leído como tabla.
- Reglas de autoridad: el XSD es fuente primaria de códigos y de estructura;
  el auxiliar es fuente primaria de descripciones cuando el XSD no las
  declara; si ambos declaran descripción y difieren, gana el XSD y se emite
  advertencia (código 0). Códigos byte a byte en todas las fuentes.
- Trazabilidad: misma tabla puede venir de varias fuentes; se guarda el
  origen por entrada (`sources[]` por valor) y en `sources[]` de tabla y
  `generatedFrom`.
- El CSV/JSON derivado del `.xlsx` es artefacto interno del extractor, no se
  publica ni se registra en el manifiesto. El `.rar` vendorizado sí lleva hash
  en `manifest.json` (política vigente de fuentes vendorizadas; sin delta de
  `spec-integrity`).
- Disposición explícita de notas no extraídas, con tabla única
  Nota | Contenido | Disposición **canónica en
  `specs/codes-extraction/spec.md`** (aquí solo el resumen): notas 4, 4.1,
  11 y 15 cubiertas por XSD (no se extraen del PDF); notas 1, 2, 7 y 13
  informativas sin tabla propia (la nota 13.1, en `Codigodemoneda_V4.4.pdf`,
  sí se extrae); notas 12, 17 y 19 fuera de alcance.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `codes-extraction`: fuentes de extracción ampliadas (XSD + auxiliares
  vendorizados); nuevas tablas de ubicación con códigos compuestos por
  nivel y de la nota 3; descripciones
  desde auxiliar cuando el XSD no las declara; reglas de autoridad XSD vs
  auxiliar (advertencia, no fatal); origen por entrada; generación
  determinista extendida a las nuevas fuentes; `.rar` con hash en el
  manifiesto (ya vendorizado, verificado por este cambio).

## Impact

- **Depende de `add-codes-extraction`** (ya implementado y archivado):
  `scripts/codes-extract/lib/scan.mjs`, `lib/render.mjs`, la entrada
  `pnpm codes:extract` y la vendorización de los PDFs ANEXOS/Codigodemoneda.

- `scripts/codes-extract/` (`extract.mjs`, `lib/scan.mjs`, `lib/render.mjs`
  - nuevos módulos auxiliares y tests con fixtures).
- `packages/sdk/schemas/2024/v4.4/`: `Codificacionubicacion_V4.4.rar` ya
  está vendorizado con hash en `manifest.json` (sin cambios de manifiesto
  salvo que se re-vendorice); `codes.json` regenerado con las nuevas
  tablas; `README.md` (procedencia de las nuevas fuentes).
- Dependencias nuevas de desarrollo para el extractor (lector RAR/XLSX sin
  red en tiempo de ejecución; detalles en design.md).
- Sin cambios de contrato en `spec-integrity` (vendorizar con hash ya es
  política vigente) ni integración en `pnpm verify`.
