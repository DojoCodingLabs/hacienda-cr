## Context

Ver `proposal.md` — Why. A7 es el primer paquete nuevo del monorepo: el repo publica hoy
cuatro paquetes con versión compartida (`packagePaths`, grupo `linked` de changesets,
`validateRelease` y `verify-packages.mjs` fijan 4 tarballs). El port tiene que actualizar
ese contrato de release, no sólo añadir código.

## Goals / Non-Goals

**Goals:**

- Mock que reproduce el API de recepción con fidelidad suficiente para E2E sin credenciales.
- Hablar el idioma del árbol de destino (montos texto decimal, `MensajeHacienda` vigente).
- Entrar en la release como quinto paquete del grupo `linked`, con la misma disciplina.

**Non-Goals:**

- Sustituir al sandbox real ni servir de oráculo fiscal.
- Publicar el mock como paquete independiente con su propio ciclo de versión.
- Reimplementar lógica de dominio del SDK dentro del mock.

## Decisions

| Decisión                                             | Racional                                                                                          | Alternativas consideradas                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Quinto paquete del grupo `linked`**                | Una sola versión compartida es la que el repo ya garantiza y verifica                             | Versión propia del mock (dos ciclos de release que sincronizar) |
| **El mock consume el SDK, no lo reimplementa**       | Si el SDK cambia, el mock debe cambiar con él; duplicar lógica lo desincroniza                    | Copiar los tipos al mock (dos fuentes)                          |
| **Respuestas grabadas sanitizadas, formato vigente** | El SDK debe parsearlas sin adaptación; el formato de `main` es el que se usa en producción        | Adaptar en el cliente (oculta divergencias)                     |
| **Montos en texto decimal en la respuesta**          | Coherente con el camino de dinero del SDK tras A3                                                 | Montos como `number` (reintroduce el blocker #1)                |
| **Cambios de release en el mismo PR que el paquete** | Si el quinto paquete entra sin actualizar `packagePaths`/`verify-packages`, la release queda rota | Actualizar el release en un PR aparte (ventana rota)            |
| **La CLI `hacienda-mock` es opcional**               | Levantar el servidor en un proceso aparte es conveniencia de desarrollo, no requisito             | Sin CLI (el mock se instancia desde el test)                    |

## Risks / Trade-offs

- **[Riesgo: el contrato de release queda desalineado]** → las tareas incluyen actualizar `packagePaths`, `validateRelease` y `verify-packages.mjs` (4 → 5) antes de publicar.
- **[Riesgo: el tarball del mock arrastra dependencias del workspace]** → el mock declara `dependencies: {}` y sólo devDependencies de workspace; la verificación de tarballs lo comprueba.
- **[Riesgo: el mock acepta cualquier credencial]** → es deliberado (autenticación offline); la spec lo declara y el paquete se marca como de desarrollo, no para producción.
- **[Riesgo: divergencia con el sandbox real]** → las respuestas grabadas son un subconjunto; la suite E2E real (`HACIENDA_E2E_TARGET=sandbox`) sigue siendo la que valida contra Hacienda.
