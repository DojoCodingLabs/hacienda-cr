---
"@dojocoding/hacienda-shared": major
"@dojocoding/hacienda-sdk": major
"@dojocoding/hacienda-cli": major
"@dojocoding/hacienda-mcp": major
---

Make `2024/v4.4` the authoritative runtime schema and retire 2026-only
constructions.

The SDK now embeds and validates against the `2024/v4.4` XSDs by default. The
`2026/v4.4` set remains vendored only as reference; it is not the default
acceptance path.

Migration:

- Claves and cédula segments are numeric only (`\d{50}`); alphanumeric taxpayer
  segments in a clave are rejected.
- `REFERENCE_DOC_TYPES` no longer contains 19–20 and `REFERENCE_CODES` no longer
  contains 13–17. `REP_REFERENCE_CODES` no longer admits 17, and
  `CODIGO_REFERENCIA_PAGO_COMPROBANTE` is removed.
- `ExactFeReplacementInputSchema`, `ExactFeReplacementReferenceSchema`,
  `calculateExactFeReplacement` and `buildExactFacturaReplacementXml` are
  removed because they require reference code 16.
- `manifest.json` no longer contains `nextSet`; the 2026 revision has no
  confirmed effective date and is not adopted.

Generated and accepted documents must target `2024/v4.4`. If Hacienda later
publishes and confirms the 2026 revision, adopting it requires a separate change
with its own authority, migration and tests.
