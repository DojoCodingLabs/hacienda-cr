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

## Desviaciones encontradas al portar sobre `main`

1. **El fixture usaba la clase `Money`, que no existe.** La clase fue
   rechazada por el review de `main` (su frontera normalizaba a `Number` y
   `Money.toJSON` rompía `structuredClone`). El fixture ahora usa el tipo que
   **declara** cada constructor: los constructores legacy toman números y los
   exactos texto decimal acotado. Este fixture recorre el camino legacy.

2. **La clave escrita a mano ya no pasaba la identidad.** El fixture traía una
   clave cuyo segmento de fecha no coincidía con su `fechaEmision`, y los
   constructores de `main` validan la clave contra el contribuyente, la fecha y
   el consecutivo. La clave se **deriva** con `buildClave` del propio SDK
   (`DocumentType.FACTURA_ELECTRONICA`, `Situation.NORMAL`) y el consecutivo
   sale de su tramo: sin duplicar la regla de dominio en el mock.

3. **El paquete entra con la versión del grupo.** `packages/mock` nace en
   `0.10.0` —la versión compartida de los otros cuatro paquetes— para que la
   release los suba juntos. Su `CHANGELOG` arranca en esa versión.

4. **El release: de cuatro paquetes a cinco.** `packagePaths` incluye
   `packages/mock`; la verificación de paquetes espera cinco tarballs y su
   consumidor importa `createMockServer`; `validateRelease` y el grupo `linked`
   de changesets no tenían el número escrito a mano, así que basta con que el
   paquete entre en `packagePaths` y en el patrón `@dojocoding/*`. El
   `pnpm-workspace.yaml` ya usa `packages/*`: el mock entra sin tocarlo.

5. **El mock no tiene dependencias de runtime.** El servidor usa sólo
   `node:http`; el SDK y el shared son devDependencies (para la fixture y la
   suite E2E), de modo que el tarball instalado funciona sin ellos. La
   verificación de paquetes lo comprueba: el consumidor instala los cinco
   tarballs y compila.
