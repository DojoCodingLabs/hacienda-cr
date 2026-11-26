---
"@dojocoding/hacienda-cli": minor
---

`hacienda submit` now signs a clave only once and uses the SDK
submission-identity guard.

XAdES embeds a signing time, so every earlier `submit` run produced different
signed bytes under the same clave: a retry after a lost POST was exactly the
divergent resubmit the guard exists to stop. The first run now stores the
signed XML and its delivery state (SDK `FileDocumentStore`) and records the
attempt (`FileSubmissionIdentityStore`) under
`~/.hacienda-cr/submissions/<environment>/` before the POST. Later runs for the
same clave never sign again and check local state before authenticating or any
network call:

- an already-attempted clave is refused (`SUBMISSION_ALREADY_ATTEMPTED`) until
  you query `hacienda status <clave>` and rerun with the new
  `--retry-same-bytes` flag, which resends the exact stored bytes (no
  certificate or PIN needed);
- an input that no longer matches the stored document is refused
  (`SUBMISSION_DRAFT_CHANGED`), even with the flag;
- a clave stored as accepted, rejected or expired is refused (`SUBMISSION_FINAL`).

First submissions behave as before, except that a contingencia clave (situation
digit 2) must now carry an `informacionReferencia` with `codigo` `05` and the
provisional comprobante `numero` (Anexos y Estructuras v4.4, Información de
Referencia). `--dry-run` writes no state. Claves submitted by earlier CLI
versions have no local record and are not protected.
