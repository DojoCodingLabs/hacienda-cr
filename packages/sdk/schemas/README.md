# Vendored Hacienda XSD schemas

Official "Anexos y Estructuras" v4.4 XSD schemas, used by the test suite as the
conformance gate for generated XML (`src/__testing__/xsd.ts`).

- `2024/v4.4/` — the base v4.4 package, downloaded 2026-08-24 from
  `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/`.
  Files are vendored byte-for-byte as published (do not reformat).
- `xmldsig-core-schema.xsd` — W3C XML-DSig core schema referenced by every
  Hacienda XSD via `../../xmldsig-core-schema.xsd` (hence the directory layout).
  Downloaded from `https://www.w3.org/TR/2002/REC-xmldsig-core-20020212/`.

The April 22, 2026 revision of the v4.4 schemas (mandatory 2026-11-01:
alphanumeric clave, alphanumeric cédulas, reference codes 13–17 / 19–20) is
distributed through the TRIBU-CR OVi portal and should be vendored here as a
sibling directory once retrieved. See `docs/specs/v4.4-compliance.md`.

These files are test fixtures, not published npm assets.
