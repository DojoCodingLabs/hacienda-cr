# hacienda-mock Specification

## Purpose

Provee un servidor mock de Hacienda v4.4 que reproduce el API de recepción con fidelidad suficiente para ejecutar la suite E2E del SDK sin credenciales ni red, incluyendo estados, headers, errores, rate limiting y callbacks asíncronos.

## Requirements

### Requirement: Reproducir el API de recepción con fidelidad

El mock SHALL implementar `POST /recepcion` y `GET /recepcion/{clave}` con los códigos y headers reales de Hacienda: 201 con `Location` al recibir, 400 con `X-Error-Cause` con la razón real del error, 401 al expirar el token, 409 para clave duplicada, 429 con `X-Ratelimit-*` con presupuesto aplicado de verdad, y transiciones de estado `recibido → procesando → aceptado/rechazado/error`.

#### Scenario: Un envío válido devuelve 201 con Location

- **WHEN** se envía un documento válido al mock
- **THEN** responde 201 con `Location: /recepcion/{clave}` y estado `recibido`

#### Scenario: Un payload inválido devuelve 400 con X-Error-Cause

- **WHEN** se envía un payload mal formado o con campos faltantes
- **THEN** responde 400 con `X-Error-Cause` conteniendo la razón real del error

#### Scenario: Un token expirado devuelve 401

- **WHEN** el token de autenticación ha expirado
- **THEN** responde 401 y el SDK puede re-autenticar

#### Scenario: Un presupuesto agotado devuelve 429 con X-Ratelimit-*

- **WHEN** se supera el presupuesto de rate limit
- **THEN** responde 429 con headers `X-Ratelimit-Limit`, `X-Ratelimit-Remaining`, `X-Ratelimit-Reset`

#### Scenario: Un estado terminal se alcanza tras transiciones

- **WHEN** se consulta `GET /recepcion/{clave}` tras el tiempo configurado
- **THEN** el estado pasa de `recibido` a `procesando` y luego a `aceptado`/`rechazado`/`error`

### Requirement: Callback asíncrono con reintentos

El mock SHALL enviar un callback POST al URL configurado con la respuesta de Hacienda, reintentando hasta 3 veces con backoff exponencial y rindiéndose si todos fallan. El callback SHALL incluir el XML de respuesta codificado en Base64.

#### Scenario: Callback exitoso en el primer intento

- **WHEN** el callback URL responde 2xx
- **THEN** el mock envía el callback una sola vez y marca el documento como notificado

#### Scenario: Callback falla y reintenta 3 veces

- **WHEN** el callback URL responde con error o timeout
- **THEN** el mock reintenta hasta 3 veces con backoff y luego se rinde

### Requirement: Autenticación offline

El mock SHALL implementar un endpoint de token (compatible con el IDP de Hacienda) que devuelva un `access_token` válido para cualquier credencial de sandbox, de modo que el SDK pueda autenticarse sin red.

#### Scenario: Token válido para credenciales de sandbox

- **WHEN** se envía una petición de token con credenciales de sandbox
- **THEN** el mock devuelve un `access_token` válido con `expires_in`

#### Scenario: Token expirado se rechaza

- **WHEN** se usa un token expirado en `POST /recepcion`
- **THEN** el mock responde 401

### Requirement: Estado reseteable por test

El mock SHALL permitir resetear su estado interno (documentos, rate limit, transiciones) para que cada test empiece limpio, sin persistencia cross-process.

#### Scenario: Reset limpia documentos y rate limit

- **WHEN** se invoca el reset del mock
- **THEN** todos los documentos y contadores de rate limit se eliminan

### Requirement: Respuestas grabadas sanitizadas

El mock SHALL usar respuestas grabadas (sanitizadas) de sandbox real para los casos de aceptación y rechazo, sin PII ni secretos, y SHALL soportar modo `record`/`replay` para capturar nuevas respuestas.

#### Scenario: Respuesta grabada se reproduce fielmente

- **WHEN** el mock responde en modo replay
- **THEN** el cuerpo y los headers coinciden con la respuesta grabada

#### Scenario: Modo record captura nuevas respuestas

- **WHEN** el mock se ejecuta en modo record contra sandbox
- **THEN** guarda la respuesta sanitizada para replay futuro

### Requirement: Integración con el SDK (switch documentado)

El SDK SHALL poder apuntar al mock cambiando `envConfig.apiBaseUrl` e `envConfig.idpTokenUrl` (o mediante `HACIENDA_MOCK_URL`/`HACIENDA_E2E_TARGET`), sin cambios de código en el SDK.

#### Scenario: Suite E2E corre contra el mock

- **WHEN** se ejecuta la suite E2E del SDK con `HACIENDA_E2E_TARGET=mock`
- **THEN** todos los tests pasan sin credenciales ni red

#### Scenario: Switch a sandbox documentado

- **WHEN** se configura `HACIENDA_E2E_TARGET=sandbox` con credenciales reales
- **THEN** la misma suite corre contra el sandbox real de Hacienda
