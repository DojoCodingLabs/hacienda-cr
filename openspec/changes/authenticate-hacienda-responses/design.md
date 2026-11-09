# Design

## Context

The SDK validates XML structure but cannot authenticate an institutional
response; transport JSON and an embedded certificate are insufficient for a
terminal fiscal decision. The implementation exists and is released as v0.5.0
(PR #71/#72); this design records the decisions behind it. See
`proposal.md` for motivation and `docs/specs/hacienda-response-verification.md`
for the full signature profile and trust model.

## Goals / Non-Goals

**Goals:**

- Define the supported XMLDSig profile for `MensajeHacienda`.
- Make signer trust explicit and caller-supplied (reviewed leaf pins).
- Require exact expected clave/party/amount context with no normalization.
- Provide a bounded, typed error taxonomy without leaking source diagnostics.
- Keep trust provenance (PKIX, revocation, institutional provisioning)
  separate from verification.

**Non-Goals:**

- PKIX chain validation, CRL/OCSP, or certificate fetching.
- Live fiscal calls, transport status reconciliation, or acceptance claims.
- Automatic trust acquisition or unreviewed Money changes.
- Full XMLDSig canonicalization profiles beyond the named case.

## Decisions

- **Signature profile (RSA-SHA256, single whole-root reference).** Require
  exactly one `Reference` whose URI is the empty string (whole document root),
  SHA-256 digest, and RSA-SHA256 signature. Alternative: supporting arbitrary
  reference counts/transforms — rejected because it expands the attack surface
  (wrapping, external references) and complicates canonicalization review.
- **Signer trust via explicit leaf pins.** `trustedSignerCertificates` is
  caller-supplied and reviewed; an embedded `KeyInfo` is never trusted.
  Alternative: trusting embedded KeyInfo — rejected because it allows
  substitution and defeats institutional pinning.
- **Exact context, no normalization.** Clave, issuer/receiver party strings and
  decimal total (5 places, no Number conversion) are compared byte-for-byte;
  `null` receiver requires absent/empty receptor identity. Alternative:
  guessed zero-padding or foreign-ID normalization — rejected to avoid silent
  identity mismatches.
- **Bounded schema and safe errors.** Validate against the bundled
  `MensajeHacienda_V4.4.xsd` and throw typed errors without diagnostics or
  source fragments. Alternative: returning raw XMLDSig/XSD errors — rejected to
  avoid leaking structure and to keep the contract stable.
- **Terminal pairs only.** Accept `Mensaje` 1/Aceptado and 3/Rechazado;
  applications must compare transport status with the authenticated result and
  retain mismatches as unknown.
- **Schema provenance.** Use the 2026 bundled schema (`MensajeHacienda_V4.4.xsd`,
  SHA-256 `b2606156...c52fd25e`); the 2024 schema is retained as historical
  custody and is not used by the verifier.

## Risks / Trade-offs

- [Risk] Reviewed leaf pins are not institutional PKIX/revocation policy.
  → Mitigation: document the boundary; require separate approval before
  production activation.
- [Risk] Synthetic tests can be mistaken for real acceptance.
  → Mitigation: tests use synthetic pins; doc states they confer no
  institutional authority.
- [Risk] Unreviewed Money migration remains excluded.
  → Mitigation: changelog (v0.5.0) records it was not imported.

## Migration Plan

No runtime migration. The verifier is an additive API; consumers adopt it
explicitly. Historical bytes and retained schemas are untouched.

## Open Questions

- Institutional public pin provenance, rotation and revocation policy require
  independent approval before production activation.
- Real authorized institutional response fixtures must be verified before
  production activation.
