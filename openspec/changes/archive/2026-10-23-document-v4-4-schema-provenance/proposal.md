# Documentar la procedencia y divergencia de los sets XSD v4.4

## Why

Los dos sets vendorizados de la v4.4 no son dos copias del mismo documento: son
dos publicaciones oficiales distintas de la misma versión nominal. El set
`2024/v4.4` (superficie ATV, la página citada por la especificación) y el set
`2026/v4.4` (superficie OVi) difieren en bytes y en restricciones, y hoy el
repositorio los presenta como `currentSet` y `nextSet` sin dejar escrito qué
superficie gobierna, qué se verificó y qué queda pendiente de decisión. Sin ese
registro, cualquier lectura del código o de la documentación puede confundir una
revisión publicada en otra superficie con la sustitución oficial del esquema.

## What Changes

- Añadir un documento de procedencia de los sets v4.4 que registre, por set y
  por superficie: URL exacta, fecha `Last-Modified`, SHA-256 y tamaño
  verificados, fecha de la comprobación y autoridad declarada.
- Dejar constancia de que `2024/v4.4` es la referencia autoritativa por venir
  directamente de la página ATV de Anexos y Estructuras, y de que ATV no
  publica hoy un set `2026/v4.4`.
- Enumerar las diferencias observadas entre ambos sets (`Clave` alfanumérica,
  `TipoDocReferenciaType` 19–20, `CodigoReferenciaType` 13–16, cambio de
  capitalización en una anotación) como divergencia entre superficies, no como
  error de vendorización.
- Marcar explícitamente como **decisión abierta** el estatus de `2026/v4.4`
  (`nextSet`, obligatoriedad 2026-11-01 y set embebido por el build) hasta que
  exista confirmación oficial en la superficie ATV.
- Enlazar el nuevo documento desde `packages/sdk/schemas/README.md` y la
  documentación de cumplimiento v4.4.

No es parte de este cambio: editar `manifest.json`, mover `currentSet`/`nextSet`,
re-vendorizar o retirar archivos, ni cambiar el set que embebe el build del SDK.
Todo eso exige una decisión y un cambio propios.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `spec-integrity`: se añade un requisito de documentación verificable de la
  procedencia por superficie y del conflicto ATV/OVi, sin resolución silenciosa
  de autoridad.

## Impact

- Documentación: `packages/sdk/schemas/README.md`, nuevo documento de
  procedencia bajo `docs/specs/` y referencia desde la documentación de
  cumplimiento v4.4.
- Sin cambios de código, API, comportamiento de validación, manifiesto ni
  artefactos publicados.
- Riesgo principal: que la documentación afirme una autoridad que la otra
  superficie contradice; el requisito obliga a registrar la contradicción y su
  estado, no a ocultarla.
