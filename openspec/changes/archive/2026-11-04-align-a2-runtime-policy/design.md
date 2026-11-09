# Design: reviewed signing policy

## Decisions

- Use the reviewed official policy URL, SHA256 algorithm and Base64 digest of the
  retained policy PDF.
- Use the library precomputed digest contract; do not hash an identifier in its place.
- Reject exoneration 12 structurally through the reviewed catalog enum.
- Preserve the exact Ohm code point U+2126 and reviewed fiscal identities.
- Keep deprecated document aliases until a separately reviewed removal.
- Keep exact monetary DTO migration and real fiscal acceptance in
  `exact-monetary-dto-and-fiscal-acceptance`.
- Keep institutional pin provenance/rotation approval in
  `authenticate-hacienda-responses`.

## Evidence

- PR #70/#71/#72 merged; release `v0.5.0`; installed-consumer verification recorded.
- Policy digest independently recalculated from the vendored PDF.
