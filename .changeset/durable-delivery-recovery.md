---
"@dojocoding/hacienda-sdk": minor
---

Add `reconcileByClave` for durable delivery recovery after an ambiguous submission.

`reconcileByClave(httpClient, clave)` validates the clave with the shared
clave schema (alphanumeric taxpayer segment allowed) before any network access,
queries `GET /recepcion/{clave}` and returns a discriminated `ReconcileResult`:
`{ kind: "found", status }`, `{ kind: "not_found" }` for 404 (never received,
safe to resubmit the same clave) or `{ kind: "unknown", error }` for 5xx,
network errors, timeouts or a response for another clave. It never submits a
document or allocates a consecutive.
