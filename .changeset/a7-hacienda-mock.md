---
"@dojocoding/hacienda-mock": minor
---

A7 — mock del API de recepción de Hacienda

Nuevo paquete `@dojocoding/hacienda-mock`: un servidor (Node 22, sin dependencias de runtime) que reproduce el API de recepción v4.4 con las partes que importan en producción.

- `POST /recepcion` → `201` con `Location`; `400` con la razón real en `X-Error-Cause`; `401` por token inválido o expirado; `409` por clave duplicada; `429` con presupuesto de rate limit real y headers `X-Ratelimit-Limit` / `X-Ratelimit-Remaining` / `X-Ratelimit-Reset`.
- `GET /recepcion/{clave}` → transiciones `recibido` → `procesando` → `aceptado`/`rechazado`/`error`, con el XML `MensajeHacienda` codificado en Base64.
- `POST /token` → autenticación offline para el SDK (grant `password` y `refresh_token`).
- Callback asíncrono al `callbackUrl` con 3 reintentos y backoff, y rendirse si todos fallan.
- Respuestas grabadas **sanitizadas** (sin datos de contribuyentes, certificados ni firmas) con modo `replay`/`record`.
- Estado reseteable por test (`reset()`), sin persistencia entre procesos.

La suite E2E del SDK corre contra el mock sin credenciales ni red; `HACIENDA_E2E_TARGET=sandbox` apunta la misma suite al sandbox real.
