---
"@dojocoding/hacienda-shared": patch
"@dojocoding/hacienda-sdk": patch
---

Point the sandbox at `api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1`.

The previous URL fails at the API gateway with 403 `IncompleteSignatureException`
for any bearer token, so no document could reach the sandbox.
