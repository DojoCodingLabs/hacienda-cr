## Why

La ejecución sandbox del SDK ya autentica, firma y envía, pero la evidencia de un intento queda dispersa en archivos sueltos (`invoice.json`, `unsigned.xml`, `validation-signed.xml`, `validation-request.json`, `validation-http-*.json`, `validation-result.json`) que nadie puede re-verificar después. Peor: el request guardado es un JSON re-serializado con indentación, no los bytes que viajaron por la red (`packages/sdk/src/api/http-client.ts` envía `JSON.stringify(body)` compacto), y un bloqueo de infraestructura (el 403 `IncompleteSignatureException` actual del gateway) se clasifica como `VALIDATION_FAILED`, confundiendo una capa de transporte con una de validación.

El audit (`INDENTS/sdk-robustness-audit.md`, ítem 3) pide explícitamente "conservar request, firma y respuesta". Hoy no hay forma de demostrar que esos tres artefactos pertenecen al mismo intento, ni de re-auditarlos sin red, ni de clasificar honestamente un resultado bloqueado. Esta propuesta cierra esa capacidad **sin** depender de que Hacienda responda: el formato del bundle y su verificador son 100% offline; la línea de aceptación queda abierta hasta que la ruta del sandbox funcione.

## What Changes

- Se introduce un **bundle de evidencia** por intento (directorio del run) con un `manifest.json` que encadena hashes: `invoice.json` → `unsigned.xml` → `signed.xml` → cuerpo exacto del POST → respuesta cruda de Hacienda. El cuerpo transmitido se conserva byte-a-byte (no re-serializado).
- Se agrega el comando `verify` al runner (`scripts/validate-sdk-sandbox.mjs`), que re-calcula cada hash y comprueba que `base64decode(request.body.comprobanteXml) === signed.xml`, que la firma corresponde al XML no firmado, y que los segmentos de la clave coinciden con el emisor/consecutivo del `invoice.json`. Sin red, sin firma nueva.
- Se añade la clase de resultado `TRANSPORT_BLOCKED` (junto a `ACCEPTED`, `REJECTED`, `PENDING`, `INVALID_LOCAL`) para distinguir un bloqueo de gateway/infraestructura de un rechazo fiscal o de un error local. El runner deja de mapear un 403 de gateway a `VALIDATION_FAILED`.
- Se documenta el bundle y su verificador en `docs/testing/sdk-sandbox-validation.md`, incluyendo la clasificación del 403 actual como evidencia de transporte (no de aceptación ni de rechazo fiscal).
- **No** se modifica el SDK ni el shared: el runner y la documentación son los únicos tocados. No hay cambioset (herramienta interna, no API publicada).

**Nota de alcance:** este change NO cierra el ítem 3 del audit. Cierra la infraestructura de conservación de evidencia, pero la verificación real contra Hacienda sigue bloqueada por el 403 del gateway. El ítem se cierra cuando el 403 se resuelva y se capture una aceptación o rechazo controlado real.

## Capabilities

### New Capabilities

- `sandbox-evidence-bundle`: contrato del bundle de evidencia por intento sandbox (artefactos mínimos, hashes, cadena de integridad, clasificación de resultado y verificación offline).

### Modified Capabilities

- (ninguna: el runner no tiene spec previa; `hacienda-mock` y `reference-integrity` no cambian).

## Impact

- `scripts/validate-sdk-sandbox.mjs`: añadir captura byte-exacta del cuerpo POST (ya disponible en `sdkFetch` vía `init.body`), escritura de `manifest.json`, comando `verify`, y clasificación `TRANSPORT_BLOCKED`.
- `docs/testing/sdk-sandbox-validation.md`: sección del bundle y del verificador; re-clasificación del 403 actual.
- `docs/testing/sdk-validation-iterations.md`: actualizar estado del ítem 3 (evidencia de transporte conservada; aceptación abierta).
- Sin cambios en `packages/*`, sin changeset, sin bump de versión.
- Dependencia externa (no controlable): la ruta sandbox sigue devolviendo 403; este change no la resuelve ni la oculta.
