---
"@dojocoding/hacienda-sdk": minor
---

Add a submission-identity guard so a clave is never sent again with different signed bytes.

- `submitDocument(http, request, { identityStore })` and `submitAndWait(..., { identityStore })` record `sha256(signed XML bytes)` for the clave before any network call. They throw `SubmissionIdentityError` (a `ValidationError`) with `reason: "DIFFERENT_BYTES"` when the clave is already bound to other bytes. They throw `reason: "ALREADY_ATTEMPTED"` when the same bytes were already attempted.
- `retrySameBytes: true` is the explicit API for deliberately resending the SAME bytes after reconciling by clave. Different bytes are refused even with it. Passing it without an `identityStore` is rejected.
- New exports: `SubmissionIdentityStore` (pluggable; `claim` must be atomic per clave), `FileSubmissionIdentityStore` and `createDefaultSubmissionIdentityStore(configDir)` (`<configDir>/submission-identity`; uses a process lock, mode 0600 and fsync with rename), `guardSubmissionIdentity`, `signedXmlSha256`, `SubmitDocumentOptions` and `ReconcileNotFound`.
- The guard is opt-in, so calls without an `identityStore` behave as before. Persistent `submitAndWait` with a `DocumentStore` already binds bytes per clave. Changed bytes there now raise `SubmissionIdentityError` (`DIFFERENT_BYTES`) instead of a plain `Error`, with the same message prefix. That path rejects `retrySameBytes` because it never re-POSTs. An `identityStore` given alongside a `DocumentStore` is checked before the document leaves `FIRMADO`.
