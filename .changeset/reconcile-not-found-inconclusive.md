---
"@dojocoding/hacienda-sdk": minor
---

`reconcileByClave` now marks `not_found` as inconclusive and recognizes the sandbox's "not received" answer.

- `not_found` now carries `conclusive: false`, `httpStatus` (`404` or `400`), `evidence` (`"http_404"` or `"x_error_cause_not_received"`), `observedAt` and, when sent, `errorCause`. `kind` is unchanged, so existing `kind === "not_found"` checks keep working. The type pins `conclusive` to `false`: absence from the status endpoint never proves the POST did not arrive, and it does not permit a resubmit.
- The sandbox answers an unknown clave with HTTP 400 and `X-Error-Cause: El comprobante [...] no ha sido recibido.` (docs/testing/sandbox-403-debug.md). That exact response now maps to `not_found` instead of `unknown`. Any other 400 stays `unknown`, including one with no header, other wording, or a header naming a different clave.
- `submitAndWait` keeps polling through that same 400 until its deadline, the way it already handles a 404, instead of throwing it as if it were a rejection.
- `ApiError` gains an optional `errorCause`: the redacted `X-Error-Cause` header, capped at 1024 characters.
