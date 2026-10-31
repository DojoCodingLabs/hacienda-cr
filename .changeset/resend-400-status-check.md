---
"@dojocoding/hacienda-sdk": patch
---

Check status by clave when a resend gets 400 without a document store.

`submitAndWait` without a store now queries `GET /recepcion/{clave}` when reception answers 400. If Hacienda already accepted the document, it returns the accepted result instead of
throwing. Otherwise the original 400 is thrown unchanged.
