# OpenSpec — raíz de planificación de este repositorio

Este directorio es la raíz OpenSpec del proyecto: aquí viven las **specs** (los
contratos de comportamiento) y los **changes** (las propuestas de trabajo, con su
propuesta, delta de spec, diseño y tareas).

```
openspec/
├── config.yaml            # esquema de flujo (spec-driven) y reglas por artefacto
├── specs/                 # specs principales: el comportamiento vigente, por capacidad
│   ├── codes-extraction/       codes-generation/      conformity-report/
│   ├── document-generation-*/  hacienda-mock/         monetary-*/
│   ├── signing-verification/   spec-integrity/        xml-hostile-inputs/
│   └── business-days/          delivery/              sequence-integrity/
└── changes/               # cambios en curso y su historial
    ├── <change-activo>/      # proposal.md + specs/<capability>/spec.md + design.md + tasks.md
    └── archive/              # cambios ya aplicados, por fecha: YYYY-MM-DD-<nombre>
```

## Convenciones

- **Una spec principal por capacidad.** El path de la capability es estable: si un
  cambio la modifica, su delta va en `changes/<change>/specs/<misma-ruta>/spec.md`.
- **Las capacidades tienen un solo segmento.** La CLI OpenSpec 1.3.1 descubre
  `specs/<capacidad>/spec.md`, sin recorrer subdirectorios. Usar guiones para
  agrupar nombres; no crear capacidades anidadas con `/`.
- **Un cambio = una propuesta con cuatro artefactos**: `proposal.md` (qué y por qué),
  el delta de spec (qué debe hacer el sistema), `design.md` (cómo) y `tasks.md` (pasos).
- **El delta sincroniza la spec principal al archivar.** `MODIFIED` reescribe el
  requirement completo (con sus escenarios), `ADDED` lo suma, `REMOVED` lo retira
  con razón y plan de migración.
- **El archivo es el historial.** `changes/archive/YYYY-MM-DD-<nombre>/` conserva la
  propuesta tal como se aplicó, con la fecha en que entró.
- **Una spec principal nunca se edita a mano para aplicar un cambio**: el cambio lleva el
  delta y la sincronización ocurre al archivar.

## Relación con el código

Las specs describen **comportamiento observable**, no implementación: lo que el SDK
puede usarse para hacer, qué entradas acepta y qué errores devuelve. Los nombres de
archivos, las clases y los pasos de implementación van en `design.md` y `tasks.md`, no
en la spec.

Una spec puede describir un comportamiento que **todavía no existe** (el delta la
declara; el código llega después) o uno que **ya no aplica** (el `REMOVED` la retira).
Los archivos conservan el contrato y la evidencia de su momento; una tarea marcada
como completa no demuestra que el código actual mantenga ese comportamiento. Para
el comportamiento vigente prevalecen las fuentes, manifests y CI, como indica
`AGENTS.md`. Las diferencias deben reconciliarse con evidencia explícita.

La recuperación desde ramas e historial, los nombres normalizados y los límites
de la reconciliación están en [BACKFILL.md](BACKFILL.md).

## Herramientas

```sh
openspec list                      # cambios en curso y su avance
openspec list --specs              # capacidades descubiertas y requirements
openspec validate --specs          # specs principales
openspec validate --all --strict   # specs y deltas de cambios activos
openspec validate <change>         # un cambio concreto
openspec show <change>             # proposal, spec y tareas de un cambio
```

El flujo completo (`propose` → `apply` → `archive`) vive en las instrucciones de
OpenSpec; este README sólo describe el layout.

Estos comandos se verificaron con OpenSpec 1.3.1. Esa versión lee solo la primera
línea física del texto de cada requirement principal al comprobar `SHALL`/`MUST`;
conservar su primer párrafo en una sola línea. Validar de nuevo tras formatear.
La validación estructural no verifica que el código cumpla el contrato ni valida
automáticamente los archivos históricos.
