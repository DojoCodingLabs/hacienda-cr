# Vendored Hacienda XSD schemas

Official "Anexos y Estructuras" v4.4 XSD schemas, used by the test suite as the
conformance gate for generated XML (`src/__testing__/xsd.ts`).

- `2024/v4.4/` — the base v4.4 package, downloaded 2026-08-24 from
  `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/`.
- `2026/v4.4/` — the April 22, 2026 revision (files Last-Modified 2026-04-22;
  mandatory 2026-11-01), downloaded 2026-08-24 from
  `https://www.hacienda.go.cr/docs/<File>_V4.4.xsd` — the URLs linked from the
  TRIBU-CR OVi portal (`https://ovitribucr.hacienda.go.cr/comprobantes-electronicos`
  → "Anexos y Estructuras" → "Estructuras XML y Anexos Versión 4.4"; public,
  no login). Note: the host's WAF blocks browser-like User-Agents from CLI
  clients — plain `curl`/`wget` default agents work.
- Files are vendored byte-for-byte as published (do not reformat).
- `xmldsig-core-schema.xsd` — W3C XML-DSig core schema referenced by every
  Hacienda XSD via `../../xmldsig-core-schema.xsd` (hence the directory layout).
  Downloaded from `https://www.w3.org/TR/2002/REC-xmldsig-core-20020212/`.

Diff between the generations (verified structurally identical otherwise):
`ClaveType` pattern `\d{50}` → `[a-zA-Z0-9]{50}`; `CodigoReferenciaType`
adds 13–16 (REP also adds 17); `TipoDocReferenciaType` adds 19–20.
See `docs/specs/v4.4-compliance.md`.

These files are test fixtures, not published npm assets.
