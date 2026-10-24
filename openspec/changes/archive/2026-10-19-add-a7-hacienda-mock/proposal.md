## Why

El SDK depende del sandbox real de Hacienda para validar el flujo end-to-end, lo que bloquea CI, pruebas offline y el desarrollo de la Ruta B. A7 añade un mock independiente que reproduce el API de recepción (estados, headers, errores, rate limiting y callbacks) para que la suite E2E corra sin credenciales ni red, y se pueda publicar como paquete reutilizable.

## What Changes

- **Paquete nuevo `packages/mock`** (Node puro, sin dependencias externas) con `createMockServer(options)` y un bin `hacienda-mock`.
- **Endpoints de recepción**: `POST /recepcion` (201/400/401/409/429 con headers reales), `GET /recepcion/{clave}` (transición `recibido→procesando→aceptado/rechazado`), `POST /token` para auth offline.
- **Comportamiento asíncrono**: callback POST con reintentos (3) y backoff; estados que toman tiempo.
- **Rate limiting real**: presupuesto aplicado por token/IP con headers `X-Ratelimit-*`.
- **Respuestas grabadas sanitizadas** de sandbox (fixtures) para fidelidad.
- **Integración con el SDK**: switch documentado (`HACIENDA_E2E_TARGET=mock|sandbox`, `HACIENDA_MOCK_URL`) y suite E2E contra el mock.
- **Publicación**: `hacienda-mock` publicable con README y quickstart.

**BREAKING**: ninguno; es un paquete nuevo.

## Capabilities

### New Capabilities

- `hacienda-mock`: servidor mock de Hacienda v4.4 con fidelidad de recepción (estados, headers, errores, rate limiting, callbacks) para pruebas offline y desarrollo.

### Modified Capabilities

Ninguna. A7 sólo añade; no cambia el SDK ni los constructores.

## Impact

- **Código afectado**: `packages/mock/src/*` (nuevo), tests E2E del SDK apuntando al mock, `packages/sdk/README.md` (switch), changeset.
- **Dependencias**: ninguna nueva obligatoria (Node puro).
- **Validación offline**: la suite E2E corre sin credenciales ni red.
- **Riesgo residual**: fidelidad del mock vs sandbox real (se valida en semana 8); transiciones configurables para tests.
