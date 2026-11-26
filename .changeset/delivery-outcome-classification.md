---
"@dojocoding/hacienda-sdk": minor
---

Add `classifyOutcome` to classify a status query by clave into a delivery outcome.

`classifyOutcome(response, error?, { expectedClave? })` reads Hacienda's
`ind-estado` (from `getStatus`'s `status` or the raw body) and returns a
discriminated `DeliveryOutcome`: `success` (`aceptado`), `rejected`
(`rechazado`), `pending` (`recibido`/`procesando`, received and still
processing; never resubmit), `transport_error` (the query itself failed) or
`unknown` (missing or unrecognized state, Hacienda `error`, or another clave).
`classifySendResult` is unchanged.
