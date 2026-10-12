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

These files support the conformance tests and the offline runtime validator.
The SDK build embeds the 2026 schemas as strings; the raw XSD files are not
copied into the published npm package.

## `manifest.json`

Machine-readable inventory of this folder: official surfaces consulted, sets
with their validity pointer, the signing-policy digest block, and one entry per
vendored file (`path`, `sha256`, `bytes`, `vendored`, `set`), ordered
lexicographically by `path`.

Provenance of the four documents in `2024/v4.4/` (all downloaded 2026-10-08
from the ATV surface, `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/`,
`docs/esquemas/2024/v4.4/`, plain `curl`/`wget` agents, no credentials):

- `ANEXOS Y ESTRUCTURAS_V4.4.pdf` — annexes/structures document, vendored
  byte-for-byte because Anexo 2 inside it is the citation source for the
  `policy` block below.
- `Codigodemoneda_V4.4.pdf` — currency codes, the official catalog behind
  `CodigoMonedaType` (see `docs/specs/v4.4-compliance.md` §1.9).
- `Codificacionubicacion_V4.4.rar` — location codes (barrio/cantón/código
  postal catalog). ATV publishes this auxiliary as a `.rar` containing
  `Codificacionubicacion_V4.4.xlsx`; no CSV is published on any official
  surface today, so the archive is vendored byte-for-byte as published.
- `Resolucion_General_sobre_disposiciones_tecnicas_comprobantes_electronicos_para_efectos_tributarios.pdf`
  — the v4.4 signing policy cited by Anexo 2, served from
  `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/` (the literal
  `xades:Identifier` in Anexo 2 points at `/xmlschemas/…` without the hyphen and
  returns 403; the file lives at `/xml-schemas/…` — `policy.resolvedUrl` records
  the working one).

The `policy` block quotes Anexo 2 of `ANEXOS Y ESTRUCTURAS_V4.4.pdf` verbatim:
`identifier`, `digestMethod` (`http://www.w3.org/2001/04/xmlenc#sha256`),
`digestValue` (`DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=`, Base64 of the
SHA-256 of the vendored policy PDF), `citation`, `sourceSurface`, `resolvedUrl`
(working URL for the verbatim `identifier`, which 403s), `sdkStatus`.
The INDENT quotes this digest incorrectly as `DWxin1xWOel8…` (43 chars); the
value above is the one printed in the PDF itself. `sdkStatus` is
`pending-sdk-migration`: the signer still uses the old SHA-1/v4.1 policy
(`XADES_POLICY_HASH`, see `docs/specs/v4.4-compliance.md` §1.10 and §3.5), so
the correction is a separate, versioned change (phase 3). Allowed values:
`pending-sdk-migration`, `aligned` — a new value requires updating this README.

Field semantics:

- `vendored` — always `true` for entries in this manifest: the bytes are
  committed to this repository. It would be `false` only for a file declared
  but intentionally not committed (none today).

- `currentSet` — the set **in force today** (`2024/v4.4`; the April 2026
  revision becomes mandatory 2026-11-01). `nextSet` — published but not yet
  mandatory, with `effectiveFrom`; the key is omitted (never `null`) when there
  is no upcoming set, and after the switch `2024/v4.4` stays in `sets[]` (only
  the pointer moves).
- `downloadedAt` (per set) — date of the last download from the set's surface
  whose bytes were confirmed identical to the vendored files. Initially
  2026-10-08 for both sets: fresh downloads on that date matched the repo
  byte-for-byte.
- `lastSyncedAt` — today a **manually written date** (2026-10-08); the
  semantics change to "last `spec:update` run" once `spec:check`/`spec:update`
  exist. `spec:check` will never write the manifest and therefore never updates
  `downloadedAt`; only `spec:update` does.

## Unverified assumptions

Two assumptions are **not verified** and are recorded here on purpose:

1. The official documents in `2024/` and `2026/` (government PDFs and the
   RAR) may be **redistributed in this public repository** without further
   restrictions. They are not covered by the repository's MIT license, and
   they are deliberately _not_ part of the published npm package (the build
   embeds only the 2026 XSDs as strings).
2. The official surfaces remain reachable from CI.

If either fails, update this section together with the affected behavior.
