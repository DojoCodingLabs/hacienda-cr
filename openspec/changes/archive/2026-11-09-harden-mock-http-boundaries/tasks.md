## 1. Baseline y comando de verificación

- [x] 1.1 Ejecutar `pnpm --filter @dojocoding/hacienda-mock test` y confirmar la suite verde actual (16 tests) antes de tocar nada; guardar la salida como baseline.
- [x] 1.2 Confirmar el comando de test focalizado que se usará en cada ciclo RED/GREEN (`pnpm --filter @dojocoding/hacienda-mock exec vitest run src/server.spec.ts -t "<nombre>"`) contra un test existente.
- [x] 1.3 Anotar en este archivo, bajo el grupo correspondiente, la traza observada en cada RED (tipo de error y punto de origen), para que el fix quede justificado por evidencia y no por el correo externo.

## 2. Vector sin autenticación: `Host` malformado

- [x] 2.1 RED: añadir en `packages/mock/src/server.spec.ts` un test que abra un socket `node:net` y envíe `GET /recepcion/{clave50} HTTP/1.1` con `Host: bad host`; aseverar que la respuesta es la que corresponde al path (404/200, no crash).
- [x] 2.2 RED: ejecutar el test focalizado y registrar el fallo (`TypeError: Invalid URL` desde `new URL` en el listener, proceso termina con exit 1).
- [x] 2.3 GREEN: construir la URL con base constante (`new URL(req.url ?? "/", "http://mock.invalid")`) en el listener, sin leer `req.headers.host`.
- [x] 2.4 GREEN: re-ejecutar el test focalizado y confirmar que pasa sin tocar los otros 16.
- [x] 2.5 Añadir al mismo test una segunda request en la misma instancia del mock y aseverar que también se atiende (contrato de supervivencia).

## 3. Vector sin autenticación: cuerpo sobre el límite

- [x] 3.1 RED: test que envía a `/auth/realms/rut-stag/protocol/openid-connect/token` un cuerpo mayor que `MAX_BODY_BYTES`; aseverar `400` con `X-Error-Cause`.
- [x] 3.2 RED: test de supervivencia posterior (nueva request al mismo mock responde con normalidad).
- [x] 3.3 RED: ejecutar ambos y registrar el fallo (`Error: Request body too large.` como unhandled rejection, process exit 1).
- [x] 3.4 GREEN: cambiar `readBody` para resolver un resultado discriminado (`ok: true | false` con `reason: "too-large" | "aborted"`) en lugar de rechazar.
- [x] 3.5 GREEN: en `handleToken`, responder `400` con `X-Error-Cause` cuando `reason === "too-large"`, sin escribir nada cuando `reason === "aborted"`.
- [x] 3.6 GREEN: en `handleSubmit`, adaptar el `try/catch` existente al nuevo resultado conservando el `400` actual y sin cambiar mensajes que los tests ya asertan.
- [x] 3.7 Verificar que el `400` se emite antes de destruir el stream y con `Connection: close`, para que el cliente vea el status cuando el upload es lento.

## 4. Vector sin autenticación: desconexión a mitad de cuerpo

- [x] 4.1 RED: test con socket `node:net` que declara un `Content-Length` mayor a lo enviado, escribe un prefijo y destruye el socket; aseverar que el mock sigue vivo y atiende la siguiente request.
- [x] 4.2 RED: ejecutar y registrar el fallo (`Error: aborted` / `ECONNRESET` no capturado, process exit 1).
- [x] 4.3 GREEN: mapear el evento `error` y la desconexión de `req` al resultado `{ ok: false, reason: "aborted" }` de 3.4, sin responder al peer.
- [x] 4.4 GREEN: confirmar que no queda ninguna ruta que rechace desde `readBody` (búsqueda de `reject(` en `readBody` solo para el caso ya cubierto o inexistente).
- [x] 4.5 Añadir `res.on("error", ...)` en el límite de despacho para que un `end()` sobre socket muerto no emerja como evento `'error'` no manejado.

