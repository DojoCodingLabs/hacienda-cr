# Proposal: add-a1-conformity-report

## Why

A1 del brief de práctica pide un **informe de conformidad independiente**: tabla por
tabla, qué dice la fuente primaria de Hacienda y qué dice el SDK, con cita y veredicto,
reconciliado contra la auditoría previa. El repo no tiene ese documento. Lo que existe
son lecturas indirectas: `docs/specs/v4.4-compliance.md` (auditoría previa, 2026-08-24,
enfocada en estructura del documento, no en catálogos de códigos) y el INDENT, que
resume hallazgos pero no confronta cada tabla del SDK con el PDF ni con el XSD. Sin ese
informe, A2–A6 se construyen sobre una base que nadie ha verificado contra la fuente con
cita reproducible, y "dos lecturas independientes que coinciden" — la evidencia que pide
el brief — no existe.

Además, el repo ya ejecutó las fases 1a–3 (vendorización, extracción, generación), de
modo que la lectura de fuentes primarias ya no es previa al código: se hace sobre un
**checkout baseline pre-vendorización** para preservar la independencia, y su resultado
se contrasta después con el estado actual.

## What Changes

- **`docs/conformity-report.md`** (nuevo): el informe A1. Contiene:
  - **Procedencia**: qué bytes se leyeron (set, SHA-256 por archivo, fecha, herramientas
    `pdftotext`/`xmllint`) y desde dónde (checkout baseline + copia de fuentes primarias).
  - **Protocolo de independencia**: cuarentena declarada — no se consultan
    `docs/specs/v4.4-compliance.md` ni el INDENT hasta cerrar la primera pasada.
  - **Una fila por cada tabla de códigos que el SDK define** (catálogos escritos a mano
    del baseline: `shared/src/constants/*.ts`, `packages/sdk/src/api/error-codes.ts`,
    catálogo de la clave): fuente primaria con cita (nota + página del PDF, o archivo
    XSD + `simpleType`/`element`), valores que declara el SDK, veredicto y hallazgos.
  - **Cobertura y no-verificables**: tablas sin fuente oficial aparente marcadas como
    tales; nada se adivina.
  - **Reconciliación** contra la auditoría previa: coincidencias, desacuerdos y hallazgos
    que la auditoría no cubrió.
- **Entorno de trabajo fuera del repo** (documentado en `design.md`, no commiteado):
  checkout baseline `hacienda-cr-a1-baseline` en `origin/release/v0.4.1` (`a0c6b67`,
  última rama previa a la vendorización) y copia de las fuentes primarias en
  `codigo/INDENTS/fuentes-primarias/` con sus SHA-256.
- **Ningún cambio de código**: no se corrige ninguna tabla, no se añade script ni candado
  de CI (eso es A2), no se automatiza el informe.

## Capabilities

### New Capabilities

- `conformity-report`: el informe de conformidad A1 como artefacto auditable del repo —
  procedencia de las fuentes leídas, cobertura completa de las tablas de códigos que el
  SDK define, cita verificable y veredicto por fila, protocolo de independencia y
  reconciliación con la auditoría previa.

### Modified Capabilities

_(ninguna — no cambia el comportamiento de ningún paquete publicado ni de ningún script.)_

## Impact

- **Docs**: un archivo nuevo (`docs/conformity-report.md`) y su enlace en el mapa de
  documentación de `AGENTS.md`.
- **Paquetes publicados**: ninguno. Sin Changeset (documentación, sin cambio de
  comportamiento).
- **CI**: ninguna modificación. El informe se valida en revisión humana.
- **Entorno**: dos directorios fuera del repo (baseline y copia de fuentes); se documentan
  para que sean reproducibles, no se commitean.
