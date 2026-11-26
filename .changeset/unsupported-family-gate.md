---
"@dojocoding/hacienda-sdk": minor
"@dojocoding/hacienda-cli": minor
"@dojocoding/hacienda-mcp": minor
---

Refuse REP and MensajeReceptor submission and publish a per-family support matrix.

- `submitDocument()` and `submitAndWait()` now throw `UnsupportedDocumentFamilyError`
  (code `UNSUPPORTED_FAMILY`, with `family`, `reason` and `docsUrl`) for a
  `ReciboElectronicoPago` or `MensajeReceptor` document, or for a request carrying
  `consecutivoReceptor`, before persistence or any network access. When the XML
  root is not a known Hacienda document, a clave document type of 10 or 05–07 is
  refused instead. REP has no resolved monetary projection; MR has no
  `consecutivoReceptor` in `SubmissionRequest` and no receiver-specific outcome
  oracle. **Migration:** code that submitted REP or MR documents through the SDK
  now fails fast. Their XML builders are unchanged and stay available for source,
  XSD and archive work.
- New SDK exports: `getFamilySupport()`, `assertSubmittableDocument()`,
  `detectDocumentFamily()`, `familyFromDocumentType()`, `SUPPORT_MATRIX_URL`,
  `UnsupportedDocumentFamilyError`, `HaciendaErrorCode.UNSUPPORTED_FAMILY` and
  the `FamilySupport`, `FamilySubmitStatus`, `DocumentFamily` and
  `SubmittableDocumentFacts` types.
- CLI: `hacienda submit` refuses REP/MR before reading the certificate or
  signing, and `--json` reports `code`, `family` and `docsUrl`. The new
  `hacienda support [--json]` prints the matrix.
- MCP: the new `hacienda://reference/family-support` resource exposes the
  matrix. The server still has no signing or submission tool.

FEC stays submittable but is marked `unverified`: Hacienda's API documentation
does not settle whether the POST `emisor` is the XML Emisor (supplier) or the
buyer that issues the FEC. See `docs/support-matrix.md`.
