## Why

El SDK ya cubre autenticación, generación, firma, envío y un outbox durable, pero la auditoría lo declara no listo para integrar un servicio. Cuatro brechas bloquean un backend multiempresa: (1) el caché de clientes y los contadores no están acotados por identidad fiscal/ambiente de forma segura; (2) los secretos pueden escapar por mensajes de error externos; (3) no todo transporte impone timeout/redirect seguro por defecto; (4) falta contrato de reconciliación, idempotencia y parsing de callbacks para recuperación durable entre procesos. Resolver esto antes de integrar un servicio evita colisiones de consecutivos, fuga de credenciales y documentos huérfanos.

## What Changes

- Multi-tenant scope: introducir un Scope explícito (tenant para autorización/auditoría, emisor+ambiente para numeración) y una clave de caché compuesta sha256(scope + configFingerprint + secretFingerprint). El contador sigue acotado por emisor + ambiente + tipo + sucursal + terminal; si dos tenants representan el mismo emisor, comparten contador.
- Redacción de secretos: sanitizar en la creación de errores del SDK (ApiError, AuthError, errores de transporte/parseo) y en fronteras CLI/MCP; cubrir mensajes externos y data con pruebas hostiles.
- Timeout por defecto seguro: utilidad central fetchWithTimeout (default 30s, redirect error, propagación de AbortSignal) usada por todo fetch del SDK; presupuestos jerárquicos configurables con default seguro.
- Recuperación durable: exponer helpers de reconciliación por clave, clasificación de resultados inciertos, y parser/validator de payload de callback (MensajeHacienda), manteniendo el SDK agnóstico a la base de datos (solo interfaz DocumentStore + primitivas).
- BREAKING (MCP): createMcpApiClient y nextIssuerSequence deben aceptar/derivar scope explícito; el caché por nombre de perfil deja de ser la única clave.

## Capabilities

### New Capabilities

- multi-tenant-scope: scope explícito, clave de caché compuesta, invalidación por cambio de identidad/config/secretos, aislamiento entre empresas.
- secret-redaction-boundary: redacción en creación de errores y fronteras, cobertura de mensajes externos y datos estructurados.
- transport-timeout-defaults: timeout default seguro, bloqueo de redirects y propagación de cancelación en todo transporte del SDK.
- durable-delivery-recovery: reconciliación por clave, idempotencia a nivel de operación (en el servicio), parsing/validación de callbacks, helpers para resultados inciertos.

### Modified Capabilities

- (ninguna a nivel de requisitos existentes; delivery conserva su contrato y se extiende vía la nueva capacidad)

## Impact

- Afecta packages/sdk (auth, api, delivery, logging, config), packages/mcp (api-client, issuer-sequence, tools), packages/cli (errores JSON), y docs de integración.
- No introduce dependencia de base de datos en el SDK; el servicio implementa DocumentStore.
- Requiere cambios de API en MCP/CLI para propagar scope; documentar migración.
- Pruebas: nuevas suites de scope, redacción hostil, timeout y reconciliación/callback.
