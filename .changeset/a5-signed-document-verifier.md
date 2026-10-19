---
"@dojocoding/hacienda-sdk": minor
---

Add `verifySignedDocumentXml`: independent verification of the SDK's own signed documents.

The SDK could verify what Hacienda answers (`verifyHaciendaResponseXml`) but
nothing verified the comprobante the SDK itself signs. The new verifier checks
the digest of every reference, the RSA signature over the canonicalized
`ds:SignedInfo`, the declared canonicalization, the signer certificate's
validity, the signature policy (identifier, digest method and hash against the
published policy) and the parties' identity against the key. The document type
is read from the root element, never inferred from the content.

Trust comes only from an explicit reviewed leaf certificate pin supplied by the
caller: the certificate embedded in the document never establishes it, no CA
chain is validated, revocation is not checked and nothing is sent over the
network. Without a pin the result declares the trust as not established and is
not valid. A cross-check lane against a second implementation (the repository's
libxml2 + OpenSSL oracle, or an external binary such as `xmlsec1`) is optional
and reports `skipped` when no tool is available.

Verifying a signature is not fiscal acceptance: Hacienda may still reject the
document.
