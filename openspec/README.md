# OpenSpec — raíz de planificación de este repositorio

Este directorio es la raíz OpenSpec del proyecto: aquí viven las **specs** (los
contratos de comportamiento) y los **changes** (las propuestas de trabajo, con su
propuesta, delta de spec, diseño y tareas).

```
openspec/
├── config.yaml            # esquema de flujo (spec-driven) y reglas por artefacto
├── specs/                 # specs principales: el comportamiento vigente, por capacidad
│   ├── codes-extraction/     codes-generation/     conformity-report/
│   ├── document-generation/   hacienda-mock/        monetary/
│   ├── signing/               spec-integrity/       xml-hostile-inputs/
└── changes/               # cambios en curso y su historial
    ├── <change-activo>/      # proposal.md + specs/<capability>/spec.md + design.md + tasks.md
    └── archive/              # cambios ya aplicados, por fecha: YYYY-MM-DD-<nombre>
```

## Convenciones

- **Una spec principal por capacidad.** El path de la capability es estable: si un
  cambio la modifica, su delta va en `changes/<change>/specs/<misma-ruta>/spec.md`.
- **Un cambio = una propuesta con cuatro artefactos**: `proposal.md` (qué y por qué),
  el delta de spec (qué debe hacer el sistema), `design.md` (cómo) y `tasks.md` (pasos).
- **El delta sincroniza la spec principal al archivar.** `MODIFIED` reescribe el
  requirement completo (con sus escenarios), `ADDED` lo suma, `REMOVED` lo retira
  con razón y plan de migración.
- **El archivo es el historial.** `changes/archive/YYYY-MM-DD-<nombre>/` conserva la
  propuesta tal como se aplicó, con la fecha en que entró.
- **Una spec principal nunca se edita a mano para 대형 un cambio**: el cambio lleva el
  delta y la sincronización ocurre al archivar.

## Relación con el código

Las specs describen **comportamiento observable**, no implementación: lo que el SDK
puede usarse para hacer, qué entradas acepta y qué errores devuelve. Los nombres de
archivos, las clases y los pasos de implementación van en `design.md` y `tasks.md`, no
en la spec.

Una spec puede describir un comportamiento que **todavía no existe** (el delta la
declara; el código llega después) o uno que **ya no aplica** (el `REMOVED` la retira).
Por eso el estado de una spec no se deduce del código: se deduce de los cambios
archivados.

## Herramientas

```sh
openspec list                      # cambios en curso y su avance
openspec validate --specs          # specs principales
openspec validate <change>         # un cambio concreto
openspec show <change>             # proposal, spec y tareas de un cambio
```

El flujo completo (`propose` → `apply` → `archive`) vive en las instrucciones de
OpenSpec; este README sólo describe el layout.
