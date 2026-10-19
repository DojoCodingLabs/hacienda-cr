# @dojocoding/hacienda-mock

Mock del API de recepción de Hacienda (Costa Rica, v4.4) para pruebas offline y CI.

Reproduce las partes que importan en producción: `201` al recibir, `400` con la
razón real en `X-Error-Cause`, `401` por token expirado, `409` por clave
duplicada, `429` con presupuesto de rate limit real (`X-Ratelimit-*`), callback
asíncrono con tres reintentos y rendirse, y estados que toman tiempo en pasar
de `recibido` por `procesando` hasta `aceptado`/`rechazado`/`error`.

Sin dependencias de runtime: sólo Node 22 (`node:http`).

## Instalación

```sh
npm install --save-dev @dojocoding/hacienda-mock
```

## Uso rápido

```ts
import { createMockServer } from "@dojocoding/hacienda-mock";
import { HttpClient, TokenManager, submitAndWait } from "@dojocoding/hacienda-sdk";

const mock = await createMockServer({ processingDelayMs: 0, acceptanceDelayMs: 0 });

const envConfig = {
  name: "Mock",
  apiBaseUrl: mock.apiBaseUrl,
  idpTokenUrl: mock.idpTokenUrl,
  clientId: "mock-client",
};

const tokens = new TokenManager({ envConfig });
await tokens.authenticate({ username: "cpj-02-3101234567", password: "synthetic" });

const result = await submitAndWait(
  new HttpClient({ envConfig, tokenManager: tokens }),
  {
    clave: "50601072500031012345670010000101000000000119999999",
    fecha: "2025-07-27T10:30:00-06:00",
    emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
    comprobanteXml: "<base64 del XML firmado>",
  },
  { pollIntervalMs: 10, timeoutMs: 10_000 },
);

console.log(result.accepted, result.status);
await mock.close();
```

## CLI

```sh
npx hacienda-mock --port 8080
```

Imprime la `apiBaseUrl` y el `idpTokenUrl` que debe usar el SDK.

## Configuración

| Opción              | Por defecto       | Descripción                                          |
| ------------------- | ----------------- | ---------------------------------------------------- |
| `host` / `port`     | `127.0.0.1` / `0` | Interfaz y puerto (0 = efímero)                      |
| `tokenTtlSeconds`   | `300`             | Vida del `access_token`                              |
| `processingDelayMs` | `50`              | De `recibido` a `procesando`                         |
| `acceptanceDelayMs` | `250`             | De `procesando` al estado terminal                   |
| `rateLimit`         | 30 req/min        | Presupuesto por cliente                              |
| `callbackRetries`   | `3`               | Intentos de callback antes de rendirse               |
| `callbackBackoffMs` | `100`             | Backoff entre intentos                               |
| `outcome`           | `"aceptado"`      | Estado terminal (o función por `clave`)              |
| `mode`              | `"replay"`        | `replay` sirve respuestas grabadas; `record` captura |
| `recordSink`        | —                 | Receptor de las respuestas capturadas                |
| `logger`            | —                 | Diagnóstico; nunca recibe credenciales ni payloads   |

## Respuestas grabadas

Las respuestas viven en `src/__fixtures__/recorded-responses.ts` y están
**sanitizadas**: sin datos de contribuyentes reales, sin certificados, sin
firmas y sin datos personales. En modo `record` el mock captura la respuesta
sanitizada para reproducirla después.

## Switch mock / sandbox

La suite E2E del SDK corre contra el mock por defecto (sin credenciales ni
red). Con `HACIENDA_E2E_TARGET=sandbox` y credenciales reales, la misma suite
del SDK (`src/api/e2e-pipeline.spec.ts`) apunta al sandbox de Hacienda.

## Licencia

MIT
