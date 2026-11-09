## MODIFIED Requirements

### Requirement: Reproducir el API de recepción con fidelidad

El mock SHALL implementar `POST /recepcion` y `GET /recepcion/{clave}` con los códigos y headers reales de Hacienda: 201 con `Location` al recibir, 400 con `X-Error-Cause` con la razón real del error, 401 al expirar el token, 409 para clave duplicada, 429 con `X-Ratelimit-*` con presupuesto aplicado de verdad, y transiciones de estado `recibido → procesando → aceptado/rechazado/error`. Todo cuerpo de request que no sea un objeto JSON con los campos exigidos SHALL rechazarse con 400, incluidos los cuerpos que son JSON válido pero no son objetos.

#### Scenario: Un envío válido devuelve 201 con Location

- **WHEN** se envía un documento válido al mock
- **THEN** responde 201 con `Location: /recepcion/{clave}` y estado `recibido`

#### Scenario: Un payload inválido devuelve 400 con X-Error-Cause

- **WHEN** se envía un payload mal formado o con campos faltantes
- **THEN** responde 400 con `X-Error-Cause` conteniendo la razón real del error

#### Scenario: Un cuerpo `null` devuelve 400 con X-Error-Cause

- **WHEN** se envía `POST /recepcion` autenticado cuyo cuerpo es el literal JSON `null`
- **THEN** responde 400 con `X-Error-Cause` y el mock sigue atendiendo requests después

#### Scenario: Un cuerpo escalar devuelve 400 con X-Error-Cause

- **WHEN** se envía `POST /recepcion` autenticado cuyo cuerpo es un número, una cadena o un booleano JSON
- **THEN** responde 400 con `X-Error-Cause` y el mock sigue atendiendo requests después

#### Scenario: Un cuerpo sobre el límite devuelve 400

- **WHEN** se envía a cualquier endpoint un cuerpo mayor que el límite de bytes aceptado
- **THEN** responde 400 sin esperar a leer el resto del cuerpo y el mock sigue atendiendo requests después

#### Scenario: Un `Host` malformado no altera el ruteo

- **WHEN** una request llega con un header `Host` que no forma una URL válida
- **THEN** se atiende según su path como cualquier otra request y el mock sigue atendiendo requests después

#### Scenario: Un token expirado devuelve 401

- **WHEN** el token de autenticación ha expirado
- **THEN** responde 401 y el SDK puede re-autenticar

#### Scenario: Un presupuesto agotado devuelve 429 con X-Ratelimit-*

- **WHEN** se supera el presupuesto de rate limit
- **THEN** responde 429 con headers `X-Ratelimit-Limit`, `X-Ratelimit-Remaining`, `X-Ratelimit-Reset`

#### Scenario: Un estado terminal se alcanza tras transiciones

- **WHEN** se consulta `GET /recepcion/{clave}` tras el tiempo configurado
- **THEN** el estado pasa de `recibido` a `procesando` y luego a `aceptado`/`rechazado`/`error`

## ADDED Requirements

### Requirement: El mock sobrevive a cualquier request fallida

Una request individual SHALL NOT terminar el proceso del mock. Cualquier fallo al leer el cuerpo, al interpretarlo, al despachar la ruta o una desconexión del cliente SHALL quedar contenido en esa request, de modo que las requests siguientes se sigan atendiendo con normalidad. El proceso SHALL mantenerse vivo sin depender de un handler global de `unhandledRejection` o `uncaughtException`.

#### Scenario: Una request fallida no detiene al servidor

- **WHEN** una request provoca un error interno o una excepción durante su manejo
- **THEN** el mock responde con 4xx o 5xx y una segunda request posterior se atiende con normalidad

#### Scenario: Una desconexión a mitad de cuerpo no detiene al servidor

- **WHEN** el cliente corta la conexión después de enviar solo parte del cuerpo declarado
- **THEN** el mock no termina el proceso y la siguiente request se atiende con normalidad

#### Scenario: El proceso no depende de handlers globales

- **WHEN** el mock se ejecuta en un proceso sin listeners de `unhandledRejection` ni `uncaughtException`
- **THEN** las requests hostiles anteriores no terminan el proceso