## 5. Vector autenticado reportado: cuerpo JSON no-objeto

- [x] 5.1 RED: test autenticado con `body: "null"` contra `POST /recepcion`; aseverar `400` y `X-Error-Cause` que mencione el cuerpo.
- [x] 5.2 RED: test autenticado con cuerpos escalares (`"42"`, `"\"texto\""`, `"true"`) contra `POST /recepcion`; aseverar `400` en cada uno.
- [x] 5.3 RED: ejecutar los cuatro casos y registrar el fallo (`TypeError: Cannot read properties of null (reading 'clave')`, exit 1) más el `400` incorrecto o ausente de los escalares.
- [x] 5.4 GREEN: validar que el resultado de `JSON.parse` es un objeto no nulo y no array antes de leer `clave`; responder `400` con un `X-Error-Cause` propio ("The request body must be a JSON object.").
- [x] 5.5 GREEN: re-ejecutar 5.1–5.2 y confirmar verde, sin cambios en los mensajes de error de los tests existentes.

## 6. Contención en el límite de despacho

- [x] 6.1 RED: test que fuerza un fallo interno controlado durante el manejo de una request (por ejemplo `outcome` como función que lanza, ya soportada por las opciones) y asevera `500` con `X-Error-Cause` más supervivencia posterior.
- [x] 6.2 RED: ejecutar y registrar el fallo (rejection sin capturar, process exit 1).
- [x] 6.3 GREEN: introducir el helper de despacho que envuelve la invocación del handler, captura throw síncrono y rejection, responde `500` si los headers no salieron, destruye el socket si ya salieron, y loguea vía la opción `logger`.
- [x] 6.4 GREEN: rutear los tres handlers (`handleToken`, `handleSubmit`, `handleStatus`) y el parseo de URL a través del helper; eliminar los `void (async () => {...})()` sueltos.
- [x] 6.5 Verificar que no se añade ningún listener de `unhandledRejection`/`uncaughtException` en `packages/mock/src/cli.ts` ni en el resto del repo.
- [x] 6.6 Evitar el doble envío: `sendJson`/`sendError` no deben escribir si `res.writableEnded || res.destroyed`.

## 7. Refactor y cobertura del contrato

- [x] 7.1 Releer los tests nuevos y renombrarlos para que cada uno describa el comportamiento ("rejects a JSON null body with 400"), no el mecanismo.
- [x] 7.2 Confirmar que cada escenario del delta en `specs/hacienda-mock/spec.md` tiene al menos un test que lo cubre, incluidos los dos de supervivencia.
- [x] 7.3 Confirmar que ningún test existente fue debilitado ni eliminado; el diff de `server.spec.ts` solo agrega.
- [x] 7.4 Actualizar `packages/mock/README.md` solo si menciona el manejo de errores del servidor; si no lo menciona, no tocar documentación.

## 8. Verificación final

- [x] 8.1 `pnpm --filter @dojocoding/hacienda-mock exec tsc --noEmit`.
- [x] 8.2 `pnpm --filter @dojocoding/hacienda-mock lint`.
- [x] 8.3 `pnpm --filter @dojocoding/hacienda-mock test` completo en verde.
- [x] 8.4 Reproducir manualmente los cuatro vectores contra el mock levantado (`pnpm --filter @dojocoding/hacienda-mock exec node dist/cli.js`) y verificar que el proceso sigue vivo después de cada uno; esto complementa, no reemplaza, los tests.
- [x] 8.5 `pnpm verify` como gate de CI (requiere `xmllint`), o documentar por qué no se pudo correr y qué subconjunto sí se ejecutó.
- [x] 8.6 `openspec validate harden-mock-http-boundaries --strict`.
- [x] 8.7 Evaluar Changeset: el paquete es `private: true`, así que no se publica; registrar en el change que no aplica bump, salvo que `packages/mock/CHANGELOG.md` se mantenga a mano por convención del repo.
