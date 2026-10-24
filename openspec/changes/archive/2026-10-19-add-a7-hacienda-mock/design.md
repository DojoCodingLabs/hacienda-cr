## Context

Ver `proposal.md` — Why. A7 es cross-cutting: nuevo paquete `packages/mock`, endpoints de recepción, auth offline, rate limiting, callbacks asíncronos y suite E2E del SDK contra el mock. El SDK ya tiene `HttpClient`, `TokenManager`, `RateLimiter` y `submitDocument`/`getStatus`; el mock se consume cambiando `envConfig` (sin cambios de código en el SDK).

## Goals / Non-Goals

**Goals:**

- Mock independiente (Node puro) con fidelidad de recepción.
- Suite E2E del SDK contra el mock sin credenciales ni red.
- Switch documentado mock/sandbox.
- Publicable como `hacienda-mock`.

**Non-Goals:**

- Persistencia cross-process (in-memory).
- Revocación por red.
- Firma criptográfica real (el mock no firma; acepta XML firmado).
- Reemplazar el sandbox real (solo complemento).

## Decisions

| Decisión                               | Racional                                                | Alternativas consideradas                  |
| -------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| **Node HTTP server sin dependencias**  | Cero deps externas; fácil de publicar y testear         | Express/Koa (deps extra, superficie mayor) |
| **In-memory state con reset por test** | Cada test empieza limpio; no persistencia cross-process | SQLite/Redis (overhead, complejidad)       |
| **Respuestas grabadas sanitizadas**    | Fidelidad vs sandbox real; modo record/replay           | Respuestas sintéticas (baja fidelidad)     |
| **Switch via env vars**                | Sin cambios de código en el SDK; fácil de documentar    | Config file (más complejidad)              |
| **Rate limiting real con presupuesto** | Prueba el comportamiento real del SDK ante 429          | Mock de rate limit (baja fidelidad)        |
| **Callback con reintentos + backoff**  | Reproduce el comportamiento real de Hacienda            | Callback síncrono (no realista)            |

## Risks / Trade-offs

- **[Riesgo: fidelidad vs sandbox real]** → respuestas grabadas sanitizadas + validación manual en semana 8.
- **[Riesgo: transiciones temporales en tests]** → latencia configurable (0 ms en tests).
- **[Riesgo: estado compartido entre tests]** → reset explícito por test; no persistencia cross-process.
- **[Riesgo: rate limiting flaky]** → presupuesto real aplicado por token/IP; tests con presupuesto alto.
- **[Riesgo: callback network failures]** → reintentos con backoff configurable; rendirse tras 3 intentos.
- **[Riesgo: seguridad (secretos en logs)]** → redacción en el mock también; no loggear tokens ni payloads.

## Migration Plan

1. Scaffold `packages/mock` (package.json, tsconfig, vitest, README).
2. Implementar server con endpoints y estado.
3. Añadir respuestas grabadas sanitizadas.
4. Implementar auth offline (`/token`).
5. Implementar rate limiting real.
6. Implementar callback asíncrono con reintentos.
7. Añadir suite E2E del SDK contra el mock.
8. Documentar switch mock/sandbox.
9. Publicar `hacienda-mock`.

## Open Questions

- **Fidelidad de respuestas**: ¿cuántas respuestas grabadas son necesarias? Sugiero empezar con 5-10 casos (aceptación, rechazo, timeout, rate limit, duplicado).
- **Modo record**: ¿grabar contra sandbox real en CI o manualmente? Sugiero manualmente (requiere credenciales).
- **Callback URL**: ¿el mock debe soportar múltiples callback URLs por test? Sugiero uno por instancia (configurable).
- **Publicación**: ¿publicar `hacienda-mock` como paquete separado o incluirlo en el monorepo? Sugiero paquete separado (reutilizable por otros).
