# @dojocoding/hacienda-mock

## 0.4.1

### Minor Changes

- A7 — mock del API de recepción de Hacienda: reproduce el API v4.4 (`201` con `Location`, `400` con `X-Error-Cause`, `401`, `409`, `429` con `X-Ratelimit-*`, callback asíncrono con reintentos y transiciones de estado) para correr la suite E2E del SDK sin credenciales ni red.
