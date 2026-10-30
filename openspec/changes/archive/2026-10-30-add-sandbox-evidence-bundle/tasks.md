## 0. Verificación de prerrequisitos

- [x] 0.1 Verificado: el SDK no reformatea el XML. `submitDocument` entrega `request` sin mutar a `httpClient.post` (`api/submission.ts`), que serializa con `JSON.stringify(options.body)` (`http-client.ts:217`). El runner construye `comprobanteXml` como `Buffer.from(signed).toString("base64")` del mismo string leído de `validation-signed.xml`, por lo que `base64decode(body.comprobanteXml) === bytes(validation-signed.xml)`. Los checks 5 y 6 de D4 aplican sin relajarse.
- [x] 0.2 Verificado: el runner escribe `validation-signed.xml` (XML firmado) y `validation-signature.json` (con `invoiceHash`, `xmlHash`, `identityHash`). Ambos nombres existen, así que `signatureHash` del manifest se calcula sobre `validation-signature.json` (no se elimina), y `signedXmlHash` se calcula con candidatos `["signed.xml", "validation-signed.xml"]`, con `signed.xml` como nombre canónico que este change introduce en `sign` (el runner sigue escribiendo `validation-signed.xml` para compatibilidad).
- [x] 0.3 Verificado: `submit` es una rama en línea de `main()`, no una función aparte; `submitAndWait` y `main` existen con las firmas asumidas y se importan de `packages/sdk/dist/index.js`. No hay renombres: Task 2.2 opera sobre la rama `submit` de `main()`.

## 1. Interceptor: cuerpo exacto y hashes

- [x] 1.1 Intercepta todo POST de receipt con `init.body` string y escribe los bytes crudos (`request.body.json`, wx, 0600) más la vista derivada (`request.pretty.json`) antes del fetch.
- [x] 1.2 El body crudo no admite campos extra (es el string transmitido byte-a-byte), así que `bodyHash` y `comprobanteXmlHash` viven en el estado en memoria (`captured.requestBodyHash`, `captured.comprobanteXmlHash`) y se registran en `manifest.links` (`requestBodyHash`, `comprobanteXmlHash`).
- [x] 1.3 La escritura de `validation-request.json` se eliminó del recorrido `submit`; `request.pretty.json` se escribe derivada del body crudo en el interceptor para todo POST de receipt.

## 2. Clasificación de resultado

- [x] 2.1 Definidas en el módulo puro `scripts/sandbox-outcome.mjs` (`RESULT_CLASSES`) con clasificadores `classifySubmissionResult`, `classifyDeliveryError`, `isDeliveryError`, `containsFiscalMarkers`; el runner importa de ahí sin duplicar lógica.
- [x] 2.2 Derivada: éxito → `classifySubmissionResult(result)` con guard de estado fiscal desconocido; errores → `classifyFailure(error)` en el catch (`INVALID_LOCAL` para errores locales; `classifyDeliveryError` con marcadores fiscales, `X-Error-Cause` y `deliveryConfirmed` del interceptor).
- [x] 2.3 El catch mantiene el `code` con safeCode `/^[A-Z_]+$/` (guardas sin regresión) y añade `outcome.class`; el manifest registra `httpStatus`, `gatewayErrorType`, `requestId` y `cfRay` en camelCase.
- [x] 2.4 `validation-result.json` guarda `{environment, class, result}`; `manifest.outcome.class` cubre camino feliz y de fallo.
- [x] 2.5 Matriz completa en `scripts/sandbox-outcome.test.mjs` (9 pruebas): 403 Cloudflare → TRANSPORT_BLOCKED; 400 sin marcadores → TRANSPORT_BLOCKED; 400 con `X-Error-Cause` → REJECTED; status fiscales → ACCEPTED/REJECTED/PENDING; `error` de Hacienda → TRANSPORT_BLOCKED; timeout con entrega confirmada → PENDING; errores locales → INVALID_LOCAL; marcadores fiscales en body string/objeto. Tabla y justificación de `X-Error-Cause` en `docs/testing/sdk-sandbox-validation.md`.

## 3. Manifest y verificación offline

- [x] 3.1a Camino feliz escribe `manifest.json` después de `validation-result.json` con los hashes de D2, incluido `responseBodyHash` desde `response.raw.json` recién escrito.
- [x] 3.1b El catch escribe manifest parcial con clase clasificada y `missing` con motivo por cada hash `null`; runs con `invoice.json` inválido quedan sin manifest (sin estado para el builder).
- [x] 3.2 `verify <dir>` off-line: check por archivo con salida 0 (VALID), 1 (CORRUPT o hashes null sin justificación) y 2 (INCOMPLETE por INVALID_LOCAL con hashes null justificados y presentes OK), distinción para scripts de CI.
- [x] 3.3 Manifest ausente → `MANIFEST_REQUIRED` con recovery y salida 1.

## 4. Documentación

- [x] 4.1 Sección «Bundle de evidencia por intento» + tabla de clasificación con justificación de `X-Error-Cause` (REJECTED), re-clasificación del 403 y comandos.
- [x] 4.2 Update 2026-10-30: conservación de evidencia implementada, 403 reclasificado `TRANSPORT_BLOCKED`, aceptación abierta, referencias coherentes pendientes.
- [x] 4.3 `verify` documentado en la sección del bundle de `sdk-sandbox-validation.md` (sin red, sin firma nueva, códigos de salida).

## 5. Verificación

- [x] 5.1 Bundle íntegro sintético (`/tmp/opencode/bundle-ok`): checks OK, resumen `VALID`, exit 0.
- [x] 5.2 Alteración de `request.body.json` detectada por `requestBodyHash` (`hash mismatch`), resumen `CORRUPT` con `causedBy`, exit 1.
- [x] 5.3 Vía mocks/fixtures sin credenciales: clasificadores puros con entradas simuladas (matriz 2.5) y exit codes verificados con bundles sintéticos por clase. No es posible mock e2e desde el runner (endpoints fijados, `fetch` no inyectable); la matriz cubre la regla exacta que consume el catch.
  - [x] 5.3a Mock de Cloudflare 403 (`IncompleteSignatureException`) → TRANSPORT_BLOCKED (matriz unitaria).
  - [x] 5.3b Mock de 400 con `X-Error-Cause` → REJECTED (matriz unitaria).
  - [x] 5.3c Mock de error local antes del POST → INVALID_LOCAL (matriz unitaria + bundle sintético parcial).
  - [ ] 5.3d (opcional, omitida): la ruta real sigue respondiendo 403 del gateway; se retoma cuando haya escenario con 200 `ind-estado` observable.
- [x] 5.4 `node --test scripts/validate-sdk-sandbox.test.mjs` (4/4) + `node --test scripts/sandbox-outcome.test.mjs` (9/9), guardas sin regresiones.

## 6. Cierre post-merge

- [x] 6.1 Nota de estado 2026-10-30 en `docs/testing/sdk-robustness-audit.md` (ubicación real del audit; la ruta `INDENTS/` del task no existe en el repo): conservación implementada, referencias coherentes pendientes (`add-coherent-reference-rehearsal`), aceptación bloqueada por 403; cierre final al mergear ambos changes.
