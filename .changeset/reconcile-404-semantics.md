---
"@dojocoding/hacienda-sdk": patch
---

Correct the documented meaning of `reconcileByClave`'s `not_found` result. A 404 doesn't prove Hacienda never received the POST, because the document may not be indexed yet. Re-query with backoff inside a reconciliation window. Resubmit only the same signed bytes under the same clave, and only after that window. Runtime behaviour is unchanged.
