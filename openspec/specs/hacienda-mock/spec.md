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

El mock SHALL usar respuestas grabadas (sanitizadas) de sandbox real para los casos de aceptación y rechazo, sin PII ni secretos, y SHALL soportar modo `record`/`replay` para capturar nuevas respuestas. Las respuestas grabadas SHALL reflejar el formato vigente del `MensajeHacienda` del árbol de destino — estado, código de respuesta, detalle y fecha de proceso — y los montos que contengan SHALL estar en texto decimal acotado, en la misma notación que el SDK emite, de modo que el SDK pueda parsear la respuesta sin conversión binaria.

#### Scenario: Respuesta grabada se reproduce fielmente

- **WHEN** el mock responde en modo replay
- **THEN** el cuerpo y los headers coinciden con la respuesta grabada

#### Scenario: Modo record captura nuevas respuestas

- **WHEN** el mock se ejecuta en modo record contra sandbox
- **THEN** guarda la respuesta sanitizada para replay futuro

#### Scenario: La respuesta grabada es parseable por el SDK

- **WHEN** el SDK recibe del mock una respuesta de aceptación o rechazo
- **THEN** la parsea con el mismo formato de `MensajeHacienda` que usa en el
  sandbox real, sin adaptación ni campos extra

#### Scenario: Los montos de la respuesta viajan como texto decimal

- **WHEN** la respuesta grabada incluye un monto
- **THEN** aparece como texto decimal acotado, idéntico al que el SDK emitiría

### Requirement: Integración con el SDK (switch documentado)

El SDK SHALL poder apuntar al mock cambiando `envConfig.apiBaseUrl` y `envConfig.idpTokenUrl` (o mediante `HACIENDA_MOCK_URL`/`HACIENDA_E2E_TARGET`), sin cambios de código en el SDK. El mock SHALL consumir el SDK del árbol de destino por su API pública, de modo que cualquier cambio de contrato del SDK se refleje en el mock sin que éste tenga que anticiparlo.

#### Scenario: Suite E2E corre contra el mock

- **WHEN** se ejecuta la suite E2E del SDK con `HACIENDA_E2E_TARGET=mock`
- **THEN** todos los tests pasan sin credenciales ni red

#### Scenario: Switch a sandbox documentado

- **WHEN** se configura `HACIENDA_E2E_TARGET=sandbox` con credenciales reales
- **THEN** la misma suite corre contra el sandbox real de Hacienda

#### Scenario: El mock no reimplementa el SDK

- **WHEN** se revisa el código del mock
- **THEN** usa los tipos y las funciones públicas del SDK en vez de duplicar su
  lógica de dominio

### Requirement: El mock se publica como quinto paquete del grupo linked

El mock SHALL publicarse como paquete del mismo grupo de versión compartida que el
resto del monorepo, de modo que la release del repositorio lo incluya con la
misma versión que los demás paquetes. La validación de release SHALL exigir la
misma versión en los cinco paquetes, y la verificación de paquetes publicados
SHALL comprobar que los cinco tarballs se instalan y se consumen correctamente
desde un consumidor limpio.

#### Scenario: La release cubre los cinco paquetes

- **WHEN** se prepara una release del repositorio
- **THEN** la lista de paquetes publicados incluye el mock con la misma versión
  compartida que el resto

#### Scenario: El consumidor de los tarballs incluye el mock

- **WHEN** la verificación de paquetes instala los tarballs publicados en un
  proyecto limpio
- **THEN** compila un consumidor que importa el mock y comprueba su API pública
