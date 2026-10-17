---
"@dojocoding/hacienda-sdk": minor
---

Add an offline, explicitly pinned MensajeHacienda XMLDSig verifier. Validate the
exact signed root, expected document/party/total context, SHA-256/RSA references,
leaf pin and certificate validity before returning accepted/rejected. Embedded
KeyInfo never authorizes a signer. Applications must provision independently
reviewed institutional pins; CA-chain, revocation and live acceptance remain
separate operational requirements. No implicit terminal status from API JSON.
