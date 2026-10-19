## MODIFIED Requirements

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

## ADDED Requirements

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
