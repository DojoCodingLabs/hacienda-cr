## Why

A7 (mock de Hacienda) es un paquete publicable nuevo que `main` no tiene: un servidor que reproduce el API de recepción para correr la suite E2E del SDK sin credenciales ni red. Portarlo tiene un coste de release no trivial: el repo publica hoy **cuatro** paquetes con versión compartida (`packagePaths`, `linked` de changesets, `validateRelease` y `verify-packages.mjs` fijan 4 tarballs). Un quinto paquete cambia ese contrato y tiene que entrar con la misma disciplina de versión y de publicación.

Además, el mock debe hablar el idioma del árbol vigente: montos decimales (texto), respuestas `MensajeHacienda` con el formato de `main`, y los códigos de rechazo que `main` documenta.

## What Changes

- **Paquete `packages/mock`** (`@dojocoding/hacienda-mock`): servidor HTTP sin dependencias de runtime que implementa `POST /recepcion`, `GET /recepcion/{clave}`, `POST /token`, callbacks asíncronos con reintentos, rate limiting con `X-Ratelimit-*` y transiciones de estado.
- **Quinto paquete en el release**: `packagePaths` incluye `packages/mock`; `validateRelease` exige la misma versión en los cinco; `verify-packages.mjs` espera 5 tarballs y compila un consumidor que los instala.
- **Respuestas grabadas sanitizadas**: aceptación y rechazo desde el `MensajeHacienda` vigente, sin PII, con el formato de monto decimal-text.
- **Integración con el SDK**: switch `HACIENDA_E2E_TARGET=mock|sandbox` y `HACIENDA_MOCK_URL`, con la suite E2E del SDK apuntando al mock por defecto.
- **CLI `hacienda-mock`** para levantarlo como proceso aparte en desarrollo.

**BREAKING**: ninguno para los consumidores del SDK; el release pasa a publicar 5 paquetes.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `hacienda-mock`: el mock se publica como quinto paquete del grupo `linked`, con respuestas grabadas del `MensajeHacienda` vigente y montos en texto decimal.

## Impact

- **Código afectado**: `packages/mock/**`, `scripts/package-artifacts.mjs`, `scripts/release-core.mjs` (validación de versión de los cinco), `scripts/verify-packages.mjs` (5 tarballs + consumidor), `package.json`, README.
- **Release**: el grupo `linked` de changesets pasa a cubrir cinco paquetes; el tag y las versiones deben coincidir en los cinco.
- **Riesgo de proceso**: añadir un paquete al release es un cambio de disciplina, no de código; requiere acuerdo explícito antes de publicar.
- **Documentación**: `docs/releasing.md` y `docs/architecture.md` pasan a hablar de cinco paquetes.
