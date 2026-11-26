---
"@dojocoding/hacienda-sdk": minor
---

Add a callback envelope parser (`parseCallbackPayload`, `validateCallbackPayload`, `CallbackEnvelopeSchema`) for Hacienda callback payloads.

The parser reads Hacienda's hyphenated keys (`clave`, `fecha`, `ind-estado`,
`respuesta-xml`), validates the clave with the shared schema and `ind-estado`
against `HaciendaStatus`, and throws `ValidationError` on malformed JSON,
oversize bodies, non-strict Base64 or invalid UTF-8. `parseCallbackPayload`
additionally requires the decoded response to be a `MensajeHacienda` that
passes XSD validation with a required signature and whose `Clave` equals the
envelope clave. Structural validation does not authenticate the signature; use
`verifyHaciendaResponseXml` before trusting the response.
