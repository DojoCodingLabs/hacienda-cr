---
"@dojocoding/hacienda-mock": minor
---

Add `@dojocoding/hacienda-mock`: a mock of the Hacienda reception API for offline E2E tests.

The package reproduces the parts that matter in production — `201` with
`Location`, `400` with the real reason in `X-Error-Cause`, `401` on an expired
token, `409` on a duplicate clave, `429` with real `X-Ratelimit-*` budget,
asynchronous callbacks with three attempts, and states that take time to move
from `recibido` through `procesando` to a terminal state — so the SDK's E2E suite
runs without credentials and without network. It has no runtime dependencies
(only Node's `node:http`) and ships a `hacienda-mock` binary to run the server
as a separate process.

The mock is a development package: it never replaces the test against the real
sandbox, and its recorded responses are sanitized (no taxpayer data, no
certificates, no signatures). The published group now carries five packages.
