## Purpose

Define el contrato del bundle de evidencia por intento de envío sandbox: artefactos mínimos, hashes, cadena de integridad, clasificación de resultado y verificación offline. Permite demostrar, sin red ni nueva firma, que el request, la firma y la respuesta de un intento pertenecen al mismo comprobante y al mismo envío.

## ADDED Requirements

### Requirement: Artefactos mínimos del bundle

El runner SHALL producir, en el directorio del run, al menos los siguientes archivos tras un intento completo: `invoice.json` (entrada fuente), `unsigned.xml`, `signed.xml`, el cuerpo exacto transmitido del POST (`request.body.json` o equivalente), los artefactos HTTP crudos (`validation-http-*.json`), `validation-signature.json`, `validation-attempt.json` y `validation-result.json` (cuando haya respuesta). Ningún artefacto del bundle SHALL contener tokens, contraseñas, PINs, claves privadas ni cuerpos de respuesta OAuth.

#### Scenario: Bundle completo tras un intento

- **WHEN** un intento `submit` termina (aceptado, rechazado o bloqueado)
- **THEN** el directorio contiene los artefactos mínimos listados y `validation-result.json` registra la clase de resultado

#### Scenario: Secretos ausentes del bundle

- **WHEN** se inspecciona cualquier archivo del bundle
- **THEN** no contiene `access_token`, contraseña, PIN, clave privada ni cuerpo OAuth

### Requirement: Cuerpo exacto del POST

El bundle SHALL conservar el cuerpo del POST **byte-a-byte** tal como se transmitió (serialización compacta, sin re-formateo). El hash SHA-256 de esos bytes SHALL registrarse en el `manifest.json` y SHALL coincidir con el hash del valor que el SDK envió como `body` del request HTTP.

#### Scenario: El cuerpo guardado es el enviado

- **WHEN** se compara el hash del archivo del cuerpo guardado con el hash del cuerpo HTTP capturado por el interceptor
- **THEN** ambos hashes coinciden

#### Scenario: El comprobante viaja dentro del cuerpo

- **WHEN** se decodifica el campo `comprobanteXml` del cuerpo guardado (base64)
- **THEN** el resultado es byte-a-byte igual a `signed.xml`

### Requirement: Cadena de integridad (manifest)

El bundle SHALL incluir un `manifest.json` que registre, como mínimo: versión del formato, ambiente, clave, `identityHash`, tipo de documento, y los hashes SHA-256 de `invoice.json`, `unsigned.xml`, `signed.xml`, el cuerpo del POST y la respuesta cruda de Hacienda (cuando exista). El manifest SHALL vincular el cuerpo del POST con `signed.xml` mediante el hash del `comprobanteXml` decodificado.

#### Scenario: Manifest presente y completo

- **WHEN** se completa un intento
- **THEN** existe `manifest.json` con todos los hashes listados y su versión de formato

#### Scenario: Un hash no coincide

- **WHEN** se altera cualquiera de los artefactos después del intento
- **THEN** el verificador detecta la discrepancia y reporta el artefacto afectado

### Requirement: Clasificación de resultado

El resultado de un intento SHALL clasificarse en una de: `ACCEPTED`, `REJECTED`, `TRANSPORT_BLOCKED`, `PENDING`, `INVALID_LOCAL`. Un bloqueo de infraestructura (p. ej. HTTP 403 de gateway, timeout de red, error de DNS/TLS) SHALL clasificarse como `TRANSPORT_BLOCKED`, nunca como `INVALID_LOCAL` ni como rechazo fiscal. Un rechazo fiscal (Hacienda devuelve `rechazado` con motivo) SHALL clasificarse como `REJECTED`.

#### Scenario: 403 de gateway se clasifica como transporte

- **WHEN** el POST o el GET de estado reciben HTTP 403 del gateway (p. ej. `IncompleteSignatureException`)
- **THEN** `validation-result.json`/`manifest.json` registra `TRANSPORT_BLOCKED` y conserva `httpStatus`, `gatewayErrorType`, `requestId` y `cf-ray` cuando estén disponibles

#### Scenario: Rechazo fiscal se distingue

- **WHEN** Hacienda devuelve un estado `rechazado` con motivo
- **THEN** la clase es `REJECTED` y se conserva el motivo y el `responseXml`

#### Scenario: Aceptación terminal

- **WHEN** Hacienda devuelve estado `aceptado`
- **THEN** la clase es `ACCEPTED` y se conserva el `responseXml`

### Requirement: Verificación offline del bundle

El runner SHALL exponer un comando `verify <dir>` que, sin red ni firma nueva, re-calcule cada hash del `manifest.json`, compruebe la cadena (cuerpo → `signed.xml` → `unsigned.xml` + firma), verifique que los segmentos de la clave (emisor, consecutivo, tipo) coincidan con `invoice.json`, y reporte `OK`/`FAIL` por artefacto con código de salida 0/1.

#### Scenario: Bundle íntegro

- **WHEN** se ejecuta `verify` sobre un bundle no alterado
- **THEN** todos los checks reportan OK y el código de salida es 0

#### Scenario: Bundle alterado

- **WHEN** se ejecuta `verify` sobre un bundle con un artefacto modificado
- **THEN** el check afectado reporta FAIL, se identifica el artefacto y el código de salida es 1

#### Scenario: Verify no usa red

- **WHEN** se ejecuta `verify` sin credenciales ni red
- **THEN** completa usando solo los archivos del directorio

### Requirement: Identidad del comprobante en el bundle

El bundle SHALL vincular la clave con el emisor y el consecutivo del `invoice.json` (segmentos de la clave: posiciones 9-21 = emisor padStart(12), 21-41 = consecutivo). Un intento SHALL fallar antes de firmar/enviar si esa identidad no coincide.

#### Scenario: Identidad inconsistente bloquea el intento

- **WHEN** `invoice.clave` no coincide con `emisor.identificacion.numero` o `numeroConsecutivo`
- **THEN** el runner aborta con `IDENTITY_MISMATCH` antes de firmar ni enviar

### Requirement: Secretos fuera del bundle

Ningún artefacto del bundle SHALL contener tokens, contraseñas, PINs, claves privadas, certificados ni cuerpos de respuesta OAuth. El interceptor HTTP SHALL seguir capturando solo los headers de enrutamiento y el cuerpo de recepción, nunca el `Authorization`.

#### Scenario: Authorization no persistido

- **WHEN** se inspeccionan los artefactos HTTP capturados
- **THEN** ninguno contiene el header `Authorization` ni un `access_token`
