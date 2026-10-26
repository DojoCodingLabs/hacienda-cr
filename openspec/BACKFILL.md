# Recuperación de OpenSpec — 2026-10-25

## Fuentes y alcance

Se inspeccionaron las ramas remotas y el historial Git alcanzable desde ellas.
La base de esta reparación es `766190c63ed74bdf34c9363f6f3e447f70143e6f` (PR #115).

- `chore/openspec-root`: `1fbc14c373a7f15ec2c0d45bbbf177782372368c`
  incorporó la raíz original; `5f1f95af56f37f541689359ec769ef7ae2330072`
  normalizó tres archivos históricos. PR #115 ya incorpora esa historia y
  versiones archivadas posteriores de los cambios de port A4–A7 y del informe A1.
  No se restauraron esos cambios como activos ni se duplicaron sus archivos.
- A8.3: `68f9e7a` y `3dee5c4` conservan el contexto de propuesta e implementación.
  El delta está en
  `changes/archive/2026-10-20-add-a8-3-sequence-integrity/specs/sequence-integrity/spec.md`,
  pero faltaba su spec principal.
- La propuesta `refuerzo-testing-proyecto` aparece por primera vez en `766190c`.
  No se encontró un delta de cobertura en ninguna ruta del historial consultado.
  Su delta `testing-coverage` se redactó ahora desde `proposal.md`, `design.md`
  y `tasks.md`; es un contrato propuesto, no una implementación recuperada.
  Sus tareas permanecen abiertas y no se adoptaron umbrales sin medirlos.

## Rutas normalizadas

OpenSpec 1.3.1 solo descubre specs principales a un nivel. Se movieron estos
archivos sin modificar sus requirements salvo unir las líneas del primer párrafo:

| Ruta anterior de capacidad           | Nombre descubrible                   |
| ------------------------------------ | ------------------------------------ |
| `document-generation/golden-corpus`  | `document-generation-golden-corpus`  |
| `document-generation/property-based` | `document-generation-property-based` |
| `document-generation/xml-roundtrip`  | `document-generation-xml-roundtrip`  |
| `monetary/integral`                  | `monetary-integral`                  |
| `monetary/integral-codesgen`         | `monetary-integral-codesgen`         |
| `signing/verification`               | `signing-verification`               |

Los archivos históricos retienen sus nombres originales. Un cambio futuro que
modifique una de estas capacidades debe usar el nombre descubrible tanto en el
delta como en la spec principal. Los PRs apilados con deltas anidados deben
adaptarse a esta tabla antes de archivarse.

## Reconciliación de consecutivos

La spec `sequence-integrity` se contrastó con estas fuentes de la base de PR #115:

- `packages/sdk/src/config/sequence-store.ts`: asignación con documento, consulta
  de bytes, descarte, incremento legacy y piso para reinicio.
- `packages/sdk/src/config/durable-file.ts`: reemplazo durable y locks locales.
- `packages/sdk/src/config/issuance.spec.ts`: fallo antes de confirmar,
  identidad/bytes, descarte, mezcla legacy y negativa a retroceder.
- `packages/sdk/src/config/issuance-process.integration.spec.ts`: concurrencia
  entre procesos y recuperación después de SIGKILL posterior a la confirmación.
- `packages/sdk/src/config/sequence-process.integration.spec.ts`: series e
  incrementos concurrentes entre procesos.

La spec actual no copia las afirmaciones históricas de siete puntos de crash,
registro de fecha del descarte, consulta pública de toda la serie, advertencia de
deprecación o ausencia de incrementos sin documento. El código actual no ofrece
esas mismas garantías. El aislamiento por emisor y ambiente depende del directorio
elegido por el consumidor. No se modificó la implementación para satisfacer una
afirmación histórica ni se marcó ninguna aceptación fiscal como completada.

Esta revisión es limitada a la recuperación y estructura de OpenSpec; no certifica
la paridad de todas las specs históricas con el runtime actual. Los cambios de
código posteriores deben reconciliar sus propios contratos.

## Cambios de otros PRs

Las capacidades y archivos de #116 (PKCS#12), #118 (procedencia XSD), #120
(autoridad de esquemas) y #121 (calendario) pertenecen a esos PRs. No se copiaron
a #115 como si ya estuvieran aprobados o implementados en su base.

## Verificación de esta reparación

Con OpenSpec 1.3.1, después de formatear:

- `openspec validate --all --strict`: 31/31 válidos (15 specs y 16 cambios activos).
- `openspec list --specs`: 15 capacidades, todas con requirements; sin padres vacíos.
- Prettier sobre los Markdown modificados y `git diff --check`: correctos.

No se ejecutaron suites de runtime: esta reparación solo modifica Markdown bajo
`openspec/`. La validación no cierra las tareas de implementación de cobertura.
